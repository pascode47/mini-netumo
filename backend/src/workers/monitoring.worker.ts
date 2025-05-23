import { Worker, Job } from 'bullmq';
import axios from 'axios';
import https from 'https';
import { TLSSocket } from 'tls'; // Import TLSSocket
import whois from 'whois'; // Import whois (renamed package)
import TargetModel, { ITarget } from '../models/target.model';
import AlertModel, { IAlert } from '../models/alert.model'; // Import AlertModel and IAlert
import { dispatchNotifications } from '../services/notification.service'; // Import dispatchNotifications
import { connectRedis } from '../config/redis'; // To ensure Redis client is connected for worker
import connectDB from '../config/database'; // To connect DB from worker context

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

const SSL_EXPIRY_THRESHOLD_DAYS = parseInt(process.env.SSL_EXPIRY_THRESHOLD_DAYS || '14', 10);
const DOMAIN_EXPIRY_THRESHOLD_DAYS = parseInt(process.env.DOMAIN_EXPIRY_THRESHOLD_DAYS || '14', 10);

// Ensure DB and Redis are connected when worker starts
connectDB(); // Mongoose handles connection pooling
connectRedis(); // Ensure Redis client is attempting to connect

interface HttpJobData {
  targetId: string;
  targetUrl: string;
  type: 'http';
}

interface SslJobData {
  targetId: string;
  targetUrl: string;
  type: 'ssl';
}

interface DomainJobData {
  targetId: string;
  hostname: string;
  type: 'domain';
}

type MonitoringJobData = HttpJobData | SslJobData | DomainJobData;

const processHttpJob = async (job: Job<HttpJobData, any, string>) => {
  const { targetId, targetUrl } = job.data;
  console.log(`Processing HTTP check for target ${targetId}: ${targetUrl}`);

  let target = await TargetModel.findById(targetId);
  if (!target || !target.isActive) {
    console.log(`Target ${targetId} not found or inactive. Skipping HTTP check.`);
    // Optionally remove job if target is permanently gone or handle appropriately
    return;
  }

  const statusBeforeCheck: ITarget['status'] = target.status; // Store status before it's changed to 'CHECKING'
  target.status = 'CHECKING';
  await target.save();

  const startTime = Date.now();
  let responseStatus: number | undefined;
  let responseTime: number | undefined;
  let newStatus: ITarget['status'] = 'UNKNOWN';
  let consecutiveFailures = target.consecutiveFailures;

  try {
    const response = await axios.get(targetUrl, { 
      timeout: 10000, // 10 seconds timeout
      validateStatus: () => true, // Accept all status codes
      httpsAgent: new https.Agent({ rejectUnauthorized: false }) // Allow self-signed certs for checks
    });
    responseStatus = response.status;
    responseTime = Date.now() - startTime;
    
    if (responseStatus >= 200 && responseStatus < 400) {
      newStatus = 'UP';
      consecutiveFailures = 0;
    } else {
      newStatus = 'DOWN';
      consecutiveFailures++;
    }
  } catch (error: any) {
    responseTime = Date.now() - startTime; // Record time even on error
    console.error(`Error checking ${targetUrl}:`, error.message);
    newStatus = 'DOWN';
    consecutiveFailures++;
  }

  // Update target
  target.httpStatus = responseStatus;
  target.responseTimeMs = responseTime;
  target.lastCheckedAt = new Date();
  
  if (statusBeforeCheck !== newStatus) { // Compare with status before this check
    target.lastStatusChangeAt = new Date();
  }
  target.status = newStatus; // Set to the newly determined status
  target.consecutiveFailures = consecutiveFailures;
  
  await target.save();
  console.log(`HTTP check for ${targetUrl} completed. Status: ${newStatus}, Failures: ${consecutiveFailures}`);

  // Alerting logic
  if (newStatus === 'DOWN' && consecutiveFailures >= 2) {
    const existingAlert = await AlertModel.findOne({ target: target._id, type: 'DOWNTIME', status: 'ACTIVE' });
    if (!existingAlert) {
      const newAlert = await AlertModel.create({
        target: target._id,
        type: 'DOWNTIME',
        message: `Target ${targetUrl} is DOWN. Consecutive failures: ${consecutiveFailures}. Last HTTP status: ${responseStatus || 'N/A'}.`,
        status: 'ACTIVE',
        details: { consecutiveFailures, httpStatus: responseStatus, responseTimeMs: responseTime },
      });
      console.log(`Created DOWNTIME alert for target ${targetUrl}`);
      await dispatchNotifications(newAlert);
    }
  } else if (newStatus === 'UP' && statusBeforeCheck === 'DOWN') {
    const downtimeAlertToResolve = await AlertModel.findOneAndUpdate(
      { target: target._id, type: 'DOWNTIME', status: 'ACTIVE' },
      { status: 'RESOLVED', resolvedAt: new Date(), message: `Target ${targetUrl} is back UP. Last HTTP status: ${responseStatus}.` },
      { new: true }
    );
    if (downtimeAlertToResolve) {
      console.log(`Resolved DOWNTIME alert for target ${targetUrl}`);
      // Optionally send notification for resolution of the DOWNTIME alert
      // await dispatchNotifications(downtimeAlertToResolve); 
    }
    // Create and notify for a RECOVERY alert
    const recoveryAlert = await AlertModel.create({
        target: target._id,
        type: 'RECOVERY',
        message: `Target ${targetUrl} has recovered and is now UP. Last HTTP status: ${responseStatus}.`,
        status: 'RESOLVED', // Recovery alerts are typically informational and immediately resolved
        triggeredAt: new Date(), 
        resolvedAt: new Date(),
        details: { httpStatus: responseStatus, responseTimeMs: responseTime },
    });
    console.log(`Created RECOVERY alert for target ${targetUrl}`);
    await dispatchNotifications(recoveryAlert);
  }
};

const processSslJob = async (job: Job<SslJobData, any, string>) => {
  const { targetId, targetUrl } = job.data;
  console.log(`Processing SSL check for target ${targetId}: ${targetUrl}`);

  let target = await TargetModel.findById(targetId);
  if (!target || !target.isActive || !targetUrl.startsWith('https://')) {
    console.log(`Target ${targetId} not found, inactive, or not HTTPS. Skipping SSL check.`);
    if (target) {
        target.sslStatus = 'NA';
        target.sslLastCheckedAt = new Date();
        await target.save();
    }
    return;
  }
  
  try {
    const url = new URL(targetUrl);
    const options = {
      host: url.hostname,
      port: url.port || 443,
      method: 'HEAD', // We only need to establish connection for cert
      rejectUnauthorized: false, // Important for getting cert details even if chain is broken
    };

    const req = https.request(options, async (res) => { // Make the callback async
      const tlsSocket = res.socket as TLSSocket; // Cast to TLSSocket
      const certificate = tlsSocket.getPeerCertificate();
      if (certificate && certificate.valid_to) {
        const expiryDate = new Date(certificate.valid_to);
        const daysRemaining = Math.floor((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        
        target!.sslExpiresAt = expiryDate;
        let alertType: 'SSL_EXPIRY' | null = null;
        let alertMessage = '';

        if (daysRemaining <= 0) {
          target!.sslStatus = 'EXPIRED';
          alertType = 'SSL_EXPIRY';
          alertMessage = `SSL certificate for ${targetUrl} has EXPIRED. Expired on: ${expiryDate.toDateString()}.`;
        } else if (daysRemaining <= SSL_EXPIRY_THRESHOLD_DAYS) {
          target!.sslStatus = 'EXPIRING_SOON';
          alertType = 'SSL_EXPIRY';
          alertMessage = `SSL certificate for ${targetUrl} is expiring soon. Expires on: ${expiryDate.toDateString()} (${daysRemaining} days remaining).`;
        } else {
          target!.sslStatus = 'VALID';
          // If status was previously bad, resolve alert
          const existingAlert = await AlertModel.findOne({ target: target!._id, type: 'SSL_EXPIRY', status: 'ACTIVE' });
          if (existingAlert) {
            existingAlert.status = 'RESOLVED';
            existingAlert.resolvedAt = new Date();
            existingAlert.message = `SSL certificate for ${targetUrl} is now VALID. Was: ${existingAlert.details?.expiryStatus || 'Expiring/Expired'}.`;
            await existingAlert.save();
            console.log(`Resolved SSL_EXPIRY alert for ${targetUrl}`);
            await dispatchNotifications(existingAlert);
          }
        }
        
        if (alertType) {
          let alertToNotify: IAlert | null = null;
          const existingAlert = await AlertModel.findOne({ target: target!._id, type: alertType, status: 'ACTIVE' });
          
          if (!existingAlert) {
            alertToNotify = await AlertModel.create({
              target: target!._id,
              type: alertType,
              message: alertMessage,
              status: 'ACTIVE',
              details: { expiryStatus: target!.sslStatus, daysRemaining, expiryDate },
            });
            console.log(`Created SSL_EXPIRY alert for ${targetUrl} (${target!.sslStatus})`);
          } else if (existingAlert.details?.expiryStatus !== target!.sslStatus) {
            // Severity changed (e.g., EXPIRING_SOON to EXPIRED)
            existingAlert.message = alertMessage;
            existingAlert.details = { ...existingAlert.details, expiryStatus: target!.sslStatus, daysRemaining, expiryDate };
            await existingAlert.save();
            alertToNotify = existingAlert;
            console.log(`Updated SSL_EXPIRY alert for ${targetUrl} to ${target!.sslStatus}`);
          }
          
          if (alertToNotify) {
            await dispatchNotifications(alertToNotify);
          }
        }
      } else {
        target!.sslStatus = 'ERROR'; // Could not get certificate
      }
      target!.sslLastCheckedAt = new Date();
      await target!.save(); // Ensure save is awaited
      console.log(`SSL check for ${targetUrl} completed. Status: ${target!.sslStatus}`);
    });

    req.on('error', async (err) => { // Make callback async
      console.error(`Error checking SSL for ${targetUrl}:`, err.message);
      target!.sslStatus = 'ERROR';
      target!.sslLastCheckedAt = new Date();
      await target!.save(); // Ensure save is awaited
    });
    req.end();

  } catch (error: any) {
    console.error(`Exception during SSL check for ${targetUrl}:`, error.message);
    target.sslStatus = 'ERROR';
    target.sslLastCheckedAt = new Date();
    await target.save();
  }
};

const processDomainJob = async (job: Job<DomainJobData, any, string>) => {
  const { targetId, hostname } = job.data;
  console.log(`Processing Domain Expiry check for target ${targetId}: ${hostname}`);
  
  let target = await TargetModel.findById(targetId);
  if (!target || !target.isActive) {
    console.log(`Target ${targetId} not found or inactive. Skipping domain check.`);
    return;
  }

  target.domainLastCheckedAt = new Date();

  try {
    // Promisify whois.lookup
    const lookupPromise = (domain: string): Promise<string | whois.WhoisResult | whois.WhoisResult[]> => 
      new Promise((resolve, reject) => {
        // Ensure options are passed correctly if needed, or just domain and callback
        whois.lookup(domain, (err: Error | null, data: string | whois.WhoisResult | whois.WhoisResult[]) => {
          if (err) {
            return reject(err);
          }
          resolve(data);
        });
      });

    const rawWhoisData = await lookupPromise(hostname);
    let whoisText = '';

    if (Array.isArray(rawWhoisData)) {
      whoisText = rawWhoisData.map(entry => typeof entry === 'string' ? entry : entry.data).join('\n\n---\n\n');
    } else if (typeof rawWhoisData === 'object' && rawWhoisData !== null && 'data' in rawWhoisData) {
      // If it's a single WhoisResult object
      whoisText = (rawWhoisData as whois.WhoisResult).data;
    } else if (typeof rawWhoisData === 'string') {
      whoisText = rawWhoisData;
    }
    
    if (!whoisText) {
      throw new Error('Empty WHOIS response');
    }

    // Attempt to parse expiry date from raw WHOIS text
    // Common patterns: "Registry Expiry Date:", "Expires On:", "Expiration Date:", "Expiry Date:"
    // Dates can be in various formats (YYYY-MM-DD, DD-Mon-YYYY, etc.)
    const patterns = [
      /Registry Expiry Date:\s*(.+)/i,
      /Expires On:\s*(.+)/i,
      /Expiration Date:\s*(.+)/i,
      /Expiry Date:\s*(.+)/i,
      /paid-till:\s*(.+)/i, // Common for .ru domains
      /renewal date:\s*(.+)/i,
      /Record expires on\s*(.+)\./i, // Example: "Record expires on 2023-10-15."
    ];

    let expiryDateStr: string | null = null;
    for (const pattern of patterns) {
      const match = whoisText.match(pattern);
      if (match && match[1]) {
        expiryDateStr = match[1].trim();
        break;
      }
    }

    if (expiryDateStr) {
      const expiryDate = new Date(expiryDateStr);
      if (!isNaN(expiryDate.getTime())) { // Check if date is valid
        target.domainExpiresAt = expiryDate;
        const daysRemaining = Math.floor((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

        let alertType: 'DOMAIN_EXPIRY' | null = null;
        let alertMessage = '';

        if (daysRemaining <= 0) {
          target.domainStatus = 'EXPIRED';
          alertType = 'DOMAIN_EXPIRY';
          alertMessage = `Domain ${hostname} has EXPIRED. Expired on: ${expiryDate.toDateString()}.`;
        } else if (daysRemaining <= DOMAIN_EXPIRY_THRESHOLD_DAYS) {
          target.domainStatus = 'EXPIRING_SOON';
          alertType = 'DOMAIN_EXPIRY';
          alertMessage = `Domain ${hostname} is expiring soon. Expires on: ${expiryDate.toDateString()} (${daysRemaining} days remaining).`;
        } else {
          target.domainStatus = 'VALID';
          // If status was previously bad, resolve alert
          const existingAlert = await AlertModel.findOne({ target: target._id, type: 'DOMAIN_EXPIRY', status: 'ACTIVE' });
          if (existingAlert) {
            existingAlert.status = 'RESOLVED';
            existingAlert.resolvedAt = new Date();
            existingAlert.message = `Domain ${hostname} is now VALID. Was: ${existingAlert.details?.expiryStatus || 'Expiring/Expired'}.`;
            await existingAlert.save();
            console.log(`Resolved DOMAIN_EXPIRY alert for ${hostname}`);
            await dispatchNotifications(existingAlert);
          }
        }

        if (alertType) {
          let alertToNotify: IAlert | null = null;
          const existingAlert = await AlertModel.findOne({ target: target._id, type: alertType, status: 'ACTIVE' });

          if (!existingAlert) {
            alertToNotify = await AlertModel.create({
              target: target._id,
              type: alertType,
              message: alertMessage,
              status: 'ACTIVE',
              details: { expiryStatus: target.domainStatus, daysRemaining, expiryDate },
            });
            console.log(`Created DOMAIN_EXPIRY alert for ${hostname} (${target.domainStatus})`);
          } else if (existingAlert.details?.expiryStatus !== target.domainStatus) {
            // Severity changed
            existingAlert.message = alertMessage;
            existingAlert.details = { ...existingAlert.details, expiryStatus: target.domainStatus, daysRemaining, expiryDate };
            await existingAlert.save();
            alertToNotify = existingAlert;
            console.log(`Updated DOMAIN_EXPIRY alert for ${hostname} to ${target.domainStatus}`);
          }
          
          if (alertToNotify) {
            await dispatchNotifications(alertToNotify);
          }
        }
      } else {
        console.warn(`Could not parse date string "${expiryDateStr}" for ${hostname}`);
        target.domainStatus = 'ERROR'; // Error parsing date
      }
    } else {
      console.warn(`Could not find expiry date in WHOIS data for ${hostname}`);
      target.domainStatus = 'ERROR'; // Could not find date
    }
  } catch (error: any) {
    console.error(`Error during WHOIS lookup for ${hostname}:`, error.message);
    target.domainStatus = 'ERROR'; // Error during lookup
    if (error.message && error.message.includes('Unable to find a WHOIS server for')) {
        target.domainStatus = 'NA'; 
    }
  }
  
  await target.save();
  console.log(`Domain Expiry check for ${hostname} completed. Status: ${target.domainStatus}`);
};


const monitoringWorker = new Worker<MonitoringJobData>(
  'monitoring', // Must match the queue name
  async (job: Job<MonitoringJobData, any, string>) => {
    console.log(`Received job ${job.id} of type ${job.data.type} from monitoring queue.`);
    switch (job.data.type) {
      case 'http':
        await processHttpJob(job as Job<HttpJobData>);
        break;
      case 'ssl':
        await processSslJob(job as Job<SslJobData>);
        break;
      case 'domain':
        await processDomainJob(job as Job<DomainJobData>);
        break;
      default:
        console.error(`Unknown job type received: ${(job.data as any).type}`);
    }
  },
  {
    connection: {
      host: REDIS_HOST,
      port: REDIS_PORT,
      password: REDIS_PASSWORD,
    },
    concurrency: 5, // Process up to 5 jobs concurrently
    removeOnComplete: { count: 1000 }, // Keep last 1000 completed jobs
    removeOnFail: { count: 5000 },    // Keep last 5000 failed jobs
  }
);

monitoringWorker.on('completed', (job, result) => {
  console.log(`Job ${job.id} (type: ${job.data.type}) completed successfully.`);
});

monitoringWorker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} (type: ${job?.data.type}) failed with error: ${err.message}`, err.stack);
});

monitoringWorker.on('error', err => {
  console.error('Monitoring worker error:', err);
});

console.log('Monitoring worker started and listening for jobs...');

export default monitoringWorker; // Not strictly necessary to export, but can be useful
