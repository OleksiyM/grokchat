const GrokChatApp = {
    config: {
        dbName: 'GrokChatDB',
        dbVersion: 1,
        defaultSettings: {
            theme: 'system',
            contextWindowSize: 10,
            unlimitedContext: false, // Added new default setting
            copyFormat: 'markdown',
            providers: [
                { id: 'groq-default', name: 'Groq', baseUrl: 'https://api.groq.com/openai/v1', apiKey: '', models: {}, lastUpdatedModels: null },
                { id: 'openrouter-default', name: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1', apiKey: '', models: {}, lastUpdatedModels: null },
                { id: 'xai-default', name: 'xAI', baseUrl: 'https://api.x.ai/v1', apiKey: '', models: {}, lastUpdatedModels: null },
                { id: 'openai-default', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', apiKey: '', models: {}, lastUpdatedModels: null },
                { id: 'anthropic-default', name: 'Anthropic', baseUrl: 'https://api.anthropic.com/v1', apiKey: '', models: {}, lastUpdatedModels: null },
                { id: 'mistral-default', name: 'Mistral', baseUrl: 'https://api.mistral.ai/v1', apiKey: '', models: {}, lastUpdatedModels: null },
                { id: 'deepseek-default', name: 'DeepSeek', baseUrl: 'https://api.deepseek.com', apiKey: '', models: {}, lastUpdatedModels: null },
                { id: 'novita-default', name: 'Novita', baseUrl: 'https://api.novita.ai/v3/openai', apiKey: '', models: {}, lastUpdatedModels: null },
                { id: 'google-default', name: 'Google', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', apiKey: '', models: {}, lastUpdatedModels: null },
                { id: 'ollama-default', name: 'Ollama', baseUrl: 'http://localhost:11434/v1', apiKey: '', models: {}, lastUpdatedModels: null }

            ],
            selectedProviderId: null,
            selectedModelId: null,
            lastOpenedChatId: null,
            systemPrompts: [
                { name: 'Default Prompt', text: 'You are a helpful assistant.' }
            ],
            chatFolders: [
                { id: 'default', name: 'Default', isSystem: true } // Add a default folder
            ]
        },
        defaultChatParams: {
            systemPrompt: '',
            temperature: 0.7,
            max_tokens: null,
            top_p: 1.0,
            stream: true

        }
    },

    dom: {
        // Main layout
        leftSidebar: null, toggleLeftSidebarBtn: null,
        mainContent: null,
        rightSidebar: null, toggleRightSidebarBtn: null, closeRightSidebarBtn: null,

        // Left Sidebar
        newChatBtn: null, settingsBtn: null, // chatList is removed, new elements below
        chatSearchInput: null,
        pinnedChatList: null,
        foldersHeader: null, foldersContainer: null,
        historyChatList: null,
        archiveHeader: null, archiveChatList: null,


        // Main Content
        chatHeader: null, chatTitleDisplay: null, chatCurrentProviderModel: null,
        messageAreaWrapper: null, messageArea: null,
        messageForm: null, messageInput: null, sendButton: null,
        providerSelectorChat: null, modelSelectorChat: null,

        // Right Sidebar (Parameters)
        systemPromptInput: null, temperatureInput: null, temperatureValue: null,
        maxTokensInput: null, maxTokensValue: null,
        topPInput: null, topPValue: null,
        streamOutputCheckbox: null,

        // Settings Modal
        settingsModal: null, closeSettingsModalBtn: null, saveSettingsBtn: null,
        themeSelector: null, contextWindowSizeInput: null, contextWindowSizeValue: null,
        unlimitedContextCheckbox: null, // Added unlimited context checkbox
        copyFormatSelector: null,
        providerList: null, addProviderBtn: null,
        clearAllHistoryBtn: null,

        // Add/Edit Provider Modal
        addProviderModal: null, providerModalTitle: null, closeProviderModalBtns: null,
        editProviderIdInput: null, providerNameInput: null, providerBaseUrlInput: null,
        providerApiKeyInput: null, saveProviderBtn: null, toggleApiKeyVisibilityBtn: null,

        // Manage Models Modal
        manageModelsModal: null, manageModelsModalTitle: null, closeManageModelsBtns: null,
        manageModelsProviderIdInput: null, updateModelsListBtn: null, modelsLastUpdatedStatus: null,
        currentProviderModelsList: null, allProviderModelsList: null, saveManagedModelsBtn: null,
        modelsComparisonInfo: null,
        manualModelIdInput: null, manualAddModelBtn: null,

        tabLinks: null,
        exportChatFormatSelect: null,
        exportCurrentChatBtn: null,
        headerExportChatBtn: null,
        headerCopyChatBtn: null, // Added for the new button
    },

    state: {
        db: null,
        settings: {},
        currentChatId: null,
        currentChatParams: {},
        isRequestInProgress: false, // True when an API call is active
        currentAbortController: null,
        isLeftSidebarManuallyToggled: false,
        isRightSidebarManuallyToggled: false,
        hljsThemeLight: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css',
        hljsThemeDark: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css',
        hljsThemeLinkTag: null,
        loggedLibraryStatus: false,
        isSendingMessage: false, // Guards against rapid re-entry into handleSendMessage
        currentStreamingResponseMessage: '', // Accumulates AI response during streaming
        editingSystemPromptName: null, // To track system prompt being edited
        selectedFolderId: null, // To track selected folder in settings
        editingFolderId: null, // To track folder being edited/added
    },

    init: async function () {
        console.log("GrokChatApp Initializing...");
        this._cacheDomElements();
        this._loadSettings();
        this._applyTheme();
        this._registerServiceWorker();

        if (window.marked) {
            window.marked.setOptions({
                breaks: true,
                gfm: true
            });
        }

        try {
            this.state.db = await this._initDB();
            console.log("Database initialized.");
        } catch (error) {
            console.error("Failed to initialize database:", error);
            this._showError("Failed to initialize database. Chat history may not work.");
        }

        this._attachEventListeners();
        this._setupResponsiveSidebars();

        await this.renderChatList();
        await this.loadInitialChat();
        this._updateChatModelSelectors();
        this._populateSettingsForm();

        this.dom.messageInput.addEventListener('input', this._autoAdjustTextareaHeight);
        this._autoAdjustTextareaHeight.call(this.dom.messageInput);

        console.log("GrokChatApp Initialized.");
    },

    _cacheDomElements: function () {
        this.dom.leftSidebar = document.getElementById('left-sidebar');
        this.dom.toggleLeftSidebarBtn = document.getElementById('toggle-left-sidebar-btn');
        this.dom.mainContent = document.getElementById('main-content');
        this.dom.rightSidebar = document.getElementById('right-sidebar');
        this.dom.toggleRightSidebarBtn = document.getElementById('toggle-right-sidebar-btn');
        this.dom.closeRightSidebarBtn = document.getElementById('close-right-sidebar-btn');
        this.dom.newChatBtn = document.getElementById('new-chat-btn');
        // this.dom.chatList = document.getElementById('chat-list'); // Old chat list
        this.dom.settingsBtn = document.getElementById('settings-btn');

        // New Left Sidebar elements
        this.dom.chatSearchInput = document.getElementById('chat-search-input');
        this.dom.pinnedChatList = document.getElementById('pinned-chat-list');
        this.dom.foldersHeader = document.getElementById('folders-header');
        this.dom.foldersContainer = document.getElementById('folders-container');
        this.dom.historyChatList = document.getElementById('history-chat-list');
        this.dom.archiveHeader = document.getElementById('archive-header');
        this.dom.archiveChatList = document.getElementById('archive-chat-list');

        this.dom.chatHeader = document.getElementById('chat-header');
        this.dom.chatTitleDisplay = document.getElementById('chat-title-display');
        this.dom.chatCurrentProviderModel = document.getElementById('chat-current-provider-model');
        this.dom.messageAreaWrapper = document.getElementById('message-area-wrapper');
        this.dom.messageArea = document.getElementById('message-area');
        this.dom.messageForm = document.getElementById('message-form');
        this.dom.messageInput = document.getElementById('message-input');
        this.dom.sendButton = document.getElementById('send-button');
        this.dom.providerSelectorChat = document.getElementById('provider-selector-chat');
        this.dom.modelSelectorChat = document.getElementById('model-selector-chat');
        this.dom.systemPromptInput = document.getElementById('system-prompt');
        this.dom.temperatureInput = document.getElementById('temperature');
        this.dom.temperatureValue = document.getElementById('temperature-value');
        this.dom.maxTokensInput = document.getElementById('max-tokens');
        this.dom.maxTokensValue = document.getElementById('max-tokens-value');
        this.dom.topPInput = document.getElementById('top-p');
        this.dom.topPValue = document.getElementById('top-p-value');
        this.dom.streamOutputCheckbox = document.getElementById('stream-output-checkbox');
        this.dom.settingsModal = document.getElementById('settings-modal');
        this.dom.closeSettingsModalBtn = document.getElementById('close-settings-modal-btn');
        this.dom.saveSettingsBtn = document.getElementById('save-settings-btn');
        this.dom.themeSelector = document.getElementById('theme-selector');
        this.dom.contextWindowSizeInput = document.getElementById('context-window-size');
        this.dom.contextWindowSizeValue = document.getElementById('context-window-size-value');
        this.dom.unlimitedContextCheckbox = document.getElementById('unlimited-context-checkbox'); // Cached checkbox
        this.dom.copyFormatSelector = document.getElementById('copy-format-selector');
        this.dom.providerList = document.getElementById('provider-list');
        this.dom.addProviderBtn = document.getElementById('add-provider-btn');
        this.dom.clearAllHistoryBtn = document.getElementById('clear-all-history-btn');
        this.dom.addProviderModal = document.getElementById('add-provider-modal');
        this.dom.providerModalTitle = document.getElementById('provider-modal-title');
        this.dom.closeProviderModalBtns = document.querySelectorAll('[data-modal-id="add-provider-modal"].close-modal-btn');
        this.dom.editProviderIdInput = document.getElementById('edit-provider-id');
        this.dom.providerNameInput = document.getElementById('provider-name');
        this.dom.providerBaseUrlInput = document.getElementById('provider-base-url');
        this.dom.providerApiKeyInput = document.getElementById('provider-api-key');
        this.dom.saveProviderBtn = document.getElementById('save-provider-btn');
        this.dom.toggleApiKeyVisibilityBtn = document.getElementById('toggle-api-key-visibility');
        this.dom.manageModelsModal = document.getElementById('manage-models-modal');
        this.dom.manageModelsModalTitle = document.getElementById('manage-models-modal-title');
        this.dom.closeManageModelsBtns = document.querySelectorAll('[data-modal-id="manage-models-modal"].close-modal-btn');
        this.dom.manageModelsProviderIdInput = document.getElementById('manage-models-provider-id');
        this.dom.updateModelsListBtn = document.getElementById('update-models-list-btn');
        this.dom.modelsLastUpdatedStatus = document.getElementById('models-last-updated-status');
        this.dom.currentProviderModelsList = document.getElementById('current-provider-models-list');
        this.dom.allProviderModelsList = document.getElementById('all-provider-models-list');
        this.dom.saveManagedModelsBtn = document.getElementById('save-managed-models-btn');
        this.dom.modelsComparisonInfo = document.getElementById('models-comparison-info');
        this.dom.manualModelIdInput = document.getElementById('manual-model-id-input');
        this.dom.manualAddModelBtn = document.getElementById('manual-add-model-btn');
        this.dom.tabLinks = document.querySelectorAll('.tabs .tab-link');
        this.state.hljsThemeLinkTag = document.getElementById('hljs-theme');

        // System Prompts UI
        this.dom.addNewPromptBtn = document.getElementById('add-new-prompt-btn');
        this.dom.systemPromptsList = document.getElementById('system-prompts-list');
        this.dom.systemPromptEditForm = document.getElementById('system-prompt-edit-form');
        this.dom.systemPromptNameInput = document.getElementById('system-prompt-name');
        this.dom.systemPromptTextInput = document.getElementById('system-prompt-text');
        this.dom.saveSystemPromptBtn = document.getElementById('save-system-prompt-btn');
        this.dom.cancelEditSystemPromptBtn = document.getElementById('cancel-edit-system-prompt-btn');
        this.dom.systemPromptsSettingsTab = document.querySelector('.tab-link[data-tab="system-prompts-settings"]');
        this.dom.savedSystemPromptsDropdown = document.getElementById('saved-system-prompts-dropdown');
        this.dom.exportChatFormatSelect = document.getElementById('export-chat-format');
        this.dom.exportCurrentChatBtn = document.getElementById('export-current-chat-btn');
        this.dom.headerExportChatBtn = document.getElementById('header-export-chat-btn');
        this.dom.headerCopyChatBtn = document.getElementById('header-copy-chat-btn'); // Cache the new button

        // Chat Folders UI
        this.dom.chatsSettingsTab = document.querySelector('.tab-link[data-tab="chats-settings"]');
        this.dom.chatFoldersList = document.getElementById('chat-folders-list');
        // Chat Data Management UI
        this.dom.exportAllChatsBtn = document.getElementById('export-all-chats-btn');
        this.dom.importChatsBtn = document.getElementById('import-chats-btn');
        this.dom.importChatsFileInput = document.getElementById('import-chats-file-input');

        // App Settings Import/Export UI
        this.dom.exportSettingsBtn = document.getElementById('export-settings-btn');
        this.dom.importSettingsBtn = document.getElementById('import-settings-btn');
        this.dom.importSettingsFileInput = document.getElementById('import-settings-file-input');

        this.dom.addFolderBtn = document.getElementById('add-folder-btn');
        this.dom.renameFolderBtn = document.getElementById('rename-folder-btn');
        this.dom.deleteFolderBtn = document.getElementById('delete-folder-btn');
        this.dom.addFolderFormContainer = document.getElementById('add-folder-form-container');
        this.dom.newFolderNameInput = document.getElementById('new-folder-name-input');
        this.dom.saveNewFolderBtn = document.getElementById('save-new-folder-btn');
        this.dom.cancelAddFolderBtn = document.getElementById('cancel-add-folder-btn');

        // Rename Chat Modal UI
        this.dom.renameChatModal = document.getElementById('rename-chat-modal');
        this.dom.closeRenameChatModalBtn = document.getElementById('close-rename-chat-modal-btn');
        this.dom.editingChatIdInput = document.getElementById('editing-chat-id-input'); // Although hidden, might be useful
        this.dom.newChatNameInput = document.getElementById('new-chat-name-input');
        this.dom.saveRenameChatBtn = document.getElementById('save-rename-chat-btn');
        this.dom.cancelRenameChatBtn = document.getElementById('cancel-rename-chat-btn');
    },

    _registerServiceWorker: function () {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => console.log('Service Worker registered with scope:', registration.scope))
                .catch(error => console.error('Service Worker registration failed:', error));
        }
    },

    _loadSettings: function () {
        const storedSettings = localStorage.getItem('GrokChatSettings');
        if (storedSettings) {
            this.state.settings = { ...this.config.defaultSettings, ...JSON.parse(storedSettings) };
            this.state.settings.providers = this.state.settings.providers.map(p => ({
                id: p.id || this._generateUUID(),
                ...p,
                models: p.models || {},
            }));
            // Ensure systemPrompts are initialized
            if (!this.state.settings.systemPrompts || !Array.isArray(this.state.settings.systemPrompts) || this.state.settings.systemPrompts.length === 0) {
                this.state.settings.systemPrompts = [...this.config.defaultSettings.systemPrompts];
            }
            // Ensure chatFolders are initialized
            if (!this.state.settings.chatFolders || !Array.isArray(this.state.settings.chatFolders) || this.state.settings.chatFolders.length === 0) {
                this.state.settings.chatFolders = [...this.config.defaultSettings.chatFolders];
            } else {
                // Ensure the 'Default' folder exists and is marked as system if loading from older settings
                const defaultFolderExists = this.state.settings.chatFolders.find(f => f.id === 'default');
                if (!defaultFolderExists) {
                    this.state.settings.chatFolders.unshift({ id: 'default', name: 'Default', isSystem: true });
                } else if (!defaultFolderExists.isSystem) {
                    defaultFolderExists.isSystem = true;
                }
            }
            // Initialize new UI state properties if they don't exist in loaded settings
            this.state.settings.uiState = this.state.settings.uiState || {};
            this.state.settings.uiState.collapsedFolders = this.state.settings.uiState.collapsedFolders || {};
            this.state.settings.uiState.archiveFolded = this.state.settings.uiState.archiveFolded === undefined ? true : this.state.settings.uiState.archiveFolded;

        } else {
            this.state.settings = { ...this.config.defaultSettings };
            this.state.settings.providers = this.state.settings.providers.map(p => ({
                ...p, id: this._generateUUID()
            }));
            // Ensure systemPrompts and chatFolders are initialized for new settings
            this.state.settings.systemPrompts = [...this.config.defaultSettings.systemPrompts];
            this.state.settings.chatFolders = [...this.config.defaultSettings.chatFolders];
            // Initialize UI state for new settings
            this.state.settings.uiState = {
                collapsedFolders: {},
                archiveFolded: true
            };
        }
        console.log("Settings loaded:", this.state.settings);
    },

    saveSettings: function () {
        localStorage.setItem('GrokChatSettings', JSON.stringify(this.state.settings));
        console.log("Settings saved:", this.state.settings);
        this._applyTheme();
        this._updateChatModelSelectors();
        // Potentially re-render parts of UI that depend on uiState, like folder collapse states
        // For now, renderChatList will handle applying these states.
    },

    _initDB: function () {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.config.dbName, this.config.dbVersion);
            request.onupgradeneeded = event => {
                const db = event.target.result;
                const transaction = event.target.transaction;
                let chatStore;
                if (!db.objectStoreNames.contains('chats')) {
                    chatStore = db.createObjectStore('chats', { keyPath: 'id', autoIncrement: true });
                } else {
                    chatStore = transaction.objectStore('chats');
                }
                // Add new indexes if they don't exist.
                // This is safe to run even if the store exists from a previous version without these indexes.
                if (!chatStore.indexNames.contains('updated_at')) {
                    chatStore.createIndex('updated_at', 'updated_at');
                }
                if (!chatStore.indexNames.contains('isPinned')) {
                    chatStore.createIndex('isPinned', 'isPinned');
                }
                if (!chatStore.indexNames.contains('isArchived')) {
                    chatStore.createIndex('isArchived', 'isArchived');
                }
                if (!chatStore.indexNames.contains('folderId')) {
                    chatStore.createIndex('folderId', 'folderId');
                }


                if (!db.objectStoreNames.contains('messages')) {
                    const messageStore = db.createObjectStore('messages', { keyPath: 'id', autoIncrement: true });
                    messageStore.createIndex('chat_id', 'chat_id');
                    messageStore.createIndex('timestamp', 'timestamp');
                }
            };
            request.onsuccess = event => resolve(event.target.result);
            request.onerror = event => reject(event.target.error);
        });
    },

    _applyTheme: function () {
        const theme = this.state.settings.theme;
        const htmlElement = document.documentElement;
        if (theme === 'system') {
            const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            htmlElement.classList.toggle('dark-theme', systemPrefersDark);
            if (this.state.hljsThemeLinkTag) this.state.hljsThemeLinkTag.href = systemPrefersDark ? this.state.hljsThemeDark : this.state.hljsThemeLight;
        } else {
            htmlElement.classList.toggle('dark-theme', theme === 'dark');
            if (this.state.hljsThemeLinkTag) this.state.hljsThemeLinkTag.href = theme === 'dark' ? this.state.hljsThemeDark : this.state.hljsThemeLight;
        }
    },

    _setupResponsiveSidebars: function () {
        const mediaQuery = window.matchMedia('(max-width: 768px)');
        const handleMediaQueryChange = (mq) => {
            if (mq.matches) {
                if (!this.state.isLeftSidebarManuallyToggled) {
                    this.dom.leftSidebar.classList.add('collapsed');
                }
                if (!this.state.isRightSidebarManuallyToggled) {
                    this.dom.rightSidebar.classList.add('collapsed');
                    this.dom.mainContent.classList.remove('right-sidebar-open'); // Ensure main content adjusts
                }
            } else {
                if (!this.state.isLeftSidebarManuallyToggled) {
                    this.dom.leftSidebar.classList.remove('collapsed');
                }
                this.dom.mainContent.classList.toggle('right-sidebar-open', !this.dom.rightSidebar.classList.contains('collapsed'));
            }
        };
    
        mediaQuery.addEventListener('change', handleMediaQueryChange);
        handleMediaQueryChange(mediaQuery); // Initial check
    
        this.dom.toggleLeftSidebarBtn.addEventListener('click', () => {
            this.dom.leftSidebar.classList.toggle('collapsed');
            this.state.isLeftSidebarManuallyToggled = true; 
        });
    
        this.dom.toggleRightSidebarBtn.addEventListener('click', () => {
            this.dom.rightSidebar.classList.toggle('collapsed');
            this.dom.mainContent.classList.toggle('right-sidebar-open', !this.dom.rightSidebar.classList.contains('collapsed'));
            this.state.isRightSidebarManuallyToggled = true;
    
            if (!this.dom.rightSidebar.classList.contains('collapsed')) {
                setTimeout(() => {
                    this._populateSystemPromptDropdown();
                }, 0);
            }
        });
    
        this.dom.closeRightSidebarBtn.addEventListener('click', () => {
            this.dom.rightSidebar.classList.add('collapsed');
            this.dom.mainContent.classList.remove('right-sidebar-open');
            this.state.isRightSidebarManuallyToggled = true;
        });
    },

    _autoAdjustTextareaHeight: function () {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        this.closest('#message-input-container').style.alignItems = 'flex-end';
    },

    _attachEventListeners: function () {
        this.dom.newChatBtn.addEventListener('click', () => this.handleNewChat());
        this.dom.settingsBtn.addEventListener('click', () => this._openSettingsModal());
        this.dom.messageForm.addEventListener('submit', (e) => { e.preventDefault(); this.handleSendMessage(); });
        this.dom.messageInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.handleSendMessage(); } });
        this.dom.closeSettingsModalBtn.addEventListener('click', () => this._closeModal(this.dom.settingsModal));
        this.dom.saveSettingsBtn.addEventListener('click', () => { this._collectSettingsFromForm(); this.saveSettings(); this._closeModal(this.dom.settingsModal); });
        this.dom.themeSelector.addEventListener('change', (e) => { this.state.settings.theme = e.target.value; this._applyTheme(); });
        this.dom.contextWindowSizeInput.addEventListener('input', (e) => { this.dom.contextWindowSizeValue.textContent = e.target.value; this.state.settings.contextWindowSize = parseInt(e.target.value); });
        // Event listener for the unlimited context checkbox
        if (this.dom.unlimitedContextCheckbox) {
            this.dom.unlimitedContextCheckbox.addEventListener('change', (e) => {
                this.state.settings.unlimitedContext = e.target.checked;
                this.dom.contextWindowSizeInput.disabled = e.target.checked;
                this.dom.contextWindowSizeValue.style.opacity = e.target.checked ? 0.5 : 1;
                // If unchecking "Unlimited", ensure the slider value is reflected in settings
                if (!e.target.checked) {
                    this.state.settings.contextWindowSize = parseInt(this.dom.contextWindowSizeInput.value);
                }
            });
        }
        this.dom.copyFormatSelector.addEventListener('change', (e) => { this.state.settings.copyFormat = e.target.value; });
        this.dom.addProviderBtn.addEventListener('click', () => this._openAddProviderModal());
        this.dom.clearAllHistoryBtn.addEventListener('click', () => this.handleClearAllHistory());
        this.dom.closeProviderModalBtns.forEach(btn => btn.addEventListener('click', () => this._closeModal(this.dom.addProviderModal)));
        this.dom.saveProviderBtn.addEventListener('click', () => this.handleSaveProvider());
        this.dom.toggleApiKeyVisibilityBtn.addEventListener('click', () => { const input = this.dom.providerApiKeyInput; const icon = this.dom.toggleApiKeyVisibilityBtn.querySelector('i'); if (input.type === 'password') { input.type = 'text'; icon.classList.remove('fa-eye'); icon.classList.add('fa-eye-slash'); } else { input.type = 'password'; icon.classList.remove('fa-eye-slash'); icon.classList.add('fa-eye'); } });
        this.dom.closeManageModelsBtns.forEach(btn => btn.addEventListener('click', () => this._closeModal(this.dom.manageModelsModal)));
        this.dom.updateModelsListBtn.addEventListener('click', () => this.handleUpdateModelsListFromProvider());
        this.dom.saveManagedModelsBtn.addEventListener('click', () => this.handleSaveManagedModels());
        this.dom.manualAddModelBtn.addEventListener('click', () => this.handleManualAddModel());
        this.dom.tabLinks.forEach(link => { link.addEventListener('click', (e) => { const tabId = e.target.dataset.tab; const tabContainer = e.target.closest('.modal-content, .sidebar'); if (!tabContainer) return; tabContainer.querySelectorAll('.tab-link').forEach(tl => tl.classList.remove('active')); e.target.classList.add('active'); tabContainer.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active')); const activeTabContent = tabContainer.querySelector(`#${tabId}`); if (activeTabContent) activeTabContent.classList.add('active'); }); });
        this.dom.systemPromptInput.addEventListener('change', (e) => { this.state.currentChatParams.systemPrompt = e.target.value; this._saveCurrentChatParams(); });
        this.dom.temperatureInput.addEventListener('input', (e) => { this.dom.temperatureValue.textContent = e.target.value; this.state.currentChatParams.temperature = parseFloat(e.target.value); });
        this.dom.temperatureInput.addEventListener('change', () => this._saveCurrentChatParams());
        this.dom.maxTokensInput.addEventListener('change', (e) => { this.dom.maxTokensValue.textContent = e.target.value; this.state.currentChatParams.max_tokens = parseInt(e.target.value); this._saveCurrentChatParams(); });
        this.dom.maxTokensInput.addEventListener('input', (e) => { this.dom.maxTokensValue.textContent = e.target.value; });
        this.dom.topPInput.addEventListener('input', (e) => { this.dom.topPValue.textContent = e.target.value; this.state.currentChatParams.top_p = parseFloat(e.target.value); });
        this.dom.topPInput.addEventListener('change', () => this._saveCurrentChatParams());
        this.dom.streamOutputCheckbox.addEventListener('change', (e) => { this.state.currentChatParams.stream = e.target.checked; this._saveCurrentChatParams(); });
        this.dom.providerSelectorChat.addEventListener('change', (e) => this._handleChatProviderSelection(e.target.value));
        this.dom.modelSelectorChat.addEventListener('change', (e) => this._handleChatModelSelection(e.target.value));
        this.dom.reasoningEffortCheckbox = document.getElementById('reasoning-effort-checkbox');
        this.dom.reasoningEffortSelect = document.getElementById('reasoning-effort-select');
        this.dom.reasoningEffortCheckbox.addEventListener('change', (e) => {
            this.dom.reasoningEffortSelect.disabled = !e.target.checked;
            if (e.target.checked) {
                this.state.currentChatParams.reasoning_effort = this.dom.reasoningEffortSelect.value;
            } else {
                delete this.state.currentChatParams.reasoning_effort;
            }
            this._saveCurrentChatParams();
        });
        this.dom.reasoningEffortSelect.addEventListener('change', (e) => {
            if (this.dom.reasoningEffortCheckbox.checked) {
                this.state.currentChatParams.reasoning_effort = e.target.value;
                this._saveCurrentChatParams();
            }
        });

        // System Prompt UI Listeners
        if (this.dom.addNewPromptBtn) this.dom.addNewPromptBtn.addEventListener('click', () => this._handleAddNewSystemPrompt());
        if (this.dom.saveSystemPromptBtn) this.dom.saveSystemPromptBtn.addEventListener('click', (e) => { e.preventDefault(); this._handleSaveSystemPrompt(); });
        if (this.dom.cancelEditSystemPromptBtn) this.dom.cancelEditSystemPromptBtn.addEventListener('click', () => {
            this.dom.systemPromptEditForm.style.display = 'none';
            this.state.editingSystemPromptName = null;
        });
        if (this.dom.savedSystemPromptsDropdown) this.dom.savedSystemPromptsDropdown.addEventListener('change', (e) => this._handleSavedPromptSelection(e));
        if (this.dom.exportCurrentChatBtn) this.dom.exportCurrentChatBtn.addEventListener('click', () => this.handleExportChat());
        if (this.dom.headerExportChatBtn) {
            this.dom.headerExportChatBtn.addEventListener('click', () => {
                if (!this.state.currentChatId) {
                    this._showError("No active chat selected to export.");
                    return;
                }
                this.handleExportChat();
            });
        }
        if (this.dom.headerCopyChatBtn) { // Add event listener for the new copy button
            this.dom.headerCopyChatBtn.addEventListener('click', () => this.handleCopyCurrentChat());
        }

        // Chat Folder UI Listeners (in Settings)
        if (this.dom.addFolderBtn) this.dom.addFolderBtn.addEventListener('click', () => this._handleShowAddFolderForm());
        if (this.dom.renameFolderBtn) this.dom.renameFolderBtn.addEventListener('click', () => this._handleShowRenameFolderForm());
        if (this.dom.deleteFolderBtn) this.dom.deleteFolderBtn.addEventListener('click', () => this._handleDeleteFolder());
        if (this.dom.saveNewFolderBtn) this.dom.saveNewFolderBtn.addEventListener('click', () => this._handleSaveFolderPath());
        if (this.dom.cancelAddFolderBtn) this.dom.cancelAddFolderBtn.addEventListener('click', () => this._handleCancelAddFolder());

        // Left Sidebar Folder/Archive Collapse Listeners
        if (this.dom.foldersHeader) {
            this.dom.foldersHeader.addEventListener('click', () => this._toggleMainFoldersSectionCollapse());
        }
        if (this.dom.archiveHeader) {
            this.dom.archiveHeader.addEventListener('click', () => this._toggleArchiveSectionCollapse());
        }
        // Search input listener
        if (this.dom.chatSearchInput) {
            this.dom.chatSearchInput.addEventListener('input', (e) => {
                this.renderChatList(e.target.value.trim().toLowerCase());
            });
        }

        // Chat Data Management listeners
        if (this.dom.exportAllChatsBtn) {
            this.dom.exportAllChatsBtn.addEventListener('click', () => this.handleExportAllChats());
        }
        if (this.dom.importChatsBtn) {
            this.dom.importChatsBtn.addEventListener('click', () => this.handleImportChatsClick());
        }
        if (this.dom.importChatsFileInput) {
            this.dom.importChatsFileInput.addEventListener('change', (e) => this.handleImportFileSelected(e));
        }

        // App Settings Import/Export Listeners
        if (this.dom.exportSettingsBtn) {
            this.dom.exportSettingsBtn.addEventListener('click', () => this._handleExportSettings());
        }
        if (this.dom.importSettingsBtn) {
            this.dom.importSettingsBtn.addEventListener('click', () => this._handleImportSettingsClick());
        }
        if (this.dom.importSettingsFileInput) {
            this.dom.importSettingsFileInput.addEventListener('change', (e) => this._handleImportSettingsFileSelected(e));
        }

        // Rename Chat Modal Listeners
        if (this.dom.saveRenameChatBtn) {
            this.dom.saveRenameChatBtn.addEventListener('click', () => this._handleSaveChatRename());
        }
        if (this.dom.cancelRenameChatBtn) {
            this.dom.cancelRenameChatBtn.addEventListener('click', () => this._handleCancelChatRename());
        }
        if (this.dom.closeRenameChatModalBtn) {
            this.dom.closeRenameChatModalBtn.addEventListener('click', () => this._handleCancelChatRename());
        }
        // Optional: Allow Enter key to save from input field
        if (this.dom.newChatNameInput) {
            this.dom.newChatNameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault(); // Prevent form submission if it were in a form
                    this._handleSaveChatRename();
                }
            });
        }
        // Close rename modal if backdrop is clicked
        if (this.dom.renameChatModal) {
            this.dom.renameChatModal.addEventListener('click', (event) => {
                if (event.target === this.dom.renameChatModal) { // Clicked on backdrop
                    this._handleCancelChatRename();
                }
            });
        }

    },

    _handleSaveChatRename: async function() {
        const newTitle = this.dom.newChatNameInput.value.trim();
        const chatId = this.state.editingChatId;

        if (!chatId) {
            this._showError("No chat selected for renaming.");
            this._handleCancelChatRename(); // Close modal and clear state
            return;
        }

        if (!newTitle) {
            this._showError("Chat name cannot be empty.");
            this.dom.newChatNameInput.focus(); // Keep modal open and focus input
            return;
        }

        const chat = await this.getChat(chatId);
        if (chat) {
            chat.title = newTitle;
            chat.updated_at = Date.now();
            await this.updateChat(chat);
            await this.renderChatList();
            if (this.state.currentChatId === chatId) {
                this._updateChatHeader(chatId);
            }
            this._showToast("Chat renamed successfully.");
        } else {
            this._showError("Failed to find chat to rename.");
        }
        this._handleCancelChatRename(); // Close modal and clear state
    },

    _handleCancelChatRename: function() {
        this.dom.renameChatModal.style.display = 'none';
        this.state.editingChatId = null;
        this.dom.newChatNameInput.value = ''; // Clear input
    },


    _handleExportSettings: function() {
        try {
            // Create a deep copy to avoid modifying the actual state if we need to filter/transform
            const settingsToExport = JSON.parse(JSON.stringify(this.state.settings));

            // Optionally, remove or obfuscate sensitive data if necessary, e.g., API keys
            // For now, we export all settings as is.
            // Example:
            // if (settingsToExport.providers) {
            //     settingsToExport.providers.forEach(p => { delete p.apiKey; });
            // }

            const jsonContent = JSON.stringify(settingsToExport, null, 2);
            const now = new Date();
            const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
            const filename = `GrokChat_Settings_${timestamp}.json`;

            this._triggerDownload(jsonContent, filename, 'application/json');
            this._showToast("Settings exported successfully!");
        } catch (error) {
            console.error("Error exporting settings:", error);
            this._showError("Failed to export settings: " + error.message);
        }
    },

    _handleImportSettingsClick: function() {
        if (this.dom.importSettingsFileInput) {
            this.dom.importSettingsFileInput.click();
        }
    },

    _handleImportSettingsFileSelected: function(event) {
        const file = event.target.files[0];
        if (!file) {
            return;
        }

        // Reset file input to allow importing the same file again if needed
        event.target.value = null;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const importedSettingsText = e.target.result;
                const parsedSettings = JSON.parse(importedSettingsText);

                if (typeof parsedSettings !== 'object' || parsedSettings === null) {
                    this._showError("Invalid settings file: Content is not a valid JSON object.");
                    return;
                }

                // Basic validation: Check for a few key properties to ensure it's likely a settings file
                // More robust validation could involve checking types of each key, etc.
                const essentialKeys = ['theme', 'providers', 'systemPrompts', 'chatFolders'];
                for (const key of essentialKeys) {
                    if (!(key in parsedSettings)) {
                        // Allow missing keys if they are present in defaultSettings (they will be merged)
                        // However, if a key like 'providers' is totally missing and it's crucial,
                        // it might indicate a corrupted or incorrect settings file.
                        // For now, we'll be somewhat lenient and rely on the merge with defaults.
                        console.warn(`Imported settings missing key: ${key}. Default will be used if available.`);
                    }
                }

                // Merge strategy:
                // Start with default settings to ensure all keys are present.
                // Then, overwrite with imported settings.
                // This ensures that if the imported file is from an older version and misses new settings,
                // those new settings get their default values.
                const newSettings = { ...this.config.defaultSettings };

                // Deep merge for nested objects like 'uiState'
                // For arrays like 'providers', 'systemPrompts', 'chatFolders', the imported array replaces the default.
                for (const key in parsedSettings) {
                    if (parsedSettings.hasOwnProperty(key)) {
                        if (Array.isArray(parsedSettings[key])) {
                            newSettings[key] = JSON.parse(JSON.stringify(parsedSettings[key])); // Deep copy arrays
                        } else if (typeof parsedSettings[key] === 'object' && parsedSettings[key] !== null && newSettings[key] && typeof newSettings[key] === 'object') {
                            // Deep merge for objects like uiState
                            newSettings[key] = { ...newSettings[key], ...JSON.parse(JSON.stringify(parsedSettings[key])) };
                        } else {
                            newSettings[key] = parsedSettings[key];
                        }
                    }
                }

                // Ensure essential arrays are initialized if not present in imported file (already handled by defaulting above)
                newSettings.providers = newSettings.providers || [];
                newSettings.systemPrompts = newSettings.systemPrompts || [];
                newSettings.chatFolders = newSettings.chatFolders || [];
                 // Ensure 'Default' folder exists and is system folder
                let defaultFolder = newSettings.chatFolders.find(f => f.id === 'default');
                if (!defaultFolder) {
                    newSettings.chatFolders.unshift({ id: 'default', name: 'Default', isSystem: true });
                } else {
                    defaultFolder.isSystem = true; // Ensure it's marked as system
                }


                this.state.settings = newSettings;

                this.saveSettings(); // Persist to localStorage and apply theme etc.
                this._populateSettingsForm(); // Update the settings modal UI
                this._applyTheme(); // Apply theme immediately
                this._updateChatModelSelectors(); // Update provider/model dropdowns
                await this.renderChatList(); // Re-render chat list (folders might have changed)

                this._showToast("Settings imported successfully!");

            } catch (error) {
                console.error("Error importing settings:", error);
                this._showError(`Failed to import settings: ${error.message}`);
            }
        };

        reader.onerror = (error) => {
            console.error("Error reading settings import file:", error);
            this._showError("Failed to read the settings import file.");
        };

        reader.readAsText(file);
    },

    handleExportAllChats: async function () {
        if (!this.state.db) {
            this._showError("Database not available. Cannot export chats.");
            return;
        }

        const allChats = await this.getAllChats();
        if (allChats.length === 0) {
            this._showError("No chats to export.");
            return;
        }

        const exportData = [];
        for (const chat of allChats) {
            const messages = await this.getMessagesForChat(chat.id);
            // Create a chat object for export, excluding the original id to avoid import conflicts
            // and including all other relevant chat properties.
            const chatExportObject = {
                title: chat.title,
                created_at: chat.created_at,
                updated_at: chat.updated_at,
                default_provider_id: chat.default_provider_id,
                default_model_id: chat.default_model_id,
                system_prompt: chat.system_prompt,
                temperature: chat.temperature,
                max_tokens: chat.max_tokens,
                top_p: chat.top_p,
                isPinned: chat.isPinned || false,
                isArchived: chat.isArchived || false,
                folderId: chat.folderId, // This might need mapping if folder IDs change on import
                messages: messages.map(msg => ({
                    // Exclude message id, it will be regenerated on import
                    role: msg.role,
                    content: msg.content,
                    timestamp: msg.timestamp,
                    model: msg.model,
                    provider: msg.provider,
                    technical_info: msg.technical_info,
                    edited: msg.edited
                }))
            };
            exportData.push(chatExportObject);
        }

        const jsonContent = JSON.stringify(exportData, null, 2);
        const now = new Date();
        const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
        const filename = `GrokChat_All_Chats_${timestamp}.json`;

        this._triggerDownload(jsonContent, filename, 'application/json');
        this._showToast("All chats exported successfully!");
    },

    handleImportChatsClick: function () {
        if (this.dom.importChatsFileInput) {
            this.dom.importChatsFileInput.click();
        }
    },

    handleImportFileSelected: async function (event) {
        if (!this.state.db) {
            this._showError("Database not available. Cannot import chats.");
            return;
        }

        const file = event.target.files[0];
        if (!file) {
            return;
        }

        // Reset file input to allow importing the same file again if needed
        event.target.value = null;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const importedData = JSON.parse(e.target.result);

                if (!Array.isArray(importedData)) {
                    this._showError("Invalid import file: Root should be an array of chats.");
                    return;
                }

                let importedCount = 0;
                for (const chatData of importedData) {
                    // Basic validation for essential chat properties
                    if (typeof chatData.title !== 'string' ||
                        typeof chatData.created_at !== 'number' ||
                        typeof chatData.updated_at !== 'number' ||
                        !Array.isArray(chatData.messages)) {
                        console.warn("Skipping invalid chat object during import:", chatData);
                        continue; // Skip this chat if essential fields are missing/invalid
                    }

                    const newChat = {
                        title: chatData.title,
                        created_at: chatData.created_at,
                        updated_at: chatData.updated_at,
                        default_provider_id: chatData.default_provider_id,
                        default_model_id: chatData.default_model_id,
                        system_prompt: chatData.system_prompt,
                        temperature: chatData.temperature,
                        max_tokens: chatData.max_tokens,
                        top_p: chatData.top_p,
                        isPinned: chatData.isPinned || false,
                        isArchived: chatData.isArchived || false,
                        folderId: null, // Default to null
                    };

                    // Check if folderId from import exists in current settings
                    if (chatData.folderId) {
                        const folderExists = this.state.settings.chatFolders.some(folder => folder.id === chatData.folderId);
                        if (folderExists) {
                            newChat.folderId = chatData.folderId;
                        } else {
                            console.warn(`Folder ID "${chatData.folderId}" from import not found. Chat "${chatData.title}" will be placed in default history.`);
                            // newChat.folderId remains null
                        }
                    }

                    const newChatId = await this.addChat(newChat);

                    for (const msgData of chatData.messages) {
                        // Basic validation for message properties
                        if (typeof msgData.role !== 'string' ||
                            typeof msgData.content !== 'string' ||
                            typeof msgData.timestamp !== 'number') {
                            console.warn("Skipping invalid message object during import:", msgData, "for chat:", newChat.title);
                            continue; // Skip invalid messages
                        }

                        const newMessage = {
                            chat_id: newChatId,
                            role: msgData.role,
                            content: msgData.content,
                            timestamp: msgData.timestamp,
                            model: msgData.model,
                            provider: msgData.provider,
                            technical_info: msgData.technical_info,
                            edited: msgData.edited || false
                        };
                        await this.addMessage(newMessage);
                    }
                    importedCount++;
                }

                if (importedCount > 0) {
                    this._showToast(`${importedCount} chat(s) imported successfully!`);
                    await this.renderChatList();
                    
                    if (this.state.currentChatId === null && importedCount > 0) { // If no chat was open, load the first imported one or last one
                        await this.loadInitialChat(); // This will load the most recent chat
                    }
                } else if (importedData.length > 0) {
                     this._showError("No valid chats found in the file to import.");
                } else {
                     this._showError("Import file was empty or contained no chat data.");
                }

            } catch (error) {
                console.error("Error importing chats:", error);
                this._showError(`Failed to import chats: ${error.message}`);
            }
        };

        reader.onerror = (error) => {
            console.error("Error reading import file:", error);
            this._showError("Failed to read the import file.");
        };

        reader.readAsText(file);
    },

    handleExportChat: async function () {
        const format = this.dom.exportChatFormatSelect.value;
        const chatId = this.state.currentChatId;

        if (!chatId) {
            this._showError("No active chat selected to export.");
            return;
        }

        const messages = await this.getMessagesForChat(chatId);
        const chat = await this.getChat(chatId);

        if (!messages || messages.length === 0) {
            this._showError("No messages in the current chat to export.");
            return;
        }

        let content;
        let fileExtension;

        if (format === 'markdown') {
            content = this.formatChatToMarkdown(messages, chat);
            fileExtension = 'md';
        } else if (format === 'json') {
            content = this.formatChatToJson(messages, chat);
            fileExtension = 'json';
        } else {
            this._showError("Invalid export format selected.");
            return;
        }

        const now = new Date();
        const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
        const filename = `GrokChat_${timestamp}.${fileExtension}`;

        this._triggerDownload(content, filename, format === 'json' ? 'application/json' : 'text/markdown');
        this._showToast("Chat exported successfully!");
    },

    handleCopyCurrentChat: async function () {
        if (!this.state.currentChatId) {
            this._showError("No active chat selected to copy.");
            return;
        }

        const messages = await this.getMessagesForChat(this.state.currentChatId);
        const chat = await this.getChat(this.state.currentChatId);

        if (!messages || messages.length === 0) {
            this._showError("No messages in the current chat to copy.");
            return;
        }

        let contentToCopy = '';
        const format = this.state.settings.copyFormat;

        if (format === 'markdown') {
            contentToCopy = this.formatChatToMarkdown(messages, chat); // Re-use existing Markdown formatting
        } else if (format === 'plaintext') {
            // Similar to formatChatToMarkdown but for plain text
            const plainTextLines = [];
            if (chat && chat.title) plainTextLines.push(`Chat: ${chat.title}`);
            plainTextLines.push(`Copied on: ${new Date().toLocaleString()}`);
            let modelInfo = (chat && chat.default_model_id) ? chat.default_model_id : 'N/A';
            if (modelInfo === 'N/A') {
                const lastAssistantMsg = messages.filter(m => m.role === 'assistant' && m.model).pop();
                if (lastAssistantMsg) modelInfo = lastAssistantMsg.model;
            }
            plainTextLines.push(`Model: ${modelInfo}`);
            plainTextLines.push("\n---\n");

            messages.forEach(msg => {
                const sender = msg.role === 'user' ? 'User' : (msg.model || 'Assistant');
                const time = this._formatTimestamp(msg.timestamp);
                plainTextLines.push(`${sender} (${time}):`);

                // Convert Markdown content to plain text
                let messageContent = msg.content || '';
                if (typeof window.marked === 'object' && typeof window.marked.parse === 'function' &&
                    typeof window.DOMPurify === 'object' && typeof window.DOMPurify.sanitize === 'function') {
                    const tempDiv = document.createElement('div');
                    // Sanitize and parse Markdown, then get textContent
                    tempDiv.innerHTML = window.DOMPurify.sanitize(window.marked.parse(messageContent));
                    // Remove thinking blocks before getting textContent
                    tempDiv.querySelectorAll('.thinking-block summary').forEach(s => s.remove());
                    tempDiv.querySelectorAll('.thinking-block').forEach(tb => {
                        // Optional: replace thinking block with a placeholder or just remove its content
                        // For plaintext, usually just removing is fine.
                        const thinkingContentDiv = tb.querySelector('div');
                        if (thinkingContentDiv) thinkingContentDiv.remove();
                    });
                    messageContent = tempDiv.textContent || tempDiv.innerText || "";
                } // else, if libs not loaded, use raw content (which might be Markdown)

                plainTextLines.push(messageContent.trim()); // Trim to remove excessive newlines from parsing
                plainTextLines.push("\n---\n");
            });
            contentToCopy = plainTextLines.join('\n');
        } else {
            this._showError("Invalid copy format selected in settings.");
            return;
        }

        navigator.clipboard.writeText(contentToCopy)
            .then(() => this._showToast("Chat copied to clipboard!"))
            .catch(err => {
                console.error("Failed to copy chat:", err);
                this._showError("Failed to copy chat to clipboard.");
            });
    },

    formatChatToMarkdown: function (messages, chat) {
        const markdownLines = [];
        if (chat && chat.title) markdownLines.push(`# Chat: ${chat.title}`);
        markdownLines.push(`## Exported on: ${new Date().toLocaleString()}`);

        let modelInfo = (chat && chat.default_model_id) ? chat.default_model_id : 'N/A';
        if (modelInfo === 'N/A') {
            const lastAssistantMsg = messages.filter(m => m.role === 'assistant' && m.model).pop();
            if (lastAssistantMsg) modelInfo = lastAssistantMsg.model;
        }
        markdownLines.push(`## Model: ${modelInfo}`);
        markdownLines.push("\n---\n");

        messages.forEach(msg => {
            const sender = msg.role === 'user' ? 'User' : (msg.model || 'Assistant');
            const time = this._formatTimestamp(msg.timestamp);
            markdownLines.push(`**${sender}** (${time}):`);
            // Ensure newlines in message content are rendered as paragraphs in Markdown
            markdownLines.push(msg.content.replace(/\n/g, '\n\n'));
            markdownLines.push("\n---\n");
        });
        return markdownLines.join('\n');
    },

    formatChatToJson: function (messages, chat) {
        let modelInfo = (chat && chat.default_model_id) ? chat.default_model_id : 'N/A';
        if (modelInfo === 'N/A') {
            const lastAssistantMsg = messages.filter(m => m.role === 'assistant' && m.model).pop();
            if (lastAssistantMsg) modelInfo = lastAssistantMsg.model;
        }

        const exportData = {
            chatTitle: (chat && chat.title) ? chat.title : 'N/A',
            exportDate: new Date().toISOString(),
            model: modelInfo,
            messages: messages.map(msg => ({
                id: msg.id,
                role: msg.role,
                content: msg.content,
                timestamp: msg.timestamp,
                formattedTimestamp: this._formatTimestamp(msg.timestamp),
                model: msg.model, // Will be undefined for user messages, that's fine
                provider: msg.provider, // Will be undefined for user messages
                technical_info: msg.technical_info // May be undefined
            }))
        };
        return JSON.stringify(exportData, null, 2);
    },

    renderChatList: async function (searchTerm = '') { // Added searchTerm parameter with default
        if (!this.state.db) {
            const dbErrorMsg = '<li>Database not available.</li>';
            if (this.dom.pinnedChatList) this.dom.pinnedChatList.innerHTML = dbErrorMsg;
            if (this.dom.foldersContainer) this.dom.foldersContainer.innerHTML = dbErrorMsg;
            if (this.dom.historyChatList) this.dom.historyChatList.innerHTML = dbErrorMsg;
            if (this.dom.archiveChatList) this.dom.archiveChatList.innerHTML = dbErrorMsg;
            if (this.dom.settingsChatList) this.dom.settingsChatList.innerHTML = dbErrorMsg;
            return;
        }

        let chats = await this.getAllChats(); // Changed to let for potential reassignment by search

        // Filter chats by search term if provided
        if (searchTerm && searchTerm.length > 0) {
            chats = chats.filter(chat => (chat.title || `Chat ${chat.id}`).toLowerCase().includes(searchTerm));
        }

        // Clear existing lists
        if (this.dom.pinnedChatList) this.dom.pinnedChatList.innerHTML = '';
        if (this.dom.foldersContainer) this.dom.foldersContainer.innerHTML = ''; // Will need more specific clearing logic for folders later
        if (this.dom.historyChatList) this.dom.historyChatList.innerHTML = '';
        if (this.dom.archiveChatList) this.dom.archiveChatList.innerHTML = '';
        if (this.dom.settingsChatList) this.dom.settingsChatList.innerHTML = '';

        if (chats.length === 0) {
            const noChatsMsg = '<li>No chats yet. Start a new one!</li>';
            if (this.dom.historyChatList) this.dom.historyChatList.innerHTML = noChatsMsg;
            if (this.dom.settingsChatList) this.dom.settingsChatList.innerHTML = noChatsMsg;
            // Optionally show "No pinned chats", "No archived chats" etc. in other sections
            if (this.dom.pinnedChatList) this.dom.pinnedChatList.innerHTML = '<li>No pinned chats.</li>';
            if (this.dom.archiveChatList) this.dom.archiveChatList.innerHTML = '<li>No archived chats.</li>';
            // Folders container might show "No folders" or similar, handled when folder rendering is implemented
            return;
        }

        chats.sort((a, b) => b.updated_at - a.updated_at);

        // For now, populate all chats into historyChatList as a temporary measure.
        // chats.forEach(chat => { // Old loop, will be replaced by section-specific loops
        //     const chatItemElement = this._createChatItemElement(chat);
        //     if (this.dom.historyChatList) this.dom.historyChatList.appendChild(chatItemElement);
        // ...
        // });

        // Apply archive section folding state
        if (this.dom.archiveHeader && this.dom.archiveHeader.parentElement) {
            if (this.state.settings.uiState.archiveFolded) {
                this.dom.archiveHeader.parentElement.classList.add('folded');
                this.dom.archiveHeader.querySelector('i').classList.replace('fa-chevron-down', 'fa-chevron-right');
            } else {
                this.dom.archiveHeader.parentElement.classList.remove('folded');
                this.dom.archiveHeader.querySelector('i').classList.replace('fa-chevron-right', 'fa-chevron-down');
            }
        }

        // Apply Folders section folding state
        if (this.dom.foldersHeader && this.dom.foldersHeader.parentElement) {
            // Assuming 'foldersFolded' might be a new state property, or use a default.
            // For now, let's assume it starts expanded or manage its state similarly to archive.
            // Let's add a state for overall folders section: this.state.settings.uiState.foldersSectionFolded
            if (this.state.settings.uiState.foldersSectionFolded) { // Default to false if not set
                this.dom.foldersHeader.parentElement.classList.add('folded');
                this.dom.foldersContainer.style.display = 'none';
                this.dom.foldersHeader.querySelector('i').classList.replace('fa-chevron-down', 'fa-chevron-right');
            } else {
                this.dom.foldersHeader.parentElement.classList.remove('folded');
                this.dom.foldersContainer.style.display = 'block';
                this.dom.foldersHeader.querySelector('i').classList.replace('fa-chevron-right', 'fa-chevron-down');
            }
        }


        const allUserChats = chats.map(chat => ({
            ...chat,
            isPinned: chat.isPinned || false,
            isArchived: chat.isArchived || false,
            folderId: chat.folderId // Keep as is, could be null or an ID
        }));

        const unarchivedChats = allUserChats.filter(chat => !chat.isArchived);
        const archivedChatsData = allUserChats.filter(chat => chat.isArchived);

        // Populate Pinned List (Unarchived and Pinned)
        const pinnedChatsData = unarchivedChats.filter(chat => chat.isPinned);
        if (pinnedChatsData.length > 0) {
            pinnedChatsData.forEach(chat => {
                if (this.dom.pinnedChatList) this.dom.pinnedChatList.appendChild(this._createChatItemElement(chat));
            });
        } else {
            if (this.dom.pinnedChatList) this.dom.pinnedChatList.innerHTML = '<li>No pinned chats.</li>';
        }

        // Populate Folders
        this.dom.foldersContainer.innerHTML = ''; // Clear previous folder contents
        const folders = this.state.settings.chatFolders || [];
        folders.forEach(folder => {
            if (folder.id === 'default') return; // Skip default folder, its chats go to History if not otherwise categorized

            const folderItemDiv = document.createElement('div');
            folderItemDiv.classList.add('folder-item');
            folderItemDiv.dataset.folderId = folder.id;

            const folderHeaderH5 = document.createElement('h5');
            folderHeaderH5.innerHTML = `<i class="fas fa-chevron-down"></i> ${folder.name}`;
            folderHeaderH5.addEventListener('click', () => this._toggleFolderCollapse(folder.id));
            folderItemDiv.appendChild(folderHeaderH5);

            const folderChatListUl = document.createElement('ul');
            const chatsInFolder = unarchivedChats.filter(chat => !chat.isPinned && chat.folderId === folder.id);

            if (chatsInFolder.length > 0) {
                chatsInFolder.forEach(chat => folderChatListUl.appendChild(this._createChatItemElement(chat)));
            } else {
                folderChatListUl.innerHTML = '<li>No chats in this folder.</li>';
            }
            folderItemDiv.appendChild(folderChatListUl);

            // Apply individual folder collapse state
            if (this.state.settings.uiState.collapsedFolders[folder.id]) {
                folderItemDiv.classList.add('collapsed');
                folderHeaderH5.querySelector('i').classList.replace('fa-chevron-down', 'fa-chevron-right');
            }

            this.dom.foldersContainer.appendChild(folderItemDiv);
        });
        if (folders.length <= 1 && folders.every(f => f.id === 'default')) { // Only default folder exists
            this.dom.foldersContainer.innerHTML = '<li>No custom folders created.</li>';
        }


        // Populate History List (Unarchived, Not Pinned, and in 'default' or no folder)
        const historyChatsData = unarchivedChats.filter(chat =>
            !chat.isPinned &&
            (!chat.folderId || chat.folderId === 'default')
        );
        if (historyChatsData.length > 0) {
            historyChatsData.forEach(chat => {
                if (this.dom.historyChatList) this.dom.historyChatList.appendChild(this._createChatItemElement(chat));
            });
        } else {
            if (this.dom.historyChatList) this.dom.historyChatList.innerHTML = '<li>No active chats in history.</li>';
        }

        // Populate Archive List
        if (archivedChatsData.length > 0) {
            archivedChatsData.forEach(chat => {
                if (this.dom.archiveChatList) this.dom.archiveChatList.appendChild(this._createChatItemElement(chat));
            });
        } else {
            if (this.dom.archiveChatList) this.dom.archiveChatList.innerHTML = '<li>No archived chats.</li>';
        }


        // Populate settings chat list (this part can remain similar, uses all chats from the initial fetch, possibly filtered by search)
        if (this.dom.settingsChatList) {
            this.dom.settingsChatList.innerHTML = ''; // Clear before repopulating
            // Use the 'chats' array which is the source, potentially filtered by search term
            chats.forEach(chat_item => { // Changed 'chat' to 'chat_item' to avoid conflict if 'chat' is a global/closure var
                const settingsLi = document.createElement('li');
                settingsLi.textContent = chat_item.title || `Chat ${chat_item.id}`;
                const settingsDeleteBtn = document.createElement('button');
                settingsDeleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Delete';
                settingsDeleteBtn.classList.add('btn', 'btn-danger', 'btn-sm');
                settingsDeleteBtn.onclick = () => this.handleDeleteChat(chat_item.id, true); // Use chat_item.id
                settingsLi.appendChild(settingsDeleteBtn);
                this.dom.settingsChatList.appendChild(settingsLi);
            });
        }
    },

    _createChatItemElement: function(chat) {
        const li = document.createElement('li');
        li.dataset.chatId = chat.id;
        // Ensure chat properties are defaulted if undefined (for chats loaded from older DB versions)
        const isPinned = chat.isPinned || false;
        const isArchived = chat.isArchived || false;
        // folderId will be handled later

        li.classList.toggle('active-chat', chat.id === this.state.currentChatId);
        // Add classes for styling based on state, if needed (e.g., .pinned-item, .archived-item)
        // if (isPinned) li.classList.add('pinned-chat-item');
        // if (isArchived) li.classList.add('archived-chat-item');


        const titleSpan = document.createElement('span');
        titleSpan.classList.add('chat-item-title');
        titleSpan.textContent = chat.title || `Chat ${chat.id}`;
        li.appendChild(titleSpan);

        const menuButton = document.createElement('button');
        menuButton.classList.add('chat-item-menu-btn');
        menuButton.innerHTML = '<i class="fas fa-ellipsis-v"></i>';
        menuButton.title = "More options";
        menuButton.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent chat selection
            this._displayChatItemContextMenu(event, chat.id);
        });
        li.appendChild(menuButton);

        li.addEventListener('click', () => this.loadChat(chat.id));
        return li;
    },

    _displayChatItemContextMenu: function(event, chatId) {
        event.preventDefault();
        this._closeOpenContextMenu(); // Close any existing menu

        const contextMenu = document.createElement('div');
        contextMenu.id = 'chat-item-context-menu'; // Use ID for easier selection/styling
        contextMenu.classList.add('chat-context-menu'); // General class for styling

        // Fetch the chat details asynchronously to ensure fresh data for menu labels
        this.getChat(chatId).then(chatDetails => {
            const chat = chatDetails || {}; // Fallback if chatDetails is null/undefined
            const isPinned = chat.isPinned || false;
            const isArchived = chat.isArchived || false;
            // folderId will be used later for "Remove from folder"

            const actions = [
                { label: 'Rename', action: () => this.handleRenameChat(chatId) },
                { label: 'Delete', action: () => this.handleDeleteChat(chatId) },
                { label: 'Add to Folder...', action: () => this.handleShowFolderSubmenu(chatId, event.target) },
                { label: isPinned ? 'Unpin' : 'Pin', action: () => this.handleTogglePinChat(chatId) },
                { label: isArchived ? 'Unarchive' : 'Archive', action: () => this.handleToggleArchiveChat(chatId) },
                { label: 'Export', action: () => this.handleExportSingleChat(chatId) }
            ];

            actions.forEach(item => {
                const button = document.createElement('button');
                button.textContent = item.label;
                button.addEventListener('click', (e) => {
                    e.stopPropagation();
                    item.action();
                    this._closeOpenContextMenu();
                });
                contextMenu.appendChild(button);
            });

            document.body.appendChild(contextMenu);

            // Position the menu
            const clickX = event.clientX;
            const clickY = event.clientY;
            const menuWidth = contextMenu.offsetWidth;
            const menuHeight = contextMenu.offsetHeight;
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;

            let menuX = clickX + 5;
            let menuY = clickY + 5;

            if (clickX + menuWidth > windowWidth) {
                menuX = clickX - menuWidth - 5;
            }
            if (clickY + menuHeight > windowHeight) {
                menuY = clickY - menuHeight - 5;
            }
            menuX = Math.max(5, menuX);
            menuY = Math.max(5, menuY);

            contextMenu.style.left = `${menuX}px`;
            contextMenu.style.top = `${menuY}px`;
            contextMenu.style.display = 'block';

            // Add global listener to close menu
            document.addEventListener('click', this._globalClickListenerForContextMenu, true);
        }).catch(error => {
            console.error("Error fetching chat details for context menu:", error);
            this._showError("Could not display chat options. Please try again.");
            // Ensure any partially created menu is removed if an error occurs before display
            this._closeOpenContextMenu();
        });
    },

    _closeOpenContextMenu: function() {
        const existingMenu = document.getElementById('chat-item-context-menu');
        if (existingMenu) {
            existingMenu.remove();
        }
        document.removeEventListener('click', this._globalClickListenerForContextMenu, true);
    },

    _globalClickListenerForContextMenu: function(event) {
        const menu = document.getElementById('chat-item-context-menu');
        // If the click is outside the menu and not on a menu button itself (which would be handled by stopPropagation)
        if (menu && !menu.contains(event.target)) {
            GrokChatApp._closeOpenContextMenu();
        }
    },

    // Placeholder handlers (to be implemented or connected later)
    handleShowFolderSubmenu: async function(chatId, targetElement) { // Added async
        console.log(`Show folder submenu for chat ${chatId}`, targetElement);
        // this._showToast("Folder submenu not yet implemented."); // Removed toast
        // Implementation will involve creating another small div positioned relative to targetElement
        this._closeOpenContextMenu(); // Close main context menu first
        const FOLDER_SUBMENU_ID = 'chat-item-folder-submenu';
        this._closeOpenFolderSubmenu(); // Close any existing folder submenu

        const submenu = document.createElement('div');
        submenu.id = FOLDER_SUBMENU_ID;
        submenu.classList.add('chat-context-menu', 'folder-submenu'); // Reuse styling

        const chat = await this.getChat(chatId); // Fetch chat to see its current folder

        // Add "Remove from folder" option if chat is in a folder
        if (chat && chat.folderId && chat.folderId !== 'default') {
            const currentFolder = this.state.settings.chatFolders.find(f => f.id === chat.folderId);
            const removeFromFolderBtn = document.createElement('button');
            removeFromFolderBtn.textContent = `Remove from "${currentFolder ? currentFolder.name : 'Folder'}"`;
            removeFromFolderBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                await this.handleRemoveFromFolder(chatId);
                this._closeOpenFolderSubmenu();
                this._closeOpenContextMenu(); // Ensure main menu also closes
            });
            submenu.appendChild(removeFromFolderBtn);

            const separator = document.createElement('hr'); // Visual separator
            submenu.appendChild(separator);
        }

        const availableFolders = this.state.settings.chatFolders.filter(f => !f.isSystem); // Exclude 'Default' system folder
        if (availableFolders.length > 0) {
            availableFolders.forEach(folder => {
                if (chat && chat.folderId === folder.id) return; // Don't list current folder as an option to move to

                const folderButton = document.createElement('button');
                folderButton.textContent = folder.name;
                folderButton.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    await this.handleAddToFolder(chatId, folder.id);
                    this._closeOpenFolderSubmenu();
                    this._closeOpenContextMenu(); // Ensure main menu also closes
                });
                submenu.appendChild(folderButton);
            });
        } else {
            const noFoldersMsg = document.createElement('span');
            noFoldersMsg.textContent = 'No custom folders available.';
            noFoldersMsg.style.padding = '8px 15px';
            noFoldersMsg.style.display = 'block';
            noFoldersMsg.style.opacity = '0.7';
            submenu.appendChild(noFoldersMsg);
        }


        document.body.appendChild(submenu);

        // Position submenu relative to the "Add to Folder..." button (targetElement)
        const mainMenuItemRect = targetElement.getBoundingClientRect();
        submenu.style.left = `${mainMenuItemRect.right + 5}px`; // Position to the right
        submenu.style.top = `${mainMenuItemRect.top}px`;       // Align top
        submenu.style.display = 'block';

        // Add global listener to close submenu
        // Use a named function for the listener so it can be removed.
        this._folderSubmenuClickListener = (event) => {
            if (!submenu.contains(event.target)) {
                this._closeOpenFolderSubmenu();
            }
        };
        document.addEventListener('click', this._folderSubmenuClickListener, true);

    },

    _closeOpenFolderSubmenu: function() {
        const FOLDER_SUBMENU_ID = 'chat-item-folder-submenu';
        const existingSubmenu = document.getElementById(FOLDER_SUBMENU_ID);
        if (existingSubmenu) {
            existingSubmenu.remove();
        }
        if (this._folderSubmenuClickListener) {
            document.removeEventListener('click', this._folderSubmenuClickListener, true);
            this._folderSubmenuClickListener = null;
        }
    },

    handleAddToFolder: async function(chatId, folderId) {
        const chat = await this.getChat(chatId);
        if (chat) {
            chat.folderId = folderId;
            chat.updated_at = Date.now(); // Mark as updated
            await this.updateChat(chat);
            await this.renderChatList();
            this._showToast("Chat moved to folder.");
        }
    },

    handleRemoveFromFolder: async function(chatId) {
        const chat = await this.getChat(chatId);
        if (chat) {
            chat.folderId = null; // Or 'default' if explicitly assigning to default
            chat.updated_at = Date.now();
            await this.updateChat(chat);
            await this.renderChatList();
            this._showToast("Chat removed from folder.");
        }
    },

    _toggleFolderCollapse: function(folderId) {
        this.state.settings.uiState.collapsedFolders[folderId] = !this.state.settings.uiState.collapsedFolders[folderId];
        this.saveSettings(); // Save the new collapse state
        this.renderChatList(); // Re-render to apply the change visually
    },

    _toggleMainFoldersSectionCollapse: function() {
        this.state.settings.uiState.foldersSectionFolded = !(this.state.settings.uiState.foldersSectionFolded || false);
        this.saveSettings();
        this.renderChatList();
    },

    _toggleArchiveSectionCollapse: function() {
        this.state.settings.uiState.archiveFolded = !(this.state.settings.uiState.archiveFolded || false);
        this.saveSettings();
        this.renderChatList();
    },

    handleTogglePinChat: async function(chatId) {
        console.log(`Toggle pin for chat ${chatId}`);
        const chat = await this.getChat(chatId);
        if (chat) {
            chat.isPinned = !(chat.isPinned || false); // Toggle, defaulting to false if undefined
            if (chat.isPinned && chat.isArchived) { // If pinning an archived chat, unarchive it
                chat.isArchived = false;
                this._showToast("Chat unarchived and pinned.");
            }
            chat.updated_at = Date.now(); // Consider if pinning should update timestamp
            await this.updateChat(chat);
            await this.renderChatList();
            // No toast here, re-render shows the change. Or a subtle one:
            // this._showToast(`Chat ${chat.isPinned ? 'pinned' : 'unpinned'}.`);
        }
    },
    handleToggleArchiveChat: async function(chatId) {
        console.log(`Toggle archive for chat ${chatId}`);
        const chat = await this.getChat(chatId);
        if (chat) {
            chat.isArchived = !(chat.isArchived || false); // Toggle
            if (chat.isArchived && chat.isPinned) { // If archiving a pinned chat, unpin it
                chat.isPinned = false;
                this._showToast("Chat unpinned and archived.");
            }
            chat.updated_at = Date.now(); // Consider if archiving should update timestamp
            await this.updateChat(chat);
            await this.renderChatList();
            // this._showToast(`Chat ${chat.isArchived ? 'archived' : 'unarchived'}.`);
        }
    },
    handleExportSingleChat: function(chatId) {
        console.log(`Export single chat ${chatId}`);
        // Actual implementation in Part 5
        if (!this.state.currentChatId || this.state.currentChatId !== chatId) {
            // If the chat to export is not the current one, we might need to load its messages
            // For now, let's assume it works like the main export button which uses currentChatId
            // Or, we make it simple and say "select chat first" or load its data.
            // For simplicity now, use the existing handleExportChat logic.
            const previousChatId = this.state.currentChatId;
            this.state.currentChatId = chatId; // Temporarily set for export
            this.handleExportChat(); // This uses this.state.currentChatId
            this.state.currentChatId = previousChatId; // Restore
        } else {
            this.handleExportChat();
        }
    },


    renderMessages: async function (chatId) {
        if (!this.state.db || !chatId) { this.dom.messageArea.innerHTML = '<div class="message welcome-message"><p>Select or start a chat to see messages.</p></div>'; return; }
        const messages = await this.getMessagesForChat(chatId);
        this.dom.messageArea.innerHTML = '';
        if (messages.length === 0) { this.dom.messageArea.innerHTML = '<div class="message info-message"><p>No messages in this chat yet. Send one!</p></div>'; }
        else { messages.forEach(msg => this._appendMessageToDom(msg)); }
        this._scrollToBottom();
    },

    _appendMessageToDom: function (message, isStreaming = false) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', message.role);
        if (message.isError) messageDiv.classList.add('error');        

        if (message.id) {
            messageDiv.dataset.messageId = message.id;
        }

        const senderSpan = document.createElement('span');
        senderSpan.classList.add('sender');
        senderSpan.textContent = message.role === 'user' ? 'You' : (message.model || 'Assistant');

        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content');

        const markdownSupported = typeof window.marked === 'object' && typeof window.marked.parse === 'function';
        const sanitizeSupported = window.DOMPurify && typeof window.DOMPurify.sanitize === 'function';
        const highlightSupported = typeof window.hljs === 'object' && typeof window.hljs.highlightElement === 'function';

        if (!this.state.loggedLibraryStatus) {
            if (!markdownSupported) console.warn("GrokChat: 'marked.js' (or marked.parse) not found or not a function. Markdown will not be rendered. Check CDN link and library version. Expected 'window.marked.parse'.");
            if (!sanitizeSupported) console.warn("GrokChat: 'DOMPurify' object or 'DOMPurify.sanitize' function not found. HTML sanitization will be skipped. Check CDN. Expected 'window.DOMPurify.sanitize'.");
            if (!highlightSupported) console.warn("GrokChat: 'highlight.js' (or hljs.highlightElement) not found. Code blocks will not be highlighted. Expected 'window.hljs.highlightElement'.");
            this.state.loggedLibraryStatus = true;
        }

        const canRenderFormatted = markdownSupported && sanitizeSupported;
        const rawContent = message.content || '';

        const thinkTagOpen = "<think>";
        const thinkTagClose = "</think>";
        const thinkStartIndex = rawContent.indexOf(thinkTagOpen);
        const thinkEndIndex = thinkStartIndex !== -1 ? rawContent.indexOf(thinkTagClose, thinkStartIndex + thinkTagOpen.length) : -1;

        if (message.role === 'assistant' && !isStreaming && !message.isError && thinkStartIndex !== -1 && thinkEndIndex !== -1 && thinkEndIndex > thinkStartIndex) {
            const beforeThink = rawContent.substring(0, thinkStartIndex);
            const thinkingBlockContent = rawContent.substring(thinkStartIndex + thinkTagOpen.length, thinkEndIndex);
            const afterThink = rawContent.substring(thinkEndIndex + thinkTagClose.length);

            let htmlOutput = '';
            if (canRenderFormatted) {
                htmlOutput += window.DOMPurify.sanitize(window.marked.parse(beforeThink));
                const details = document.createElement('details');
                details.classList.add('thinking-block');
                const summary = document.createElement('summary');
                summary.textContent = 'Show thinking process';
                const thinkingDiv = document.createElement('div');
                thinkingDiv.innerHTML = window.DOMPurify.sanitize(window.marked.parse(thinkingBlockContent));
                details.appendChild(summary);
                details.appendChild(thinkingDiv);
                htmlOutput += details.outerHTML;
                htmlOutput += window.DOMPurify.sanitize(window.marked.parse(afterThink));
                contentDiv.innerHTML = htmlOutput;
            } else {
                contentDiv.textContent = beforeThink;
                const details = document.createElement('details');
                details.classList.add('thinking-block');
                const summary = document.createElement('summary');
                summary.textContent = 'Show thinking process (raw)';
                const pre = document.createElement('pre');
                pre.textContent = thinkingBlockContent;
                details.appendChild(summary);
                details.appendChild(pre);
                contentDiv.appendChild(details);
                const afterNode = document.createTextNode(afterThink);
                contentDiv.appendChild(afterNode);
            }
        } else {
            if (canRenderFormatted) {
                // Commenting out previous temporary logging
                // const testPattern1 = "🤖 **[Test Emoji Bold]**";
                // console.log("Testing pattern:", testPattern1);
                // console.log("Marked output for pattern 1:", window.marked.parse(testPattern1));

                // const testPattern2 = "💡 **[Test Lightbulb Bold]**";
                // console.log("Testing pattern:", testPattern2);
                // console.log("Marked output for pattern 2:", window.marked.parse(testPattern2));

                // const testPattern3 = "**[Test Normal Bold]**"; // Control group
                // console.log("Testing pattern:", testPattern3);
                // console.log("Marked output for pattern 3:", window.marked.parse(testPattern3));

                let processedContent = rawContent;

                // Preprocessing for specific emoji + bold patterns
                const emojiFixes = [
                    {
                        name: "robot",
                        regex: /(🤖\s*)\*\*(.*?)\*\*/g,
                        replacement: "$1<strong>$2</strong>"
                    },
                    {
                        name: "lightbulb",
                        regex: /(💡\s*)\*\*(.*?)\*\*/g,
                        replacement: "$1<strong>$2</strong>"
                    }
                    // Add other emojis here if needed
                ];

                emojiFixes.forEach(fix => {
                    processedContent = processedContent.replace(fix.regex, fix.replacement);
                });

                //console.log("Raw content for marked.parse (should be same as above if no other changes):", rawContent); // Kept for comparison for now
                const markedOutput = window.marked.parse(processedContent); // Use processedContent
                const sanitizedHtml = window.DOMPurify.sanitize(markedOutput);
                contentDiv.innerHTML = sanitizedHtml;
            } else {
                contentDiv.textContent = rawContent;
            }
        }

        if (highlightSupported && !isStreaming) {
            contentDiv.querySelectorAll('pre code').forEach((block) => {
                window.hljs.highlightElement(block);
            });
        }

        const timestampSpan = document.createElement('span');
        timestampSpan.classList.add('timestamp');

        if (message.edited) {
            const editedLabel = document.createElement('span');
            editedLabel.classList.add('edited-label');
            editedLabel.textContent = 'edited';
            timestampSpan.appendChild(editedLabel);
            timestampSpan.appendChild(document.createTextNode(' ')); // Adds a space after 'edited'
        }

        const timeTextNode = document.createTextNode(this._formatTimestamp(message.timestamp));
        timestampSpan.appendChild(timeTextNode);

        messageDiv.appendChild(senderSpan);
        messageDiv.appendChild(contentDiv);
        messageDiv.appendChild(timestampSpan);

        // Editable content area for in-place editing
        const editArea = document.createElement('div');
        editArea.classList.add('message-edit-area');
        editArea.style.display = 'none'; // Hidden by default

        const editTextarea = document.createElement('textarea');
        editTextarea.classList.add('message-edit-textarea');
        editTextarea.value = message.content;
        editArea.appendChild(editTextarea);

        const editButtons = document.createElement('div');
        editButtons.classList.add('message-edit-buttons');

        const saveBtn = document.createElement('button');
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Save';
        saveBtn.onclick = () => this.handleSaveEdit(message.id, editTextarea.value);
        editButtons.appendChild(saveBtn);

        const cancelBtn = document.createElement('button');
        cancelBtn.innerHTML = '<i class="fas fa-times"></i> Cancel';
        cancelBtn.onclick = () => this.handleCancelEdit(message.id);
        editButtons.appendChild(cancelBtn);

        editArea.appendChild(editButtons);
        messageDiv.appendChild(editArea);

        // Add message actions for both user and assistant messages
        if (!isStreaming && message.id && !message.isError) {
            const separator = document.createElement('hr');
            separator.classList.add('message-separator');
            messageDiv.appendChild(separator);

            const messageActions = document.createElement('div');
            messageActions.classList.add('message-actions');

            if (message.role === 'user') {
                const editBtn = document.createElement('button');
                editBtn.innerHTML = '<i class="fas fa-edit"></i><span class="btn-text"> Edit</span>';
                editBtn.onclick = () => this.handleEditMessage(message.id);
                messageActions.appendChild(editBtn);
                
                const deleteBtn = document.createElement('button');
                deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i><span class="btn-text"> Delete</span>';
                deleteBtn.onclick = () => this.handleDeleteMessage(message.id);
                messageActions.appendChild(deleteBtn);
            } else if (message.role === 'assistant') {
                const copyBtn = document.createElement('button');
                copyBtn.innerHTML = '<i class="fas fa-copy"></i><span class="btn-text"> Copy</span>';
                copyBtn.onclick = () => this._copyMessageContent(message);
                messageActions.appendChild(copyBtn);

                const editBtn = document.createElement('button');
                editBtn.innerHTML = '<i class="fas fa-edit"></i><span class="btn-text"> Edit</span>';
                editBtn.onclick = () => this.handleEditMessage(message.id);
                messageActions.appendChild(editBtn);

                const deleteBtn = document.createElement('button');
                deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i><span class="btn-text"> Delete</span>';
                deleteBtn.onclick = () => this.handleDeleteMessage(message.id);
                messageActions.appendChild(deleteBtn);

                const regenBtn = document.createElement('button');
                regenBtn.innerHTML = '<i class="fas fa-redo"></i><span class="btn-text"> Regenerate</span>';
                regenBtn.onclick = () => this.handleRegenerateMessage(message.chat_id, message.id);
                messageActions.appendChild(regenBtn);

                if (message.technical_info) {
                    const infoBtn = document.createElement('button');
                    infoBtn.classList.add('info-button-container');
                    infoBtn.innerHTML = '<i class="fas fa-info-circle"></i><span class="btn-text"> Info</span>';
                    
                    const techInfoPopup = document.createElement('div');
                    techInfoPopup.classList.add('tech-info-popup');
                    let techInfoText = `Provider: ${message.provider || 'N/A'}\nModel: ${message.model || 'N/A'}\n`;
                    if (message.technical_info) {
                        techInfoText += `Duration: ${message.technical_info.duration_ms ? (message.technical_info.duration_ms / 1000).toFixed(2) + 's' : 'N/A'}\n`;
                        techInfoText += `Prompt Tokens: ${message.technical_info.prompt_tokens || 'N/A'}\n`;
                        techInfoText += `Completion Tokens: ${message.technical_info.completion_tokens || 'N/A'}\n`;
                        techInfoText += `Total Tokens: ${message.technical_info.total_tokens || 'N/A'}\n`;
                        techInfoText += `Speed (tokens/sec): ${message.technical_info.speed_tokens_per_sec ? message.technical_info.speed_tokens_per_sec.toFixed(2) : 'N/A'}`;
                    }
                    techInfoPopup.textContent = techInfoText;
                    infoBtn.appendChild(techInfoPopup);
                    
                    infoBtn.onmouseenter = () => techInfoPopup.style.display = 'block';
                    infoBtn.onmouseleave = () => techInfoPopup.style.display = 'none';
                    infoBtn.onclick = (e) => {
                        e.stopPropagation();
                        techInfoPopup.style.display = (techInfoPopup.style.display === 'block' ? 'none' : 'block');
                    };
                    messageActions.appendChild(infoBtn);
                }
            }
            
            messageDiv.appendChild(messageActions);
        }

        this.dom.messageArea.appendChild(messageDiv);
        if (!isStreaming) {
            this._scrollToBottom();
        }
    },
    _createMessageActions: function (message) {
        const actionsDiv = document.createElement('div'); actionsDiv.classList.add('message-actions');
        const copyBtn = document.createElement('button'); copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy'; copyBtn.onclick = () => this._copyMessageContent(message); actionsDiv.appendChild(copyBtn);
        const regenBtn = document.createElement('button'); regenBtn.innerHTML = '<i class="fas fa-redo"></i> Regenerate'; regenBtn.onclick = () => this.handleRegenerateMessage(message.chat_id, message.id); actionsDiv.appendChild(regenBtn);
        
        const infoBtn = document.createElement('button');
        infoBtn.classList.add('info-button-container'); // Added class for positioning context
        infoBtn.innerHTML = '<i class="fas fa-info-circle"></i> Info'; 
        
        const techInfoPopup = document.createElement('div'); 
        techInfoPopup.classList.add('tech-info-popup'); 
        let techInfoText = `Provider: ${message.provider || 'N/A'}\nModel: ${message.model || 'N/A'}\n`; 
        if (message.technical_info) { 
            techInfoText += `Duration: ${message.technical_info.duration_ms ? (message.technical_info.duration_ms / 1000).toFixed(2) + 's' : 'N/A'}\n`; 
            techInfoText += `Prompt Tokens: ${message.technical_info.prompt_tokens || 'N/A'}\n`; 
            techInfoText += `Completion Tokens: ${message.technical_info.completion_tokens || 'N/A'}\n`; 
            techInfoText += `Total Tokens: ${message.technical_info.total_tokens || 'N/A'}\n`; 
            techInfoText += `Speed (tokens/sec): ${message.technical_info.speed_tokens_per_sec ? message.technical_info.speed_tokens_per_sec.toFixed(2) : 'N/A'}`; 
        } 
        techInfoPopup.textContent = techInfoText; 
        infoBtn.appendChild(techInfoPopup); 
        
        infoBtn.onmouseenter = () => techInfoPopup.style.display = 'block'; 
        infoBtn.onmouseleave = () => techInfoPopup.style.display = 'none'; 
        infoBtn.onclick = (e) => { // Stop propagation to prevent clicks on message itself if any
            e.stopPropagation();
            techInfoPopup.style.display = (techInfoPopup.style.display === 'block' ? 'none' : 'block'); 
        };
        actionsDiv.appendChild(infoBtn); 
        return actionsDiv;
    },

    _scrollToBottom: function () { this.dom.messageAreaWrapper.scrollTop = this.dom.messageAreaWrapper.scrollHeight; },

    _updateChatHeader: async function (chatId) {
        if (!chatId) { this.dom.chatTitleDisplay.textContent = "GrokChat"; this.dom.chatCurrentProviderModel.textContent = "No Model Selected"; return; }
        const chat = await this.getChat(chatId); if (chat) { this.dom.chatTitleDisplay.textContent = chat.title || `Chat ${chat.id}`; const provider = this.state.settings.providers.find(p => p.id === chat.default_provider_id); this.dom.chatCurrentProviderModel.textContent = `${provider ? provider.name : 'N/A'} / ${chat.default_model_id || 'N/A'}`; }
    },

    _updateChatModelSelectors: function () {
        this.dom.providerSelectorChat.innerHTML = '<option value="">Select Provider</option>'; this.state.settings.providers.forEach(provider => { if (provider.apiKey) { const option = document.createElement('option'); option.value = provider.id; option.textContent = provider.name; this.dom.providerSelectorChat.appendChild(option); } });
        let providerIdToSelect = this.state.settings.selectedProviderId; if (this.state.currentChatId && this.state.currentChatParams.provider_id) { providerIdToSelect = this.state.currentChatParams.provider_id; }
        if (providerIdToSelect && this.state.settings.providers.find(p => p.id === providerIdToSelect && p.apiKey)) { this.dom.providerSelectorChat.value = providerIdToSelect; }
        else { const firstAvailableProvider = this.state.settings.providers.find(p => p.apiKey); if (firstAvailableProvider) { this.dom.providerSelectorChat.value = firstAvailableProvider.id; if (this.state.currentChatParams) this.state.currentChatParams.provider_id = firstAvailableProvider.id; } }
        this._populateChatModelDropdown(this.dom.providerSelectorChat.value);
    },

    _populateChatModelDropdown: function (providerId) {
        this.dom.modelSelectorChat.innerHTML = '<option value="">Select Model</option>'; if (!providerId) return;
        const provider = this.state.settings.providers.find(p => p.id === providerId); if (provider && provider.models) {
            const sortedModels = Object.values(provider.models).filter(m => m.active).sort((a, b) => { if (a.favorite && !b.favorite) return -1; if (!a.favorite && b.favorite) return 1; return a.id.localeCompare(b.id); }); sortedModels.forEach(model => { const option = document.createElement('option'); option.value = model.id; option.textContent = `${model.id}${model.favorite ? ' ★' : ''}`; this.dom.modelSelectorChat.appendChild(option); });
            let modelIdToSelect = this.state.settings.selectedModelId; if (this.state.currentChatId && this.state.currentChatParams.model_id) { modelIdToSelect = this.state.currentChatParams.model_id; }
            if (modelIdToSelect && provider.models[modelIdToSelect] && provider.models[modelIdToSelect].active) { this.dom.modelSelectorChat.value = modelIdToSelect; }
            else if (sortedModels.length > 0) { this.dom.modelSelectorChat.value = sortedModels[0].id; if (this.state.currentChatParams) this.state.currentChatParams.model_id = sortedModels[0].id; }
        }
        if (this.state.currentChatParams && this.state.currentChatId) this._saveCurrentChatParams();
    },

    _updateRightSidebarParams: function () {
        this.dom.systemPromptInput.value = this.state.currentChatParams.systemPrompt || '';
        this.dom.temperatureInput.value = this.state.currentChatParams.temperature !== undefined ? this.state.currentChatParams.temperature : this.config.defaultChatParams.temperature; this.dom.temperatureValue.textContent = this.dom.temperatureInput.value;
        this.dom.maxTokensInput.value = this.state.currentChatParams.max_tokens || this.config.defaultChatParams.max_tokens; this.dom.maxTokensValue.textContent = this.dom.maxTokensInput.value;
        this.dom.topPInput.value = this.state.currentChatParams.top_p !== undefined ? this.state.currentChatParams.top_p : this.config.defaultChatParams.top_p; this.dom.topPValue.textContent = this.dom.topPInput.value;
        this.dom.streamOutputCheckbox.checked = this.state.currentChatParams.stream !== undefined ? this.state.currentChatParams.stream : this.config.defaultChatParams.stream;
        this._populateSystemPromptDropdown();
    },

    loadInitialChat: async function () {
        if (this.state.settings.lastOpenedChatId) { const chatExists = await this.getChat(this.state.settings.lastOpenedChatId); if (chatExists) { await this.loadChat(this.state.settings.lastOpenedChatId); return; } }
        const chats = await this.getAllChats(); if (chats.length > 0) { chats.sort((a, b) => b.updated_at - a.updated_at); await this.loadChat(chats[0].id); }
        else { this._updateChatHeader(null); this.renderMessages(null); this.dom.messageArea.innerHTML = '<div class="message welcome-message"><p>Welcome to GrokChat! Start by creating a new chat or configuring providers in Settings.</p></div>'; }
    },

    loadChat: async function (chatId) {
        if (!this.state.db) return;
        this.state.currentChatId = chatId; this.state.settings.lastOpenedChatId = chatId; this.saveSettings();
        const chat = await this.getChat(chatId);
        if (chat) { this.state.currentChatParams = { systemPrompt: chat.system_prompt !== undefined ? chat.system_prompt : this.config.defaultChatParams.systemPrompt, temperature: chat.temperature !== undefined ? chat.temperature : this.config.defaultChatParams.temperature, max_tokens: chat.max_tokens || this.config.defaultChatParams.max_tokens, top_p: chat.top_p !== undefined ? chat.top_p : this.config.defaultChatParams.top_p, stream: chat.stream !== undefined ? chat.stream : this.config.defaultChatParams.stream, provider_id: chat.default_provider_id || this.state.settings.selectedProviderId, model_id: chat.default_model_id || this.state.settings.selectedModelId, }; }
        else { this.state.currentChatParams = { ...this.config.defaultChatParams, provider_id: this.state.settings.selectedProviderId, model_id: this.state.settings.selectedModelId }; }
        await this.renderMessages(chatId); await this.renderChatList(); this._updateChatHeader(chatId); this._updateChatModelSelectors(); this._updateRightSidebarParams(); this.dom.messageInput.focus();
    },

    handleNewChat: async function () {
        if (!this.state.db) { this._showError("Database not available. Cannot create new chat."); return; }
        const defaultProviderId = this.dom.providerSelectorChat.value || this.state.settings.selectedProviderId || (this.state.settings.providers.find(p => p.apiKey) ? this.state.settings.providers.find(p => p.apiKey).id : null);
        const defaultModelId = this.dom.modelSelectorChat.value || this.state.settings.selectedModelId;
        if (!defaultProviderId || !defaultModelId) { this._showError("Please select a default provider and model in the chat input area or settings before creating a new chat."); return; }
        const newChat = {
            title: `New Chat ${new Date().toLocaleTimeString()}`,
            created_at: Date.now(),
            updated_at: Date.now(),
            default_provider_id: defaultProviderId,
            default_model_id: defaultModelId,
            system_prompt: this.config.defaultChatParams.systemPrompt,
            temperature: this.config.defaultChatParams.temperature,
            max_tokens: this.config.defaultChatParams.max_tokens,
            top_p: this.config.defaultChatParams.top_p,
            stream: this.config.defaultChatParams.stream,
            isPinned: false,      // Initialize new property
            isArchived: false,    // Initialize new property
            folderId: null        // Initialize new property (or 'default' if preferred)
        };
        const newChatId = await this.addChat(newChat);
        await this.loadChat(newChatId);
        this.dom.messageInput.value = '';
        this._autoAdjustTextareaHeight.call(this.dom.messageInput);
        this.dom.messageInput.focus();
        console.log("New chat created and loaded with ID:", newChatId);
    },

    _saveCurrentChatParams: async function () {
        if (!this.state.currentChatId || !this.state.db) return;
        const chat = await this.getChat(this.state.currentChatId);
        if (chat) { chat.system_prompt = this.state.currentChatParams.systemPrompt; chat.temperature = this.state.currentChatParams.temperature; chat.max_tokens = this.state.currentChatParams.max_tokens; chat.top_p = this.state.currentChatParams.top_p; chat.stream = this.state.currentChatParams.stream; chat.default_provider_id = this.dom.providerSelectorChat.value; chat.default_model_id = this.dom.modelSelectorChat.value; await this.updateChat(chat); this._updateChatHeader(this.state.currentChatId); }
    },

    handleSendMessage: async function () {
        if (this.state.isSendingMessage) {
            console.warn("handleSendMessage called while already processing a send request. Ignoring.");
            return;
        }
        this.state.isSendingMessage = true;

        if (this.state.isRequestInProgress) {
            this._interruptRequest();
            return;
        }

        const messageText = this.dom.messageInput.value.trim();
        if (!messageText) {
            this.state.isSendingMessage = false;
            return;
        }

        if (!this.state.currentChatId) {
            await this.handleNewChat();
            if (!this.state.currentChatId) {
                this._showError("Please select a chat or create a new one first.");
                this.state.isSendingMessage = false;
                return;
            }
        }

        const providerId = this.dom.providerSelectorChat.value;
        const modelId = this.dom.modelSelectorChat.value;

        if (!providerId || !modelId) {
            this._showError("Please select a provider and model for this message.");
            this.state.isSendingMessage = false;
            return;
        }

        const provider = this.state.settings.providers.find(p => p.id === providerId);
        if (!provider || !provider.apiKey) {
            this._showError("Selected provider is not configured correctly or missing API key.");
            this.state.isSendingMessage = false;
            return;
        }

        const userMessage = {
            chat_id: this.state.currentChatId,
            role: 'user',
            content: messageText,
            timestamp: Date.now()
        };

        this.dom.messageInput.value = '';
        this._autoAdjustTextareaHeight.call(this.dom.messageInput);

        this.state.isRequestInProgress = true;
        this._toggleSendButtonState(true);
        this.state.currentAbortController = new AbortController();
        const startTime = Date.now();

        userMessage.id = await this.addMessage(userMessage);
        this._appendMessageToDom(userMessage);

        this.state.currentStreamingResponseMessage = "";
        const tempAssistantMessageId = 'streaming-' + Date.now();
        let tempAssistantMessageForDom = {
            id: tempAssistantMessageId,
            chat_id: this.state.currentChatId,
            role: 'assistant',
            content: "▌",
            timestamp: Date.now(),
            provider: provider.name,
            model: modelId,
        };
        this._appendMessageToDom(tempAssistantMessageForDom, true);
        const assistantMessageElement = this.dom.messageArea.querySelector(`[data-message-id="${tempAssistantMessageId}"] .message-content`);

        let finalUsage = {};

        try {
            const contextMessages = await this._buildContextMessages(this.state.currentChatId, userMessage);
            const requestBody = {
                model: modelId,
                messages: contextMessages,
                temperature: this.state.currentChatParams.temperature,
                max_tokens: this.state.currentChatParams.max_tokens,
                top_p: this.state.currentChatParams.top_p,
                stream: this.state.currentChatParams.stream,
                ...(this.dom.reasoningEffortCheckbox?.checked && this.dom.reasoningEffortSelect?.value !== 'none' && { reasoning_effort: this.dom.reasoningEffortSelect?.value })
            };
            Object.keys(requestBody).forEach(key => {
                if (requestBody[key] === undefined || requestBody[key] === null || requestBody[key] === '') {
                    if (key === 'max_tokens' && requestBody[key] === null) { /* allow null for max_tokens to use default */ }
                    else if (requestBody[key] === null || requestBody[key] === '') delete requestBody[key];
                }
            });

            const response = await fetch(`${provider.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${provider.apiKey}` },
                body: JSON.stringify(requestBody),
                signal: this.state.currentAbortController.signal
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: { message: `${response.status} ${response.statusText}` } }));
                throw new Error(`API Error (${response.status}): ${errorData.error?.message || 'Unknown API error'}`);
            }
            if (!response.body) {
                throw new Error("Response body is null, streaming not possible.");
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                let eolIndex;
                while ((eolIndex = buffer.indexOf('\n\n')) >= 0) {
                    const eventBlock = buffer.substring(0, eolIndex);
                    buffer = buffer.substring(eolIndex + 2);

                    const lines = eventBlock.split('\n');
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const jsonData = line.substring('data: '.length).trim();
                            if (jsonData === '[DONE]') {
                                continue;
                            }
                            try {
                                const chunk = JSON.parse(jsonData);

                                if (chunk.choices && chunk.choices[0].delta && chunk.choices[0].delta.content) {
                                    const contentDelta = chunk.choices[0].delta.content;
                                    this.state.currentStreamingResponseMessage += contentDelta;
                                    if (assistantMessageElement) {
                                        assistantMessageElement.innerHTML = window.DOMPurify.sanitize(window.marked.parse(this.state.currentStreamingResponseMessage + " ▌"));
                                        this._scrollToBottom();
                                    }
                                }

                                // --- MODIFIED SECTION FOR USAGE DATA ---
                                let usageDataFromChunk = null;
                                if (chunk.usage && typeof chunk.usage === 'object') {
                                    usageDataFromChunk = chunk.usage;
                                } else if (chunk.x_groq && typeof chunk.x_groq === 'object' && chunk.x_groq.usage && typeof chunk.x_groq.usage === 'object') {
                                    usageDataFromChunk = chunk.x_groq.usage;
                                }
                                // Add more `else if` blocks here for other provider-specific structures if needed.

                                if (usageDataFromChunk) {
                                    finalUsage = { ...finalUsage, ...usageDataFromChunk };
                                }
                                // --- END OF MODIFIED SECTION ---

                                // This captures usage if it comes with finish_reason, which is often the case.
                                // The logic above might have already caught it if `chunk.usage` or `chunk.x_groq.usage` was present.
                                // This specific check is fine as a fallback or if some providers *only* send usage with finish_reason.
                                if (chunk.choices && chunk.choices[0] && chunk.choices[0].finish_reason && chunk.usage && typeof chunk.usage === 'object') {
                                    finalUsage = { ...finalUsage, ...chunk.usage };
                                }


                            } catch (e) {
                                console.error('Error parsing stream data JSON:', e, 'Data:', jsonData, "Full event block:", eventBlock);
                            }
                        }
                    }
                }
            }
            const durationMs = Date.now() - startTime;

            if (!this.state.currentStreamingResponseMessage && buffer.trim()) {
                try {
                    const data = JSON.parse(buffer.trim());
                    if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
                        this.state.currentStreamingResponseMessage = data.choices[0].message.content;
                    }
                    if (data.usage) {
                        finalUsage = data.usage;
                    }
                } catch (e) {
                    console.error('Could not parse response as a single JSON object:', e, 'Buffer:', buffer);
                    throw new Error("Failed to parse response from model.");
                }
            }

            if (assistantMessageElement) {
                assistantMessageElement.innerHTML = window.DOMPurify.sanitize(window.marked.parse(this.state.currentStreamingResponseMessage));
                if (typeof window.hljs === 'object' && typeof window.hljs.highlightElement === 'function') {
                    assistantMessageElement.querySelectorAll('pre code').forEach(block => window.hljs.highlightElement(block));
                }
            }

            const techInfo = {
                duration_ms: durationMs,
                prompt_tokens: finalUsage.prompt_tokens !== undefined ? finalUsage.prompt_tokens : null,
                completion_tokens: finalUsage.completion_tokens !== undefined ? finalUsage.completion_tokens : null,
                total_tokens: finalUsage.total_tokens !== undefined ? finalUsage.total_tokens : null,
                speed_tokens_per_sec: null
            };

            if (techInfo.completion_tokens && techInfo.completion_tokens > 0 && durationMs > 0) {
                techInfo.speed_tokens_per_sec = parseFloat((techInfo.completion_tokens / (durationMs / 1000)).toFixed(2));
            }

            const finalAssistantMessage = {
                chat_id: this.state.currentChatId,
                role: 'assistant',
                content: this.state.currentStreamingResponseMessage,
                timestamp: tempAssistantMessageForDom.timestamp,
                provider: provider.name,
                model: modelId,
                technical_info: techInfo
            };

            const tempDomElement = this.dom.messageArea.querySelector(`[data-message-id="${tempAssistantMessageId}"]`);
            if (tempDomElement) tempDomElement.remove();

            finalAssistantMessage.id = await this.addMessage(finalAssistantMessage);
            this._appendMessageToDom(finalAssistantMessage, false);

            const chat = await this.getChat(this.state.currentChatId);
            if (chat) {
                chat.updated_at = Date.now();
                await this.updateChat(chat);
                await this.renderChatList();
            }

        } catch (error) {
            console.error("Error during send message or streaming:", error);
            let errorMessageContent = error.name === 'AbortError' ? "Request cancelled by user." : `Error: ${error.message}`;

            this.state.currentStreamingResponseMessage += `\n\n(${errorMessageContent})`;

            if (assistantMessageElement) {
                assistantMessageElement.innerHTML = window.DOMPurify.sanitize(window.marked.parse(this.state.currentStreamingResponseMessage));
            } else {
                const errorMessageToDisplay = {
                    chat_id: this.state.currentChatId, role: 'assistant',
                    content: errorMessageContent,
                    timestamp: Date.now(), isError: true
                };
                this._appendMessageToDom(errorMessageToDisplay);
            }
        } finally {
            this.state.isRequestInProgress = false;
            this.state.currentAbortController = null;
            this.state.currentStreamingResponseMessage = '';
            this._toggleSendButtonState(false);
            this.state.isSendingMessage = false;
            this._scrollToBottom();
        }
    },

    _buildContextMessages: async function (chatId, currentUserMessage) {
        const context = [];
        const systemPrompt = this.state.currentChatParams.systemPrompt;
        if (systemPrompt) { context.push({ role: 'system', content: systemPrompt }); }

        if (chatId) {
            const historyMessages = await this.getMessagesForChat(chatId);
            let messagesToInclude = historyMessages.filter(m => m.id !== currentUserMessage.id);

            if (!this.state.settings.unlimitedContext) {
                const contextWindowSize = this.state.settings.contextWindowSize;
                if (contextWindowSize > 0) {
                    messagesToInclude = messagesToInclude.slice(-contextWindowSize);
                } else {
                    messagesToInclude = []; // contextWindowSize 0 means only current message + system prompt
                }
            }
            // If unlimitedContext is true, messagesToInclude remains all historical messages

            messagesToInclude.forEach(msg => {
                if (msg.role === 'user' || msg.role === 'assistant') {
                    context.push({ role: msg.role, content: msg.content });
                }
            });
        }
        context.push({ role: currentUserMessage.role, content: currentUserMessage.content });
        return context;
    },

    _toggleSendButtonState: function (isLoading) {
        if (isLoading) { this.dom.sendButton.innerHTML = '<i class="fas fa-square"></i>'; this.dom.sendButton.title = "Stop Generating"; this.dom.sendButton.classList.add('stop-button'); this.dom.messageInput.disabled = true; }
        else { this.dom.sendButton.innerHTML = '<i class="fas fa-paper-plane"></i>'; this.dom.sendButton.title = "Send Message"; this.dom.sendButton.classList.remove('stop-button'); this.dom.messageInput.disabled = false; this.dom.messageInput.focus(); }
    },

    _interruptRequest: function () { if (this.state.currentAbortController) { this.state.currentAbortController.abort(); console.log("Request interrupted by user."); } },

    handleEditMessage: async function (messageId) {
        const messageDiv = document.querySelector(`[data-message-id="${messageId}"]`);
        if (!messageDiv) return;

        const contentDiv = messageDiv.querySelector('.message-content');
        const editArea = messageDiv.querySelector('.message-edit-area');
        const editTextarea = messageDiv.querySelector('.message-edit-textarea');
        const messageActions = messageDiv.querySelector('.message-actions');
        const messageSeparator = messageDiv.querySelector('.message-separator');

        if (contentDiv && editArea && editTextarea && messageActions && messageSeparator) {
            const textareaStyle = window.getComputedStyle(editTextarea);
            const textareaMinWidth = parseFloat(textareaStyle.minWidth) || 0;

            const messageStyle = window.getComputedStyle(messageDiv);
            const messagePaddingLeft = parseFloat(messageStyle.paddingLeft) || 0;
            const messagePaddingRight = parseFloat(messageStyle.paddingRight) || 0;
            const messageBorderLeft = parseFloat(messageStyle.borderLeftWidth) || 0;
            const messageBorderRight = parseFloat(messageStyle.borderRightWidth) || 0;
            const messageHorizontalChrome = messagePaddingLeft + messagePaddingRight + messageBorderLeft + messageBorderRight;

            const minOuterWidthForMessageDiv = textareaMinWidth + messageHorizontalChrome;
            const currentMessageDivOuterWidth = messageDiv.offsetWidth;

            let effectiveOuterWidth = Math.max(currentMessageDivOuterWidth, minOuterWidthForMessageDiv);
            // Ensure effectiveOuterWidth is not NaN if any parseFloat failed
            if (isNaN(effectiveOuterWidth) || effectiveOuterWidth <= 0) {
                // Fallback to offsetWidth or a reasonable default if calculation failed
                effectiveOuterWidth = currentMessageDivOuterWidth > 0 ? currentMessageDivOuterWidth : textareaMinWidth;
                if (isNaN(effectiveOuterWidth) || effectiveOuterWidth <= 0) { // Second fallback
                    effectiveOuterWidth = 200; // Default fallback width in pixels
                }
            }

            messageDiv.style.width = effectiveOuterWidth + 'px';
            contentDiv.style.display = 'none'; // Hide original content

            editArea.style.display = 'block'; // Show edit area
            editArea.style.width = ''; // Let editArea fill messageDiv (via CSS width: 100%)
            editTextarea.style.width = ''; // Let editTextarea fill editArea (via CSS width: 100%)

            const message = await this.getMessage(messageId);
            if (message) {
                editTextarea.value = message.content; // Populate with original markdown content
            }
            editTextarea.focus();
            this._autoGrowTextarea(editTextarea);
            editTextarea.oninput = () => this._autoGrowTextarea(editTextarea);
            messageActions.style.display = 'none';
            messageSeparator.style.display = 'none';
        }
    },

    handleDeleteMessage: async function(messageId) {
        if (!this.state.db || !confirm('Are you sure you want to delete this message?')) return;
        
        const message = await this.getMessage(messageId);
        if (!message) return;

        // Delete the message and its response if it exists
        const messages = await this.getMessagesForChat(message.chat_id);
        const messageIndex = messages.findIndex(m => m.id === messageId);
        
        if (messageIndex !== -1) {
            // If this is a user message and there's an assistant response after it, delete that too
            if (message.role === 'user' && 
                messageIndex + 1 < messages.length && 
                messages[messageIndex + 1].role === 'assistant') {
                await this.deleteMessage(messages[messageIndex + 1].id);
            }
            await this.deleteMessage(messageId);
            await this.renderMessages(this.state.currentChatId);
        }
    },

    getMessage: function(messageId) {
        return new Promise((resolve, reject) => {
            const transaction = this.state.db.transaction(['messages'], 'readonly');
            const store = transaction.objectStore('messages');
            const request = store.get(messageId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    updateMessage: function(message) {
        return new Promise((resolve, reject) => {
            const transaction = this.state.db.transaction(['messages'], 'readwrite');
            const store = transaction.objectStore('messages');
            const request = store.put(message);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    deleteMessage: function(messageId) {
        return new Promise((resolve, reject) => {
            const transaction = this.state.db.transaction(['messages'], 'readwrite');
            const store = transaction.objectStore('messages');
            const request = store.delete(messageId);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    handleSaveEdit: async function (messageId, newContent) {
        const messageDiv = document.querySelector(`[data-message-id="${messageId}"]`);
        if (!messageDiv) return;

        const message = await this.getMessage(messageId);
        if (!message) return;

        if (newContent !== null && newContent.trim() !== '' && newContent !== message.content) {
            message.content = newContent.trim();
            message.edited = true;
            await this.updateMessage(message);
            this.renderMessages(this.state.currentChatId); // Re-render to show updated content
        } else {
            this.handleCancelEdit(messageId); // If content is same or empty, just cancel
        }
    },

    handleCancelEdit: function (messageId) {
        const messageDiv = document.querySelector(`[data-message-id="${messageId}"]`);
        if (!messageDiv) return;

        const contentDiv = messageDiv.querySelector('.message-content');
        const editArea = messageDiv.querySelector('.message-edit-area');
        const messageActions = messageDiv.querySelector('.message-actions');
        const messageSeparator = messageDiv.querySelector('.message-separator');

        if (contentDiv && editArea && messageActions && messageSeparator) {
            contentDiv.style.display = 'block';
            messageDiv.style.width = ''; // Reset messageDiv's fixed width
            editArea.style.width = ''; // Reset width (should be there from previous attempt)
            editArea.style.display = 'none';
            messageActions.style.display = 'flex';
            messageSeparator.style.display = 'block';
        }
    },

    _autoGrowTextarea: function(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = (textarea.scrollHeight) + 'px';
    },

    handleRegenerateMessage: async function (chatId, assistantMessageId) {
        if (this.state.isRequestInProgress) return; if (!this.state.db) return;
        const messages = await this.getMessagesForChat(chatId); const assistantMessageIndex = messages.findIndex(m => m.id === assistantMessageId && m.role === 'assistant');
        if (assistantMessageIndex === -1 || assistantMessageIndex === 0) { this._showError("Cannot regenerate. No preceding user message."); return; }
        let userMessageForContext = null; for (let i = assistantMessageIndex - 1; i >= 0; i--) { if (messages[i].role === 'user') { userMessageForContext = messages[i]; break; } }
        if (!userMessageForContext) { this._showError("Could not find original user prompt."); return; }
        const originalAssistantMessage = messages[assistantMessageIndex]; const providerName = originalAssistantMessage.provider; const modelId = originalAssistantMessage.model;
        const provider = this.state.settings.providers.find(p => p.name === providerName); if (!provider || !provider.apiKey || !modelId) { this._showError(`Provider or model for regen not found/API key missing.`); return; }
        this.state.isRequestInProgress = true; this._toggleSendButtonState(true); this.state.currentAbortController = new AbortController(); const startTime = Date.now();
        try {
            const historyUpToUserMessage = messages.slice(0, messages.indexOf(userMessageForContext) + 1); const contextMessages = []; const currentChat = await this.getChat(chatId); const systemPrompt = currentChat?.system_prompt || this.state.currentChatParams.systemPrompt; if (systemPrompt) { contextMessages.push({ role: 'system', content: systemPrompt }); }
            const contextWindowSize = this.state.settings.contextWindowSize; const filteredHistory = historyUpToUserMessage.filter(m => m.role === 'user' || m.role === 'assistant'); const relevantHistory = contextWindowSize > 0 ? filteredHistory.slice(-(contextWindowSize + 1)) : [];
            relevantHistory.forEach(msg => { contextMessages.push({ role: msg.role, content: msg.content }); });
            if (!contextMessages.length || contextMessages[contextMessages.length - 1].content !== userMessageForContext.content || contextMessages[contextMessages.length - 1].role !== 'user') { if (contextMessages.length && contextMessages[contextMessages.length - 1].role === 'user') { contextMessages.pop(); } contextMessages.push({ role: 'user', content: userMessageForContext.content }); }
            const requestBody = { model: modelId, messages: contextMessages, temperature: this.state.currentChatParams.temperature, max_tokens: this.state.currentChatParams.max_tokens, top_p: this.state.currentChatParams.top_p, ...(this.dom.reasoningEffortCheckbox?.checked && { reasoning_effort: this.dom.reasoningEffortSelect?.value }) }; Object.keys(requestBody).forEach(key => requestBody[key] === undefined && delete requestBody[key]);
            const response = await fetch(`${provider.baseUrl}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${provider.apiKey}` }, body: JSON.stringify(requestBody), signal: this.state.currentAbortController.signal });
            const durationMs = Date.now() - startTime;
            if (!response.ok) { const errorData = await response.json().catch(() => ({ error: { message: response.statusText } })); throw new Error(`API Error (${response.status}): ${errorData.error?.message || 'Unknown error'}`); }
            const data = await response.json(); const aiResponseContent = data.choices[0]?.message?.content || "No response content."; const usage = data.usage || {}; const techInfo = { duration_ms: durationMs, prompt_tokens: usage.prompt_tokens, completion_tokens: usage.completion_tokens, total_tokens: usage.total_tokens, speed_tokens_per_sec: usage.completion_tokens && durationMs > 0 ? (usage.completion_tokens / (durationMs / 1000)) : null };
            const newAssistantMessage = { chat_id: chatId, role: 'assistant', content: aiResponseContent, timestamp: Date.now(), provider: provider.name, model: modelId, technical_info: techInfo };
            await this.addMessage(newAssistantMessage); this._appendMessageToDom(newAssistantMessage);
            const chatToUpdate = await this.getChat(chatId); if (chatToUpdate) { chatToUpdate.updated_at = Date.now(); await this.updateChat(chatToUpdate); await this.renderChatList(); }
        } catch (error) { const errorMessageContent = error.name === 'AbortError' ? "Regeneration cancelled." : `Error: ${error.message}`; this._appendMessageToDom({ chat_id: chatId, role: 'assistant', content: errorMessageContent, timestamp: Date.now(), isError: true }); }
        finally { this.state.isRequestInProgress = false; this._toggleSendButtonState(false); this.state.currentAbortController = null; }
    },

    _copyMessageContent: function (message) {
        let contentToCopy = ''; const markdownLibsLoaded = (typeof window.marked === 'object' && typeof window.marked.parse === 'function' && typeof window.DOMPurify === 'object' && typeof window.DOMPurify.sanitize === 'function');
        if (this.state.settings.copyFormat === 'plaintext') { if (markdownLibsLoaded) { const tempDiv = document.createElement('div'); tempDiv.innerHTML = window.DOMPurify.sanitize(window.marked.parse(message.content || '')); tempDiv.querySelectorAll('.thinking-block summary').forEach(s => s.remove()); contentToCopy = tempDiv.textContent || tempDiv.innerText || ""; } else { console.warn("Markdown/DOMPurify libs not loaded for plain text copy. Copying raw Markdown."); contentToCopy = message.content || ''; } }
        else { contentToCopy = message.content || ''; }
        navigator.clipboard.writeText(contentToCopy).then(() => this._showToast("Copied to clipboard!")).catch(err => { this._showError("Failed to copy."); });
    },

    handleRenameChat: async function (chatId) {
        const chat = await this.getChat(chatId);
        if (!chat) {
            this._showError("Chat not found.");
            return;
        }

        this.state.editingChatId = chatId; // Store the chatId
        this.dom.newChatNameInput.value = chat.title || `Chat ${chat.id}`;
        // this.dom.editingChatIdInput.value = chatId; // Useful if we need to pass it via hidden input

        this.dom.renameChatModal.style.display = 'flex';
        this.dom.newChatNameInput.focus();
        this.dom.newChatNameInput.select(); // Select current text for easy replacement
    },

    handleDeleteChat: async function (chatId, fromSettings = false) {
        if (!confirm("Are you sure you want to delete this chat and all its messages? This cannot be undone.")) { return; } await this.deleteChat(chatId);
        if (this.state.currentChatId === chatId) { this.state.currentChatId = null; this.state.currentChatParams = { ...this.config.defaultChatParams }; await this.loadInitialChat(); }
        await this.renderChatList();  this._showToast("Chat deleted.");
    },

    handleClearAllHistory: async function () {
        if (!confirm("ARE YOU SURE you want to delete ALL chat history? This is irreversible!")) return; if (!confirm("FINAL WARNING: This will delete everything. Proceed?")) return;
        await this.clearAllChatsAndMessages(); this.state.currentChatId = null; this.state.currentChatParams = { ...this.config.defaultChatParams }; await this.loadInitialChat(); await this.renderChatList(); this._showToast("All chat history cleared.");
    },

    _handleChatProviderSelection: async function (providerId) {
        if (!providerId) { this.dom.modelSelectorChat.innerHTML = '<option value="">Select Model</option>'; if (this.state.currentChatParams) this.state.currentChatParams.model_id = null; return; }
        this._populateChatModelDropdown(providerId); if (this.dom.modelSelectorChat.options.length > 1) { this.dom.modelSelectorChat.selectedIndex = 1; } const selectedModelId = this.dom.modelSelectorChat.value;
        if (this.state.currentChatId) { const chat = await this.getChat(this.state.currentChatId); if (chat) { chat.default_provider_id = providerId; chat.default_model_id = selectedModelId; await this.updateChat(chat); this._updateChatHeader(this.state.currentChatId); this.state.currentChatParams.provider_id = providerId; this.state.currentChatParams.model_id = selectedModelId; } }
        else { this.state.settings.selectedProviderId = providerId; this.state.settings.selectedModelId = selectedModelId; this.saveSettings(); }
    },

    _handleChatModelSelection: async function (modelId) {
        if (!modelId) return; if (this.state.currentChatId) { const chat = await this.getChat(this.state.currentChatId); if (chat) { chat.default_model_id = modelId; await this.updateChat(chat); this._updateChatHeader(this.state.currentChatId); this.state.currentChatParams.model_id = modelId; } }
        else { this.state.settings.selectedModelId = modelId; this.saveSettings(); }
    },

    _openSettingsModal: async function () { this._populateSettingsForm(); this.dom.settingsModal.style.display = 'flex'; },
    _populateSettingsForm: function () {
        this.dom.themeSelector.value = this.state.settings.theme;
        this.dom.contextWindowSizeInput.value = this.state.settings.contextWindowSize;
        this.dom.contextWindowSizeValue.textContent = this.state.settings.contextWindowSize;
        // Populate unlimited context checkbox
        if (this.dom.unlimitedContextCheckbox) {
            this.dom.unlimitedContextCheckbox.checked = this.state.settings.unlimitedContext;
            this.dom.contextWindowSizeInput.disabled = this.state.settings.unlimitedContext;
            this.dom.contextWindowSizeValue.style.opacity = this.state.settings.unlimitedContext ? 0.5 : 1;
        }
        this.dom.copyFormatSelector.value = this.state.settings.copyFormat;
        this._renderProviderListForSettings();
        this._renderSystemPromptsList();
        this._renderChatFoldersList();
        this.dom.addFolderFormContainer.style.display = 'none';
    },
    _collectSettingsFromForm: function () {
        this.state.settings.theme = this.dom.themeSelector.value;
        // Collect unlimited context setting
        if (this.dom.unlimitedContextCheckbox) {
            this.state.settings.unlimitedContext = this.dom.unlimitedContextCheckbox.checked;
        }
        // Only update contextWindowSize from slider if unlimited is not checked
        if (!this.state.settings.unlimitedContext) {
            this.state.settings.contextWindowSize = parseInt(this.dom.contextWindowSizeInput.value);
        }
        this.state.settings.copyFormat = this.dom.copyFormatSelector.value;
    },
    
    _renderProviderListForSettings: function () { this.dom.providerList.innerHTML = ''; if (this.state.settings.providers.length === 0) { this.dom.providerList.innerHTML = '<p>No providers. Add one!</p>'; return; } this.state.settings.providers.forEach(provider => { const itemDiv = document.createElement('div'); itemDiv.classList.add('provider-item'); itemDiv.innerHTML = `<div class="provider-item-header"><h4>${provider.name}</h4><div class="provider-actions"><button class="btn btn-sm" data-provider-id="${provider.id}" data-action="manage-models"><i class="fas fa-list-ul"></i> Manage Models</button><button class="btn btn-sm" data-provider-id="${provider.id}" data-action="edit-provider"><i class="fas fa-edit"></i> Edit</button><button class="btn btn-sm btn-danger" data-provider-id="${provider.id}" data-action="delete-provider"><i class="fas fa-trash-alt"></i> Delete</button></div></div><p><small>Base URL: ${provider.baseUrl}</small></p><p><small>API Key: <span class="api-key-display">${provider.apiKey ? '********' + provider.apiKey.slice(-4) : 'Not Set'}</span></small></p>`; this.dom.providerList.appendChild(itemDiv); }); this.dom.providerList.querySelectorAll('.provider-actions button').forEach(button => { button.addEventListener('click', (e) => { const providerId = e.currentTarget.dataset.providerId; const action = e.currentTarget.dataset.action; if (action === 'edit-provider') this._openAddProviderModal(providerId); else if (action === 'delete-provider') this.handleDeleteProvider(providerId); else if (action === 'manage-models') this._openManageModelsModal(providerId); }); }); },
    
    // Chat Folder Management Methods
    _renderChatFoldersList: function() {
        if (!this.dom.chatFoldersList) return;
        this.dom.chatFoldersList.innerHTML = ''; // Clear existing list
        const folders = this.state.settings.chatFolders || [];

        if (folders.length === 0) {
            // This case should ideally not happen if 'Default' is always present
            const li = document.createElement('li');
            li.textContent = 'No folders defined.';
            this.dom.chatFoldersList.appendChild(li);
            return;
        }

        folders.forEach(folder => {
            const li = document.createElement('li');
            li.dataset.folderId = folder.id;
            li.classList.add('folder-item');
            if (folder.id === this.state.selectedFolderId) {
                li.classList.add('selected');
            }

            const nameSpan = document.createElement('span');
            nameSpan.classList.add('folder-name');
            nameSpan.textContent = folder.name;
            li.appendChild(nameSpan);

            if (folder.isSystem) {
                const infoSpan = document.createElement('span');
                infoSpan.classList.add('folder-info');
                infoSpan.textContent = ' (System)';
                li.appendChild(infoSpan);
            }

            li.addEventListener('click', () => this._handleSelectFolder(folder.id));
            this.dom.chatFoldersList.appendChild(li);
        });
        this._updateFolderActionButtons();
    },

    _handleSelectFolder: function(folderId) {
        const folder = this.state.settings.chatFolders.find(f => f.id === folderId);
        if (!folder) return;

        this.state.selectedFolderId = folderId;
        this._renderChatFoldersList(); // Re-render to update selection highlight
    },

    _updateFolderActionButtons: function() {
        const selectedFolder = this.state.settings.chatFolders.find(f => f.id === this.state.selectedFolderId);
        const canRename = selectedFolder && !selectedFolder.isSystem;
        const canDelete = selectedFolder && !selectedFolder.isSystem;

        this.dom.renameFolderBtn.disabled = !canRename;
        this.dom.deleteFolderBtn.disabled = !canDelete;
    },

    _handleShowAddFolderForm: function() {
        this.state.editingFolderId = null; // Clear any previous editing ID
        this.dom.newFolderNameInput.value = '';
        this.dom.newFolderNameInput.placeholder = 'New folder name...';
        this.dom.addFolderFormContainer.style.display = 'flex'; // Show the form
        this.dom.newFolderNameInput.focus();
    },

    _handleShowRenameFolderForm: function() {
        const folder = this.state.settings.chatFolders.find(f => f.id === this.state.selectedFolderId);
        if (!folder || folder.isSystem) {
            this._showError("Cannot rename this folder.");
            return;
        }
        this.state.editingFolderId = folder.id;
        this.dom.newFolderNameInput.value = folder.name;
        this.dom.addFolderFormContainer.style.display = 'flex'; // Show the form
        this.dom.newFolderNameInput.focus();
    },

    _handleCancelAddFolder: function() {
        this.dom.addFolderFormContainer.style.display = 'none';
        this.state.editingFolderId = null;
    },

    _handleSaveFolderPath: function() {
        const folderName = this.dom.newFolderNameInput.value.trim();
        if (!folderName) {
            this._showError("Folder name cannot be empty.");
            return;
        }

        // Check for duplicate names (excluding the folder being edited)
        const isDuplicate = this.state.settings.chatFolders.some(
            f => f.name.toLowerCase() === folderName.toLowerCase() && f.id !== this.state.editingFolderId
        );
        if (isDuplicate) {
            this._showError(`A folder named "${folderName}" already exists.`);
            return;
        }

        if (this.state.editingFolderId) { // Renaming existing folder
            const folder = this.state.settings.chatFolders.find(f => f.id === this.state.editingFolderId);
            if (folder && !folder.isSystem) {
                folder.name = folderName;
            } else {
                this._showError("Could not rename folder or system folder rename attempted.");
                this._handleCancelAddFolder();
                return;
            }
        } else { // Adding new folder
            const newFolder = {
                id: this._generateUUID(),
                name: folderName,
                isSystem: false
            };
            this.state.settings.chatFolders.push(newFolder);
        }

        this.saveSettings();
        this._renderChatFoldersList();
        this._handleCancelAddFolder(); // Hide form and reset state
        this._showToast(this.state.editingFolderId ? "Folder renamed." : "Folder added.");
        this.renderChatList(); // Refresh left panel
    },

    _handleDeleteFolder: async function() { // Make async
        const folder = this.state.settings.chatFolders.find(f => f.id === this.state.selectedFolderId);
        if (!folder || folder.isSystem) {
            this._showError("Cannot delete this folder. Ensure a non-system folder is selected.");
            return;
        }

        if (!confirm(`Are you sure you want to delete the folder "${folder.name}"? Chats in this folder will become "unfoldered".`)) {
            return;
        }

        const folderIdToDelete = this.state.selectedFolderId;

        // Update chats that were in this folder
        const chatsToUpdate = await this.getAllChats();
        const updatePromises = [];
        chatsToUpdate.forEach(chat => {
            if (chat.folderId === folderIdToDelete) {
                chat.folderId = null; // Move to history (no folder)
                chat.updated_at = Date.now(); // Optionally update timestamp
                updatePromises.push(this.updateChat(chat));
            }
        });

        await Promise.all(updatePromises);

        // Now, remove the folder definition
        this.state.settings.chatFolders = this.state.settings.chatFolders.filter(f => f.id !== folderIdToDelete);

        this.state.selectedFolderId = null; // Deselect
        this.saveSettings(); // Save updated folders list and potentially updated chats (via updateChat)
        this._renderChatFoldersList(); // Update settings modal UI
        this._showToast("Folder deleted and chats moved to history.");
        this.renderChatList(); // Refresh left panel to show chats moved to history
    },
    // End Chat Folder Management Methods

    // System Prompt Management Methods
    _renderSystemPromptsList: function() {
        if (!this.dom.systemPromptsList) return;
        this.dom.systemPromptsList.innerHTML = '';
        if (!this.state.settings.systemPrompts || this.state.settings.systemPrompts.length === 0) {
            const li = document.createElement('li');
            li.textContent = 'No custom system prompts defined. Add one!';
            li.style.textAlign = 'center';
            li.style.opacity = '0.7';
            this.dom.systemPromptsList.appendChild(li);
            return;
        }

        this.state.settings.systemPrompts.forEach(prompt => {
            const li = document.createElement('li');
            li.classList.add('system-prompt-item');

            const nameSpan = document.createElement('span');
            nameSpan.classList.add('prompt-name');
            nameSpan.textContent = prompt.name;
            li.appendChild(nameSpan);

            const actionsDiv = document.createElement('div');
            actionsDiv.classList.add('prompt-actions');

            const editBtn = document.createElement('button');
            editBtn.classList.add('btn', 'btn-sm', 'edit-prompt-btn');
            editBtn.innerHTML = '<i class="fas fa-edit"></i><span class="btn-text"> Edit</span>';
            editBtn.addEventListener('click', () => this._handleEditSystemPrompt(prompt.name));
            actionsDiv.appendChild(editBtn);

            const deleteBtn = document.createElement('button');
            deleteBtn.classList.add('btn', 'btn-sm', 'btn-danger', 'delete-prompt-btn');
            deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Delete';
            deleteBtn.addEventListener('click', () => this._handleDeleteSystemPrompt(prompt.name));
            actionsDiv.appendChild(deleteBtn);

            li.appendChild(actionsDiv);
            this.dom.systemPromptsList.appendChild(li);
        });
    },

    _handleAddNewSystemPrompt: function() {
        this.state.editingSystemPromptName = null;
        this.dom.systemPromptNameInput.value = '';
        this.dom.systemPromptTextInput.value = '';
        this.dom.systemPromptNameInput.disabled = false;
        this.dom.systemPromptEditForm.style.display = 'block';
        this.dom.systemPromptNameInput.focus();
    },

    _handleEditSystemPrompt: function(promptName) {
        const prompt = this.state.settings.systemPrompts.find(p => p.name === promptName);
        if (prompt) {
            this.state.editingSystemPromptName = prompt.name;
            this.dom.systemPromptNameInput.value = prompt.name;
            this.dom.systemPromptTextInput.value = prompt.text;
            this.dom.systemPromptNameInput.disabled = true; // Disable name editing
            this.dom.systemPromptEditForm.style.display = 'block';
            this.dom.systemPromptTextInput.focus();
        }
    },

    _handleSaveSystemPrompt: function() {
        const name = this.dom.systemPromptNameInput.value.trim();
        const text = this.dom.systemPromptTextInput.value.trim();

        if (!name) {
            this._showError('Prompt name cannot be empty.');
            return;
        }
        // maxlength attribute on input should prevent this, but good to double check
        if (name.length > 50) { 
            this._showError('Prompt name exceeds 50 characters.');
            return;
        }

        if (this.state.editingSystemPromptName === null) { // Adding new prompt
            if (this.state.settings.systemPrompts.some(p => p.name === name)) {
                this._showError('A prompt with this name already exists.');
                return;
            }
            this.state.settings.systemPrompts.push({ name, text });
        } else { // Editing existing prompt
            const prompt = this.state.settings.systemPrompts.find(p => p.name === this.state.editingSystemPromptName);
            if (prompt) {
                prompt.text = text; // Name is not changed as input is disabled
            }
        }

        this.saveSettings();
        this._renderSystemPromptsList();
        this.dom.systemPromptEditForm.style.display = 'none';
        // this.dom.systemPromptEditForm.style.display = 'none'; // Redundant line (removed in this version)
        this.state.editingSystemPromptName = null;
        this._showToast('System prompt saved.');
        this._populateSystemPromptDropdown(); // Also update dropdown after saving a prompt
    },

    _handleDeleteSystemPrompt: function(promptName) {
        if (!confirm(`Are you sure you want to delete the prompt "${promptName}"?`)) {
            return;
        }
        this.state.settings.systemPrompts = this.state.settings.systemPrompts.filter(p => p.name !== promptName);
        this.saveSettings();
        this._renderSystemPromptsList();
        this._populateSystemPromptDropdown(); // Update dropdown after deleting

        if (this.state.editingSystemPromptName === promptName) {
            this.dom.systemPromptEditForm.style.display = 'none';
            this.state.editingSystemPromptName = null;
        }
        this._showToast('System prompt deleted.');
    },

    _populateSystemPromptDropdown: function () {
        console.log("GrokChatApp: _populateSystemPromptDropdown called"); 
        try {
            const currentSystemPromptText = this.dom.systemPromptInput.value;
            let promptTextMatched = false;
    
            // Ensure the dropdown element exists
            if (!this.dom.savedSystemPromptsDropdown) {
                console.error("GrokChatApp: savedSystemPromptsDropdown DOM element not found!");
                return;
            }
    
            this.dom.savedSystemPromptsDropdown.innerHTML = '<option value="">-- Select a saved prompt --</option>';
            
            if (this.state.settings && this.state.settings.systemPrompts) {
                console.log("GrokChatApp: System prompts found in state:", JSON.stringify(this.state.settings.systemPrompts)); 
                
                if (this.state.settings.systemPrompts.length === 0) {
                    console.log("GrokChatApp: systemPrompts array is empty."); 
                }
    
                this.state.settings.systemPrompts.forEach(prompt => {
                    if (!prompt || typeof prompt.name === 'undefined') {
                        console.warn("GrokChatApp: Skipping invalid prompt object during dropdown population:", JSON.stringify(prompt));
                        return; // Skip this iteration if prompt or prompt.name is invalid
                    }
                    console.log("GrokChatApp: Processing prompt for dropdown:", prompt.name); 
                    const option = document.createElement('option');
                    option.value = prompt.name;
                    option.textContent = prompt.name;
                    this.dom.savedSystemPromptsDropdown.appendChild(option);
                    
                    if (prompt.text === currentSystemPromptText) {
                        option.selected = true;
                        promptTextMatched = true;
                    }
                });
                console.log("GrokChatApp: Finished processing prompts for dropdown. Total options added:", this.state.settings.systemPrompts.filter(p => p && typeof p.name !== 'undefined').length); 
            } else {
                console.log("GrokChatApp: No systemPrompts found in this.state.settings or settings object itself is undefined/null."); 
            }
    
            // Default selection logic
            if (!promptTextMatched) {
                this.dom.savedSystemPromptsDropdown.value = ""; 
            }
            console.log("GrokChatApp: _populateSystemPromptDropdown finished. Current dropdown value:", this.dom.savedSystemPromptsDropdown.value);
        } catch (error) {
            console.error("GrokChatApp: Error caught in _populateSystemPromptDropdown:", error); 
        }
    },

    _handleSavedPromptSelection: function(event) {
        const selectedPromptName = event.target.value;
        if (!selectedPromptName) {
            // Optionally clear the textarea if "-- Select --" is chosen
            // this.dom.systemPromptInput.value = ""; 
            // this.state.currentChatParams.systemPrompt = "";
            // if (this.state.currentChatId) this._saveCurrentChatParams();
            return;
        }

        const selectedPrompt = this.state.settings.systemPrompts.find(p => p.name === selectedPromptName);
        if (selectedPrompt) {
            this.dom.systemPromptInput.value = selectedPrompt.text;
            this.state.currentChatParams.systemPrompt = selectedPrompt.text;
            if (this.state.currentChatId) {
                this._saveCurrentChatParams();
            }
        }
        // Do not reset event.target.value = ""; here if we want the dropdown to reflect the current selection
        // Resetting it makes it a "select to apply" rather than a state holder.
        // For now, let it reflect the selection. If user types manually, dropdown will be out of sync.
        // The _populateSystemPromptDropdown will re-sync it if it finds a match.
    },
    // End System Prompt Management Methods
    
    _openAddProviderModal: function (providerIdToEdit = null) { this.dom.addProviderModal.style.display = 'flex'; if (providerIdToEdit) { const provider = this.state.settings.providers.find(p => p.id === providerIdToEdit); if (provider) { this.dom.providerModalTitle.textContent = 'Edit Provider'; this.dom.editProviderIdInput.value = provider.id; this.dom.providerNameInput.value = provider.name; this.dom.providerBaseUrlInput.value = provider.baseUrl; this.dom.providerApiKeyInput.value = provider.apiKey; this.dom.providerApiKeyInput.type = 'password'; this.dom.toggleApiKeyVisibilityBtn.querySelector('i').className = 'fas fa-eye'; } } else { this.dom.providerModalTitle.textContent = 'Add New Provider'; this.dom.editProviderIdInput.value = ''; this.dom.providerNameInput.value = ''; this.dom.providerBaseUrlInput.value = ''; this.dom.providerApiKeyInput.value = ''; this.dom.providerApiKeyInput.type = 'password'; this.dom.toggleApiKeyVisibilityBtn.querySelector('i').className = 'fas fa-eye'; } },
    handleSaveProvider: function () { const id = this.dom.editProviderIdInput.value; const name = this.dom.providerNameInput.value.trim(); const baseUrl = this.dom.providerBaseUrlInput.value.trim(); const apiKey = this.dom.providerApiKeyInput.value; if (!name || !baseUrl) { this._showError("Name and Base URL required."); return; } try { new URL(baseUrl); } catch (_) { this._showError("Invalid Base URL."); return; } if (id) { const providerIndex = this.state.settings.providers.findIndex(p => p.id === id); if (providerIndex > -1) { this.state.settings.providers[providerIndex] = { ...this.state.settings.providers[providerIndex], name, baseUrl, apiKey }; } } else { this.state.settings.providers.push({ id: this._generateUUID(), name, baseUrl, apiKey, models: {}, lastUpdatedModels: null }); } this.saveSettings(); this._renderProviderListForSettings(); this._closeModal(this.dom.addProviderModal); this._showToast(`Provider ${id ? 'updated' : 'added'}.`); },
    handleDeleteProvider: function (providerId) { if (!confirm("Delete provider?")) return; this.state.settings.providers = this.state.settings.providers.filter(p => p.id !== providerId); if (this.state.settings.selectedProviderId === providerId) { this.state.settings.selectedProviderId = null; this.state.settings.selectedModelId = null; } this.saveSettings(); this._renderProviderListForSettings(); this._showToast("Provider deleted."); },
    _openManageModelsModal: function (providerId) { const provider = this.state.settings.providers.find(p => p.id === providerId); if (!provider) return; this.dom.manageModelsProviderIdInput.value = providerId; this.dom.manageModelsModalTitle.textContent = `Manage Models for ${provider.name}`; this.dom.modelsLastUpdatedStatus.textContent = provider.lastUpdatedModels ? `Last updated: ${this._formatTimestamp(provider.lastUpdatedModels)}` : 'Model list not fetched.'; this._renderConfiguredModelsList(provider); this.dom.allProviderModelsList.innerHTML = '<li>Click "Update Models List" to fetch.</li>'; this.dom.modelsComparisonInfo.innerHTML = ''; this.dom.manageModelsModal.querySelectorAll('.tab-link').forEach(tl => tl.classList.remove('active')); this.dom.manageModelsModal.querySelector('.tab-link[data-tab="active-models-tab"]').classList.add('active'); this.dom.manageModelsModal.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active')); this.dom.manageModelsModal.querySelector('#active-models-tab').classList.add('active'); this.dom.manageModelsModal.style.display = 'flex'; },
    _renderConfiguredModelsList: function (provider) { this.dom.currentProviderModelsList.innerHTML = ''; const models = provider.models || {}; if (Object.keys(models).length === 0) { this.dom.currentProviderModelsList.innerHTML = '<li>No models configured.</li>'; return; } const sortedModelIds = Object.keys(models).sort((a, b) => { const modelA = models[a]; const modelB = models[b]; if (modelA.favorite && !modelB.favorite) return -1; if (!modelA.favorite && modelB.favorite) return 1; if (modelA.active && !modelB.active) return -1; if (!modelA.active && modelB.active) return 1; return a.localeCompare(b); }); sortedModelIds.forEach(modelId => { const model = models[modelId]; const li = document.createElement('li'); li.innerHTML = `<span>${model.id}</span><div class="model-actions"><label><input type="checkbox" data-model-id="${model.id}" data-action="toggle-active" ${model.active ? 'checked' : ''}> Active</label><label><input type="checkbox" data-model-id="${model.id}" data-action="toggle-favorite" ${model.favorite ? 'checked' : ''}> Favorite</label><button class="btn btn-sm btn-danger" data-model-id="${model.id}" data-action="remove-model" title="Remove config"><i class="fas fa-times"></i></button></div>`; this.dom.currentProviderModelsList.appendChild(li); }); this.dom.currentProviderModelsList.querySelectorAll('input[type="checkbox"], button').forEach(el => { el.addEventListener('click', (e) => { const modelId = e.currentTarget.dataset.modelId; const action = e.currentTarget.dataset.action; const providerId = this.dom.manageModelsProviderIdInput.value; const currentProvider = this.state.settings.providers.find(p => p.id === providerId); if (!currentProvider || !currentProvider.models[modelId]) return; if (action === 'toggle-active') { currentProvider.models[modelId].active = e.currentTarget.checked; } else if (action === 'toggle-favorite') { currentProvider.models[modelId].favorite = e.currentTarget.checked; if (e.currentTarget.checked) currentProvider.models[modelId].active = true; } else if (action === 'remove-model') { if (confirm(`Remove ${modelId} from config?`)) { delete currentProvider.models[modelId]; } } this._renderConfiguredModelsList(currentProvider); }); }); },
    handleUpdateModelsListFromProvider: async function () { const providerId = this.dom.manageModelsProviderIdInput.value; const provider = this.state.settings.providers.find(p => p.id === providerId); if (!provider || !provider.apiKey) { this._showError("Provider/API Key missing."); this.dom.allProviderModelsList.innerHTML = '<li>Error: Provider/API Key missing.</li>'; return; } this.dom.updateModelsListBtn.disabled = true; this.dom.updateModelsListBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...'; this.dom.allProviderModelsList.innerHTML = '<li>Fetching models...</li>'; this.dom.modelsComparisonInfo.innerHTML = ''; try { const response = await fetch(`${provider.baseUrl}/models`, { headers: { 'Authorization': `Bearer ${provider.apiKey}` } }); if (!response.ok) { const errorData = await response.json().catch(() => null); const errorMsg = errorData?.error?.message || response.statusText; throw new Error(`API Error (${response.status}): ${errorMsg}`); } const fetchedData = await response.json(); const fetchedModels = fetchedData.data || []; if (!Array.isArray(fetchedModels)) throw new Error("Invalid model list format."); fetchedModels.sort((a, b) => a.id.localeCompare(b.id)); provider.lastUpdatedModels = Date.now(); this.dom.modelsLastUpdatedStatus.textContent = `Last updated: ${this._formatTimestamp(provider.lastUpdatedModels)}`; const currentModelIds = Object.keys(provider.models || {}); const fetchedModelIds = fetchedModels.map(m => m.id); const newModels = fetchedModelIds.filter(id => !currentModelIds.includes(id)); const removedModels = currentModelIds.filter(id => !fetchedModelIds.includes(id) && (provider.models[id]?.source === 'api')); let comparisonHTML = ''; if (newModels.length > 0) comparisonHTML += `<p>New: ${newModels.map(id => `<span class="new-model">${id}</span>`).join(', ')}</p>`; if (removedModels.length > 0) comparisonHTML += `<p>Removed by provider: ${removedModels.map(id => `<span class="removed-model">${id}</span>`).join(', ')}</p>`; this.dom.modelsComparisonInfo.innerHTML = comparisonHTML || "<p>Model list up-to-date.</p>"; this.dom.allProviderModelsList.innerHTML = ''; if (fetchedModels.length === 0) { this.dom.allProviderModelsList.innerHTML = '<li>No models from provider.</li>'; } else { fetchedModels.forEach(modelData => { const modelId = modelData.id; const li = document.createElement('li'); li.innerHTML = `<span>${modelId}</span><div class="model-actions"><label><input type="checkbox" data-model-id="${modelId}" data-action="add-to-active" ${provider.models[modelId]?.active ? 'checked' : ''}> Add to Configured</label></div>`; this.dom.allProviderModelsList.appendChild(li); if (!provider.models[modelId]) { provider.models[modelId] = { id: modelId, active: false, favorite: false, source: 'api' }; } else { provider.models[modelId].source = 'api'; } }); } this.dom.allProviderModelsList.querySelectorAll('input[type="checkbox"][data-action="add-to-active"]').forEach(checkbox => { checkbox.addEventListener('change', (e) => { const modelId = e.target.dataset.modelId; const currentProvider = this.state.settings.providers.find(p => p.id === providerId); if (!currentProvider.models[modelId]) { currentProvider.models[modelId] = { id: modelId, active: false, favorite: false }; } currentProvider.models[modelId].active = e.target.checked; this._renderConfiguredModelsList(currentProvider); }); }); this.saveSettings(); this._showToast("Model list updated."); } catch (error) { this.dom.allProviderModelsList.innerHTML = `<li>Error: ${error.message}</li>`; this._showError(`Failed to fetch models: ${error.message}`); } finally { this.dom.updateModelsListBtn.disabled = false; this.dom.updateModelsListBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Update Models List'; } },
    handleSaveManagedModels: function () { this.saveSettings(); this._closeModal(this.dom.manageModelsModal); this._showToast("Model config saved."); },

    handleManualAddModel: function() {
        const providerId = this.dom.manageModelsProviderIdInput.value;
        const provider = this.state.settings.providers.find(p => p.id === providerId);
        if (!provider) {
            this._showError("No provider selected.");
            return;
        }

        const modelId = this.dom.manualModelIdInput.value.trim();
        if (!modelId) {
            this._showError("Model ID cannot be empty.");
            return;
        }

        if (provider.models && provider.models[modelId]) {
            this._showError(`Model "${modelId}" already exists for this provider.`);
            return;
        }

        if (confirm(`Are you sure you want to manually add the model "${modelId}"?`)) {
            if (!provider.models) {
                provider.models = {};
            }
            provider.models[modelId] = {
                id: modelId,
                active: true,
                favorite: false,
                source: 'manual'
            };
            this.saveSettings();
            this._renderConfiguredModelsList(provider);
            this.dom.manualModelIdInput.value = '';
            this._showToast(`Model "${modelId}" added successfully.`);
        }
    },
    _getStore: function (storeName, mode = 'readonly') { if (!this.state.db) throw new Error("DB not init."); return this.state.db.transaction(storeName, mode).objectStore(storeName); },
    addChat: function (chatData) { return new Promise((resolve, reject) => { const store = this._getStore('chats', 'readwrite'); const request = store.add(chatData); request.onsuccess = e => resolve(e.target.result); request.onerror = e => reject(e.target.error); }); },
    getChat: function (chatId) { return new Promise((resolve, reject) => { const store = this._getStore('chats'); const request = store.get(chatId); request.onsuccess = e => resolve(e.target.result); request.onerror = e => reject(e.target.error); }); },
    getAllChats: function () { return new Promise((resolve, reject) => { const store = this._getStore('chats'); const request = store.getAll(); request.onsuccess = e => resolve(e.target.result); request.onerror = e => reject(e.target.error); }); },
    updateChat: function (chatData) { return new Promise((resolve, reject) => { const store = this._getStore('chats', 'readwrite'); const request = store.put(chatData); request.onsuccess = e => resolve(e.target.result); request.onerror = e => reject(e.target.error); }); },
    deleteChat: function (chatId) { return new Promise(async (resolve, reject) => { if (!this.state.db) { reject("DB not init."); return; } try { const tx = this.state.db.transaction(['chats', 'messages'], 'readwrite'); const chatStore = tx.objectStore('chats'); const messageStore = tx.objectStore('messages'); const messageIndex = messageStore.index('chat_id'); const messagesRequest = messageIndex.openCursor(IDBKeyRange.only(chatId)); messagesRequest.onsuccess = e => { const cursor = e.target.result; if (cursor) { messageStore.delete(cursor.primaryKey); cursor.continue(); } }; const chatDeleteRequest = chatStore.delete(chatId); chatDeleteRequest.onerror = e => { reject(e.target.error); }; tx.oncomplete = () => { resolve(); }; tx.onerror = e => { reject(e.target.error); }; } catch (error) { reject(error); } }); },
    addMessage: function (messageData) { return new Promise(async (resolve, reject) => { const store = this._getStore('messages', 'readwrite'); const request = store.add(messageData); request.onsuccess = async (e) => { const chat = await this.getChat(messageData.chat_id); if (chat) { chat.updated_at = Date.now(); try { await this.updateChat(chat); } catch (updateError) { console.error("Error updating chat timestamp:", updateError); } } resolve(e.target.result); }; request.onerror = e => reject(e.target.error); }); },
    getMessagesForChat: function (chatId) { return new Promise((resolve, reject) => { const store = this._getStore('messages'); const index = store.index('chat_id'); const request = index.getAll(chatId); request.onsuccess = e => resolve(e.target.result.sort((a, b) => a.timestamp - b.timestamp)); request.onerror = e => reject(e.target.error); }); },
    clearAllChatsAndMessages: function () { return new Promise((resolve, reject) => { if (!this.state.db) { reject("DB not init."); return; } const tx = this.state.db.transaction(['chats', 'messages'], 'readwrite'); const chatStore = tx.objectStore('chats'); const messageStore = tx.objectStore('messages'); const clearChatsReq = chatStore.clear(); const clearMessagesReq = messageStore.clear(); clearChatsReq.onerror = e => reject(e.target.error); clearMessagesReq.onerror = e => reject(e.target.error); tx.oncomplete = () => resolve(); tx.onerror = e => reject(e.target.error); }); },
    _closeModal: function (modalElement) {
        if (modalElement) {
            modalElement.style.display = 'none';
            // If we are closing the rename chat modal, also clear its specific state.
            if (modalElement === this.dom.renameChatModal) {
                this.state.editingChatId = null;
                this.dom.newChatNameInput.value = '';
            }
            // Add similar checks if other modals have specific state to clear on generic close
        }
    },
    _formatTimestamp: function (timestamp) { if (!timestamp) return ''; return new Date(timestamp).toLocaleString(); },
    _generateUUID: function () { return 'xxxx-xxxx-xxxx-xxxx'.replace(/[x]/g, function (c) { var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8); return v.toString(16); }); },
    _showError: function (message) { console.error("GrokChat Error:", message); const errorToast = document.createElement('div'); errorToast.className = 'toast-notification error-toast'; errorToast.textContent = `Error: ${message}`; document.body.appendChild(errorToast); errorToast.style.cssText = 'position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background-color:#dc3545; color:white; padding:10px 20px; border-radius:5px; z-index:2000; box-shadow:0 2px 10px rgba(0,0,0,0.2);'; setTimeout(() => { errorToast.remove(); }, 5000); },
    _showToast: function (message, duration = 3000) { console.log("GrokChat Toast:", message); const toast = document.createElement('div'); toast.className = 'toast-notification'; toast.textContent = message; document.body.appendChild(toast); toast.style.cssText = 'position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background-color:var(--current-btn-bg); color:var(--current-btn-text); padding:10px 20px; border-radius:5px; z-index:2000; box-shadow:0 2px 10px rgba(0,0,0,0.2);'; setTimeout(() => { toast.remove(); }, duration); },

    _triggerDownload: function(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
};

document.addEventListener('DOMContentLoaded', () => GrokChatApp.init());