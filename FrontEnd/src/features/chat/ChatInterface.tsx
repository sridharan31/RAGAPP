import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../../hooks/useChat';
import { useDocuments } from '../../hooks/useDocuments';
import { useSession } from '../../hooks/useSession';
import SessionHistory from '../../components/common/SessionHistory';

const ChatInterface: React.FC = () => {
  const [message, setMessage] = useState('');
  const [selectedDocument, setSelectedDocument] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { 
    messages, 
    isLoading, 
    error, 
    sendMessage,
    startNewSession,
    loadSession,
    sessionId
  } = useChat();

  const {
    currentSessionId,
    createNewSession,
    loadSessionHistory,
    switchToSession,
    error: sessionError
  } = useSession();

  // Handle session switching
  const handleSessionSelect = async (selectedSessionId: string) => {
    try {
      await switchToSession(selectedSessionId);
      const sessionMessages = await loadSessionHistory(selectedSessionId);
      
      // Convert session messages to chat messages format
      const chatMessages = sessionMessages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: typeof msg.timestamp === 'string' ? new Date(msg.timestamp) : msg.timestamp,
        metadata: {}
      }));
      
      // Load the session into the chat
      loadSession(selectedSessionId, chatMessages);
    } catch (error) {
      console.error('Error switching to session:', error);
    }
  };

  const handleNewSession = () => {
    startNewSession();
    createNewSession();
  };

  // Handle document change - reset chat when document changes
  const handleDocumentChange = (newDocument: string) => {
    if (selectedDocument !== newDocument) {
      setSelectedDocument(newDocument);
      // Reset chat when document changes
      startNewSession();
      createNewSession();
    }
  };
  
  const { 
    documents = [], 
    isLoading: documentsLoading,
    error: documentsError
  } = useDocuments();

  // Ensure documents is always an array
  const safeDocuments = Array.isArray(documents) ? documents : [];
  
  // Debug log for documents
  React.useEffect(() => {
    console.log('Documents loaded:', safeDocuments);
    console.log('Documents loading:', documentsLoading);
    console.log('Documents error:', documentsError);
    console.log('Selected document:', selectedDocument);
  }, [safeDocuments, documentsLoading, documentsError, selectedDocument]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    if (safeDocuments.length === 0) {
      // Show error if no documents are available
      return;
    }

    await sendMessage(message, selectedDocument || undefined);
    setMessage('');
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Session History */}
      <div className="border-b border-gray-100">
        <SessionHistory
          currentSessionId={currentSessionId || sessionId || undefined}
          onSessionSelect={handleSessionSelect}
          onNewSession={handleNewSession}
          className="mx-4 my-2"
        />
      </div>

      {/* Simple Header */}
      <div className="border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-medium text-gray-900">RAG Chat Assistant</h1>
          
          {/* Document Selector */}
          <div className="flex items-center space-x-2">
            <label htmlFor="document-select" className="text-sm text-gray-600">
              Document:
            </label>
            <div className="relative">
              <select
                id="document-select"
                value={selectedDocument}
                onChange={(e) => handleDocumentChange(e.target.value)}
                className="min-w-[200px] px-3 py-2 border border-gray-300 rounded-md text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500 appearance-none pr-8"
                disabled={documentsLoading || safeDocuments.length === 0}
              >
                {documentsLoading ? (
                  <option value="">Loading documents...</option>
                ) : safeDocuments.length === 0 ? (
                  <option value="">No documents uploaded</option>
                ) : (
                  <>
                    <option value="">All Documents ({safeDocuments.length})</option>
                    {safeDocuments.map((doc) => (
                      <option key={doc.id || doc.name} value={doc.name}>
                        📄 {doc.name}
                      </option>
                    ))}
                  </>
                )}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {safeDocuments.length === 0 && !documentsLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-gray-500 mb-4">No documents uploaded yet.</p>
              <p className="text-sm text-gray-400">Upload a PDF document to start chatting.</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-gray-600 mb-2">Ready to chat!</p>
              <p className="text-sm text-gray-400">Ask me anything about your documents.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg px-3 py-2">
                  <div className="text-sm text-gray-600">Thinking...</div>
                </div>
              </div>
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 px-4 py-3">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={
              safeDocuments.length === 0
                ? "Please upload a document first..." 
                : "Type your message..."
            }
            disabled={isLoading || safeDocuments.length === 0}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 disabled:bg-gray-100"
          />
          <button
            type="submit"
            disabled={!message.trim() || isLoading || safeDocuments.length === 0}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </form>
        
        {error && (
          <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
            {error.message}
          </div>
        )}
      </div>
    </div>
  );
};

// Enhanced Message Bubble Component with formatting
const MessageBubble: React.FC<{ message: any }> = ({ message }) => {
  const isUser = message.role === 'user';

  // Function to format content with code blocks and paragraphs
  const formatContent = (content: string) => {
    // Split content by code blocks (```...```)
    const parts = content.split(/(```[\s\S]*?```)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        // This is a code block
        const codeContent = part.slice(3, -3);
        const lines = codeContent.split('\n');
        const language = lines[0].trim();
        const code = lines.slice(1).join('\n');
        
        return (
          <div key={index} className="my-3">
            <div className="bg-gray-900 text-gray-100 rounded-lg overflow-hidden">
              {language && (
                <div className="bg-gray-800 px-3 py-1 text-xs text-gray-300 border-b border-gray-700">
                  {language}
                </div>
              )}
              <pre className="p-3 overflow-x-auto text-sm">
                <code>{code}</code>
              </pre>
            </div>
          </div>
        );
      } else {
        // Regular text - split by paragraphs
        const paragraphs = part.split('\n\n').filter(p => p.trim());
        return paragraphs.map((paragraph, pIndex) => (
          <div key={`${index}-${pIndex}`} className="mb-3 last:mb-0">
            <p className="leading-relaxed">{paragraph.trim()}</p>
          </div>
        ));
      }
    });
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-2xl lg:max-w-3xl px-4 py-3 rounded-lg ${
        isUser 
          ? 'bg-blue-500 text-white' 
          : 'bg-white text-gray-800 border border-gray-200 shadow-sm'
      }`}>
        <div className="text-sm">
          {isUser ? (
            <div className="whitespace-pre-wrap">{message.content}</div>
          ) : (
            <div className="prose prose-sm max-w-none">
              {formatContent(message.content)}
            </div>
          )}
        </div>
        <div className={`text-xs mt-2 ${
          isUser ? 'text-blue-100' : 'text-gray-500'
        }`}>
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;