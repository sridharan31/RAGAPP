import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { apiService } from '../../services/api';
import type { AIProvider, AIProviderType, AIProviderSettings } from '../../types';

interface AIProviderSelectorProps {
  onProviderChange?: (provider: AIProviderType) => void;
  className?: string;
}

const AIProviderSelector: React.FC<AIProviderSelectorProps> = ({ 
  onProviderChange,
  className = ''
}) => {
  const [selectedProvider, setSelectedProvider] = useState<AIProviderType>('google');
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [configs, setConfigs] = useState<AIProviderSettings['providers']>({
    ollama: { baseUrl: 'http://localhost:11434', model: 'llama3.2' },
    openai: { apiKey: '', model: 'gpt-3.5-turbo' },
    google: { apiKey: '', model: 'gemini-flash-latest' }
  });

  const defaultProviders: AIProvider[] = [
    {
      id: 'google',
      name: 'Google Gemini',
      description: 'Google\'s powerful Gemini AI model',
      icon: '🧠',
      status: 'configured'
    },
    {
      id: 'ollama',
      name: 'Local Ollama',
      description: 'Run AI models locally on your machine',
      icon: '💻',
      status: 'unavailable'
    },
    {
      id: 'openai',
      name: 'OpenAI GPT',
      description: 'ChatGPT and GPT models from OpenAI',
      icon: '🚀',
      status: 'unavailable'
    }
  ];

  useEffect(() => {
    checkProvidersStatus();
    loadSavedSettings();
  }, []);

  const loadSavedSettings = () => {
    try {
      const saved = localStorage.getItem('aiProviderSettings');
      if (saved) {
        const settings: AIProviderSettings = JSON.parse(saved);
        setSelectedProvider(settings.selectedProvider);
        setConfigs(settings.providers);
      }
    } catch (error) {
      console.warn('Failed to load AI provider settings:', error);
    }
  };

  const saveSettings = (provider: AIProviderType, newConfigs: AIProviderSettings['providers']) => {
    try {
      const settings: AIProviderSettings = {
        selectedProvider: provider,
        providers: newConfigs
      };
      localStorage.setItem('aiProviderSettings', JSON.stringify(settings));
    } catch (error) {
      console.warn('Failed to save AI provider settings:', error);
    }
  };

  const checkProvidersStatus = async () => {
    setIsLoading(true);
    try {
      const updatedProviders = await Promise.all(
        defaultProviders.map(async (provider) => {
          try {
            const response = await apiService.checkProviderStatus(provider.id as AIProviderType);
            return {
              ...provider,
              status: response.success ? 'available' : 'unavailable'
            } as AIProvider;
          } catch (error) {
            return {
              ...provider,
              status: 'unavailable'
            } as AIProvider;
          }
        })
      );
      setProviders(updatedProviders);
    } catch (error) {
      console.error('Failed to check provider status:', error);
      setProviders(defaultProviders);
    }
    setIsLoading(false);
  };

  const handleProviderSelect = (providerId: AIProviderType) => {
    setSelectedProvider(providerId);
    saveSettings(providerId, configs);
    onProviderChange?.(providerId);
  };

  const handleConfigUpdate = async (providerId: AIProviderType, config: any) => {
    const newConfigs = {
      ...configs,
      [providerId]: { ...configs[providerId], ...config }
    };
    setConfigs(newConfigs);
    saveSettings(selectedProvider, newConfigs);

    // Update provider configuration on backend
    try {
      await apiService.updateProviderConfig(providerId, config);
      await checkProvidersStatus();
    } catch (error) {
      console.error('Failed to update provider config:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <Badge variant="success" size="sm">Available</Badge>;
      case 'configured':
        return <Badge variant="success" size="sm">Configured</Badge>;
      case 'unavailable':
        return <Badge variant="warning" size="sm">Unavailable</Badge>;
      default:
        return <Badge variant="default" size="sm">Unknown</Badge>;
    }
  };

  const renderConfigSection = () => {
    if (!showConfig) return null;

    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
        <h4 className="font-medium text-gray-900 mb-3">Provider Configuration</h4>
        
        {selectedProvider === 'ollama' && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ollama URL
              </label>
              <input
                type="text"
                value={configs.ollama.baseUrl}
                onChange={(e) => handleConfigUpdate('ollama', { baseUrl: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="http://localhost:11434"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Model
              </label>
              <input
                type="text"
                value={configs.ollama.model}
                onChange={(e) => handleConfigUpdate('ollama', { model: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="llama3.2"
              />
            </div>
          </div>
        )}

        {selectedProvider === 'openai' && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key
              </label>
              <input
                type="password"
                value={configs.openai.apiKey}
                onChange={(e) => handleConfigUpdate('openai', { apiKey: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="sk-..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Model
              </label>
              <select
                value={configs.openai.model}
                onChange={(e) => handleConfigUpdate('openai', { model: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-4-turbo">GPT-4 Turbo</option>
              </select>
            </div>
          </div>
        )}

        {selectedProvider === 'google' && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key
              </label>
              <input
                type="password"
                value={configs.google.apiKey}
                onChange={(e) => handleConfigUpdate('google', { apiKey: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Your Google AI API Key"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Model
              </label>
              <select
                value={configs.google.model}
                onChange={(e) => handleConfigUpdate('google', { model: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="gemini-flash-latest">Gemini Flash (Latest)</option>
                <option value="gemini-pro">Gemini Pro</option>
                <option value="gemini-pro-vision">Gemini Pro Vision</option>
              </select>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">AI Provider</h3>
        <div className="flex items-center space-x-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowConfig(!showConfig)}
            className="text-xs"
          >
            {showConfig ? 'Hide Config' : 'Configure'}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={checkProvidersStatus}
            isLoading={isLoading}
            className="text-xs"
          >
            Refresh
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {providers.map((provider) => (
          <div
            key={provider.id}
            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
              selectedProvider === provider.id
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => handleProviderSelect(provider.id as AIProviderType)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{provider.icon}</span>
                <div>
                  <h4 className="font-medium text-gray-900">{provider.name}</h4>
                  <p className="text-sm text-gray-600">{provider.description}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {getStatusBadge(provider.status)}
                {selectedProvider === provider.id && (
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {renderConfigSection()}

      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-700">
          <span className="font-medium">Currently using:</span> {
            providers.find(p => p.id === selectedProvider)?.name || 'Unknown'
          }
        </p>
      </div>
    </Card>
  );
};

export default AIProviderSelector;