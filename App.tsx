
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
import { generateScript, generateScriptOutline, generateTopicSuggestions, reviseScript, generateScriptPart, extractDialogue, generateKeywordSuggestions, validateApiKey, generateVisualPrompt, generateAllVisualPrompts, summarizeScriptForScenes, suggestStyleOptions, parseIdeasFromFile, getElevenlabsVoices, generateElevenlabsTts, scoreScript, generateSingleVideoPrompt } from './services/aiService';
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

const calculateWordCountsFromDialogue = (dialogueObject: Record<string, string>): WordCountStats => {
    const countWords = (text: string): number => {
        if (!text) return 0;
        return text.trim().split(/\s+/).filter(Boolean).length;
    };
    const sections = Object.entries(dialogueObject).map(([title, content]) => ({
        title,
        count: countWords(content)
    }));
    const total = sections.reduce((sum, section) => sum + section.count, 0);
    return { sections, total };
};

const App: React.FC = () => {
  const [title, setTitle] = useState<string>('');
  const [outlineContent, setOutlineContent] = useState<string>('');
  const [targetAudience, setTargetAudience] = useState<string>(LANGUAGE_OPTIONS[0].value);
  const [styleOptions, setStyleOptions] = useState<StyleOptions>({
    expression: 'Conversational',
    style: STYLE_OPTIONS[0].value,
  });
  const [keywords, setKeywords] = useState<string>('');
  const [formattingOptions, setFormattingOptions] = useState<FormattingOptions>({
    headings: true,
    bullets: true,
    bold: true,
    includeIntro: false,
    includeOutro: false,
  });
  const [wordCount, setWordCount] = useState<string>('800');
  const [scriptParts, setScriptParts] = useState<string>('Auto');
  const [scriptType, setScriptType] = useState<ScriptType>('Video');
  const [numberOfSpeakers, setNumberOfSpeakers] = useState<NumberOfSpeakers>('Auto');
  const [lengthType, setLengthType] = useState<'words' | 'duration'>('words');
  const [videoDuration, setVideoDuration] = useState<string>('5');
  const [isDarkFrontiers, setIsDarkFrontiers] = useState<boolean>(false);

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

  const [isDialogueModalOpen, setIsDialogueModalOpen] = useState<boolean>(false);
  const [extractedDialogue, setExtractedDialogue] = useState<Record<string, string> | null>(null);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState<boolean>(false);
  const [apiKeys, setApiKeys] = useState<Record<AiProvider, string[]>>({ gemini: [], openai: [], elevenlabs: [] });

  const [isVisualPromptModalOpen, setIsVisualPromptModalOpen] = useState<boolean>(false);
  const [visualPrompt, setVisualPrompt] = useState<VisualPrompt | null>(null);
  const [isGeneratingVisualPrompt, setIsGeneratingVisualPrompt] = useState<boolean>(false);
  const [visualPromptError, setVisualPromptError] = useState<string | null>(null);

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

  const [visualPromptsCache, setVisualPromptsCache] = useState<Map<string, VisualPrompt>>(new Map());
  const [allVisualPromptsCache, setAllVisualPromptsCache] = useState<AllVisualPromptsResult[] | null>(null);
  const [summarizedScriptCache, setSummarizedScriptCache] = useState<ScriptPartSummary[] | null>(null);
  const [extractedDialogueCache, setExtractedDialogueCache] = useState<Record<string, string> | null>(null);

  const [hasExtractedDialogue, setHasExtractedDialogue] = useState<boolean>(false);
  const [hasGeneratedAllVisualPrompts, setHasGeneratedAllVisualPrompts] = useState<boolean>(false);
  const [hasSummarizedScript, setHasSummarizedScript] = useState<boolean>(false);
  const [hasSavedToLibrary, setHasSavedToLibrary] = useState<boolean>(false);

  const [themeColor, setThemeColor] = useState<string>('#38bdf8');
  const [wordCountStats, setWordCountStats] = useState<WordCountStats | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

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
  };

  const handleGenerateScript = useCallback(async () => {
    if (!title.trim()) {
      setError('Vui lòng nhập hoặc chọn một tiêu đề video.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setGeneratedScript('');
    setIsGeneratingSequentially(false);
    setRevisionCount(0);
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
      const isLongScript = parseInt(finalWordCount, 10) > 1000 && scriptType === 'Video' && !isDarkFrontiers;
      if (isLongScript) {
        const outline = await generateScriptOutline(params, aiProvider, selectedModel);
        setGeneratedScript(outline);
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
                        // Update default settings for Dark Frontiers mode
                        setTargetAudience('English');
                        setFormattingOptions(prev => ({
                            ...prev,
                            bullets: false,
                            bold: false
                        }));
                    } else {
                        setThemeColor('#38bdf8');
                        setTargetAudience(LANGUAGE_OPTIONS[0].value); // Default back to Vietnamese
                        setFormattingOptions(prev => ({
                            ...prev,
                            bullets: true,
                            bold: true
                        }));
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
            onGenerateKeywordSuggestions={() => {}} isSuggestingKeywords={false} keywordSuggestions={[]} keywordSuggestionError={null} hasGeneratedKeywordSuggestions={false}
            scriptType={scriptType} setScriptType={setScriptType}
            numberOfSpeakers={numberOfSpeakers} setNumberOfSpeakers={setNumberOfSpeakers}
            onSuggestStyle={() => {}} isSuggestingStyle={false} styleSuggestionError={null} hasSuggestedStyle={false}
            lengthType={lengthType} setLengthType={setLengthType} videoDuration={videoDuration} setVideoDuration={setVideoDuration}
            savedIdeas={savedIdeas} onSaveIdea={handleSaveIdea} onOpenSavedIdeasModal={() => setIsSavedIdeasModalOpen(true)}
            onParseFile={() => {}} isParsingFile={false} parsingFileError={null} uploadedIdeas={[]}
            aiProvider={aiProvider} setAiProvider={setAiProvider} selectedModel={selectedModel} setSelectedModel={setSelectedModel}
            isDarkFrontiers={isDarkFrontiers}
          />
        </div>
        <div className="lg:col-span-6">
          <OutputDisplay
            script={generatedScript} isLoading={isLoading} error={error}
            onStartSequentialGenerate={() => {}} isGeneratingSequentially={false} onGenerateNextPart={() => {}} currentPart={0} totalParts={0}
            revisionCount={revisionCount} onGenerateVisualPrompt={() => {}} onGenerateAllVisualPrompts={() => {}} isGeneratingAllVisualPrompts={false}
            scriptType={scriptType} hasGeneratedAllVisualPrompts={false} visualPromptsCache={new Map()} onImportScript={() => {}}
          />
        </div>
         <div className="lg:col-span-3">
            <SideToolsPanel
                script={generatedScript} targetWordCount={wordCount} revisionPrompt={revisionPrompt} setRevisionPrompt={setRevisionPrompt}
                onRevise={() => {}} onSummarizeScript={() => setIsSummarizeModalOpen(true)} isLoading={isLoading} isSummarizing={isSummarizing} hasSummarizedScript={hasSummarizedScript}
                onOpenLibrary={() => setIsLibraryOpen(true)} onSaveToLibrary={handleSaveToLibrary} hasSavedToLibrary={hasSavedToLibrary}
                onExtractAndCount={() => setIsDialogueModalOpen(true)} wordCountStats={wordCountStats} isExtracting={isExtracting}
                onOpenTtsModal={() => setIsTtsModalOpen(true)} onScoreScript={() => {}} isScoring={false}
            />
        </div>
      </main>
      
      <ApiKeyModal isOpen={isApiKeyModalOpen} onClose={() => setIsApiKeyModalOpen(false)} currentApiKeys={apiKeys} onSaveKeys={handleSaveApiKeys} />
      <LibraryModal isOpen={isLibraryOpen} onClose={() => setIsLibraryOpen(false)} library={library} onLoad={handleLoadScript} onDelete={handleDeleteScript} onExport={() => {}} onImport={() => {}} />
      <SavedIdeasModal isOpen={isSavedIdeasModalOpen} onClose={() => setIsSavedIdeasModalOpen(false)} ideas={savedIdeas} onLoad={(i) => { setTitle(i.title); setOutlineContent(i.outline); setIsSavedIdeasModalOpen(false); }} onDelete={(id) => setSavedIdeas(prev => prev.filter(i => i.id !== id))} />
    </div>
  );
};

export default App;
