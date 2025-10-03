import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';

interface SessionData {
  id: string;
  lastMessage: string;
  timestamp: Date;
  messageCount: number;
  createdAt?: string;
  updatedAt?: string;
}

interface SessionHistoryProps {
  currentSessionId?: string;
  onSessionSelect: (sessionId: string) => void;
  onNewSession: () => void;
  className?: string;
}

const SessionHistory: React.FC<SessionHistoryProps> = ({
  currentSessionId,
  onSessionSelect,
  onNewSession,
  className = ''
}) => {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const fetchSessions = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await apiService.getAllSessions();
      
      if (response.success && response.data) {
        // Handle the backend response structure: {sessions: [...], total: number}
        const sessionsData = (response.data as any).sessions || response.data;
        setSessions(Array.isArray(sessionsData) ? sessionsData : []);
      } else {
        setError(response.error || 'Failed to load sessions');
      }
    } catch (err) {
      console.error('Error fetching sessions:', err);
      setError('Failed to load session history');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleDeleteSession = async (sessionId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await apiService.deleteSession(sessionId);
      
      if (response.success) {
        // Refresh sessions list
        await fetchSessions();
        
        // If we deleted the current session, create a new one
        if (sessionId === currentSessionId) {
          onNewSession();
        }
      } else {
        alert(response.error || 'Failed to delete session');
      }
    } catch (err) {
      console.error('Error deleting session:', err);
      alert('Failed to delete session');
    }
  };

  const handleNewSession = async () => {
    try {
      const response = await apiService.createNewSession();
      
      if (response.success && response.data?.sessionId) {
        onSessionSelect(response.data.sessionId);
        await fetchSessions(); // Refresh the list
      } else {
        onNewSession(); // Fallback to existing new session logic
      }
    } catch (err) {
      console.error('Error creating new session:', err);
      onNewSession(); // Fallback to existing new session logic
    }
  };

  const formatTimestamp = (timestamp: Date | string) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  const truncateMessage = (message: string, maxLength: number = 50) => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center space-x-2 text-gray-700 hover:text-gray-900"
        >
          <span className="font-medium">Session History</span>
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        <button
          onClick={handleNewSession}
          className="px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          New Chat
        </button>
      </div>

      {/* Sessions List */}
      {isExpanded && (
        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              <span className="ml-2 text-sm text-gray-600">Loading sessions...</span>
            </div>
          ) : error ? (
            <div className="p-4 text-center">
              <p className="text-sm text-red-600">{error}</p>
              <button
                onClick={fetchSessions}
                className="mt-2 px-3 py-1 text-sm bg-gray-500 text-white rounded-md hover:bg-gray-600"
              >
                Retry
              </button>
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-sm text-gray-500">No previous sessions</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`p-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                    session.id === currentSessionId ? 'bg-blue-50 border-r-4 border-blue-500' : ''
                  }`}
                  onClick={() => onSessionSelect(session.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {session.lastMessage ? truncateMessage(session.lastMessage) : 'New Chat'}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-gray-500">
                          {session.messageCount} message{session.messageCount !== 1 ? 's' : ''}
                        </span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500">
                          {formatTimestamp(session.updatedAt || session.timestamp)}
                        </span>
                      </div>
                    </div>
                    
                    <button
                      onClick={(e) => handleDeleteSession(session.id, e)}
                      className="ml-2 p-1 text-gray-400 hover:text-red-500 transition-colors"
                      title="Delete session"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SessionHistory;