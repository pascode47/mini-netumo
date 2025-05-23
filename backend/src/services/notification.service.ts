import nodemailer from 'nodemailer';
import axios from 'axios';
import dotenv from 'dotenv';
import AlertModel, { IAlert } from '../models/alert.model'; // Import AlertModel and IAlert
import { ITarget } from '../models/target.model'; // Assuming ITarget is exported

dotenv.config();

// Nodemailer transporter setup (using Mailtrap from .env)
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: parseInt(process.env.MAIL_PORT || '2525', 10),
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

interface NotificationPayload {
  alert: IAlert;
  target: ITarget; // Or just relevant target info like URL/name
}

/**
 * Sends an email notification for an alert.
 * @param payload - The alert and target information.
 */
export const sendEmailNotification = async (payload: NotificationPayload): Promise<void> => {
  const { alert, target } = payload;
  const mailTo = process.env.ALERT_EMAIL_TO || 'alerts@example.com';
  const mailFrom = process.env.MAIL_FROM || '"Mini-Netumo" <no-reply@example.com>';

  const subject = `[Mini-Netumo Alert] ${alert.type} - ${target.name || target.url}`;
  
  let htmlBody = `
    <h1>Mini-Netumo Alert</h1>
    <p><strong>Target:</strong> ${target.name || target.url} (${target.url})</p>
    <p><strong>Alert Type:</strong> ${alert.type}</p>
    <p><strong>Status:</strong> ${alert.status}</p>
    <p><strong>Message:</strong> ${alert.message}</p>
    <p><strong>Triggered At:</strong> ${alert.triggeredAt.toLocaleString()}</p>
  `;

  if (alert.resolvedAt) {
    htmlBody += `<p><strong>Resolved At:</strong> ${alert.resolvedAt.toLocaleString()}</p>`;
  }
  if (alert.details) {
    htmlBody += `<h2>Details:</h2><pre>${JSON.stringify(alert.details, null, 2)}</pre>`;
  }

  const mailOptions = {
    from: mailFrom,
    to: mailTo, // In a real app, this would come from user preferences or target settings
    subject: subject,
    html: htmlBody,
    text: alert.message, // Plain text version
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email notification sent for alert ${alert.id}: ${info.messageId}`);
  } catch (error) {
    console.error(`Error sending email notification for alert ${alert.id}:`, error);
  }
};

/**
 * Sends a webhook notification (e.g., to Slack/Discord).
 * @param payload - The alert and target information.
 */
export const sendWebhookNotification = async (payload: NotificationPayload): Promise<void> => {
  const { alert, target } = payload;
  // Prioritize per-target webhook URL, then global .env, then skip.
  const webhookUrl = target.notificationWebhookUrl || process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn(`Webhook URL not configured for target ${target.id} and no global fallback. Skipping webhook notification.`);
    return;
  }

  // Construct a payload suitable for Slack/Discord
  // This is a basic example; Slack/Discord have richer formatting options.
  const webhookPayload = {
    text: `🚨 Mini-Netumo Alert: ${alert.type} for ${target.name || target.url}`,
    attachments: [
      {
        title: `Target: ${target.name || target.url} (${target.url})`,
        fields: [
          { title: "Alert Type", value: alert.type, short: true },
          { title: "Status", value: alert.status, short: true },
          { title: "Message", value: alert.message, short: false },
          { title: "Triggered At", value: alert.triggeredAt.toLocaleString(), short: true },
        ],
        color: alert.status === 'RESOLVED' ? "good" : (alert.type === 'RECOVERY' ? "good" : "danger"),
      },
    ],
  };
  
  if (alert.resolvedAt) {
    webhookPayload.attachments[0].fields.push({ title: "Resolved At", value: alert.resolvedAt.toLocaleString(), short: true });
  }
  if (alert.details) {
     webhookPayload.attachments[0].fields.push({ title: "Details", value: JSON.stringify(alert.details, null, 2), short: false });
  }


  try {
    await axios.post(webhookUrl, webhookPayload, {
      headers: { 'Content-Type': 'application/json' },
    });
    console.log(`Webhook notification sent for alert ${alert.id} to ${webhookUrl}`);
  } catch (error: any) {
    console.error(`Error sending webhook notification for alert ${alert.id}:`, error.response ? error.response.data : error.message);
  }
};

/**
 * Central function to dispatch all configured notifications for an alert.
 * @param alertDoc - The Mongoose document for the alert.
 */
export const dispatchNotifications = async (alertDoc: IAlert): Promise<void> => {
  // Fetch the associated target to include its details in notifications
  // Ensure target is populated or fetch it if alertDoc.target is just an ObjectId
  let targetDoc = alertDoc.target as unknown as ITarget; // Type assertion
  
  if (!(targetDoc && targetDoc.url)) { // Check if target is populated
      const populatedAlert = await AlertModel.findById(alertDoc._id).populate<{target: ITarget}>('target');
      if (!populatedAlert || !populatedAlert.target) {
          console.error(`Cannot dispatch notification for alert ${alertDoc._id}: Target not found or not populated.`);
          return;
      }
      targetDoc = populatedAlert.target;
  }

  const payload: NotificationPayload = {
    alert: alertDoc,
    target: targetDoc,
  };

  // Send email
  await sendEmailNotification(payload);

  // Send webhook
  await sendWebhookNotification(payload);
  
  // Update lastNotifiedAt on the alert
  alertDoc.lastNotifiedAt = new Date();
  await alertDoc.save();
};
