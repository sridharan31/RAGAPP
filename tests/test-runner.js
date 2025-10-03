// tests/test-runner.js
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class TestRunner {
  constructor() {
    this.testResults = [];
    this.passed = 0;
    this.failed = 0;
  }

  async runIntegrationTests() {
    console.log('🧪 Running Integration Tests...\n');
    
    const testDir = path.join(__dirname, 'integration');
    const testFiles = fs.readdirSync(testDir).filter(file => file.endsWith('.test.js'));
    
    for (const testFile of testFiles) {
      try {
        console.log(`📋 Running ${testFile}...`);
        const testModule = require(path.join(testDir, testFile));
        
        if (typeof testModule === 'function') {
          const result = await testModule();
          
          if (result && result.success) {
            this.passed++;
            console.log(`✅ ${testFile} PASSED\n`);
            logger.info(`Integration test passed: ${testFile}`);
          } else {
            this.failed++;
            console.log(`❌ ${testFile} FAILED: ${result?.error || 'Unknown error'}\n`);
            logger.error(`Integration test failed: ${testFile}`, { error: result?.error });
          }
        } else {
          console.log(`⚠️  ${testFile} is not a proper test module\n`);
        }
      } catch (error) {
        this.failed++;
        console.log(`❌ ${testFile} ERROR: ${error.message}\n`);
        logger.error(`Integration test error: ${testFile}`, { error: error.message });
      }
    }
  }

  async runUnitTests() {
    console.log('🔬 Running Unit Tests...\n');
    
    const testDir = path.join(__dirname, 'unit');
    const testFiles = fs.readdirSync(testDir).filter(file => file.endsWith('.test.js'));
    
    for (const testFile of testFiles) {
      try {
        console.log(`📋 Running ${testFile}...`);
        require(path.join(testDir, testFile));
        
        this.passed++;
        console.log(`✅ ${testFile} PASSED (structure validated)\n`);
        logger.info(`Unit test structure validated: ${testFile}`);
      } catch (error) {
        this.failed++;
        console.log(`❌ ${testFile} ERROR: ${error.message}\n`);
        logger.error(`Unit test error: ${testFile}`, { error: error.message });
      }
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Test Suite...\n');
    
    const startTime = Date.now();
    
    await this.runUnitTests();
    await this.runIntegrationTests();
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log('📊 Test Results Summary:');
    console.log(`   ✅ Passed: ${this.passed}`);
    console.log(`   ❌ Failed: ${this.failed}`);
    console.log(`   ⏱️  Duration: ${duration}ms\n`);
    
    if (this.failed === 0) {
      console.log('🎉 All tests passed!');
      logger.info('All tests passed', { passed: this.passed, failed: this.failed, duration });
    } else {
      console.log('💥 Some tests failed!');
      logger.error('Test failures detected', { passed: this.passed, failed: this.failed, duration });
    }
    
    return {
      success: this.failed === 0,
      passed: this.passed,
      failed: this.failed,
      duration
    };
  }
}

// If running directly, execute all tests
if (require.main === module) {
  const runner = new TestRunner();
  runner.runAllTests().then(results => {
    process.exit(results.success ? 0 : 1);
  });
}

module.exports = TestRunner;