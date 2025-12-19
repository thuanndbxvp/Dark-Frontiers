




import React, { useState, useEffect } from 'react';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import type { ScriptPartSummary, ScriptType, ScenarioType, SummarizeConfig, SceneSummary } from '../types';
import { ImageUploader } from './ImageUploader';

// Make TypeScript aware of the global XLSX object from the CDN
declare const XLSX: any;

interface SummarizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: ScriptPartSummary[] | null;
  isLoading: boolean;
  error: string | null;
  scriptType: ScriptType;
  title: string;
  onGenerate: (config: SummarizeConfig) => void;
  onGenerateVideoPrompt: (scene: SceneSummary, partIndex: number, config: SummarizeConfig) => Promise<void>;
}

const LoadingSkeleton: React.FC = () => (
    <div className="space-y-6 animate-pulse">
        {[...Array(2)].map((_, i) => (
            <div key={i} className="space-y-4 p-4 bg-primary/50 rounded-lg">
                <div className="h-6 bg-primary rounded w-1/3 mb-4"></div>
                {[...Array(3)].map((_, j) => (
                    <div key={j} className="border-t border-secondary pt-4 mt-4">
                        <div className="h-4 bg-primary rounded w-3/4 mb-3"></div>
                        <div className="h-3 bg-primary rounded w-1/4 mb-2"></div>
                        <div className="h-16 bg-primary rounded w-full"></div>
                    </div>
                ))}
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
        if (!text) return;
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

export const SummarizeModal: React.FC<SummarizeModalProps> = ({ isOpen, onClose, summary, isLoading, error, scriptType, title, onGenerate, onGenerateVideoPrompt }) => {
    const [isAutoPrompts, setIsAutoPrompts] = useState(true);
    const [promptCountInput, setPromptCountInput] = useState('10');
    const [includeNarration, setIncludeNarration] = useState(false);
    const [scenarioType, setScenarioType] = useState<ScenarioType>('general');
    const [referenceImages, setReferenceImages] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState<'image' | 'video'>('image');
    const [generatingVideoPromptKey, setGeneratingVideoPromptKey] = useState<string | null>(null);
    const [isBulkGenerating, setIsBulkGenerating] = useState(false);


    useEffect(() => {
        if (isOpen && !summary && !isLoading && !error) {
            setIsAutoPrompts(true);
            setPromptCountInput('10');
            setIncludeNarration(false);
            setScenarioType('general');
            setReferenceImages([]);
            setIsBulkGenerating(false);
        }
    }, [isOpen, summary, isLoading, error]);


    if (!isOpen) return null;

    const handleGenerateClick = () => {
        const config: SummarizeConfig = {
            numberOfPrompts: isAutoPrompts ? 'auto' : parseInt(promptCountInput, 10),
            includeNarration,
            scenarioType,
            referenceImages,
        };
        onGenerate(config);
    };

    const handleGenerateVideoPromptClick = async (scene: SceneSummary, partIndex: number) => {
        const key = `${partIndex}-${scene.sceneNumber}`;
        setGeneratingVideoPromptKey(key);
        const config: SummarizeConfig = {
            numberOfPrompts: isAutoPrompts ? 'auto' : parseInt(promptCountInput, 10),
            includeNarration,
            scenarioType,
            referenceImages,
        };
        await onGenerateVideoPrompt(scene, partIndex, config);
        setGeneratingVideoPromptKey(null);
    };

    const handleGenerateAllVideoPrompts = async () => {
        if (!summary) return;

        setIsBulkGenerating(true);
        
        const config: SummarizeConfig = {
            numberOfPrompts: isAutoPrompts ? 'auto' : parseInt(promptCountInput, 10),
            includeNarration,
            scenarioType,
            referenceImages,
        };

        const scenesToGenerate: { scene: SceneSummary, partIndex: number }[] = [];
        summary.forEach((part, partIndex) => {
            part.scenes.forEach(scene => {
                const needsGeneration = (scenarioType === 'finance' || scenarioType === 'ww2') && scene.videoPrompt.startsWith('Prompt chưa được tạo.');
                if (needsGeneration) {
                    scenesToGenerate.push({ scene, partIndex });
                }
            });
        });

        for (const { scene, partIndex } of scenesToGenerate) {
            try {
                const key = `${partIndex}-${scene.sceneNumber}`;
                setGeneratingVideoPromptKey(key); // Show progress on the current item
                await onGenerateVideoPrompt(scene, partIndex, config);
            } catch (error) {
                console.error(`Error generating prompt for scene ${scene.sceneNumber}:`, error);
                // The error is already handled inside onGenerateVideoPrompt which updates the UI
            }
        }

        setGeneratingVideoPromptKey(null); // Clear individual loader state
        setIsBulkGenerating(false);
    };

    const handleRetryAllFailedPrompts = async () => {
        if (!summary) return;
        
        setIsBulkGenerating(true); // Reuse loading state for UI feedback

        const config: SummarizeConfig = {
            numberOfPrompts: isAutoPrompts ? 'auto' : parseInt(promptCountInput, 10),
            includeNarration,
            scenarioType,
            referenceImages,
        };

        const scenesToRetry: { scene: SceneSummary, partIndex: number }[] = [];
        summary.forEach((part, partIndex) => {
            part.scenes.forEach(scene => {
                if (scene.videoPrompt.startsWith('LỖI:')) {
                    scenesToRetry.push({ scene, partIndex });
                }
            });
        });

        // The onGenerateVideoPrompt prop already handles optimistic UI updates.
        // We just need to iterate and call it for each failed item.
        for (const { scene, partIndex } of scenesToRetry) {
            try {
                await handleGenerateVideoPromptClick(scene, partIndex);
            } catch (error) {
                console.error(`Error retrying prompt for scene ${scene.sceneNumber}:`, error);
            }
        }
        
        setIsBulkGenerating(false);
    };

    const handleDownloadExcel = () => {
        if (!summary || typeof XLSX === 'undefined') return;

        const header = ['STT', 'Tóm tắt Cảnh', 'Prompt Ảnh', 'Prompt Video', 'Trạng thái'];
        const data: (string | number)[][] = [];
        let sceneCounter = 1;

        summary.forEach(part => {
            part.scenes.forEach(scene => {
                data.push([
                    sceneCounter++,
                    scene.summary,
                    scene.imagePrompt,
                    scene.videoPrompt,
                    '' // Status column
                ]);
            });
        });

        const worksheet = XLSX.utils.aoa_to_sheet([header, ...data]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Prompts');
        
        const sanitizedTitle = title.replace(/[^a-z0-9_-\s]/gi, '').trim().replace(/\s+/g, '_');
        const fileName = `Prompts_${sanitizedTitle || 'untitled'}.xlsx`;
        
        XLSX.writeFile(workbook, fileName);
    };

    const hasGenerated = summary || isLoading || error;
    const isGenerateButtonDisabled = !isAutoPrompts && (!promptCountInput || parseInt(promptCountInput) <= 0);
    
    const needsBulkGeneration = summary?.some(part => 
        part.scenes.some(scene => 
            (scenarioType === 'finance' || scenarioType === 'ww2') && scene.videoPrompt.startsWith('Prompt chưa được tạo.')
        )
    ) ?? false;

    const hasFailedPrompts = summary?.some(part =>
        part.scenes.some(scene =>
            scene.videoPrompt.startsWith('LỖI:')
        )
    ) ?? false;


    const renderContent = () => {
        if (isLoading) return <LoadingSkeleton />;
        if (error) return <p className="text-red-400 bg-red-900/50 p-3 rounded-md">{error}</p>;

        if (!summary) {
            return (
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-text-primary mb-2">Loại kịch bản</label>
                        <select
                            value={scenarioType}
                            onChange={(e) => setScenarioType(e.target.value as ScenarioType)}
                            className="w-full bg-primary border border-border rounded-md p-2 text-text-primary focus:ring-2 focus:ring-accent focus:border-accent transition"
                        >
                            <option value="general">1-Kịch bản chung</option>
                            <option value="ww2">2-Kịch bản WW2</option>
                            <option value="finance">3-Kịch bản Finance</option>
                        </select>
                    </div>

                    
                    <ImageUploader 
                        onImagesChange={setReferenceImages}
                        imagePreviewUrls={referenceImages}
                    />
                    

                    <div>
                        <label className="block text-sm font-semibold text-text-primary mb-2">Số lượng prompt</label>
                        <div className="flex items-center space-x-4">
                            <input
                                type="number"
                                value={promptCountInput}
                                onChange={e => setPromptCountInput(e.target.value)}
                                disabled={isAutoPrompts}
                                className="w-24 bg-primary border border-border rounded-md p-2 text-text-primary focus:ring-2 focus:ring-accent focus:border-accent transition disabled:bg-primary/50 disabled:cursor-not-allowed"
                                placeholder="VD: 15"
                            />
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isAutoPrompts}
                                    onChange={e => setIsAutoPrompts(e.target.checked)}
                                    className="h-4 w-4 rounded border-border text-accent focus:ring-accent bg-secondary"
                                />
                                <span className="text-text-primary">Tự động</span>
                            </label>
                        </div>
                        <p className="text-xs text-text-secondary mt-1">AI sẽ tạo số lượng cảnh phù hợp (~4-6s mỗi cảnh) nếu bạn chọn "Tự động".</p>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-text-primary mb-2">Tùy chọn lời thoại</label>
                         <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={includeNarration}
                                onChange={e => setIncludeNarration(e.target.checked)}
                                className="h-4 w-4 rounded border-border text-accent focus:ring-accent bg-secondary"
                            />
                            <span className="text-text-primary">Bao gồm lời thoại trong video</span>
                        </label>
                        <p className="text-xs text-text-secondary mt-1">Nếu không chọn, AI sẽ tạo prompt cho video chỉ có nhạc nền và có thể gợi ý chữ trên màn hình.</p>
                    </div>
                </div>
            );
        }

        return (
            <div>
                <div className="mb-4 border-b border-border">
                     <div className="flex bg-primary rounded-t-lg p-1 max-w-sm">
                        <button
                            onClick={() => setActiveTab('image')}
                            className={`w-full py-2 text-sm font-semibold rounded-md transition-colors ${
                                activeTab === 'image' ? 'bg-accent text-white shadow-sm' : 'text-text-primary hover:bg-secondary'
                            }`}
                        >
                            Prompts Ảnh
                        </button>
                        <button
                            onClick={() => setActiveTab('video')}
                            className={`w-full py-2 text-sm font-semibold rounded-md transition-colors ${
                                activeTab === 'video' ? 'bg-accent text-white shadow-sm' : 'text-text-primary hover:bg-secondary'
                            }`}
                        >
                            Prompts Video
                        </button>
                    </div>
                </div>
                <div className="space-y-8">
                    {summary.map((part, partIndex) => (
                        <div key={partIndex} className="bg-primary p-4 rounded-lg border border-border">
                            <h3 className="text-lg font-bold text-accent mb-4 border-b border-border pb-2">{part.partTitle}</h3>
                            <div className="space-y-4">
                                {part.scenes.map(scene => {
                                    const promptText = activeTab === 'video' ? scene.videoPrompt : scene.imagePrompt;
                                    const isVideoPlaceholder = activeTab === 'video' && (scenarioType === 'finance' || scenarioType === 'ww2') && promptText.startsWith('Prompt chưa được tạo.');
                                    const isVideoError = activeTab === 'video' && promptText.startsWith('LỖI:');
                                    const currentKey = `${partIndex}-${scene.sceneNumber}`;
                                    const isGeneratingThisPrompt = generatingVideoPromptKey === currentKey;
                                    const summaryLabel = (scenarioType === 'finance' || scenarioType === 'ww2') ? 'Trích đoạn kịch bản' : `Cảnh ${scene.sceneNumber}`;

                                    return (
                                        <div key={scene.sceneNumber} className="border-t border-border/50 pt-3">
                                            <p className="text-sm text-text-secondary"><strong className="text-text-primary font-semibold">{summaryLabel}:</strong> {scene.summary}</p>
                                            <div className="mt-2">
                                                <label className="block text-xs font-semibold text-text-secondary mb-1">Prompt {activeTab === 'image' ? 'Ảnh' : 'Video'} (Tiếng Anh)</label>
                                                {isGeneratingThisPrompt && isVideoError ? (
                                                    <div className="w-full bg-secondary border border-border rounded-md p-4 text-center">
                                                        <div className="flex items-center justify-center mx-auto text-text-primary text-sm">
                                                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                            <span>Đang thử lại...</span>
                                                        </div>
                                                    </div>
                                                ) : isVideoPlaceholder ? (
                                                    <div className="w-full bg-secondary border border-border rounded-md p-4 text-center">
                                                        <button
                                                            onClick={() => handleGenerateVideoPromptClick(scene, partIndex)}
                                                            disabled={isGeneratingThisPrompt || isBulkGenerating}
                                                            className="flex items-center justify-center mx-auto bg-accent/80 hover:bg-accent text-white font-semibold py-2 px-4 rounded-lg transition text-sm disabled:opacity-50"
                                                        >
                                                            {isGeneratingThisPrompt ? (
                                                                <>
                                                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                                    <span>Đang tạo...</span>
                                                                </>
                                                            ): (
                                                                <span>Tạo prompt</span>
                                                            )}
                                                        </button>
                                                    </div>
                                                ) : isVideoError ? (
                                                     <div className="flex items-center gap-2">
                                                        <div className="flex-grow bg-red-900/50 border border-red-500/50 rounded-md p-3 text-red-300 text-sm">
                                                            {promptText}
                                                        </div>
                                                        <button
                                                            onClick={() => handleGenerateVideoPromptClick(scene, partIndex)}
                                                            disabled={isGeneratingThisPrompt || isBulkGenerating}
                                                            className="flex-shrink-0 bg-secondary hover:bg-border text-text-primary font-semibold py-2 px-3 rounded-lg transition text-sm disabled:opacity-50"
                                                            aria-label="Thử lại tạo prompt"
                                                        >
                                                            Thử lại
                                                        </button>
                                                     </div>
                                                ) : (
                                                    <>
                                                        <textarea
                                                            readOnly
                                                            rows={3}
                                                            className="w-full bg-secondary border border-border rounded-md p-2 text-text-primary resize-y text-sm font-mono"
                                                            value={promptText}
                                                        />
                                                        <CopyButton text={promptText} />
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderBulkActionButton = () => {
        if (activeTab !== 'video') return null;

        if (hasFailedPrompts) {
            return (
                <button
                    onClick={handleRetryAllFailedPrompts}
                    disabled={isBulkGenerating || !!generatingVideoPromptKey || isLoading}
                    className="flex items-center gap-2 text-sm bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2 px-4 rounded-md transition disabled:opacity-50"
                >
                    {isBulkGenerating ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            <span>Đang thử lại...</span>
                        </>
                    ) : (
                        'Thử lại các mục lỗi'
                    )}
                </button>
            );
        }

        if (needsBulkGeneration) {
            return (
                <button
                    onClick={handleGenerateAllVideoPrompts}
                    disabled={isBulkGenerating || !!generatingVideoPromptKey || isLoading}
                    className="flex items-center gap-2 text-sm bg-accent/80 hover:bg-accent text-white font-semibold py-2 px-4 rounded-md transition disabled:opacity-50"
                >
                    {isBulkGenerating ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            <span>Đang tạo...</span>
                        </>
                    ) : (
                        'Tạo hàng loạt'
                    )}
                </button>
            );
        }

        return null;
    };

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
                    <h2 className="text-xl font-bold text-accent">Chuyển thể Kịch bản thành Cảnh quay</h2>
                    <button onClick={onClose} className="text-text-secondary hover:text-text-primary text-2xl font-bold">&times;</button>
                </div>
                <div className="p-6 overflow-y-auto flex-grow">
                    {renderContent()}
                </div>
                <div className="p-4 border-t border-border flex justify-end items-center gap-4">
                    {isBulkGenerating ? (
                        <p className="text-xs text-accent flex-grow">Đang xử lý hàng loạt, vui lòng chờ...</p>
                    ) : isLoading ? (
                        <p className="text-xs text-accent flex-grow">AI đang sáng tạo, vui lòng chờ trong giây lát...</p>
                    ) : null}

                    {!hasGenerated ? (
                        <button onClick={handleGenerateClick} disabled={isGenerateButtonDisabled} className="bg-accent hover:brightness-110 text-white font-bold py-2 px-4 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed">
                            Bắt đầu chuyển thể
                        </button>
                    ) : (
                         <>
                            {renderBulkActionButton()}
                             <button 
                                onClick={handleDownloadExcel}
                                disabled={isBulkGenerating || isLoading || !summary || summary.length === 0}
                                className="flex items-center gap-2 text-sm bg-secondary/70 hover:bg-secondary text-text-secondary font-semibold py-2 px-4 rounded-md transition border border-border disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <DownloadIcon className="w-5 h-5" />
                                Download Prompts
                            </button>
                         </>
                    )}
                    
                    <button onClick={onClose} className="bg-primary hover:bg-primary/70 text-text-secondary font-bold py-2 px-4 rounded-md transition border border-border">
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
};