import { useState, useCallback } from 'react';
import { apiService } from '../services/api';
import type { 
  SearchQuery, 
  SearchResponse, 
  SearchResult,
  AppError 
} from '../types';

export interface UseSearchReturn {
  results: SearchResult[];
  isLoading: boolean;
  error: AppError | null;
  lastQuery: SearchQuery | null;
  searchDocuments: (query: SearchQuery) => Promise<void>;
  search: (query: SearchQuery) => Promise<void>;
  similaritySearch: (query: SearchQuery) => Promise<void>;
  vectorSearch: (query: SearchQuery) => Promise<void>;
  qdrantSearch: (query: SearchQuery) => Promise<void>;
  qdrantFilteredSearch: (query: SearchQuery) => Promise<void>;
  clearResults: () => void;
  clearError: () => void;
}

export const useSearch = (): UseSearchReturn => {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [lastQuery, setLastQuery] = useState<SearchQuery | null>(null);

  const handleSearchResponse = (response: SearchResponse) => {
    setResults(response.results);
  };

  const performSearch = useCallback(async (
    query: SearchQuery, 
    searchFunction: (q: SearchQuery) => Promise<any>
  ) => {
    if (!query.query.trim()) return;

    setIsSearching(true);
    setError(null);
    setLastQuery(query);

    try {
      const response = await searchFunction(query);
      
      if (response.success && response.data) {
        handleSearchResponse(response.data);
      } else {
        throw new Error(response.message || 'Search failed');
      }
    } catch (err) {
      const appError = err as AppError;
      setError(appError);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const search = useCallback(async (query: SearchQuery) => {
    return performSearch(query, apiService.search.bind(apiService));
  }, [performSearch]);

  const similaritySearch = useCallback(async (query: SearchQuery) => {
    return performSearch(query, apiService.similaritySearch.bind(apiService));
  }, [performSearch]);

  const vectorSearch = useCallback(async (query: SearchQuery) => {
    return performSearch(query, apiService.vectorSearch.bind(apiService));
  }, [performSearch]);

  const qdrantSearch = useCallback(async (query: SearchQuery) => {
    return performSearch(query, apiService.qdrantSearch.bind(apiService));
  }, [performSearch]);

  const qdrantFilteredSearch = useCallback(async (query: SearchQuery) => {
    return performSearch(query, apiService.qdrantFilteredSearch.bind(apiService));
  }, [performSearch]);

  const searchDocuments = useCallback(async (query: SearchQuery) => {
    // Route to appropriate search method based on query type
    switch (query.type) {
      case 'vector':
        return vectorSearch(query);
      case 'text':
        return search(query);
      case 'hybrid':
        return qdrantFilteredSearch(query);
      case 'semantic':
      default:
        return qdrantSearch(query);
    }
  }, [search, vectorSearch, qdrantSearch, qdrantFilteredSearch]);

  const clearResults = useCallback(() => {
    setResults([]);
    setLastQuery(null);
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    results,
    isLoading: isSearching,
    error,
    lastQuery,
    searchDocuments,
    search,
    similaritySearch,
    vectorSearch,
    qdrantSearch,
    qdrantFilteredSearch,
    clearResults,
    clearError,
  };
};