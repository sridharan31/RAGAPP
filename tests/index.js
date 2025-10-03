// tests/index.js - Organized test suite runner
const fs = require('fs');
const path = require('path');

console.log('🧪 RAG Application Test Suite');
console.log('============================\n');

// Test categories
const testCategories = {
  manual: {
    description: 'Manual validation tests',
    path: './manual',
    tests: [
      'startup-test.js'
    ]
  },
  api: {
    description: 'API endpoint tests',
    path: './api', 
    tests: [
      'modular-api-test.js',
      'session-test.js',
      'ai-providers-test.js'
    ]
  },
  unit: {
    description: 'Unit tests for controllers and services',
    path: './unit',
    tests: [
      'sessionController.test.js'
    ]
  },
  integration: {
    description: 'Integration tests',
    path: './integration',
    tests: [
      'session-management-integration.test.js'
    ]
  },
  'mock-servers': {
    description: 'Mock servers for testing',
    path: './mock-servers',
    tests: [
      'simple-test-server.js'
    ]
  }
};

// Display available tests
function displayTestMenu() {
  console.log('📋 Available Test Categories:\n');
  
  Object.entries(testCategories).forEach(([category, info]) => {
    console.log(`${category.toUpperCase()}:`);
    console.log(`  Description: ${info.description}`);
    console.log(`  Location: tests/${info.path}/`);
    console.log(`  Tests available: ${info.tests.length}`);
    info.tests.forEach(test => {
      const testPath = path.join(__dirname, info.path, test);
      const exists = fs.existsSync(testPath);
      console.log(`    ${exists ? '✅' : '❌'} ${test}`);
    });
    console.log();
  });
}

// Run specific test category
async function runTestCategory(category) {
  const categoryInfo = testCategories[category];
  
  if (!categoryInfo) {
    console.error(`❌ Unknown test category: ${category}`);
    return;
  }
  
  console.log(`🚀 Running ${category.toUpperCase()} tests...\n`);
  
  for (const testFile of categoryInfo.tests) {
    const testPath = path.join(__dirname, categoryInfo.path, testFile);
    
    if (fs.existsSync(testPath)) {
      console.log(`\n▶️  Running: ${testFile}`);
      try {
        require(testPath);
      } catch (error) {
        console.error(`❌ Error in ${testFile}:`, error.message);
      }
    } else {
      console.log(`⚠️  Test not found: ${testFile}`);
    }
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Running All Tests...\n');
  
  for (const [category, info] of Object.entries(testCategories)) {
    console.log(`\n📂 ${category.toUpperCase()} Tests:`);
    console.log('─'.repeat(50));
    
    for (const testFile of info.tests) {
      const testPath = path.join(__dirname, info.path, testFile);
      
      if (fs.existsSync(testPath)) {
        console.log(`\n▶️  ${testFile}`);
        try {
          require(testPath);
        } catch (error) {
          console.error(`❌ ${error.message}`);
        }
      }
    }
  }
}

// Usage instructions
function showUsage() {
  console.log('📚 Usage Instructions:\n');
  console.log('From project root:');
  console.log('  node tests/index.js                    # Show this menu');
  console.log('  node tests/index.js --list             # List all tests');
  console.log('  node tests/index.js --all              # Run all tests');
  console.log('  node tests/index.js --category=api     # Run API tests');
  console.log('  node tests/index.js --category=unit    # Run unit tests');
  console.log('\nDirect test execution:');
  console.log('  node tests/manual/startup-test.js      # Run startup test');
  console.log('  node tests/api/modular-api-test.js     # Run API tests');
  console.log('  node tests/mock-servers/simple-test-server.js  # Start mock server');
  
  console.log('\n🔧 Test Data:');
  console.log('  Sample data files are in tests/data/');
  console.log('  Mock servers are in tests/mock-servers/');
}

// Command line interface
const args = process.argv.slice(2);

if (args.length === 0) {
  displayTestMenu();
  showUsage();
} else if (args.includes('--list')) {
  displayTestMenu();
} else if (args.includes('--all')) {
  runAllTests();
} else {
  const categoryArg = args.find(arg => arg.startsWith('--category='));
  if (categoryArg) {
    const category = categoryArg.split('=')[1];
    runTestCategory(category);
  } else {
    console.log('❌ Unknown command. Use --help for usage instructions.');
    showUsage();
  }
}

// Export for programmatic use
module.exports = {
  testCategories,
  displayTestMenu,
  runTestCategory,
  runAllTests
};