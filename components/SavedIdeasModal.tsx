import React from 'react';
import type { SavedIdea } from '../types';
import { TrashIcon } from './icons/TrashIcon';
import { LightbulbIcon } from './icons/LightbulbIcon';

interface SavedIdeasModalProps {
  isOpen: boolean;
  onClose: () => void;
  ideas: SavedIdea[];
  onLoad: (idea: SavedIdea) => void;
  onDelete: (id: number) => void;
}

export const SavedIdeasModal: React.FC<SavedIdeasModalProps> = ({ isOpen, onClose, ideas, onLoad, onDelete }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center"
      onClick={onClose}
    >
      <div 
        className="bg-secondary rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col border border-border"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-border">
            <div className="flex items-center gap-3">
                <LightbulbIcon className="w-6 h-6 text-accent" />
                <h2 className="text-xl font-bold text-accent">Kho Ý Tưởng</h2>
            </div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary text-2xl font-bold">&times;</button>
        </div>
        <div className="p-6 overflow-y-auto">
          {ideas.length === 0 ? (
            <p className="text-center text-text-secondary py-8">Kho ý tưởng của bạn đang trống. Hãy lưu lại những ý tưởng hay nhé!</p>
          ) : (
            <ul className="space-y-4">
              {ideas.map(item => (
                <li key={item.id} className="bg-secondary p-4 rounded-lg flex justify-between items-start gap-4 transition-all hover:bg-primary border border-border hover:border-accent/50">
                  <div className="flex-grow">
                    <h3 className="font-semibold text-text-primary">{item.title}</h3>
                    {item.vietnameseTitle && item.vietnameseTitle !== item.title && <p className="text-sm text-accent/80 mt-1">{item.vietnameseTitle}</p>}
                    <p className="text-sm text-text-secondary mt-1 line-clamp-2">{item.outline}</p>
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