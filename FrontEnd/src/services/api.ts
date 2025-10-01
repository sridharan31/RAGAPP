import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import type { 
  ApiResponse, 
  ConversationRequest, 
  ConversationResponse,
  DocumentMetadata,
  SearchQuery,
  SearchResponse,
  AppError
} from '../types';

class ApiService {
  private client: AxiosInstance;
  private baseURL: string;

  constructor(baseURL: string = 'http://localhost:3000') {
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL,
      timeout: 30000, // 30 seconds
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add auth token if available
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(this.handleError(error))
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error) => Promise.reject(this.handleError(error))
    );
  }

  private handleError(error: any): AppError {
    const appError: AppError = {
      code: error.response?.status?.toString() || 'UNKNOWN_ERROR',
      message: error.response?.data?.message || error.message || 'An unexpected error occurred',
      details: error.response?.data,
      timestamp: new Date(),
    };

    console.error('API Error:', appError);
    return appError;
  }

  private async request<T>(config: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse = await this.client.request(config);
      
      // If the backend already returns an ApiResponse structure, use it
      if (response.data && typeof response.data === 'object' && 'success' in response.data) {
        return response.data;
      }
      
      // Otherwise, wrap the response data
      return {
        success: true,
        data: response.data,
        message: response.statusText,
      };
    } catch (error) {
      throw error;
    }
  }

  // Chat/Conversation endpoints
  async sendMessage(request: ConversationRequest): Promise<ApiResponse<ConversationResponse>> {
    return this.request<ConversationResponse>({
      method: 'POST',
      url: '/conversation',
      data: request,
    });
  }

  // Document endpoints
  async uploadDocument(file: File): Promise<ApiResponse<DocumentMetadata>> {
    const formData = new FormData();
    formData.append('pdfFile', file);

    return this.request<DocumentMetadata>({
      method: 'POST',
      url: '/Load-document',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 120000, // 2 minutes for file uploads
    });
  }

  async getDocuments(): Promise<ApiResponse<DocumentMetadata[]>> {
    return this.request<DocumentMetadata[]>({
      method: 'GET',
      url: '/documents',
    });
  }

  async deleteDocument(documentId: string): Promise<ApiResponse<void>> {
    return this.request<void>({
      method: 'DELETE',
      url: `/documents/${documentId}`,
    });
  }

  // Search endpoints
  async search(query: SearchQuery): Promise<ApiResponse<SearchResponse>> {
    const params = new URLSearchParams({
      q: query.query,
      limit: (query.limit || 10).toString(),
    });

    return this.request<SearchResponse>({
      method: 'GET',
      url: `/search?${params.toString()}`,
    });
  }

  async similaritySearch(query: SearchQuery): Promise<ApiResponse<SearchResponse>> {
    const params = new URLSearchParams({
      q: query.query,
      limit: (query.limit || 10).toString(),
    });

    return this.request<SearchResponse>({
      method: 'GET',
      url: `/similarity-search?${params.toString()}`,
    });
  }

  async vectorSearch(query: SearchQuery): Promise<ApiResponse<SearchResponse>> {
    const params = new URLSearchParams({
      q: query.query,
      limit: (query.limit || 10).toString(),
    });

    if (query.filters?.documentIds?.[0]) {
      params.append('name', query.filters.documentIds[0]);
    }

    return this.request<SearchResponse>({
      method: 'GET',
      url: `/vector-search?${params.toString()}`,
    });
  }

  async qdrantSearch(query: SearchQuery): Promise<ApiResponse<SearchResponse>> {
    const params = new URLSearchParams({
      q: query.query,
      limit: (query.limit || 10).toString(),
    });

    if (query.filters?.documentIds?.[0]) {
      params.append('documentName', query.filters.documentIds[0]);
    }

    return this.request<SearchResponse>({
      method: 'GET',
      url: `/qdrant-search?${params.toString()}`,
    });
  }

  async qdrantFilteredSearch(query: SearchQuery): Promise<ApiResponse<SearchResponse>> {
    const params = new URLSearchParams({
      q: query.query,
      limit: (query.limit || 10).toString(),
    });

    if (query.filters?.documentIds?.[0]) {
      params.append('documentName', query.filters.documentIds[0]);
    }

    return this.request<SearchResponse>({
      method: 'GET',
      url: `/qdrant-filtered-search?${params.toString()}`,
    });
  }

  // Health check
  async checkQdrantHealth(): Promise<ApiResponse<{ status: string; details?: any }>> {
    return this.request<{ status: string; details?: any }>({
      method: 'GET',
      url: '/qdrant-health',
    });
  }

  // Utility methods
  setBaseURL(url: string) {
    this.baseURL = url;
    this.client.defaults.baseURL = url;
  }

  getBaseURL(): string {
    return this.baseURL;
  }

  setAuthToken(token: string) {
    localStorage.setItem('auth_token', token);
  }

  removeAuthToken() {
    localStorage.removeItem('auth_token');
  }
}

// Create singleton instance
export const apiService = new ApiService();
export default ApiService;