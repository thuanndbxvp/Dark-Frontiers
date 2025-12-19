import React from 'react';
import { CheckIcon } from './icons/CheckIcon';
import { SpeakerWaveIcon } from './icons/SpeakerWaveIcon';

interface ScriptToolsProps {
  revisionPrompt: string;
  setRevisionPrompt: (prompt: string) => void;
  onRevise: () => void;
  onSummarizeScript: () => void;
  isLoading: boolean;
  isSummarizing: boolean;
  hasSummarizedScript: boolean;
  onOpenTtsModal: () => void;
}

export const ScriptTools: React.FC<ScriptToolsProps> = ({
  revisionPrompt,
  setRevisionPrompt,
  onRevise,
  onSummarizeScript,
  isLoading,
  isSummarizing,
  hasSummarizedScript,
  onOpenTtsModal,
}) => {
  return (
    <div className="bg-secondary p-4 rounded-lg border border-border">
        <h3 className="text-md font-semibold text-text-primary mb-3">Công cụ Kịch bản</h3>
        <textarea
            rows={4}
            className="w-full bg-primary border border-border rounded-md p-2 text-text-primary focus:ring-2 focus:ring-accent focus:border-accent transition"
            placeholder="Nhập yêu cầu sửa đổi, VD: 'Làm cho phần mở đầu kịch tính hơn'"
            value={revisionPrompt}
            onChange={(e) => setRevisionPrompt(e.target.value)}
            disabled={isLoading}
        />
        <div className="mt-3 flex flex-col gap-3">
             <button
                onClick={onRevise}
                disabled={!revisionPrompt.trim() || isLoading}
                className="w-full flex items-center justify-center border border-accent bg-transparent hover:bg-accent/20 disabled:opacity-50 disabled:cursor-not-allowed text-accent font-semibold py-2 px-3 rounded-lg transition text-sm"
            >
                Sửa Kịch bản
            </button>
            <div className="flex flex-col sm:flex-row gap-3">
                <button
                    onClick={onSummarizeScript}
                    disabled={isLoading || isSummarizing}
                    className="flex-1 flex items-center justify-center bg-accent hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2 px-3 rounded-lg transition text-sm"
                >
                    {isSummarizing ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Đang làm...</span>
                        </>
                    ) : (
                        <span>Chuyển thể kịch bản</span>
                    )}
                    {hasSummarizedScript && !isSummarizing && <CheckIcon className="w-5 h-5 text-white/80 ml-2" />}
                </button>
                <button
                    onClick={onOpenTtsModal}
                    disabled={isLoading}
                    className="flex-1 flex items-center justify-center bg-sky-500 hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2 px-3 rounded-lg transition text-sm"
                >
                    <span>Chuyển thành Giọng nói</span>
                </button>
            </div>
        </div>
    </div>
  );
};