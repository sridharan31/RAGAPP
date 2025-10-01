import React, { useState } from 'react';
import { useSearch } from '../../hooks/useSearch';
import { useDocuments } from '../../hooks/useDocuments';
import type { SearchResult } from '../../types';

const SearchInterface: React.FC = () => {
  const [query, setQuery] = useState('');
  const [selectedSearchType, setSelectedSearchType] = useState<'text' | 'semantic' | 'vector' | 'hybrid'>('semantic');
  const [selectedDocument, setSelectedDocument] = useState<string>('');
  
  const {
    results,
    isLoading,
    error,
    searchDocuments,
    clearResults,
  } = useSearch();
  
  const { documents } = useDocuments();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const searchQuery = {
      query: query.trim(),
      type: selectedSearchType,
      filters: selectedDocument ? { documentIds: [selectedDocument] } : undefined,
      limit: 10,
    };

    await searchDocuments(searchQuery);
  };

  const highlightText = (text: string, query: string): React.ReactNode => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 px-1 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Intelligent Search</h2>
          <p className="text-sm text-gray-600">
            Search through your uploaded documents using different AI-powered methods
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-6xl mx-auto space-y-6">
          
          {/* Search Form */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <form onSubmit={handleSearch} className="space-y-4">
              
              {/* Search Input */}
              <div>
                <label htmlFor="search-query" className="block text-sm font-medium text-gray-700 mb-2">
                  Search Query
                </label>
                <textarea
                  id="search-query"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Enter your search query..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  rows={3}
                />
              </div>

              {/* Search Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Search Type */}
                <div>
                  <label htmlFor="search-type" className="block text-sm font-medium text-gray-700 mb-2">
                    Search Type
                  </label>
                  <select
                    id="search-type"
                    value={selectedSearchType}
                    onChange={(e) => setSelectedSearchType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="semantic">Semantic Search</option>
                    <option value="vector">Vector Search</option>
                    <option value="text">Text Search</option>
                    <option value="hybrid">Hybrid Search</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {selectedSearchType === 'semantic' && 'AI-powered contextual search'}
                    {selectedSearchType === 'vector' && 'Embedding-based similarity search'}
                    {selectedSearchType === 'text' && 'Traditional keyword search'}
                    {selectedSearchType === 'hybrid' && 'Combines multiple search methods'}
                  </p>
                </div>

                {/* Document Filter */}
                <div>
                  <label htmlFor="document-filter" className="block text-sm font-medium text-gray-700 mb-2">
                    Document Filter
                  </label>
                  <select
                    id="document-filter"
                    value={selectedDocument}
                    onChange={(e) => setSelectedDocument(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Documents</option>
                    {documents.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.originalName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Search Button */}
              <div className="flex justify-between items-center">
                <button
                  type="submit"
                  disabled={!query.trim() || isLoading}
                  className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Searching...' : 'Search'}
                </button>
                
                {results.length > 0 && (
                  <button
                    type="button"
                    onClick={clearResults}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Clear Results
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <div>
                  <h4 className="text-sm font-medium text-red-800">Search Error</h4>
                  <p className="text-sm text-red-700 mt-1">{error.message}</p>
                </div>
              </div>
            </div>
          )}

          {/* Search Results */}
          {results.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  Search Results ({results.length})
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Found {results.length} relevant passages using {selectedSearchType} search
                </p>
              </div>
              
              <div className="divide-y divide-gray-200">
                {results.map((result, index) => (
                  <SearchResultCard 
                    key={result.id} 
                    result={result} 
                    query={query}
                    index={index + 1}
                    highlightText={highlightText}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && results.length === 0 && query && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                🔍
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Found</h3>
              <p className="text-gray-600">
                Try different keywords or search type. Make sure you have documents uploaded.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Search Result Card Component
const SearchResultCard: React.FC<{
  result: SearchResult;
  query: string;
  index: number;
  highlightText: (text: string, query: string) => React.ReactNode;
}> = ({ result, query, index, highlightText }) => {
  
  const formatScore = (score: number): string => {
    return (score * 100).toFixed(1);
  };

  return (
    <div className="p-6 hover:bg-gray-50 transition-colors">
      <div className="space-y-3">
        
        {/* Result Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-medium">
              {index}
            </div>
            <div>
              <h4 className="font-medium text-gray-900">{result.document.originalName}</h4>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span>Relevance: {formatScore(result.relevanceScore)}%</span>
                {result.chunk?.metadata.page && (
                  <span>Page {result.chunk.metadata.page}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="pl-11">
          <div className="text-gray-800 leading-relaxed">
            {highlightText(result.content, query)}
          </div>
          
          {/* Highlights */}
          {result.highlights && result.highlights.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="text-xs font-medium text-gray-600 mb-2">
                Key Highlights:
              </div>
              <div className="space-y-1">
                {result.highlights.map((highlight, idx) => (
                  <div key={idx} className="text-sm bg-yellow-50 p-2 rounded border-l-4 border-yellow-200">
                    {highlightText(highlight, query)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchInterface;