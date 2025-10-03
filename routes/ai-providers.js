// routes/ai-providers.js
require("dotenv").config();
const express = require('express');
const router = express.Router();
const axios = require('axios');

// Store for AI provider configurations (in production, use a database)
const providerConfigs = {
  ollama: {
    baseUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'llama3.2',
    available: false
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
    available: false
  },
  google: {
    apiKey: process.env.GOOGLE_API_KEY || '',
    model: process.env.GOOGLE_MODEL || 'gemini-flash-latest',
    available: true // Default to true since we already have this configured
  }
};

// Currently active provider
let activeProvider = process.env.ACTIVE_AI_PROVIDER || 'google';

// Check Ollama status
async function checkOllamaStatus(baseUrl = 'http://localhost:11434') {
  try {
    const response = await axios.get(`${baseUrl}/api/tags`, { timeout: 3000 });
    return {
      available: true,
      models: response.data.models?.map(m => m.name) || []
    };
  } catch (error) {
    return { available: false, error: error.message };
  }
}

// Check OpenAI status
async function checkOpenAIStatus(apiKey) {
  if (!apiKey) {
    return { available: false, error: 'No API key provided' };
  }
  
  try {
    const response = await axios.get('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      timeout: 5000
    });
    return {
      available: true,
      models: response.data.data?.map(m => m.id) || []
    };
  } catch (error) {
    return { available: false, error: error.response?.data?.error?.message || error.message };
  }
}

// Check Google AI status
async function checkGoogleAIStatus(apiKey) {
  if (!apiKey) {
    return { available: false, error: 'No API key provided' };
  }
  
  try {
    const { GoogleGenerativeAI } = require("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    
    // Test with a simple prompt
    const result = await model.generateContent("Test");
    return {
      available: true,
      models: ['gemini-pro', 'gemini-flash-latest', 'gemini-pro-vision']
    };
  } catch (error) {
    return { available: false, error: error.message };
  }
}

// GET /ai-providers/:providerId/status - Check provider status
router.get('/:providerId/status', async (req, res) => {
  const { providerId } = req.params;
  
  try {
    let status;
    
    switch (providerId) {
      case 'ollama':
        status = await checkOllamaStatus(providerConfigs.ollama.baseUrl);
        break;
      case 'openai':
        status = await checkOpenAIStatus(providerConfigs.openai.apiKey);
        break;
      case 'google':
        status = await checkGoogleAIStatus(providerConfigs.google.apiKey);
        break;
      default:
        return res.status(404).json({ error: 'Provider not found' });
    }
    
    // Update provider availability
    providerConfigs[providerId].available = status.available;
    
    res.json({
      status: status.available ? 'available' : 'unavailable',
      models: status.models || [],
      error: status.error
    });
  } catch (error) {
    console.error(`Error checking ${providerId} status:`, error);
    res.status(500).json({ 
      status: 'error', 
      error: error.message 
    });
  }
});

// GET /ai-providers/:providerId/config - Get provider configuration
router.get('/:providerId/config', (req, res) => {
  const { providerId } = req.params;
  
  if (!providerConfigs[providerId]) {
    return res.status(404).json({ error: 'Provider not found' });
  }
  
  // Return config without sensitive information
  const config = { ...providerConfigs[providerId] };
  if (config.apiKey) {
    config.apiKey = config.apiKey ? '***configured***' : '';
  }
  
  res.json(config);
});

// PUT /ai-providers/:providerId/config - Update provider configuration
router.put('/:providerId/config', async (req, res) => {
  const { providerId } = req.params;
  const newConfig = req.body;
  
  if (!providerConfigs[providerId]) {
    return res.status(404).json({ error: 'Provider not found' });
  }
  
  try {
    // Update configuration
    providerConfigs[providerId] = {
      ...providerConfigs[providerId],
      ...newConfig
    };
    
    // Test the new configuration
    let status;
    switch (providerId) {
      case 'ollama':
        status = await checkOllamaStatus(providerConfigs.ollama.baseUrl);
        break;
      case 'openai':
        status = await checkOpenAIStatus(providerConfigs.openai.apiKey);
        break;
      case 'google':
        status = await checkGoogleAIStatus(providerConfigs.google.apiKey);
        break;
    }
    
    providerConfigs[providerId].available = status.available;
    
    res.json({
      message: 'Configuration updated successfully',
      available: status.available,
      error: status.error
    });
  } catch (error) {
    console.error(`Error updating ${providerId} config:`, error);
    res.status(500).json({ error: error.message });
  }
});

// POST /ai-providers/:providerId/activate - Set active provider
router.post('/:providerId/activate', (req, res) => {
  const { providerId } = req.params;
  
  if (!providerConfigs[providerId]) {
    return res.status(404).json({ error: 'Provider not found' });
  }
  
  if (!providerConfigs[providerId].available) {
    return res.status(400).json({ error: 'Provider is not available' });
  }
  
  activeProvider = providerId;
  console.log(`Active AI provider set to: ${providerId}`);
  
  res.json({ 
    message: `Active provider set to ${providerId}`,
    activeProvider 
  });
});

// GET /ai-providers/active - Get current active provider
router.get('/active', (req, res) => {
  res.json({
    activeProvider,
    config: providerConfigs[activeProvider]
  });
});

// Generate AI response using the active provider
async function generateAIResponse(prompt, context) {
  const config = providerConfigs[activeProvider];
  
  if (!config || !config.available) {
    throw new Error(`Active provider ${activeProvider} is not available`);
  }
  
  switch (activeProvider) {
    case 'ollama':
      return await generateOllamaResponse(prompt, context, config);
    case 'openai':
      return await generateOpenAIResponse(prompt, context, config);
    case 'google':
      return await generateGoogleResponse(prompt, context, config);
    default:
      throw new Error(`Unknown provider: ${activeProvider}`);
  }
}

async function generateOllamaResponse(prompt, context, config) {
  const fullPrompt = `Context:\n${context}\n\nUser Question: ${prompt}\n\nPlease provide a helpful answer based on the context provided.`;
  
  const response = await axios.post(`${config.baseUrl}/api/generate`, {
    model: config.model,
    prompt: fullPrompt,
    stream: false
  }, { timeout: 30000 });
  
  return response.data.response;
}

async function generateOpenAIResponse(prompt, context, config) {
  const response = await axios.post('https://api.openai.com/v1/chat/completions', {
    model: config.model,
    messages: [
      {
        role: 'system',
        content: 'You are a helpful assistant that answers questions based on the provided context.'
      },
      {
        role: 'user',
        content: `Context:\n${context}\n\nUser Question: ${prompt}\n\nPlease provide a helpful answer based on the context provided.`
      }
    ],
    temperature: 0.7,
    max_tokens: 1000
  }, {
    headers: { 'Authorization': `Bearer ${config.apiKey}` },
    timeout: 30000
  });
  
  return response.data.choices[0].message.content;
}

async function generateGoogleResponse(prompt, context, config) {
  const { GoogleGenerativeAI } = require("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(config.apiKey);
  const model = genAI.getGenerativeModel({ model: config.model });
  
  const fullPrompt = `You are a humble helper who can answer questions asked by users from the given context.

Context:
${context}

User Question: ${prompt}

Please provide a helpful answer based on the context provided.`;

  const result = await model.generateContent(fullPrompt);
  return result.response.text();
}

// Export the generateAIResponse function for use in other routes
module.exports = router;
module.exports.generateAIResponse = generateAIResponse;
module.exports.getActiveProvider = () => activeProvider;
module.exports.getProviderConfig = (providerId) => providerConfigs[providerId];