import React, { useState } from 'react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import type { ChatMessage } from '../../types';

interface ChatBubbleProps {
  message: ChatMessage;
  onFeedback?: (messageId: string, feedback: 'positive' | 'negative') => void;
  showSources?: boolean;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ 
  message, 
  onFeedback,
  showSources = false 
}) => {
  const [showSourcesExpanded, setShowSourcesExpanded] = useState(false);
  const [feedback, setFeedback] = useState<'positive' | 'negative' | null>(null);
  
  const isUser = message.role === 'user';

  const handleFeedback = (type: 'positive' | 'negative') => {
    setFeedback(type);
    onFeedback?.(message.id, type);
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6 group`}>
      <div className={`flex items-start space-x-3 max-w-4xl ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser 
            ? 'bg-gradient-to-r from-purple-500 to-blue-600' 
            : 'bg-gradient-to-r from-emerald-400 to-cyan-500'
        }`}>
          {isUser ? (
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          ) : (
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          )}
        </div>
        
        {/* Message Content */}
        <div className={`flex-1 ${isUser ? 'text-right' : 'text-left'}`}>
          <Card 
            padding="md"
            className={`inline-block max-w-full ${
              isUser 
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0' 
                : 'bg-white border-gray-200 shadow-sm'
            }`}
          >
            <div className="whitespace-pre-wrap break-words leading-relaxed">
              {message.content}
            </div>
            
            {/* Sources Section */}
            {!isUser && showSources && message.metadata?.sources && message.metadata.sources.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setShowSourcesExpanded(!showSourcesExpanded)}
                  className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800 mb-3"
                >
                  <svg className={`w-4 h-4 transition-transform ${showSourcesExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="font-medium">Sources ({message.metadata.sources.length})</span>
                </button>
                
                {showSourcesExpanded && (
                  <div className="space-y-2">
                    {message.metadata.sources.map((source, index) => (
                      <div key={index} className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <div className="flex items-start justify-between mb-2">
                          <span className="font-medium text-gray-900 text-sm">{source.filename}</span>
                          <Badge variant="success" size="sm">
                            {(source.relevanceScore * 100).toFixed(0)}%
                          </Badge>
                        </div>
                        {source.excerpt && (
                          <p className="text-sm text-gray-700 italic">"{source.excerpt}"</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
          
          {/* Message Footer */}
          <div className={`mt-2 flex items-center space-x-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
            <span className="text-xs text-gray-500">
              {message.timestamp.toLocaleTimeString()}
            </span>
            
            {/* Feedback Buttons for AI Messages */}
            {!isUser && onFeedback && (
              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleFeedback('positive')}
                  className={`p-1 rounded hover:bg-green-100 transition-colors ${
                    feedback === 'positive' ? 'text-green-600 bg-green-100' : 'text-gray-400 hover:text-green-600'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                  </svg>
                </button>
                <button
                  onClick={() => handleFeedback('negative')}
                  className={`p-1 rounded hover:bg-red-100 transition-colors ${
                    feedback === 'negative' ? 'text-red-600 bg-red-100' : 'text-gray-400 hover:text-red-600'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v2a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatBubble;