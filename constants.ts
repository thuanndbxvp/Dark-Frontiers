
import type { Expression, Style, ScriptType, NumberOfSpeakers, AiProvider } from './types';

interface LabeledOption<T> {
  value: T;
  label: string;
}

export const AI_PROVIDER_OPTIONS: LabeledOption<AiProvider>[] = [
    { value: 'gemini', label: 'Google Gemini' },
    { value: 'openai', label: 'OpenAI' },
];

export const GEMINI_MODELS: LabeledOption<string>[] = [
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { value: 'gemini-3-pro-preview', label: 'Gemini 3 Pro' },
];

export const OPENAI_MODELS: LabeledOption<string>[] = [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
];


export const SCRIPT_TYPE_OPTIONS: LabeledOption<ScriptType>[] = [
    { value: 'Video', label: 'Video YouTube' },
    { value: 'Podcast', label: 'Podcast' },
];

export const NUMBER_OF_SPEAKERS_OPTIONS: LabeledOption<NumberOfSpeakers>[] = [
  { value: 'Auto', label: 'Tự động' },
  { value: '2', label: '2 người' },
  { value: '3', label: '3 người' },
  { value: '4', label: '4 người' },
  { value: '5', label: '5 người' },
];

export const EXPRESSION_OPTIONS: LabeledOption<Expression>[] = [
  { value: 'Ominous', label: 'U ám / Điềm báo' },
  { value: 'Gritty', label: 'Gai góc' },
  { value: 'Melancholic', label: 'U sầu' },
  { value: 'Conversational', label: 'Thân mật' },
  { value: 'Humorous', label: 'Hài hước' },
  { value: 'Authoritative', label: 'Chuyên gia' },
  { value: 'Personal', label: 'Cá nhân' },
  { value: 'Professional', label: 'Chuyên nghiệp' },
  { value: 'Persuasive', label: 'Thuyết phục' },
  { value: 'Formal', label: 'Trang trọng' },
];


export const STYLE_OPTIONS: LabeledOption<Style>[] = [
  { value: 'Cinematic Horror', label: 'Kinh dị Điện ảnh' },
  { value: 'Survival Memoir', label: 'Hồi ký Sinh tồn' },
  { value: 'Narrative', label: 'Kể chuyện' },
  { value: 'Descriptive', label: 'Miêu tả' },
  { value: 'Expository', label: 'Giải thích' },
  { value: 'Persuasive', label: 'Thuyết phục' },
  { value: 'Technical', label: 'Kỹ thuật' },
];

export const LANGUAGE_OPTIONS: { value: string, label: string }[] = [
    { value: 'Vietnamese', label: 'Tiếng Việt' },
    { value: 'English', label: 'Tiếng Anh' },
    { value: 'Korean', label: 'Tiếng Hàn' },
    { value: 'Japanese', label: 'Tiếng Nhật' },
    { value: 'Spanish', label: 'Tiếng Tây Ban Nha' },
    { value: 'Portuguese', label: 'Tiếng Bồ Đào Nha' },
];
