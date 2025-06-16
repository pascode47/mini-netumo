import { Schema, model, Document, Types } from 'mongoose';

/**
 * OpenAPI/Swagger documentation for the Target model
 * This defines the schema that will be shown in API documentation
 * Includes both the full model (Target) and input model (TargetInput)
 */
/**
 * @openapi
 * components:
 *   schemas:
 *     Target:
 *       type: object
 *       required:
 *         - url
 *       properties:
 *         id:
 *           type: string
 *           description: The auto-generated id of the target
 *           readOnly: true
 *         url:
 *           type: string
 *           format: url
 *           description: The URL to be monitored.
 *         name:
 *           type: string
 *           description: A user-friendly name for the target.
 *         status:
 *           type: string
 *           enum: [UP, DOWN, UNKNOWN, CHECKING, PAUSED]
 *           description: Current monitoring status of the target.
 *           readOnly: true
 *         lastCheckedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp of the last health check.
 *           readOnly: true
 *         lastStatusChangeAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the status last changed.
 *           readOnly: true
 *         consecutiveFailures:
 *           type: integer
 *           description: Number of consecutive failed checks.
 *           readOnly: true
 *         httpStatus:
 *           type: integer
 *           description: Last HTTP status code received from the target.
 *           readOnly: true
 *         responseTimeMs:
 *           type: integer
 *           description: Last response time in milliseconds.
 *           readOnly: true
 *         sslStatus:
 *           type: string
 *           enum: [VALID, EXPIRING_SOON, EXPIRED, ERROR, NA, UNCHECKED]
 *           description: Status of the SSL certificate.
 *           readOnly: true
 *         sslExpiresAt:
 *           type: string
 *           format: date-time
 *           description: Expiry date of the SSL certificate.
 *           readOnly: true
 *         sslLastCheckedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp of the last SSL check.
 *           readOnly: true
 *         domainStatus:
 *           type: string
 *           enum: [VALID, EXPIRING_SOON, EXPIRED, ERROR, NA, UNCHECKED]
 *           description: Status of the domain registration.
 *           readOnly: true
 *         domainExpiresAt:
 *           type: string
 *           format: date-time
 *           description: Expiry date of the domain registration.
 *           readOnly: true
 *         domainLastCheckedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp of the last domain check.
 *           readOnly: true
 *         isActive:
 *           type: boolean
 *           description: Whether monitoring is active for this target.
 *         checkIntervalMinutes:
 *           type: integer
 *           description: Monitoring check interval in minutes.
 *           default: 5
 *         notificationEmail:
 *           type: string
 *           format: email
 *           description: Email address for sending alerts for this target.
 *         notificationWebhookUrl:
 *           type: string
 *           format: url
 *           description: Webhook URL for sending alerts for this target (e.g., Slack, Discord).
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp of when the target was created.
 *           readOnly: true
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp of when the target was last updated.
 *           readOnly: true
 *       example:
 *         id: 60c72b2f9b1e8a001c8e4d8b
 *         url: https://example.com
 *         name: Example Site
 *         status: UP
 *         lastCheckedAt: 2023-05-22T10:00:00.000Z
 *         consecutiveFailures: 0
 *         httpStatus: 200
 *         responseTimeMs: 150
 *         sslStatus: VALID
 *         sslExpiresAt: 2024-01-01T00:00:00.000Z
 *         isActive: true
 *         checkIntervalMinutes: 5
 *         createdAt: 2023-05-22T09:00:00.000Z
 *         updatedAt: 2023-05-22T10:00:00.000Z
 *     TargetInput:
 *       type: object
 *       required:
 *         - url
 *       properties:
 *         url:
 *           type: string
 *           format: url
 *           description: The URL to be monitored.
 *         name:
 *           type: string
 *           description: A user-friendly name for the target.
 *         checkIntervalMinutes:
 *           type: integer
 *           description: Monitoring check interval in minutes. Min 1.
 *           default: 5
 *         isActive:
 *           type: boolean
 *           description: Set monitoring active or paused.
 *           default: true
 *         notificationEmail:
 *           type: string
 *           format: email
 *           description: Email address for sending alerts for this target. Optional.
 *         notificationWebhookUrl:
 *           type: string
 *           format: url
 *           description: Webhook URL for sending alerts (e.g., Slack, Discord). Optional.
       example:
 *         url: https://newsite.com
 *         name: New Site
 *         checkIntervalMinutes: 10
 *         isActive: true
 *         notificationEmail: "user@example.com"
 *         notificationWebhookUrl: "https://hooks.slack.com/services/..."
 */

// Interface representing a Target document in MongoDB
// This extends Mongoose's Document interface to add type safety
export interface ITarget extends Document {
  url: string;
  name?: string; // Optional user-friendly name
  notificationEmail?: string; // Email for notifications specific to this target
  notificationWebhookUrl?: string; // Webhook URL for notifications
  status: 'UP' | 'DOWN' | 'UNKNOWN' | 'CHECKING' | 'PAUSED';
  lastCheckedAt?: Date;
  lastStatusChangeAt?: Date; // When the status last changed (e.g., from UP to DOWN)
  consecutiveFailures: number;
  
  // HTTP/HTTPS Monitoring
  httpStatus?: number; // Last HTTP status code
  responseTimeMs?: number; // Last response time in milliseconds

  // SSL Certificate Monitoring
  sslStatus?: 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'ERROR' | 'NA' | 'UNCHECKED'; // NA for non-HTTPS
  sslExpiresAt?: Date;
  sslLastCheckedAt?: Date;

  // Domain Expiration Monitoring
  domainStatus?: 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'ERROR' | 'NA' | 'UNCHECKED'; // NA if not applicable or check failed
  domainExpiresAt?: Date;
  domainLastCheckedAt?: Date;

  isActive: boolean; // User can pause/resume monitoring
  checkIntervalMinutes: number; // How often to check this target

  createdAt: Date;
  updatedAt: Date;
}

// Mongoose schema definition for the Target model
// This defines the structure and validation rules for documents in the targets collection
const TargetSchema = new Schema<ITarget>(
  {
    url: {
      type: String,
      required: [true, 'Target URL is required.'],
      unique: true, // Ensure URLs are unique in the database
      trim: true, // Automatically trim whitespace
      // Basic URL validation (can be enhanced)
      match: [/^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/, 'Please provide a valid URL.'],
    },
    name: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['UP', 'DOWN', 'UNKNOWN', 'CHECKING', 'PAUSED'], // Only allow these values
      default: 'UNKNOWN', // Default status when first created
    },
    lastCheckedAt: {
      type: Date,
    },
    lastStatusChangeAt: {
      type: Date,
    },
    consecutiveFailures: {
      type: Number,
      default: 0, // Start with 0 failures
    },
    httpStatus: {
      type: Number,
    },
    responseTimeMs: {
      type: Number,
    },
    sslStatus: {
      type: String,
      enum: ['VALID', 'EXPIRING_SOON', 'EXPIRED', 'ERROR', 'NA', 'UNCHECKED'],
      default: 'UNCHECKED', // Default status before first SSL check
    },
    sslExpiresAt: {
      type: Date,
    },
    sslLastCheckedAt: {
      type: Date,
    },
    domainStatus: {
      type: String,
      enum: ['VALID', 'EXPIRING_SOON', 'EXPIRED', 'ERROR', 'NA', 'UNCHECKED'],
      default: 'UNCHECKED', // Default status before first domain check
    },
    domainExpiresAt: {
      type: Date,
    },
    domainLastCheckedAt: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true, // Monitoring is active by default
    },
    checkIntervalMinutes: {
      type: Number,
      default: () => parseInt(process.env.DEFAULT_MONITORING_INTERVAL_MINUTES || '5', 10), // Use env var or default to 5
      min: [1, 'Check interval must be at least 1 minute.'], // Minimum check interval
    },
    notificationEmail: {
      type: String,
      trim: true,
      // Basic email validation regex (can be improved)
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address for notifications.',
      ],
    },
    notificationWebhookUrl: {
      type: String,
      trim: true,
      // Basic URL validation (can be improved)
      match: [/^(https?):\/\/[^\s/$.?#].[^\s]*$/, 'Please provide a valid webhook URL.'],
    },
  },
  {
    // Schema options
    timestamps: true, // Automatically adds createdAt and updatedAt fields
    toJSON: {
      virtuals: true, // Include virtuals when converting to JSON
      transform: (doc, ret) => {
        delete ret.__v; // Remove version key (__v) from output
        // ret.id = ret._id; // Optionally transform _id to id
        // delete ret._id;
        return ret;
      },
    },
    toObject: {
      virtuals: true, // Include virtuals when converting to plain object
       transform: (doc, ret) => {
        delete ret.__v; // Remove version key (__v) from output
        // ret.id = ret._id;
        // delete ret._id;
        return ret;
      },
    },
  }
);

// Create indexes for frequently queried fields to improve query performance
TargetSchema.index({ url: 1 }); // Index for URL field (ascending)
TargetSchema.index({ status: 1 }); // Index for status field
TargetSchema.index({ isActive: 1 }); // Index for isActive field
TargetSchema.index({ lastCheckedAt: -1 }); // Index for lastCheckedAt (descending)

// Create the Mongoose model from the schema
const TargetModel = model<ITarget>('Target', TargetSchema);

// Export the model for use in other parts of the application
export default TargetModel;