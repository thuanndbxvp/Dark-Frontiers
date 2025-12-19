
import React from 'react';
import type { WordCountStats } from '../types';
import { MicrophoneIcon } from './icons/MicrophoneIcon';

interface WordCountCheckProps {
  stats: WordCountStats | null;
  targetWordCount: string;
  onExtractAndCount: () => void;
  onOpenDialogueModal: () => void;
  isLoading: boolean;
}

export const WordCountCheck: React.FC<WordCountCheckProps> = ({ stats, targetWordCount, onExtractAndCount, onOpenDialogueModal, isLoading }) => {
    if (!stats) {
        return (
            <div className="bg-secondary p-4 rounded-lg border border-border space-y-3">
                <h3 className="text-md font-semibold text-text-primary mb-2">Kiểm tra Số từ & Tách Voice</h3>
                <p className="text-sm text-text-secondary mb-3">Nhấn nút để tách lời thoại và xem phân tích số từ chi tiết cho kịch bản.</p>
                <button
                    onClick={onExtractAndCount}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center bg-accent/80 hover:bg-accent disabled:bg-accent/50 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg transition"
                >
                    {isLoading ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Đang xử lý...</span>
                        </>
                    ) : (
                        <>
                            <MicrophoneIcon className="w-5 h-5 mr-2" />
                            Tách voice và đếm số từ
                        </>
                    )}
                </button>
            </div>
        );
    }
    
    const target = parseInt(targetWordCount, 10);
    
    let feedbackText = '';
    let feedbackColorClass = 'text-text-secondary';

    if (stats.total > 0 && !isNaN(target) && target > 0) {
        const difference = stats.total - target;
        const percentageDiff = (Math.abs(difference) / target) * 100;
        const sign = difference > 0 ? '+' : '';

        if (percentageDiff <= 10) {
            feedbackColorClass = 'text-green-400';
            feedbackText = `✔ Đạt mục tiêu (${sign}${difference} từ, ~${percentageDiff.toFixed(0)}%)`;
        } else if (percentageDiff <= 20) {
            feedbackColorClass = 'text-yellow-400';
            feedbackText = `⚠ Chênh lệch ${sign}${difference} từ (${percentageDiff.toFixed(0)}%)`;
        } else {
            feedbackColorClass = 'text-red-400';
            feedbackText = `❌ Chênh lệch ${sign}${difference} từ (${percentageDiff.toFixed(0)}%)`;
        }
    }

    if (stats.total === 0) {
        return null;
    }

    return (
        <div className="bg-secondary p-4 rounded-lg border border-border space-y-3">
            <h3 className="text-md font-semibold text-text-primary mb-2">Kiểm tra Số từ (Lời thoại)</h3>
            <div>
                <table className="w-full text-sm text-left table-fixed">
                    <tbody>
                        {stats.sections.map((sec, index) => (
                            <tr key={index} className="border-b border-border/50 last:border-b-0">
                                <td className="py-1.5 pr-2 text-text-secondary break-words">{sec.title}</td>
                                <td className="py-1.5 text-right font-semibold text-text-primary whitespace-nowrap">{sec.count} từ</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="font-bold text-text-primary border-t border-border pt-3 mt-3 flex justify-between items-baseline">
                <span>Tổng cộng:</span>
                <div className="text-right">
                    <span>{stats.total} từ</span>
                    {feedbackText && (
                        <p className={`font-normal text-xs ${feedbackColorClass}`}>{feedbackText}</p>
                    )}
                </div>
            </div>
            <button
                onClick={onOpenDialogueModal}
                disabled={isLoading}
                className="w-full mt-4 flex items-center justify-center bg-primary hover:bg-primary/70 disabled:bg-primary/40 disabled:cursor-not-allowed text-text-secondary font-bold py-2 px-4 rounded-lg transition border border-border"
            >
                <MicrophoneIcon className="w-5 h-5 mr-2" />
                Xem & Copy Lời thoại
            </button>
        </div>
    );
};
