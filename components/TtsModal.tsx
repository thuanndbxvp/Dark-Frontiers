
import React, { useState, useEffect, useRef } from 'react';
import type { ElevenlabsVoice, TtsGenerationStatus } from '../types';
import { DownloadIcon } from './icons/DownloadIcon';
import { PlayIcon } from './icons/PlayIcon';
import { SpeakerWaveIcon } from './icons/SpeakerWaveIcon';
import { KeyIcon } from './icons/KeyIcon';
import { TrashIcon } from './icons/TrashIcon';
import { BookmarkIcon } from './icons/BookmarkIcon';
import { getElevenlabsVoiceById } from '../services/aiService';

interface TtsModalProps {
  isOpen: boolean;
  onClose: () => void;
  voices: ElevenlabsVoice[];
  isLoadingVoices: boolean;
  onGenerate: (text: string, voiceId: string) => Promise<string>;
  error: string | null;
  // SESSION PROPS
  editableDialogue: Record<string, string>;
  setEditableDialogue: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  generationState: Record<string, TtsGenerationStatus>;
  setGenerationState: React.Dispatch<React.SetStateAction<Record<string, TtsGenerationStatus>>>;
}

// Helper định dạng thời gian cho SRT: HH:mm:ss,mmm
const formatSrtTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
};

// Logic tạo nội dung file SRT nâng cao: chia nhỏ câu và tính trọng số thời gian theo ký tự
const generateSrtContent = (text: string, duration: number): string => {
    if (!text.trim() || duration <= 0) return "";

    // 1. Tách văn bản thành các câu cơ bản dựa trên dấu câu
    const initialChunks = text.split(/([.!?\n]+)/).reduce((acc: string[], cur, idx) => {
        if (idx % 2 === 0) {
            if (cur.trim()) acc.push(cur.trim());
        } else {
            if (acc.length > 0) acc[acc.length - 1] += cur.trim();
        }
        return acc;
    }, []).filter(s => s.trim().length > 0);

    // 2. Chia nhỏ các câu quá dài để phụ đề mượt hơn (giới hạn ~45 ký tự mỗi dòng)
    const MAX_CHARS_PER_LINE = 45;
    const finalChunks: string[] = [];

    initialChunks.forEach(chunk => {
        if (chunk.length <= MAX_CHARS_PER_LINE) {
            finalChunks.push(chunk);
        } else {
            // Thử tách theo dấu phẩy, chấm phẩy hoặc các từ nối
            const subParts = chunk.split(/([,;:\-—]+)/);
            let currentPart = "";
            
            subParts.forEach((part, pIdx) => {
                if (pIdx % 2 === 0) { // Nội dung
                    if ((currentPart + part).length > MAX_CHARS_PER_LINE && currentPart !== "") {
                        finalChunks.push(currentPart.trim());
                        currentPart = part;
                    } else {
                        currentPart += part;
                    }
                } else { // Dấu câu tách
                    currentPart += part;
                }
            });

            if (currentPart.trim()) {
                // Nếu vẫn quá dài, tách theo khoảng trắng (từng từ)
                if (currentPart.length > MAX_CHARS_PER_LINE) {
                    const words = currentPart.split(/\s+/);
                    let line = "";
                    words.forEach(word => {
                        if ((line + word).length > MAX_CHARS_PER_LINE && line !== "") {
                            finalChunks.push(line.trim());
                            line = word + " ";
                        } else {
                            line += word + " ";
                        }
                    });
                    if (line.trim()) finalChunks.push(line.trim());
                } else {
                    finalChunks.push(currentPart.trim());
                }
            }
        }
    });

    if (finalChunks.length === 0) return "";

    // 3. Tính toán thời gian dựa trên trọng số độ dài ký tự (Character Weighting)
    const totalChars = finalChunks.reduce((sum, chunk) => sum + chunk.length, 0);
    let currentTime = 0;
    let srt = "";

    finalChunks.forEach((chunk, index) => {
        const chunkDuration = (chunk.length / totalChars) * duration;
        const start = currentTime;
        const end = currentTime + chunkDuration;
        
        srt += `${index + 1}\n${formatSrtTime(start)} --> ${formatSrtTime(end)}\n${chunk}\n\n`;
        
        currentTime = end;
    });

    return srt;
};

const VoiceItem: React.FC<{voice: ElevenlabsVoice, isSelected: boolean, onSelect: () => void, isSaved?: boolean, onDelete?: (e: React.MouseEvent) => void}> = ({ voice, isSelected, onSelect, isSaved, onDelete }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    const handlePlayPreview = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            } else {
                document.querySelectorAll('audio').forEach(audio => {
                    if (audio !== audioRef.current) audio.pause();
                });
                audioRef.current.play().catch(console.error);
            }
        }
    }

    useEffect(() => {
        const audio = audioRef.current;
        const onStateChange = () => setIsPlaying(!!(audio && !audio.paused && !audio.ended));
        audio?.addEventListener('play', onStateChange);
        audio?.addEventListener('pause', onStateChange);
        audio?.addEventListener('ended', onStateChange);
        return () => {
            audio?.removeEventListener('play', onStateChange);
            audio?.removeEventListener('pause', onStateChange);
            audio?.removeEventListener('ended', onStateChange);
        }
    }, []);

    return (
        <li 
            onClick={onSelect}
            className={`p-3 rounded-lg flex justify-between items-center cursor-pointer transition-colors border ${isSelected ? 'bg-accent text-white border-accent' : 'bg-primary hover:bg-primary/50 border-border'}`}
        >
            <div className="flex-grow overflow-hidden">
                <div className="flex items-center gap-2">
                    <p className="font-semibold truncate">{voice.name}</p>
                    {isSaved && <span className="text-[9px] bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded uppercase font-bold tracking-tighter flex-shrink-0">Đã lưu</span>}
                </div>
                <div className="text-xs opacity-80 flex flex-wrap gap-x-2 gap-y-1 mt-1">
                    {voice.labels.gender && <span>{voice.labels.gender}</span>}
                    {voice.labels.age && <span>{voice.labels.age}</span>}
                    {voice.labels.accent && <span className="truncate">{voice.labels.accent}</span>}
                </div>
            </div>
            <div className="flex items-center gap-1">
                <button onClick={handlePlayPreview} className="p-2 rounded-full hover:bg-white/20 transition-colors flex-shrink-0" title="Nghe thử">
                    <PlayIcon className={`w-5 h-5 ${isPlaying ? 'text-yellow-400' : ''}`} />
                </button>
                {onDelete && (
                    <button onClick={onDelete} className="p-2 rounded-full hover:bg-red-500/20 text-red-400 transition-colors flex-shrink-0" title="Xóa khỏi danh sách lưu">
                        <TrashIcon className="w-4 h-4" />
                    </button>
                )}
            </div>
            <audio ref={audioRef} src={voice.preview_url} preload="none" />
        </li>
    );
};

export const TtsModal: React.FC<TtsModalProps> = ({ 
    isOpen, 
    onClose, 
    voices, 
    isLoadingVoices, 
    onGenerate, 
    error,
    editableDialogue,
    setEditableDialogue,
    generationState,
    setGenerationState
}) => {
    const [selectedVoiceId, setSelectedVoiceId] = useState<string>('');
    const [customVoiceId, setCustomVoiceId] = useState<string>('');
    const [isFetchingCustomVoice, setIsFetchingCustomVoice] = useState(false);
    const [customVoiceData, setCustomVoiceData] = useState<ElevenlabsVoice | null>(null);
    const [savedVoices, setSavedVoices] = useState<ElevenlabsVoice[]>([]);
    
    useEffect(() => {
        const saved = localStorage.getItem('elevenlabs-custom-voices');
        if (saved) {
            try {
                setSavedVoices(JSON.parse(saved));
            } catch (e) {
                console.error("Lỗi khi tải danh sách giọng nói đã lưu", e);
            }
        }
    }, []);

    useEffect(() => {
        if(voices.length > 0 && !selectedVoiceId && !customVoiceId) {
            setSelectedVoiceId(voices[0].voice_id);
        }
    }, [voices, selectedVoiceId, customVoiceId]);

    if (!isOpen) return null;

    const handleFetchCustomVoice = async () => {
        const id = customVoiceId.trim();
        if (!id) return;

        setIsFetchingCustomVoice(true);
        setCustomVoiceData(null);
        try {
            const voice = await getElevenlabsVoiceById(id);
            setCustomVoiceData(voice);
            setSelectedVoiceId(voice.voice_id);
        } catch (err) {
            alert(err instanceof Error ? err.message : "Không thể tải thông tin giọng nói này.");
        } finally {
            setIsFetchingCustomVoice(false);
        }
    };

    const handleSaveCustomVoice = () => {
        if (!customVoiceData) return;
        
        if (savedVoices.some(v => v.voice_id === customVoiceData.voice_id)) {
            alert("Giọng nói này đã có trong danh sách lưu.");
            return;
        }

        const updated = [customVoiceData, ...savedVoices];
        setSavedVoices(updated);
        localStorage.setItem('elevenlabs-custom-voices', JSON.stringify(updated));
    };

    const handleDeleteSavedVoice = (e: React.MouseEvent, voiceId: string) => {
        e.stopPropagation();
        const updated = savedVoices.filter(v => v.voice_id !== voiceId);
        setSavedVoices(updated);
        localStorage.setItem('elevenlabs-custom-voices', JSON.stringify(updated));
        if (selectedVoiceId === voiceId) {
            setSelectedVoiceId(voices[0]?.voice_id || '');
        }
    };

    const handleGenerateForPart = async (partTitle: string) => {
        const finalVoiceId = selectedVoiceId || customVoiceId.trim();
        const textToSpeak = editableDialogue[partTitle];
        if (!finalVoiceId || !textToSpeak) return;

        setGenerationState(prev => ({
            ...prev,
            [partTitle]: { isLoading: true, audioUrl: null, duration: null, error: null }
        }));

        try {
            const url = await onGenerate(textToSpeak, finalVoiceId);
            
            const tempAudio = new Audio(url);
            tempAudio.onloadedmetadata = () => {
                setGenerationState(prev => ({
                    ...prev,
                    [partTitle]: { 
                        isLoading: false, 
                        audioUrl: url, 
                        duration: tempAudio.duration, 
                        error: null 
                    }
                }));
            };
        } catch (err) {
            setGenerationState(prev => ({
                ...prev,
                [partTitle]: { isLoading: false, audioUrl: null, duration: null, error: err instanceof Error ? err.message : 'Lỗi không xác định' }
            }));
        }
    };

    const handleDownloadSrt = (partTitle: string) => {
        const state = generationState[partTitle];
        const text = editableDialogue[partTitle];
        if (!state || !state.duration || !text) return;

        const srtContent = generateSrtContent(text, state.duration);
        const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${partTitle.replace(/\s+/g, '_')}.srt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // Fix: Explicitly cast values of generationState to TtsGenerationStatus[] to avoid 'unknown' type error
    const isAnyPartLoading = (Object.values(generationState) as TtsGenerationStatus[]).some(s => s.isLoading);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" onClick={onClose}>
        <div className="bg-secondary rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col border border-border" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-border">
                <div className="flex items-center gap-3">
                    <SpeakerWaveIcon className="w-6 h-6 text-accent"/>
                    <h2 className="text-xl font-bold text-accent">Chuyển kịch bản thành giọng nói (TTS)</h2>
                </div>
                <button onClick={onClose} className="text-text-secondary hover:text-text-primary text-2xl font-bold">&times;</button>
            </div>

            <div className="flex-grow p-6 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto">
                <div className="flex flex-col min-h-0">
                    <h3 className="text-lg font-semibold text-text-primary mb-3">1. Chọn một giọng đọc</h3>
                    
                    <div className="mb-4 bg-primary p-3 rounded-lg border border-border">
                        <label className="block text-xs font-bold text-text-secondary mb-2 uppercase tracking-wider flex items-center gap-2">
                            <KeyIcon className="w-3.5 h-3.5 text-accent"/>
                            Nhập Voice ID từ ElevenLabs
                        </label>
                        <div className="flex gap-2">
                            <input 
                                type="text"
                                value={customVoiceId}
                                onChange={(e) => setCustomVoiceId(e.target.value)}
                                className="flex-grow bg-secondary border border-border rounded-md p-2 text-text-primary text-sm focus:ring-1 focus:ring-accent outline-none font-mono"
                                placeholder="VD: pMsX7pD957... (Voice ID)"
                            />
                            <button
                                onClick={handleFetchCustomVoice}
                                disabled={isFetchingCustomVoice || !customVoiceId.trim()}
                                className="bg-accent/10 hover:bg-accent/20 text-accent font-bold px-3 py-2 rounded-md transition text-xs border border-accent/30 disabled:opacity-40"
                            >
                                {isFetchingCustomVoice ? '...' : 'Tải info'}
                            </button>
                        </div>
                        
                        {customVoiceData && (
                            <div className="mt-3 p-3 bg-secondary rounded-lg border border-accent/40 animate-in fade-in slide-in-from-top-2">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <p className="text-sm font-bold text-accent">{customVoiceData.name}</p>
                                        <div className="flex gap-2 mt-1">
                                            {Object.values(customVoiceData.labels).map((label, idx) => (
                                                <span key={idx} className="text-[10px] bg-primary px-1.5 py-0.5 rounded text-text-secondary">{label}</span>
                                            ))}
                                        </div>
                                    </div>
                                    <button 
                                        onClick={handleSaveCustomVoice}
                                        className="p-1.5 bg-accent text-white rounded-md hover:brightness-110 transition"
                                        title="Lưu giọng nói này"
                                    >
                                        <BookmarkIcon className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border/50">
                                    <p className="text-[10px] text-text-secondary italic">Nghe thử:</p>
                                    <audio controls src={customVoiceData.preview_url} className="h-6 w-full opacity-70"></audio>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex-grow bg-primary rounded-lg p-3 overflow-y-auto border border-border">
                        <div className="space-y-4">
                            {savedVoices.length > 0 && (
                                <div>
                                    <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <BookmarkIcon className="w-3 h-3"/>
                                        Giọng nói đã lưu
                                    </h4>
                                    <ul className="space-y-2">
                                        {savedVoices.map(voice => (
                                            <VoiceItem 
                                                key={`saved-${voice.voice_id}`}
                                                voice={voice}
                                                isSelected={selectedVoiceId === voice.voice_id}
                                                onSelect={() => setSelectedVoiceId(voice.voice_id)}
                                                isSaved
                                                onDelete={(e) => handleDeleteSavedVoice(e, voice.voice_id)}
                                            />
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div>
                                <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2">Danh sách hệ thống</h4>
                                {isLoadingVoices && <p className="text-center p-4 text-sm">Đang tải danh sách giọng nói...</p>}
                                {error && !isLoadingVoices && <p className="text-red-400 p-4 text-sm">{error}</p>}
                                <ul className="space-y-2">
                                    {voices.map(voice => (
                                        <VoiceItem 
                                            key={voice.voice_id}
                                            voice={voice}
                                            isSelected={selectedVoiceId === voice.voice_id}
                                            onSelect={() => {
                                                setSelectedVoiceId(voice.voice_id);
                                                setCustomVoiceId('');
                                            }}
                                        />
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col min-h-0">
                    <h3 className="text-lg font-semibold text-text-primary mb-3">2. Lời thoại & Kết quả</h3>
                    <div className="flex-grow bg-primary rounded-lg p-3 overflow-y-auto border border-border space-y-4">
                        {Object.entries(editableDialogue).map(([partTitle, text]) => {
                            const state = generationState[partTitle] || { isLoading: false, audioUrl: null, duration: null, error: null };
                            return (
                                <div key={partTitle} className="bg-secondary p-4 rounded-lg border border-border">
                                    <label className="block text-sm font-semibold text-text-primary mb-2 uppercase tracking-wide">{partTitle}</label>
                                    <textarea
                                        value={text}
                                        onChange={(e) => setEditableDialogue(prev => ({ ...prev, [partTitle]: e.target.value }))}
                                        className="w-full h-28 bg-primary border border-border rounded-md p-2 text-text-primary resize-y text-sm"
                                    />
                                    <button
                                        onClick={() => handleGenerateForPart(partTitle)}
                                        disabled={state.isLoading || isAnyPartLoading || (!selectedVoiceId && !customVoiceId.trim())}
                                        className="w-full mt-2 flex items-center justify-center bg-accent/80 hover:bg-accent text-white font-bold py-2 px-3 rounded-md transition disabled:opacity-50"
                                    >
                                        {state.isLoading ? 'Đang tạo audio...' : 'Tạo Audio'}
                                    </button>
                                    {state.audioUrl && (
                                        <div className="mt-3 space-y-2">
                                            <audio key={state.audioUrl} controls src={state.audioUrl} className="w-full h-10"></audio>
                                            <div className="grid grid-cols-2 gap-2">
                                                <a href={state.audioUrl} download={`${partTitle.replace(/\s+/g, '_')}.mp3`} className="flex items-center justify-center gap-2 text-[10px] bg-primary hover:bg-primary/50 text-text-secondary font-semibold py-2 px-3 rounded-md transition border border-border">
                                                    <DownloadIcon className="w-3.5 h-3.5"/>
                                                    Tải MP3
                                                </a>
                                                <button 
                                                    onClick={() => handleDownloadSrt(partTitle)}
                                                    className="flex items-center justify-center gap-2 text-[10px] bg-primary hover:bg-primary/50 text-accent font-semibold py-2 px-3 rounded-md transition border border-accent/30"
                                                >
                                                    <DownloadIcon className="w-3.5 h-3.5"/>
                                                    Tải phụ đề (.srt)
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    {state.error && <p className="text-red-400 text-xs mt-2 font-medium">LỖI: {state.error}</p>}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="p-4 border-t border-border flex justify-end items-center gap-4">
                <button onClick={onClose} className="bg-primary hover:bg-primary/70 text-text-secondary font-bold py-2 px-6 rounded-md transition border border-border">
                    Đóng
                </button>
            </div>
        </div>
      </div>
    );
};
