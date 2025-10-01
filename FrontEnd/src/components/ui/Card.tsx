import React from 'react';
import { clsx } from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const Card: React.FC<CardProps> = ({ 
  children, 
  className, 
  hover = false, 
  padding = 'md' 
}) => {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  return (
    <div 
      className={clsx(
        'bg-white rounded-2xl border border-gray-200 shadow-sm',
        hover && 'hover:shadow-md hover:border-gray-300 transition-all duration-200',
        paddingClasses[padding],
        className
      )}
    >
      {children}
    </div>
  );
};

export default Card;