import React, { useState } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import AIProviderSelector from '../components/ai/AIProviderSelector';
import { apiService } from '../services/api';
import type { AIProviderType } from '../types';

const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'providers' | 'general'>('providers');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const tabs = [
    { id: 'providers' as const, label: 'AI Providers', icon: '🤖' },
    { id: 'general' as const, label: 'General', icon: '⚙️' }
  ];

  const handleProviderChange = async (provider: AIProviderType) => {
    setIsLoading(true);
    try {
      await apiService.setActiveProvider(provider);
      setMessage(`Successfully switched to ${provider}`);
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Failed to change provider:', error);
      setMessage('Failed to change provider');
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-2">Configure your AI assistant and application preferences</p>
        </div>

        {/* Status Message */}
        {message && (
          <div className="mb-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-green-700 font-medium">{message}</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64">
            <Card className="p-4">
              <nav className="space-y-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-purple-50 text-purple-700 border border-purple-200'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">{tab.icon}</span>
                      <span className="font-medium">{tab.label}</span>
                    </div>
                  </button>
                ))}
              </nav>
            </Card>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {activeTab === 'providers' && (
              <div className="space-y-6">
                <Card className="p-6">
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">AI Provider Configuration</h2>
                    <p className="text-gray-600">
                      Select and configure your preferred AI provider for chat responses.
                    </p>
                  </div>

                  <AIProviderSelector 
                    onProviderChange={handleProviderChange}
                    className="border-0 shadow-none"
                  />

                  {isLoading && (
                    <div className="mt-4 flex items-center justify-center">
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                        <span className="text-sm text-gray-600">Updating provider...</span>
                      </div>
                    </div>
                  )}
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Provider Information</h3>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">🧠 Google Gemini</h4>
                      <p className="text-sm text-gray-600 mb-2">
                        Google's advanced AI model with excellent reasoning capabilities.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="info" size="sm">Fast responses</Badge>
                        <Badge variant="info" size="sm">Multimodal</Badge>
                        <Badge variant="info" size="sm">Cloud-based</Badge>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">💻 Local Ollama</h4>
                      <p className="text-sm text-gray-600 mb-2">
                        Run AI models locally on your machine for privacy and offline use.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="success" size="sm">Private</Badge>
                        <Badge variant="success" size="sm">Offline capable</Badge>
                        <Badge variant="warning" size="sm">Requires setup</Badge>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">🚀 OpenAI GPT</h4>
                      <p className="text-sm text-gray-600 mb-2">
                        Industry-leading language models including GPT-4 and GPT-3.5.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="info" size="sm">High quality</Badge>
                        <Badge variant="info" size="sm">Multiple models</Badge>
                        <Badge variant="info" size="sm">Reliable</Badge>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {activeTab === 'general' && (
              <Card className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">General Settings</h2>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Theme
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500">
                      <option value="system">System</option>
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Language
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500">
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                    </select>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="notifications"
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                    <label htmlFor="notifications" className="ml-2 block text-sm text-gray-700">
                      Enable notifications
                    </label>
                  </div>

                  <div className="pt-4">
                    <Button variant="primary">
                      Save Settings
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;