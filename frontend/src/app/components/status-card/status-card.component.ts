import { Component, Input, Output, EventEmitter } from '@angular/core'; // Added Output, EventEmitter
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { Target } from '../../models/target.model';

@Component({
  selector: 'app-status-card',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule],
  templateUrl: './status-card.component.html',
  styleUrl: './status-card.component.scss'
})
export class StatusCardComponent {
  @Input() target?: Target;
  @Output() cardClicked = new EventEmitter<string>(); // Emits target ID

  onCardClick(): void {
    if (this.target && this.target.id) {
      this.cardClicked.emit(this.target.id);
    }
  }

  getSslDaysRemaining(): number | null {
    if (this.target?.sslExpiresAt) {
      const expiryDate = new Date(this.target.sslExpiresAt);
      const today = new Date();
      const diffTime = expiryDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    }
    return null;
  }

  getDomainDaysRemaining(): number | null {
    if (this.target?.domainExpiresAt) {
      const expiryDate = new Date(this.target.domainExpiresAt);
      const today = new Date();
      const diffTime = expiryDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    }
    return null;
  }

  getSslStatusClass(): string {
    if (!this.target || !this.target.sslStatus) return '';
    switch (this.target.sslStatus) {
      case 'VALID':
        return 'status-valid';
      case 'EXPIRING_SOON':
        return 'status-expiring-soon';
      case 'EXPIRED':
      case 'ERROR':
        return 'status-error';
      default:
        return 'status-unknown';
    }
  }

  getDomainStatusClass(): string {
    if (!this.target || !this.target.domainStatus) return '';
    switch (this.target.domainStatus) {
      case 'VALID':
        return 'status-valid';
      case 'EXPIRING_SOON':
        return 'status-expiring-soon';
      case 'EXPIRED':
      case 'ERROR':
        return 'status-error';
      default:
        return 'status-unknown';
    }
  }
}
