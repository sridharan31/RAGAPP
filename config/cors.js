// config/cors.js
const corsConfig = {
  origin: [
    'http://localhost:5173', 
    'http://localhost:5174', 
    'http://localhost:3000', 
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

module.exports = corsConfig;