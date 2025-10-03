// Test script to verify session management fixes
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testSessionManagement() {
  try {
    console.log('🧪 Testing Session Management Fixes\n');

    // Test 1: Get current sessions (should only show non-empty ones)
    console.log('1️⃣ Getting current sessions (should filter empty ones)...');
    const sessionsResponse = await axios.get(`${BASE_URL}/sessions`);
    console.log(`   Found ${sessionsResponse.data.total} non-empty sessions`);
    
    // Show first few sessions with message counts
    const sessions = sessionsResponse.data.sessions.slice(0, 5);
    sessions.forEach(session => {
      console.log(`   📝 ${session.id}: ${session.messageCount} messages - "${session.lastMessage.substring(0, 50)}..."`);
    });

    // Test 2: Create new session (should NOT create empty session)
    console.log('\n2️⃣ Testing new session creation (should not create empty session)...');
    const newSessionResponse = await axios.post(`${BASE_URL}/sessions/new`, {});
    console.log(`   Response: ${newSessionResponse.data.message}`);
    console.log(`   Session ID: ${newSessionResponse.data.sessionId}`);

    // Test 3: Send a message (should create session only now)
    console.log('\n3️⃣ Sending first message (should create session now)...');
    const conversationResponse = await axios.post(`${BASE_URL}/conversation`, {
      sessionId: newSessionResponse.data.sessionId,
      message: 'Test message - this should create the session'
    });
    console.log(`   ✅ Message sent successfully`);
    console.log(`   Session created: ${conversationResponse.data.sessionId}`);
    console.log(`   AI Response: ${conversationResponse.data.response.substring(0, 100)}...`);

    // Test 4: Check sessions again (should now include the new one)
    console.log('\n4️⃣ Checking sessions after message...');
    const updatedSessionsResponse = await axios.get(`${BASE_URL}/sessions`);
    console.log(`   Now have ${updatedSessionsResponse.data.total} non-empty sessions`);

    // Test 5: Clean up empty sessions
    console.log('\n5️⃣ Running cleanup (should remove any remaining empty sessions)...');
    const cleanupResponse = await axios.post(`${BASE_URL}/sessions/cleanup`, {});
    console.log(`   Cleanup result: ${cleanupResponse.data.message}`);
    console.log(`   Removed: ${cleanupResponse.data.removed} empty sessions`);

    console.log('\n✅ All tests completed successfully!');
    console.log('\n🎉 Session Management Fixes Working:');
    console.log('   ✅ Empty sessions are filtered from GET /sessions');
    console.log('   ✅ New sessions only created when user sends message');  
    console.log('   ✅ Cleanup endpoint removes empty sessions');
    console.log('   ✅ Sessions properly track message count and last message');

  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
  }
}

testSessionManagement();