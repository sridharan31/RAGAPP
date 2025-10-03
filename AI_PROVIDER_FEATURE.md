# AI Provider Selection Feature

This feature allows users to select between different AI providers for chat responses in the RAG application.

## Supported AI Providers

### 1. Google Gemini (Default)
- **Status**: Configured by default
- **Requirements**: Google AI API key
- **Models**: gemini-flash-latest, gemini-pro, gemini-pro-vision
- **Benefits**: Fast responses, reliable, cloud-based

### 2. Local Ollama
- **Status**: Requires setup
- **Requirements**: Ollama installed locally
- **Models**: llama3.2, llama2, codellama, mistral, etc.
- **Benefits**: Private, offline capability, no API costs
- **Setup**: Install Ollama and pull desired models

### 3. OpenAI GPT
- **Status**: Requires API key
- **Requirements**: OpenAI API key
- **Models**: gpt-3.5-turbo, gpt-4, gpt-4-turbo
- **Benefits**: High quality responses, multiple model options

## Frontend Components

### AIProviderSelector Component
Located at: `FrontEnd/src/components/ai/AIProviderSelector.tsx`

Features:
- Provider status checking
- Configuration management
- Real-time provider switching
- Local storage for settings persistence

### Settings Page
Located at: `FrontEnd/src/pages/SettingsPage.tsx`

Features:
- Dedicated settings interface
- Provider information display
- Configuration management
- Status messages

## Backend Implementation

### AI Provider Routes
Located at: `routes/ai-providers.js`

Endpoints:
- `GET /ai-providers/:providerId/status` - Check provider availability
- `GET /ai-providers/:providerId/config` - Get provider configuration
- `PUT /ai-providers/:providerId/config` - Update provider configuration
- `POST /ai-providers/:providerId/activate` - Set active provider
- `GET /ai-providers/active` - Get current active provider

### Dynamic Response Generation
The conversation endpoint now uses the selected AI provider dynamically:
```javascript
const { generateAIResponse } = require('./ai-providers');
const chat = await generateAIResponse(message, contextText);
```

## Environment Variables

Add these to your `.env` file:

```env
# Google Gemini API Configuration
GOOGLE_API_KEY="your_google_api_key_here"
GOOGLE_MODEL="gemini-flash-latest"

# OpenAI API Configuration
OPENAI_API_KEY="your_openai_api_key_here"
OPENAI_MODEL="gpt-3.5-turbo"

# Ollama Configuration
OLLAMA_URL="http://localhost:11434"
OLLAMA_MODEL="llama3.2"

# Active Provider
ACTIVE_AI_PROVIDER="google"
```

## Usage Instructions

### For Users:
1. **Access Settings**: Click the settings gear icon in the chat header or sidebar
2. **Select Provider**: Choose your preferred AI provider from the list
3. **Configure**: Enter required API keys or URLs as needed
4. **Activate**: The provider will be activated automatically when configured

### For Developers:
1. **Add New Provider**: Extend the provider system by adding new cases to the switch statements
2. **Custom Models**: Add support for new models by updating the configuration options
3. **Status Checking**: Implement health check functions for new providers

## Setup Instructions

### 1. Google Gemini (Recommended for beginners)
1. Visit [Google AI Studio](https://ai.google.dev/)
2. Get your API key
3. Add to `.env`: `GOOGLE_API_KEY="your_key_here"`

### 2. Local Ollama (For privacy/offline use)
1. Install Ollama: `curl -fsSL https://ollama.ai/install.sh | sh`
2. Pull a model: `ollama pull llama3.2`
3. Start Ollama: `ollama serve`
4. The app will automatically detect the running Ollama instance

### 3. OpenAI GPT (For premium quality)
1. Create account at [OpenAI Platform](https://platform.openai.com/)
2. Generate API key
3. Add to `.env`: `OPENAI_API_KEY="your_key_here"`

## Features

- ✅ Real-time provider switching
- ✅ Configuration persistence
- ✅ Status monitoring
- ✅ Error handling
- ✅ Multiple model support
- ✅ Local and cloud providers
- ✅ Settings page integration
- ✅ API key management

## Security Notes

- API keys are stored in localStorage (consider using secure storage for production)
- Sensitive information is masked in configuration displays
- Server-side validation for all provider configurations
- Error messages don't expose sensitive details

## Troubleshooting

### Provider Shows as Unavailable
1. Check API key validity
2. Verify network connectivity
3. Check service status (Ollama running, API endpoints accessible)
4. Review error messages in browser console

### Switching Providers Not Working
1. Ensure provider is marked as "Available"
2. Check backend logs for errors
3. Verify configuration is saved
4. Try refreshing provider status

### Ollama Connection Issues
1. Ensure Ollama is running: `ollama serve`
2. Check URL configuration (default: http://localhost:11434)
3. Verify model is pulled: `ollama list`
4. Check firewall settings