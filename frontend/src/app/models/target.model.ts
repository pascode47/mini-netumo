export interface Target {
  id: string; // Align with Mongoose ObjectId string (usually 'id' or '_id')
  url: string;
  name?: string;
  status: 'UP' | 'DOWN' | 'UNKNOWN' | 'CHECKING' | 'PAUSED'; // Match backend status
  lastCheckedAt?: string | Date; // Dates from API are often strings, might need conversion
  lastStatusChangeAt?: string | Date;
  consecutiveFailures: number;
  
  httpStatus?: number;
  responseTimeMs?: number;

  sslStatus?: 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'ERROR' | 'NA' | 'UNCHECKED';
  sslExpiresAt?: string | Date;
  sslLastCheckedAt?: string | Date;

  domainStatus?: 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'ERROR' | 'NA' | 'UNCHECKED';
  domainExpiresAt?: string | Date;
  domainLastCheckedAt?: string | Date;

  isActive: boolean;
  checkIntervalMinutes: number; // Renamed from checkInterval

  notificationEmail?: string;
  notificationWebhookUrl?: string;

  createdAt: string | Date;
  updatedAt: string | Date;

  // Frontend-specific calculated fields (optional, can be added in components/services)
  // sslDaysRemaining?: number; 
  // domainDaysRemaining?: number;
  
}
