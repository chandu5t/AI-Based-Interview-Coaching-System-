import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { InterviewService } from '../services/interview.service';
import { ApiService } from '../services/api.service';
import { Question, AudioEvaluationResult } from '../models/interview.model';
import { VoiceAsrService } from '../services/voice-asr.service';
import { LogService } from '../services/log.service';

@Component({
  selector: 'app-interview',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './interview.component.html',
  styleUrls: ['./interview.component.scss']
})
export class InterviewComponent implements OnInit {
  questions: Question[] = [];
  answers: { [key: string]: string } = {};
  isLoading: boolean = false;
  errorMsg: string = '';
  activeVoiceQuestionId: string | null = null;
  transcribingQuestionId: string | null = null;
  // Store one recording per question so we can analyse speaking confidence per answer
  audioBlobs: { [key: string]: Blob } = {};

  constructor(
    private interviewService: InterviewService,
    private apiService: ApiService,
    private router: Router,
    private voiceAsr: VoiceAsrService,
    private logService: LogService
  ) {}

  ngOnInit() {
    const sessionId = this.interviewService.getSessionId();
    if (!sessionId) {
      this.router.navigate(['/upload']);
      return;
    }
    
    this.questions = this.interviewService.getQuestions();
    // Initialize answers
    this.questions.forEach(q => {
      this.answers[q.id] = '';
    });

    this.logService.log({
      source: 'INTERVIEW',
      level: 'info',
      message: `Loaded ${this.questions.length} questions for session`
    });
  }

  get answeredCount(): number {
    return Object.values(this.answers).filter(val => val && val.trim().length > 0).length;
  }

  get totalQuestions(): number {
    return this.questions.length;
  }

  get progressPercentage(): number {
    if (this.totalQuestions === 0) return 0;
    return (this.answeredCount / this.totalQuestions) * 100;
  }

  get isAllAnswered(): boolean {
    return this.answeredCount === this.totalQuestions;
  }

  isRecordingFor(questionId: string): boolean {
    return this.activeVoiceQuestionId === questionId;
  }

  isTranscribingFor(questionId: string): boolean {
    return this.transcribingQuestionId === questionId;
  }

  async toggleVoice(question: Question) {
    if (this.isRecordingFor(question.id)) {
      // Stop & transcribe (immediately clear UI state)
      const targetQuestionId = question.id;
      this.activeVoiceQuestionId = null;
      this.transcribingQuestionId = targetQuestionId;
      try {
        const { text, blob } = await this.voiceAsr.stopAndGetAudio();
        this.transcribingQuestionId = null;
        if (text) {
          const existing = this.answers[targetQuestionId] || '';
          this.answers[targetQuestionId] = existing
            ? existing + (existing.endsWith(' ') ? '' : ' ') + text
            : text;
          if (blob) {
            this.audioBlobs[targetQuestionId] = blob;
          }
          this.logService.log({
            source: 'VOICE',
            level: 'success',
            message: `Transcription received for question "${targetQuestionId}"`
          });
        }
      } catch (e) {
        this.transcribingQuestionId = null;
        this.errorMsg = 'Voice transcription failed. Please try again or type your answer.';
        this.logService.log({
          source: 'VOICE',
          level: 'error',
          message: 'Voice transcription failed'
        });
      }
    } else {
      // Start recording for this question
      try {
        this.errorMsg = '';
        this.activeVoiceQuestionId = question.id;
        this.transcribingQuestionId = null;
        await this.voiceAsr.startRecording();
        this.logService.log({
          source: 'VOICE',
          level: 'info',
          message: `Started recording for question "${question.id}"`
        });
      } catch (e) {
        this.activeVoiceQuestionId = null;
        this.errorMsg = 'Microphone permission denied or unavailable.';
        this.logService.log({
          source: 'VOICE',
          level: 'error',
          message: 'Could not access microphone'
        });
      }
    }
  }

  onSubmit() {
    if (!this.isAllAnswered) return;

    this.isLoading = true;
    this.errorMsg = '';
    this.logService.log({
      source: 'INTERVIEW',
      level: 'info',
      message: `Submitting ${this.totalQuestions} answers for evaluation`
    });

    const sessionId = this.interviewService.getSessionId()!;
    const jobRole = this.interviewService.getJobRole()!;
    
    const formattedAnswers = this.questions.map(q => ({
      question_id: q.id,
      question: q.question,
      answer: this.answers[q.id] || ''
    }));

    this.interviewService.setAnswers(formattedAnswers);

    const request = {
      session_id: sessionId,
      job_role: jobRole,
      answers: formattedAnswers
    };

    this.apiService.evaluateAnswers(request).subscribe({
      next: (res) => {
        this.interviewService.setResult(res);
        this.logService.log({
          source: 'INTERVIEW',
          level: 'success',
          message: `Evaluation received. Score: ${res.score}%`
        });

        const recordedIds = Object.keys(this.audioBlobs);
        if (recordedIds.length) {
          const audioCalls = recordedIds.map(questionId =>
            this.apiService.evaluateAudioAnswer(this.audioBlobs[questionId]).pipe(
              map((audioRes: AudioEvaluationResult) => ({ questionId, audioRes })),
              catchError((err) => {
                this.logService.log({
                  source: 'VOICE',
                  level: 'error',
                  message: `Audio evaluation failed for ${questionId}: ${err?.error?.detail || 'Unknown error'}`
                });
                return of(null);
              })
            )
          );

          forkJoin(audioCalls).subscribe({
            next: (audioResults) => {
              const perAnswer: { [key: string]: AudioEvaluationResult } = {};
              audioResults.forEach(item => {
                if (item && item.audioRes) {
                  perAnswer[item.questionId] = item.audioRes;
                }
              });

              // Optionally keep a session-level audio summary as the average confidence
              const allScores = Object.values(perAnswer).map(a => a.confidence_score);
              if (allScores.length) {
                const avg = allScores.reduce((a, b) => a + b, 0) / allScores.length;
                this.interviewService.setAudioResult({
                  confidence_score: avg,
                  level: this.resultLevelFromScore(avg),
                  transcript: '',
                  features: {
                    pitch_mean: 0,
                    pitch_var: 0,
                    speech_rate: 0,
                    pause_count: 0,
                    avg_pause: 0,
                    energy_mean: 0,
                    jitter: 0,
                    shimmer: 0,
                    filler_words: 0
                  }
                } as AudioEvaluationResult);
              }

              this.interviewService.setPerAnswerAudio(perAnswer);
              this.isLoading = false;
              this.router.navigate(['/results']);
            },
            error: () => {
              this.isLoading = false;
              this.router.navigate(['/results']);
            }
          });
        } else {
          this.isLoading = false;
          this.router.navigate(['/results']);
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMsg = err.error?.detail || 'Failed to evaluate answers. Try again.';
        this.logService.log({
          source: 'INTERVIEW',
          level: 'error',
          message: `Evaluation failed: ${this.errorMsg}`
        });
      }
    });
  }

  private resultLevelFromScore(score: number): string {
    if (score >= 8) return 'Excellent';
    if (score >= 6) return 'Good';
    if (score >= 4) return 'Average';
    if (score >= 2) return 'Below average';
    return 'Needs improvement';
  }
}
