// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Chat Types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    sources?: DocumentReference[];
    confidence?: number;
    processingTime?: number;
  };
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

// Document Types
export interface DocumentMetadata {
  id: string;
  name: string; // Backend uses 'name' instead of 'filename'
  filename?: string; // Keep for backward compatibility
  originalName?: string;
  size: number;
  type: string; // Backend uses 'type' instead of 'mimeType'
  mimeType?: string; // Keep for backward compatibility
  uploadedAt: string | Date;
  processedAt?: Date;
  status?: 'uploading' | 'processing' | 'processed' | 'failed';
  chunkCount?: number;
  errorMessage?: string;
  documentType?: string;
  summary?: string;
  keywords?: string[];
  processedBy?: string;
  metadata?: {
    [key: string]: any;
  };
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  metadata: {
    page?: number;
    section?: string;
    startChar: number;
    endChar: number;
  };
  embedding?: number[];
}

export interface DocumentReference {
  documentId: string;
  filename: string;
  relevanceScore: number;
  chunkId?: string;
  excerpt?: string;
}

// Search Types
export interface SearchQuery {
  query: string;
  type: 'text' | 'semantic' | 'vector' | 'hybrid';
  filters?: SearchFilters;
  limit?: number;
}

export interface SearchFilters {
  documentIds?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  documentTypes?: string[];
}

export interface SearchResult {
  id: string;
  content: string;
  relevanceScore: number;
  document: DocumentMetadata;
  chunk?: DocumentChunk;
  highlights?: string[];
}

export interface SearchResponse {
  results: SearchResult[];
  totalCount: number;
  query: SearchQuery;
  processingTime: number;
}

// Application State Types
export interface AppState {
  user: User | null;
  currentSession: ChatSession | null;
  documents: DocumentMetadata[];
  isLoading: boolean;
  error: AppError | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: boolean;
}

// API Endpoints
export interface ConversationRequest {
  message: string;
  sessionId?: string;
  selectedDocument?: string;
}

export interface ConversationResponse {
  sessionId: string;
  message: string;
  context_documents: number;
  selectedDocument?: string;
  sources?: DocumentReference[];
  search_type: string;
}

// Error Types
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

// AI Provider Types
export * from './ai-providers';

// Component Props Types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface LoadingState {
  isLoading: boolean;
  message?: string;
  progress?: number;
}

export interface ErrorState {
  error: AppError | null;
  retry?: () => void;
}