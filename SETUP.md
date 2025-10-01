# RAG Application Setup Guide

This guide will help you set up and run the complete RAG (Retrieval-Augmented Generation) application with Node.js backend and React frontend.

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Docker (for MongoDB and Qdrant)
- Google Gemini API Key

## Backend Setup

### 1. Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DB=mongodb://localhost:27017/rag_doc

# Google Gemini API
GOOGLE_API_KEY=your_google_api_key_here

# Qdrant Vector Database
QDRANT_URL=http://localhost:6333

# Server Configuration
PORT=3000
NODE_ENV=development
```

### 2. Start Required Services

Start MongoDB and Qdrant using Docker:

```bash
# MongoDB
docker run -d --name mongodb -p 27017:27017 mongo:latest

# Qdrant Vector Database
docker run -d --name qdrant -p 6333:6333 qdrant/qdrant
```

### 3. Install Backend Dependencies

```bash
npm install
```

### 4. Start Backend Server

```bash
npm start
# or for development with auto-reload
npm run dev
```

The backend server will run on `http://localhost:3000`

## Frontend Setup

### 1. Navigate to Frontend Directory

```bash
cd FrontEnd
```

### 2. Install Frontend Dependencies

```bash
npm install
```

### 3. Start Frontend Development Server

```bash
npm run dev
```

The frontend will run on `http://localhost:5173`

## Features

### 📄 Document Management
- **PDF Upload**: Drag-and-drop or browse to upload PDF files (up to 10MB)
- **Document Processing**: Automatic text extraction and embedding generation
- **Document List**: View all uploaded documents with metadata
- **Status Tracking**: Real-time upload and processing status

### 💬 AI Chat Interface
- **Conversational AI**: Chat with your documents using Google Gemini
- **Document Selection**: Choose specific documents to chat with or search all
- **Session Management**: Maintain conversation context across messages
- **Source Citations**: See which document chunks were used to answer questions
- **Message History**: Persistent chat history within sessions

### 🔍 Intelligent Search
- **Multiple Search Types**:
  - **Semantic Search**: AI-powered contextual understanding
  - **Vector Search**: Embedding-based similarity matching
  - **Text Search**: Traditional keyword searching
  - **Hybrid Search**: Combines multiple search methods
- **Document Filtering**: Search within specific documents
- **Relevance Scoring**: See how relevant each result is to your query
- **Source Highlighting**: Visual highlighting of search terms in results

### 🏗️ Advanced Architecture
- **Vector Database**: Qdrant for fast semantic search
- **Hybrid Storage**: MongoDB for metadata + Qdrant for embeddings
- **Real-time Updates**: Live status updates during processing
- **Error Handling**: Graceful error handling with user-friendly messages
- **Responsive Design**: Mobile-friendly interface built with Tailwind CSS

## API Endpoints

### Document Management
- `POST /Load-document` - Upload and process PDF document
- `GET /documents` - List all uploaded documents
- `GET /documents/:name` - Get specific document details

### Chat & Conversation
- `POST /conversation` - Send message to AI assistant
  - Supports document selection for context-specific responses
  - Maintains session history
  - Returns source citations

### Search Capabilities
- `GET /search?q=query` - Full-text search
- `GET /vector-search?q=query` - Vector similarity search
- `GET /qdrant-search?q=query` - Semantic search via Qdrant
- `GET /qdrant-filtered-search?q=query&documentName=name` - Filtered search
- `GET /similarity-search?q=query` - MongoDB similarity search

### System Health
- `GET /qdrant-health` - Check Qdrant service status

## Usage Flow

1. **Upload Documents**: Start by uploading PDF documents through the Documents tab
2. **Wait for Processing**: Allow time for text extraction and embedding generation
3. **Start Chatting**: Use the Chat tab to ask questions about your documents
4. **Advanced Search**: Use the Search tab for detailed document exploration
5. **Manage Documents**: Monitor and manage your document library

## Troubleshooting

### Backend Issues
- Ensure MongoDB and Qdrant are running
- Check that the Google API key is valid
- Verify environment variables are set correctly

### Frontend Issues
- Ensure the backend server is running on port 3000
- Check browser console for any JavaScript errors
- Verify network connectivity between frontend and backend

### Document Processing Issues
- Ensure PDF files are valid and not corrupted
- Check file size limits (max 10MB)
- Verify Qdrant service is accessible

## Development Notes

### Project Structure
```
RAGAPP/
├── routes/              # Backend API routes
├── services/           # Backend services (Qdrant, etc.)
├── uploads/           # Uploaded PDF storage
├── FrontEnd/          # React frontend application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── features/      # Feature-specific components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── services/      # API service layer
│   │   ├── types/         # TypeScript type definitions
│   │   └── utils/         # Utility functions
│   └── public/
└── docker-compose.yml # Docker services configuration
```

### Key Technologies
- **Backend**: Node.js, Express, MongoDB, Qdrant, Google Gemini API
- **Frontend**: React, TypeScript, Tailwind CSS, Vite
- **Vector DB**: Qdrant for semantic search and embeddings
- **Database**: MongoDB for document metadata and chat sessions

## Future Enhancements

- [ ] User authentication and authorization
- [ ] Multi-language document support
- [ ] Advanced document analytics dashboard
- [ ] Real-time collaborative features
- [ ] Document versioning and change tracking
- [ ] Custom AI model integration options