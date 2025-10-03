// tests/mock-servers/simple-test-server.js - Mock server for testing
const express = require('express');
const cors = require('cors');
const app = express();

// Enable CORS
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// In-memory storage
let sessions = new Map();
let conversations = [];

// Test endpoint
app.get('/test', (req, res) => {
  res.json({ message: 'Mock server is running!' });
});

// GET /sessions
app.get('/sessions', (req, res) => {
  console.log('Getting sessions...');
  const sessionsArray = Array.from(sessions.values())
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  
  console.log('Sessions:', sessionsArray);
  res.json({
    sessions: sessionsArray,
    total: sessionsArray.length
  });
});

// POST /sessions/new
app.post('/sessions/new', (req, res) => {
  console.log('Creating new session...');
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();
  
  const newSession = {
    id: sessionId,
    createdAt: now,
    updatedAt: now,
    messageCount: 0,
    lastMessage: ''
  };
  
  sessions.set(sessionId, newSession);
  
  console.log('New session created:', sessionId);
  res.json({
    success: true,
    sessionId: sessionId,
    session: newSession
  });
});

// POST /conversation
app.post('/conversation', (req, res) => {
  console.log('Adding conversation...');
  const { message, sessionId } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }
  
  // Create session if it doesn't exist
  let currentSessionId = sessionId;
  if (!currentSessionId) {
    currentSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    sessions.set(currentSessionId, {
      id: currentSessionId,
      createdAt: now,
      updatedAt: now,
      messageCount: 0,
      lastMessage: ''
    });
  }
  
  // Add conversation
  const conversation = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    sessionId: currentSessionId,
    message: message,
    role: 'user',
    timestamp: new Date().toISOString()
  };
  
  conversations.push(conversation);
  
  // Update session
  const session = sessions.get(currentSessionId);
  if (session) {
    session.messageCount++;
    session.lastMessage = message;
    session.updatedAt = conversation.timestamp;
    sessions.set(currentSessionId, session);
  }
  
  // Mock AI response
  const aiResponse = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    sessionId: currentSessionId,
    message: `AI response to: ${message}`,
    role: 'assistant',
    timestamp: new Date().toISOString()
  };
  
  conversations.push(aiResponse);
  
  res.json({
    success: true,
    sessionId: currentSessionId,
    response: aiResponse.message,
    conversations: conversations.filter(c => c.sessionId === currentSessionId)
  });
});

// DELETE /sessions/:sessionId
app.delete('/sessions/:sessionId', (req, res) => {
  const sessionId = req.params.sessionId;
  console.log('Deleting session:', sessionId);
  
  // Remove session
  if (sessions.has(sessionId)) {
    sessions.delete(sessionId);
    // Remove conversations for this session
    conversations = conversations.filter(c => c.sessionId !== sessionId);
    
    res.json({ success: true, message: 'Session deleted' });
  } else {
    res.status(404).json({ error: 'Session not found' });
  }
});

// Start server function
function startMockServer(port = 3001) {
  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      console.log(`🚀 Mock test server running on http://localhost:${port}`);
      console.log('Available endpoints:');
      console.log('- GET /test');
      console.log('- GET /sessions');
      console.log('- POST /sessions/new');
      console.log('- POST /conversation');
      console.log('- DELETE /sessions/:sessionId');
      resolve(server);
    });
  });
}

// Export for use in tests
module.exports = {
  app,
  startMockServer
};

// Run if called directly
if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  startMockServer(PORT);
}