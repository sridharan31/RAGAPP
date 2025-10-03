// controllers/conversationController.js
const QdrantService = require('../services/qdrant');
const { createEmbeddingWithProvider } = require("../routes/embedings");
const { v4: uuidv4 } = require('uuid');

// Import session controller to access in-memory storage
const SessionController = require('./sessionController');

// Import AI provider functions with fallback handling
let getActiveProvider, getProviderConfig, generateAIResponse;
try {
  const aiProviders = require('../routes/ai-providers');
  getActiveProvider = aiProviders.getActiveProvider;
  getProviderConfig = aiProviders.getProviderConfig;
  generateAIResponse = aiProviders.generateAIResponse;
} catch (error) {
  console.warn('AI providers module not found, using defaults');
  getActiveProvider = () => 'google';
  getProviderConfig = () => null;
  generateAIResponse = async (message, context) => `AI response to: ${message}`;
}

class ConversationController {

  // Helper function to handle in-memory conversations
  static async handleInMemoryConversation(req, res, sessionId, message, selectedDocument) {
    const { sessions: inMemorySessions, conversations: inMemoryConversations } = SessionController.getInMemoryData();
    const now = new Date().toISOString();
    
    // Only create session when there's actual message content
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create new session with the first message
      const newSession = {
        id: sessionId,
        createdAt: now,
        updatedAt: now,
        messageCount: 0,
        lastMessage: '',
        selectedDocument: selectedDocument || 'default'
      };
      
      inMemorySessions.set(sessionId, newSession);
      console.log('Created new session with first message:', sessionId);
    }

    // Add user message to conversations
    const userMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId: sessionId,
      message: message,
      role: 'user',
      timestamp: now,
      type: 'conversation'
    };
    
    inMemoryConversations.push(userMessage);

    // Update session metadata
    const session = inMemorySessions.get(sessionId);
    if (session) {
      session.messageCount = (session.messageCount || 0) + 1;
      session.lastMessage = message;
      session.updatedAt = now;
      inMemorySessions.set(sessionId, session);
    }

    console.log(`Added user message to session ${sessionId}:`, message.substring(0, 100));

    // Generate AI response
    try {
      const aiResponseText = await generateAIResponse(message, '');
      
      const aiResponse = {
        id: `msg_${Date.now() + 1}_${Math.random().toString(36).substr(2, 9)}`,
        sessionId: sessionId,
        message: aiResponseText,
        role: 'assistant',
        timestamp: new Date().toISOString(),
        type: 'conversation'
      };
      
      inMemoryConversations.push(aiResponse);

      // Update session with AI response
      if (session) {
        session.messageCount = (session.messageCount || 0) + 1;
        session.lastMessage = aiResponse.message;
        session.updatedAt = aiResponse.timestamp;
        inMemorySessions.set(sessionId, session);
      }

      console.log(`Session ${sessionId} now has ${session?.messageCount || 0} messages`);

      return res.json({
        success: true,
        sessionId: sessionId,
        message: aiResponse.message,
        userMessage: userMessage,
        aiMessage: aiResponse,
        sessionInfo: session,
        sources: [],
        context_documents: 0
      });
    } catch (aiError) {
      console.error('AI response error:', aiError);
      
      // Return fallback response
      const fallbackResponse = {
        id: `msg_${Date.now() + 1}_${Math.random().toString(36).substr(2, 9)}`,
        sessionId: sessionId,
        message: `I received your message: "${message}". However, I'm currently having trouble generating a proper response.`,
        role: 'assistant',
        timestamp: new Date().toISOString(),
        type: 'conversation'
      };
      
      inMemoryConversations.push(fallbackResponse);
      
      return res.json({
        success: true,
        sessionId: sessionId,
        message: fallbackResponse.message,
        userMessage: userMessage,
        aiMessage: fallbackResponse,
        sessionInfo: session,
        sources: [],
        context_documents: 0,
        warning: 'AI service temporarily unavailable'
      });
    }
  }

  // POST /conversation - Handle conversation
  static async handleConversation(req, res) {
    try {
      let sessionId = req.body.sessionId;
      const message = req.body.message;
      const selectedDocument = req.body.selectedDocument; // Optional document filter
      
      if (!message || message.trim() === '') {
        return res.status(400).json({ error: "Message is required and cannot be empty" });
      }

      console.log('Processing conversation:', { 
        sessionId, 
        message: message.substring(0, 50) + '...', 
        selectedDocument 
      });

      const qdrant = new QdrantService();
      
      // Check if Qdrant is available
      let useQdrant = false;
      try {
        const qdrantHealth = await qdrant.healthCheck();
        useQdrant = qdrantHealth.status === 'healthy';
      } catch (error) {
        console.warn('Qdrant not available, using in-memory storage for conversation');
        useQdrant = false;
      }

      if (!useQdrant) {
        // Handle conversation with in-memory storage
        return await ConversationController.handleInMemoryConversation(req, res, sessionId, message, selectedDocument);
      }

      // Initialize collections
      await qdrant.initializeCollection(768, "sessions");
      await qdrant.initializeCollection(768, "conversations");
      
      if (!sessionId) {
        // Create new session in Qdrant
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Create a dummy vector for session storage
        const sessionVector = new Array(768).fill(0);
        
        // Generate UUID for Qdrant point ID
        const sessionPointId = uuidv4();
        
        // Store session in Qdrant
        await qdrant.addDocumentToCollection("sessions", sessionPointId, sessionVector, {
          sessionId: sessionId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          type: "session"
        });
        
        console.log("New session created:", sessionId);
      } else {
        // Verify session exists in Qdrant
        try {
          const sessionExists = await qdrant.searchInCollection("sessions", new Array(768).fill(0), 1, {
            sessionId: sessionId
          }, 0.0);
          
          if (sessionExists.length === 0) {
            console.warn(`Session ${sessionId} not found, creating new session`);
            sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          }
        } catch (error) {
          console.error("Error verifying session:", error);
        }
      }

      // Create embedding for the message using selected AI provider
      console.log('Creating embedding for message:', message);
      const activeProvider = getActiveProvider();
      const providerConfig = getProviderConfig(activeProvider);
      const messageVector = await createEmbeddingWithProvider(message, activeProvider, providerConfig);
      console.log('Embedding created, vector length:', messageVector.length);
      
      // Store user message in Qdrant conversations collection
      const userMessagePointId = uuidv4();
      try {
        await qdrant.addDocumentToCollection("conversations", userMessagePointId, messageVector, {
          sessionId: sessionId,
          message: message,
          role: "user",
          createdAt: new Date().toISOString(),
          type: "conversation"
        });
      } catch (error) {
        console.error("Error storing user message:", error);
      }

      // Perform vector search on documents collection
      let finalResult = [];
      
      try {
        console.log('Performing vector search...');
        const limit = parseInt(req.query.limit) || 5; // Default limit of 5 sources
        
        if (selectedDocument && selectedDocument !== 'all') {
          // Search with document filter
          const searchResults = await qdrant.searchWithFilter(messageVector, {
            document_name: selectedDocument
          }, limit);
          finalResult = searchResults;
          console.log(`Found ${finalResult.length} filtered results for document: ${selectedDocument}`);
        } else {
          // Search all documents
          const searchResults = await qdrant.search(messageVector, limit);
          finalResult = searchResults;
          console.log(`Found ${finalResult.length} search results across all documents`);
        }
        
        // Log search results for debugging
        finalResult.forEach((result, index) => {
          console.log(`Result ${index + 1}:`, {
            score: result.score,
            documentName: result.metadata?.document_name || 'Unknown',
            textPreview: (result.content || result.text || '').substring(0, 100)
          });
        });
        
      } catch (qdrantError) {
        console.error("Qdrant search error:", qdrantError);
        finalResult = [];
      }

      // Generate AI response using the selected provider
      const contextText = finalResult.map(doc => doc.content || doc.text || '').join("\n");
      const chat = await generateAIResponse(message, contextText);

      // Store AI response in Qdrant conversations collection
      const aiResponseVector = await createEmbeddingWithProvider(chat, activeProvider, providerConfig);
      const aiMessagePointId = uuidv4();
      try {
        await qdrant.addDocumentToCollection("conversations", aiMessagePointId, aiResponseVector, {
          sessionId: sessionId,
          message: chat,
          role: "assistant",
          createdAt: new Date().toISOString(),
          type: "conversation"
        });
      } catch (error) {
        console.error("Error storing AI response:", error);
      }

      return res.json({
        sessionId: sessionId,
        message: chat,
        context_documents: finalResult.length,
        selectedDocument: selectedDocument,
        sources: finalResult.map(doc => ({
          documentName: doc.metadata?.document_name || 'Unknown',
          relevanceScore: doc.score,
          excerpt: (doc.content || doc.text || '').substring(0, 200) + ((doc.content || doc.text || '').length > 200 ? '...' : ''),
          timestamp: doc.metadata?.timestamp
        })),
        search_type: selectedDocument ? 'qdrant_filtered' : 'qdrant'
      });
      
    } catch (error) {
      console.error("Error in conversation:", error);
      res.status(500).json({
        error: "Internal server error",
        message: error.message
      });
    }
  }
}

module.exports = ConversationController;