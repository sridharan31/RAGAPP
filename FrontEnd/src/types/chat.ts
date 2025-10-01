export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
  metadata?: {
    sources?: Array<{
      filename: string;
      excerpt: string;
      relevanceScore: number;
    }>;
  };
}

export interface Document {
  id: string;
  filename: string;
  originalName: string;
  size: number;
  uploadedAt: string;
  chunkCount: number;
  status: 'processed' | 'processing' | 'error';
  mimeType?: string;
}

export interface DocumentMetadata extends Omit<Document, 'uploadedAt'> {
  uploadedAt: Date;
}