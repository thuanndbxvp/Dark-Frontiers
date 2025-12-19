
import React, { useState, useEffect } from 'react';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { TrophyIcon } from './icons/TrophyIcon';

interface ScoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  score: string | null;
  isLoading: boolean;
  error: string | null;
}

const LoadingSkeleton: React.FC = () => (
    <div className="space-y-6 animate-pulse">
        {[...Array(3)].map((_, i) => (
            <div key={i}>
                <div className="h-6 bg-primary rounded w-1/3 mb-3"></div>
                <div className="h-4 bg-primary rounded w-1/4 mb-2"></div>
                <div className="h-12 bg-primary rounded w-full"></div>
            </div>
        ))}
        <div className="h-16 bg-primary rounded w-full mt-8"></div>
    </div>
);


export const ScoreModal: React.FC<ScoreModalProps> = ({ isOpen, onClose, score, isLoading, error }) => {
    const [copySuccess, setCopySuccess] = useState('');

    useEffect(() => {
        if (copySuccess) {
            const timer = setTimeout(() => setCopySuccess(''), 2000);
            return () => clearTimeout(timer);
        }
    }, [copySuccess]);

    const handleCopy = () => {
        if (!score) return;
        navigator.clipboard.writeText(score).then(() => {
            setCopySuccess('Đã chép!');
        }, () => {
            setCopySuccess('Lỗi sao chép');
        });
    };
    
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4"
            onClick={onClose}
        >
            <div 
                className="bg-secondary rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-border"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-4 border-b border-border">
                     <div className="flex items-center gap-3">
                        <TrophyIcon className="w-6 h-6 text-amber-400" />
                        <h2 className="text-xl font-bold text-accent">Đánh giá Kịch bản</h2>
                    </div>
                    <button onClick={onClose} className="text-text-secondary hover:text-text-primary text-2xl font-bold">&times;</button>
                </div>
                <div className="p-6 overflow-y-auto flex-grow">
                    {isLoading && <LoadingSkeleton />}
                    {error && <p className="text-red-400 bg-red-900/50 p-3 rounded-md">{error}</p>}
                    {!isLoading && !error && score && (
                        <div 
                            className="text-text-secondary whitespace-pre-wrap"
                            style={{ fontFamily: 'Inter, sans-serif', lineHeight: '1.7' }}
                        >
                            {score}
                        </div>
                    )}
                </div>
                <div className="p-4 border-t border-border flex justify-end items-center gap-4">
                    {isLoading && (
                        <p className="text-xs text-accent flex-grow">Chuyên gia đang đọc kịch bản, vui lòng chờ...</p>
                    )}
                    <button 
                        onClick={handleCopy}
                        className="flex items-center space-x-2 bg-primary hover:bg-primary/70 text-text-secondary px-4 py-2 rounded-md font-semibold transition border border-border"
                        disabled={!!copySuccess || isLoading || !!error || !score}
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
