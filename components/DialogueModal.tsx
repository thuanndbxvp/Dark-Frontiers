import React, { useState, useEffect } from 'react';
import { ClipboardIcon } from './icons/ClipboardIcon';

interface DialogueModalProps {
  isOpen: boolean;
  onClose: () => void;
  dialogue: Record<string, string> | null;
  isLoading: boolean;
  error: string | null;
}

const LoadingSkeleton: React.FC = () => (
    <div className="space-y-3 animate-pulse">
      <div className="h-4 bg-primary rounded w-full"></div>
      <div className="h-4 bg-primary rounded w-full"></div>
      <div className="h-4 bg-primary rounded w-5/6"></div>
      <div className="h-4 bg-primary rounded w-full"></div>
    </div>
);


export const DialogueModal: React.FC<DialogueModalProps> = ({ isOpen, onClose, dialogue, isLoading, error }) => {
    const [copySuccess, setCopySuccess] = useState('');

    useEffect(() => {
        if (copySuccess) {
            const timer = setTimeout(() => setCopySuccess(''), 2000);
            return () => clearTimeout(timer);
        }
    }, [copySuccess]);

    const dialogueText = dialogue ? Object.values(dialogue).join('\n\n') : '';

    const handleCopy = () => {
        if (!dialogueText) return;
        navigator.clipboard.writeText(dialogueText).then(() => {
            setCopySuccess('Đã chép!');
        }, () => {
            setCopySuccess('Lỗi sao chép');
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
          <h2 className="text-xl font-bold text-accent">Lời thoại cho TTS</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary text-2xl font-bold">&times;</button>
        </div>
        <div className="p-6 overflow-y-auto flex-grow">
            {isLoading && <LoadingSkeleton />}
            {error && <p className="text-red-400">{error}</p>}
            {!isLoading && !error && dialogueText && (
                <textarea
                    readOnly
                    className="w-full h-full min-h-[300px] bg-primary border border-border rounded-md p-3 text-text-primary focus:ring-2 focus:ring-accent focus:border-accent transition resize-none"
                    value={dialogueText}
                />
            )}
        </div>
        <div className="p-4 border-t border-border flex justify-end items-center gap-4">
            {isLoading && (
                <p className="text-xs text-accent flex-grow">Bạn có thể đóng hộp thoại này và quay trở lại sau khi hoàn tất.</p>
            )}
            <button 
                onClick={handleCopy}
                className="flex items-center space-x-2 bg-secondary/70 hover:bg-secondary text-text-secondary px-4 py-2 rounded-md font-semibold transition border border-border"
                disabled={!!copySuccess || isLoading || !!error}
            >
                <ClipboardIcon className="w-5 h-5" />
                <span>{copySuccess || 'Sao chép'}</span>
            </button>
            <button onClick={onClose} className="bg-accent hover:brightness-110 text-white font-bold py-2 px-4 rounded-md transition">
                Đóng
            </button>
        </div>
      </div>
    </div>
  );
};