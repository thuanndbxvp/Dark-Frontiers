
// Literal types from constants
export type Expression = 'Formal' | 'Informative' | 'Conversational' | 'Persuasive' | 'Humorous' | 'Empathetic' | 'Inspirational' | 'Authoritative' | 'Personal' | 'Professional' | 'Ominous' | 'Gritty' | 'Melancholic';
export type Style = 'Narrative' | 'Descriptive' | 'Expository' | 'Persuasive' | 'Technical' | 'Academic' | 'Business' | 'Cinematic Horror' | 'Survival Memoir';
export type ScriptType = 'Video' | 'Podcast';
export type NumberOfSpeakers = 'Auto' | '2' | '3' | '4' | '5';
export type AiProvider = 'gemini' | 'openai' | 'elevenlabs';
export type ScenarioType = 'general' | 'ww2' | 'finance' | 'dark_frontier';

// Options interfaces
export interface StyleOptions {
  expression: Expression;
  style: Style;
}

export interface FormattingOptions {
  headings: boolean;
  bullets: boolean;

  bold: boolean;
  includeIntro: boolean;
  includeOutro: boolean;
}

// Data structures
export interface ElevenlabsVoice {
  voice_id: string;
  name: string;
  category: string;
  labels: Record<string, string>;
  preview_url: string;
}

export interface TopicSuggestionItem {
    title: string;
    vietnameseTitle?: string;
    outline: string;
}

export interface SavedIdea {
  id: number;
  title: string;
  vietnameseTitle?: string;
  outline: string;
}

export interface CachedData {
  visualPrompts: Record<string, VisualPrompt>;
  allVisualPrompts: AllVisualPromptsResult[] | null;
  summarizedScript: ScriptPartSummary[] | null;
  extractedDialogue: Record<string, string> | null;
  hasExtractedDialogue: boolean;
  hasGeneratedAllVisualPrompts: boolean;
  hasSummarizedScript: boolean;
}

export interface LibraryItem {
  id: number;
  savedAt: number;
  title: string;
  outlineContent: string;
  script: string;
  cachedData?: CachedData;
}

export interface GenerationParams {
  title: string;
  outlineContent: string;
  targetAudience: string;
  styleOptions: StyleOptions;
  keywords: string;
  formattingOptions: FormattingOptions;
  wordCount: string;
  scriptParts: string;
  scriptType: ScriptType;
  numberOfSpeakers: NumberOfSpeakers;
  isDarkFrontiers?: boolean; // New flag for specialized horror mode
}

export interface VisualPrompt {
    english: string;
    vietnamese: string;
}

export interface AllVisualPromptsResult {
    scene: string;
    english: string;
    vietnamese: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface SceneSummary {
  sceneNumber: number;
  summary: string;
  imagePrompt: string;
  videoPrompt: string;
}

export interface ScriptPartSummary {
  partTitle: string;
  scenes: SceneSummary[];
}

export interface WordCountStats {
  sections: { title: string; count: number }[];
  total: number;
}

export interface SummarizeConfig {
  numberOfPrompts: 'auto' | number;
  includeNarration: boolean;
  scenarioType: ScenarioType;
  referenceImages?: string[];
}
