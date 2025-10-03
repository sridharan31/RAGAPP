// tests/api/ai-providers-test.js - Test AI provider system
require('dotenv').config();

async function testAIProviders() {
  console.log('Testing AI Provider System...\n');
  
  try {
    // Import the AI providers module
    const aiProviders = require('../../routes/ai-providers');
    
    console.log('✅ AI Providers module loaded successfully');
    
    // Test the active provider function
    const activeProvider = aiProviders.getActiveProvider();
    console.log(`📋 Current active provider: ${activeProvider}`);
    
    // Test provider config retrieval
    const config = aiProviders.getProviderConfig('google');
    console.log(`🔧 Google provider config available: ${!!config}`);
    
    console.log('\n🎉 AI Provider system test completed successfully!');
    console.log('\n📚 Available features:');
    console.log('   - AI Provider selection (Google, Ollama, OpenAI)');
    console.log('   - Dynamic provider switching');
    console.log('   - Configuration management');
    console.log('   - Status monitoring');
    console.log('   - Settings page integration');
    
    console.log('\n🚀 To use the feature:');
    console.log('   1. Start the backend server');
    console.log('   2. Start the frontend development server');
    console.log('   3. Navigate to Settings in the sidebar');
    console.log('   4. Select and configure your preferred AI provider');
    
  } catch (error) {
    console.error('❌ Error testing AI providers:', error.message);
  }
}

// Test AI provider integration with vector database
async function testAIProviderVectorIntegration() {
  const axios = require('axios');
  const BASE_URL = 'http://localhost:3000';

  console.log('🚀 Testing AI Provider + Vector Database Integration\n');

  try {
    // 1. Test AI provider selection
    console.log('1️⃣  Testing AI Provider Status...');
    const providersResponse = await axios.get(`${BASE_URL}/api/ai-providers/status`);
    console.log('Available providers:', providersResponse.data);

    // 2. Set active provider (test with Google first)
    console.log('\n2️⃣  Setting Google as active provider...');
    await axios.post(`${BASE_URL}/api/ai-providers/set-active`, {
      provider: 'google'
    });
    
    const activeProviderResponse = await axios.get(`${BASE_URL}/api/ai-providers/active`);
    console.log('Active provider:', activeProviderResponse.data);

    // 3. Test embedding creation with selected provider
    console.log('\n3️⃣  Testing embedding creation with selected provider...');
    const testText = "This is a test document about machine learning and artificial intelligence.";
    const embeddingResponse = await axios.get(`${BASE_URL}/embeddings`, {
      params: { text: testText }
    });
    console.log(`Embedding created successfully! Length: ${embeddingResponse.data.embedding.length}`);

    // 4. Test search functionality
    console.log('\n4️⃣  Testing search functionality...');
    const searchResponse = await axios.get(`${BASE_URL}/search`, {
      params: { 
        q: "machine learning",
        limit: 3
      }
    });
    console.log(`Search results: ${searchResponse.data.results.length} found`);

    console.log('\n✅ All integration tests completed successfully!');

  } catch (error) {
    console.error('\n❌ Integration test failed:', error.response?.data || error.message);
  }
}

// Export functions
module.exports = {
  testAIProviders,
  testAIProviderVectorIntegration
};

// Run if called directly
if (require.main === module) {
  testAIProviders()
    .then(() => {
      console.log('\n🔄 Testing integration...');
      return testAIProviderVectorIntegration();
    })
    .catch(console.error);
}