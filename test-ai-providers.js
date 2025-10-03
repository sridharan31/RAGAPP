// Test script for AI providers
require('dotenv').config();

async function testAIProviders() {
  console.log('Testing AI Provider System...\n');
  
  try {
    // Import the AI providers module
    const aiProviders = require('./routes/ai-providers');
    
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

testAIProviders();