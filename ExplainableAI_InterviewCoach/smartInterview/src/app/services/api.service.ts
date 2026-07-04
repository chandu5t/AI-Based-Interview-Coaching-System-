import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ResumeUploadResponse, InterviewEvaluationRequest, EvaluationResult, AudioEvaluationResult } from '../models/interview.model';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = 'http://localhost:8000';

  constructor(private http: HttpClient) {}

  uploadResume(file: File, jobRole: string, jdFile?: File | null): Observable<ResumeUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('job_role', jobRole);
    if (jdFile) {
      formData.append('jd_file', jdFile);
    }
    return this.http.post<ResumeUploadResponse>(`${this.apiUrl}/resume/upload`, formData);
  }

  evaluateAnswers(request: InterviewEvaluationRequest): Observable<EvaluationResult> {
    return this.http.post<EvaluationResult>(`${this.apiUrl}/interview/evaluate`, request);
  }

  evaluateAudioAnswer(audioBlob: Blob): Observable<AudioEvaluationResult> {
    const formData = new FormData();
    formData.append('file', audioBlob, 'answer.webm');
    return this.http.post<AudioEvaluationResult>(`${this.apiUrl}/audio/evaluate`, formData);
  }
}