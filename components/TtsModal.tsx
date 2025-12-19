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

interface GenerationStatus {
    isLoading: boolean;
    audioUrl: string | null;
    error: string | null;
}

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
            <button onClick={handlePlayPreview} className="p-2 rounded-full hover:bg-white/20 transition-colors flex-shrink-0">
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
            setGenerationState({});
        }
    }, [isOpen, dialogue]);
    
    if (!isOpen) return null;

    const handleGenerateForPart = async (partTitle: string) => {
        if (!selectedVoiceId || !editableDialogue[partTitle]) return;

        setGenerationState(prev => ({
            ...prev,
            [partTitle]: { isLoading: true, audioUrl: null, error: null }
        }));

        try {
            const url = await onGenerate(editableDialogue[partTitle], selectedVoiceId);
            setGenerationState(prev => ({
                ...prev,
                [partTitle]: { isLoading: false, audioUrl: url, error: null }
            }));
        } catch (err) {
            setGenerationState(prev => ({
                ...prev,
                [partTitle]: { isLoading: false, audioUrl: null, error: err instanceof Error ? err.message : 'Lỗi không xác định' }
            }));
        }
    };

    // Fix: Explicitly cast the result of Object.values to GenerationStatus[] to fix the TypeScript 'unknown' type error.
    const isAnyPartLoading = (Object.values(generationState) as GenerationStatus[]).some(s => s.isLoading);

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
                    <div className="flex-grow bg-primary rounded-lg p-3 overflow-y-auto border border-border">
                        {isLoadingVoices && <p className="text-center p-4">Đang tải danh sách giọng nói...</p>}
                        {error && !isLoadingVoices && <p className="text-red-400 p-4">{error}</p>}
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
                    </div>
                </div>

                <div className="flex flex-col min-h-0">
                    <h3 className="text-lg font-semibold text-text-primary mb-3">2. Lời thoại & Kết quả</h3>
                    <div className="flex-grow bg-primary rounded-lg p-3 overflow-y-auto border border-border space-y-4">
                        {Object.entries(editableDialogue).map(([partTitle, text]) => {
                            const state = generationState[partTitle] || { isLoading: false, audioUrl: null, error: null };
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
                                        disabled={state.isLoading || isAnyPartLoading || !selectedVoiceId}
                                        className="w-full mt-2 flex items-center justify-center bg-accent/80 hover:bg-accent text-white font-bold py-2 px-3 rounded-md transition disabled:opacity-50"
                                    >
                                        {state.isLoading ? 'Đang tạo audio...' : 'Tạo Audio'}
                                    </button>
                                    {state.audioUrl && (
                                        <div className="mt-3 space-y-2">
                                            {/* Thêm key={state.audioUrl} để bắt buộc tải lại khi có file mới */}
                                            <audio key={state.audioUrl} controls src={state.audioUrl} className="w-full h-10"></audio>
                                            <a href={state.audioUrl} download={`${partTitle}.mp3`} className="flex items-center justify-center gap-2 w-full text-xs bg-primary hover:bg-primary/50 text-text-secondary font-semibold py-2 px-3 rounded-md transition border border-border">
                                                <DownloadIcon className="w-4 h-4"/>
                                                Tải xuống file MP3
                                            </a>
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
