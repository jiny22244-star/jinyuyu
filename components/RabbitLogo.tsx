import React from 'react';

export const RabbitLogo: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      {/* 
        Cute, Generous, Concise Rabbit Outline
        - Round face (Arc)
        - Tall, soft ears with a friendly gap
        - Clean geometric construction
      */}
      <path d="M8 14 L8 6 A 1.5 1.5 0 0 1 11 6 L11 11.5 Q 12 12.5 13 11.5 L13 6 A 1.5 1.5 0 0 1 16 6 L16 14 A 4 4 0 0 1 8 14 Z" />
      
      {/* Simple Dot Eyes - Solid fill for cuteness */}
      <circle cx="10" cy="14.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="14" cy="14.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
};