
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

interface OutputDisplayProps {
  script: string;
  isLoading: boolean;
  error: string | null;
  onStartSequentialGenerate: () => void;
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
  visualPromptsCache: Map<string, VisualPrompt>;
  onImportScript: (file: File) => void;
}

const InitialState: React.FC<{ onImportClick: () => void }> = ({ onImportClick }) => (
    <div className="text-text-secondary prose prose-invert max-w-none prose-p:leading-relaxed">
        <h2 className="text-3xl font-bold text-text-primary mb-4" style={{color: 'var(--color-accent)'}}>Giải phóng Sức sáng tạo của bạn.</h2>
        <p className="text-lg">Biến ý tưởng lóe lên thành kịch bản chuyên nghiệp, hoặc <button onClick={onImportClick} className="text-accent hover:underline font-semibold inline">import kịch bản có sẵn</button> để bắt đầu tinh chỉnh.</p>

        <div className="mt-8 space-y-6">
            {/* Step 1 */}
            <div className="bg-secondary p-6 rounded-lg border border-border flex gap-6 items-start">
                <div className="flex-shrink-0 bg-accent text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-xl shadow-md shadow-accent/20">1</div>
                <div>
                    <h3 className="font-semibold text-accent/90 text-lg mb-2">Bước 1: Khởi động Ý tưởng (hoặc Kịch bản)</h3>
                    <ul className="list-disc list-inside space-y-2 text-sm text-text-secondary">
                        <li><strong>Cài đặt API Key:</strong> Đây là bước đầu tiên và quan trọng nhất. Nhấp vào nút "API" ở góc trên bên phải để thêm key của bạn.</li>
                        <li><strong>Nhập ý tưởng:</strong> Trong ô "Ý tưởng chính", điền chủ đề chính hoặc phác thảo sơ bộ nội dung bạn muốn.</li>
                        <li><strong>Hoặc Import kịch bản:</strong> Nhấn nút "Import" ở trên để tải lên file .txt, .srt, hoặc .xlsx và bắt đầu làm việc ngay.</li>
                        <li><strong>Chọn AI:</strong> Lựa chọn nhà cung cấp AI (Gemini hoặc OpenAI) và model phù hợp nhất với nhu cầu của bạn.</li>
                    </ul>
                </div>
            </div>

            {/* Step 2 */}
            <div className="bg-secondary p-6 rounded-lg border border-border flex gap-6 items-start">
                <div className="flex-shrink-0 bg-accent text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-xl shadow-md shadow-accent/20">2</div>
                <div>
                    <h3 className="font-semibold text-accent/90 text-lg mb-2">Bước 2: Tinh chỉnh & Sáng tạo</h3>
                    <ul className="list-disc list-inside space-y-2 text-sm text-text-secondary">
                        <li><strong>Từ khóa SEO:</strong> Thêm các từ khóa quan trọng vào ô "Từ khóa" để AI lồng ghép chúng một cách tự nhiên, giúp video dễ được tìm thấy hơn.</li>
                        <li><strong>Thiết lập phong cách:</strong> Trong các mục "Lối diễn đạt" và "Phong cách Viết", hãy chọn các tùy chọn phù hợp nhất, hoặc nhấn "AI Gợi ý Phong cách" để AI đề xuất cho bạn.</li>
                        <li><strong>Tạo kịch bản:</strong> Khi đã sẵn sàng, nhấn nút "Tạo kịch bản" và chứng kiến phép màu!</li>
                    </ul>
                </div>
            </div>

            {/* Step 3 */}
            <div className="bg-secondary p-6 rounded-lg border border-border flex gap-6 items-start">
                <div className="flex-shrink-0 bg-accent text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-xl shadow-md shadow-accent/20">3</div>
                <div>
                    <h3 className="font-semibold text-accent/90 text-lg mb-2">Bước 3: Hậu kỳ & Hoàn thiện</h3>
                    <ul className="list-disc list-inside space-y-2 text-sm text-text-secondary">
                        <li><strong>Sửa đổi:</strong> Kịch bản chưa ưng ý? Sử dụng ô "Sửa Kịch bản" ở cột bên phải để yêu cầu AI chỉnh sửa cho đến khi bạn hoàn toàn hài lòng.</li>
                        <li><strong>Chuyển thể:</strong> Dùng nút "Chuyển thể kịch bản" để tự động tạo tóm tắt và prompt hình ảnh/video chi tiết cho từng cảnh quay.</li>
                        <li><strong>Tách & Đếm từ:</strong> Nhấn "Tách voice và đếm số từ" để tách riêng phần lời thoại (dùng để thu âm) và kiểm tra số từ.</li>
                        <li><strong>Giọng nói AI:</strong> Sử dụng nút "Chuyển thành Giọng nói" để chuyển lời thoại thành file audio chuyên nghiệp với ElevenLabs.</li>
                    </ul>
                </div>
            </div>
        </div>
        
        <p className="mt-10 text-center font-semibold text-text-primary text-lg">
            Bạn đã sẵn sàng chưa? Hãy bắt đầu từ Bước 1 ở bảng điều khiển bên trái!
        </p>
    </div>
);

const parseMarkdown = (text: string) => {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-text-primary">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/^### (.*$)/gim, '<h3 class="text-xl font-semibold mt-6 mb-3 text-accent/90">$1</h3>')
        .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold mt-8 mb-4 text-accent border-b-2 border-border pb-2">$1</h2>')
        .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-extrabold mt-8 mb-4 text-accent border-b-2 border-border pb-2">$1</h1>')
        .replace(/---/g, '<hr class="border-border my-6">')
        .replace(/\n/g, '<br />');
};

export const OutputDisplay: React.FC<OutputDisplayProps> = ({ 
    script, isLoading, error, 
    onStartSequentialGenerate,
    isGeneratingSequentially, onGenerateNextPart, currentPart, totalParts,
    revisionCount,
    onGenerateVisualPrompt,
    onGenerateAllVisualPrompts, isGeneratingAllVisualPrompts,
    scriptType,
    hasGeneratedAllVisualPrompts,
    visualPromptsCache,
    onImportScript
}) => {
    const [copySuccess, setCopySuccess] = useState('');
    const [loadingPromptIndex, setLoadingPromptIndex] = useState<number | null>(null);
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
        link.download = 'youtube-script.txt';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleGeneratePromptClick = async (index: number, scene: string) => {
        setLoadingPromptIndex(index);
        await onGenerateVisualPrompt(scene);
        setLoadingPromptIndex(null);
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            onImportScript(file);
        }
        // Reset input to allow re-uploading the same file
        event.target.value = '';
    };
    
    const isOutline = script.includes("### Dàn Ý Chi Tiết");
    const showActionControls = !!script;

    const getTitle = () => {
        if (isGeneratingSequentially) {
            return `Đang tạo kịch bản... (Phần ${currentPart}/${totalParts})`;
        }
        if (revisionCount > 0) {
            return `Kịch bản (sửa lần ${revisionCount})`;
        }
        if (isLoading) {
            return 'Kịch bản đang được tạo';
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
            const sections = script.split(/(?=^## .*?$|^### .*?$)/m).filter(s => s.trim() !== '');
            return sections.map((section, index) => {
                const hasGeneratedPrompt = visualPromptsCache.has(section);
                return (
                    <div key={index} className="script-section mb-4 pb-4 border-b border-border/50 last:border-b-0">
                        <div className="prose prose-invert max-w-none prose-p:text-text-secondary prose-p:leading-relaxed prose-strong:text-text-primary" dangerouslySetInnerHTML={{ __html: parseMarkdown(section) }} />
                        {!isOutline && section.trim().length > 50 && (
                            <div className="mt-3 text-right">
                                <button
                                    onClick={() => handleGeneratePromptClick(index, section)}
                                    disabled={loadingPromptIndex === index}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-secondary hover:bg-primary/50 text-text-primary text-xs font-semibold rounded-md transition disabled:opacity-50"
                                >
                                    {loadingPromptIndex === index ? (
                                        <>
                                         <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                         </svg>
                                         <span>Đang tạo...</span>
                                        </>
                                    ) : (
                                        <>
                                          <CameraIcon className="w-4 h-4" />
                                          <span>Tạo Prompt Ảnh/Video</span>
                                          {hasGeneratedPrompt && <CheckIcon className="w-4 h-4 text-green-400 ml-1" />}
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                );
            });
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
        <div className="flex justify-between items-center p-4 border-b border-border flex-wrap gap-2 sticky top-[81px] bg-secondary/80 backdrop-blur-sm z-10">
            <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                <span>{getTitle()}</span>
                {isLoading && (
                    <svg className="animate-spin h-5 w-5 text-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                )}
            </h2>
            <div className="flex items-center gap-3 flex-wrap">
                {script && !isLoading && isOutline && !isGeneratingSequentially && (
                    <button onClick={onStartSequentialGenerate} className="flex items-center space-x-2 bg-accent hover:brightness-110 text-white px-3 py-1.5 rounded-md text-sm font-semibold transition shadow-md shadow-accent/20">
                        <BoltIcon className="w-4 h-4" />
                        <span>Tạo kịch bản đầy đủ</span>
                    </button>
                )}
                <button onClick={handleImportClick} className="flex items-center space-x-2 bg-secondary hover:bg-primary/50 text-text-primary px-3 py-1.5 rounded-md text-sm transition border border-border">
                    <UploadIcon className="w-4 h-4" />
                    <span>Import</span>
                </button>
                {showActionControls && (
                    <>
                         {!isOutline && (
                            <button 
                                onClick={onGenerateAllVisualPrompts} 
                                className="flex items-center space-x-2 bg-secondary hover:bg-primary/50 text-text-primary px-3 py-1.5 rounded-md text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed border border-border" 
                                disabled={isGeneratingAllVisualPrompts || isLoading}
                            >
                                <CameraIcon className="w-4 h-4" />
                                <span>{isGeneratingAllVisualPrompts ? 'Đang tạo...' : 'Tạo ảnh/video'}</span>
                                {hasGeneratedAllVisualPrompts && !isGeneratingAllVisualPrompts && <CheckIcon className="w-4 h-4 text-green-400 ml-1" />}
                            </button>
                        )}
                        <button onClick={handleExportTxt} className="flex items-center space-x-2 bg-secondary hover:bg-primary/50 text-text-primary px-3 py-1.5 rounded-md text-sm transition disabled:opacity-50 disabled:cursor-not-allowed border border-border" disabled={isLoading}>
                            <DownloadIcon className="w-4 h-4" />
                            <span>Tải .txt</span>
                        </button>
                        <button onClick={handleCopy} className="flex items-center space-x-2 bg-secondary hover:bg-primary/50 text-text-primary px-3 py-1.5 rounded-md text-sm transition disabled:opacity-50 disabled:cursor-not-allowed border border-border" disabled={!!copySuccess || isLoading}>
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
        {isGeneratingSequentially && currentPart < totalParts && !isLoading && (
            <div className="p-4 border-t border-border">
                <button onClick={onGenerateNextPart} className="w-full flex items-center justify-center bg-accent hover:brightness-110 text-white font-bold py-3 px-4 rounded-lg transition shadow-md shadow-accent/20">
                    Tiếp tục tạo phần {currentPart + 1}/{totalParts}
                </button>
            </div>
        )}
    </div>
  );
};
