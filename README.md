# GrokChat

<div align="center">

[![GrokChat Logo](https://img.shields.io/badge/GrokChat-Web%20Client-blue)](https://grokchat.pages.dev/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.1.6-orange)](CHANGELOG.md)

</div>

A lightweight, browser-based chat interface for interacting with various AI providers through their OpenAI-compatible APIs. GrokChat offers a clean, intuitive interface with support for multiple AI providers, local storage of chat history, and customizable settings.

## Features

- **Quick Export Access**: Export current chat directly from header with one click or from the History tab in Settings
- **Multi-Provider Support**: Connect to various AI services including Groq, OpenAI, Anthropic, Mistral, xAI, DeepSeek, Novita, OpenRouter, and local Ollama instances
- **Local-First Architecture**: All chat history and settings stored securely in your browser
- **Progressive Web App (PWA)**: Installable for an app-like experience with basic offline access
- **Customizable Experience**:
  - Manage multiple providers and API keys
  - Configure model-specific parameters
  - Adjust context window size
  - Choose between light, dark, or system theme
  - Save and manage multiple system prompts with dropdown selection
- **Rich Content Rendering**:
  - Markdown support with syntax highlighting for code blocks
  - Support for AI thinking process visualization
- **Conversation Management**:
  - Create, rename, and delete chats
  - Copy messages in markdown or plain text format
  - Regenerate responses
  - View technical details about responses
- **Request Control**: Ability to interrupt ongoing requests
- **Responsive Design**: Works on desktop and mobile devices

## Setup

You have two options to use GrokChat:

### Option 1: Use the Hosted Version

Visit [http://grokchat.pages.dev/](http://grokchat.pages.dev/) to use the application without installation.

### Option 2: Run Locally

1. **Clone/Download this Repository**:
   ```bash
   git clone https://github.com/OleksiyM/grokchat.git
   cd grokchat
   ```

2. **Serve Locally**: Use a simple HTTP server to run the application
   - Using Python:
     ```bash
     python -m http.server 8000
     # or
     python3 -m http.server 8000
     ```
   - Or use VS Code's Live Server extension

3. **Access the Application**: Open `http://localhost:8000` (or your server's address) in your browser

## Usage Guide

### Initial Configuration

1. **Configure AI Providers**:
   - Click the "⚙️ Settings" button in the bottom left
   - Go to the "Providers & Models" tab
   - Click "Add Provider"
   - Enter provider details:
     - Name (e.g., "Groq")
     - Base URL (e.g., `https://api.groq.com/openai/v1`)
     - Your API Key
   - Save the provider

2. **Set Up Models**:
   - Click "Manage Models" for your provider
   - Click "Update Models List from Provider" to fetch available models
   - Select which models to make active/favorite
   - Save your model configuration

### Starting a Chat

1. Click "+ New Chat" in the top left
2. Select a provider and model from the dropdown menus at the bottom of the chat area
3. Type your message and press Enter or click the send button

### Customizing Chat Parameters

Click the sliders icon (⚙️) in the top right to access chat parameters:
- System Prompt (select from saved prompts or create new ones)
- Temperature
- Max Tokens
- Top P
- Reasoning Effort (for supported models)

To manage system prompts:
1. Go to Settings > System Prompts
2. Click "Add New Prompt"
3. Give it a name and enter your prompt text
4. Save to make it available in the chat dropdown

### Managing Chats

- **Rename a Chat**: Click the pencil icon next to a chat in the sidebar
- **Delete a Chat**: Click the trash icon next to a chat
- **Clear All History**: Go to Settings > History tab > "Clear All History"
- **Export Chat**: Go to Settings > History tab > "Export Chat"

### Advanced Features
- **Regenerate Response**: Click the regenerate icon next to a message
- **Copy Message**: Click the copy icon next to a message. Format options can be set in the Settings -> General:
  - Markdown
  - Plain Text
- **Information about Response**: Mouse hover over the info icon next to a message. You will see the technical details of the response.
```text
Provider: <Provider name>
Model: <model name>
Duration: <mumber in seconds>
Prompt Tokens: <number>
Completion Tokens: <number>
Total Tokens: <number>
Speed (tokens/sec): <number>
```

## Security Note

API keys are stored in your browser's `localStorage`. While this keeps your keys on your device, be aware of the security implications:

- API keys are stored unencrypted
- They persist between sessions
- They could potentially be accessed by other scripts if there are security vulnerabilities

## Technology Stack

- **Frontend**: Pure JavaScript, HTML, CSS (no frameworks)
- **Storage**:
  - IndexedDB for chat history
  - localStorage for settings
- **API Communication**: Fetch API
- **PWA Features**: Service Worker & Web App Manifest
- **Libraries**:
  - marked.js (Markdown rendering)
  - DOMPurify (HTML sanitization)
  - highlight.js (Code syntax highlighting)

## Development Notes

- The application requires a modern browser with support for IndexedDB, Service Workers, and ES Modules
- OpenAI API compatibility is assumed for chat completions (`/v1/chat/completions`) and model listing (`/v1/models`)
- Current limitations:
  - Streaming responses are not implemented in this version
  - Some formatting issues may occur with complex markdown
  - Layout may have issues on certain devices

## Contributing

Contributions and bug reports are welcome via GitHub issues and pull requests.

## License

MIT License

---

<div align="center">

**GrokChat** - A lightweight chat interface for AI models

</div>
