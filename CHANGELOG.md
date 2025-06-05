# Changelog
## [0.1.4] - Current Version

- Added quick export button to chat header and export button to the History tab in the Settings for chat export functionality
- Button uses the export format currently selected in Settings 
- Supported export formats:
  - Markdown `.md`
  - json `.json`

## [0.1.3]

- Implemented system prompt management and selection feature
  - Save, edit, and delete multiple system prompts in settings
  - Select prompts from dropdown in chat window
- Fixed various bugs related to prompt handling
- Updated version number in README.md

## [0.1.2]

- Implemented support for streaming responses
- Improved Regenerate button functionality
- Fixed some layout issues
- Fixed a bug of the wrong position technical details responses pop up
- Added image to the GitHub repository (for social sharing)

## [0.1.1]

- Fixed the issue in the code that's causing the last assistant message to be missed when sending requests to the server. The problem is in the `_buildContextMessages` function which prepares the chat history for API requests.
- Changed `README.md` to include instructions on how to run the application locally and other details.

## [0.1.0] - Initial Release

- **Multi-Provider Support**: Connect to various AI services including Groq, OpenAI, Anthropic, Mistral, xAI, DeepSeek, Novita, OpenRouter, and local Ollama instances
- **Local-First Architecture**: All chat history and settings stored securely in your browser
- **Progressive Web App (PWA)**: Installable for an app-like experience with basic offline access
- **Customizable Experience**:
  - Manage multiple providers and API keys
  - Configure model-specific parameters
  - Adjust context window size
  - Choose between light, dark, or system theme
  - Save and manage multiple system prompts
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

### Known Limitations
- Streaming responses not implemented (already implemented)
- Potential formatting issues with complex markdown
- Layout may have issues on certain devices (partially fixed)
