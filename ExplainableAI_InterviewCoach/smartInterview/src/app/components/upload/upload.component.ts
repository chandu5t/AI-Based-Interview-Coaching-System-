import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { InterviewService } from '../../services/interview.service';

@Component({
    selector: 'app-upload',
    templateUrl: './upload.component.html',
    styleUrls: ['./upload.component.css']
})
export class UploadComponent {
    jobRole = '';
    selectedFile: File | null = null;
    loading = false;
    error = '';

    constructor(
        private api: ApiService,
        private interviewService: InterviewService,
        private router: Router
    ) { }

    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files?.length) {
            this.selectedFile = input.files[0];
            this.error = '';
        }
    }

    onSubmit(): void {
        if (!this.selectedFile || !this.jobRole.trim()) {
            this.error = 'Please provide both a resume PDF and a job role.';
            return;
        }

        this.loading = true;
        this.error = '';

        this.api.uploadResume(this.selectedFile, this.jobRole.trim()).subscribe({
            next: (res) => {
                this.interviewService.setSession(res.session_id, this.jobRole.trim(), res.questions);
                this.router.navigate(['/interview']);
            },
            error: (err) => {
                this.error = err.error?.detail || 'Something went wrong. Please try again.';
                this.loading = false;
            }
        });
    }
}