
import React, { useState, useEffect, useRef } from 'react';
import type { ElevenlabsVoice } from '../types';
import { DownloadIcon } from './icons/DownloadIcon';
import { PlayIcon } from './icons/PlayIcon';
import { SpeakerWaveIcon } from './icons/SpeakerWaveIcon';

interface TtsModalProps {
  isOpen: boolean;
  onClose: () => void;
  dialogue: Record<string, string> | null;
  voices: ElevenlabsVoice[];
  isLoadingVoices: boolean;
  onGenerate: (text: string, voiceId: string) => Promise<string>;
  error: string | null;
}

type GenerationStatus = {
    isLoading: boolean;
    audioUrl: string | null;
    error: string | null;
};

const VoiceItem: React.FC<{voice: ElevenlabsVoice, isSelected: boolean, onSelect: () => void}> = ({ voice, isSelected, onSelect }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    const handlePlayPreview = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            } else {
                // Pause all other previews
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
            <div className="flex-grow">
                <p className="font-semibold">{voice.name}</p>
                <div className="text-xs opacity-80 flex flex-wrap gap-x-2 gap-y-1 mt-1">
                    {voice.labels.gender && <span>{voice.labels.gender}</span>}
                    {voice.labels.age && <span>{voice.labels.age}</span>}
                    {voice.labels.accent && <span>{voice.labels.accent}</span>}
                </div>
            </div>
            <button onClick={handlePlayPreview} className="p-2 rounded-full hover:bg-white/20 transition-colors flex-shrink-0" aria-label={`Nghe thử giọng ${voice.name}`}>
                <PlayIcon className={`w-5 h-5 ${isPlaying ? 'text-yellow-400' : ''}`} />
            </button>
            <audio ref={audioRef} src={voice.preview_url} preload="none" />
        </li>
    );
};


export const TtsModal: React.FC<TtsModalProps> = ({ isOpen, onClose, dialogue, voices, isLoadingVoices, onGenerate, error }) => {
    const [selectedVoiceId, setSelectedVoiceId] = useState<string>('');
    const [editableDialogue, setEditableDialogue] = useState<Record<string, string>>({});
    const [generationState, setGenerationState] = useState<Record<string, GenerationStatus>>({});

    useEffect(() => {
        if(voices.length > 0 && !selectedVoiceId) {
            setSelectedVoiceId(voices[0].voice_id);
        }
    }, [voices, selectedVoiceId]);

    useEffect(() => {
        if (isOpen && dialogue) {
            setEditableDialogue(dialogue);
            setGenerationState({}); // Reset state when modal opens
        }
    }, [isOpen, dialogue]);
    
    if (!isOpen) return null;

    const handleTextChange = (partTitle: string, newText: string) => {
        setEditableDialogue(prev => ({ ...prev, [partTitle]: newText }));
    };

    const handleGenerateForPart = async (partTitle: string) => {
        if (!selectedVoiceId || !editableDialogue[partTitle]) return;

        // Fix: Explicitly type 'prev' to prevent it from being inferred as 'unknown' in complex scopes
        setGenerationState((prev: Record<string, GenerationStatus>) => ({
            ...prev,
            [partTitle]: { isLoading: true, audioUrl: null, error: null }
        }));

        try {
            const audioUrl = await onGenerate(editableDialogue[partTitle], selectedVoiceId);
            setGenerationState((prev: Record<string, GenerationStatus>) => ({
                ...prev,
                [partTitle]: { isLoading: false, audioUrl, error: null }
            }));
        } catch (caughtError) {
            // Fix: The caught error object is of type 'unknown'. We must check if it's an
            // instance of Error before accessing properties like 'message' to avoid a runtime crash.
            // Also explicitly type 'prev' to avoid 'isLoading' does not exist on type 'unknown' error.
            setGenerationState((prev: Record<string, GenerationStatus>) => ({
                ...prev,
                [partTitle]: { isLoading: false, audioUrl: null, error: caughtError instanceof Error ? caughtError.message : 'Lỗi không xác định' }
            }));
        }
    };

    // Fix: Explicitly type the item in some() to avoid 'isLoading' does not exist on type 'unknown' during Object.values() iteration
    const isAnyPartLoading = Object.values(generationState).some((s: GenerationStatus) => s.isLoading);

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
                {/* Left: Voice Selection */}
                <div className="flex flex-col min-h-0">
                    <h3 className="text-lg font-semibold text-text-primary mb-3">1. Chọn một giọng đọc</h3>
                    <div className="flex-grow bg-primary rounded-lg p-3 overflow-y-auto border border-border">
                        {isLoadingVoices && <p className="text-center p-4">Đang tải danh sách giọng nói...</p>}
                        {error && !isLoadingVoices && <p className="text-red-400 p-4">{error}</p>}
                        {voices.length > 0 && (
                            <ul className="space-y-2">
                                {voices.map(voice => (
                                    <VoiceItem 
                                        key={voice.voice_id}
                                        voice={voice}
                                        isSelected={selectedVoiceId === voice.voice_id}
                                        onSelect={() => setSelectedVoiceId(voice.voice_id)}
                                    />
                                ))}
                            </ul>
                        )}
                        {!isLoadingVoices && voices.length === 0 && !error && <p className="text-center p-4">Không tìm thấy giọng nói. Vui lòng kiểm tra API key ElevenLabs của bạn.</p>}
                    </div>
                </div>
                {/* Right: Text and Player */}
                <div className="flex flex-col min-h-0">
                    <h3 className="text-lg font-semibold text-text-primary mb-3">2. Lời thoại & Kết quả</h3>
                    <div className="flex-grow bg-primary rounded-lg p-3 overflow-y-auto border border-border space-y-4">
                        {!dialogue && !error && (
                             <div className="text-center text-text-secondary p-8">
                                <p>Không có lời thoại để chuyển đổi.</p>
                                <p className="text-sm mt-1">Vui lòng tạo kịch bản và sử dụng công cụ "Tách voice" trước.</p>
                             </div>
                        )}
                        {Object.entries(editableDialogue).map(([partTitle, text]) => {
                            const state = generationState[partTitle] || { isLoading: false, audioUrl: null, error: null };
                            return (
                                <div key={partTitle} className="bg-secondary p-3 rounded-lg border border-border">
                                    <label className="block text-sm font-semibold text-text-primary mb-2">{partTitle}</label>
                                    <textarea
                                        value={text}
                                        onChange={(e) => handleTextChange(partTitle, e.target.value)}
                                        className="w-full h-28 bg-primary border border-border rounded-md p-2 text-text-primary resize-y text-sm"
                                    />
                                    <button
                                        onClick={() => handleGenerateForPart(partTitle)}
                                        disabled={!selectedVoiceId || state.isLoading || isAnyPartLoading || !text}
                                        className="w-full mt-2 flex items-center justify-center bg-accent/80 hover:bg-accent text-white font-bold py-2 px-3 rounded-md transition disabled:opacity-50"
                                    >
                                        {state.isLoading ? (
                                             <>
                                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                <span>Đang tạo...</span>
                                             </>
                                        ) : (
                                            'Tạo Audio'
                                        )}
                                    </button>
                                    {state.audioUrl && (
                                        <div className="mt-3 space-y-2">
                                            <audio controls src={state.audioUrl} className="w-full h-10"></audio>
                                            <a href={state.audioUrl} download={`${partTitle.replace(/\s/g, '_')}.mp3`} className="flex items-center justify-center gap-2 w-full text-xs bg-primary hover:bg-primary/50 text-text-secondary font-semibold py-1.5 px-3 rounded-md transition border border-border">
                                                <DownloadIcon className="w-4 h-4"/>
                                                Tải xuống
                                            </a>
                                        </div>
                                    )}
                                    {state.error && <p className="text-red-400 text-xs mt-2">{state.error}</p>}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="p-4 border-t border-border flex justify-end items-center gap-4 flex-wrap">
                {(isAnyPartLoading || isLoadingVoices) && <div className="flex-grow text-sm text-accent">Đang xử lý, vui lòng chờ...</div>}
                <div className="flex-grow"></div>
                <button onClick={onClose} className="bg-secondary/70 hover:bg-secondary text-text-secondary font-bold py-2 px-4 rounded-md transition border border-border">
                    Đóng
                </button>
            </div>
        </div>
      </div>
    );
};
