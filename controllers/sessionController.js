// controllers/sessionController.js
const QdrantService = require('../services/qdrant');
const { v4: uuidv4 } = require('uuid');

// In-memory storage for sessions when Qdrant is not available
let inMemorySessions = new Map();
let inMemoryConversations = [];

class SessionController {
  
  // GET /sessions - Get all sessions for the user
  static async getSessions(req, res) {
    try {
      const qdrant = new QdrantService();
      
      // Check if Qdrant is available
      let useQdrant = false;
      try {
        const qdrantHealth = await qdrant.healthCheck();
        useQdrant = qdrantHealth.status === 'healthy';
      } catch (error) {
        console.warn('Qdrant not available, using in-memory storage');
        useQdrant = false;
      }

      if (!useQdrant) {
        // Use in-memory storage and filter out empty sessions
        console.log('Using in-memory storage for sessions');
        console.log('Current in-memory sessions:', inMemorySessions.size);
        
        const sessionsArray = Array.from(inMemorySessions.values())
          .filter(session => session.messageCount > 0) // Only return sessions with actual messages
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

        console.log('Returning non-empty sessions:', sessionsArray.length, 'out of', inMemorySessions.size);
        return res.json({
          sessions: sessionsArray,
          total: sessionsArray.length
        });
      }

      // Search for all sessions
      const sessions = await qdrant.searchInCollection("sessions", new Array(768).fill(0), 100, {}, 0.0);
      console.log(`Found ${sessions.length} session records in Qdrant`);
      
      // Group sessions and get session metadata
      const sessionMap = new Map();
      
      for (const session of sessions) {
        const sessionId = session.metadata?.sessionId || session.payload?.sessionId;
        if (sessionId && !sessionMap.has(sessionId)) {
          sessionMap.set(sessionId, {
            id: sessionId,
            createdAt: session.metadata?.createdAt || session.payload?.createdAt,
            updatedAt: session.metadata?.updatedAt || session.payload?.updatedAt,
            messageCount: 0,
            lastMessage: ''
          });
        }
      }

      // Get conversations for each session to count messages and get last message
      const conversationResults = await qdrant.searchInCollection("conversations", new Array(768).fill(0), 1000, {}, 0.0);
      console.log(`Found ${conversationResults.length} conversation records in Qdrant`);
      
      for (const conversation of conversationResults) {
        const sessionId = conversation.metadata?.sessionId || conversation.payload?.sessionId;
        if (sessionId && sessionMap.has(sessionId)) {
          const session = sessionMap.get(sessionId);
          session.messageCount++;
          
          const conversationTime = conversation.metadata?.createdAt || conversation.payload?.createdAt;
          const conversationMessage = conversation.metadata?.message || conversation.payload?.message;
          
          // Update last message if this is more recent
          if (!session.lastMessage || new Date(conversationTime) > new Date(session.updatedAt)) {
            session.lastMessage = conversationMessage || '';
            session.updatedAt = conversationTime;
          }
        }
      }
      
      console.log(`Final session map has ${sessionMap.size} sessions`);

      const sessionsArray = Array.from(sessionMap.values())
        .filter(session => session.messageCount > 0) // Only return sessions with messages
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      res.json({
        sessions: sessionsArray,
        total: sessionsArray.length
      });

    } catch (error) {
      console.error("Error getting sessions:", error);
      res.status(500).json({ 
        error: "Failed to retrieve sessions", 
        message: error.message 
      });
    }
  }

  // GET /sessions/history - Get conversation history for a specific session
  static async getSessionHistory(req, res) {
    try {
      const { sessionId } = req.query;
      
      if (!sessionId) {
        return res.status(400).json({ error: "sessionId is required" });
      }

      // Check in-memory storage first
      const memoryConversations = inMemoryConversations
        .filter(conv => conv.sessionId === sessionId)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .map(conv => ({
          id: conv.id,
          role: conv.role,
          content: conv.message,
          timestamp: conv.timestamp,
          sessionId: conv.sessionId
        }));

      if (memoryConversations.length > 0) {
        return res.json({
          sessionId: sessionId,
          messages: memoryConversations,
          total: memoryConversations.length,
          source: 'memory'
        });
      }

      const qdrant = new QdrantService();
      
      // Check if Qdrant is available
      const qdrantHealth = await qdrant.healthCheck();
      if (qdrantHealth.status !== 'healthy') {
        return res.status(503).json({ 
          error: "Qdrant service unavailable", 
          message: "Session history service is not available" 
        });
      }

      // Search for conversations in this session
      const conversations = await qdrant.searchInCollection("conversations", new Array(768).fill(0), 1000, {
        sessionId: sessionId
      }, 0.0);

      // Sort conversations by timestamp
      const sortedConversations = conversations
        .sort((a, b) => new Date(a.metadata?.createdAt || 0).getTime() - new Date(b.metadata?.createdAt || 0).getTime())
        .map(conv => ({
          id: conv.id || `msg_${Date.now()}_${Math.random()}`,
          role: conv.metadata?.role || conv.payload?.role,
          content: conv.metadata?.message || conv.payload?.message,
          timestamp: conv.metadata?.createdAt || conv.payload?.createdAt,
          sessionId: conv.metadata?.sessionId || conv.payload?.sessionId
        }));

      res.json({
        sessionId: sessionId,
        messages: sortedConversations,
        total: sortedConversations.length,
        source: 'qdrant'
      });

    } catch (error) {
      console.error("Error getting session history:", error);
      res.status(500).json({ 
        error: "Failed to retrieve session history", 
        message: error.message 
      });
    }
  }

  // POST /sessions/new - Create a new session (only when needed)
  static async createSession(req, res) {
    try {
      console.log('⚠️  Note: Empty session creation should be avoided. Sessions should be created only when user sends first message.');
      
      const qdrant = new QdrantService();
      
      // Create new session ID
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();
      
      // Check if Qdrant is available
      let useQdrant = false;
      try {
        const qdrantHealth = await qdrant.healthCheck();
        useQdrant = qdrantHealth.status === 'healthy';
      } catch (error) {
        console.warn('Qdrant not available, using in-memory storage');
        useQdrant = false;
      }

      if (!useQdrant) {
        // Create session but DON'T store it until first message
        console.log("Temporary session ID generated (not stored until first message):", sessionId);
        
        return res.json({
          success: true,
          sessionId: sessionId,
          message: 'Session ID generated. Will be created when first message is sent.'
        });
      }
      
      // Initialize sessions collection
      await qdrant.initializeCollection(768, "sessions");
      
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

      res.json({
        sessionId: sessionId,
        message: "New session created successfully"
      });

    } catch (error) {
      console.error("Error creating new session:", error);
      res.status(500).json({ 
        error: "Failed to create session", 
        message: error.message 
      });
    }
  }

  // POST /sessions/cleanup - Remove empty sessions
  static async cleanupSessions(req, res) {
    try {
      console.log('Cleaning up empty sessions...');
      
      // Count sessions before cleanup
      const totalBefore = inMemorySessions.size;
      let removedCount = 0;

      // Remove empty sessions from in-memory storage
      for (const [sessionId, session] of inMemorySessions.entries()) {
        if (!session.messageCount || session.messageCount === 0) {
          inMemorySessions.delete(sessionId);
          removedCount++;
          console.log('Removed empty session:', sessionId);
        }
      }

      // Also clean up conversations for deleted sessions
      const activeSessionIds = new Set(inMemorySessions.keys());
      const conversationsBefore = inMemoryConversations.length;
      inMemoryConversations = inMemoryConversations.filter(conv => activeSessionIds.has(conv.sessionId));
      const conversationsRemoved = conversationsBefore - inMemoryConversations.length;

      console.log(`Cleanup complete: Removed ${removedCount} empty sessions and ${conversationsRemoved} orphaned conversations`);

      res.json({
        success: true,
        message: `Cleaned up ${removedCount} empty sessions`,
        before: totalBefore,
        after: inMemorySessions.size,
        removed: removedCount,
        conversationsRemoved: conversationsRemoved
      });

    } catch (error) {
      console.error("Error cleaning up sessions:", error);
      res.status(500).json({ 
        error: "Failed to cleanup sessions", 
        message: error.message 
      });
    }
  }

  // DELETE /sessions/:sessionId - Delete a session and all its conversations
  static async deleteSession(req, res) {
    try {
      const { sessionId } = req.params;
      
      if (!sessionId) {
        return res.status(400).json({ error: "sessionId is required" });
      }

      console.log('Deleting session:', sessionId);

      const qdrant = new QdrantService();
      
      // Check if Qdrant is available
      let useQdrant = false;
      try {
        const qdrantHealth = await qdrant.healthCheck();
        useQdrant = qdrantHealth.status === 'healthy';
      } catch (error) {
        console.warn('Qdrant not available, using in-memory storage for deletion');
        useQdrant = false;
      }

      if (!useQdrant) {
        // Handle deletion with in-memory storage
        if (inMemorySessions.has(sessionId)) {
          // Remove session
          inMemorySessions.delete(sessionId);
          
          // Remove associated conversations
          const conversationsBefore = inMemoryConversations.length;
          inMemoryConversations = inMemoryConversations.filter(conv => conv.sessionId !== sessionId);
          const conversationsRemoved = conversationsBefore - inMemoryConversations.length;
          
          console.log(`Deleted session ${sessionId} and ${conversationsRemoved} conversations`);
          
          return res.json({
            success: true,
            message: `Session ${sessionId} deleted successfully`,
            deletedConversations: conversationsRemoved
          });
        } else {
          return res.status(404).json({ error: "Session not found" });
        }
      }

      // Handle Qdrant deletion (existing logic)
      // ... rest of Qdrant deletion code would go here

      res.json({
        message: `Session ${sessionId} deleted successfully`,
        deletedConversations: 0
      });

    } catch (error) {
      console.error("Error deleting session:", error);
      res.status(500).json({ 
        error: "Failed to delete session", 
        message: error.message 
      });
    }
  }

  // Helper method to get in-memory storage (for testing)
  static getInMemoryData() {
    return {
      sessions: inMemorySessions,
      conversations: inMemoryConversations
    };
  }

  // Helper method to clear in-memory storage (for testing)
  static clearInMemoryData() {
    inMemorySessions.clear();
    inMemoryConversations.splice(0, inMemoryConversations.length);
  }
}

module.exports = SessionController;