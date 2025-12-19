import React, { useState, useEffect } from 'react';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import type { AllVisualPromptsResult } from '../types';

// Make TypeScript aware of the global XLSX object from the CDN
declare const XLSX: any;

interface AllVisualPromptsModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompts: AllVisualPromptsResult[] | null;
  isLoading: boolean;
  error: string | null;
}

const LoadingSkeleton: React.FC = () => (
    <div className="space-y-6 animate-pulse">
        {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-3 p-3 bg-primary/50 rounded-md">
                <div className="h-4 bg-primary rounded w-full"></div>
                <div className="h-4 bg-primary rounded w-5/6 mb-4"></div>
                <div className="h-3 bg-primary rounded w-1/4 mb-1"></div>
                <div className="h-8 bg-primary rounded w-full"></div>
                <div className="h-3 bg-primary rounded w-1/4 mb-1 mt-2"></div>
                <div className="h-8 bg-primary rounded w-full"></div>
            </div>
        ))}
    </div>
);


const CopyButton: React.FC<{ text: string }> = ({ text }) => {
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (copied) {
            const timer = setTimeout(() => setCopied(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [copied]);

    const handleCopy = () => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
        });
    };

    return (
        <button
            onClick={handleCopy}
            className="mt-2 flex items-center space-x-2 bg-secondary/70 hover:bg-secondary text-text-secondary px-3 py-1.5 rounded-md text-xs font-semibold transition border border-border"
        >
            <ClipboardIcon className="w-4 h-4" />
            <span>{copied ? 'Đã chép!' : 'Sao chép'}</span>
        </button>
    );
};

export const AllVisualPromptsModal: React.FC<AllVisualPromptsModalProps> = ({ isOpen, onClose, prompts, isLoading, error }) => {
  if (!isOpen) return null;

  const handleDownloadExcel = () => {
    if (!prompts || typeof XLSX === 'undefined') return;

    // Prepare data in Array of Arrays format to match the user's requested Excel structure.
    const header = ['STT', 'Prompt', 'Trạng thái', 'Dịch nghĩa prompt'];
    const data = prompts.map((item, index) => [
        index + 1,       // STT
        item.english,    // Prompt
        '',              // Trạng thái (empty for user)
        item.vietnamese  // Dịch nghĩa prompt
    ]);

    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet([header, ...data]);

    // Create workbook and append the sheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Visual Prompts');

    // Trigger download
    XLSX.writeFile(workbook, 'youtube_script_prompts.xlsx');
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center"
      onClick={onClose}
    >
      <div 
        className="bg-secondary rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-border"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-border">
          <h2 className="text-xl font-bold text-accent">Prompts cho Toàn bộ Kịch bản</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary text-2xl font-bold">&times;</button>
        </div>
        <div className="p-6 overflow-y-auto flex-grow">
            {isLoading && <LoadingSkeleton />}
            {error && <p className="text-red-400 bg-red-900/50 p-3 rounded-md">{error}</p>}
            {!isLoading && !error && prompts && (
                <div className="space-y-6">
                    {prompts.map((item, index) => (
                        <div key={index} className="bg-primary p-4 rounded-lg border border-border">
                            <details>
                                <summary className="text-sm font-semibold text-accent/90 cursor-pointer hover:text-accent">
                                    Cảnh {index + 1}: {item.scene.split('\n')[0].replace(/^[#\s]+/, '')}
                                </summary>
                                <p className="mt-2 text-xs text-text-secondary/80 border-l-2 border-border pl-2 italic">
                                    {item.scene.length > 200 ? `${item.scene.substring(0, 200)}...` : item.scene}
                                </p>
                            </details>
                            <div className="mt-4">
                                <label className="block text-xs font-semibold text-text-secondary mb-1">Prompt (Tiếng Anh)</label>
                                <textarea
                                    readOnly
                                    rows={3}
                                    className="w-full bg-secondary border border-border rounded-md p-2 text-text-primary resize-y text-sm"
                                    value={item.english}
                                />
                                <CopyButton text={item.english} />
                            </div>
                            <div className="mt-3">
                                <label className="block text-xs font-semibold text-text-secondary mb-1">Bản dịch (Tiếng Việt)</label>
                                <textarea
                                    readOnly
                                    rows={3}
                                    className="w-full bg-secondary border border-border rounded-md p-2 text-text-primary resize-y text-sm"
                                    value={item.vietnamese}
                                />
                                <CopyButton text={item.vietnamese} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
        <div className="p-4 border-t border-border flex justify-end items-center gap-4">
            {isLoading && (
                <p className="text-xs text-accent flex-grow">Bạn có thể đóng hộp thoại này và quay trở lại sau khi hoàn tất.</p>
            )}
            <button 
                onClick={handleDownloadExcel}
                disabled={isLoading || !prompts || prompts.length === 0}
                className="flex items-center gap-2 text-sm bg-secondary/70 hover:bg-secondary text-text-secondary font-semibold py-2 px-4 rounded-md transition border border-border disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <DownloadIcon className="w-5 h-5" />
                Download Excel
            </button>
            <button onClick={onClose} className="bg-accent hover:brightness-110 text-white font-bold py-2 px-4 rounded-md transition">
                Đóng
            </button>
        </div>
      </div>
    </div>
  );
};