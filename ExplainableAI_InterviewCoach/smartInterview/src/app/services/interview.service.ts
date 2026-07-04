import { Injectable } from '@angular/core';
import { Question, AnswerItem, EvaluationResult, QuestionLevel, QuestionLevelPreference, AudioEvaluationResult } from '../models/interview.model';

@Injectable({
  providedIn: 'root'
})
export class InterviewService {
  private sessionId: string | null = null;
  private jobRole: string | null = null;
  private questions: Question[] = [];
  private answers: AnswerItem[] = [];
  private result: EvaluationResult | null = null;
  private audioResult: AudioEvaluationResult | null = null;
  private perAnswerAudio: { [questionId: string]: AudioEvaluationResult } = {};
  private questionLevelPreference: QuestionLevelPreference = 'easy';
  private desiredQuestionCount: number | null = null;

  constructor() {}

  setQuestionLevelPreference(pref: QuestionLevelPreference) {
    this.questionLevelPreference = pref;
  }

  getQuestionLevelPreference(): QuestionLevelPreference {
    return this.questionLevelPreference;
  }

  setDesiredQuestionCount(count: number | null) {
    this.desiredQuestionCount = count && count > 0 ? count : null;
  }

  getDesiredQuestionCount(): number | null {
    return this.desiredQuestionCount;
  }

  private ensureQuestionLevels(originalQuestions: Question[]): Question[] {
    if (!originalQuestions || originalQuestions.length === 0) {
      return [];
    }

    const hasAnyLevel = originalQuestions.some(q => !!q.level);
    if (hasAnyLevel) {
      // If backend already provides levels, just normalize ordering: easy -> medium -> hard
      const order: QuestionLevel[] = ['easy', 'medium', 'hard'];
      const withLevelsSorted = [...originalQuestions].sort((a, b) => {
        const aIndex = a.level ? order.indexOf(a.level) : order.length;
        const bIndex = b.level ? order.indexOf(b.level) : order.length;
        return aIndex - bIndex;
      });

      // Apply user preference if not mixed
      if (this.questionLevelPreference !== 'mixed') {
        return withLevelsSorted.filter(q => q.level === this.questionLevelPreference);
      }

      return withLevelsSorted;
    }

    // No levels provided: assign levels progressively from easy to hard
    const total = originalQuestions.length;
    const third = Math.max(1, Math.floor(total / 3));

    const questionsWithLevels: Question[] = originalQuestions.map((q, index) => {
      let level: QuestionLevel;
      if (index < third) {
        level = 'easy';
      } else if (index < third * 2) {
        level = 'medium';
      } else {
        level = 'hard';
      }
      return { ...q, level };
    });
    
    if (this.questionLevelPreference !== 'mixed') {
      return questionsWithLevels.filter(q => q.level === this.questionLevelPreference);
    }

    return questionsWithLevels;
  }

  setSession(id: string, role: string, q: Question[]) {
    this.sessionId = id;
    this.jobRole = role;
    const normalized = this.ensureQuestionLevels(q);
    if (this.desiredQuestionCount && this.desiredQuestionCount > 0) {
      this.questions = normalized.slice(0, Math.min(this.desiredQuestionCount, normalized.length));
    } else {
      this.questions = normalized;
    }
  }

  getSessionId(): string | null { return this.sessionId; }
  getJobRole(): string | null { return this.jobRole; }
  getQuestions(): Question[] { return this.questions; }
  getQuestionsLevel(): string|null { return this.questionLevelPreference; }

  setAnswers(ans: AnswerItem[]) {
    this.answers = ans;
  }

  getAnswers(): AnswerItem[] { return this.answers; }

  setResult(res: EvaluationResult) {
    this.result = res;
  }

  getResult(): EvaluationResult | null { return this.result; }

   setAudioResult(res: AudioEvaluationResult) {
    this.audioResult = res;
    if (this.result) {
      this.result = {
        ...this.result,
        audio_result: res
      };
    }
  }

  getAudioResult(): AudioEvaluationResult | null {
    return this.audioResult;
  }

  setPerAnswerAudio(map: { [questionId: string]: AudioEvaluationResult }) {
    this.perAnswerAudio = map;
    if (this.result) {
      this.result = {
        ...this.result,
        per_answer_audio: map
      };
    }
  }

  getPerAnswerAudio(): { [questionId: string]: AudioEvaluationResult } {
    return this.perAnswerAudio;
  }

  reset() {
    this.sessionId = null;
    this.jobRole = null;
    this.questions = [];
    this.answers = [];
    this.result = null;
    this.audioResult = null;
    this.perAnswerAudio = {};
  }
}