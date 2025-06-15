import { Component, OnInit, Output, EventEmitter, Inject, PLATFORM_ID } from '@angular/core'; // Added Inject, PLATFORM_ID
import { isPlatformBrowser, CommonModule } from '@angular/common'; // Added isPlatformBrowser
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { StatusCardComponent } from '../status-card/status-card.component';
import { TargetFormComponent } from '../target-form/target-form.component'; // Import the form component
import { Target } from '../../models/target.model';
import { ApiService } from '../../services/api.service'; // Import ApiService
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-target-list',
  standalone: true,
  imports: [
    CommonModule,
    StatusCardComponent,
    TargetFormComponent, // Add TargetFormComponent to imports
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './target-list.component.html',
  styleUrls: ['./target-list.component.scss']
})
export class TargetListComponent implements OnInit {
  targets: Target[] = [];
  isLoading: boolean = true;
  showTargetForm: boolean = false;
  isEditMode: boolean = false;
  currentTarget?: Target | null = null; // For editing
  @Output() targetSelectedForDetails = new EventEmitter<string>(); // Emits target ID for dashboard

  // Pagination properties
  currentPage: number = 1;
  limit: number = 10; // Or whatever your default is
  totalPages: number = 1;
  totalTargets: number = 0;


  constructor(
    private apiService: ApiService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadTargets();
    } else {
      // Optionally set some default/empty state for SSR if needed, or just skip loading
      this.isLoading = false; 
      this.targets = []; // Ensure targets is empty for SSR if API call is skipped
    }
  }

  loadTargets(page: number = this.currentPage): void {
    this.isLoading = true;
    this.currentPage = page;
    this.apiService.getTargets(this.currentPage, this.limit).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.targets = response.data;
          this.totalPages = response.totalPages || 1;
          this.totalTargets = response.count || response.data.length; // Adjust based on API response for total count
        } else {
          this.targets = []; // Handle error or empty response
          console.error('Failed to load targets or no data:', response.message);
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading targets:', err);
        this.targets = [];
        this.isLoading = false;
      }
    });
  }

  openAddTargetForm(): void {
    this.isEditMode = false;
    this.currentTarget = null;
    this.showTargetForm = true;
  }

  openEditTargetForm(target: Target): void {
    this.isEditMode = true;
    this.currentTarget = { ...target }; // Create a copy to avoid modifying the list directly
    this.showTargetForm = true;
  }

  handleFormSubmitted(targetData: Partial<Target>): void {
    if (this.isEditMode && this.currentTarget && this.currentTarget.id) {
      // Update existing target
      this.apiService.updateTarget(this.currentTarget.id, targetData).subscribe({
        next: (response) => {
          if (response.success) {
            this.loadTargets(this.currentPage); // Refresh list
          } else {
            console.error('Failed to update target:', response.message);
            // Handle error (e.g., show a notification to the user)
          }
        },
        error: (err) => {
          console.error('Error updating target:', err);
          // Handle error
        }
      });
    } else {
      // Create new target
      this.apiService.createTarget(targetData).subscribe({
        next: (response) => {
          if (response.success) {
            this.loadTargets(); // Refresh list, go to first page or current
          } else {
            console.error('Failed to create target:', response.message);
            // Handle error
          }
        },
        error: (err) => {
          console.error('Error creating target:', err);
          // Handle error
        }
      });
    }
    this.closeForm();
  }

  handleFormCancelled(): void {
    this.closeForm();
  }

  private closeForm(): void {
    this.showTargetForm = false;
    this.currentTarget = null;
    this.isEditMode = false;
  }

  handleDeleteTarget(targetId: string): void {
    if (confirm('Are you sure you want to delete this target?')) {
      this.apiService.deleteTarget(targetId).subscribe({
        next: (response) => {
          if (response.success) {
            this.loadTargets(this.currentPage); // Refresh list
          } else {
            console.error('Failed to delete target:', response.message);
          }
        },
        error: (err) => console.error('Error deleting target:', err)
      });
    }
  }
  
  // Pagination methods
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.loadTargets(this.currentPage + 1);
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.loadTargets(this.currentPage - 1);
    }
  }

  // Method to handle when a card is clicked in the list
  onCardClickedInList(targetId: string): void {
    this.targetSelectedForDetails.emit(targetId);
    // Optionally, you could also set this as the currentTarget for editing
    // or have separate logic for "view details" vs "edit"
    // For now, just emitting for dashboard to show chart/history
    console.log('Target selected for details:', targetId);
  }
}
