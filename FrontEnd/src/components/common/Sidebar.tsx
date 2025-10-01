import React from 'react';

interface SidebarProps {
  activeTab: 'chat' | 'search' | 'documents';
  onTabChange: (tab: 'chat' | 'search' | 'documents') => void;
  isOpen: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, isOpen }) => {
  const tabs = [
    { id: 'chat' as const, label: 'AI Chat', icon: '🤖', description: 'Intelligent conversations' },
    { id: 'search' as const, label: 'Smart Search', icon: '🔍', description: 'Find anything instantly' },
    { id: 'documents' as const, label: 'Documents', icon: '�', description: 'Manage your files' },
  ];

  if (!isOpen) return null;

  return (
    <div className="w-72 bg-gradient-to-b from-slate-900 via-gray-900 to-slate-800 text-white flex flex-col shadow-2xl">
      {/* Header */}
      <div className="p-6 border-b border-gray-700/50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-lg">🚀</span>
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              RAG Assistant
            </h1>
            <p className="text-xs text-gray-400">Powered by AI & Ollama</p>
          </div>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`w-full group flex items-center px-4 py-4 rounded-xl text-left transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg transform scale-[1.02]'
                  : 'text-gray-300 hover:bg-white/10 hover:text-white hover:transform hover:scale-[1.01]'
              }`}
            >
              <div className="flex items-center space-x-4 w-full">
                <div className={`text-2xl transition-transform group-hover:scale-110 ${
                  activeTab === tab.id ? 'animate-pulse' : ''
                }`}>
                  {tab.icon}
                </div>
                <div className="flex-1">
                  <div className="font-semibold">{tab.label}</div>
                  <div className={`text-xs ${
                    activeTab === tab.id ? 'text-indigo-100' : 'text-gray-500'
                  }`}>
                    {tab.description}
                  </div>
                </div>
                {activeTab === tab.id && (
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Status Card */}
        <div className="mt-8 p-4 bg-gradient-to-r from-green-900/30 to-emerald-900/30 rounded-xl border border-green-700/50">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <div>
              <div className="text-sm font-semibold text-green-300">System Online</div>
              <div className="text-xs text-green-400">All services running</div>
            </div>
          </div>
        </div>
      </nav>
      
      {/* Footer */}
      <div className="p-4 border-t border-gray-700/50 bg-gradient-to-r from-gray-800/50 to-slate-800/50">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400">RAG Assistant</p>
            <p className="text-xs text-gray-500">v2.0.0 • Enhanced UI</p>
          </div>
          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">AI</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;