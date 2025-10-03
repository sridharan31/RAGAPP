import React, { useRef, useCallback } from 'react';
import Button from '../ui/Button';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onFileDelete?: (fileId: string) => void;
  isLoading?: boolean;
  accept?: string;
  maxSize?: number; // in bytes
  className?: string;
  supportedFormats?: string[];
  uploadedFiles?: Array<{id: string, name: string, size: number, type: string}>;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  onFileDelete,
  isLoading = false,
  accept = '.pdf,.docx,.doc,.txt,.md,.pptx,.ppt,.csv,.xlsx,.xls',
  maxSize = 25 * 1024 * 1024, // 25MB
  className = '',
  supportedFormats = ['PDF', 'DOCX', 'DOC', 'TXT', 'MD', 'PPTX', 'PPT', 'CSV', 'XLSX', 'XLS'],
  uploadedFiles = []
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isValidFileType = (file: File) => {
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'text/markdown',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-powerpoint',
      'text/csv',
      'application/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    return validTypes.includes(file.type);
  };

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > maxSize) {
        alert(`File size must be less than ${Math.round(maxSize / (1024 * 1024))}MB`);
        return;
      }
      if (!isValidFileType(file)) {
        alert(`Please upload a supported file format: ${supportedFormats.join(', ')}`);
        return;
      }
      onFileSelect(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onFileSelect, maxSize, supportedFormats]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      if (file.size > maxSize) {
        alert(`File size must be less than ${Math.round(maxSize / (1024 * 1024))}MB`);
        return;
      }
      if (!isValidFileType(file)) {
        alert(`Please upload a supported file format: ${supportedFormats.join(', ')}`);
        return;
      }
      onFileSelect(file);
    }
  }, [onFileSelect, maxSize, supportedFormats]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const handleDeleteFile = (fileId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (onFileDelete) {
      onFileDelete(fileId);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) {
      return (
        <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0v12h8V6H8V4H6z" clipRule="evenodd" />
        </svg>
      );
    } else if (fileType.includes('csv') || fileType.includes('excel') || fileType.includes('spreadsheet')) {
      return (
        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2v8h10V6H5z" clipRule="evenodd" />
        </svg>
      );
    } else if (fileType.includes('word') || fileType.includes('document')) {
      return (
        <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
        </svg>
      );
    } else if (fileType.includes('presentation') || fileType.includes('powerpoint')) {
      return (
        <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
        </svg>
      );
    } else {
      return (
        <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
        </svg>
      );
    }
  };

  return (
    <div className={className}>
      {/* File Upload Area */}
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
            Upload Document
          </h3>
          <p className="text-gray-600 mb-4">
            Drag and drop your document here, or click to browse
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
          
          <div className="mt-4">
            <p className="text-xs text-gray-500">
              Supported: {supportedFormats.join(', ')}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Max {Math.round(maxSize / (1024 * 1024))}MB
            </p>
          </div>
        </div>
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles && uploadedFiles.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Uploaded Files ({uploadedFiles.length})
          </h4>
          <div className="space-y-2">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  {getFileIcon(file.type)}
                  <div>
                    <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                {onFileDelete && (
                  <button
                    onClick={(e) => handleDeleteFile(file.id, e)}
                    className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-full transition-colors"
                    title="Delete file"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
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