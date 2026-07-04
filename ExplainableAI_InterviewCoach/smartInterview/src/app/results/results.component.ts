import { Component, OnInit, ElementRef, ViewChildren, QueryList, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { InterviewService } from '../services/interview.service';
import { EvaluationResult, AnswerItem, AudioEvaluationResult } from '../models/interview.model';
import { LogService } from '../services/log.service';

@Component({
  selector: 'app-results',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './results.component.html',
  styleUrls: ['./results.component.scss']
})
export class ResultsComponent implements OnInit, AfterViewInit {
  result: EvaluationResult | null = null;
  answers: AnswerItem[] = [];
  animatedScore: number = 0;
  audioResult: AudioEvaluationResult | null = null;
  perAnswerAudio: { [questionId: string]: AudioEvaluationResult } = {};
  
  @ViewChildren('resultCard') resultCards!: QueryList<ElementRef>;

  constructor(
    private interviewService: InterviewService,
    private router: Router,
    private logService: LogService
  ) {}

  ngOnInit() {
    this.result = this.interviewService.getResult();
    this.answers = this.interviewService.getAnswers();
    this.audioResult = this.interviewService.getAudioResult() || this.result?.audio_result || null;
    this.perAnswerAudio = this.interviewService.getPerAnswerAudio() || {};

    if (!this.result || !this.answers.length) {
      this.router.navigate(['/upload']);
      return;
    }

    this.animateScore();

    this.logService.log({
      source: 'RESULTS',
      level: 'success',
      message: `Loaded results. Score: ${this.result.score}%, correct: ${this.correctCount}/${this.totalCount}`
    });
  }

  ngAfterViewInit() {
    this.setupIntersectionObserver();
  }

  get correctCount(): number {
    return this.result?.feedback.filter(f => f.is_correct).length || 0;
  }

  get incorrectCount(): number {
    return this.result?.feedback.filter(f => !f.is_correct).length || 0;
  }

  get totalCount(): number {
    return this.result?.total || 0;
  }

  get scoreColorClass(): string {
    const s = this.result?.score || 0;
    if (s >= 70) return 'text-success stroke-success';
    if (s >= 40) return 'text-warning stroke-warning';
    return 'text-danger stroke-danger';
  }

  get scoreMessage(): string {
    const s = this.result?.score || 0;
    if (s >= 90) return 'Outstanding! You are highly prepared for this role.';
    if (s >= 70) return 'Good job! You have a strong grasp of the technical concepts.';
    if (s >= 40) return 'Needs improvement. Focus on the incorrect answers below.';
    return 'Keep practicing. Review the feedback to build your technical knowledge.';
  }

  animateScore() {
    const targetScore = this.result?.score || 0;
    const duration = 1000;
    const steps = 60;
    const stepDuration = duration / steps;
    const increment = targetScore / steps;

    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        this.animatedScore = targetScore;
        clearInterval(timer);
      } else {
        this.animatedScore = Math.floor(currentStep * increment);
      }
    }, stepDuration);
  }

  setupIntersectionObserver() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    this.resultCards.forEach(card => observer.observe(card.nativeElement));
  }

  getFeedbackForQuestion(id: string) {
    return this.result?.feedback.find(f => f.question_id === id);
  }

  getAudioForQuestion(id: string): AudioEvaluationResult | null {
    return this.perAnswerAudio[id] || null;
  }

  getStrokeDasharray(): string {
    const circumference = 2 * Math.PI * 90; // r=90
    return `${circumference} ${circumference}`;
  }

  getStrokeDashoffset(): number {
    const circumference = 2 * Math.PI * 90;
    return circumference - (this.animatedScore / 100) * circumference;
  }

  startOver() {
    this.interviewService.reset();
    this.router.navigate(['/upload']);
    this.logService.log({
      source: 'RESULTS',
      level: 'info',
      message: 'Session reset, returning to upload step'
    });
  }
}
