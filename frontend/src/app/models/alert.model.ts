import { Target } from './target.model'; // For populated target

// Align AlertType with backend model
export type AlertType = 'DOWNTIME' | 'SSL_EXPIRY' | 'DOMAIN_EXPIRY' | 'RECOVERY';
export type AlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';

export interface Alert {
  id: string; // Mongoose ObjectId string
  target: string | Partial<Target>; // Can be ObjectId string or populated target object/subset
  type: AlertType;
  message: string;
  status: AlertStatus;
  triggeredAt: string | Date; // API might send as string
  resolvedAt?: string | Date | null;
  lastNotifiedAt?: string | Date | null;
  details?: Record<string, any>;
  createdAt: string | Date; // from Mongoose timestamps
  updatedAt: string | Date; // from Mongoose timestamps

  // Frontend specific, can be derived or added if needed
  // targetName?: string; // If target is populated, can get from target.name
}
