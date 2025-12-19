import React, { useState, useEffect } from 'react';
import { ClipboardIcon } from './icons/ClipboardIcon';
import type { VisualPrompt } from '../types';

interface VisualPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompt: VisualPrompt | null;
  isLoading: boolean;
  error: string | null;
}

const LoadingSkeleton: React.FC = () => (
    <div className="space-y-4 animate-pulse">
      <div>
        <div className="h-4 bg-primary rounded w-1/4 mb-2"></div>
        <div className="h-12 bg-primary rounded w-full"></div>
      </div>
      <div>
        <div className="h-4 bg-primary rounded w-1/4 mb-2"></div>
        <div className="h-12 bg-primary rounded w-full"></div>
      </div>
    </div>
);

export const VisualPromptModal: React.FC<VisualPromptModalProps> = ({ isOpen, onClose, prompt, isLoading, error }) => {
  const [copySuccess, setCopySuccess] = useState<'english' | 'vietnamese' | null>(null);

  useEffect(() => {
    if (copySuccess) {
      const timer = setTimeout(() => setCopySuccess(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [copySuccess]);

  const handleCopy = (text: string, type: 'english' | 'vietnamese') => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess(type);
    });
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center"
      onClick={onClose}
    >
      <div 
        className="bg-secondary rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col border border-border"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-border">
          <h2 className="text-xl font-bold text-accent">Prompt cho Ảnh/Video</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary text-2xl font-bold">&times;</button>
        </div>
        <div className="p-6 overflow-y-auto flex-grow space-y-6">
            {isLoading && <LoadingSkeleton />}
            {error && <p className="text-red-400">{error}</p>}
            {!isLoading && !error && prompt && (
                <>
                    <div>
                        <label className="block text-sm font-semibold text-text-secondary mb-2">Prompt (Tiếng Anh)</label>
                        <textarea
                            readOnly
                            rows={4}
                            className="w-full bg-primary border border-border rounded-md p-3 text-text-primary resize-y"
                            value={prompt.english}
                        />
                         <button 
                            onClick={() => handleCopy(prompt.english, 'english')}
                            className="mt-2 flex items-center space-x-2 bg-secondary/70 hover:bg-secondary text-text-secondary px-3 py-1.5 rounded-md text-sm font-semibold transition border border-border"
                        >
                            <ClipboardIcon className="w-4 h-4" />
                            <span>{copySuccess === 'english' ? 'Đã chép!' : 'Sao chép'}</span>
                        </button>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-text-secondary mb-2">Bản dịch (Tiếng Việt)</label>
                        <textarea
                            readOnly
                            rows={4}
                            className="w-full bg-primary border border-border rounded-md p-3 text-text-primary resize-y"
                            value={prompt.vietnamese}
                        />
                         <button 
                            onClick={() => handleCopy(prompt.vietnamese, 'vietnamese')}
                            className="mt-2 flex items-center space-x-2 bg-secondary/70 hover:bg-secondary text-text-secondary px-3 py-1.5 rounded-md text-sm font-semibold transition border border-border"
                        >
                            <ClipboardIcon className="w-4 h-4" />
                            <span>{copySuccess === 'vietnamese' ? 'Đã chép!' : 'Sao chép'}</span>
                        </button>
                    </div>
                </>
            )}
        </div>
        <div className="p-4 border-t border-border flex justify-end items-center gap-4">
            {isLoading && (
                <p className="text-xs text-accent flex-grow">Bạn có thể đóng hộp thoại này và quay trở lại sau khi hoàn tất.</p>
            )}
            <button onClick={onClose} className="bg-accent hover:brightness-110 text-white font-bold py-2 px-4 rounded-md transition">
                Đóng
            </button>
        </div>
      </div>
    </div>
  );
};