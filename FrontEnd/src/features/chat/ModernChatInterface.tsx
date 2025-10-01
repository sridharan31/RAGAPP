import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../../hooks/useChat';
import { useDocuments } from '../../hooks/useDocuments';
import ChatBubble from '../../components/chat/ChatBubble';
import DocumentSidebar from '../../components/documents/DocumentSidebar';
import FileUpload from '../../components/upload/FileUpload';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Tooltip from '../../components/ui/Tooltip';

const ModernChatInterface: React.FC = () => {
  const [message, setMessage] = useState('');
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const { 
    messages, 
    isLoading, 
    error, 
    sendMessage
  } = useChat();
  
  const { 
    documents = [], 
    isLoading: documentsLoading,
    uploadDocument,
    deleteDocument
  } = useDocuments();

  // Ensure documents is always an array
  const safeDocuments = Array.isArray(documents) ? documents : [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    if (safeDocuments.length === 0) {
      setShowUploadModal(true);
      return;
    }

    await sendMessage(message, selectedDocument || undefined);
    setMessage('');
  };

  const handleFileUpload = async (file: File) => {
    try {
      await uploadDocument(file);
      setShowUploadModal(false);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const handleDocumentDelete = async (documentId: string) => {
    try {
      await deleteDocument(documentId);
      if (selectedDocument === documentId) {
        setSelectedDocument(null);
      }
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleFeedback = (messageId: string, feedback: 'positive' | 'negative') => {
    // TODO: Implement feedback API call
    console.log('Feedback:', messageId, feedback);
  };

  const quickPrompts = [
    "What is this document about?",
    "Summarize the key points",
    "What are the main findings?",
    "Explain the methodology used"
  ];

  return (
    <div className="h-full flex bg-gray-50">
      {/* Document Sidebar */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'w-0' : 'w-80'} flex-shrink-0`}>
        <div className={`h-full ${sidebarCollapsed ? 'hidden' : 'block'}`}>
          <DocumentSidebar
            documents={safeDocuments}
            selectedDocument={selectedDocument}
            onDocumentSelect={setSelectedDocument}
            onDocumentDelete={handleDocumentDelete}
            onUploadNew={() => setShowUploadModal(true)}
            isLoading={documentsLoading}
          />
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">AI Assistant</h1>
                  <p className="text-sm text-gray-500 flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    Ready • {safeDocuments.length} documents loaded
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Document Selector */}
              <div className="flex items-center space-x-2">
                <label htmlFor="document-select" className="text-sm font-medium text-gray-700">
                  Context:
                </label>
                <select
                  id="document-select"
                  value={selectedDocument || ''}
                  onChange={(e) => setSelectedDocument(e.target.value || null)}
                  className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  disabled={documentsLoading || safeDocuments.length === 0}
                >
                  <option value="">All Documents</option>
                  {safeDocuments.map((doc) => (
                    <option key={doc.id} value={doc.filename}>
                      {doc.originalName}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Upload Button */}
              <Tooltip content="Upload new document">
                <button 
                  onClick={() => setShowUploadModal(true)}
                  className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          {safeDocuments.length === 0 ? (
            <div className="h-full flex items-center justify-center p-8">
              <div className="text-center max-w-lg">
                <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Welcome to AI Document Chat</h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Upload your first PDF document to start having intelligent conversations with your content.
                </p>
                <Button onClick={() => setShowUploadModal(true)}>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Upload Your First Document
                </Button>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex items-center justify-center p-8">
              <div className="text-center max-w-lg">
                <div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-br from-emerald-100 to-cyan-100 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Start Your Conversation</h3>
                <p className="text-gray-600 leading-relaxed mb-6">
                  Your documents are loaded and ready. Ask me anything about the content.
                </p>
                
                {/* Quick Prompts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-lg mx-auto">
                  {quickPrompts.map((prompt, index) => (
                    <button
                      key={index}
                      onClick={() => setMessage(prompt)}
                      className="p-4 bg-white border border-gray-200 rounded-xl hover:border-purple-300 hover:bg-purple-50 transition-all duration-200 text-left group"
                    >
                      <span className="text-sm font-medium text-gray-800 group-hover:text-purple-800">
                        {prompt}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="px-6 py-6">
              <div className="max-w-4xl mx-auto space-y-6">
                {messages.map((msg) => (
                  <ChatBubble 
                    key={msg.id} 
                    message={msg} 
                    onFeedback={handleFeedback}
                    showSources={true}
                  />
                ))}
                
                {/* Typing Indicator */}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="flex items-start space-x-3 max-w-4xl">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-500 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                      <Card className="inline-block">
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-600 text-sm">AI is thinking</span>
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                          </div>
                        </div>
                      </Card>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="bg-white border-t border-gray-200 p-6">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSubmit}>
              <div className="flex items-end space-x-4">
                <div className="flex-1">
                  <div className="relative">
                    <textarea
                      ref={textareaRef}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={
                        safeDocuments.length === 0
                          ? "Upload a document first to start chatting..." 
                          : selectedDocument
                            ? `Ask about ${safeDocuments.find(doc => doc.filename === selectedDocument)?.originalName}...`
                            : "Ask me anything about your documents..."
                      }
                      disabled={isLoading || safeDocuments.length === 0}
                      className="w-full px-4 py-4 pr-12 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:bg-white resize-none transition-all duration-200 text-gray-900 placeholder-gray-500"
                      rows={1}
                      style={{ minHeight: '56px', maxHeight: '120px' }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSubmit(e);
                        }
                      }}
                    />
                    
                    {/* Character Counter */}
                    <div className="absolute bottom-2 right-3 text-xs text-gray-400">
                      {message.length}
                    </div>
                  </div>
                  
                  {/* Quick Actions */}
                  {safeDocuments.length > 0 && messages.length === 0 && !message && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {quickPrompts.slice(0, 3).map((prompt, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setMessage(prompt)}
                          className="px-3 py-1 text-xs bg-purple-50 text-purple-700 rounded-full hover:bg-purple-100 transition-colors"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                <Button
                  type="submit"
                  disabled={!message.trim() || isLoading || safeDocuments.length === 0}
                  size="lg"
                  isLoading={isLoading}
                  className="h-14 px-6"
                >
                  {isLoading ? (
                    'Thinking...'
                  ) : (
                    <>
                      <span className="hidden sm:inline mr-2">Send</span>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </>
                  )}
                </Button>
              </div>
              
              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-2xl">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <span className="text-sm text-red-700">{error.message}</span>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Upload Document</h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <FileUpload 
              onFileSelect={handleFileUpload}
              isLoading={documentsLoading}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ModernChatInterface;