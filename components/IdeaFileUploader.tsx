import React, { useRef } from 'react';
import { UploadIcon } from './icons/UploadIcon';

interface IdeaFileUploaderProps {
    onParse: (content: string) => void;
    isLoading: boolean;
    error: string | null;
}

export const IdeaFileUploader: React.FC<IdeaFileUploaderProps> = ({ onParse, isLoading, error }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleButtonClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            onParse(content);
        };
        reader.onerror = () => {
            console.error("Error reading file");
        };
        reader.readAsText(file);

        // Reset the input value to allow uploading the same file again
        event.target.value = '';
    };

    return (
        <div className="mt-2">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".txt"
                className="hidden"
            />
            <button
                onClick={handleButtonClick}
                disabled={isLoading}
                className="w-full flex items-center justify-center bg-secondary hover:bg-secondary/70 disabled:bg-secondary/40 disabled:cursor-not-allowed text-text-secondary font-semibold py-2 px-4 rounded-lg transition border border-border"
            >
                {isLoading ? (
                    <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Đang phân tích...</span>
                    </>
                ) : (
                    <>
                        <UploadIcon className="w-5 h-5 mr-2" />
                        <span>Tải lên File Ý tưởng (.txt)</span>
                    </>
                )}
            </button>
            {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
        </div>
    );
};