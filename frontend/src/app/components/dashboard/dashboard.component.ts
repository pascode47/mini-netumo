import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; // Import CommonModule

import { TargetListComponent } from '../target-list/target-list.component';
import { UptimeChartComponent } from '../uptime-chart/uptime-chart.component';
import { AlertHistoryComponent } from '../alert-history/alert-history.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, TargetListComponent, UptimeChartComponent, AlertHistoryComponent], // Add CommonModule
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  selectedTargetId?: string;

  onTargetSelected(targetId: string): void {
    this.selectedTargetId = targetId;
    console.log('Dashboard: Target selected ID:', this.selectedTargetId);
    // UptimeChartComponent and AlertHistoryComponent will react via their @Input() targetId
  }
}
