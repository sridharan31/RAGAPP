# 📁 **Test Organization & Structure**

## 🏗️ **New Organized Test Folder Structure**

### **Directory Layout**
```
tests/
├── index.js                    # Main test suite runner
├── test-runner.js             # Custom test framework
├── api/                       # API endpoint tests
│   ├── modular-api-test.js    # Modular architecture validation
│   ├── session-test.js        # Session management tests
│   └── ai-providers-test.js   # AI provider integration tests
├── unit/                      # Unit tests
│   └── sessionController.test.js
├── integration/               # Integration tests
│   └── session-management-integration.test.js
├── manual/                    # Manual validation tests
│   └── startup-test.js        # App startup validation
├── mock-servers/              # Mock servers for testing
│   └── simple-test-server.js  # Simple HTTP mock server
└── data/                      # Test data files
    └── sample-employees.csv   # Sample CSV data
```

---

## 🚀 **How to Use the Organized Tests**

### **1. Run All Tests**
```bash
cd c:\Project\AI\RAGAPP
node tests/index.js --all
```

### **2. Run Specific Test Category**
```bash
# API tests
node tests/index.js --category=api

# Unit tests  
node tests/index.js --category=unit

# Manual tests
node tests/index.js --category=manual
```

### **3. Run Individual Tests**
```bash
# Startup validation
node tests/manual/startup-test.js

# API module validation
node tests/api/modular-api-test.js

# Session API tests
node tests/api/session-test.js

# Start mock server
node tests/mock-servers/simple-test-server.js
```

### **4. List Available Tests**
```bash
node tests/index.js --list
```

---

## 📋 **Test Categories Explained**

### **🔧 Manual Tests** (`tests/manual/`)
**Purpose**: Manual validation and startup checks
- **startup-test.js**: Validates app can load and start properly
- **Usage**: Run before major deployments or after structural changes

### **🌐 API Tests** (`tests/api/`)
**Purpose**: Test REST API endpoints and functionality
- **modular-api-test.js**: Validates the new modular architecture 
- **session-test.js**: Tests session management endpoints
- **ai-providers-test.js**: Tests AI provider integration
- **Usage**: Run to verify API functionality

### **🧪 Unit Tests** (`tests/unit/`)
**Purpose**: Test individual components in isolation
- **sessionController.test.js**: Tests session controller logic
- **Usage**: Run during development to catch logic errors

### **🔗 Integration Tests** (`tests/integration/`)
**Purpose**: Test component interactions and workflows
- **session-management-integration.test.js**: End-to-end session testing
- **Usage**: Run to verify component integration

### **🎭 Mock Servers** (`tests/mock-servers/`)
**Purpose**: Provide test servers for frontend development
- **simple-test-server.js**: Lightweight HTTP server with mock endpoints
- **Usage**: Start when testing frontend without full backend

### **📊 Test Data** (`tests/data/`)
**Purpose**: Sample data for testing various scenarios
- **sample-employees.csv**: CSV file for document upload testing
- **Usage**: Referenced by tests that need sample data

---

## 🎯 **Benefits of Organized Structure**

### **✅ Before (Scattered)**
```
❌ test-startup.js
❌ test-session-endpoints.js  
❌ test-server.js
❌ test-modular-api.js
❌ test-document-upload.js
❌ test-ai-providers.js
❌ ... (scattered in root)
```

### **✅ After (Organized)**
```
✅ tests/
   ├── api/           # All API tests together
   ├── unit/          # Unit tests organized
   ├── integration/   # Integration tests clear
   ├── manual/        # Manual tests separate
   ├── mock-servers/  # Test servers isolated
   └── data/          # Test data centralized
```

---

## 📊 **Test Execution Workflow**

### **Development Workflow**
1. **Unit Tests** - Run during feature development
2. **API Tests** - Run after completing endpoints  
3. **Integration Tests** - Run before merging code
4. **Manual Tests** - Run before deployment

### **CI/CD Integration** (Future)
```bash
# In CI pipeline
npm run test:unit          # Unit tests
npm run test:api           # API tests  
npm run test:integration   # Integration tests
npm run test:all           # Complete test suite
```

---

## 🔧 **Test Configuration**

### **Environment Setup**
- Tests use `../../` relative imports to access app modules
- Mock servers run on different ports (3001) to avoid conflicts
- Test data files provide consistent sample data

### **Dependencies**
- **supertest**: HTTP testing library
- **axios**: HTTP client for API testing
- **Custom test runner**: `tests/test-runner.js`

---

## 🚀 **Next Steps**

### **Immediate Benefits**
✅ **Organized Structure**: Tests are logically grouped  
✅ **Easy Navigation**: Clear folder structure  
✅ **Consistent Imports**: Proper relative paths  
✅ **Centralized Runner**: Single entry point for all tests  

### **Future Enhancements**
- Add more comprehensive unit tests
- Create performance tests
- Add automated CI/CD integration
- Create test coverage reporting

---

## 📝 **Summary**

The test files have been successfully organized into a proper folder structure with:
- **Clear categorization** by test type
- **Consistent naming conventions** 
- **Proper relative imports**
- **Centralized test runner**
- **Easy execution commands**

This organization makes the codebase more maintainable and provides a solid foundation for comprehensive testing! 🎉