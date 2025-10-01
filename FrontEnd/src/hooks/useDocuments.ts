import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import type { 
  DocumentMetadata, 
  AppError,
  LoadingState 
} from '../types';

export interface UseDocumentsReturn {
  documents: DocumentMetadata[];
  isLoading: boolean;
  uploadState: LoadingState;
  error: AppError | null;
  uploadDocument: (file: File) => Promise<void>;
  deleteDocument: (documentId: string) => Promise<void>;
  refreshDocuments: () => Promise<void>;
  clearError: () => void;
}

export const useDocuments = (): UseDocumentsReturn => {
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadState, setUploadState] = useState<LoadingState>({ isLoading: false });
  const [error, setError] = useState<AppError | null>(null);

  const refreshDocuments = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiService.getDocuments();
      
      if (response.success && response.data) {
        // Ensure we always set an array
        const documentsArray = Array.isArray(response.data) ? response.data : [];
        setDocuments(documentsArray);
      } else {
        // If the API call fails, ensure we still have an empty array
        setDocuments([]);
      }
    } catch (err) {
      const appError = err as AppError;
      setError(appError);
      // Ensure documents is still an array even on error
      setDocuments([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const uploadDocument = useCallback(async (file: File) => {
    setUploadState({ isLoading: true, message: 'Uploading and processing document...' });
    setError(null);

    try {
      const response = await apiService.uploadDocument(file);
      
      if (response.success && response.data) {
        setDocuments(prev => [...prev, response.data!]);
        setUploadState({ isLoading: false, message: 'Document uploaded successfully!' });
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setUploadState({ isLoading: false });
        }, 3000);
      } else {
        throw new Error(response.message || 'Failed to upload document');
      }
    } catch (err) {
      const appError = err as AppError;
      setError(appError);
      setUploadState({ isLoading: false });
    }
  }, []);

  const deleteDocument = useCallback(async (documentId: string) => {
    try {
      setError(null);
      const response = await apiService.deleteDocument(documentId);
      
      if (response.success) {
        setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      } else {
        throw new Error(response.message || 'Failed to delete document');
      }
    } catch (err) {
      const appError = err as AppError;
      setError(appError);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Load documents on mount
  useEffect(() => {
    refreshDocuments();
  }, [refreshDocuments]);

  return {
    documents,
    isLoading,
    uploadState,
    error,
    uploadDocument,
    deleteDocument,
    refreshDocuments,
    clearError,
  };
};