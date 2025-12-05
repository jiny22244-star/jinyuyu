import React from 'react';

export const RabbitLogo: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => {
  return (
    <svg 
      viewBox="0 0 100 100" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="6" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      {/* Minimalist Line Rabbit */}
      <path d="M30 65 C 20 65, 10 55, 15 40 C 18 30, 25 10, 35 15 C 40 18, 40 35, 40 35" /> {/* Left Ear */}
      <path d="M70 65 C 80 65, 90 55, 85 40 C 82 30, 75 10, 65 15 C 60 18, 60 35, 60 35" /> {/* Right Ear */}
      <path d="M30 65 C 30 85, 70 85, 70 65" /> {/* Bottom Face */}
      <path d="M40 35 C 40 35, 50 30, 60 35" /> {/* Top Head Connect */}
      
      {/* Simple Face Features */}
      <circle cx="35" cy="55" r="2" fill="currentColor" stroke="none" />
      <circle cx="65" cy="55" r="2" fill="currentColor" stroke="none" />
      <path d="M45 65 Q 50 70 55 65" strokeWidth="4" />
    </svg>
  );
};