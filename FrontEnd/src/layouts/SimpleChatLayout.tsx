import React from 'react';
import ModernChatInterface from '../features/chat/ModernChatInterface';
import ErrorBoundary from '../components/common/ErrorBoundary';

const SimpleChatLayout: React.FC = () => {
  return (
    <div className="h-screen bg-gray-50 overflow-hidden">
      <ErrorBoundary>
        <ModernChatInterface />
      </ErrorBoundary>
    </div>
  );
};

export default SimpleChatLayout;