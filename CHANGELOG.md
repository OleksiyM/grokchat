# Changelog

## [0.1.15]
### Added
- "Stream output" switch in the right sidebar to control streaming per chat.
- Ability to manually add a model in the "Manage Models" modal with a confirmation dialog.
- "Default" option to the "Reasoning Effort" dropdown.

### Changed
- "New Chat" button icon to a more recognizable `fa-pen-to-square`.
- "New Chat" and "Settings" buttons are now icon-only for a cleaner look.
- Reorganized "Settings" modal by merging the "History" tab into the "Chats" tab.

### Fixed
- Parsing of non-streaming/buffered responses from certain models.
- UI bug where message action buttons (Copy, Edit, etc.) would not fit on mobile screens.
- UI bug where the "New Chat" button would disappear on smaller screens when the sidebar was expanded.
- UI layout of left sidebar header buttons in collapsed mode to prevent crowding.
- JavaScript error when opening settings after the "History" tab was removed.

### Improved
- The list of models fetched from a provider is now sorted alphabetically.

## [0.1.14]

- Feat: Replace prompt with modal for renaming chat titles

## [0.1.13]

- Add 'Unlimited Context' checkbox to General Settngs
- Add 'Copy current chat' button and functionality
- Add chat data export and import functionality
- Add settings import and export functionality
- Fix: Hide chat title and model provider in header on mobile
- Fix: Preserve folderId on chat import if folder exists
- Fix: Add spacing between icon and text in buttons

## [0.1.12]

- New 'Chats' tab in settings modal with folder management (add/rename/delete)
- Redesigned left sidebar with:
  - Search functionality
  - Pinned chats section
  - Collapsible folders organization
  - Archive section
- Context menu for chat items with:
  - Rename/Delete options
  - Folder management
  - Pin/Archive toggles
  - Export functionality
- Persistent UI state for folders/archive collapse
- Updated database schema for pinned/archived/folder attributes

## [0.1.11]

- UI Improvements:
   - Enhanced message edit window sizing and responsive behavior
   - Styled "edited" indicator with theme-adaptive colors
   - Improved message action button spacing 

## [0.1.10] 

- Added in-place message editing:
  - Edit messages directly within the chat interface.
  - Supports markdown formatting in the edit area.
  - Displays an "edited" label for modified messages.
- Improved message edit textarea:
  - Allows both vertical and horizontal resizing.
  - Minimum width of 200px.
  - Scrollbars appear when content exceeds visible area.
- Added the ability to delete any message in the chat.
- Integrated support for Google Gemini models (OpenAI compatible mode).
  - Supported Gemini thinking models can now set `Reasoning Efforts` (None, Low, Medium, High).

## [0.1.9]

- Reverted project state to match v0.1.5, discarding all changes made in later versions (v0.1.6–v0.1.8).
- Cleaned up temporary debug console logs.

## [0.1.5] 

- Fix: Correctly parses bold markdown in edge cases
- Fix: Correctly renders nested lists in markdown responses
- Added: Git version tags and reorganized branches

## [0.1.4]

- Added a quick export button to the chat header and an export button in the History tab under Settings.
- Both buttons use the export format currently selected in Settings.
- Supported export formats:
  - Markdown `.md`
  - json `.json`

## [0.1.3]

- Implemented system prompt management and selection:
  - Save, edit, and delete multiple system prompts in Settings
  - Select a prompt from a dropdown in the chat window
- Fixed various bugs related to prompt handling
- Documented prompt management functionality in `README.md`

## [0.1.2]

- Added support for streaming responses
- Improved functionality of the Regenerate button
- Fixed layout issues
- Fixed bug with incorrect position of the technical details popup
- Added a preview image to the GitHub repository (for social sharing)

## [0.1.1]

- Fixed an issue where the last assistant message was sometimes missing in requests to the server
  - The bug was in the `_buildContextMessages` function, which prepares chat history for API calls
- Updated `README.md` with instructions on running the app locally and additional details

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
- Streaming responses not implemented (already implemented in later version)
- Potential formatting issues with complex markdown (partially resolved)
- Layout may have issues on certain devices (partially resolved)