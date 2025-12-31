export type SuggestionType = 'grammar' | 'spelling' | 'clarity' | 'style' | 'punctuation';

export interface Suggestion {
  id: string;
  type: SuggestionType;
  original: string;
  replacement: string;
  message: string;
  startIndex: number;
  endIndex: number;
  context?: string;
}

export interface WritingStats {
  wordCount: number;
  characterCount: number;
  sentenceCount: number;
  paragraphCount: number;
  readingTime: number; // in minutes
  speakingTime: number; // in minutes
  readabilityScore: number; // 0-100
}

export interface AnalysisResult {
  suggestions: Suggestion[];
  stats: WritingStats;
  overallScore: number;
}
