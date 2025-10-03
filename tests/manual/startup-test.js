// tests/manual/startup-test.js - Basic app startup validation
console.log('Testing app startup...');

try {
  const app = require('../../app.js');
  console.log('✅ App loaded successfully');
  
  // Test basic route loading
  const router = require('../../routes/index.js');
  console.log('✅ Routes loaded successfully');
  
  console.log('Starting server...');
  const server = app.listen(3001, () => {
    console.log('✅ Test server running on port 3001');
    server.close();
    console.log('✅ Test completed successfully');
  });
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
}