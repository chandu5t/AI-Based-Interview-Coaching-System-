import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { InterviewService } from '../../services/interview.service';
import { ApiService } from '../../services/api.service';
import { Question, AnswerItem, AudioEvaluationResult } from '../../models/interview.model';
import { VoiceAsrService } from '../../services/voice-asr.service';

@Component({
    selector: 'app-interview',
    templateUrl: './interview.component.html',
    styleUrls: ['./interview.component.css']
})
export class InterviewComponent implements OnInit {
    questions: Question[] = [];
    // keyed by question id so each answer is tracked explicitly
    answers: { [key: string]: string } = {};
    // raw audio for each recorded answer, keyed by question id
    audioBlobs: { [key: string]: Blob } = {};
    loading = false;
    error = '';

    constructor(
        private interviewService: InterviewService,
        private api: ApiService,
        private router: Router,
        private voiceAsr: VoiceAsrService
    ) { }

    ngOnInit(): void {
        this.questions = this.interviewService.getQuestions();
        if (!this.questions.length) {
            this.router.navigate(['/upload']);
        }
    }

    allAnswered(): boolean {
        return this.questions.every(q => (this.answers[q.id] || '').trim().length > 0);
    }

    async toggleRecording(q: Question): Promise<void> {
        const id = q.id;
        if (this.voiceAsr.isRecording) {
            try {
                const { text, blob } = await this.voiceAsr.stopAndGetAudio();
                this.answers[id] = text;
                this.audioBlobs[id] = blob;
            } catch (err) {
                this.error = 'Recording failed. Please try again.';
            }
        } else {
            this.error = '';
            await this.voiceAsr.startRecording();
        }
    }

    onSubmit(): void {
        if (!this.allAnswered()) {
            this.error = 'Please answer all questions before submitting.';
            return;
        }

        this.loading = true;
        this.error = '';

        const payload: AnswerItem[] = this.questions.map(q => ({
            question_id: q.id,
            question: q.question,
            answer: this.answers[q.id]
        }));

        // persist structured answers for use on the results screen
        this.interviewService.setAnswers(payload);

        const requestPayload = {
            session_id: this.interviewService.getSessionId(),
            job_role: this.interviewService.getJobRole(),
            answers: payload
        };

        this.api.evaluateAnswers(requestPayload).subscribe({
            next: (res) => {
                this.interviewService.setResult(res);

                // If we have any recorded audio, evaluate speaking quality per answer
                const recordedIds = Object.keys(this.audioBlobs);
                if (recordedIds.length) {
                    const audioCalls = recordedIds.map(questionId =>
                        this.api.evaluateAudioAnswer(this.audioBlobs[questionId]).pipe(
                            map((audioRes: AudioEvaluationResult) => ({ questionId, audioRes })),
                            catchError(() => of(null))
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
                            this.interviewService.setPerAnswerAudio(perAnswer);
                            this.router.navigate(['/results']);
                        },
                        error: () => {
                            // Even if audio scoring fails, still show normal results
                            this.router.navigate(['/results']);
                        }
                    });
                } else {
                    this.router.navigate(['/results']);
                }
            },
            error: () => {
                this.error = 'Evaluation failed. Please try again.';
                this.loading = false;
            }
        });
    }
}