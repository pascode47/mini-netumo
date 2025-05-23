import { Queue, QueueOptions } from 'bullmq';
import dotenv from 'dotenv';

dotenv.config();

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

const connectionOptions = {
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD,
};

const queueOptions: QueueOptions = {
  connection: connectionOptions,
  defaultJobOptions: {
    attempts: 3, // Number of times to retry a failed job
    backoff: {
      type: 'exponential', // Exponential backoff strategy
      delay: 1000 * 60,    // Initial delay of 1 minute for retries
    },
    removeOnComplete: true, // Remove job from queue once completed
    removeOnFail: 1000,     // Keep up to 1000 failed jobs (or false to keep all)
  },
};

// Define the monitoring queue
// The queue name 'monitoring' will be used by workers to process jobs from this queue.
const monitoringQueue = new Queue('monitoring', queueOptions);

monitoringQueue.on('error', (error) => {
  console.error('BullMQ monitoring queue error:', error);
});

// Function to add a target monitoring job to the queue
// This might be called when a new target is created or when a target is unpaused.
export const addHttpMonitoringJob = async (targetId: string, targetUrl: string, intervalMinutes: number) => {
  // Job name can be more specific, e.g., `http-check-${targetId}`
  // Job ID can be targetId to ensure only one recurring job per target for this type of check
  await monitoringQueue.add(
    `http-check:${targetId}`, // Job name (can be used for identification)
    { targetId, targetUrl, type: 'http' }, // Job data
    {
      repeat: {
        every: intervalMinutes * 60 * 1000, // Repeat interval in milliseconds
      },
      jobId: `http-check:${targetId}`, // Unique job ID to prevent duplicates for recurring jobs
    }
  );
  console.log(`Added HTTP monitoring job for target ${targetId} (${targetUrl}) to queue, repeating every ${intervalMinutes} minutes.`);
};

// Function to add SSL monitoring job (runs daily)
export const addSslMonitoringJob = async (targetId: string, targetUrl: string) => {
  if (!targetUrl.startsWith('https://')) return; // Only for HTTPS targets

  await monitoringQueue.add(
    `ssl-check:${targetId}`,
    { targetId, targetUrl, type: 'ssl' },
    {
      repeat: {
        pattern: '0 0 * * *', // Daily at midnight UTC
      },
      jobId: `ssl-check:${targetId}`,
    }
  );
  console.log(`Added SSL monitoring job for target ${targetId} (${targetUrl}) to queue, repeating daily.`);
};

// Function to add Domain Expiry monitoring job (runs daily)
export const addDomainMonitoringJob = async (targetId: string, targetUrl: string) => {
    const hostname = new URL(targetUrl).hostname;
    await monitoringQueue.add(
        `domain-check:${targetId}`,
        { targetId, hostname, type: 'domain' }, // Pass hostname for WHOIS lookup
        {
            repeat: {
                pattern: '0 1 * * *', // Daily at 1 AM UTC (to avoid overlap with SSL)
            },
            jobId: `domain-check:${targetId}`,
        }
    );
    console.log(`Added Domain Expiry monitoring job for target ${targetId} (${hostname}) to queue, repeating daily.`);
};


// Function to remove a recurring job (e.g., when a target is deleted or paused)
export const removeMonitoringJob = async (jobIdPrefix: string, targetId: string) => {
  const jobKey = `${jobIdPrefix}:${targetId}`;
  const repeatableJobs = await monitoringQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.id === jobKey || job.name === jobKey) { // BullMQ might use name or id for repeatable jobs
      await monitoringQueue.removeRepeatableByKey(job.key);
      console.log(`Removed repeatable job with key ${job.key} (target ${targetId}) from queue.`);
      return; // Assuming one job type per prefix for a target
    }
  }
  // Fallback if not found by id/name, try removing by name if it was added that way
  // This part might be redundant if jobId is always used correctly.
  const jobs = await monitoringQueue.getJobs(['waiting', 'delayed', 'active', 'paused']);
  for (const job of jobs) {
    if (job?.name === jobKey) {
        if (job?.opts.repeat) {
             await monitoringQueue.removeRepeatable(job.name, job.opts.repeat, job.id);
        } else {
            await job.remove();
        }
        console.log(`Removed job ${job.name} (target ${targetId}) from queue.`);
    }
  }
};


export default monitoringQueue;
