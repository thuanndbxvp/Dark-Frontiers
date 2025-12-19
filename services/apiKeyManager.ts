
import type { AiProvider } from '../types';

interface KeyRequest {
    resolve: (value: { apiKey: string; releaseKey: () => void }) => void;
    reject: (reason?: any) => void;
}

class ApiKeyManager {
    private allKeys: Map<AiProvider, string[]> = new Map();
    private activeKeys: Map<AiProvider, Set<string>> = new Map();
    private waitingQueue: Map<AiProvider, KeyRequest[]> = new Map();

    constructor() {
        this.allKeys.set('gemini', []);
        this.allKeys.set('openai', []);
        this.allKeys.set('elevenlabs', []);
        this.activeKeys.set('gemini', new Set());
        this.activeKeys.set('openai', new Set());
        this.activeKeys.set('elevenlabs', new Set());
        this.waitingQueue.set('gemini', []);
        this.waitingQueue.set('openai', []);
        this.waitingQueue.set('elevenlabs', []);
    }

    public updateKeys(newKeys: Record<AiProvider, string[]>) {
        for (const provider of Object.keys(newKeys) as AiProvider[]) {
            this.allKeys.set(provider, newKeys[provider] || []);
        }
        // Sau khi cập nhật key, xử lý các tác vụ đang chờ
        this.allKeys.forEach((_, provider) => this.processQueue(provider));
    }

    public getAvailableKey(provider: AiProvider): Promise<{ apiKey: string; releaseKey: () => void }> {
        return new Promise((resolve, reject) => {
            const request: KeyRequest = { resolve, reject };
            const providerQueue = this.waitingQueue.get(provider);
            if (providerQueue) {
                providerQueue.push(request);
                this.processQueue(provider);
            } else {
                reject(new Error(`Provider ${provider} không được hỗ trợ.`));
            }
        });
    }

    /**
     * Báo cáo key bị lỗi (hết quota, sai key...).
     * Key lỗi sẽ bị đẩy xuống cuối danh sách để key tiếp theo được ưu tiên.
     */
    public reportError(provider: AiProvider, failedKey: string) {
        const keys = this.allKeys.get(provider) || [];
        if (keys.includes(failedKey)) {
            // Đẩy key lỗi xuống cuối mảng
            const filtered = keys.filter(k => k !== failedKey);
            const updated = [...filtered, failedKey];
            this.allKeys.set(provider, updated);

            // Cập nhật lại localStorage để thay đổi có hiệu lực lâu dài
            try {
                const savedApiKeys = localStorage.getItem('ai-api-keys');
                if (savedApiKeys) {
                    const parsed = JSON.parse(savedApiKeys);
                    parsed[provider] = updated;
                    localStorage.setItem('ai-api-keys', JSON.stringify(parsed));
                }
            } catch (e) {
                console.error("Lỗi khi cập nhật localStorage trong reportError", e);
            }

            // Phát sự kiện thông báo key đã được xoay
            window.dispatchEvent(new CustomEvent('apiKeyRotated', { 
                detail: { provider, failedKey } 
            }));
        }
    }

    private processQueue(provider: AiProvider) {
        const queue = this.waitingQueue.get(provider);
        if (!queue || queue.length === 0) {
            return;
        }

        const availableKey = this.findAvailableKey(provider);

        if (availableKey) {
            const request = queue.shift();
            if (request) {
                this.activeKeys.get(provider)?.add(availableKey);

                const releaseKey = () => {
                    this.activeKeys.get(provider)?.delete(availableKey);
                    // Xử lý mục tiếp theo trong hàng đợi sau khi giải phóng key
                    this.processQueue(provider);
                };

                request.resolve({ apiKey: availableKey, releaseKey });
            }
        } else if ((this.allKeys.get(provider) || []).length === 0) {
            // Nếu không có key nào, từ chối tất cả các yêu cầu đang chờ
            while (queue.length > 0) {
                const request = queue.shift();
                request?.reject(new Error(`Không tìm thấy API Key cho ${provider}. Vui lòng thêm key.`));
            }
        }
    }

    private findAvailableKey(provider: AiProvider): string | null {
        const allProviderKeys = this.allKeys.get(provider) || [];
        const activeProviderKeys = this.activeKeys.get(provider) || new Set();

        if (allProviderKeys.length === 0) {
            return null;
        }

        for (const key of allProviderKeys) {
            if (!activeProviderKeys.has(key)) {
                return key;
            }
        }
        return null;
    }
}

export const apiKeyManager = new ApiKeyManager();
