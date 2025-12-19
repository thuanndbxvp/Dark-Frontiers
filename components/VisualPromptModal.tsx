
import React, { useState, useEffect } from 'react';
import { ClipboardIcon } from './icons/ClipboardIcon';
import type { VisualPrompt } from '../types';

interface VisualPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompts: VisualPrompt[] | null;
  isLoading: boolean;
  error: string | null;
}

const LoadingSkeleton: React.FC = () => (
    <div className="space-y-6 animate-pulse">
        {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-primary/30 p-4 rounded-lg">
                <div className="h-4 bg-primary rounded w-1/4 mb-4"></div>
                <div className="h-20 bg-primary rounded w-full mb-3"></div>
                <div className="h-4 bg-primary rounded w-1/4 mb-2"></div>
                <div className="h-20 bg-primary rounded w-full"></div>
            </div>
        ))}
    </div>
);

const PromptItem: React.FC<{ prompt: VisualPrompt; index: number }> = ({ prompt, index }) => {
  const [copyStatus, setCopyStatus] = useState<'none' | 'english' | 'vietnamese'>('none');

  useEffect(() => {
    if (copyStatus !== 'none') {
      const timer = setTimeout(() => setCopyStatus('none'), 2000);
      return () => clearTimeout(timer);
    }
  }, [copyStatus]);

  const handleCopy = (text: string, type: 'english' | 'vietnamese') => {
    navigator.clipboard.writeText(text).then(() => setCopyStatus(type));
  };

  return (
    <div className="bg-primary p-4 rounded-lg border border-border space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-xs font-bold text-accent uppercase tracking-widest">Prompt {index + 1}</span>
      </div>
      
      <div>
        <label className="block text-[10px] font-bold text-text-secondary mb-1 uppercase">English Prompt (Midjourney/Leonardo)</label>
        <div className="relative group">
            <textarea
                readOnly
                rows={3}
                className="w-full bg-secondary border border-border rounded-md p-2.5 text-sm text-text-primary resize-none font-mono"
                value={prompt.english}
            />
            <button 
                onClick={() => handleCopy(prompt.english, 'english')}
                className="absolute top-2 right-2 p-1.5 bg-accent/20 hover:bg-accent/40 text-accent rounded transition"
                title="Copy English"
            >
                {copyStatus === 'english' ? <span className="text-[10px] font-bold px-1">Đã chép!</span> : <ClipboardIcon className="w-4 h-4" />}
            </button>
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-bold text-text-secondary mb-1 uppercase">Mô tả tiếng Việt</label>
        <div className="relative group">
            <textarea
                readOnly
                rows={2}
                className="w-full bg-secondary/50 border border-border rounded-md p-2.5 text-xs text-text-secondary resize-none italic"
                value={prompt.vietnamese}
            />
            <button 
                onClick={() => handleCopy(prompt.vietnamese, 'vietnamese')}
                className="absolute top-2 right-2 p-1.5 bg-primary hover:bg-border text-text-secondary rounded transition"
                title="Copy Vietnamese"
            >
                {copyStatus === 'vietnamese' ? <span className="text-[10px] font-bold px-1 text-accent">OK!</span> : <ClipboardIcon className="w-4 h-4" />}
            </button>
        </div>
      </div>
    </div>
  );
};

export const VisualPromptModal: React.FC<VisualPromptModalProps> = ({ isOpen, onClose, prompts, isLoading, error }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-80 z-[60] flex justify-center items-center p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-secondary rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-border"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-5 border-b border-border bg-secondary/50 rounded-t-xl">
          <div>
            <h2 className="text-xl font-bold text-accent">Gợi ý hình ảnh kinh dị dã sử</h2>
            <p className="text-xs text-text-secondary mt-1">AI đã phân tích đoạn kịch bản và tạo 4 bối cảnh trực quan nhất.</p>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary text-3xl font-light transition-colors leading-none">&times;</button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-grow space-y-6">
            {isLoading && <LoadingSkeleton />}
            {error && (
                <div className="bg-red-900/20 border border-red-500/50 p-4 rounded-lg text-center">
                    <p className="text-red-400 text-sm font-semibold">{error}</p>
                </div>
            )}
            {!isLoading && !error && prompts && (
                <div className="grid grid-cols-1 gap-6">
                    {prompts.map((p, idx) => (
                        <PromptItem key={idx} prompt={p} index={idx} />
                    ))}
                </div>
            )}
            {!isLoading && !error && !prompts && (
                <div className="text-center py-10">
                    <p className="text-text-secondary">Đang chuẩn bị dữ liệu...</p>
                </div>
            )}
        </div>

        <div className="p-4 border-t border-border flex justify-end items-center gap-4 bg-primary/20 rounded-b-xl">
            {isLoading && (
                <div className="flex-grow flex items-center gap-3 text-accent text-sm font-medium">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Đang giải mã kịch bản và phác họa bối cảnh...
                </div>
            )}
            <button onClick={onClose} className="px-6 py-2 bg-accent hover:brightness-110 text-white font-bold rounded-lg transition-all shadow-lg shadow-accent/20 min-w-[100px]">
                Đóng
            </button>
        </div>
      </div>
    </div>
  );
};
