import React, { useState } from 'react';
import { useAppContext } from '../providers/AppProvider';
import ChatInterface from '../features/chat/ChatInterface';
import DocumentManager from '../features/documents/DocumentManager';
import SearchInterface from '../features/search/SearchInterface';
import Sidebar from '../components/common/Sidebar';
import Header from '../components/common/Header';
import ErrorBoundary from '../components/common/ErrorBoundary';

type ActiveTab = 'chat' | 'search' | 'documents';

const MainLayout: React.FC = () => {
  const { state } = useAppContext();
  const [activeTab, setActiveTab] = useState<ActiveTab>('chat');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const renderContent = () => {
    switch (activeTab) {
      case 'chat':
        return <ChatInterface />;
      case 'search':
        return <SearchInterface />;
      case 'documents':
        return <DocumentManager />;
      default:
        return <ChatInterface />;
    }
  };

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <Sidebar 
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <Header 
          onSidebarToggle={() => setSidebarOpen(!sidebarOpen)}
          currentTab={activeTab}
        />

        {/* Content */}
        <main className="flex-1 overflow-hidden">
          <ErrorBoundary>
            {state.isLoading && (
              <div className="fixed top-0 left-0 right-0 z-50">
                <div className="bg-blue-500 text-white text-center py-2 text-sm">
                  Loading...
                </div>
              </div>
            )}
            {renderContent()}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;