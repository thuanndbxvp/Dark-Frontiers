
import { GoogleGenAI, Type } from "@google/genai";
import type { GenerationParams, VisualPrompt, AllVisualPromptsResult, ScriptPartSummary, StyleOptions, TopicSuggestionItem, AiProvider, ElevenlabsVoice, Expression, SummarizeConfig, SceneSummary, ScenarioType } from '../types';
import { EXPRESSION_OPTIONS, STYLE_OPTIONS } from '../constants';
import { apiKeyManager } from './apiKeyManager';

/**
 * Helper to extract JSON from AI response that might contain conversational text.
 */
const cleanJsonResponse = (text: string): string => {
    // Try to find content inside triple backticks
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
    if (jsonMatch) return jsonMatch[1].trim();
    
    // Fallback: try to find the first [ or { and last ] or }
    const firstBracket = text.indexOf('[');
    const firstBrace = text.indexOf('{');
    const start = (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) ? firstBracket : firstBrace;
    
    const lastBracket = text.lastIndexOf(']');
    const lastBrace = text.lastIndexOf('}');
    const end = Math.max(lastBracket, lastBrace);
    
    if (start !== -1 && end !== -1 && end > start) {
        return text.substring(start, end + 1).trim();
    }
    
    return text.trim();
};

const handleApiError = (error: any, action: string) => {
    console.error(`Error during ${action}:`, error);
    if (error instanceof Error) return error;
    return new Error(`Lỗi khi ${action}: ${error?.message || 'Không xác định'}`);
};

const callApi = async (prompt: string, provider: AiProvider, model: string): Promise<string> => {
    if (provider === 'gemini') {
        const { apiKey, releaseKey } = await apiKeyManager.getAvailableKey('gemini');
        try {
            const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY || '' });
            const response = await ai.models.generateContent({
                model: model,
                contents: prompt,
            });
            return response.text || '';
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

const DARK_FRONTIERS_DNA = `
Bạn là Content Officer cho kênh "Dark Frontiers", chuyên gia về Kinh dị Dã sử (Historical Fiction Horror).
TRIẾT LÝ NỘI DUNG: "Chúng ta bán Nỗi sợ về những điều chưa biết núp bóng dưới vỏ bọc Lịch sử."

1. ĐỊNH HƯỚNG NỘI DUNG: Niche: Sự kiện/Địa điểm có thật + Cryptids = Ác mộng.
2. PHONG CÁCH & GIỌNG KỂ (AUDIO CINEMA): "Show, Don't Tell". Ominous, Gritty, Melancholic.
3. QUY TẮC CẤU TRÚC (BẮT BUỘC): 
   - Phải chia kịch bản thành 5 phần rõ ràng.
   - MỖI PHẦN BẮT BUỘC PHẢI CÓ TIÊU ĐỀ bắt đầu bằng ký tự '## ' (Ví dụ: ## THE HOOK, ## THE SLOW BURN...).
   - Tuyệt đối không gộp chung các phần.
4. QUY TẮC KỊCH BẢN SẠCH: Chỉ trả về văn bản kể chuyện, không chỉ dẫn kỹ thuật [SFX], [Visual] hay [Audio].
`;

const SOCIAL_REALISM_TEMPLATE = `19th century social realism painting style, dark historical realism.
Muted sepia, brown and dirty earth tones, very low saturation.
Rough painterly oil painting texture, visible brush strokes, aged canvas surface.
Imperfect anatomy, weathered skin, signs of hardship and poverty.
Flat, natural light, no cinematic lighting, no dramatic rim light.
Somber, heavy atmosphere, quiet suffering, human fragility.
Old illustration and engraving influence, documentary feeling, raw and unpolished.
No beauty idealization, no fine art photography look. No modern aesthetics.
Aspect ratio 16:9.
[INSERT IMAGE CONTENT HERE]`;

export const generateScript = async (params: GenerationParams, provider: AiProvider, model: string): Promise<string> => {
    const { title, outlineContent, targetAudience, wordCount, isDarkFrontiers } = params;
    
    let prompt: string;
    if (isDarkFrontiers) {
        prompt = `${DARK_FRONTIERS_DNA}
        HÃY VIẾT KỊCH BẢN SẠCH CHO VIDEO: "${title}"
        NGÔN NGỮ: ${targetAudience}
        ĐỘ ĐÀI MỤC TIÊU: ${wordCount} từ.
        DÀN Ý GỢI Ý: ${outlineContent || 'Tự động xây dựng kịch bản kinh dị dã sử kịch tính.'}

        YÊU CẦU ĐỊNH DẠNG NGHIÊM NGẶT:
        - Sử dụng cấu trúc 5 giai đoạn của Dark Frontiers.
        - Mỗi phần PHẢI bắt đầu bằng tiêu đề dòng riêng biệt dạng: ## [TÊN PHẦN].
        - Nội dung kịch bản phải SẠCH hoàn toàn (chỉ có lời thoại/lời dẫn).`;
    } else {
        prompt = `Viết kịch bản YouTube về "${title}". 
        Ngôn ngữ: ${targetAudience}. Độ dài: ${wordCount} từ. 
        YÊU CẦU: Chia phần rõ ràng bằng tiêu đề '## ', loại bỏ chỉ dẫn kỹ thuật. KỊCH BẢN SẠCH.`;
    }
    
    try { return await callApi(prompt, provider, model); } catch (error) { throw handleApiError(error, 'tạo kịch bản'); }
};

export const generateScriptOutline = async (params: GenerationParams, provider: AiProvider, model: string): Promise<string> => {
    const { title, targetAudience, wordCount, isDarkFrontiers } = params;
    
    let prompt: string;
    if (isDarkFrontiers) {
        prompt = `${DARK_FRONTIERS_DNA}
        Tạo dàn ý chi tiết 5 phần (Hook, Slow Burn, Siege, Climax, Scar) cho "${title}".
        Mỗi phần trong dàn ý PHẢI bắt đầu bằng dòng: ## [Tên phần]
        Ngôn ngữ: ${targetAudience}. 
        Mô tả ngắn gọn nội dung từng phần dưới mỗi tiêu đề ##.`;
    } else {
        prompt = `Tạo dàn ý YouTube cho "${title}". Ngôn ngữ: Tiếng Việt. 
        BẮT BUỘC: Mỗi phần phải bắt đầu bằng '## [Tên phần]'.`;
    }
    
    try {
        const outline = await callApi(prompt, provider, model);
        return `### Dàn Ý Chi Tiết (Chuẩn bị tạo kịch bản sạch cho TTS)\n\n` + outline;
    } catch (error) { throw handleApiError(error, 'tạo dàn ý'); }
};

export const generateScriptPart = async (fullOutline: string, previousPartsScript: string, currentPartOutline: string, params: GenerationParams, provider: AiProvider, model: string): Promise<string> => {
    const { targetAudience, wordCount, isDarkFrontiers, title } = params;
    const estPartWords = Math.round(parseInt(wordCount) / 5);
    
    let prompt: string;
    if (isDarkFrontiers) {
        prompt = `${DARK_FRONTIERS_DNA}
        VIẾT TIẾP PHẦN KỊCH BẢN: "${title}"
        DÀN Ý TỔNG: ${fullOutline}
        PHẦN HIỆN TẠI CẦN VIẾT: ${currentPartOutline}
        NỘI DUNG ĐÃ VIẾT TRƯỚC ĐÓ: ${previousPartsScript.slice(-2000)}

        YÊU CẦU:
        - BẮT BUỘC bắt đầu văn bản trả về bằng đúng tiêu đề phần có trong dàn ý (Ví dụ: ## THE HOOK).
        - Độ dài: Khoảng ${estPartWords} từ.
        - Ngôn ngữ: ${targetAudience}.
        - KỊCH BẢN SẠCH 100%, không rác kỹ thuật.`;
    } else {
        prompt = `Viết tiếp phần này cho kịch bản "${title}". 
        Dàn ý phần: ${currentPartOutline}. Ngôn ngữ: ${targetAudience}. 
        BẮT BUỘC: Bắt đầu bằng tiêu đề '## '. KỊCH BẢN SẠCH.`;
    }
    
    try { return await callApi(prompt, provider, model); } catch (error) { throw handleApiError(error, 'tạo phần kịch bản'); }
};

export const generateTopicSuggestions = async (title: string, provider: AiProvider, model: string): Promise<TopicSuggestionItem[]> => {
    const prompt = `Dựa trên "${title}", gợi ý 5 ý tưởng video YouTube kinh dị dã sử. Trả về JSON: { title, vietnameseTitle, outline }.`;
    try {
        const response = await callApi(prompt, provider, model);
        return JSON.parse(cleanJsonResponse(response));
    } catch (e) { throw handleApiError(e, 'gợi ý chủ đề'); }
};

export const reviseScript = async (script: string, revisionPrompt: string, params: any, provider: AiProvider, model: string): Promise<string> => {
    const prompt = `Chỉnh sửa kịch bản sau theo yêu cầu: "${revisionPrompt}". 
    Đảm bảo KỊCH BẢN SẠCH và duy trì cấu trúc phần ## cũ nếu có thể. 
    DNA Dark Frontiers.\nKịch bản:\n${script}`;
    try { return await callApi(prompt, provider, model); } catch (e) { throw handleApiError(e, 'sửa kịch bản'); }
};

export const extractDialogue = async (script: string, provider: AiProvider, model: string): Promise<Record<string, string>> => {
    const prompt = `Trích xuất lời dẫn chuyện SẠCH từ kịch bản sau. Trả về JSON: { "Tên phần": "Nội dung lời thoại" }.\nKỊCH BẢN:\n${script}`;
    try {
        const response = await callApi(prompt, provider, model);
        return JSON.parse(cleanJsonResponse(response));
    } catch (e) { throw handleApiError(e, 'tách lời thoại'); }
};

export const generateKeywordSuggestions = async (title: string, provider: AiProvider, model: string): Promise<string[]> => {
    const prompt = `Gợi ý 10 từ khóa SEO YouTube cho video "${title}". Dấu phẩy ngăn cách.`;
    try {
        const response = await callApi(prompt, provider, model);
        return response.split(',').map(k => k.trim());
    } catch (e) { throw handleApiError(e, 'gợi ý từ khóa'); }
};

export const generateVisualPrompt = async (sceneDescription: string, provider: AiProvider, model: string): Promise<VisualPrompt[]> => {
    const prompt = `Dựa trên kịch bản sau, hãy tạo ra 4 prompt hình ảnh chi tiết.
    Mỗi prompt PHẢI tuân thủ cấu trúc sau:
    ${SOCIAL_REALISM_TEMPLATE}
    TRẢ VỀ JSON: [ { "english": "FULL_PROMPT_HERE", "vietnamese": "Mô tả ngắn" }, ... ]
    KỊCH BẢN: "${sceneDescription}"`;
    try {
        const response = await callApi(prompt, provider, model);
        return JSON.parse(cleanJsonResponse(response));
    } catch (e) { throw handleApiError(e, 'tạo prompt hình ảnh'); }
};

export const generateAllVisualPrompts = async (script: string, provider: AiProvider, model: string): Promise<AllVisualPromptsResult[]> => {
    const prompt = `Tạo prompts hình ảnh cho các cảnh chính trong kịch bản này. JSON array: { scene, english, vietnamese }. Sử dụng template Dark Social Realism.`;
    try {
        const response = await callApi(prompt, provider, model);
        return JSON.parse(cleanJsonResponse(response));
    } catch (e) { throw handleApiError(e, 'tạo tất cả prompt'); }
};

export const summarizeScriptForScenes = async (script: string, config: SummarizeConfig, provider: AiProvider, model: string): Promise<ScriptPartSummary[]> => {
    const prompt = `Phân tích kịch bản sau và chia thành các cảnh quay chi tiết.
    SỐ LƯỢNG CẢNH: ${config.numberOfPrompts === 'auto' ? 'Tự động dựa trên độ dài' : config.numberOfPrompts}.
    ${config.includeNarration ? 'Bao gồm trích dẫn lời bình trong mỗi cảnh.' : ''}
    
    YÊU CẦU:
    1. Chia kịch bản thành các Phần (Part).
    2. Mỗi phần gồm danh sách Cảnh (Scenes).
    3. Với mỗi cảnh, viết tóm tắt nội dung và một Image Prompt (Tiếng Anh) theo phong cách:
    ---
    ${SOCIAL_REALISM_TEMPLATE}
    ---
    4. Trả về DUY NHẤT một chuỗi JSON hợp lệ theo định dạng mảng ScriptPartSummary:
    [
      {
        "partTitle": "Tên phần",
        "scenes": [
          { "sceneNumber": 1, "summary": "Tóm tắt", "imagePrompt": "Full MJ prompt with template applied", "videoPrompt": "Prompt chưa được tạo." }
        ]
      }
    ]

    KỊCH BẢN:
    ${script}`;

    try {
        const response = await callApi(prompt, provider, model);
        const cleaned = cleanJsonResponse(response);
        return JSON.parse(cleaned);
    } catch (e) {
        throw handleApiError(e, 'tóm tắt kịch bản');
    }
};

export const suggestStyleOptions = async (title: string, provider: AiProvider, model: string): Promise<StyleOptions> => {
    const prompt = `Gợi ý Expression và Style cho kịch bản "${title}". JSON: { "expression": "...", "style": "..." }`;
    try {
        const response = await callApi(prompt, provider, model);
        return JSON.parse(cleanJsonResponse(response));
    } catch (e) { throw handleApiError(e, 'gợi ý phong cách'); }
};

export const parseIdeasFromFile = async (content: string, provider: AiProvider, model: string): Promise<TopicSuggestionItem[]> => {
    const prompt = `Trích xuất ý tưởng video từ văn bản này. JSON array: { title, outline }.`;
    try {
        const response = await callApi(prompt, provider, model);
        return JSON.parse(cleanJsonResponse(response));
    } catch (e) { throw handleApiError(e, 'phân tích file'); }
};

export const getElevenlabsVoices = async (): Promise<ElevenlabsVoice[]> => {
    const { apiKey, releaseKey } = await apiKeyManager.getAvailableKey('elevenlabs');
    try {
        const res = await fetch('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': apiKey } });
        const data = await res.json();
        return data.voices || [];
    } finally { releaseKey(); }
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
    } finally { releaseKey(); }
};

export const scoreScript = async (script: string, provider: AiProvider, model: string): Promise<string> => {
    const prompt = `Chấm điểm (1-100) dựa trên DNA Dark Frontiers và nhận xét kịch bản này.`;
    try { return await callApi(prompt, provider, model); } catch (e) { throw handleApiError(e, 'chấm điểm kịch bản'); }
};

export const generateSingleVideoPrompt = async (scene: SceneSummary, config: SummarizeConfig, provider: AiProvider, model: string): Promise<string> => {
    const prompt = `Tạo video prompt (Tiếng Anh) cho cảnh này: "${scene.summary}".`;
    try { return await callApi(prompt, provider, model); } catch (e) { throw handleApiError(e, 'tạo prompt video'); }
};

export const parseOutlineIntoSegments = (outline: string): string[] => {
    return outline.split(/(?=^## .*?$)/m).filter(s => s.trim() !== '' && !s.includes('### Dàn Ý'));
};
