import React from 'react';

interface TooltipProps {
  text: string;
  children: React.ReactNode;
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({ text, children, className }) => {
  if (!text) return <>{children}</>;

  return (
    <div className={`relative inline-block tooltip-container ${className}`}>
      {children}
      <div className="tooltip-text absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs p-2.5 bg-secondary border border-border/50 text-text-primary text-xs font-normal rounded-md shadow-lg z-10 pointer-events-none">
        {text}
        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-secondary"></div>
      </div>
    </div>
  );
};