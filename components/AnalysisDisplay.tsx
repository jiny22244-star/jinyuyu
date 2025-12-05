import React from 'react';

interface AnalysisDisplayProps {
  text: string;
  isLoading: boolean;
}

export const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ text, isLoading }) => {
  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-4 bg-amber-200/50 rounded w-3/4"></div>
        <div className="h-4 bg-amber-200/50 rounded w-full"></div>
        <div className="h-4 bg-amber-200/50 rounded w-5/6"></div>
        <div className="h-4 bg-amber-200/50 rounded w-full"></div>
        <div className="h-4 bg-amber-200/50 rounded w-2/3"></div>
      </div>
    );
  }

  // A simple way to format the text without a heavy markdown library
  const formattedText = text.split('\n').map((line, i) => {
    if (line.startsWith('**') && line.endsWith('**')) {
      return <h4 key={i} className="text-lg font-bold text-amber-900 mt-4 mb-2">{line.replace(/\*\*/g, '')}</h4>;
    }
    if (line.startsWith('* ') || line.startsWith('- ')) {
      return <li key={i} className="ml-4 list-disc marker:text-amber-500 pl-1 mb-1 text-amber-800">{line.substring(2)}</li>;
    }
    if (line.trim() === '') {
      return <br key={i} />;
    }
    return <p key={i} className="mb-2 leading-relaxed text-amber-800">{line}</p>;
  });

  return (
    <div className="bg-white/60 rounded-xl p-6 border border-amber-200 shadow-sm h-full overflow-y-auto custom-scrollbar">
      <div className="prose prose-amber max-w-none">
        {formattedText}
      </div>
    </div>
  );
};