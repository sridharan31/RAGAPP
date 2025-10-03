// routes/embedings.js
require("dotenv").config();

// Import AI provider system
let getActiveProvider = null;
let getProviderConfig = null;

try {
  const aiProviders = require('./ai-providers');
  getActiveProvider = aiProviders.getActiveProvider;
  getProviderConfig = aiProviders.getProviderConfig;
} catch (error) {
  console.warn('AI provider system not available, using fallback embedding logic');
}

// Google GenAI embedding function using the example format you provided
async function createGoogleEmbedding(contents, config = null) {
  try {
    const { GoogleGenerativeAI } = require("@google/generative-ai");
    
    const apiKey = config ? config.apiKey : process.env.GOOGLE_API_KEY;
    
    if (!apiKey || apiKey === 'your_google_api_key_here') {
      throw new Error('Google API key not configured');
    }
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    
    // Handle both single text and array of texts
    const inputContents = Array.isArray(contents) ? contents : [contents];
    
    const embeddings = [];
    for (const content of inputContents) {
      const result = await model.embedContent(content);
      embeddings.push(result.embedding.values);
    }
    
    console.log(`Google GenAI embeddings created for ${embeddings.length} items`);
    return Array.isArray(contents) ? embeddings : embeddings[0];
  } catch (error) {
    console.error(`Google GenAI embedding error:`, error.message);
    throw error;
  }
}

// Simple hash-based embedding function for testing
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}

// Generate a simple embedding vector
function generateSimpleEmbedding(text, dimensions = 768) {
  const words = text.toLowerCase().split(/\s+/);
  const embedding = new Array(dimensions).fill(0);
  
  // Create a simple embedding based on word characteristics
  words.forEach((word, index) => {
    const wordHash = simpleHash(word);
    const wordLength = word.length;
    
    for (let i = 0; i < dimensions; i++) {
      const position = (wordHash + i + index) % dimensions;
      embedding[position] += (wordLength + wordHash % 100) / 100;
    }
  });
  
  // Normalize the embedding
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map(val => magnitude > 0 ? val / magnitude : 0);
}

// OpenAI embedding function
async function createOpenAIEmbedding(text, config) {
  const OpenAI = require("openai");
  const client = new OpenAI({ apiKey: config.apiKey });
  
  const response = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  
  return response.data[0].embedding;
}

// Ollama embedding function (if available)
async function createOllamaEmbedding(text, config) {
  const axios = require('axios');
  
  try {
    const response = await axios.post(`${config.baseUrl}/api/embeddings`, {
      model: config.model || 'llama2', // Default embedding model
      prompt: text
    });
    
    return response.data.embedding || generateSimpleEmbedding(text);
  } catch (error) {
    console.warn(`Ollama embedding failed: ${error.message}, using simple embedding`);
    return generateSimpleEmbedding(text);
  }
}

// Provider-aware embedding creation
async function createEmbeddingWithProvider(text, providerId = null, providerConfig = null) {
  // Use specified provider or get active one
  const activeProvider = providerId || (getActiveProvider ? getActiveProvider() : 'google');
  const config = providerConfig || (getProviderConfig ? getProviderConfig(activeProvider) : null);
  
  console.log(`Creating embedding for text using ${activeProvider} provider: "${text.substring(0, 100)}..."`);
  
  try {
    switch (activeProvider) {
      case 'openai':
        if (config && config.apiKey) {
          const embedding = await createOpenAIEmbedding(text, config);
          console.log(`OpenAI embedding created successfully, length: ${embedding.length}`);
          return embedding;
        }
        break;
        
      case 'google':
        if (config && config.apiKey) {
          const embedding = await createGoogleEmbedding(text);
          console.log(`Google GenAI embedding created successfully, length: ${embedding.length}`);
          return embedding;
        }
        break;
        
      case 'ollama':
        if (config && config.baseUrl) {
          const embedding = await createOllamaEmbedding(text, config);
          console.log(`Ollama embedding created successfully, length: ${embedding.length}`);
          return embedding;
        }
        break;
    }
  } catch (error) {
    console.warn(`${activeProvider} embedding failed: ${error.message}, trying fallback`);
  }
  
  // Fallback logic - try other providers
  console.log('Trying fallback embedding providers...');
  return await createEmbeddingFallback(text);
}

async function createEmbeddingFallback(text) {
  // Try OpenAI first
  try {
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.length > 10) {
      const OpenAI = require("openai");
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      const response = await client.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
      });
      
      const embedding = response.data[0].embedding;
      console.log(`OpenAI fallback embedding created successfully, length: ${embedding.length}`);
      return embedding;
    }
  } catch (error) {
    console.log(`OpenAI fallback failed: ${error.message}, trying Google GenAI...`);
  }
  
  // Try Google GenAI as second option
  try {
    if (process.env.GOOGLE_API_KEY && process.env.GOOGLE_API_KEY.length > 10) {
      const { GoogleGenerativeAI } = require("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
      
      const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
      const result = await model.embedContent(text);
      
      const embedding = result.embedding.values;
      console.log(`Google GenAI fallback embedding created successfully, length: ${embedding.length}`);
      return embedding;
    }
  } catch (error) {
    console.log(`Google GenAI fallback failed: ${error.message}, falling back to simple embedding`);
  }
  
  // Final fallback to simple embedding
  const embedding = generateSimpleEmbedding(text);
  console.log(`Simple embedding created successfully, length: ${embedding.length}`);
  return embedding;
}

// Main embedding function (backward compatibility)
async function createEmbedding(text) {
  return await createEmbeddingWithProvider(text);
}

module.exports = createEmbedding;
module.exports.createEmbeddingWithProvider = createEmbeddingWithProvider;
module.exports.createGoogleEmbedding = createGoogleEmbedding;
module.exports.createOpenAIEmbedding = createOpenAIEmbedding;
module.exports.createOllamaEmbedding = createOllamaEmbedding;
module.exports.createGoogleEmbedding = createGoogleEmbedding;
