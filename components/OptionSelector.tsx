import React from 'react';
import { Tooltip } from './Tooltip';

interface OptionSelectorProps<T extends string> {
  title?: string;
  options: readonly { value: T; label: string }[];
  selectedOption: T;
  onSelect: (option: T) => void;
  explanations?: Record<T, string>;
}

export const OptionSelector = <T extends string,>({ title, options, selectedOption, onSelect, explanations }: OptionSelectorProps<T>) => {
  return (
    <div>
      {title && <label className="block text-sm font-medium text-text-secondary mb-2">{title}</label>}
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Tooltip key={option.value} text={explanations?.[option.value] ?? ''}>
            <button
              onClick={() => onSelect(option.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                selectedOption === option.value
                  ? 'bg-accent text-white shadow-md'
                  : 'bg-secondary hover:bg-primary/50 text-text-primary'
              }`}
            >
              {option.label}
            </button>
          </Tooltip>
        ))}
      </div>
    </div>
  );
};