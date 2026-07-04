import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { InterviewService } from '../services/interview.service';
import { LogService } from '../services/log.service';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.scss']
})
export class UploadComponent {
  jobRole: string = '';
  selectedFile: File | null = null; // resume
  selectedJdFile: File | null = null; // optional job description
  questionLevelPreference: 'mixed' | 'easy' | 'medium' | 'hard' = 'mixed';
  questionCount: number | null = null;
  isDragging: boolean = false;
  isDraggingJd: boolean = false;
  isLoading: boolean = false;
  errorMsg: string = '';

  constructor(
    private apiService: ApiService,
    private interviewService: InterviewService,
    private router: Router,
    private logService: LogService
  ) {}

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
    const files = event.dataTransfer?.files;
    this.handleResumeFiles(files);
  }

  onFileSelected(event: any) {
    const files = event.target.files;
    this.handleResumeFiles(files);
  }

  onJdDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDraggingJd = true;
  }

  onJdDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDraggingJd = false;
  }

  onJdDrop(event: DragEvent) {
    event.preventDefault();
    this.isDraggingJd = false;
    const files = event.dataTransfer?.files;
    this.handleJdFiles(files);
  }

  onJdFileSelected(event: any) {
    const files = event.target.files;
    this.handleJdFiles(files);
  }

  handleResumeFiles(files: FileList | undefined | null) {
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === 'application/pdf') {
        this.selectedFile = file;
        this.errorMsg = '';
        this.logService.log({
          source: 'UPLOAD',
          level: 'info',
          message: `Selected resume file: ${file.name} (${this.formatFileSize(file.size)})`
        });
      } else {
        this.errorMsg = 'Please select a valid PDF file.';
        this.selectedFile = null;
        this.logService.log({
          source: 'UPLOAD',
          level: 'warning',
          message: 'Rejected file (not PDF)'
        });
      }
    }
  }

  handleJdFiles(files: FileList | undefined | null) {
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === 'application/pdf') {
        this.selectedJdFile = file;
        this.errorMsg = '';
        this.logService.log({
          source: 'UPLOAD',
          level: 'info',
          message: `Selected JD file: ${file.name} (${this.formatFileSize(file.size)})`
        });
      } else {
        this.errorMsg = 'Please select a valid PDF file for the Job Description.';
        this.selectedJdFile = null;
        this.logService.log({
          source: 'UPLOAD',
          level: 'warning',
          message: 'Rejected JD file (not PDF)'
        });
      }
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  onSubmit() {
    if (!this.selectedFile || !this.jobRole.trim()) {
      this.errorMsg = 'Please provide both your resume and job role.';
      this.logService.log({
        source: 'UPLOAD',
        level: 'warning',
        message: 'Attempted upload without both resume and job role'
      });
      return;
    }

    this.isLoading = true;
    this.errorMsg = '';
    this.logService.log({
      source: 'UPLOAD',
      level: 'info',
      message: `Uploading resume for role "${this.jobRole.trim()}"`
    });

    // Store the user's preferences before generating questions
    this.interviewService.setQuestionLevelPreference(this.questionLevelPreference);
    const sanitizedCount = this.questionCount && this.questionCount > 0 ? Math.floor(this.questionCount) : null;
    this.interviewService.setDesiredQuestionCount(sanitizedCount);

    this.apiService.uploadResume(this.selectedFile, this.jobRole, this.selectedJdFile).subscribe({
      next: (res) => {
        this.interviewService.setSession(res.session_id, this.jobRole, res.questions);
        this.isLoading = false;
        this.logService.log({
          source: 'UPLOAD',
          level: 'success',
          message: `Questions generated: ${res.questions.length} (session ${res.session_id})`
        });
        this.router.navigate(['/interview']);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMsg = err.error?.detail || 'An error occurred during upload. Please try again.';
        this.logService.log({
          source: 'UPLOAD',
          level: 'error',
          message: `Upload failed: ${this.errorMsg}`
        });
      }
    });
  }
}
