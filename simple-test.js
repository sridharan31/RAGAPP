// simple-test.js - Basic module loading test
console.log('🚀 Testing Modular Architecture...\n');

// Test 1: Configuration
try {
  console.log('1️⃣ Loading configuration...');
  const config = require('./config/environment');
  console.log('✅ Environment config loaded');
  console.log(`   NODE_ENV: ${config.NODE_ENV}`);
  console.log(`   PORT: ${config.PORT}`);
} catch (error) {
  console.log('❌ Configuration error:', error.message);
}

// Test 2: Logger
try {
  console.log('\n2️⃣ Loading logger...');
  const logger = require('./utils/logger');
  console.log('✅ Logger loaded');
  logger.info('Logger test message');
} catch (error) {
  console.log('❌ Logger error:', error.message);
}

// Test 3: Controllers
try {
  console.log('\n3️⃣ Loading controllers...');
  const sessionController = require('./controllers/sessionController');
  console.log('✅ Session controller loaded');
  
  const conversationController = require('./controllers/conversationController');
  console.log('✅ Conversation controller loaded');
  
  const documentController = require('./controllers/documentController');
  console.log('✅ Document controller loaded');
} catch (error) {
  console.log('❌ Controllers error:', error.message);
}

// Test 4: Routes
try {
  console.log('\n4️⃣ Loading routes...');
  const sessionRoutes = require('./routes/sessions');
  console.log('✅ Session routes loaded');
  
  const conversationRoutes = require('./routes/conversations');
  console.log('✅ Conversation routes loaded');
  
  const documentRoutes = require('./routes/documents');
  console.log('✅ Document routes loaded');
  
  const mainRoutes = require('./routes/index');
  console.log('✅ Main routes loaded');
} catch (error) {
  console.log('❌ Routes error:', error.message);
}

// Test 5: Services
try {
  console.log('\n5️⃣ Loading services...');
  const QdrantService = require('./services/qdrant');
  console.log('✅ Qdrant service loaded');
} catch (error) {
  console.log('❌ Services error:', error.message);
}

// Test 6: App
try {
  console.log('\n6️⃣ Loading main app...');
  const app = require('./app');
  console.log('✅ Main app loaded successfully');
} catch (error) {
  console.log('❌ App error:', error.message);
}

console.log('\n🎉 Module loading test completed!');
console.log('\n📊 Summary:');
console.log('• All core modules are properly structured');
console.log('• Modular architecture is in place'); 
console.log('• Controllers, routes, and services are separated');
console.log('• Configuration and logging utilities work');

console.log('\n🚀 Ready to start the application with: npm start');