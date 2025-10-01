<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## RAG Frontend Development Guidelines

This is a React frontend application for a RAG (Retrieval-Augmented Generation) system with Node.js backend integration.

### Project Status:
- [x] Verify that the copilot-instructions.md file in the .github directory is created.
- [x] Clarify Project Requirements - React frontend for RAG system with chat, document upload, and search features
- [x] Scaffold the Project - Vite React TypeScript project created
- [x] Customize the Project - Added folder structure, components, hooks, services, and providers
- [x] Install Required Extensions - No additional extensions required
- [x] Compile the Project - Build successful with TypeScript and Tailwind
- [x] Create and Run Task - Development server task available
- [x] Launch the Project - Ready to run with npm run dev
- [x] Ensure Documentation is Complete - Comprehensive README and guidelines added

### Architecture Guidelines:
- Use TypeScript for type safety
- Implement container/presentational component pattern
- Use custom hooks for API integration (useChat, useDocuments, useSearch)
- Implement proper error boundaries and loading states
- Follow modern React patterns with Context API for state management

### API Integration:
- Backend endpoints: /Load-document, /conversation, /search, /similarity-search, /vector-search
- Use Axios for HTTP requests
- Implement proper error handling and retry logic
- Support real-time chat functionality

### UI/UX Guidelines:
- Chat-first interface with conversational UI
- Responsive design with mobile support
- Accessibility compliance (WCAG 2.1)
- Progressive loading and skeleton states
- Modern design patterns with Tailwind CSS

### Component Structure:
- features/ - domain-specific features (chat, search, documents)
- components/ - reusable UI components
- hooks/ - custom hooks for API calls and state logic
- services/ - API service layer
- providers/ - React context providers
- layouts/ - shared layout components