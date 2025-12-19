
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { OutputDisplay } from './components/OutputDisplay';
import { LibraryModal } from './components/LibraryModal';
import { DialogueModal } from './components/DialogueModal';
import { ApiKeyModal } from './components/ApiKeyModal';
import { VisualPromptModal } from './components/VisualPromptModal';
import { AllVisualPromptsModal } from './components/AllVisualPromptsModal';
import { SummarizeModal } from './components/SummarizeModal';
import { SavedIdeasModal } from './components/SavedIdeasModal';
import { SideToolsPanel } from './components/SideToolsPanel';
import { TtsModal } from './components/TtsModal';
import { ScoreModal } from './components/ScoreModal';
import { generateScript, generateScriptOutline, generateTopicSuggestions, reviseScript, generateScriptPart, extractDialogue, generateKeywordSuggestions, validateApiKey, generateVisualPrompt, generateAllVisualPrompts, summarizeScriptForScenes, suggestStyleOptions, parseIdeasFromFile, getElevenlabsVoices, generateElevenlabsTts, scoreScript, generateSingleVideoPrompt, parseOutlineIntoSegments } from './services/aiService';
import type { StyleOptions, FormattingOptions, LibraryItem, GenerationParams, VisualPrompt, AllVisualPromptsResult, ScriptPartSummary, ScriptType, NumberOfSpeakers, CachedData, TopicSuggestionItem, SavedIdea, AiProvider, WordCountStats, ElevenlabsVoice, SummarizeConfig, SceneSummary } from './types';
import { STYLE_OPTIONS, LANGUAGE_OPTIONS, GEMINI_MODELS } from './constants';
import { CogIcon } from './components/icons/CogIcon';
import { Tooltip } from './components/Tooltip';
import { CheckIcon } from './components/icons/CheckIcon';
import { apiKeyManager } from './services/apiKeyManager';
import { BoltIcon } from './components/icons/BoltIcon';

// Make TypeScript aware of the global XLSX object from the CDN
declare const XLSX: any;

const YoutubeLogoIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="24" viewBox="0 0 28 20" fill="none" {...props}>
    <path d="M27.42 3.033a3.51 3.51 0 0 0-2.483-2.483C22.768 0 14 0 14 0S5.232 0 3.063.55A3.51 3.51 0 0 0 .58 3.033C0 5.2 0 10 0 10s0 4.8.58 6.967a3.51 3.51 0 0 0 2.483 2.483C5.232 20 14 20 14 20s8.768 0 10.937-.55a3.51 3.51 0 0 0 2.483-2.483C28 14.8 28 10 28 10s0-4.8-.58-6.967z" fill="#FF0000"/>
    <path d="M11.2 14.286V5.714L18.453 10 11.2 14.286z" fill="#FFFFFF"/>
  </svg>
);

const App: React.FC = () => {
  // --- DEFAULT DF MODE STATES ---
  const [isDarkFrontiers, setIsDarkFrontiers] = useState<boolean>(true);
  const [title, setTitle] = useState<string>('');
  const [outlineContent, setOutlineContent] = useState<string>('');
  const [targetAudience, setTargetAudience] = useState<string>('English');
  const [styleOptions, setStyleOptions] = useState<StyleOptions>({
    expression: 'Ominous',
    style: 'Cinematic Horror',
  });
  const [themeColor, setThemeColor] = useState<string>('#f59e0b');
  
  const [keywords, setKeywords] = useState<string>('');
  const [formattingOptions, setFormattingOptions] = useState<FormattingOptions>({
    headings: true,
    bullets: false,
    bold: false,
    includeIntro: false,
    includeOutro: false,
  });
  const [wordCount, setWordCount] = useState<string>('5000');
  const [scriptParts, setScriptParts] = useState<string>('Auto');
  const [scriptType, setScriptType] = useState<ScriptType>('Video');
  const [numberOfSpeakers, setNumberOfSpeakers] = useState<NumberOfSpeakers>('Auto');
  const [lengthType, setLengthType] = useState<'words' | 'duration'>('words');
  const [videoDuration, setVideoDuration] = useState<string>('30');

  const [generatedScript, setGeneratedScript] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const [topicSuggestions, setTopicSuggestions] = useState<TopicSuggestionItem[]>([]);
  const [isSuggesting, setIsSuggesting] = useState<boolean>(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [hasGeneratedTopicSuggestions, setHasGeneratedTopicSuggestions] = useState<boolean>(false);

  const [uploadedIdeas, setUploadedIdeas] = useState<TopicSuggestionItem[]>([]);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parsingError, setParsingError] = useState<string | null>(null);

  const [keywordSuggestions, setKeywordSuggestions] = useState<string[]>([]);
  const [isSuggestingKeywords, setIsSuggestingKeywords] = useState<boolean>(false);
  const [keywordSuggestionError, setKeywordSuggestionError] = useState<string | null>(null);
  const [hasGeneratedKeywordSuggestions, setHasGeneratedKeywordSuggestions] = useState<boolean>(false);

  const [isSuggestingStyle, setIsSuggestingStyle] = useState<boolean>(false);
  const [styleSuggestionError, setStyleSuggestionError] = useState<string | null>(null);
  const [hasSuggestedStyle, setHasSuggestedStyle] = useState<boolean>(false);

  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [isLibraryOpen, setIsLibraryOpen] = useState<boolean>(false);

  const [savedIdeas, setSavedIdeas] = useState<SavedIdea[]>([]);
  const [isSavedIdeasModalOpen, setIsSavedIdeasModalOpen] = useState<boolean>(false);

  const [revisionPrompt, setRevisionPrompt] = useState<string>('');
  const [revisionCount, setRevisionCount] = useState<number>(0);

  const [isGeneratingSequentially, setIsGeneratingSequentially] = useState<boolean>(false);
  const [outlineParts, setOutlineParts] = useState<string[]>([]);
  const [currentPartIndex, setCurrentPartIndex] = useState<number>(0);
  const [fullOutlineText, setFullOutlineText] = useState<string>('');
  const [autoContinue, setAutoContinue] = useState<boolean>(true);
  const isStoppingRef = useRef<boolean>(false);

  const [isDialogueModalOpen, setIsDialogueModalOpen] = useState<boolean>(false);
  const [extractedDialogue, setExtractedDialogue] = useState<Record<string, string> | null>(null);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState<boolean>(false);
  const [apiKeys, setApiKeys] = useState<Record<AiProvider, string[]>>({ gemini: [], openai: [], elevenlabs: [] });

  const [isVisualPromptModalOpen, setIsVisualPromptModalOpen] = useState<boolean>(false);
  const [visualPrompts, setVisualPrompts] = useState<VisualPrompt[] | null>(null);
  const [isGeneratingVisualPrompt, setIsGeneratingVisualPrompt] = useState<boolean>(false);
  const [visualPromptError, setVisualPromptError] = useState<string | null>(null);
  const [loadingVisualPromptsParts, setLoadingVisualPromptsParts] = useState<Set<string>>(new Set());
  const [isGeneratingAllSegmentPrompts, setIsGeneratingAllSegmentPrompts] = useState<boolean>(false);

  const [isAllVisualPromptsModalOpen, setIsAllVisualPromptsModalOpen] = useState<boolean>(false);
  const [allVisualPrompts, setAllVisualPrompts] = useState<AllVisualPromptsResult[] | null>(null);
  const [isGeneratingAllVisualPrompts, setIsGeneratingAllVisualPrompts] = useState<boolean>(false);
  const [allVisualPromptsError, setAllVisualPromptsError] = useState<string | null>(null);

  const [isSummarizeModalOpen, setIsSummarizeModalOpen] = useState<boolean>(false);
  const [summarizedScript, setSummarizedScript] = useState<ScriptPartSummary[] | null>(null);
  const [isSummarizing, setIsSummarizing] = useState<boolean>(false);
  const [summarizationError, setSummarizationError] = useState<string | null>(null);

  const [isTtsModalOpen, setIsTtsModalOpen] = useState<boolean>(false);
  const [ttsVoices, setTtsVoices] = useState<ElevenlabsVoice[]>([]);
  const [isFetchingTtsVoices, setIsFetchingTtsVoices] = useState<boolean>(false);
  const [ttsModalError, setTtsModalError] = useState<string | null>(null);

  const [isScoreModalOpen, setIsScoreModalOpen] = useState<boolean>(false);
  const [scriptScore, setScriptScore] = useState<string | null>(null);
  const [isScoring, setIsScoring] = useState<boolean>(false);
  const [scoringError, setScoringError] = useState<string | null>(null);

  const [aiProvider, setAiProvider] = useState<AiProvider>('gemini');
  const [selectedModel, setSelectedModel] = useState<string>(GEMINI_MODELS[0].value);

  const [visualPromptsCache, setVisualPromptsCache] = useState<Map<string, VisualPrompt[]>>(new Map());
  const [allVisualPromptsCache, setAllVisualPromptsCache] = useState<AllVisualPromptsResult[] | null>(null);
  const [summarizedScriptCache, setSummarizedScriptCache] = useState<ScriptPartSummary[] | null>(null);
  const [extractedDialogueCache, setExtractedDialogueCache] = useState<Record<string, string> | null>(null);

  const [hasExtractedDialogue, setHasExtractedDialogue] = useState<boolean>(false);
  const [hasGeneratedAllVisualPrompts, setHasGeneratedAllVisualPrompts] = useState<boolean>(false);
  const [hasSummarizedScript, setHasSummarizedScript] = useState<boolean>(false);
  const [hasSavedToLibrary, setHasSavedToLibrary] = useState<boolean>(false);

  const [wordCountStats, setWordCountStats] = useState<WordCountStats | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // NEW: Logic to calculate the effective target word count based on user selection in "Mục 8"
  const effectiveTargetWordCount = lengthType === 'duration'
    ? (Math.max(0, parseInt(videoDuration || '0', 10)) * 150).toString()
    : wordCount;

  useEffect(() => {
    try {
      const savedLibrary = localStorage.getItem('yt-script-library');
      if (savedLibrary) setLibrary(JSON.parse(savedLibrary));
      const savedIdeasData = localStorage.getItem('yt-script-saved-ideas');
      if (savedIdeasData) setSavedIdeas(JSON.parse(savedIdeasData));
      const savedApiKeys = localStorage.getItem('ai-api-keys');
      const defaultKeys = { gemini: [], openai: [], elevenlabs: [] };
      let parsedKeys = defaultKeys;
      if (savedApiKeys) {
        parsedKeys = JSON.parse(savedApiKeys);
      }
      setApiKeys(parsedKeys);
      apiKeyManager.updateKeys(parsedKeys);
      const savedTheme = localStorage.getItem('yt-script-theme');
      if (savedTheme) setThemeColor(savedTheme);
    } catch (e) {
      console.error("Failed to load data", e);
    }
    const handleApiKeyRotation = (event: Event) => {
        const customEvent = event as CustomEvent;
        const provider = customEvent.detail.provider as AiProvider;
        setNotification(`API key ${provider} đã tự động chuyển đổi.`);
        const latestApiKeys = localStorage.getItem('ai-api-keys');
        if (latestApiKeys) setApiKeys(JSON.parse(latestApiKeys));
    };
    window.addEventListener('apiKeyRotated', handleApiKeyRotation);
    return () => window.removeEventListener('apiKeyRotated', handleApiKeyRotation);
  }, []);

  useEffect(() => {
    if (notification) {
        const timer = setTimeout(() => setNotification(null), 6000);
        return () => clearTimeout(timer);
    }
  }, [notification]);

  useEffect(() => {
    localStorage.setItem('yt-script-theme', themeColor);
    document.documentElement.style.setProperty('--color-accent', themeColor);
  }, [themeColor]);
  
  useEffect(() => {
    localStorage.setItem('yt-script-saved-ideas', JSON.stringify(savedIdeas));
  }, [savedIdeas]);

  useEffect(() => {
    localStorage.setItem('ai-api-keys', JSON.stringify(apiKeys));
    apiKeyManager.updateKeys(apiKeys);
  }, [apiKeys]);


  const resetCachesAndStates = () => {
    setVisualPromptsCache(new Map());
    setAllVisualPromptsCache(null);
    setSummarizedScriptCache(null);
    setExtractedDialogueCache(null);
    setHasExtractedDialogue(false);
    setHasGeneratedAllVisualPrompts(false);
    setHasSummarizedScript(false);
    setHasSavedToLibrary(false);
    setWordCountStats(null);
    setRevisionCount(0);
    setScriptScore(null);
    setIsGeneratingSequentially(false);
    setOutlineParts([]);
    setCurrentPartIndex(0);
    setFullOutlineText('');
    isStoppingRef.current = false;
    setLoadingVisualPromptsParts(new Set());
    setIsGeneratingAllSegmentPrompts(false);
  };

  const handleGenerateScript = useCallback(async () => {
    if (!title.trim()) {
      setError('Vui lòng nhập hoặc chọn một tiêu đề video.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setGeneratedScript('');
    resetCachesAndStates();

    const finalWordCount = lengthType === 'duration' && videoDuration
      ? (parseInt(videoDuration, 10) * 150).toString()
      : wordCount;

    const params: GenerationParams = { 
        title, 
        outlineContent, 
        targetAudience, 
        styleOptions, 
        keywords, 
        formattingOptions, 
        wordCount: finalWordCount, 
        scriptParts, 
        scriptType, 
        numberOfSpeakers,
        isDarkFrontiers 
    };

    try {
      const isLongScript = parseInt(finalWordCount, 10) >= 1000;
      if (isLongScript) {
        const outline = await generateScriptOutline(params, aiProvider, selectedModel);
        setGeneratedScript(outline);
        setFullOutlineText(outline);
      } else {
        const script = await generateScript(params, aiProvider, selectedModel);
        setGeneratedScript(script);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi không xác định.');
    } finally {
      setIsLoading(false);
    }
  }, [title, outlineContent, targetAudience, styleOptions, keywords, formattingOptions, wordCount, scriptParts, scriptType, numberOfSpeakers, lengthType, videoDuration, aiProvider, selectedModel, isDarkFrontiers]);

  const handleGenerateNextPart = useCallback(async (indexToGenerate?: number) => {
    const targetIndex = indexToGenerate !== undefined ? indexToGenerate : currentPartIndex;
    if (!isGeneratingSequentially || targetIndex >= outlineParts.length || isStoppingRef.current) {
        if (isStoppingRef.current) setIsGeneratingSequentially(false);
        return;
    }

    setIsLoading(true);
    const currentOutlinePart = outlineParts[targetIndex];
    
    const finalWordCount = lengthType === 'duration' && videoDuration
      ? (parseInt(videoDuration, 10) * 150).toString()
      : wordCount;

    const params: GenerationParams = { 
        title, 
        outlineContent, 
        targetAudience, 
        styleOptions, 
        keywords, 
        formattingOptions, 
        wordCount: finalWordCount, 
        scriptParts, 
        scriptType, 
        numberOfSpeakers,
        isDarkFrontiers 
    };

    try {
        const partContent = await generateScriptPart(
            fullOutlineText, 
            generatedScript, 
            currentOutlinePart, 
            params, 
            aiProvider, 
            selectedModel
        );
        if (isStoppingRef.current) return;

        setGeneratedScript(prev => prev + partContent + '\n\n---\n\n');
        const nextIndex = targetIndex + 1;
        setCurrentPartIndex(nextIndex);
        
        // Auto-continue logic
        if (autoContinue && nextIndex < outlineParts.length && !isStoppingRef.current) {
            setTimeout(() => handleGenerateNextPart(nextIndex), 100);
        } else if (nextIndex >= outlineParts.length) {
            setIsGeneratingSequentially(false);
        }
    } catch (err) {
        setError(err instanceof Error ? err.message : 'Lỗi khi tạo phần tiếp theo.');
        setIsGeneratingSequentially(false);
    } finally {
        setIsLoading(false);
    }
  }, [isGeneratingSequentially, currentPartIndex, outlineParts, title, outlineContent, targetAudience, styleOptions, keywords, formattingOptions, wordCount, scriptParts, scriptType, numberOfSpeakers, lengthType, videoDuration, aiProvider, selectedModel, isDarkFrontiers, fullOutlineText, generatedScript, autoContinue]);

  const handleStartSequentialGenerate = useCallback(() => {
    if (!generatedScript) return;
    const parts = parseOutlineIntoSegments(generatedScript);
    if (parts.length === 0) {
        setError('Không tìm thấy cấu trúc phần trong dàn ý. Vui lòng thử lại.');
        return;
    }
    isStoppingRef.current = false;
    setOutlineParts(parts);
    setCurrentPartIndex(0);
    setIsGeneratingSequentially(true);
    setGeneratedScript('--- BẮT ĐẦU TẠO KỊCH BẢN CHI TIẾT ---\n\n');
  }, [generatedScript]);

  const handleStopSequentialGenerate = useCallback(() => {
    isStoppingRef.current = true;
    setIsLoading(false);
    setIsGeneratingSequentially(false);
    setNotification("Đã yêu cầu dừng tạo kịch bản.");
  }, []);

  // Effect to trigger first part when isGeneratingSequentially turns true
  useEffect(() => {
      if (isGeneratingSequentially && currentPartIndex === 0 && outlineParts.length > 0 && !isLoading && generatedScript.includes('BẮT ĐẦU') && !isStoppingRef.current) {
          handleGenerateNextPart(0);
      }
  }, [isGeneratingSequentially, currentPartIndex, outlineParts.length, isLoading, generatedScript, handleGenerateNextPart]);

  const handleReviseScript = useCallback(async () => {
    if (!generatedScript || !revisionPrompt.trim()) return;
    setIsLoading(true);
    setError(null);
    
    const params: GenerationParams = { 
        title, outlineContent, targetAudience, styleOptions, keywords, formattingOptions, 
        wordCount, scriptParts, scriptType, numberOfSpeakers, isDarkFrontiers 
    };

    try {
        const revised = await reviseScript(generatedScript, revisionPrompt, params, aiProvider, selectedModel);
        setGeneratedScript(revised);
        setRevisionCount(prev => prev + 1);
        setRevisionPrompt('');
    } catch (err) {
        setError(err instanceof Error ? err.message : 'Lỗi khi sửa kịch bản.');
    } finally {
        setIsLoading(false);
    }
  }, [generatedScript, revisionPrompt, title, outlineContent, targetAudience, styleOptions, keywords, formattingOptions, wordCount, scriptParts, scriptType, numberOfSpeakers, isDarkFrontiers, aiProvider, selectedModel]);

  // Helper function to clean text for word counting
  const cleanTextForCount = (text: string): string => {
    return text
        .replace(/\[.*?\]/g, '') // Remove technical notes [SFX], [Scene]
        .replace(/\*\*.*?\*\*/g, (match) => match.slice(2, -2)) // Unbold
        .replace(/\*.*?\*/g, (match) => match.slice(1, -1)) // Unitalic
        .replace(/#+.*$/gm, '') // Remove header lines
        .replace(/\n+/g, ' ') // Replace newlines with spaces
        .trim();
  };

  const handleExtractDialogue = useCallback(async () => {
    if (!generatedScript) return;
    setIsExtracting(true);
    setIsDialogueModalOpen(true);
    setExtractionError(null);
    
    try {
        let dialogue: Record<string, string> = {};

        // OPTIMIZATION: Better Markdown parsing
        const headerMatch = /^#+ (.*?)$/gm;
        const sections = generatedScript.split(/(?=^## .*?$|^### .*?$)/m).filter(s => s.trim() !== '' && !s.includes('---'));
        
        if (sections.length > 1) {
            sections.forEach(s => {
                const lines = s.split('\n');
                const titleLine = lines[0].trim();
                const title = titleLine.replace(/^#+\s+/, '').trim() || 'Phần không tên';
                const content = lines.slice(1).join('\n').trim();
                // Filter content to only spoken lines if it looks like a scene script
                const filteredContent = content
                    .split('\n')
                    .filter(line => !line.trim().startsWith('[') && !line.trim().startsWith('Visual:') && !line.trim().startsWith('SFX:'))
                    .join('\n')
                    .trim();
                if (filteredContent) dialogue[title] = filteredContent;
            });
        }

        // FALLBACK: Use AI if local parsing is insufficient or didn't catch enough
        if (Object.keys(dialogue).length < 2) {
            dialogue = await extractDialogue(generatedScript, aiProvider, selectedModel);
        }
        
        setExtractedDialogue(dialogue);
        
        // Calculate stats accurately
        const statsSections = Object.entries(dialogue).map(([title, text]) => {
            const cleanText = cleanTextForCount(text);
            return {
                title,
                count: cleanText.split(/\s+/).filter(Boolean).length
            };
        });
        const total = statsSections.reduce((sum, s) => sum + s.count, 0);
        setWordCountStats({ sections: statsSections, total });
        setHasExtractedDialogue(true);
    } catch (err) {
        setExtractionError(err instanceof Error ? err.message : 'Lỗi khi tách lời thoại.');
    } finally {
        setIsExtracting(false);
    }
  }, [generatedScript, aiProvider, selectedModel]);

  const handleScoreScript = useCallback(async () => {
    if (!generatedScript) return;
    setIsScoring(true);
    setIsScoreModalOpen(true);
    try {
        const score = await scoreScript(generatedScript, aiProvider, selectedModel);
        setScriptScore(score);
    } catch (err) {
        setScoringError(err instanceof Error ? err.message : 'Lỗi khi chấm điểm.');
    } finally {
        setIsScoring(false);
    }
  }, [generatedScript, aiProvider, selectedModel]);

  const handleSummarizeScript = useCallback(async (config: SummarizeConfig) => {
    if (!generatedScript) return;
    setIsSummarizing(true);
    try {
        const sum = await summarizeScriptForScenes(generatedScript, config, aiProvider, selectedModel);
        setSummarizedScript(sum);
        setHasSummarizedScript(true);
    } catch (err) {
        setSummarizationError(err instanceof Error ? err.message : 'Lỗi khi tóm tắt.');
    } finally {
        setIsSummarizing(false);
    }
  }, [generatedScript, aiProvider, selectedModel]);

  const handleGenerateVisualPrompt = useCallback(async (scene: string) => {
    // If it's already generated, just open the modal to show it
    if (visualPromptsCache.has(scene)) {
        setVisualPrompts(visualPromptsCache.get(scene) || null);
        setIsVisualPromptModalOpen(true);
        return;
    }

    // Mark as loading and show modal
    setIsGeneratingVisualPrompt(true);
    setIsVisualPromptModalOpen(true);
    setVisualPromptError(null);
    setVisualPrompts(null);
    
    setLoadingVisualPromptsParts(prev => {
        const next = new Set(prev);
        next.add(scene);
        return next;
    });

    try {
        const prompts = await generateVisualPrompt(scene, aiProvider, selectedModel);
        setVisualPromptsCache(prev => {
            const next = new Map(prev);
            next.set(scene, prompts);
            return next;
        });
        setVisualPrompts(prompts);
    } catch (err) {
        setVisualPromptError(err instanceof Error ? err.message : 'Lỗi tạo prompt hình ảnh.');
    } finally {
        setIsGeneratingVisualPrompt(false);
        setLoadingVisualPromptsParts(prev => {
            const next = new Set(prev);
            next.delete(scene);
            return next;
        });
    }
  }, [aiProvider, selectedModel, visualPromptsCache]);

  const handleGenerateAllSegmentPrompts = useCallback(async () => {
    if (!generatedScript) return;
    const sections = generatedScript.split(/(?=^## .*?$|^### .*?$)/m).filter(s => s.trim() !== '' && s.trim().length > 50 && !s.includes("Dàn Ý Chi Tiết") && !s.includes("BẮT ĐẦU TẠO"));
    
    setIsGeneratingAllSegmentPrompts(true);
    setNotification("Đang bắt đầu tạo hàng loạt prompt cho kịch bản...");

    for (const section of sections) {
        if (visualPromptsCache.has(section)) continue;

        setLoadingVisualPromptsParts(prev => {
            const next = new Set(prev);
            next.add(section);
            return next;
        });

        try {
            const prompts = await generateVisualPrompt(section, aiProvider, selectedModel);
            setVisualPromptsCache(prev => {
                const next = new Map(prev);
                next.set(section, prompts);
                return next;
            });
        } catch (err) {
            console.error("Lỗi khi tạo prompt cho đoạn:", section.substring(0, 50), err);
        } finally {
            setLoadingVisualPromptsParts(prev => {
                const next = new Set(prev);
                next.delete(section);
                return next;
            });
        }
    }

    setIsGeneratingAllSegmentPrompts(false);
    setNotification("Đã hoàn tất tạo toàn bộ prompt ảnh!");
  }, [generatedScript, aiProvider, selectedModel, visualPromptsCache]);

  const handleDownloadAllPrompts = useCallback(() => {
    if (visualPromptsCache.size === 0) {
        setError("Chưa có prompt nào được tạo để tải về.");
        return;
    }

    // Flatten all visual prompt lists from cache
    const allEnglishPrompts: string[] = [];
    visualPromptsCache.forEach((prompts) => {
        prompts.forEach(p => {
            // Flatten internal newlines to single lines
            const flat = p.english.replace(/\r?\n|\r/g, ' ').replace(/\s+/g, ' ').trim();
            allEnglishPrompts.push(flat);
        });
    });

    if (allEnglishPrompts.length === 0) return;

    const blob = new Blob([allEnglishPrompts.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `All_Prompts_${title.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [visualPromptsCache, title]);

  const handleGenerateAllVisualPrompts = useCallback(async () => {
    if (!generatedScript) return;
    setIsGeneratingAllVisualPrompts(true);
    setIsAllVisualPromptsModalOpen(true);
    try {
        const prompts = await generateAllVisualPrompts(generatedScript, aiProvider, selectedModel);
        setAllVisualPrompts(prompts);
        setHasGeneratedAllVisualPrompts(true);
    } catch (err) {
        setAllVisualPromptsError(err instanceof Error ? err.message : 'Lỗi tạo toàn bộ prompt.');
    } finally {
        setIsGeneratingAllVisualPrompts(false);
    }
  }, [generatedScript, aiProvider, selectedModel]);

  const handleSuggestStyle = useCallback(async () => {
    if (!title.trim()) return;
    setIsSuggestingStyle(true);
    try {
        const suggested = await suggestStyleOptions(title, aiProvider, selectedModel);
        setStyleOptions(suggested);
        setHasSuggestedStyle(true);
    } catch (err) {
        setStyleSuggestionError('Lỗi gợi ý phong cách.');
    } finally {
        setIsSuggestingStyle(false);
    }
  }, [title, aiProvider, selectedModel]);

  const handleGenerateKeywordSuggestionsLocal = useCallback(async () => {
    if (!title.trim()) return;
    setIsSuggestingKeywords(true);
    try {
        const kws = await generateKeywordSuggestions(title, aiProvider, selectedModel);
        setKeywordSuggestions(kws);
        setHasGeneratedKeywordSuggestions(true);
    } catch (err) {
        setKeywordSuggestionError('Lỗi gợi ý từ khóa.');
    } finally {
        setIsSuggestingKeywords(false);
    }
  }, [title, aiProvider, selectedModel]);

  const handleParseFileLocal = useCallback(async (content: string) => {
    setIsParsing(true);
    try {
        const ideas = await parseIdeasFromFile(content, aiProvider, selectedModel);
        setUploadedIdeas(ideas);
    } catch (err) {
        setParsingError('Lỗi đọc file ý tưởng.');
    } finally {
        setIsParsing(false);
    }
  }, [aiProvider, selectedModel]);

  const handleOpenTtsModal = useCallback(async () => {
    setIsTtsModalOpen(true);
    if (ttsVoices.length === 0) {
        setIsFetchingTtsVoices(true);
        try {
            const voices = await getElevenlabsVoices();
            setTtsVoices(voices);
        } catch (err) {
            setTtsModalError('Lỗi tải danh sách giọng nói.');
        } finally {
            setIsFetchingTtsVoices(false);
        }
    }
  }, [ttsVoices]);

  const handleGenerateTtsLocal = async (text: string, voiceId: string) => {
    return await generateElevenlabsTts(text, voiceId);
  };

  const handleGenerateVideoPromptLocal = async (scene: SceneSummary, partIndex: number, config: SummarizeConfig) => {
    try {
        const videoPrompt = await generateSingleVideoPrompt(scene, config, aiProvider, selectedModel);
        setSummarizedScript(prev => {
            if (!prev) return null;
            const next = [...prev];
            next[partIndex].scenes = next[partIndex].scenes.map(s => 
                s.sceneNumber === scene.sceneNumber ? { ...s, videoPrompt } : s
            );
            return next;
        });
    } catch (err) {
        throw err;
    }
  };

  const handleSaveApiKeys = (keysToSave: Record<AiProvider, string[]>) => setApiKeys(keysToSave);
  const handleSaveToLibrary = useCallback(() => {
    if (!generatedScript.trim() || !title.trim()) return;
    const now = Date.now();
    const newItem: LibraryItem = { id: now, savedAt: now, title, outlineContent, script: generatedScript };
    const updatedLibrary = [newItem, ...library];
    setLibrary(updatedLibrary);
    localStorage.setItem('yt-script-library', JSON.stringify(updatedLibrary));
    setHasSavedToLibrary(true);
  }, [generatedScript, title, outlineContent, library]);

  const handleDeleteScript = useCallback((id: number) => {
    const updatedLibrary = library.filter(item => item.id !== id);
    setLibrary(updatedLibrary);
    localStorage.setItem('yt-script-library', JSON.stringify(updatedLibrary));
  }, [library]);

  const handleLoadScript = useCallback((item: LibraryItem) => {
    resetCachesAndStates();
    setTitle(item.title);
    setOutlineContent(item.outlineContent);
    setGeneratedScript(item.script);
    setHasSavedToLibrary(true);
    setIsLibraryOpen(false);
  }, []);

  const handleSaveIdea = useCallback((ideaToSave: TopicSuggestionItem) => {
    if (savedIdeas.some(idea => idea.title === ideaToSave.title)) return;
    setSavedIdeas(prev => [{ id: Date.now(), title: ideaToSave.title, vietnameseTitle: ideaToSave.vietnameseTitle, outline: ideaToSave.outline }, ...prev]);
  }, [savedIdeas]);

  const handleGenerateSuggestions = useCallback(async () => {
    if (!title.trim()) return;
    setIsSuggesting(true);
    try {
      setTopicSuggestions(await generateTopicSuggestions(title, aiProvider, selectedModel));
      setHasGeneratedTopicSuggestions(true);
    } catch (err) { setSuggestionError('Lỗi tạo gợi ý.'); } finally { setIsSuggesting(false); }
  }, [title, aiProvider, selectedModel]);

  const hasApiKey = apiKeys[aiProvider] && apiKeys[aiProvider].length > 0;

  return (
    <div className={`min-h-screen ${isDarkFrontiers ? 'bg-black text-slate-300' : 'bg-primary text-text-primary'}`}>
      {notification && (
            <div className="fixed top-5 right-5 bg-secondary border border-accent text-text-primary p-4 rounded-lg shadow-lg z-[100] flex items-center gap-4">
                <CheckIcon className="w-6 h-6 text-green-400" />
                <p className="text-sm">{notification}</p>
            </div>
        )}
      <header className={`bg-secondary/60 border-b border-border p-4 shadow-sm flex justify-between items-center sticky top-0 z-20 backdrop-blur-sm ${isDarkFrontiers ? 'border-amber-900/30' : ''}`}>
        <div className="flex-1 flex gap-4 items-center">
            <button 
                onClick={() => {
                    const newState = !isDarkFrontiers;
                    setIsDarkFrontiers(newState);
                    if (newState) {
                        setThemeColor('#f59e0b');
                        setStyleOptions({ expression: 'Ominous', style: 'Cinematic Horror' });
                        setTargetAudience('English');
                        setFormattingOptions(prev => ({ ...prev, bullets: false, bold: false }));
                        setWordCount('5000');
                        setVideoDuration('30');
                    } else {
                        setThemeColor('#38bdf8');
                        setTargetAudience(LANGUAGE_OPTIONS[0].value);
                        setFormattingOptions(prev => ({ ...prev, bullets: true, bold: true }));
                        setWordCount('800');
                        setVideoDuration('5');
                    }
                }}
                className={`px-4 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-2 border ${isDarkFrontiers ? 'bg-amber-900/40 text-amber-500 border-amber-500 shadow-lg shadow-amber-900/20' : 'bg-secondary text-text-secondary border-border hover:text-text-primary'}`}
            >
                <BoltIcon className="w-4 h-4" />
                {isDarkFrontiers ? 'DARK FRONTIERS: ON' : 'DARK FRONTIERS: OFF'}
            </button>
        </div>
        <div className="flex-1 text-center">
            <a href="/" className="inline-flex justify-center items-center gap-3 no-underline">
              <YoutubeLogoIcon />
              <h1 className="text-2xl font-bold" style={{color: 'var(--color-accent)'}}>
                {isDarkFrontiers ? 'Dark Frontiers AI' : 'Youtube Script Generator'}
              </h1>
            </a>
        </div>
        <div className="flex-1 flex justify-end items-center gap-4">
            <button onClick={() => setIsApiKeyModalOpen(true)} className="px-4 py-1.5 text-sm font-semibold rounded-md border border-border text-text-secondary">API</button>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 md:p-6 max-w-[96rem] mx-auto">
        <div className="lg:col-span-3">
          <ControlPanel
            title={title} setTitle={setTitle} outlineContent={outlineContent} setOutlineContent={setOutlineContent}
            onGenerateSuggestions={handleGenerateSuggestions} isSuggesting={isSuggesting} suggestions={topicSuggestions} suggestionError={suggestionError} hasGeneratedTopicSuggestions={hasGeneratedTopicSuggestions}
            targetAudience={targetAudience} setTargetAudience={setTargetAudience}
            styleOptions={styleOptions} setStyleOptions={setStyleOptions}
            keywords={keywords} setKeywords={setKeywords}
            formattingOptions={formattingOptions} setFormattingOptions={setFormattingOptions}
            wordCount={wordCount} setWordCount={setWordCount}
            scriptParts={scriptParts} setScriptParts={setScriptParts}
            onGenerate={handleGenerateScript} isLoading={isLoading || !hasApiKey}
            onGenerateKeywordSuggestions={handleGenerateKeywordSuggestionsLocal} isSuggestingKeywords={isSuggestingKeywords} keywordSuggestions={keywordSuggestions} keywordSuggestionError={keywordSuggestionError} hasGeneratedKeywordSuggestions={hasGeneratedKeywordSuggestions}
            scriptType={scriptType} setScriptType={setScriptType}
            numberOfSpeakers={numberOfSpeakers} setNumberOfSpeakers={setNumberOfSpeakers}
            onSuggestStyle={handleSuggestStyle} isSuggestingStyle={isSuggestingStyle} styleSuggestionError={styleSuggestionError} hasSuggestedStyle={hasSuggestedStyle}
            lengthType={lengthType} setLengthType={setLengthType} videoDuration={videoDuration} setVideoDuration={setVideoDuration}
            savedIdeas={savedIdeas} onSaveIdea={handleSaveIdea} onOpenSavedIdeasModal={() => setIsSavedIdeasModalOpen(true)}
            onParseFile={handleParseFileLocal} isParsingFile={isParsing} parsingFileError={parsingError} uploadedIdeas={uploadedIdeas}
            aiProvider={aiProvider} setAiProvider={setAiProvider} selectedModel={selectedModel} setSelectedModel={setSelectedModel}
            isDarkFrontiers={isDarkFrontiers}
          />
        </div>
        <div className="lg:col-span-6">
          <OutputDisplay
            script={generatedScript} isLoading={isLoading} error={error}
            onStartSequentialGenerate={handleStartSequentialGenerate} 
            onStopSequentialGenerate={handleStopSequentialGenerate}
            isGeneratingSequentially={isGeneratingSequentially} 
            onGenerateNextPart={() => handleGenerateNextPart()} 
            currentPart={currentPartIndex} 
            totalParts={outlineParts.length}
            revisionCount={revisionCount} 
            onGenerateVisualPrompt={handleGenerateVisualPrompt} 
            onGenerateAllVisualPrompts={handleGenerateAllVisualPrompts} 
            isGeneratingAllVisualPrompts={isGeneratingAllVisualPrompts}
            scriptType={scriptType} 
            hasGeneratedAllVisualPrompts={hasGeneratedAllVisualPrompts} 
            visualPromptsCache={visualPromptsCache} 
            loadingVisualPromptsParts={loadingVisualPromptsParts}
            onImportScript={(file) => {
                 const reader = new FileReader();
                 reader.onload = (e) => setGeneratedScript(e.target?.result as string);
                 reader.readAsText(file);
            }}
            autoContinue={autoContinue}
            setAutoContinue={setAutoContinue}
          />
        </div>
         <div className="lg:col-span-3">
            <SideToolsPanel
                script={generatedScript} 
                targetWordCount={effectiveTargetWordCount}
                revisionPrompt={revisionPrompt} setRevisionPrompt={setRevisionPrompt}
                onRevise={handleReviseScript} onSummarizeScript={() => setIsSummarizeModalOpen(true)} isLoading={isLoading} isSummarizing={isSummarizing} hasSummarizedScript={hasSummarizedScript}
                onOpenLibrary={() => setIsLibraryOpen(true)} onSaveToLibrary={handleSaveToLibrary} hasSavedToLibrary={hasSavedToLibrary}
                onExtractAndCount={handleExtractDialogue} 
                onOpenDialogueModal={() => setIsDialogueModalOpen(true)}
                wordCountStats={wordCountStats} isExtracting={isExtracting}
                onOpenTtsModal={handleOpenTtsModal} onScoreScript={handleScoreScript} isScoring={isScoring}
                onGenerateAllPrompts={handleGenerateAllSegmentPrompts}
                onDownloadAllPrompts={handleDownloadAllPrompts}
                isGeneratingAllPrompts={isGeneratingAllSegmentPrompts}
            />
        </div>
      </main>
      
      <ApiKeyModal isOpen={isApiKeyModalOpen} onClose={() => setIsApiKeyModalOpen(false)} currentApiKeys={apiKeys} onSaveKeys={handleSaveApiKeys} />
      <LibraryModal isOpen={isLibraryOpen} onClose={() => setIsLibraryOpen(false)} library={library} onLoad={handleLoadScript} onDelete={handleDeleteScript} onExport={() => {}} onImport={() => {}} />
      <SavedIdeasModal isOpen={isSavedIdeasModalOpen} onClose={() => setIsSavedIdeasModalOpen(false)} ideas={savedIdeas} onLoad={(i) => { setTitle(i.title); setOutlineContent(i.outline); setIsSavedIdeasModalOpen(false); }} onDelete={(id) => setSavedIdeas(prev => prev.filter(i => i.id !== id))} />
      <DialogueModal isOpen={isDialogueModalOpen} onClose={() => setIsDialogueModalOpen(false)} dialogue={extractedDialogue} isLoading={isExtracting} error={extractionError} />
      <ScoreModal isOpen={isScoreModalOpen} onClose={() => setIsScoreModalOpen(false)} score={scriptScore} isLoading={isScoring} error={scoringError} />
      <VisualPromptModal isOpen={isVisualPromptModalOpen} onClose={() => setIsVisualPromptModalOpen(false)} prompts={visualPrompts} isLoading={isGeneratingVisualPrompt} error={visualPromptError} />
      <AllVisualPromptsModal isOpen={isAllVisualPromptsModalOpen} onClose={() => setIsAllVisualPromptsModalOpen(false)} prompts={allVisualPrompts} isLoading={isGeneratingAllVisualPrompts} error={allVisualPromptsError} />
      <SummarizeModal isOpen={isSummarizeModalOpen} onClose={() => setIsSummarizeModalOpen(false)} summary={summarizedScript} isLoading={isSummarizing} error={summarizationError} scriptType={scriptType} title={title} onGenerate={handleSummarizeScript} onGenerateVideoPrompt={handleGenerateVideoPromptLocal} />
      <TtsModal isOpen={isTtsModalOpen} onClose={() => setIsTtsModalOpen(false)} dialogue={extractedDialogue} voices={ttsVoices} isLoadingVoices={isFetchingTtsVoices} onGenerate={handleGenerateTtsLocal} error={ttsModalError} />
    </div>
  );
};

export default App;
