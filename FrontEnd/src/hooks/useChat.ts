import { useState, useCallback } from 'react';
import { apiService } from '../services/api';
import type { 
  ChatMessage, 
  ChatSession, 
  ConversationRequest,
  AppError 
} from '../types';

export interface UseChatReturn {
  messages: ChatMessage[];
  currentSession: ChatSession | null;
  sessionId: string | null;
  isLoading: boolean;
  error: AppError | null;
  sendMessage: (message: string, selectedDocument?: string) => Promise<void>;
  startNewSession: () => void;
  loadSession: (sessionId: string, sessionMessages: ChatMessage[]) => void;
  clearMessages: () => void;
  clearError: () => void;
}

export const useChat = (): UseChatReturn => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AppError | null>(null);

  const sendMessage = useCallback(async (messageContent: string, selectedDocument?: string) => {
    if (!messageContent.trim()) return;

    setIsLoading(true);
    setError(null);

    // Create user message
    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}_user`,
      role: 'user',
      content: messageContent.trim(),
      timestamp: new Date(),
    };

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);

    try {
      const request: ConversationRequest = {
        message: messageContent.trim(),
        sessionId: currentSession?.id,
        selectedDocument,
      };

      const response = await apiService.sendMessage(request);
      
      if (response.success && response.data) {
        const { message: aiResponse, sessionId, sources } = response.data;

        // Create AI message
        const aiMessage: ChatMessage = {
          id: `msg_${Date.now()}_ai`,
          role: 'assistant',
          content: aiResponse,
          timestamp: new Date(),
          metadata: {
            sources: sources || [],
          },
        };

        // Add AI message
        setMessages(prev => [...prev, aiMessage]);

        // Update or create session
        if (!currentSession) {
          const newSession: ChatSession = {
            id: sessionId,
            title: messageContent.slice(0, 50) + (messageContent.length > 50 ? '...' : ''),
            messages: [userMessage, aiMessage],
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          setCurrentSession(newSession);
        } else {
          setCurrentSession(prev => prev ? {
            ...prev,
            messages: [...prev.messages, userMessage, aiMessage],
            updatedAt: new Date(),
          } : null);
        }
      } else {
        throw new Error(response.message || 'Failed to send message');
      }
    } catch (err) {
      const appError = err as AppError;
      setError(appError);
      
      // Remove the user message on error
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  }, [currentSession]);

  const startNewSession = useCallback(() => {
    setMessages([]);
    setCurrentSession(null);
    setError(null);
  }, []);

  const loadSession = useCallback((sessionId: string, sessionMessages: ChatMessage[]) => {
    setMessages(sessionMessages);
    setCurrentSession({
      id: sessionId,
      title: sessionMessages.length > 0 ? sessionMessages[0].content.substring(0, 50) + '...' : 'New Session',
      messages: sessionMessages,
      createdAt: sessionMessages.length > 0 ? sessionMessages[0].timestamp : new Date(),
      updatedAt: sessionMessages.length > 0 ? sessionMessages[sessionMessages.length - 1].timestamp : new Date(),
    });
    setError(null);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    messages,
    currentSession,
    sessionId: currentSession?.id || null,
    isLoading,
    error,
    sendMessage,
    startNewSession,
    loadSession,
    clearMessages,
    clearError,
  };
};