
import React, { useState, useEffect } from 'react';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { BoltIcon } from './icons/BoltIcon';

interface DialogueModalProps {
  isOpen: boolean;
  onClose: () => void;
  dialogue: Record<string, string> | null;
  isLoading: boolean;
  error: string | null;
  onReExtract?: () => void;
}

const LoadingSkeleton: React.FC = () => (
    <div className="space-y-3 animate-pulse">
      <div className="h-4 bg-primary rounded w-full"></div>
      <div className="h-4 bg-primary rounded w-full"></div>
      <div className="h-4 bg-primary rounded w-5/6"></div>
      <div className="h-4 bg-primary rounded w-full"></div>
    </div>
);

export const DialogueModal: React.FC<DialogueModalProps> = ({ isOpen, onClose, dialogue, isLoading, error, onReExtract }) => {
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
            {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full py-10 space-y-4">
                     <svg className="animate-spin h-10 w-10 text-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-accent font-medium animate-pulse">AI đang làm sạch lời thoại...</p>
                    <div className="w-full"><LoadingSkeleton /></div>
                </div>
            ) : error ? (
                <div className="bg-red-900/20 border border-red-500/50 p-4 rounded-md text-center">
                    <p className="text-red-400">{error}</p>
                </div>
            ) : dialogueText ? (
                <textarea
                    readOnly
                    className="w-full h-full min-h-[400px] bg-primary border border-border rounded-md p-4 text-text-primary focus:ring-2 focus:ring-accent focus:border-accent transition resize-none font-sans leading-relaxed"
                    value={dialogueText}
                />
            ) : (
                <p className="text-center text-text-secondary py-10">Không có dữ liệu lời thoại.</p>
            )}
        </div>
        <div className="p-4 border-t border-border flex justify-end items-center gap-3 bg-primary/20">
            {isLoading && (
                <p className="text-[10px] text-accent flex-grow uppercase font-bold tracking-wider">Vui lòng chờ giây lát...</p>
            )}
            
            <button 
                onClick={onReExtract}
                disabled={isLoading}
                className="flex items-center space-x-2 bg-primary hover:bg-secondary text-accent px-4 py-2 rounded-md font-bold transition border border-accent/30 disabled:opacity-50"
                title="Yêu cầu AI làm sạch và tách lại kịch bản"
            >
                <BoltIcon className="w-4 h-4" />
                <span>Tách lại</span>
            </button>

            <button 
                onClick={handleCopy}
                className="flex items-center space-x-2 bg-secondary/70 hover:bg-secondary text-text-secondary px-4 py-2 rounded-md font-semibold transition border border-border"
                disabled={!!copySuccess || isLoading || !!error || !dialogueText}
            >
                <ClipboardIcon className="w-5 h-5" />
                <span>{copySuccess || 'Sao chép'}</span>
            </button>
            
            <button onClick={onClose} className="bg-accent hover:brightness-110 text-white font-bold py-2 px-6 rounded-md transition shadow-lg shadow-accent/20">
                Đóng
            </button>
        </div>
      </div>
    </div>
  );
};
