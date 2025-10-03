// tests/api/session-test.js - Session API endpoint tests
const axios = require('axios');

async function testSessionEndpoints() {
  try {
    console.log('🧪 Testing session endpoints...');
    
    const baseURL = 'http://localhost:3000';
    
    // Test 1: Get current sessions (should be empty initially)
    console.log('\n1. Testing GET /sessions');
    const response1 = await axios.get(`${baseURL}/sessions`);
    console.log('Response:', response1.data);
    
    // Test 2: Create new session
    console.log('\n2. Testing POST /sessions/new');
    const response2 = await axios.post(`${baseURL}/sessions/new`, {});
    console.log('Response:', response2.data);
    
    // Test 3: Get sessions again (should now have one)
    console.log('\n3. Testing GET /sessions again');
    const response3 = await axios.get(`${baseURL}/sessions`);
    console.log('Response:', response3.data);
    
    console.log('\n✅ All tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

async function testSessionCreation() {
  try {
    console.log('🧪 Testing session creation...');
    
    const baseURL = 'http://localhost:3000';
    
    // Test 1: Create a new session
    console.log('1. Creating new session...');
    const newSessionResponse = await axios.post(`${baseURL}/sessions/new`, {
      title: 'Test Session 1'
    });
    console.log('✅ New session created:', newSessionResponse.data);
    
    const sessionId = newSessionResponse.data.sessionId;
    
    // Test 2: Add a conversation to the session
    console.log('2. Adding conversation...');
    const conversationResponse = await axios.post(`${baseURL}/conversation`, {
      prompt: 'Hello, this is a test message',
      selectedDocument: 'Test Document',
      limit: 5,
      sessionId: sessionId
    });
    console.log('✅ Conversation added');
    
    // Test 3: Get all sessions
    console.log('3. Getting all sessions...');
    const sessionsResponse = await axios.get(`${baseURL}/sessions`);
    console.log('✅ Sessions retrieved:', sessionsResponse.data);
    
    console.log('🎉 All tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Export functions
module.exports = {
  testSessionEndpoints,
  testSessionCreation
};

// Run if called directly
if (require.main === module) {
  console.log('🚀 Running Session API Tests...');
  testSessionEndpoints()
    .then(() => testSessionCreation())
    .catch(console.error);
}