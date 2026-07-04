export type QuestionLevel = 'easy' | 'medium' | 'hard';
export type QuestionLevelPreference = QuestionLevel | 'mixed';

export interface Question {
  id: string;
  question: string;
  level?: QuestionLevel;
}

export interface AnswerItem {
  question_id: string;
  question: string;
  answer: string;
}

export interface ResumeUploadResponse {
  session_id: string;
  questions: Question[];
}

export interface InterviewEvaluationRequest {
  session_id: string;
  job_role: string;
  answers: AnswerItem[];
}

export interface EvaluationItem {
  question_id: string;
  is_correct: boolean;
  correct_answer: string;
}

export interface AudioFeatures {
  pitch_mean: number;
  pitch_var: number;
  speech_rate: number;
  pause_count: number;
  avg_pause: number;
  energy_mean: number;
  jitter: number;
  shimmer: number;
  filler_words: number;
}

export interface AudioEvaluationResult {
  confidence_score: number;
  level: string;
  transcript: string;
  features: AudioFeatures;
}

export interface EvaluationResult {
  score: number;
  total: number;
  feedback: EvaluationItem[];
  audio_result?: AudioEvaluationResult;
  // Optional, added on the frontend: detailed speaking analysis per answered question
  per_answer_audio?: { [questionId: string]: AudioEvaluationResult };
}