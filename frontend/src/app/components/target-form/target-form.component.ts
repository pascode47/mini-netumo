import { Component, OnInit, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Target } from '../../models/target.model';
// Assuming ApiService is where HTTP calls are made
// import { ApiService } from '../../services/api.service'; 

@Component({
  selector: 'app-target-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCheckboxModule
  ],
  templateUrl: './target-form.component.html',
  styleUrls: ['./target-form.component.scss']
})
export class TargetFormComponent implements OnInit, OnChanges {
  @Input() targetToEdit?: Target | null; // Input for editing an existing target
  @Input() isEditMode: boolean = false;
  @Output() formSubmitted = new EventEmitter<Partial<Target>>(); // Emits form data
  @Output() formCancelled = new EventEmitter<void>();

  targetForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.targetForm = this.fb.group({
      id: [null], // Hidden or not directly editable by user
      url: ['', [Validators.required, Validators.pattern(/^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/)]],
      name: [''],
      checkIntervalMinutes: [5, [Validators.required, Validators.min(1)]],
      isActive: [true],
      notificationEmail: ['', [Validators.email]],
      notificationWebhookUrl: ['', [Validators.pattern(/^(https?):\/\/[^\s/$.?#].[^\s]*$/)]]
    });
  }

  ngOnInit(): void {
    if (this.isEditMode && this.targetToEdit) {
      this.populateForm(this.targetToEdit);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['targetToEdit'] && this.targetToEdit && this.isEditMode) {
      this.populateForm(this.targetToEdit);
    } else if (changes['isEditMode'] && !this.isEditMode) {
      this.targetForm.reset({
        checkIntervalMinutes: 5,
        isActive: true
      });
    }
  }

  private populateForm(target: Target): void {
    this.targetForm.patchValue({
      id: target.id,
      url: target.url,
      name: target.name,
      checkIntervalMinutes: target.checkIntervalMinutes,
      isActive: target.isActive,
      notificationEmail: target.notificationEmail,
      notificationWebhookUrl: target.notificationWebhookUrl
    });
  }

  onSubmit(): void {
    if (this.targetForm.valid) {
      this.formSubmitted.emit(this.targetForm.value);
    } else {
      // Mark fields as touched to show errors
      this.targetForm.markAllAsTouched();
    }
  }

  onCancel(): void {
    this.formCancelled.emit();
  }
}
