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
        // After updating keys, process any waiting tasks
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
                    // Process the next item in the queue after releasing a key
                    this.processQueue(provider);
                };

                request.resolve({ apiKey: availableKey, releaseKey });
            }
        } else if ((this.allKeys.get(provider) || []).length === 0) {
            // If there are no keys at all, reject all waiting promises for this provider
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
