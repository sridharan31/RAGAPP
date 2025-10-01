import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { AppState, User, DocumentMetadata, ChatSession, AppError } from '../types';

// Action types
type AppAction =
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_CURRENT_SESSION'; payload: ChatSession | null }
  | { type: 'SET_DOCUMENTS'; payload: DocumentMetadata[] }
  | { type: 'ADD_DOCUMENT'; payload: DocumentMetadata }
  | { type: 'REMOVE_DOCUMENT'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: AppError | null }
  | { type: 'CLEAR_ERROR' };

// Initial state
const initialState: AppState = {
  user: null,
  currentSession: null,
  documents: [],
  isLoading: false,
  error: null,
};

// Reducer
const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'SET_CURRENT_SESSION':
      return { ...state, currentSession: action.payload };
    case 'SET_DOCUMENTS':
      return { ...state, documents: action.payload };
    case 'ADD_DOCUMENT':
      return { ...state, documents: [...state.documents, action.payload] };
    case 'REMOVE_DOCUMENT':
      return { 
        ...state, 
        documents: state.documents.filter(doc => doc.id !== action.payload) 
      };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
};

// Context type
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  // Convenience methods
  setUser: (user: User | null) => void;
  setCurrentSession: (session: ChatSession | null) => void;
  setDocuments: (documents: DocumentMetadata[]) => void;
  addDocument: (document: DocumentMetadata) => void;
  removeDocument: (documentId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: AppError | null) => void;
  clearError: () => void;
}

// Create context
const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider component
interface AppProviderProps {
  children: React.ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Convenience methods
  const setUser = (user: User | null) => {
    dispatch({ type: 'SET_USER', payload: user });
  };

  const setCurrentSession = (session: ChatSession | null) => {
    dispatch({ type: 'SET_CURRENT_SESSION', payload: session });
  };

  const setDocuments = (documents: DocumentMetadata[]) => {
    dispatch({ type: 'SET_DOCUMENTS', payload: documents });
  };

  const addDocument = (document: DocumentMetadata) => {
    dispatch({ type: 'ADD_DOCUMENT', payload: document });
  };

  const removeDocument = (documentId: string) => {
    dispatch({ type: 'REMOVE_DOCUMENT', payload: documentId });
  };

  const setLoading = (loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  };

  const setError = (error: AppError | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  // Load user preferences on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('rag_user');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setUser(user);
      } catch (error) {
        console.error('Failed to parse saved user:', error);
        localStorage.removeItem('rag_user');
      }
    }
  }, []);

  // Save user to localStorage when it changes
  useEffect(() => {
    if (state.user) {
      localStorage.setItem('rag_user', JSON.stringify(state.user));
    } else {
      localStorage.removeItem('rag_user');
    }
  }, [state.user]);

  const value: AppContextType = {
    state,
    dispatch,
    setUser,
    setCurrentSession,
    setDocuments,
    addDocument,
    removeDocument,
    setLoading,
    setError,
    clearError,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

// Custom hook to use the app context
export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

export default AppContext;