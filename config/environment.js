// config/environment.js
const path = require('path');

const config = {
  // Server Configuration
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Database Configuration
  MONGODB_URI: process.env.DB || 'mongodb://admin:password123@localhost:27017/rag_doc?authSource=admin',
  
  // Qdrant Configuration
  QDRANT_URL: process.env.QDRANT_URL || 'http://localhost:6333',
  QDRANT_COLLECTION_NAME: process.env.QDRANT_COLLECTION_NAME || 'documents_vectors',

  // File Upload Configuration
  UPLOAD_DIR: path.join(__dirname, '../uploads'),
  MAX_FILE_SIZE: 25 * 1024 * 1024, // 25MB
  ALLOWED_FILE_TYPES: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain',
    'text/markdown',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
    'text/csv',
    'application/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ],

  // AI Configuration
  DEFAULT_AI_PROVIDER: 'google',
  EMBEDDING_VECTOR_SIZE: 768,

  // Session Configuration
  SESSION_CLEANUP_INTERVAL: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  MAX_SESSION_HISTORY: 1000, // Maximum number of sessions to keep

  // Search Configuration
  DEFAULT_SEARCH_LIMIT: 5,
  MAX_SEARCH_LIMIT: 50,

  // Logging Configuration
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  LOG_FILE_MAX_SIZE: 10 * 1024 * 1024, // 10MB

  // Security Configuration
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 100, // limit each IP to 100 requests per windowMs

  // Development Configuration
  isDevelopment: () => config.NODE_ENV === 'development',
  isProduction: () => config.NODE_ENV === 'production',
  isTest: () => config.NODE_ENV === 'test'
};

module.exports = config;