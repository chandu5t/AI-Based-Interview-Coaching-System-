import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { InterviewService } from '../../services/interview.service';
import { AudioEvaluationResult, EvaluationResult } from '../../models/interview.model';

interface AnswerView {
    question_id: string;
    question: string;
    user_answer: string;
    is_correct: boolean;
    correct_answer: string;
    score: number;
    audio?: AudioEvaluationResult;
}

@Component({
    selector: 'app-results',
    templateUrl: './results.component.html',
    styleUrls: ['./results.component.css']
})
export class ResultsComponent implements OnInit {
    result: EvaluationResult | null = null;
    answers: AnswerView[] = [];

    constructor(private interviewService: InterviewService, private router: Router) { }

    ngOnInit(): void {
        const baseResult = this.interviewService.getResult();
        if (!baseResult) {
            this.router.navigate(['/upload']);
            return;
        }

        const questions = this.interviewService.getQuestions();
        const answers = this.interviewService.getAnswers();
        const perAnswerAudio = this.interviewService.getPerAnswerAudio();

        const questionById = new Map(questions.map(q => [q.id, q]));
        const answerByQuestionId = new Map(answers.map(a => [a.question_id, a]));

        this.result = baseResult;
        this.answers = baseResult.feedback.map(item => {
            const q = questionById.get(item.question_id);
            const a = answerByQuestionId.get(item.question_id);
            const audio = perAnswerAudio[item.question_id];
            return {
                question_id: item.question_id,
                question: q?.question ?? '',
                user_answer: a?.answer ?? '',
                is_correct: item.is_correct,
                correct_answer: item.correct_answer,
                score: item.is_correct ? 1 : 0,
                audio
            };
        });
    }

    get percentage(): number {
        if (!this.result) return 0;
        return Math.round((this.result.score / this.result.total) * 100);
    }

    restart(): void {
        this.interviewService.reset();
        this.router.navigate(['/upload']);
    }
}