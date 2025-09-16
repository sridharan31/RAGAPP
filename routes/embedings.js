// routes/embedings.js
require("dotenv").config();

// Google GenAI embedding function using the example format you provided
async function createGoogleEmbedding(contents) {
  try {
    const { GoogleGenerativeAI } = require("@google/generative-ai");
    
    if (!process.env.GOOGLE_API_KEY || process.env.GOOGLE_API_KEY === 'your_google_api_key_here') {
      throw new Error('Google API key not configured');
    }
    
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
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
function generateSimpleEmbedding(text, dimensions = 384) {
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

async function createEmbedding(text) {
  console.log(`Creating embedding for text: "${text}"`);
  
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
      console.log(`OpenAI embedding created successfully, length: ${embedding.length}`);
      return embedding;
    }
  } catch (error) {
    console.log(`OpenAI API failed: ${error.message}, trying Google GenAI...`);
  }
  
  // Try Google GenAI as second option
  try {
    if (process.env.GOOGLE_API_KEY && process.env.GOOGLE_API_KEY.length > 10) {
      const { GoogleGenerativeAI } = require("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
      
      const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
      const result = await model.embedContent(text);
      
      const embedding = result.embedding.values;
      console.log(`Google GenAI embedding created successfully, length: ${embedding.length}`);
      return embedding;
    }
  } catch (error) {
    console.log(`Google GenAI API failed: ${error.message}, falling back to simple embedding`);
  }
  
  // Fallback to simple embedding
  const embedding = generateSimpleEmbedding(text);
  console.log(`Simple embedding created successfully, length: ${embedding.length}`);
  return embedding;
}

module.exports = createEmbedding;
module.exports.createGoogleEmbedding = createGoogleEmbedding;
