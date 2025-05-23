import { Component, Input, OnChanges, SimpleChanges, OnInit, Inject, PLATFORM_ID } from '@angular/core'; // Added Inject, PLATFORM_ID
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { CommonModule, isPlatformBrowser } from '@angular/common'; // Added isPlatformBrowser
import { Alert, AlertType, AlertStatus } from '../../models/alert.model'; // Updated model
import { ApiService } from '../../services/api.service'; // Import ApiService

@Component({
  selector: 'app-alert-history',
  standalone: true,
  imports: [CommonModule, MatListModule, MatIconModule, MatPaginatorModule],
  templateUrl: './alert-history.component.html',
  styleUrls: ['./alert-history.component.scss']
})
export class AlertHistoryComponent implements OnChanges, OnInit {
  @Input() targetId?: string;

  alerts: Alert[] = [];
  isLoading: boolean = false;
  errorMessage?: string;

  // Pagination for alerts
  currentPage: number = 1;
  limit: number = 5; // Show 5 alerts per page
  totalAlerts: number = 0;

  constructor(
    private apiService: ApiService,
    @Inject(PLATFORM_ID) private platformId: Object
    ) { }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      if (this.targetId) {
        this.loadAlertHistory();
      }
    } else {
      this.isLoading = false;
      this.alerts = [];
      this.errorMessage = "Alert history is loaded in browser.";
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (isPlatformBrowser(this.platformId)) {
      if (changes['targetId'] && this.targetId) {
        this.currentPage = 1; 
        this.loadAlertHistory();
      }
    } else {
       // If targetId changes on server, reset, but don't load
      if (changes['targetId']) {
        this.isLoading = false;
        this.alerts = [];
        this.totalAlerts = 0;
        this.currentPage = 1;
        this.errorMessage = "Alert history is loaded in browser.";
      }
    }
  }

  loadAlertHistory(page: number = this.currentPage): void {
    if (!this.targetId) {
      this.alerts = [];
      this.totalAlerts = 0;
      return;
    }
    this.isLoading = true;
    this.errorMessage = undefined;
    this.currentPage = page;

    this.apiService.getAlertsForTarget(this.targetId, this.currentPage, this.limit).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.alerts = response.data;
          this.totalAlerts = response.count || response.data.length; 
          // Assuming backend might not send totalPages, calculate if needed or rely on count
        } else {
          this.alerts = [];
          this.totalAlerts = 0;
          this.errorMessage = response.message || 'Failed to load alert history.';
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading alert history:', err);
        this.alerts = [];
        this.totalAlerts = 0;
        this.errorMessage = 'Error loading alert history.';
        this.isLoading = false;
      }
    });
  }

  handlePageEvent(event: PageEvent): void {
    this.currentPage = event.pageIndex + 1; // MatPaginator is 0-indexed
    this.limit = event.pageSize;
    this.loadAlertHistory();
  }
  
  getIconForAlertType(type: AlertType): string {
    switch (type) {
      case 'DOWNTIME': return 'error_outline'; // Standard error icon
      case 'SSL_EXPIRY': return 'security'; // Security related
      case 'DOMAIN_EXPIRY': return 'event_busy'; // Calendar related for expiry
      case 'RECOVERY': return 'check_circle_outline'; // Standard success/recovery
      default: return 'info_outline';
    }
  }

  getColorForAlert(alert: Alert): string {
    if (alert.status === 'RESOLVED' || alert.type === 'RECOVERY') {
      return 'primary'; // Green for resolved/recovered
    }
    switch (alert.type) {
      case 'DOWNTIME': return 'warn'; // Red for downtime
      case 'SSL_EXPIRY':
      case 'DOMAIN_EXPIRY':
        return 'accent'; // Orange/Yellow for warnings
      default: return ''; // Default or based on theme
    }
  }

  getTargetName(alert: Alert): string {
    if (typeof alert.target === 'object' && alert.target?.name) {
      return alert.target.name;
    }
    // If target is just an ID or name is not populated, you might want a placeholder
    return 'Target'; 
  }
}
