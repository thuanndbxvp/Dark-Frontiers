import React, { useRef } from 'react';
import type { LibraryItem } from '../types';
import { TrashIcon } from './icons/TrashIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { UploadIcon } from './icons/UploadIcon';

interface LibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  library: LibraryItem[];
  onLoad: (item: LibraryItem) => void;
  onDelete: (id: number) => void;
  onExport: () => void;
  onImport: (fileContent: string) => void;
}

const formatDate = (timestamp?: number) => {
  if (!timestamp) return '';
  try {
    const date = new Date(timestamp);
    // Format to HH:mm:ss - dd/MM/yyyy
    const timeString = date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    const dateString = date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    return `${timeString} - ${dateString}`;
  } catch (e) {
    console.error("Invalid timestamp for formatting:", timestamp);
    return 'Invalid date';
  }
};


export const LibraryModal: React.FC<LibraryModalProps> = ({ isOpen, onClose, library, onLoad, onDelete, onExport, onImport }) => {
  const importInputRef = useRef<HTMLInputElement>(null);
  
  if (!isOpen) return null;

  const handleImportClick = () => {
    importInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const content = e.target?.result as string;
        onImport(content);
    };
    reader.onerror = () => {
        alert("Lỗi khi đọc file.");
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset input to allow re-uploading the same file
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center"
      onClick={onClose}
    >
        <input 
            type="file" 
            ref={importInputRef} 
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
        />
      <div 
        className="bg-secondary rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col border border-border"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-border flex-wrap gap-2">
            <h2 className="text-xl font-bold text-accent">Thư viện Kịch bản</h2>
            <div className="flex items-center gap-2">
                 <button 
                    onClick={handleImportClick} 
                    className="flex items-center gap-2 text-xs bg-primary hover:bg-secondary/70 text-text-secondary px-3 py-1.5 rounded-md transition border border-border"
                >
                    <UploadIcon className="w-4 h-4" />
                    <span>Import</span>
                </button>
                 <button 
                    onClick={onExport}
                    disabled={library.length === 0}
                    className="flex items-center gap-2 text-xs bg-primary hover:bg-secondary/70 text-text-secondary px-3 py-1.5 rounded-md transition border border-border disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <DownloadIcon className="w-4 h-4" />
                    <span>Export</span>
                </button>
                <button onClick={onClose} className="text-text-secondary hover:text-text-primary text-2xl leading-none">&times;</button>
            </div>
        </div>
        <div className="p-6 overflow-y-auto">
          {library.length === 0 ? (
            <p className="text-center text-text-secondary">Thư viện của bạn đang trống.</p>
          ) : (
            <ul className="space-y-4">
              {library.map(item => (
                <li key={item.id} className="bg-secondary p-4 rounded-lg flex justify-between items-start gap-4 border border-border hover:border-accent/50 transition-colors">
                  <div className="flex-grow">
                    <h3 className="font-semibold text-text-primary">{item.title}</h3>
                    <p className="text-sm text-text-secondary mt-1 line-clamp-2">{item.outlineContent}</p>
                    <p className="text-xs text-text-secondary/60 mt-2 font-mono">{formatDate(item.savedAt)}</p>
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-2">
                    <button onClick={() => onLoad(item)} className="text-xs bg-accent hover:brightness-110 text-white font-bold py-1 px-3 rounded-md transition">Tải</button>
                    <button onClick={() => onDelete(item.id)} className="text-xs bg-red-600 hover:bg-red-500 text-white font-bold p-1 rounded-md transition" aria-label="Xóa">
                        <TrashIcon className="w-4 h-4"/>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};