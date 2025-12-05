import React, { useCallback, useRef } from 'react';

interface ImageUploaderProps {
  onImageSelected: (file: File) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelected }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImageSelected(file);
    }
  };

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onImageSelected(file);
    }
  }, [onImageSelected]);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div 
      className="w-full max-w-xl mx-auto"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileChange} 
        accept="image/*" 
        className="hidden" 
      />
      
      <div 
        onClick={handleButtonClick}
        className="group relative flex flex-col items-center justify-center w-full h-80 border-2 border-dashed border-amber-300 rounded-2xl bg-white/50 hover:bg-white/80 hover:border-amber-500 transition-all duration-300 cursor-pointer overflow-hidden shadow-sm"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-amber-200/20 to-orange-200/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <div className="relative z-10 flex flex-col items-center text-center p-6">
          <div className="w-16 h-16 mb-4 rounded-full bg-amber-100 flex items-center justify-center group-hover:bg-amber-200 text-amber-600 transition-colors duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          </div>
          
          <h3 className="text-xl font-semibold text-amber-900 mb-2">上传一张照片</h3>
          <p className="text-amber-700/70 max-w-xs">
            拖拽图片到这里，或点击选择文件
          </p>
          <span className="mt-6 text-xs text-amber-500 uppercase tracking-wider font-medium">
            支持 JPG, PNG, WEBP
          </span>
        </div>
      </div>
    </div>
  );
};