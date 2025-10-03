import { useState, useCallback } from 'react';
import { apiService } from '../services/api';

interface SessionMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date | string;
  sessionId?: string;
}

export interface UseSessionReturn {
  currentSessionId: string | null;
  isLoading: boolean;
  error: string | null;
  createNewSession: () => Promise<void>;
  loadSessionHistory: (sessionId: string) => Promise<SessionMessage[]>;
  switchToSession: (sessionId: string) => Promise<void>;
  clearError: () => void;
}

export const useSession = (): UseSessionReturn => {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const createNewSession = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiService.createNewSession();

      if (response.success && response.data?.sessionId) {
        setCurrentSessionId(response.data.sessionId);
      } else {
        // Fallback: create a local session ID
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setCurrentSessionId(sessionId);
      }
    } catch (err) {
      console.error('Error creating new session:', err);
      // Fallback: create a local session ID
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setCurrentSessionId(sessionId);
      setError('Failed to create new session on server, using local session');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadSessionHistory = useCallback(async (sessionId: string): Promise<SessionMessage[]> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiService.getSessionHistory(sessionId);

      if (response.success && response.data) {
        // Handle the backend response structure: {messages: [...], sessionId: "...", total: number}
        const messages = (response.data as any).messages || response.data;
        const messageArray = Array.isArray(messages) ? messages : [];
        
        // Convert the response to SessionMessage format
        return messageArray.map((msg: any) => ({
          id: msg.id || `msg_${Date.now()}_${Math.random()}`,
          role: msg.role || 'user',
          content: msg.content || msg.message || '',
          timestamp: msg.timestamp || new Date(),
          sessionId: msg.sessionId || sessionId
        }));
      } else {
        setError(response.error || 'Failed to load session history');
        return [];
      }
    } catch (err) {
      console.error('Error loading session history:', err);
      setError('Failed to load session history');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const switchToSession = useCallback(async (sessionId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      setCurrentSessionId(sessionId);
      
      // The parent component should handle loading the messages
      // This hook just manages the session ID state
    } catch (err) {
      console.error('Error switching to session:', err);
      setError('Failed to switch to session');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    currentSessionId,
    isLoading,
    error,
    createNewSession,
    loadSessionHistory,
    switchToSession,
    clearError,
  };
};