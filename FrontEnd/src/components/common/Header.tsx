import React from 'react';

interface HeaderProps {
  onSidebarToggle: () => void;
  currentTab: 'chat' | 'search' | 'documents';
}

const Header: React.FC<HeaderProps> = ({ onSidebarToggle, currentTab }) => {
  const getTabInfo = () => {
    switch (currentTab) {
      case 'chat':
        return { title: 'AI Chat Assistant', icon: '🤖', subtitle: 'Intelligent document conversations' };
      case 'search':
        return { title: 'Smart Search', icon: '🔍', subtitle: 'Advanced semantic search' };
      case 'documents':
        return { title: 'Document Manager', icon: '📚', subtitle: 'Upload and organize files' };
      default:
        return { title: 'RAG Assistant', icon: '🚀', subtitle: 'AI-powered document assistant' };
    }
  };

  const tabInfo = getTabInfo();

  return (
    <header className="bg-white/95 backdrop-blur-sm border-b border-gray-200/50 px-6 py-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onSidebarToggle}
            className="p-2 rounded-xl hover:bg-gray-100 transition-all duration-200 hover:scale-105"
            title="Toggle Sidebar"
          >
            <span className="text-gray-600 text-xl">☰</span>
          </button>
          
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white text-lg">{tabInfo.icon}</span>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                {tabInfo.title}
              </h1>
              <p className="text-sm text-gray-500">{tabInfo.subtitle}</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-6">
          {/* Connection Status */}
          <div className="flex items-center space-x-3 bg-green-50 px-4 py-2 rounded-xl border border-green-200">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50"></div>
            <div>
              <span className="text-sm font-semibold text-green-800">System Online</span>
              <div className="text-xs text-green-600">Ollama Ready</div>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="flex items-center space-x-2">
            <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200">
              <span title="Settings">⚙️</span>
            </button>
            <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200">
              <span title="Help">❓</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;