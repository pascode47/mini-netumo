import { Schema, model, Document, Types } from 'mongoose';

/**
 * OpenAPI/Swagger documentation for the Alert schema.
 * This defines how the Alert model appears in API documentation.
 * @openapi
 * components:
 *   schemas:
 *     Alert:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: The auto-generated id of the alert.
 *           readOnly: true
 *         target:
 *           oneOf: # Can be ObjectId string or populated Target object
 *             - type: string 
 *               description: ID of the target this alert is for.
 *             - $ref: '#/components/schemas/Target'
 *         type:
 *           type: string
 *           enum: [DOWNTIME, SSL_EXPIRY, DOMAIN_EXPIRY, RECOVERY]
 *           description: The type of alert.
 *         message:
 *           type: string
 *           description: A descriptive message for the alert.
 *         status:
 *           type: string
 *           enum: [ACTIVE, ACKNOWLEDGED, RESOLVED]
 *           description: Current status of the alert.
 *         triggeredAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the alert condition was first met.
 *         resolvedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the alert condition was resolved.
 *         lastNotifiedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the last notification for this alert was sent.
 *         details:
 *           type: object
 *           description: Additional details specific to the alert type.
 *           additionalProperties: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp of when the alert was created.
 *           readOnly: true
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp of when the alert was last updated.
 *           readOnly: true
 *       example:
 *         id: "60c72b2f9b1e8a001c8e4d8c"
 *         target: "60c72b2f9b1e8a001c8e4d8b" 
 *         type: "DOWNTIME"
 *         message: "Target https://example.com is DOWN. Consecutive failures: 2."
 *         status: "ACTIVE"
 *         triggeredAt: "2023-05-22T10:05:00.000Z"
 *         details: 
 *           consecutiveFailures: 2
 *           httpStatus: 500
 */

// Interface defining the structure of an Alert document in MongoDB
export interface IAlert extends Document {
  target: Types.ObjectId; // Reference to the Target being alerted for
  type: 'DOWNTIME' | 'SSL_EXPIRY' | 'DOMAIN_EXPIRY' | 'RECOVERY'; // Type of alert
  message: string; // Detailed message about the alert
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED'; // Current status of the alert
  triggeredAt: Date; // When the alert condition was first met
  resolvedAt?: Date; // Optional - when the alert condition was resolved
  lastNotifiedAt?: Date; // Optional - when the last notification for this alert was sent
  details?: Record<string, any>; // Optional - any additional details (e.g., error codes, specific expiry dates)
}

// Mongoose schema definition for the Alert model
const AlertSchema = new Schema<IAlert>(
  {
    // Reference to the Target model
    target: {
      type: Schema.Types.ObjectId,
      ref: 'Target', // References the Target collection
      required: true, // This field is mandatory
      index: true, // Create an index for faster queries
    },
    // Type of alert with predefined possible values
    type: {
      type: String,
      enum: ['DOWNTIME', 'SSL_EXPIRY', 'DOMAIN_EXPIRY', 'RECOVERY'], // Only these values allowed
      required: true, // This field is mandatory
    },
    // Alert message
    message: {
      type: String,
      required: true, // This field is mandatory
    },
    // Current status of the alert
    status: {
      type: String,
      enum: ['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'], // Only these values allowed
      default: 'ACTIVE', // Default value if not provided
      index: true, // Create an index for faster queries
    },
    // When the alert was triggered
    triggeredAt: {
      type: Date,
      default: Date.now, // Defaults to current time if not provided
    },
    // When the alert was resolved (optional)
    resolvedAt: {
      type: Date,
    },
    // When the last notification was sent (optional)
    lastNotifiedAt: {
      type: Date,
    },
    // Additional flexible data storage
    details: {
      type: Schema.Types.Mixed, // Allows for flexible additional data of any type
    },
  },
  {
    // Schema options
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

// Create and export the Mongoose model based on the schema
const AlertModel = model<IAlert>('Alert', AlertSchema);

export default AlertModel;