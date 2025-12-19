
import React, { useState, useEffect, useRef } from 'react';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { SaveIcon } from './icons/SaveIcon';
import { BoltIcon } from './icons/BoltIcon';
import { PencilIcon } from './icons/PencilIcon';
import { MicrophoneIcon } from './icons/MicrophoneIcon';
import { CameraIcon } from './icons/CameraIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { FilmIcon } from './icons/FilmIcon';
import { CheckIcon } from './icons/CheckIcon';
import type { ScriptType, VisualPrompt } from '../types';
import { UploadIcon } from './icons/UploadIcon';
import { Tooltip } from './Tooltip';

// Make TypeScript aware of the global XLSX object from the CDN
declare const XLSX: any;

interface OutputDisplayProps {
  title: string;
  script: string;
  isLoading: boolean;
  error: string | null;
  onStartSequentialGenerate: () => void;
  onStopSequentialGenerate: () => void;
  isGeneratingSequentially: boolean;
  onGenerateNextPart: () => void;
  currentPart: number;
  totalParts: number;
  revisionCount: number;
  onGenerateVisualPrompt: (scene: string) => void;
  onGenerateAllVisualPrompts: () => void;
  isGeneratingAllVisualPrompts: boolean;
  scriptType: ScriptType;
  hasGeneratedAllVisualPrompts: boolean;
  visualPromptsCache: Map<string, VisualPrompt[]>;
  loadingVisualPromptsParts: Set<string>;
  onImportScript: (file: File) => void;
  autoContinue?: boolean;
  setAutoContinue?: (val: boolean) => void;
}

const InitialState: React.FC<{ onImportClick: () => void }> = ({ onImportClick }) => (
    <div className="text-text-secondary prose prose-invert max-w-none prose-p:leading-relaxed">
        <h2 className="text-3xl font-bold text-text-primary mb-4" style={{color: 'var(--color-accent)'}}>Giải phóng Sức sáng tạo của bạn.</h2>
        <p className="text-lg">Biến ý tưởng lóe lên thành kịch bản chuyên nghiệp, hoặc <button onClick={onImportClick} className="text-accent hover:underline font-semibold inline">import kịch bản có sẵn</button> để bắt đầu tinh chỉnh.</p>

        <div className="mt-8 space-y-6">
            <div className="bg-secondary p-6 rounded-lg border border-border flex gap-6 items-start">
                <div className="flex-shrink-0 bg-accent text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-xl shadow-md shadow-accent/20">1</div>
                <div>
                    <h3 className="font-semibold text-accent/90 text-lg mb-2">Bước 1: Khởi động Ý tưởng (hoặc Kịch bản)</h3>
                    <ul className="list-disc list-inside space-y-2 text-sm text-text-secondary">
                        <li><strong>Cài đặt API Key:</strong> Nhấp vào nút "API" để thêm key của bạn.</li>
                        <li><strong>Nhập ý tưởng:</strong> Trong ô "Ý tưởng chính", điền chủ đề video.</li>
                        <li><strong>Chọn AI:</strong> Lựa chọn Gemini hoặc OpenAI phù hợp nhất.</li>
                    </ul>
                </div>
            </div>

            <div className="bg-secondary p-6 rounded-lg border border-border flex gap-6 items-start">
                <div className="flex-shrink-0 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-xl shadow-md" style={{ backgroundColor: 'var(--color-accent)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>2</div>
                <div>
                    <h3 className="font-semibold text-accent/90 text-lg mb-2">Bước 2: Tinh chỉnh & Sáng tạo</h3>
                    <ul className="list-disc list-inside space-y-2 text-sm text-text-secondary">
                        <li><strong>Từ khóa SEO:</strong> Thêm từ khóa để AI lồng ghép tự nhiên.</li>
                        <li><strong>Phong cách:</strong> Nhấn "AI Gợi ý Phong cách" để tối ưu hóa tông giọng.</li>
                        <li><strong>Tạo kịch bản:</strong> Nhấn nút "Tạo kịch bản" và chờ đợi kết quả.</li>
                    </ul>
                </div>
            </div>

            <div className="bg-secondary p-6 rounded-lg border border-border flex gap-6 items-start">
                <div className="flex-shrink-0 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-xl shadow-md" style={{ backgroundColor: 'var(--color-accent)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>3</div>
                <div>
                    <h3 className="font-semibold text-accent/90 text-lg mb-2">Bước 3: Hoàn thiện</h3>
                    <ul className="list-disc list-inside space-y-2 text-sm text-text-secondary">
                        <li><strong>Sửa đổi:</strong> Sử dụng ô "Sửa Kịch bản" để yêu cầu tinh chỉnh.</li>
                        <li><strong>Chuyển thể:</strong> Tạo tóm tắt và prompt hình ảnh cho từng cảnh.</li>
                        <li><strong>Giọng nói AI:</strong> Chuyển lời thoại thành file audio chuyên nghiệp.</li>
                    </ul>
                </div>
            </div>
        </div>
        
        <p className="mt-10 text-center font-semibold text-text-primary text-lg">
            Sẵn sàng chưa? Hãy bắt đầu từ Bước 1!
        </p>
    </div>
);

// Helper to clean script text for TTS display in the table
const cleanTtsText = (text: string): string => {
    return text
        .replace(/\*\*\*+/g, '') // Remove ***
        .replace(/\[.*?\]/g, '') // Remove [SFX], [Scene]
        .replace(/\*\*\s*#+.*?\*\*/g, '') // Remove headers inside bold
        .replace(/^\s*\*\*#+.*?\*\*/gm, '') // Header lines at start
        .replace(/^\s*#+.*$/gm, '') // Markdown headers
        .replace(/\*\*\s*\(.*?\)\s*\*\*/g, '') // Tone instructions bold
        .replace(/\*\s*\(.*?\)\s*\*/g, '') // Tone instructions italic
        .replace(/\(.*?Voice.*?\)/gi, '') // Voice notes
        .replace(/^Visual:.*$/gim, '') 
        .replace(/^Audio:.*$/gim, '')
        .replace(/^SFX:.*$/gim, '')
        .replace(/^Scene:.*$/gim, '')
        .replace(/^Camera:.*$/gim, '')
        .replace(/\*\*(.*?)\*\*/g, '$1') // Unbold
        .replace(/\*(.*?)\*/g, '$1') // Unitalic
        .replace(/\n\s*\n/g, '\n') // Multiple newlines to single
        .trim();
};

export const OutputDisplay: React.FC<OutputDisplayProps> = ({ 
    title, script, isLoading, error, 
    onStartSequentialGenerate,
    onStopSequentialGenerate,
    isGeneratingSequentially, onGenerateNextPart, currentPart, totalParts,
    revisionCount,
    onGenerateVisualPrompt,
    onGenerateAllVisualPrompts, isGeneratingAllVisualPrompts,
    scriptType,
    hasGeneratedAllVisualPrompts,
    visualPromptsCache,
    loadingVisualPromptsParts,
    onImportScript,
    autoContinue,
    setAutoContinue
}) => {
    const [copySuccess, setCopySuccess] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (copySuccess) {
            const timer = setTimeout(() => setCopySuccess(''), 2000);
            return () => clearTimeout(timer);
        }
    }, [copySuccess]);

    const handleCopy = () => {
        if (!script) return;
        navigator.clipboard.writeText(script).then(() => {
            setCopySuccess('Đã chép!');
        }, () => {
            setCopySuccess('Lỗi sao chép');
        });
    };
    
    const handleExportTxt = () => {
        if (!script) return;
        const blob = new Blob([script], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const sanitizedTitle = title.replace(/[/\\?%*:|"<>]/g, '-').trim();
        link.download = `Script_${sanitizedTitle || 'Untitled'}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleExportExcel = () => {
        if (!script || typeof XLSX === 'undefined') return;

        // Split by main headers
        const sections = script.split(/(?=^#+ .*?$|^#{0,3}\s*\*\*#+ .*?)/m).filter(s => s.trim() !== '' && !s.includes('---') && !s.includes('### Dàn Ý Chi Tiết'));
        
        const data = sections.map((section, index) => {
            const lines = section.split('\n');
            const rawTitle = lines[0].trim().replace(/^\*\*#+|\*\*|#+\s*/g, '');
            const content = lines.slice(1).join('\n');
            const cleanedTts = cleanTtsText(content);
            return [rawTitle || `Phần ${index + 1}`, cleanedTts];
        }).filter(row => row[0] || row[1]);

        if (data.length === 0) {
            // Fallback for non-sectioned scripts
            data.push(['Kịch bản đầy đủ', cleanTtsText(script)]);
        }

        const worksheet = XLSX.utils.aoa_to_sheet([
            ['Tên phân đoạn', 'Kịch bản (Ready for tts)'],
            ...data
        ]);

        // Standard styling for accessibility/readability in Excel
        const wscols = [
            { wch: 30 },
            { wch: 120 }
        ];
        worksheet['!cols'] = wscols;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Kịch bản');
        const sanitizedTitle = title.replace(/[/\\?%*:|"<>]/g, '-').trim();
        XLSX.writeFile(workbook, `Script_${sanitizedTitle || 'Untitled'}.xlsx`);
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            onImportScript(file);
        }
        event.target.value = '';
    };
    
    const isOutline = script.includes("### Dàn Ý Chi Tiết");
    const showActionControls = !!script;

    const getDisplayTitle = () => {
        if (isGeneratingSequentially) {
            return `Tiến trình: ${currentPart}/${totalParts} phần`;
        }
        if (revisionCount > 0) {
            return `Kịch bản (sửa lần ${revisionCount})`;
        }
        if (isLoading) {
            return 'Đang xử lý kịch bản...';
        }
        return 'Kịch bản';
    };

    const renderContent = () => {
        if (isLoading && !script) {
            return null;
        }
        if (error) {
            return <div className="text-center text-red-400 bg-red-900/20 border border-red-500/30 p-4 rounded-md">
                <h3 className="font-bold">Đã xảy ra lỗi</h3>
                <p>{error}</p>
            </div>;
        }
        if (script) {
            // Split by main headers
            const sections = script.split(/(?=^#+ .*?$|^#{0,3}\s*\*\*#+ .*?)/m).filter(s => s.trim() !== '' && !s.includes('---') && !s.includes('### Dàn Ý Chi Tiết'));
            
            // If it's just the initial "BẮT ĐẦU" or "DÀN Ý", render as simple text
            if (isOutline || script.includes('--- BẮT ĐẦU')) {
                return (
                    <div className="prose prose-invert max-w-none prose-p:text-text-secondary">
                        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-text-secondary bg-primary/20 p-4 rounded-lg border border-border/50">
                            {script}
                        </pre>
                    </div>
                );
            }

            return (
                <div className="overflow-x-auto rounded-lg border border-border shadow-sm">
                    <table className="w-full border-collapse text-left bg-secondary/30">
                        <thead className="bg-primary/80 text-accent font-bold text-xs uppercase tracking-wider sticky top-0">
                            <tr>
                                <th className="p-4 border-b border-border w-1/4">Tên phân đoạn</th>
                                <th className="p-4 border-b border-border w-3/4">Kịch bản (Ready for tts)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {sections.map((section, index) => {
                                const lines = section.split('\n');
                                const rawTitle = lines[0].trim().replace(/^\*\*#+|\*\*|#+\s*/g, '');
                                const content = lines.slice(1).join('\n');
                                const cleanedTts = cleanTtsText(content);
                                
                                const isPartLoading = loadingVisualPromptsParts.has(section);
                                const hasCache = visualPromptsCache.has(section);

                                if (!cleanedTts && !rawTitle) return null;

                                return (
                                    <tr key={index} className="group hover:bg-primary/40 transition-colors">
                                        <td className="p-4 align-top border-r border-border/20">
                                            <span className="text-sm font-bold text-text-primary block mb-3">{rawTitle || `Phần ${index + 1}`}</span>
                                            {cleanedTts.length > 20 && (
                                                <button
                                                    onClick={() => onGenerateVisualPrompt(section)}
                                                    disabled={isPartLoading}
                                                    className={`inline-flex items-center gap-2 px-2.5 py-1 text-[10px] font-bold rounded shadow-sm transition-all disabled:opacity-50 ${
                                                        hasCache 
                                                        ? 'bg-accent text-white' 
                                                        : 'bg-secondary text-text-secondary border border-border hover:border-accent/50'
                                                    }`}
                                                >
                                                    {isPartLoading ? (
                                                        <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                                                    ) : <CameraIcon className="w-3 h-3" />}
                                                    {hasCache ? 'ĐÃ CÓ PROMPT ✓' : 'TẠO ẢNH'}
                                                </button>
                                            )}
                                        </td>
                                        <td className="p-4 align-top">
                                            <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap font-sans">
                                                {cleanedTts || <span className="italic opacity-30 text-xs">(Phần này không có lời thoại để đọc)</span>}
                                            </p>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            );
        }
        if (!isLoading) return <InitialState onImportClick={handleImportClick} />;
        return null;
    }

  return (
    <div className="bg-secondary rounded-lg shadow-xl h-full flex flex-col border border-border">
         <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".txt,.srt,.xlsx"
            className="hidden"
        />
        <div className="flex justify-between items-center p-4 border-b border-border flex-wrap gap-2 sticky top-[81px] bg-secondary/95 backdrop-blur-md z-10">
            <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                <span>{getDisplayTitle()}</span>
                {isLoading && (
                    <svg className="animate-spin h-5 w-5 text-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                )}
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
                {script && !isLoading && isOutline && !isGeneratingSequentially && (
                    <div className="flex items-center gap-2">
                         <div className="flex items-center gap-2 bg-primary/40 px-3 py-1.5 rounded-md border border-border">
                            <input 
                                type="checkbox" 
                                id="header-autoContinue" 
                                checked={autoContinue} 
                                onChange={(e) => setAutoContinue?.(e.target.checked)} 
                                className="h-4 w-4 rounded border-border text-accent focus:ring-accent bg-secondary"
                            />
                            <label htmlFor="header-autoContinue" className="text-xs font-medium text-text-secondary cursor-pointer whitespace-nowrap">Auto-next</label>
                        </div>
                        <button onClick={onStartSequentialGenerate} className="flex items-center space-x-2 bg-accent hover:brightness-110 text-white px-3 py-1.5 rounded-md text-sm font-semibold transition shadow-md shadow-accent/20">
                            <BoltIcon className="w-4 h-4" />
                            <span>Tạo kịch bản đầy đủ</span>
                        </button>
                    </div>
                )}

                {isGeneratingSequentially && (
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setAutoContinue?.(!autoContinue)}
                            className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-semibold transition border ${
                                autoContinue 
                                ? 'bg-accent/10 border-accent/50 text-accent' 
                                : 'bg-primary/50 border-border text-text-secondary'
                            }`}
                        >
                            <div className={`w-3 h-3 rounded-full ${autoContinue ? 'bg-accent animate-pulse' : 'bg-text-secondary'}`} />
                            <span>Auto-next: {autoContinue ? 'Bật' : 'Tắt'}</span>
                        </button>

                        {!isLoading && currentPart < totalParts && (
                            <button 
                                onClick={onGenerateNextPart} 
                                className="flex items-center space-x-2 bg-accent hover:brightness-110 text-white px-3 py-1.5 rounded-md text-sm font-semibold transition shadow-md shadow-accent/20"
                            >
                                <BoltIcon className="w-4 h-4" />
                                <span>Tiếp tục phần {currentPart + 1}/{totalParts}</span>
                            </button>
                        )}
                        
                        <button 
                            onClick={onStopSequentialGenerate} 
                            disabled={!isLoading}
                            className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-semibold transition shadow-md ${
                                isLoading 
                                ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/20' 
                                : 'bg-red-900/20 text-red-500/50 cursor-not-allowed border border-red-900/30'
                            }`}
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <rect x="5" y="5" width="10" height="10" rx="1" />
                            </svg>
                            <span>Dừng tạo</span>
                        </button>
                    </div>
                )}

                {!isGeneratingSequentially && (
                    <button onClick={handleImportClick} className="flex items-center space-x-2 bg-secondary hover:bg-primary/50 text-text-primary px-3 py-1.5 rounded-md text-sm transition border border-border">
                        <UploadIcon className="w-4 h-4" />
                        <span>Import</span>
                    </button>
                )}

                {showActionControls && !isGeneratingSequentially && (
                    <>
                        <button onClick={handleExportTxt} className="flex items-center space-x-2 bg-secondary hover:bg-primary/50 text-text-primary px-3 py-1.5 rounded-md text-sm transition disabled:opacity-50 border border-border" disabled={isLoading}>
                            <DownloadIcon className="w-4 h-4" />
                            <span>Tải .txt</span>
                        </button>
                        <button 
                            onClick={handleExportExcel} 
                            className="flex items-center space-x-2 bg-secondary hover:bg-primary/50 text-text-primary px-3 py-1.5 rounded-md text-sm transition border border-border disabled:opacity-50" 
                            disabled={isLoading}
                        >
                            <DownloadIcon className="w-4 h-4 text-green-500" />
                            <span className="text-green-500 font-semibold">Tải Excel</span>
                        </button>
                        <button onClick={handleCopy} className="flex items-center space-x-2 bg-secondary hover:bg-primary/50 text-text-primary px-3 py-1.5 rounded-md text-sm transition disabled:opacity-50 border border-border" disabled={!!copySuccess || isLoading}>
                            <ClipboardIcon className="w-4 h-4" />
                            <span>{copySuccess || 'Sao chép'}</span>
                        </button>
                    </>
                )}
            </div>
        </div>
        <div className="p-6 overflow-y-auto flex-grow min-h-[400px]">
            <div className="w-full h-full">
                {renderContent()}
            </div>
        </div>
        {isGeneratingSequentially && !isLoading && currentPart === totalParts && (
            <div className="p-4 border-t border-border bg-primary/30 flex justify-center items-center">
                <div className="flex items-center gap-2 text-green-400 font-bold">
                    <CheckIcon className="w-5 h-5" />
                    <span>Kịch bản đã hoàn tất!</span>
                </div>
            </div>
        )}
    </div>
  );
};
