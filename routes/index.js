// routes/index.js - Refactored and organized
const express = require('express');
const router = express.Router();
const { createEmbeddingWithProvider } = require("./embedings");
const QdrantService = require("../services/qdrant");
const config = require('../config/environment');
const logger = require('../utils/logger');

// Import AI provider functions with fallback handling
let getActiveProvider, getProviderConfig;
try {
  const aiProviders = require('./ai-providers');
  getActiveProvider = aiProviders.getActiveProvider;
  getProviderConfig = aiProviders.getProviderConfig;
} catch (error) {
  logger.warn('AI providers module not found, using default embedding provider');
  getActiveProvider = () => 'google';
  getProviderConfig = () => null;
}

// Import route modules
const sessionRoutes = require('./sessions');
const conversationRoutes = require('./conversations');
const documentRoutes = require('./documents');

// Mount route modules
router.use('/sessions', sessionRoutes);
router.use('/conversation', conversationRoutes);
router.use('/documents', documentRoutes);

// Legacy document upload endpoint (for backward compatibility)
router.use('/Load-document', documentRoutes);
router.use('/uploaded-files', documentRoutes);

/* GET home page */
router.get('/', async function(req, res, next) {
  try {
    logger.info('Home page accessed');
    
    // Simple health check response
    res.json({
      message: 'RAG Application API',
      version: '1.0.0',
      status: 'running',
      timestamp: new Date().toISOString(),
      endpoints: {
        sessions: '/sessions',
        conversations: '/conversation', 
        documents: '/documents',
        search: '/search',
        embeddings: '/embeddings',
        health: '/health'
      }
    });
  } catch (error) {
    logger.error('Error in home route', { error: error.message });
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Health check endpoint
router.get('/health', async function(req, res, next) {
  try {
    const qdrant = new QdrantService();
    const qdrantHealth = await qdrant.healthCheck();
    
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        api: 'healthy',
        qdrant: qdrantHealth.status,
        environment: config.NODE_ENV
      },
      uptime: process.uptime(),
      memory: process.memoryUsage()
    };
    
    res.json(health);
    
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    res.status(503).json({
      status: 'error',
      message: 'Service unhealthy',
      error: error.message
    });
  }
});

// Embedding endpoints
router.get('/embeddings', async function(req, res, next) {
  try {
    const text = req.query.text;
    
    if (!text) {
      return res.status(400).json({ error: 'Text parameter is required' });
    }
    
    const activeProvider = getActiveProvider();
    const providerConfig = getProviderConfig(activeProvider);
    const embedding = await createEmbeddingWithProvider(text, activeProvider, providerConfig);
    
    logger.info('Embedding created', { provider: activeProvider, textLength: text.length });
    
    res.json({ 
      embedding,
      provider: activeProvider,
      vectorSize: embedding.length
    });
  } catch (error) {
    logger.error('Error creating embedding', { error: error.message });
    res.status(500).json({
      error: 'Failed to create embedding',
      message: error.message
    });
  }
});

// Google embeddings endpoint
router.get('/google-embeddings', async function(req, res, next) {
  try {
    const defaultTexts = [
      'What is the meaning of life?',
      'What is the purpose of existence?', 
      'How do I bake a cake?'
    ];
    
    let contents = defaultTexts;
    
    if (req.query.texts) {
      try {
        contents = JSON.parse(req.query.texts);
      } catch (parseError) {
        contents = req.query.texts.split(',');
      }
    } else if (req.query.text) {
      contents = [req.query.text];
    }
    
    const embeddingsModule = require("./embedings");
    const createGoogleEmbedding = embeddingsModule.createGoogleEmbedding;
    const embeddings = await createGoogleEmbedding(contents);
    
    logger.info('Google embeddings created', { count: contents.length });
    
    res.json({ 
      inputs: contents,
      embeddings: embeddings,
      count: Array.isArray(embeddings) ? embeddings.length : 1,
      provider: 'google'
    });
  } catch (error) {
    logger.error('Error creating Google embeddings', { error: error.message });
    res.status(500).json({ 
      error: "Failed to create Google embeddings", 
      message: error.message 
    });
  }
});

// Search routes
router.get('/search', async function(req, res, next) {
  try {
    const query = req.query.q;
    const limit = parseInt(req.query.limit) || config.DEFAULT_SEARCH_LIMIT;
    
    if (!query) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }
    
    if (limit > config.MAX_SEARCH_LIMIT) {
      return res.status(400).json({ 
        error: `Limit cannot exceed ${config.MAX_SEARCH_LIMIT}` 
      });
    }
    
    const qdrant = new QdrantService();
    const qdrantHealth = await qdrant.healthCheck();
    
    if (qdrantHealth.status !== 'healthy') {
      return res.status(503).json({ 
        error: "Search service unavailable", 
        message: "Vector database is not available" 
      });
    }

    const activeProvider = getActiveProvider();
    const providerConfig = getProviderConfig(activeProvider);
    const queryEmbedding = await createEmbeddingWithProvider(query, activeProvider, providerConfig);
    
    const searchResults = await qdrant.search(queryEmbedding, limit);
    
    logger.info('Search completed', { query: query.substring(0, 50), results: searchResults.length });
    
    res.json({
      query: query,
      results: searchResults.map(result => ({
        id: result.id,
        content: result.content,
        score: result.score,
        name: result.metadata?.document_name || 'Unknown',
        timestamp: result.metadata?.timestamp
      })),
      count: searchResults.length,
      searchType: "text"
    });
    
  } catch (error) {
    logger.error('Search failed', { error: error.message });
    res.status(500).json({ 
      error: "Search failed", 
      message: error.message 
    });
  }
});

// Similarity search route
router.get('/similarity-search', async function(req, res, next) {
  try {
    const query = req.query.q;
    const limit = parseInt(req.query.limit) || config.DEFAULT_SEARCH_LIMIT;
    
    if (!query) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }
    
    const qdrant = new QdrantService();
    const qdrantHealth = await qdrant.healthCheck();
    
    if (qdrantHealth.status !== 'healthy') {
      return res.status(503).json({ 
        error: "Search service unavailable", 
        message: "Vector database is not available" 
      });
    }

    const activeProvider = getActiveProvider();
    const providerConfig = getProviderConfig(activeProvider);
    const queryEmbedding = await createEmbeddingWithProvider(query, activeProvider, providerConfig);
    
    const searchResults = await qdrant.search(queryEmbedding, limit);
    
    logger.info('Similarity search completed', { query: query.substring(0, 50), results: searchResults.length });
    
    res.json({
      query: query,
      results: searchResults.map(result => ({
        id: result.id,
        content: result.content,
        score: result.score,
        name: result.metadata?.document_name || 'Unknown',
        timestamp: result.metadata?.timestamp
      })),
      count: searchResults.length,
      searchType: "similarity"
    });
    
  } catch (error) {
    logger.error('Similarity search failed', { error: error.message });
    res.status(500).json({ 
      error: "Similarity search failed", 
      message: error.message 
    });
  }
});

// Qdrant-specific search routes
router.get('/qdrant-search', async function(req, res, next) {
  try {
    const query = req.query.q;
    const limit = parseInt(req.query.limit) || config.DEFAULT_SEARCH_LIMIT;
    
    if (!query) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }
    
    const qdrant = new QdrantService();
    const qdrantHealth = await qdrant.healthCheck();
    
    if (qdrantHealth.status !== 'healthy') {
      return res.status(503).json({ 
        error: "Qdrant service unavailable", 
        message: "Vector database is not available" 
      });
    }
    
    const activeProvider = getActiveProvider();
    const providerConfig = getProviderConfig(activeProvider);
    const queryVector = await createEmbeddingWithProvider(query, activeProvider, providerConfig);
    
    const results = await qdrant.search(queryVector, limit);
    
    logger.info('Qdrant search completed', { query: query.substring(0, 50), results: results.length });
    
    res.json({
      query: query,
      results: results,
      count: results.length,
      search_type: "qdrant_vector"
    });
    
  } catch (error) {
    logger.error('Qdrant search failed', { error: error.message });
    res.status(500).json({ 
      error: "Qdrant search failed", 
      message: error.message 
    });
  }
});

// Filtered Qdrant search
router.get('/qdrant-filtered-search', async function(req, res, next) {
  try {
    const query = req.query.q;
    const documentName = req.query.document_name;
    const dateFrom = req.query.date_from;
    const dateTo = req.query.date_to;
    const limit = parseInt(req.query.limit) || config.DEFAULT_SEARCH_LIMIT;
    
    if (!query) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }
    
    const qdrant = new QdrantService();
    const qdrantHealth = await qdrant.healthCheck();
    
    if (qdrantHealth.status !== 'healthy') {
      return res.status(503).json({ 
        error: "Qdrant service unavailable", 
        message: "Vector database is not available" 
      });
    }
    
    const activeProvider = getActiveProvider();
    const providerConfig = getProviderConfig(activeProvider);
    const queryVector = await createEmbeddingWithProvider(query, activeProvider, providerConfig);
    
    // Build filters
    const filters = {};
    if (documentName) filters.document_name = documentName;
    if (dateFrom) filters.date_from = dateFrom;
    if (dateTo) filters.date_to = dateTo;
    
    const results = await qdrant.searchWithFilter(queryVector, filters, limit);
    
    logger.info('Filtered Qdrant search completed', { 
      query: query.substring(0, 50), 
      filters, 
      results: results.length 
    });
    
    res.json({
      query: query,
      filters: filters,
      results: results,
      count: results.length,
      search_type: "qdrant_filtered_vector"
    });
    
  } catch (error) {
    logger.error('Filtered Qdrant search failed', { error: error.message });
    res.status(500).json({ 
      error: "Filtered Qdrant search failed", 
      message: error.message 
    });
  }
});

// Qdrant health check
router.get('/qdrant-health', async function(req, res, next) {
  try {
    const qdrant = new QdrantService();
    const health = await qdrant.healthCheck();
    
    if (health.status === 'healthy') {
      res.json({
        status: 'healthy',
        message: 'Qdrant is operational',
        details: health
      });
    } else {
      res.status(503).json(health);
    }
  } catch (error) {
    logger.error('Qdrant health check failed', { error: error.message });
    res.status(503).json({ 
      status: 'error', 
      message: error.message 
    });
  }
});

module.exports = router;