
import { GoogleGenAI, Type } from "@google/genai";
import type { GenerationParams, VisualPrompt, AllVisualPromptsResult, ScriptPartSummary, StyleOptions, TopicSuggestionItem, AiProvider, ElevenlabsVoice, Expression, SummarizeConfig, SceneSummary, ScenarioType } from '../types';
import { EXPRESSION_OPTIONS, STYLE_OPTIONS } from '../constants';
import { apiKeyManager } from './apiKeyManager';

// Helper function to detect if an error is related to API key failure
const isKeyFailureError = (error: unknown, provider: AiProvider): boolean => {
    if (!(error instanceof Error)) return false;

    const lowerCaseMessage = error.message.toLowerCase();
    
    if (provider === 'gemini') {
        return lowerCaseMessage.includes('api key not valid') || 
               lowerCaseMessage.includes('resource_exhausted') || 
               lowerCaseMessage.includes('429');
    }
    if (provider === 'openai') {
        return lowerCaseMessage.includes('invalid_api_key') || 
               lowerCaseMessage.includes('insufficient_quota');
    }
    if (provider === 'elevenlabs') {
        return lowerCaseMessage.includes('unauthorized');
    }
    return false;
};

// Helper function to handle API errors and provide more specific messages
const handleApiError = (error: unknown, context: string): Error => {
    console.error(`Lỗi trong lúc ${context}:`, error);

    if (!(error instanceof Error)) {
        return new Error(`Không thể ${context}. Đã xảy ra lỗi không xác định.`);
    }

    const errorMessage = error.message;
    const lowerCaseErrorMessage = errorMessage.toLowerCase();

    // Check for common network or client-side errors first
    if (lowerCaseErrorMessage.includes('failed to fetch')) {
        return new Error('Lỗi mạng. Vui lòng kiểm tra kết nối internet của bạn và thử lại.');
    }
    if (lowerCaseErrorMessage.includes('failed to execute') && lowerCaseErrorMessage.includes('on \'headers\'')) {
        return new Error('Lỗi yêu cầu mạng: API key có thể chứa ký tự không hợp lệ.');
    }

    // Gemini-specific error parsing
    try {
        const jsonStartIndex = errorMessage.indexOf('{');
        if (jsonStartIndex > -1) {
            const jsonString = errorMessage.substring(jsonStartIndex);
            const errorObj = JSON.parse(jsonString);
            if (errorObj.error) {
                const apiError = errorObj.error;
                if (apiError.code === 429 || apiError.status === 'RESOURCE_EXHAUSTED') {
                    return new Error('Bạn đã vượt quá giới hạn yêu cầu (Quota) của Gemini.');
                }
                return new Error(`Lỗi từ Gemini: ${apiError.message || JSON.stringify(apiError)}`);
            }
        }
    } catch (e) { /* Fall through */ }
    
    // Generic fallback
    return new Error(`Không thể ${context}. Chi tiết: ${errorMessage}`);
};

export const validateApiKey = async (apiKey: string, provider: AiProvider): Promise<boolean> => {
    if (!apiKey) throw new Error("API Key không được để trống.");
    try {
        if (provider === 'gemini') {
            const ai = new GoogleGenAI({ apiKey });
            // Using Gemini 3 Flash for fast validation
            await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: 'test' });
        } else if (provider === 'openai') {
            const response = await fetch('https://api.openai.com/v1/models', {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(JSON.stringify(errorData));
            }
        } else if (provider === 'elevenlabs') {
            const response = await fetch('https://api.elevenlabs.io/v1/user', {
                headers: { 'xi-api-key': apiKey }
            });
             if (!response.ok) {
                const errorData = await response.json();
                throw new Error(JSON.stringify(errorData));
            }
        }
        return true;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.toLowerCase().includes('resource_exhausted') || errorMessage.toLowerCase().includes('429')) {
             return true; 
        }
        throw handleApiError(error, `xác thực API key ${provider}`);
    }
};

const callApi = async (prompt: string, provider: AiProvider, model: string, jsonResponse = false): Promise<string> => {
    const { apiKey, releaseKey } = await apiKeyManager.getAvailableKey(provider);
    try {
        if (provider === 'gemini') {
            const ai = new GoogleGenAI({ apiKey });
            const response = await ai.models.generateContent({
                model: model,
                contents: prompt,
                ...(jsonResponse && { config: { responseMimeType: "application/json" } })
            });
            return response.text;
        } else { // openai
            const body: any = {
                model: model,
                messages: [{ role: 'system', content: prompt }],
                max_tokens: 4096,
            };
            if (jsonResponse) {
                body.response_format = { type: 'json_object' };
            }
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(body)
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(JSON.stringify(data));
            }
            return data.choices[0].message.content;
        }
    } catch (error) {
         if (isKeyFailureError(error, provider)) {
            const keys: Record<AiProvider, string[]> = JSON.parse(localStorage.getItem('ai-api-keys') || '{}');
            const providerKeys = keys[provider] || [];
            if (providerKeys.length > 1) {
                const failedKey = providerKeys.shift();
                if (failedKey) providerKeys.push(failedKey);
                localStorage.setItem('ai-api-keys', JSON.stringify(keys));
                apiKeyManager.updateKeys(keys);
                window.dispatchEvent(new CustomEvent('apiKeyRotated', { detail: { provider } }));
            }
        }
        throw error;
    } finally {
        releaseKey();
    }
}

export const generateScript = async (params: GenerationParams, provider: AiProvider, model: string): Promise<string> => {
    const { title, outlineContent, targetAudience, styleOptions, keywords, formattingOptions, wordCount, scriptParts, scriptType, numberOfSpeakers, isDarkFrontiers } = params;
    const { expression, style } = styleOptions;
    const language = targetAudience;

    let prompt: string;

    const outlineInstruction = outlineContent.trim() 
        ? `**User's Outline / Key Points (Crucial):** Expand upon: "${outlineContent}".`
        : `**User's Outline / Key Points (Crucial):** Build a logical structure based on the title.`;

    if (isDarkFrontiers) {
        prompt = `
            You are the Chief Content Officer for "Dark Frontiers", a YouTube channel specializing in **Historical Fiction Horror (1800s - 1950s)**. 
            Your goal is to create an **Audio Cinema Experience** that sells the "Fear of the Unknown".

            **PRIMARY TITLE:** "${title}"
            **TARGET LANGUAGE:** ${language}

            **THE DARK FRONTIERS FORMULA (NON-NEGOTIABLE STRUCTURE):**
            1. **THE HOOK (0-1 min):** Narrated in 3rd person. Objective, cold warning. Summarize the tragic end immediately to create dread.
            2. **THE SLOW BURN:** Switch to 1st person POV (The Survivor). Use "Show, Don't Tell". Describe subtle signs: a strange metallic smell, an unnatural silence, the feeling of eyes on the back of the neck.
            3. **THE SIEGE:** The monster/entity toys with the victim. Psychological warfare. Mimicry of voices, shadows moving in peripheral vision. Tension builds to a breaking point.
            4. **THE CLIMAX:** Direct confrontation or a narrow, terrifying escape. High sensory detail (breath on the neck, freezing air).
            5. **THE SCAR (Conclusion):** The survivor is permanently changed. A melancholic, haunting ending.

            **VOICE DNA:**
            - POV: 1st person "Survivor" (except the Hook).
            - TONE: Ominous, Gritty, Melancholic.
            - RULE: NEVER say "I was scared". INSTEAD, say "The rifle in my hands felt like a useless twig against the blackness" or "The cold wasn't just in the air; it was a blade pressing against my heart."

            **AUDIO STRATEGY (MANDATORY CUES):**
            Integrate soundscape cues like: [Wind howling through pines], [Metronome-like dripping], [Heavy, wet footsteps], [Sudden silence], [Whispers in a language that shouldn't exist].

            **ERA SETTING:** Strictly 1800s - 1950s. No modern tech. Only lanterns, bolt-action rifles, horses, or early radio/telegraphs.

            **SCRIPT FORMAT:**
            **[SECTION NAME]**
            **(Timestamp)**
            **Audio Cues:** [Detailed soundscape instructions]
            **Dialogue (Survivor's POV):** [Atmospheric, gritty narration]
            **Visual Suggestions:** [AI Image/Video prompt-style descriptions focusing on Sepia, High-Contrast, Scale]

            **Length:** Approximately ${wordCount} words.
            **Language:** Entirely in ${language}. Translate the title if necessary.
            
            ${outlineInstruction}
            Keywords to integrate: "${keywords || 'None'}".

            Generate the Dark Frontiers masterpiece now.
        `;
    } else if (scriptType === 'Podcast') {
        const speakersInstruction = numberOfSpeakers === 'Auto' ? '2-4 speakers' : `${numberOfSpeakers} speakers`;
        prompt = `Expert Podcast scriptwriter. Title: "${title}". Language: ${language}. ${outlineInstruction}. Word count: ${wordCount}. ${speakersInstruction}. Include names, intro/outro cues, and clear segments. Format in ${language}.`;
    } else {
        prompt = `Expert YouTube scriptwriter. "Addictive Video Formula". Title: "${title}". Language: ${language}. ${outlineInstruction}. Word count: ${wordCount}. Style: ${style}, Expression: ${expression}. Format with HOOK, PROMISE, CONTENT, BIG REWARD, LINK. Include visual cues and dialogue in ${language}.`;
    }

    try {
        return await callApi(prompt, provider, model);
    } catch (error) {
        throw handleApiError(error, 'tạo kịch bản');
    }
};

export const generateScriptOutline = async (params: GenerationParams, provider: AiProvider, model: string): Promise<string> => {
    const { title, outlineContent, targetAudience, wordCount, isDarkFrontiers } = params;
    const language = targetAudience;
    const prompt = `
        Expert YouTube scriptwriter. Generate a detailed outline for a long-form video.
        Title: "${title}"
        Language: ${language}
        Target Length: ${wordCount} words.
        ${isDarkFrontiers ? "MODE: Dark Frontiers Horror strategy (Hook, Slow Burn, Siege, Climax, Scar)." : ""}
        Break into logical segments with key talking points. Use markdown.
    `;

    try {
        const outline = await callApi(prompt, provider, model);
        return `### Dàn Ý Chi Tiết Cho Kịch Bản\n\n---\n\n` + outline;
    } catch (error) {
        throw handleApiError(error, 'tạo dàn ý');
    }
};

export const generateTopicSuggestions = async (theme: string, provider: AiProvider, model: string): Promise<TopicSuggestionItem[]> => {
    if (!theme.trim()) return [];
    const prompt = `Based on theme "${theme}", generate 5 specific YouTube ideas. Output JSON: {"suggestions": [{"title": "...", "outline": "..."}]}. Language: Vietnamese.`;

    try {
        const responseText = await callApi(prompt, provider, model, true);
        return JSON.parse(responseText).suggestions;
    } catch (error) {
        throw handleApiError(error, 'tạo gợi ý chủ đề');
    }
};

export const parseIdeasFromFile = async (fileContent: string, provider: AiProvider, model: string): Promise<TopicSuggestionItem[]> => {
    if (!fileContent.trim()) return [];
    const prompt = `Parse idea blocks into JSON array: [{"title": "...", "vietnameseTitle": "...", "outline": "..."}]. Extract original title, VN title, and outline. Return ONLY JSON array. Text: """${fileContent}"""`;
    
    try {
        const responseText = await callApi(prompt, provider, model, true);
        return JSON.parse(responseText);
    } catch (error) {
        throw handleApiError(error, 'phân tích tệp ý tưởng');
    }
};

export const generateKeywordSuggestions = async (title: string, outlineContent: string, provider: AiProvider, model: string): Promise<string[]> => {
    const prompt = `Generate 5 SEO keywords for title "${title}". Output JSON: {"keywords": ["...", "..."]}. Language: Vietnamese.`;
    try {
        const responseText = await callApi(prompt, provider, model, true);
        return JSON.parse(responseText).keywords;
    } catch (error) {
        throw handleApiError(error, 'tạo gợi ý từ khóa');
    }
};

export const reviseScript = async (originalScript: string, revisionInstruction: string, params: GenerationParams, provider: AiProvider, model: string): Promise<string> => {
    const prompt = `Editor role. Revise script based on request: "${revisionInstruction}". Original: """${originalScript}""". Target words: ${params.wordCount}. Language: ${params.targetAudience}. Keep ${params.isDarkFrontiers ? 'Dark Frontiers horror' : 'original'} style. Return full revised script.`;
    try {
        return await callApi(prompt, provider, model);
    } catch (error) {
        throw handleApiError(error, 'sửa kịch bản');
    }
};

export const generateScriptPart = async (fullOutline: string, previousPartsScript: string, currentPartOutline: string, params: Omit<GenerationParams, 'title' | 'outlineContent'>, provider: AiProvider, model: string): Promise<string> => {
    const { targetAudience, styleOptions, wordCount, isDarkFrontiers } = params;
    const prompt = `Write part for outline segment: "${currentPartOutline}". Context: ${fullOutline}. Previous text: """${previousPartsScript}""". Language: ${targetAudience}. Style: ${isDarkFrontiers ? 'Dark Frontiers Horror' : styleOptions.style}. Target words for this part: ${Math.round(parseInt(wordCount) / 5)}. Return ONLY content.`;
    try {
        return await callApi(prompt, provider, model);
    } catch (error) {
        throw handleApiError(error, 'tạo phần kịch bản');
    }
};

export const extractDialogue = async (script: string, language: string, provider: AiProvider, model: string): Promise<Record<string, string>> => {
    const prompt = `Extract spoken dialogue for TTS. Remove all cues/labels. Output JSON: {"Section Name": "Dialogue Text"}. Language: ${language}. Script: """${script}"""`;
    try {
        const responseText = await callApi(prompt, provider, model, true);
        return JSON.parse(responseText);
    } catch (error) {
        throw handleApiError(error, 'tách lời thoại');
    }
};

export const generateVisualPrompt = async (sceneDescription: string, provider: AiProvider, model: string): Promise<VisualPrompt> => {
    const prompt = `Create descriptive visual prompt in English and VN translation for image generator. Focus on mood, lighting, style. JSON: {"english": "...", "vietnamese": "..."}. Input: """${sceneDescription}"""`;
    try {
        const responseText = await callApi(prompt, provider, model, true);
        return JSON.parse(responseText);
    } catch (error) {
        throw handleApiError(error, 'tạo prompt hình ảnh');
    }
};

export const generateAllVisualPrompts = async (script: string, provider: AiProvider, model: string): Promise<AllVisualPromptsResult[]> => {
    const prompt = `For each section in script, generate English and VN visual prompts. Output JSON array: [{"scene": "...", "english": "...", "vietnamese": "..."}]. Script: """${script}"""`;
    try {
        const responseText = await callApi(prompt, provider, model, true);
        return JSON.parse(responseText);
    } catch (error) {
        throw handleApiError(error, 'tạo tất cả prompt');
    }
};

export const summarizeScriptForScenes = async (script: string, provider: AiProvider, model: string, config: SummarizeConfig): Promise<ScriptPartSummary[]> => {
    const { scenarioType } = config;
    const prompt = `Summarize script into visual scenes. Type: ${scenarioType}. Script: """${script}"""`;
    // Specialized scenarios use standard generation logic but with specialized instructions in summarizeScriptForScenes in actual implementation
    try {
        return parseVisualSceneAssistantOutput(await callApi(prompt, provider, model));
    } catch (error) {
        throw handleApiError(error, 'chuyển thể kịch bản');
    }
};

function parseVisualSceneAssistantOutput(responseText: string): ScriptPartSummary[] {
    const scenes: SceneSummary[] = [];
    const actualSceneBlocks = responseText.split(/(?=\*\*\[?(?:CẢNH QUAY|CẢNH|SCENE)\s*\d+\]?\*\*)/i).filter(block => /\*\*\[?(?:CẢNH QUAY|CẢNH|SCENE)\s*\d+\]?\*\*/i.test(block));
    actualSceneBlocks.forEach((block, i) => {
        const contentMatch = block.match(/(?:\* *)?\*\*(?:Phân tích kịch bản|Analysis|Script Analysis):\*\*\s*([\s\S]*?)\s*(?:\* *)?\*\*(?:Prompt Tạo hình ảnh\/Video|Prompt|Image\/Video Prompt):\*\*\s*([\s\S]*)/i);
        if (contentMatch) {
            scenes.push({ sceneNumber: i + 1, summary: contentMatch[1].trim(), imagePrompt: contentMatch[2].trim(), videoPrompt: contentMatch[2].trim() });
        }
    });
    return scenes.length > 0 ? [{ partTitle: "Visual Storyboard", scenes }] : [];
}

export const suggestStyleOptions = async (title: string, outlineContent: string, provider: AiProvider, model: string): Promise<StyleOptions> => {
    const prompt = `Suggest Expression and Style for title "${title}" from standard lists. JSON: {"expression": "...", "style": "..."}.`;
    try {
        const responseText = await callApi(prompt, provider, model, true);
        return JSON.parse(responseText);
    } catch (error) {
        throw handleApiError(error, 'gợi ý phong cách');
    }
};

export const scoreScript = async (script: string, title: string, provider: AiProvider, model: string): Promise<string> => {
    const prompt = `Expert review. Score script on scale 10 across 5 categories. Markdown format. Title: "${title}". Script: """${script}"""`;
    try {
        return await callApi(prompt, provider, model);
    } catch (error) {
        throw handleApiError(error, 'chấm điểm kịch bản');
    }
};

export const getElevenlabsVoices = async (): Promise<ElevenlabsVoice[]> => {
    const { apiKey, releaseKey } = await apiKeyManager.getAvailableKey('elevenlabs');
    try {
        const response = await fetch('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': apiKey } });
        return (await response.json()).voices;
    } catch (error) {
        throw handleApiError(error, 'lấy giọng nói');
    } finally {
        releaseKey();
    }
}

export const generateElevenlabsTts = async (text: string, voiceId: string): Promise<string> => {
    const { apiKey, releaseKey } = await apiKeyManager.getAvailableKey('elevenlabs');
    try {
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'xi-api-key': apiKey, 'accept': 'audio/mpeg' },
            body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2' })
        });
        if (!response.ok) throw new Error(await response.text());
        return URL.createObjectURL(await response.blob());
    } catch (error) {
        throw handleApiError(error, 'tạo âm thanh');
    } finally {
        releaseKey();
    }
}

export const generateSingleVideoPrompt = async (sceneSummary: string, scenarioType: ScenarioType, provider: AiProvider, model: string): Promise<string> => {
    const prompt = `Create detailed video prompt for scene summary: "${sceneSummary}". Type: ${scenarioType}. English only.`;
    try {
        return await callApi(prompt, provider, model);
    } catch (error) {
        throw handleApiError(error, 'tạo prompt video');
    }
};
