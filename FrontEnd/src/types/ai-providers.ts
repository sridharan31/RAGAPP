// AI Provider Types
export interface AIProvider {
  id: string;
  name: string;
  description: string;
  icon: string;
  status: 'available' | 'unavailable' | 'configured';
  config?: AIProviderConfig;
}

export interface AIProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface OllamaConfig extends AIProviderConfig {
  baseUrl: string;
  model: string;
  availableModels?: string[];
}

export interface OpenAIConfig extends AIProviderConfig {
  apiKey: string;
  model: string;
  organization?: string;
}

export interface GoogleAIConfig extends AIProviderConfig {
  apiKey: string;
  model: string;
}

export type AIProviderType = 'ollama' | 'openai' | 'google';

export interface AIProviderSettings {
  selectedProvider: AIProviderType;
  providers: {
    ollama: OllamaConfig;
    openai: OpenAIConfig;
    google: GoogleAIConfig;
  };
}

export interface AIProviderStatus {
  providerId: string;
  status: 'available' | 'unavailable' | 'error';
  message?: string;
  models?: string[];
}