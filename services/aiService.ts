
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
            **NGÔN NGỮ KỊCH BẢN (NARRATION/DIALOGUE):** ${language}
            **NGÔN NGỮ CÁC NHÃN KỸ THUẬT (HEADERS, AUDIO CUES, VISUAL SUGGESTIONS):** Phải luôn là Tiếng Việt.

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

            **ĐỊNH DẠNG BẮT BUỘC:**
            **[TÊN PHẦN - BẰNG TIẾNG VIỆT]**
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
    const { title, outlineContent, targetAudience, wordCount, isDarkFrontiers } = params;
    const language = targetAudience;
    const prompt = `
        Bạn là chuyên gia biên kịch YouTube. Hãy tạo một dàn ý CHI TIẾT cho một video dài.
        Tiêu đề: "${title}"
        Ngôn ngữ nội dung: ${language}
        Ngôn ngữ tiêu đề phần và tóm tắt: Tiếng Việt.
        Độ dài mục tiêu: ${wordCount} từ.
        ${isDarkFrontiers ? "CHẾ ĐỘ: Dark Frontiers (Mở đầu, Khởi đầu, Vòng vây, Cao trào, Dấu vết)." : ""}
        
        YÊU CẦU:
        Chia kịch bản thành các PHẦN rõ ràng. Mỗi phần hãy trình bày theo định dạng:
        ## [Tên Phần]
        **Tóm tắt nội dung:** [1-2 câu tóm tắt những gì sẽ xảy ra trong phần này]
    `;

    try {
        const outline = await callApi(prompt, provider, model);
        return `### Dàn Ý Chi Tiết Cho Kịch Bản\n\nĐây là cấu trúc dự kiến cho video dài của bạn. Hãy nhấn nút "Bắt đầu tạo kịch bản đầy đủ" bên dưới để AI viết từng phần.\n\n---\n\n` + outline;
    } catch (error) {
        throw handleApiError(error, 'tạo dàn ý');
    }
};

export const parseOutlineIntoSegments = (outline: string): string[] => {
    // Splits by "## " which is the markdown header for sections
    const segments = outline.split(/## /).filter(s => s.trim() !== '' && !s.includes('### Dàn Ý'));
    return segments.map(s => '## ' + s.trim());
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

            **YÊU CẦU:**
            - Ngôn ngữ nội dung: ${targetAudience}
            - Ngôn ngữ nhãn (Cues Âm thanh, Gợi ý Hình ảnh...): Tiếng Việt
            - Phong cách: Dark Frontiers Horror (1st person POV, gritty, ominous).
            - Độ dài phần này: Khoảng ${Math.round(parseInt(wordCount) / 5)} từ.
            - Trình bày đầy đủ: Tên phần, Cues âm thanh, Lời thoại, Gợi ý hình ảnh.
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
