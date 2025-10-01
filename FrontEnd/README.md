# RAG Frontend Application

A modern React frontend for Retrieval-Augmented Generation (RAG) system with Node.js backend integration.

## 🚀 Features

- **Interactive Chat Interface**: Real-time conversation with AI assistant
- **Document Management**: Upload, process, and manage PDF documents 
- **Intelligent Search**: Multi-modal search (text, semantic, vector-based)
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **TypeScript Support**: Full type safety and modern development experience
- **Error Boundaries**: Graceful error handling and recovery

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + HeadlessUI
- **HTTP Client**: Axios with interceptors
- **State Management**: React Context API + useReducer
- **Routing**: React Router v6
- **Build Tool**: Vite with hot module replacement

### Project Structure
```
src/
├── components/      # Reusable UI components
├── features/        # Domain-specific features (chat, search, documents)
├── hooks/           # Custom hooks for API calls and state logic
├── layouts/         # Shared layout components
├── pages/           # Route-based pages
├── providers/       # React context providers
├── services/        # API service layer
├── types/           # TypeScript type definitions
└── utils/           # Helper functions
```

## 🛠️ Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- RAG backend server running on localhost:3000

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start development server**
   ```bash
   npm run dev
   ```

3. **Open in browser**
   Navigate to `http://localhost:5173`

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🔌 API Integration

### Backend Endpoints
- `POST /conversation` - Chat with AI assistant
- `POST /Load-document` - Upload PDF documents
- `POST /search` - Text and semantic search
- `POST /vector-search` - Vector-based search
- `GET /qdrant-health` - System health check

## 🎨 UI Components

### Features
- **Chat Interface**: Real-time messaging
- **Document Manager**: Upload and organize PDFs
- **Search Interface**: Multi-modal search capabilities
- **Responsive Design**: Mobile-first approach

## 🚀 Development

This project uses:
- **React 18** with modern hooks and patterns
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Vite** for fast development and building
- **Axios** for API communication

Ready to integrate with your RAG backend system!
  },
])
```
