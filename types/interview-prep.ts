export type InterviewQuestionCategory =
  | 'technical'
  | 'behavioral'
  | 'motivation'
  | 'background'
  | 'situational'
  | 'curveball';

export interface InterviewQuestion {
  category: InterviewQuestionCategory;
  question: string;
  hint: string[];
  resumeReference: string;
}

export interface InterviewPrep {
  questions: InterviewQuestion[];
}

export interface InterviewPrepRequest {
  applicationId: string;
  jobTitle: string;
  company: string;
  jobDescription: string;
  generatedResume: string;
  toughQuestions?: string[];
}
