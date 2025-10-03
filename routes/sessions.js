// routes/sessions.js
const express = require('express');
const router = express.Router();
const SessionController = require('../controllers/sessionController');

// GET /sessions - Get all sessions for the user
router.get('/', SessionController.getSessions);

// GET /sessions/history - Get conversation history for a specific session
router.get('/history', SessionController.getSessionHistory);

// POST /sessions/new - Create a new session
router.post('/new', SessionController.createSession);

// POST /sessions/cleanup - Remove empty sessions
router.post('/cleanup', SessionController.cleanupSessions);

// DELETE /sessions/:sessionId - Delete a session and all its conversations
router.delete('/:sessionId', SessionController.deleteSession);

module.exports = router;