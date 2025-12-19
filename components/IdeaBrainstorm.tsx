import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Chat } from "@google/genai";
import type { ChatMessage, AiProvider } from '../types';
import { SparklesIcon } from './icons/SparklesIcon';
import { SendIcon } from './icons/SendIcon';

const getApiKey = (provider: AiProvider): string => {
    const keysJson = localStorage.getItem('ai-api-keys');
    if (!keysJson) {
        throw new Error("Không tìm thấy API Key. Vui lòng thêm API Key bằng nút 'API'.");
    }
    try {
        const keys: Record<AiProvider, string[]> = JSON.parse(keysJson);
        const providerKeys = keys[provider];
        if (!Array.isArray(providerKeys) || providerKeys.length === 0) {
            throw new Error(`Không tìm thấy API Key cho ${provider}. Vui lòng thêm key.`);
        }
        return providerKeys[0]; // Use the first key
    } catch (e) {
        console.error("Lỗi lấy API key:", e);
        throw new Error("Không thể đọc API Key. Dữ liệu có thể bị hỏng.");
    }
}

interface IdeaBrainstormProps {
    setTitle: (title: string) => void;
    setOutlineContent: (content: string) => void;
    aiProvider: AiProvider;
    selectedModel: string;
}

export const IdeaBrainstorm: React.FC<IdeaBrainstormProps> = ({ setTitle, setOutlineContent, aiProvider, selectedModel }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([
        { role: 'model', content: 'Chào bạn! Bạn đang muốn tìm ý tưởng cho video về chủ đề gì?' }
    ]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const chatRef = useRef<Chat | null>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const isMounted = useRef(true);

    const initializeChat = useCallback(() => {
        if (aiProvider !== 'gemini') {
            chatRef.current = null;
            if (isMounted.current) setError(null);
            return;
        }
        try {
            const apiKey = getApiKey('gemini');
            const ai = new GoogleGenAI({ apiKey });
            chatRef.current = ai.chats.create({
                model: selectedModel,
                config: {
                    systemInstruction: 'You are a creative assistant for a Vietnamese YouTuber. Your goal is to help the user brainstorm and refine their video ideas through a friendly, encouraging conversation. Ask clarifying questions. When you propose a clear, actionable video idea, you MUST format it strictly as follows, with the title on the first line and the outline on the second:\n**[Idea]: Tiêu đề video ở đây**\nNội dung phác họa cho tiêu đề đó.'
                }
            });
            if (isMounted.current) setError(null);
        } catch (e) {
            if (isMounted.current) setError(e instanceof Error ? e.message : "Could not start chat. Check API Key.");
        }
    }, [aiProvider, selectedModel]);
    
    useEffect(() => {
        isMounted.current = true;
        // Reset chat history when component opens or provider changes
        if (isOpen) {
            setMessages([{ role: 'model', content: 'Chào bạn! Bạn đang muốn tìm ý tưởng cho video về chủ đề gì?' }]);
            initializeChat();
        }
        return () => { isMounted.current = false };
    }, [initializeChat, isOpen, aiProvider]);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userInput.trim() || isLoading) return;

        const newUserMessage: ChatMessage = { role: 'user', content: userInput };
        const currentMessages = [...messages, newUserMessage];

        if (isMounted.current) {
            setMessages(currentMessages);
            setUserInput('');
            setIsLoading(true);
            setError(null);
        } else {
            return;
        }

        const systemPrompt = 'You are a creative assistant for a Vietnamese YouTuber. Your goal is to help the user brainstorm and refine their video ideas through a friendly, encouraging conversation. Ask clarifying questions. When you propose a clear, actionable video idea, you MUST format it strictly as follows, with the title on the first line and the outline on the second:\n**[Idea]: Tiêu đề video ở đây**\nNội dung phác họa cho tiêu đề đó.';

        try {
            let modelResponseText: string;
            
            if (aiProvider === 'gemini') {
                if (!chatRef.current) {
                    initializeChat();
                    if (!chatRef.current) {
                        throw new Error("Failed to reconnect chat session. Please check your Gemini API key.");
                    }
                }
                const response = await chatRef.current.sendMessage({ message: userInput });
                modelResponseText = response.text;
            } else { // OpenAI
                const apiKey = getApiKey('openai');
                const messagesForApi = [
                    { role: 'system', content: systemPrompt },
                    ...currentMessages.slice(1).map(m => ({ role: m.role === 'model' ? 'assistant' : 'user', content: m.content }))
                ];
                
                const res = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: selectedModel,
                        messages: messagesForApi,
                    })
                });
                
                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.error?.message || 'Unknown OpenAI error');
                }
                modelResponseText = data.choices[0].message.content;
            }

            const modelResponse: ChatMessage = { role: 'model', content: modelResponseText };
            if (isMounted.current) {
                setMessages(prev => [...prev, modelResponse]);
            }
        } catch (err) {
            if (isMounted.current) {
                 const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
                 setError(errorMessage);
                 setMessages(prev => [...prev, { role: 'model', content: `Xin lỗi, đã có lỗi xảy ra: ${errorMessage}` }]);
            }
        } finally {
            if (isMounted.current) setIsLoading(false);
        }
    };
    
    const handleUseIdea = (content: string) => {
        const lines = content.split('\n');
        const titleLine = lines.find(line => line.includes('**[Idea]:'));
        
        if (titleLine) {
            const titleMatch = titleLine.match(/\*\*\[Idea\]: (.*?)\*\*/);
            const ideaTitle = titleMatch ? titleMatch[1].trim() : '';

            // The rest of the content is the outline
            const outline = lines.filter(line => !line.includes('**[Idea]:')).join('\n').trim();

            setTitle(ideaTitle);
            setOutlineContent(outline);
            setIsOpen(false);
        }
    };

    return (
        <div className="mt-2 bg-secondary rounded-lg border border-border">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-center items-center gap-2 p-3"
                aria-expanded={isOpen}
            >
                <SparklesIcon className="w-5 h-5 text-accent"/>
                <span className="font-semibold text-text-primary">Brainstorm Ý Tưởng với AI</span>
                <svg className={`w-5 h-5 text-text-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {isOpen && (
                <div className="border-t border-border p-3">
                    <div ref={chatContainerRef} className="max-h-64 overflow-y-auto pr-2 space-y-4 mb-3">
                        {messages.map((msg, index) => (
                           <div key={index} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                                {msg.role === 'model' && <SparklesIcon className="w-6 h-6 p-1 bg-accent text-white rounded-full flex-shrink-0" />}
                                <div className={`max-w-[85%] rounded-lg px-3 py-2 ${msg.role === 'model' ? 'bg-primary text-text-primary' : 'bg-accent text-white'}`}>
                                    <p className="text-sm" dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*\[Idea\]: (.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br />') }} />
                                    {msg.role === 'model' && msg.content.includes('[Idea]:') && (
                                        <button onClick={() => handleUseIdea(msg.content)} className="text-xs mt-2 bg-secondary hover:bg-primary/50 text-text-secondary px-2 py-1 rounded">
                                            Dùng ý tưởng này
                                        </button>
                                    )}
                                </div>
                           </div>
                        ))}
                         {isLoading && (
                            <div className="flex items-end gap-2">
                                <SparklesIcon className="w-6 h-6 p-1 bg-accent text-white rounded-full flex-shrink-0 animate-pulse" />
                                <div className="max-w-[85%] rounded-lg px-3 py-2 bg-primary">
                                    <div className="flex items-center space-x-1">
                                        <div className="w-2 h-2 bg-text-secondary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                        <div className="w-2 h-2 bg-text-secondary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                        <div className="w-2 h-2 bg-text-secondary rounded-full animate-bounce"></div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
                    <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                        <input
                            type="text"
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            placeholder="Nhập chủ đề..."
                            className="w-full bg-primary border border-border rounded-md p-2 text-text-primary focus:ring-2 focus:ring-accent focus:border-accent transition text-sm"
                            disabled={isLoading}
                        />
                        <button type="submit" disabled={isLoading || !userInput.trim()} className="bg-accent hover:brightness-110 text-white p-2 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed">
                            <SendIcon className="w-5 h-5"/>
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};