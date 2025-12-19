
import React from 'react';
import { WordCountCheck } from './WordCountCheck';
import { ScriptTools } from './ScriptTools';
import { BookOpenIcon } from './icons/BookOpenIcon';
import type { WordCountStats } from '../types';
import { SaveIcon } from './icons/SaveIcon';
import { CheckIcon } from './icons/CheckIcon';
import { TrophyIcon } from './icons/TrophyIcon';
import { CameraIcon } from './icons/CameraIcon';
import { DownloadIcon } from './icons/DownloadIcon';

// Combine all props needed for the side panel
interface SideToolsPanelProps {
  script: string;
  targetWordCount: string;
  revisionPrompt: string;
  setRevisionPrompt: (prompt: string) => void;
  onRevise: () => void;
  onSummarizeScript: () => void;
  isLoading: boolean;
  isSummarizing: boolean;
  hasSummarizedScript: boolean;
  onOpenLibrary: () => void;
  onSaveToLibrary: () => void;
  hasSavedToLibrary: boolean;
  onExtractAndCount: () => void;
  wordCountStats: WordCountStats | null;
  isExtracting: boolean;
  onOpenTtsModal: () => void;
  onScoreScript: () => void;
  isScoring: boolean;
  onGenerateAllPrompts?: () => void;
  onDownloadAllPrompts?: () => void;
  isGeneratingAllPrompts?: boolean;
}

export const SideToolsPanel: React.FC<SideToolsPanelProps> = ({
    script,
    targetWordCount,
    revisionPrompt,
    setRevisionPrompt,
    onRevise,
    onSummarizeScript,
    isLoading,
    isSummarizing,
    hasSummarizedScript,
    onOpenLibrary,
    onSaveToLibrary,
    hasSavedToLibrary,
    onExtractAndCount,
    wordCountStats,
    isExtracting,
    onOpenTtsModal,
    onScoreScript,
    isScoring,
    onGenerateAllPrompts,
    onDownloadAllPrompts,
    isGeneratingAllPrompts,
}) => {

    return (
        <div className="w-full space-y-6 sticky top-[98px]">
            <div className="bg-secondary p-4 rounded-lg border border-border space-y-3">
                 <h3 className="text-md font-semibold text-text-primary text-center">Tiện ích & Cài đặt</h3>
                 <div className="flex items-center gap-3">
                    <button
                        onClick={onSaveToLibrary}
                        disabled={!script || isLoading}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary/70 text-text-primary font-semibold rounded-lg transition-colors border border-border disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Lưu vào thư viện"
                    >
                        <SaveIcon className="w-5 h-5" />
                        <span>Lưu</span>
                        {hasSavedToLibrary && <CheckIcon className="w-4 h-4 text-green-400 ml-1" />}
                    </button>
                    <button 
                        onClick={onOpenLibrary}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary/70 text-text-primary font-semibold rounded-lg transition-colors border border-border"
                        aria-label="Mở thư viện"
                    >
                        <BookOpenIcon className="w-5 h-5"/>
                        <span>Thư viện</span>
                    </button>
                </div>
                 <button
                    onClick={onScoreScript}
                    disabled={!script || isLoading || isScoring}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary/70 text-text-primary font-semibold rounded-lg transition-colors border border-border disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Chấm điểm kịch bản"
                >
                    <TrophyIcon className="w-5 h-5 text-amber-400" />
                    <span>{isScoring ? 'Đang chấm điểm...' : 'Chấm điểm kịch bản'}</span>
                </button>

                {/* Bulk Prompt Controls */}
                <div className="pt-2 border-t border-border/50 flex flex-col gap-2">
                    <button
                        onClick={onGenerateAllPrompts}
                        disabled={!script || isLoading || isGeneratingAllPrompts}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-accent/10 hover:bg-accent/20 text-accent font-semibold rounded-lg transition-colors border border-accent/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isGeneratingAllPrompts ? (
                            <>
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                <span>Đang tạo tất cả...</span>
                            </>
                        ) : (
                            <>
                                <CameraIcon className="w-5 h-5" />
                                <span>Tạo toàn bộ prompt ảnh</span>
                            </>
                        )}
                    </button>
                    <button
                        onClick={onDownloadAllPrompts}
                        disabled={!script || isLoading}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary/70 text-text-secondary font-semibold rounded-lg transition-colors border border-border disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <DownloadIcon className="w-5 h-5" />
                        <span>Tải toàn bộ prompt ảnh</span>
                    </button>
                </div>
            </div>

            {script && (
                <>
                    <WordCountCheck
                        stats={wordCountStats}
                        targetWordCount={targetWordCount}
                        onExtractAndCount={onExtractAndCount}
                        isLoading={isExtracting}
                    />
                    <ScriptTools 
                        revisionPrompt={revisionPrompt}
                        setRevisionPrompt={setRevisionPrompt}
                        onRevise={onRevise}
                        onSummarizeScript={onSummarizeScript}
                        isLoading={isLoading}
                        isSummarizing={isSummarizing}
                        hasSummarizedScript={hasSummarizedScript}
                        onOpenTtsModal={onOpenTtsModal}
                    />
                </>
            )}
        </div>
    );
};
