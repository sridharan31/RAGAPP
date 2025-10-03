// routes/conversations.js
const express = require('express');
const router = express.Router();
const ConversationController = require('../controllers/conversationController');

// POST /conversation - Handle new conversation message
router.post('/', ConversationController.handleConversation);

module.exports = router;