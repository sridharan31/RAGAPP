import React from 'react';
import { clsx } from 'clsx';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const Tooltip: React.FC<TooltipProps> = ({ 
  content, 
  children, 
  position = 'top' 
}) => {
  return (
    <div className="relative group">
      {children}
      <div className={clsx(
        'absolute z-10 px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none',
        position === 'top' && 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
        position === 'bottom' && 'top-full left-1/2 transform -translate-x-1/2 mt-2',
        position === 'left' && 'right-full top-1/2 transform -translate-y-1/2 mr-2',
        position === 'right' && 'left-full top-1/2 transform -translate-y-1/2 ml-2'
      )}>
        {content}
        <div className={clsx(
          'absolute w-2 h-2 bg-gray-900 transform rotate-45',
          position === 'top' && 'top-full left-1/2 -translate-x-1/2 -mt-1',
          position === 'bottom' && 'bottom-full left-1/2 -translate-x-1/2 -mb-1',
          position === 'left' && 'left-full top-1/2 -translate-y-1/2 -ml-1',
          position === 'right' && 'right-full top-1/2 -translate-y-1/2 -mr-1'
        )} />
      </div>
    </div>
  );
};

export default Tooltip;