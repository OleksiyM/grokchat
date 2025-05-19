# GrokChat

A web application providing a user interface for interacting with various artificial intelligence models via their APIs. The application functions as a static site, is hosted on static hosting, and stores dialogue history locally in the user's browser using IndexedDB. Supports installation as a Progressive Web App (PWA).

## Features

*   Local-first: Chat history and settings stored in your browser.
*   Multi-provider: Supports Groq, and other OpenAI-compatible APIs (xAI, Google Gemini via compatible endpoints, OpenRouter, custom).
*   PWA: Installable for an app-like experience and basic offline access to the UI.
*   Customizable: Manage providers, API keys, models, context window, themes.
*   Markdown rendering with code syntax highlighting for AI responses.
*   Message actions: Copy, Regenerate, Info (technical details).
*   Request interruption.
*   Responsive design.

## Setup
You have two options:
**Clone from This GitHub repo**
1.  **Clone/Download:** Get the project files.
2.  **Serve Locally:** Use a simple HTTP server to run the `index.html` file.
    *   Example using Python: `python -m http.server 8000` (or `python3 ...`)
    *   Or use VS Code Live Server extension.
3.  **Access:** Open `http://localhost:8000` (or your server's address) in your browser.

**Open ftom the site**
[http://grokchat.pages.dev/](http://grokchat.pages.dev/)

4.  **Configure Providers:**
    *   Click the "⚙️ Settings" button.
    *   Go to the "Providers & Models" tab.
    *   Click "Add New Provider".
    *   Enter a name (e.g., "Groq"), the Base URL (e.g., `https://api.groq.com/openai/v1`), and your API Key.
        *   **Warning:** API keys are stored in your browser's `localStorage`. 
    *   Save the provider.
    *   Click "Manage Models" for the provider, then "Update Models List from Provider" to fetch available models. Select active/favorite models and save.
5.  **Start Chatting!**

## Deployment

The application is designed for static hosting platform

*   Cloudflare Pages (done) 
*   GitHub Pages (may be i nfuture)

## Technology Stack

*   HTML, CSS, JavaScript (Pure JS, ES Modules)
*   IndexedDB (Chat History)
*   localStorage (Settings)
*   Fetch API (API Interaction)
*   Service Worker & Web App Manifest (PWA)
*   marked.js (Markdown to HTML)
*   DOMPurify (HTML Sanitization)
*   highlight.js (Syntax Highlighting)

## Development Notes

*   Ensure your browser supports modern web standards (IndexedDB, Service Workers, ES Modules).
*   The application assumes OpenAI API compatibility for chat completions (`/v1/chat/completions`) and model listing (`/v1/models`).
*   Basic Error handling is implemented, but can always be improved.
*   Streaming responses are NOT implemented in this version.
*   Present some issurs with formatting markdown in the chat.
*   Present some issurs with layout on the some devices.
*   