
import { GoogleGenAI, Type } from "@google/genai";
import type { GenerationParams, VisualPrompt, AllVisualPromptsResult, ScriptPartSummary, StyleOptions, TopicSuggestionItem, AiProvider, ElevenlabsVoice, Expression, SummarizeConfig, SceneSummary, ScenarioType } from '../types';
import { EXPRESSION_OPTIONS, STYLE_OPTIONS } from '../constants';
import { apiKeyManager } from './apiKeyManager';

/**
 * Internal helper to check if an error is related to API key failure.
 */
const isKeyFailureError = (error: any): boolean => {
    const msg = error?.message?.toLowerCase() || '';
    return msg.includes('api key') || msg.includes('invalid') || msg.includes('401') || msg.includes('403') || msg.includes('requested entity was not found');
};

/**
 * Internal helper for consistent error handling.
 */
const handleApiError = (error: any, action: string) => {
    console.error(`Error during ${action}:`, error);
    if (error instanceof Error) return error;
    return new Error(`Lỗi khi ${action}: ${error?.message || 'Không xác định'}`);
};

/**
 * Unified API caller for both Gemini and OpenAI providers.
 * Follows @google/genai guidelines for Gemini initialization and response handling.
 */
const callApi = async (prompt: string, provider: AiProvider, model: string): Promise<string> => {
    if (provider === 'gemini') {
        const { apiKey, releaseKey } = await apiKeyManager.getAvailableKey('gemini');
        try {
            // ALWAYS use the named parameter `apiKey`.
            // Use process.env.API_KEY as fallback if the manager returns empty.
            const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY || '' });
            
            // Use ai.models.generateContent directly with model name and prompt.
            const response = await ai.models.generateContent({
                model: model,
                contents: prompt,
            });
            
            // Use the .text property directly (do not call as a method).
            return response.text || '';
        } catch (error) {
            throw error;
        } finally {
            releaseKey();
        }
    } else if (provider === 'openai') {
        const { apiKey, releaseKey } = await apiKeyManager.getAvailableKey('openai');
        try {
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: [{ role: 'user', content: prompt }],
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error?.message || 'OpenAI API Error');
            return data.choices[0].message.content;
        } finally {
            releaseKey();
        }
    }
    throw new Error(`Provider ${provider} không được hỗ trợ.`);
};

/**
 * Validates whether an API key is functional for the given provider.
 */
export const validateApiKey = async (key: string, provider: AiProvider): Promise<boolean> => {
    if (provider === 'gemini') {
        try {
            const ai = new GoogleGenAI({ apiKey: key });
            await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: 'ping',
            });
            return true;
        } catch (e) {
            throw new Error("Gemini API Key không hợp lệ.");
        }
    } else if (provider === 'openai') {
        try {
            const res = await fetch('https://api.openai.com/v1/models', {
                headers: { 'Authorization': `Bearer ${key}` }
            });
            return res.ok;
        } catch (e) { return false; }
    } else if (provider === 'elevenlabs') {
        try {
            const res = await fetch('https://api.elevenlabs.io/v1/user', {
                headers: { 'xi-api-key': key }
            });
            return res.ok;
        } catch (e) { return false; }
    }
    return false;
};

export const generateScript = async (params: GenerationParams, provider: AiProvider, model: string): Promise<string> => {
    const { title, outlineContent, targetAudience, styleOptions, keywords, formattingOptions, wordCount, scriptType, numberOfSpeakers, isDarkFrontiers } = params;
    const { expression, style } = styleOptions;
    const language = targetAudience;

    let prompt: string;

    const outlineInstruction = outlineContent.trim() 
        ? `**Dàn ý / Các điểm chính (Quan trọng):** Mở rộng dựa trên: "${outlineContent}".`
        : `**Dàn ý / Các điểm chính (Quan trọng):** Xây dựng cấu trúc hợp lý dựa trên tiêu đề.`;

    if (isDarkFrontiers) {
        prompt = `
            Bạn là Content Officer cho kênh "Dark Frontiers", chuyên về **Kinh dị Dã sử (thế kỷ 19 - giữa thế kỷ 20)**. 
            Mục tiêu: Tạo ra một trải nghiệm **Audio Cinema** gieo rắc nỗi sợ hãi.

            **TIÊU ĐỀ CHÍNH:** "${title}"
            **CHÍNH SÁCH NGÔN NGỮ (BẮT BUỘC):**
            1. Lời dẫn chuyện (Narration) và Lời thoại (Dialogue): Phải dùng **${language}**.
            2. Tên các phần (Section Headers): Phải dùng **Tiếng Việt**.
            3. Chỉ dẫn âm thanh (Audio Cues): Phải dùng **Tiếng Việt**.
            4. Gợi ý hình ảnh (Visual Suggestions): Phải dùng **Tiếng Việt**.

            **CẤU TRÚC DARK FRONTIERS (BẮT BUỘC):**
            1. **PHẦN MỞ ĐẦU (THE HOOK):** Ngôi thứ 3. Khách quan, lạnh lùng. Tóm tắt kết cục bi thảm để tạo sự điềm báo.
            2. **SỰ KHỞI ĐẦU (THE SLOW BURN):** Chuyển sang ngôi thứ nhất (Người sống sót). Mô tả các dấu hiệu tinh tế: mùi kim loại lạ, sự im lặng bất thường.
            3. **VÒNG VÂY (THE SIEGE):** Thực thể vờn nạn nhân. Chiến tranh tâm lý. Những bóng ma di chuyển trong tầm mắt ngoại vi.
            4. **CAO TRÀO (THE CLIMAX):** Đối đầu trực tiếp hoặc trốn thoát kịch tính.
            5. **DẤU VẾT (THE SCAR):** Kết thúc u sầu, ám ảnh.

            **VOICE DNA:**
            - POV: Ngôi thứ nhất "Người sống sót" (trừ phần Hook).
            - TONE: Ominous, Gritty, Melancholic.
            - QUY TẮC: ĐỪNG nói "Tôi sợ". HÃY nói "Khẩu súng trong tay tôi cảm thấy vô dụng như một cành củi khô trước bóng tối".

            **ĐỊNH DẠNG TRÌNH BÀY:**
            ## [TÊN PHẦN - TIẾNG VIỆT]
            **Cues Âm thanh:** [Mô tả chi tiết âm thanh bằng Tiếng Việt]
            **Lời thoại / Dẫn chuyện (Bằng ${language}):** [Nội dung kịch bản]
            **Gợi ý Hình ảnh:** [Mô tả hình ảnh bằng Tiếng Việt, tập trung vào phong cách Sepia, Độ tương phản cao]

            **Độ dài:** Khoảng ${wordCount} từ.
            
            ${outlineInstruction}
            Từ khóa: "${keywords || 'Không có'}".
        `;
    } else if (scriptType === 'Podcast') {
        const speakersInstruction = numberOfSpeakers === 'Auto' ? '2-4 speakers' : `${numberOfSpeakers} speakers`;
        prompt = `Expert Podcast scriptwriter. Title: "${title}". Content in ${language}. Labels in Vietnamese. ${outlineInstruction}. Word count: ${wordCount}. ${speakersInstruction}.`;
    } else {
        prompt = `Expert YouTube scriptwriter. Title: "${title}". Content in ${language}. Labels/Cues in Vietnamese. ${outlineInstruction}. Word count: ${wordCount}. Style: ${style}, Expression: ${expression}. Format with HOOK, PROMISE, CONTENT, BIG REWARD, LINK.`;
    }

    try {
        return await callApi(prompt, provider, model);
    } catch (error) {
        throw handleApiError(error, 'tạo kịch bản');
    }
};

export const generateScriptOutline = async (params: GenerationParams, provider: AiProvider, model: string): Promise<string> => {
    const { title, targetAudience, wordCount, isDarkFrontiers } = params;
    const prompt = `
        Bạn là chuyên gia biên kịch YouTube. Hãy tạo một dàn ý CHI TIẾT cho một video dài.
        Tiêu đề: "${title}"
        Ngôn ngữ nội dung: ${targetAudience}
        Ngôn ngữ tiêu đề phần và tóm tắt: Tiếng Việt.
        Độ dài mục tiêu: ${wordCount} từ.
        ${isDarkFrontiers ? "CHẾ ĐỘ: Dark Frontiers (Mở đầu, Khởi đầu, Vòng vây, Cao trào, Dấu vết)." : ""}
        
        YÊU CẦU:
        Chia kịch bản thành các PHẦN rõ ràng (ít nhất 5 phần). Mỗi phần hãy trình bày theo định dạng:
        ## [Tên Phần]
        **Tóm tắt nội dung:** [1-2 câu tóm tắt những gì sẽ xảy ra trong phần này]
    `;

    try {
        const outline = await callApi(prompt, provider, model);
        return `### Dàn Ý Chi Tiết Cho Kịch Bản\n\nĐây là cấu trúc dự kiến cho video dài của bạn. Hãy nhấn nút **"Tạo kịch bản đầy đủ"** bên dưới để AI viết từng phần chi tiết.\n\n---\n\n` + outline;
    } catch (error) {
        throw handleApiError(error, 'tạo dàn ý');
    }
};

export const generateScriptPart = async (fullOutline: string, previousPartsScript: string, currentPartOutline: string, params: GenerationParams, provider: AiProvider, model: string): Promise<string> => {
    const { targetAudience, styleOptions, wordCount, isDarkFrontiers, title } = params;
    
    let prompt: string;
    if (isDarkFrontiers) {
        prompt = `
            Bạn đang viết PHẦN TIẾP THEO cho kịch bản "Dark Frontiers" có tiêu đề "${title}".
            
            **DÀN Ý TOÀN BỘ:** 
            ${fullOutline}

            **PHẦN BẠN CẦN VIẾT NGAY BÂY GIỜ:** 
            ${currentPartOutline}

            **BỐI CẢNH CÁC PHẦN TRƯỚC (NẾU CÓ):**
            ${previousPartsScript.slice(-1000)}

            **CHÍNH SÁCH NGÔN NGỮ:**
            1. Lời thoại/Dẫn chuyện: **${targetAudience}**.
            2. Audio Cues/Visual Suggestions/Headers: **Tiếng Việt**.

            **YÊU CẦU:**
            - Phong cách: Dark Frontiers Horror (1st person POV, gritty, ominous).
            - Trình bày đầy đủ: Tên phần, Cues âm thanh, Lời thoại, Gợi ý hình ảnh.
            - Độ dài phần này: Khoảng ${Math.round(parseInt(wordCount) / 5)} từ.
        `;
    } else {
        prompt = `Write the content for this specific part of a YouTube script titled "${title}". 
        Outline of this part: "${currentPartOutline}". 
        Full video structure: "${fullOutline}". 
        Content must be in ${targetAudience}. Metadata/Labels in Vietnamese. 
        Style: ${styleOptions.style}. Tone: ${styleOptions.expression}.`;
    }

    try {
        return await callApi(prompt, provider, model);
    } catch (error) {
        throw handleApiError(error, 'tạo phần kịch bản');
    }
};

export const generateTopicSuggestions = async (title: string, provider: AiProvider, model: string): Promise<TopicSuggestionItem[]> => {
    const prompt = `Based on the video title "${title}", suggest 5 unique YouTube video ideas. 
    Return a JSON array of objects with keys: title, vietnameseTitle, outline.`;
    try {
        const response = await callApi(prompt, provider, model);
        const cleaned = response.replace(/```json|```/g, '').trim();
        return JSON.parse(cleaned);
    } catch (e) {
        throw handleApiError(e, 'gợi ý chủ đề');
    }
};

export const reviseScript = async (script: string, revisionPrompt: string, params: any, provider: AiProvider, model: string): Promise<string> => {
    const prompt = `Revise this YouTube script based on: "${revisionPrompt}". 
    Script:
    ${script}`;
    try {
        return await callApi(prompt, provider, model);
    } catch (e) {
        throw handleApiError(e, 'sửa kịch bản');
    }
};

export const extractDialogue = async (script: string, provider: AiProvider, model: string): Promise<Record<string, string>> => {
    const prompt = `Extract spoken narration/dialogue from this script by section. 
    Format as JSON: { "Section Title": "Extracted Text" }.
    Script:
    ${script}`;
    try {
        const response = await callApi(prompt, provider, model);
        const cleaned = response.replace(/```json|```/g, '').trim();
        return JSON.parse(cleaned);
    } catch (e) {
        throw handleApiError(e, 'tách lời thoại');
    }
};

export const generateKeywordSuggestions = async (title: string, provider: AiProvider, model: string): Promise<string[]> => {
    const prompt = `Suggest 10 relevant SEO keywords for a video titled "${title}". Return as comma-separated list.`;
    try {
        const response = await callApi(prompt, provider, model);
        return response.split(',').map(k => k.trim());
    } catch (e) {
        throw handleApiError(e, 'gợi ý từ khóa');
    }
};

export const generateVisualPrompt = async (sceneDescription: string, provider: AiProvider, model: string): Promise<VisualPrompt> => {
    const prompt = `Generate a detailed visual AI prompt for this scene: "${sceneDescription}". 
    Return JSON: { "english": "...", "vietnamese": "..." }`;
    try {
        const response = await callApi(prompt, provider, model);
        const cleaned = response.replace(/```json|```/g, '').trim();
        return JSON.parse(cleaned);
    } catch (e) {
        throw handleApiError(e, 'tạo prompt hình ảnh');
    }
};

export const generateAllVisualPrompts = async (script: string, provider: AiProvider, model: string): Promise<AllVisualPromptsResult[]> => {
    const prompt = `Generate visual prompts for all major scenes in this script. 
    Return JSON array of { scene, english, vietnamese }.
    Script:
    ${script}`;
    try {
        const response = await callApi(prompt, provider, model);
        const cleaned = response.replace(/```json|```/g, '').trim();
        return JSON.parse(cleaned);
    } catch (e) {
        throw handleApiError(e, 'tạo tất cả prompt');
    }
};

export const summarizeScriptForScenes = async (script: string, config: SummarizeConfig, provider: AiProvider, model: string): Promise<ScriptPartSummary[]> => {
    const prompt = `Summarize the script into scenes based on config: ${JSON.stringify(config)}. 
    Return JSON matching ScriptPartSummary structure.
    Script:
    ${script}`;
    try {
        const response = await callApi(prompt, provider, model);
        const cleaned = response.replace(/```json|```/g, '').trim();
        return JSON.parse(cleaned);
    } catch (e) {
        throw handleApiError(e, 'tóm tắt kịch bản');
    }
};

export const suggestStyleOptions = async (title: string, provider: AiProvider, model: string): Promise<StyleOptions> => {
    const prompt = `Suggest best Expression and Style for title: "${title}". 
    Return JSON: { "expression": "...", "style": "..." }`;
    try {
        const response = await callApi(prompt, provider, model);
        const cleaned = response.replace(/```json|```/g, '').trim();
        return JSON.parse(cleaned);
    } catch (e) {
        throw handleApiError(e, 'gợi ý phong cách');
    }
};

export const parseIdeasFromFile = async (content: string, provider: AiProvider, model: string): Promise<TopicSuggestionItem[]> => {
    const prompt = `Extract video ideas from this text content. 
    Return JSON array of { title, outline }.
    Content:
    ${content}`;
    try {
        const response = await callApi(prompt, provider, model);
        const cleaned = response.replace(/```json|```/g, '').trim();
        return JSON.parse(cleaned);
    } catch (e) {
        throw handleApiError(e, 'phân tích file');
    }
};

export const getElevenlabsVoices = async (): Promise<ElevenlabsVoice[]> => {
    const { apiKey, releaseKey } = await apiKeyManager.getAvailableKey('elevenlabs');
    try {
        const res = await fetch('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': apiKey } });
        const data = await res.json();
        return data.voices || [];
    } finally {
        releaseKey();
    }
};

export const generateElevenlabsTts = async (text: string, voiceId: string): Promise<string> => {
    const { apiKey, releaseKey } = await apiKeyManager.getAvailableKey('elevenlabs');
    try {
        const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'xi-api-key': apiKey },
            body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2' })
        });
        const blob = await res.blob();
        return URL.createObjectURL(blob);
    } finally {
        releaseKey();
    }
};

export const scoreScript = async (script: string, provider: AiProvider, model: string): Promise<string> => {
    const prompt = `Provide a professional score (1-100) and feedback for this script.
    Script:
    ${script}`;
    try {
        return await callApi(prompt, provider, model);
    } catch (e) {
        throw handleApiError(e, 'chấm điểm kịch bản');
    }
};

export const generateSingleVideoPrompt = async (scene: SceneSummary, config: SummarizeConfig, provider: AiProvider, model: string): Promise<string> => {
    const prompt = `Generate a video prompt for this scene: "${scene.summary}". Scenario: ${config.scenarioType}.`;
    try {
        return await callApi(prompt, provider, model);
    } catch (e) {
        throw handleApiError(e, 'tạo prompt video');
    }
};

export const parseOutlineIntoSegments = (outline: string): string[] => {
    return outline.split(/(?=^## .*?$)/m).filter(s => s.trim() !== '' && !s.includes('### Dàn Ý'));
};
