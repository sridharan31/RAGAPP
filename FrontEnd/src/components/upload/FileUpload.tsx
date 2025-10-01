import React, { useRef, useCallback } from 'react';
import Button from '../ui/Button';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isLoading?: boolean;
  accept?: string;
  maxSize?: number; // in bytes
  className?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  isLoading = false,
  accept = '.pdf',
  maxSize = 10 * 1024 * 1024, // 10MB
  className = ''
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > maxSize) {
        alert(`File size must be less than ${Math.round(maxSize / (1024 * 1024))}MB`);
        return;
      }
      onFileSelect(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onFileSelect, maxSize]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      if (file.size > maxSize) {
        alert(`File size must be less than ${Math.round(maxSize / (1024 * 1024))}MB`);
        return;
      }
      onFileSelect(file);
    } else {
      alert('Please upload a PDF file');
    }
  }, [onFileSelect, maxSize]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={className}>
      <div 
        className="border-2 border-dashed border-gray-300 hover:border-purple-400 transition-colors cursor-pointer bg-white rounded-2xl p-8"
        onClick={openFileDialog}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-purple-100 to-blue-100 rounded-2xl flex items-center justify-center">
            <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Upload PDF Document
          </h3>
          <p className="text-gray-600 mb-4">
            Drag and drop your PDF here, or click to browse
          </p>
          
          <Button 
            variant="primary" 
            size="md"
            isLoading={isLoading}
            onClick={(e) => {
              e.stopPropagation();
              openFileDialog();
            }}
          >
            {isLoading ? 'Processing...' : 'Choose File'}
          </Button>
          
          <p className="text-xs text-gray-500 mt-4">
            PDF files only • Max {Math.round(maxSize / (1024 * 1024))}MB
          </p>
        </div>
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};

export default FileUpload;