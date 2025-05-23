import { Component, Input, OnChanges, SimpleChanges, Inject, PLATFORM_ID } from '@angular/core'; // Added Inject, PLATFORM_ID
import { NgxChartsModule, ScaleType } from '@swimlane/ngx-charts';
import { CommonModule, isPlatformBrowser } from '@angular/common'; // Added isPlatformBrowser
import { ApiService } from '../../services/api.service'; // Import ApiService

interface ChartDataPoint {
  name: string | Date; // Timestamp or formatted time string
  value: number;     // 1 for UP, 0 for DOWN
}

interface ChartSeries {
  name: string;
  series: ChartDataPoint[];
}

@Component({
  selector: 'app-uptime-chart',
  standalone: true,
  imports: [CommonModule, NgxChartsModule],
  templateUrl: './uptime-chart.component.html',
  styleUrls: ['./uptime-chart.component.scss']
})
export class UptimeChartComponent implements OnChanges {
  @Input() targetId?: string;

  uptimeData: ChartSeries[] = [];
  isLoading: boolean = true;
  errorMessage?: string;

  // Chart options
  view: [number, number] = [700, 250]; // width, height
  showXAxis = true;
  showYAxis = true;
  gradient = false;
  showLegend = false; // Simple UP/DOWN doesn't need a legend for one series
  showXAxisLabel = true;
  xAxisLabel = 'Time (Last 24 Hours)';
  showYAxisLabel = true;
  yAxisLabel = 'Status (1=UP, 0=DOWN)';
  colorScheme = {
    name: 'uptimeScheme',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: ['#5AA454'] // Green for UP line
  };
  yAxisTicks: number[] = [0, 1]; // Ensure Y-axis only shows 0 and 1

  constructor(
    private apiService: ApiService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (isPlatformBrowser(this.platformId)) {
      if (changes['targetId'] && this.targetId) {
        this.loadUptimeData();
      }
    } else {
      this.isLoading = false;
      this.uptimeData = [{ name: 'Uptime Status', series: [] }]; // Default for SSR
      this.errorMessage = "Chart data is loaded in browser.";
    }
  }

  loadUptimeData(): void {
    if (!this.targetId) return;
    this.isLoading = true;
    this.errorMessage = undefined;
    this.apiService.getTargetUptimeSummary(this.targetId).subscribe({
      next: (response) => {
        if (response.success && response.data && response.data.events) {
          this.uptimeData = this.transformDataForChart(response.data.events);
          if (this.uptimeData[0]?.series.length === 0) {
            this.errorMessage = "No uptime data available for the selected period.";
          }
        } else {
          this.errorMessage = response.message || "Failed to load uptime data.";
          this.uptimeData = [];
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading uptime data:', err);
        this.errorMessage = "Error loading uptime data.";
        this.uptimeData = [];
        this.isLoading = false;
      }
    });
  }

  private transformDataForChart(events: { timestamp: string | Date, status: 'UP' | 'DOWN' }[]): ChartSeries[] {
    if (!events || events.length === 0) {
      return [{ name: 'Uptime Status', series: [] }];
    }

    const seriesData: ChartDataPoint[] = events.map(event => ({
      name: new Date(event.timestamp), // ngx-charts handles Date objects for time series
      value: event.status === 'UP' ? 1 : 0
    }));
    
    // ngx-charts line chart might need points to be sorted by date if not already
    seriesData.sort((a, b) => (a.name as Date).getTime() - (b.name as Date).getTime());

    return [{ name: 'Uptime Status', series: seriesData }];
  }

  // Optional: Custom Y-axis tick formatting if needed
  yAxisTickFormat(value: number): string {
    return value === 1 ? 'UP' : (value === 0 ? 'DOWN' : '');
  }

  // Keep these if you want to log chart interactions
  onSelect(event: any): void {
    console.log('Item selected', event);
  }
}
