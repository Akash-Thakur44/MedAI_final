/* ============================================
   CHAT FUNCTIONALITY (WITH MULTI-LANGUAGE + VOICE)
   ============================================ */


/* ==================== LANGUAGES CONFIG ==================== */
const LANGUAGES = {
    'en': {
        code: 'en',
        name: 'English',
        nativeName: 'English',
        flag: '🇬🇧',
        speech: 'en-US',
        placeholder: 'Ask any question about your condition...'
    },
    'hi': {
        code: 'hi',
        name: 'Hindi',
        nativeName: 'हिन्दी',
        flag: '🇮🇳',
        speech: 'hi-IN',
        placeholder: 'अपनी स्थिति के बारे में कुछ भी पूछें...'
    },
    'bn': {
        code: 'bn',
        name: 'Bengali',
        nativeName: 'বাংলা',
        flag: '🇧🇩',
        speech: 'bn-BD',
        placeholder: 'আপনার অবস্থা সম্পর্কে যেকোনো প্রশ্ন করুন...'
    },
    'hinglish': {
        code: 'hinglish',
        name: 'Hinglish',
        nativeName: 'Hindi + English',
        flag: '🇮🇳',
        speech: 'en-IN',
        placeholder: 'Apni condition ke baare mein kuch bhi puchein...'
    },
    'benglish': {
        code: 'benglish',
        name: 'Benglish',
        nativeName: 'Bengali + English',
        flag: '🇧🇩',
        speech: 'en-IN',
        placeholder: 'Apnar condition somporke ja khushi jiggesh korun...'
    },
    'auto': {
        code: 'auto',
        name: 'Auto Detect',
        nativeName: 'Detect language',
        flag: '🌐',
        speech: 'en-US',
        placeholder: 'Type in any language...'
    }
};


/* ==================== STATE ==================== */
const ChatState = {
    sessionId: null,
    diagnosisId: null,
    symptomLogId: null,
    isLoading: false,
    isSending: false,
    isMinimized: false,
    useWebSearch: true,
    messages: [],
    suggestedQuestions: [],
    currentLanguage: 'en',
    isLanguageDropdownOpen: false,
    // Voice Input
    chatRecognition: null,
    isChatRecording: false,
    chatTranscript: '',
    // Voice Output (TTS)
    synthesis: window.speechSynthesis || null,
    isSpeaking: false,
    autoReadEnabled: false,
    currentUtterance: null,
    currentAudio: null
};


/* ==================== INIT ==================== */
document.addEventListener('DOMContentLoaded', function () {
    const path = window.location.pathname;

    if (path.includes('results')) {
        setTimeout(initChat, 4500);
    }
});


/* ==================== INITIALIZE CHAT ==================== */
async function initChat() {
    try {
        // Load saved language preference
        const savedLanguage = localStorage.getItem('chatLanguage');
        if (savedLanguage && LANGUAGES[savedLanguage]) {
            ChatState.currentLanguage = savedLanguage;
        }

        // Load auto-read preference
        const savedAutoRead = localStorage.getItem('chatAutoRead');
        if (savedAutoRead === 'true') {
            ChatState.autoReadEnabled = true;
            const toggle = document.getElementById('autoReadToggle');
            if (toggle) {
                toggle.classList.add('active');
                toggle.innerHTML = '<i class="fas fa-volume-up"></i> Auto-read ON';
            }
        }

        // Load TTS voices
        if (ChatState.synthesis) {
            ChatState.synthesis.getVoices();
        }

        // Get diagnosis info from stored results
        const storedResults = localStorage.getItem('latestResults');

        if (!storedResults) {
            console.log('No results found, hiding chat');
            hideChatSection();
            return;
        }

        const results = JSON.parse(storedResults);

        ChatState.diagnosisId = results.diagnosis_id || null;
        ChatState.symptomLogId = results.log_id || null;

        // Setup event listeners
        setupChatEventListeners();

        // Update language UI
        updateLanguageUI();

        // Initialize chat session
        await initializeChatSession();

    } catch (error) {
        console.error('Chat init error:', error);
        showChatError('Failed to initialize chat');
    }
}


/* ==================== HIDE CHAT SECTION ==================== */
function hideChatSection() {
    const chatSection = document.getElementById('chatSection');
    if (chatSection) {
        chatSection.style.display = 'none';
    }
}


/* ==================== SETUP EVENT LISTENERS ==================== */
function setupChatEventListeners() {

    // Send button
    const sendBtn = document.getElementById('sendMessageBtn');
    if (sendBtn) {
        sendBtn.addEventListener('click', handleSendMessage);
    }

    // Chat input
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.addEventListener('input', handleInputChange);
        chatInput.addEventListener('keydown', handleKeyDown);
    }

    // Clear chat button
    const clearBtn = document.getElementById('clearChatBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', handleClearChat);
    }

    // Toggle chat button
    const toggleBtn = document.getElementById('toggleChatBtn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', handleToggleChat);
    }

    // Web search toggle
    const webSearchBtn = document.getElementById('webSearchToggle');
    if (webSearchBtn) {
        webSearchBtn.addEventListener('click', handleWebSearchToggle);
    }

    // Quick action buttons
    const quickActions = document.querySelectorAll('.quick-action-btn');
    quickActions.forEach(btn => {
        btn.addEventListener('click', function () {
            const action = this.dataset.action;
            handleQuickAction(action);
        });
    });

    // Language selector
    const languageBtn = document.getElementById('languageSelectorBtn');
    if (languageBtn) {
        languageBtn.addEventListener('click', toggleLanguageDropdown);
    }

    // Language options
    const languageOptions = document.querySelectorAll('.language-option');
    languageOptions.forEach(option => {
        option.addEventListener('click', function () {
            const lang = this.dataset.lang;
            selectLanguage(lang);
        });
    });

    // Chat Voice Input Button
    const chatVoiceBtn = document.getElementById('chatVoiceBtn');
    if (chatVoiceBtn) {
        chatVoiceBtn.addEventListener('click', toggleChatVoice);
    }

    // Auto-Read Toggle
    const autoReadToggle = document.getElementById('autoReadToggle');
    if (autoReadToggle) {
        autoReadToggle.addEventListener('click', toggleAutoRead);
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', function (e) {
        const dropdown = document.getElementById('languageDropdown');
        const button = document.getElementById('languageSelectorBtn');

        if (dropdown && button && ChatState.isLanguageDropdownOpen) {
            if (!button.contains(e.target) && !dropdown.contains(e.target)) {
                closeLanguageDropdown();
            }
        }
    });
}


/* ==================== TOGGLE LANGUAGE DROPDOWN ==================== */
function toggleLanguageDropdown(e) {
    if (e) {
        e.stopPropagation();
    }

    const dropdown = document.getElementById('languageDropdown');
    const button = document.getElementById('languageSelectorBtn');

    if (!dropdown || !button) return;

    ChatState.isLanguageDropdownOpen = !ChatState.isLanguageDropdownOpen;

    if (ChatState.isLanguageDropdownOpen) {
        dropdown.style.display = 'block';
        button.classList.add('active');
    } else {
        dropdown.style.display = 'none';
        button.classList.remove('active');
    }
}


/* ==================== CLOSE LANGUAGE DROPDOWN ==================== */
function closeLanguageDropdown() {
    const dropdown = document.getElementById('languageDropdown');
    const button = document.getElementById('languageSelectorBtn');

    if (dropdown) dropdown.style.display = 'none';
    if (button) button.classList.remove('active');

    ChatState.isLanguageDropdownOpen = false;
}


/* ==================== SELECT LANGUAGE ==================== */
function selectLanguage(langCode) {
    if (!LANGUAGES[langCode]) return;

    const previousLang = ChatState.currentLanguage;
    ChatState.currentLanguage = langCode;

    // Save preference
    localStorage.setItem('chatLanguage', langCode);

    // Update UI
    updateLanguageUI();

    // Close dropdown
    closeLanguageDropdown();

    // Show toast notification
    if (previousLang !== langCode) {
        showLanguageToast(langCode);
    }

    console.log('Language changed to:', langCode);
}


/* ==================== UPDATE LANGUAGE UI ==================== */
function updateLanguageUI() {
    const lang = LANGUAGES[ChatState.currentLanguage];
    if (!lang) return;

    // Update button
    const button = document.getElementById('languageSelectorBtn');
    if (button) {
        const flagEl = button.querySelector('.language-flag');
        const codeEl = button.querySelector('.language-code');

        if (flagEl) flagEl.textContent = lang.flag;
        if (codeEl) codeEl.textContent = lang.code.toUpperCase();
    }

    // Update active state in dropdown
    const options = document.querySelectorAll('.language-option');
    options.forEach(option => {
        if (option.dataset.lang === ChatState.currentLanguage) {
            option.classList.add('active');
        } else {
            option.classList.remove('active');
        }
    });

    // Update input placeholder
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.placeholder = lang.placeholder;
    }
}


/* ==================== SHOW LANGUAGE TOAST ==================== */
function showLanguageToast(langCode) {
    const lang = LANGUAGES[langCode];
    if (!lang) return;

    const existingToast = document.querySelector('.language-change-toast');
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = 'language-change-toast';
    toast.innerHTML = `
        <span class="toast-flag">${lang.flag}</span>
        <span>Language changed to ${lang.name}</span>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}


/* ==================== INITIALIZE CHAT SESSION ==================== */
async function initializeChatSession() {
    showChatLoading(true);

    try {
        const token = localStorage.getItem('userToken');

        if (!token) {
            console.log('No auth token, hiding chat');
            hideChatSection();
            return;
        }

        const response = await fetch(`${CONFIG.API_BASE_URL}/api/chat/session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                diagnosis_id: ChatState.diagnosisId,
                symptom_log_id: ChatState.symptomLogId
            })
        });

        const data = await response.json();

        showChatLoading(false);

        if (!data.success) {
            showChatError(data.message || 'Failed to start chat');
            return;
        }

        ChatState.sessionId = data.session.id;
        ChatState.messages = data.messages || [];

        renderMessages(ChatState.messages);

        if (data.suggested_questions && data.suggested_questions.length > 0) {
            ChatState.suggestedQuestions = data.suggested_questions;
            renderSuggestedQuestions(data.suggested_questions);
        }

        console.log('Chat session initialized:', ChatState.sessionId);

    } catch (error) {
        console.error('Session init error:', error);
        showChatLoading(false);
        showChatError('Failed to connect to chat service');
    }
}


/* ==================== HANDLE INPUT CHANGE ==================== */
function handleInputChange(e) {
    const input = e.target;
    const value = input.value;
    const charCount = value.length;

    const charCountEl = document.getElementById('chatCharCount');
    if (charCountEl) {
        charCountEl.textContent = charCount;

        const counter = charCountEl.parentElement;
        counter.classList.remove('warning', 'danger');

        if (charCount > 900) {
            counter.classList.add('danger');
        } else if (charCount > 700) {
            counter.classList.add('warning');
        }
    }

    const sendBtn = document.getElementById('sendMessageBtn');
    if (sendBtn) {
        sendBtn.disabled = value.trim().length < 2 || ChatState.isSending;
    }

    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 150) + 'px';
}


/* ==================== HANDLE KEYDOWN ==================== */
function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();

        const sendBtn = document.getElementById('sendMessageBtn');
        if (sendBtn && !sendBtn.disabled) {
            handleSendMessage();
        }
    }
}


/* ==================== HANDLE SEND MESSAGE ==================== */
async function handleSendMessage() {
    if (ChatState.isSending) return;

    const chatInput = document.getElementById('chatInput');
    if (!chatInput) return;

    const message = chatInput.value.trim();

    if (message.length < 2) {
        return;
    }

    if (!ChatState.sessionId) {
        showChatError('No active chat session');
        return;
    }

    ChatState.isSending = true;

    chatInput.value = '';
    chatInput.style.height = 'auto';

    const charCountEl = document.getElementById('chatCharCount');
    if (charCountEl) charCountEl.textContent = '0';

    const sendBtn = document.getElementById('sendMessageBtn');
    if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.classList.add('sending');
    }

    hideSuggestedQuestions();

    const userMessage = {
        role: 'user',
        content: message,
        created_at: new Date().toISOString()
    };

    addMessageToUI(userMessage);

    showTypingIndicator();

    try {
        const token = localStorage.getItem('userToken');

        const response = await fetch(`${CONFIG.API_BASE_URL}/api/chat/message`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                session_id: ChatState.sessionId,
                message: message,
                use_web_search: ChatState.useWebSearch,
                language: ChatState.currentLanguage
            })
        });

        const data = await response.json();

        hideTypingIndicator();

        if (!data.success) {
            showChatError(data.message || 'Failed to get response');
            ChatState.isSending = false;
            if (sendBtn) {
                sendBtn.classList.remove('sending');
            }
            return;
        }

        if (data.ai_message) {
            const aiMessage = {
                ...data.ai_message,
                web_sources: data.web_sources
            };
            addMessageToUI(aiMessage);
        }

        ChatState.isSending = false;
        if (sendBtn) {
            sendBtn.classList.remove('sending');
        }

        scrollToBottom();

    } catch (error) {
        console.error('Send message error:', error);
        hideTypingIndicator();
        showChatError('Failed to send message. Please try again.');

        ChatState.isSending = false;
        if (sendBtn) {
            sendBtn.classList.remove('sending');
        }
    }
}


/* ==================== RENDER MESSAGES ==================== */
function renderMessages(messages) {
    const messagesContainer = document.getElementById('chatMessages');
    if (!messagesContainer) return;

    if (!messages || messages.length === 0) {
        messagesContainer.innerHTML = '';
        return;
    }

    messagesContainer.innerHTML = '';

    messages.forEach(message => {
        addMessageToUI(message, false);
    });

    setTimeout(scrollToBottom, 100);
}


/* ==================== ADD MESSAGE TO UI ==================== */
function addMessageToUI(message, animate = true) {
    const messagesContainer = document.getElementById('chatMessages');
    if (!messagesContainer) return;

    const role = message.role || 'assistant';
    const content = message.content || '';
    const timestamp = message.created_at || new Date().toISOString();
    const webSources = message.web_sources || [];

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}-message`;

    if (!animate) {
        messageDiv.style.animation = 'none';
    }

    const avatarIcon = role === 'user' ? 'fas fa-user' : 'fas fa-robot';

    let sourcesHTML = '';
    if (role === 'assistant' && webSources && webSources.length > 0) {
        sourcesHTML = buildSourcesHTML(webSources);
    }

    // Build speak button for assistant messages
    let speakBtnHTML = '';
    if (role === 'assistant' && content.length > 10) {
        speakBtnHTML = `
            <div class="chat-voice-controls" data-text="${escapeForAttr(content)}">
                <button class="btn-speak btn-speak-main" onclick="speakMessage(this, '${escapeForAttr(content)}')" title="Listen to this message">
                    <i class="fas fa-volume-up"></i>
                    <span>Listen</span>
                </button>
                <button class="btn-speak btn-speak-pause" onclick="togglePauseSpeak(this)" style="display: none;" title="Pause speaking">
                    <i class="fas fa-pause"></i>
                    <span>Pause</span>
                </button>
            </div>
        `;
    }

    messageDiv.innerHTML = `
        <div class="message-avatar">
            <i class="${avatarIcon}"></i>
        </div>
        <div class="message-bubble">
            <div class="message-content">${formatMessageContent(content)}</div>
            ${sourcesHTML}
            <div class="message-meta">
                <span class="message-time">${formatChatTime(timestamp)}</span>
                ${speakBtnHTML}
            </div>
        </div>
    `;

    messagesContainer.appendChild(messageDiv);

    // Auto-read if enabled
    if (animate && role === 'assistant' && ChatState.autoReadEnabled && content.length > 10) {
        setTimeout(() => {
            const lastControls = messagesContainer.lastElementChild?.querySelector('.btn-speak-main');
            if (lastControls) {
                speakMessage(lastControls, escapeForAttr(content));
            } else {
                speakText(content);
            }
        }, 500);
    }

    if (animate) {
        setTimeout(scrollToBottom, 100);
    }
}


/* ==================== BUILD SOURCES HTML ==================== */
function buildSourcesHTML(sources) {
    if (!sources || sources.length === 0) return '';

    const sourcesList = sources.map(source => {
        const url = source.url || '#';
        const title = source.title || extractDomain(url);
        const isTrusted = source.is_trusted || false;
        const domain = extractDomain(url);

        return `
            <a href="${url}" target="_blank" rel="noopener noreferrer"
               class="source-item ${isTrusted ? 'trusted' : ''}">
                <i class="fas fa-external-link-alt"></i>
                <span class="source-domain">${domain}</span>
                ${isTrusted ? '<span class="trusted-badge">Trusted</span>' : ''}
            </a>
        `;
    }).join('');

    return `
        <div class="message-sources">
            <div class="sources-title">
                <i class="fas fa-globe"></i>
                <span>Sources (${sources.length})</span>
            </div>
            <div class="sources-list">
                ${sourcesList}
            </div>
        </div>
    `;
}


/* ==================== FORMAT MESSAGE CONTENT ==================== */
function formatMessageContent(content) {
    if (!content) return '';

    let formatted = escapeHTML(content);

    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/(?<!\*)\*([^\*]+)\*(?!\*)/g, '<em>$1</em>');
    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');

    formatted = formatted.replace(
        /(https?:\/\/[^\s]+)/g,
        '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
    );

    formatted = formatted.replace(/\n/g, '<br>');
    formatted = formatted.replace(/^[•·\-\*] (.+)$/gm, '<li>$1</li>');

    formatted = formatted.replace(/(<li>.*?<\/li>(\s*<br>)*)+/g, function(match) {
        return '<ul>' + match.replace(/<br>/g, '') + '</ul>';
    });

    formatted = formatted.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');

    return formatted;
}


/* ==================== RENDER SUGGESTED QUESTIONS ==================== */
function renderSuggestedQuestions(questions) {
    const container = document.getElementById('suggestedQuestions');
    const list = document.getElementById('suggestedList');

    if (!container || !list || !questions || questions.length === 0) {
        return;
    }

    container.style.display = 'block';

    list.innerHTML = questions.map(question => `
        <button class="suggested-question-btn" onclick="askSuggestedQuestion(this)">
            <i class="fas fa-comment-dots"></i>
            <span>${escapeHTML(question)}</span>
        </button>
    `).join('');
}


/* ==================== HIDE SUGGESTED QUESTIONS ==================== */
function hideSuggestedQuestions() {
    const container = document.getElementById('suggestedQuestions');
    if (container) {
        container.style.display = 'none';
    }
}


/* ==================== ASK SUGGESTED QUESTION ==================== */
function askSuggestedQuestion(buttonEl) {
    if (!buttonEl) return;

    const questionText = buttonEl.querySelector('span').textContent;
    const chatInput = document.getElementById('chatInput');

    if (chatInput) {
        chatInput.value = questionText;
        chatInput.dispatchEvent(new Event('input'));

        setTimeout(() => {
            handleSendMessage();
        }, 100);
    }
}


/* ==================== HANDLE QUICK ACTION ==================== */
function handleQuickAction(action) {
    const actionQuestions = {
        en: {
            symptoms: "Can you explain my symptoms in more detail?",
            remedies: "What are the best home remedies for my condition?",
            diet: "What foods should I eat and avoid?",
            doctor: "When should I see a doctor about this?"
        },
        hi: {
            symptoms: "क्या आप मेरे लक्षणों के बारे में विस्तार से बता सकते हैं?",
            remedies: "मेरी स्थिति के लिए सबसे अच्छे घरेलू उपचार क्या हैं?",
            diet: "मुझे कौन से खाद्य पदार्थ खाने चाहिए और किनसे बचना चाहिए?",
            doctor: "मुझे डॉक्टर के पास कब जाना चाहिए?"
        },
        bn: {
            symptoms: "আপনি কি আমার লক্ষণগুলি বিস্তারিতভাবে ব্যাখ্যা করতে পারেন?",
            remedies: "আমার অবস্থার জন্য সেরা ঘরোয়া প্রতিকার কি কি?",
            diet: "আমার কোন খাবার খাওয়া উচিত এবং কোনগুলো এড়িয়ে চলা উচিত?",
            doctor: "আমার কখন ডাক্তারের কাছে যাওয়া উচিত?"
        },
        hinglish: {
            symptoms: "Kya aap mere symptoms ke baare mein detail mein bata sakte hain?",
            remedies: "Meri condition ke liye best home remedies kya hain?",
            diet: "Mujhe kaun se foods khane chahiye aur kya avoid karna chahiye?",
            doctor: "Mujhe doctor ke paas kab jaana chahiye?"
        },
        benglish: {
            symptoms: "Apni ki amar symptoms gulo detail e explain korte parben?",
            remedies: "Amar condition er jonno best home remedies ki ki?",
            diet: "Amar kon foods khawa uchit ar konta avoid kora uchit?",
            doctor: "Amar kokhon doctor er kache jaowa uchit?"
        },
        auto: {
            symptoms: "Can you explain my symptoms in more detail?",
            remedies: "What are the best home remedies for my condition?",
            diet: "What foods should I eat and avoid?",
            doctor: "When should I see a doctor about this?"
        }
    };

    const langQuestions = actionQuestions[ChatState.currentLanguage] || actionQuestions.en;
    const question = langQuestions[action] || langQuestions.symptoms;

    const chatInput = document.getElementById('chatInput');

    if (chatInput) {
        chatInput.value = question;
        chatInput.dispatchEvent(new Event('input'));

        setTimeout(() => {
            handleSendMessage();
        }, 100);
    }
}


/* ==================== SHOW TYPING INDICATOR ==================== */
function showTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
        indicator.style.display = 'flex';
        scrollToBottom();
    }
}


/* ==================== HIDE TYPING INDICATOR ==================== */
function hideTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
        indicator.style.display = 'none';
    }
}


/* ==================== SHOW CHAT LOADING ==================== */
function showChatLoading(show) {
    const loading = document.getElementById('chatLoading');
    if (loading) {
        loading.style.display = show ? 'flex' : 'none';
    }
}


/* ==================== SHOW CHAT ERROR ==================== */
function showChatError(message) {
    const messagesContainer = document.getElementById('chatMessages');
    if (!messagesContainer) return;

    const errorDiv = document.createElement('div');
    errorDiv.className = 'chat-error';
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        <div class="chat-error-content">
            <div class="chat-error-title">Error</div>
            <div class="chat-error-message">${escapeHTML(message)}</div>
        </div>
    `;

    messagesContainer.appendChild(errorDiv);
    scrollToBottom();

    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}


/* ==================== HANDLE CLEAR CHAT ==================== */
async function handleClearChat() {
    if (!ChatState.sessionId) return;

    const confirmed = confirm('Are you sure you want to clear this chat? All messages will be deleted.');

    if (!confirmed) return;

    // Stop any TTS
    stopSpeaking();

    try {
        const token = localStorage.getItem('userToken');

        const response = await fetch(
            `${CONFIG.API_BASE_URL}/api/chat/session/${ChatState.sessionId}/clear`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        const data = await response.json();

        if (data.success) {
            ChatState.sessionId = data.session.id;
            ChatState.messages = data.messages || [];

            renderMessages(ChatState.messages);

            if (ChatState.suggestedQuestions.length > 0) {
                renderSuggestedQuestions(ChatState.suggestedQuestions);
            }
        } else {
            showChatError('Failed to clear chat');
        }

    } catch (error) {
        console.error('Clear chat error:', error);
        showChatError('Failed to clear chat');
    }
}


/* ==================== HANDLE TOGGLE CHAT ==================== */
function handleToggleChat() {
    const chatSection = document.getElementById('chatSection');
    const toggleBtn = document.getElementById('toggleChatBtn');

    if (!chatSection || !toggleBtn) return;

    ChatState.isMinimized = !ChatState.isMinimized;

    if (ChatState.isMinimized) {
        chatSection.classList.add('minimized');
        toggleBtn.innerHTML = '<i class="fas fa-chevron-down"></i>';
        toggleBtn.title = 'Maximize';
        stopSpeaking();
    } else {
        chatSection.classList.remove('minimized');
        toggleBtn.innerHTML = '<i class="fas fa-chevron-up"></i>';
        toggleBtn.title = 'Minimize';
        setTimeout(scrollToBottom, 300);
    }
}


/* ==================== HANDLE WEB SEARCH TOGGLE ==================== */
function handleWebSearchToggle() {
    ChatState.useWebSearch = !ChatState.useWebSearch;

    const toggleBtn = document.getElementById('webSearchToggle');
    const statusEl = document.getElementById('webSearchStatus');

    if (toggleBtn) {
        if (ChatState.useWebSearch) {
            toggleBtn.classList.remove('disabled');
            toggleBtn.title = 'Web search enabled';
        } else {
            toggleBtn.classList.add('disabled');
            toggleBtn.title = 'Web search disabled';
        }
    }

    if (statusEl) {
        if (ChatState.useWebSearch) {
            statusEl.classList.remove('disabled');
            statusEl.innerHTML = '<i class="fas fa-check-circle"></i> Web search ON';
        } else {
            statusEl.classList.add('disabled');
            statusEl.innerHTML = '<i class="fas fa-times-circle"></i> Web search OFF';
        }
    }
}


/* ==================== SCROLL TO BOTTOM ==================== */
function scrollToBottom() {
    const container = document.getElementById('chatContainer');
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
}


/* ==================== CHAT VOICE INPUT ==================== */
function initChatVoiceRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        console.warn('Speech Recognition not supported');
        const voiceBtn = document.getElementById('chatVoiceBtn');
        if (voiceBtn) {
            voiceBtn.style.opacity = '0.5';
            voiceBtn.style.cursor = 'not-allowed';
            voiceBtn.title = 'Voice not supported in this browser';
        }
        return;
    }

    ChatState.chatRecognition = new SpeechRecognition();
    ChatState.chatRecognition.continuous = true;
    ChatState.chatRecognition.interimResults = true;
    ChatState.chatRecognition.maxAlternatives = 1;

    const lang = LANGUAGES[ChatState.currentLanguage];
    ChatState.chatRecognition.lang = lang ? lang.speech : 'en-US';

    ChatState.chatRecognition.onstart = function () {
        ChatState.isChatRecording = true;
        ChatState.chatTranscript = '';
        updateChatVoiceUI(true);
        showChatVoiceStatus('Listening... Speak your question');
    };

    ChatState.chatRecognition.onresult = function (event) {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const text = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                final += text + ' ';
            } else {
                interim += text;
            }
        }

        if (final) {
            ChatState.chatTranscript += final;
        }

        const fullText = ChatState.chatTranscript + interim;

        const chatInput = document.getElementById('chatInput');
        if (chatInput) {
            chatInput.value = fullText;
            chatInput.dispatchEvent(new Event('input'));
        }
    };

    ChatState.chatRecognition.onerror = function (event) {
        console.error('Chat voice error:', event.error);

        if (event.error === 'not-allowed') {
            showChatError('Microphone access denied. Please allow microphone.');
        } else if (event.error !== 'aborted' && event.error !== 'no-speech') {
            showChatError('Voice error: ' + event.error);
        }

        ChatState.isChatRecording = false;
        updateChatVoiceUI(false);
        hideChatVoiceStatus();
    };

    ChatState.chatRecognition.onend = function () {
        ChatState.isChatRecording = false;
        updateChatVoiceUI(false);
        hideChatVoiceStatus();

        if (ChatState.chatTranscript.trim().length >= 2) {
            setTimeout(() => {
                handleSendMessage();
            }, 500);
        }
    };
}


async function toggleChatVoice() {
    if (ChatState.isChatRecording) {
        stopChatVoice();
        return;
    }

    if (!ChatState.chatRecognition) {
        initChatVoiceRecognition();
    }

    if (!ChatState.chatRecognition) {
        showChatError('Voice input not supported. Use Chrome or Edge browser.');
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
    } catch (e) {
        showChatError('Microphone access denied. Please allow microphone.');
        return;
    }

    const lang = LANGUAGES[ChatState.currentLanguage];
    ChatState.chatRecognition.lang = lang ? lang.speech : 'en-US';

    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.value = '';
        chatInput.dispatchEvent(new Event('input'));
    }

    ChatState.chatTranscript = '';

    try {
        ChatState.chatRecognition.start();
    } catch (e) {
        console.error('Failed to start voice:', e);
        try {
            ChatState.chatRecognition.stop();
            setTimeout(() => {
                ChatState.chatRecognition.start();
            }, 300);
        } catch (e2) {
            showChatError('Failed to start voice input.');
        }
    }
}


function stopChatVoice() {
    if (ChatState.chatRecognition && ChatState.isChatRecording) {
        try {
            ChatState.chatRecognition.stop();
        } catch (e) {
            console.warn('Stop error:', e);
        }
    }
    ChatState.isChatRecording = false;
    updateChatVoiceUI(false);
    hideChatVoiceStatus();
}


function updateChatVoiceUI(isRecording) {
    const voiceBtn = document.getElementById('chatVoiceBtn');
    const voiceIcon = document.getElementById('chatVoiceIcon');

    if (voiceBtn) {
        if (isRecording) {
            voiceBtn.classList.add('recording');
            voiceBtn.title = 'Stop recording';
        } else {
            voiceBtn.classList.remove('recording');
            voiceBtn.title = 'Voice input';
        }
    }

    if (voiceIcon) {
        voiceIcon.className = isRecording ? 'fas fa-stop' : 'fas fa-microphone';
    }
}


function showChatVoiceStatus(message) {
    hideChatVoiceStatus();

    const inputArea = document.querySelector('.chat-input-area');
    if (!inputArea) return;

    const statusDiv = document.createElement('div');
    statusDiv.className = 'chat-voice-status';
    statusDiv.id = 'chatVoiceStatus';
    statusDiv.innerHTML = `
        <i class="fas fa-circle" style="color: #ef4444; font-size: 0.6rem;"></i>
        <span>${message}</span>
        <button class="cancel-voice" onclick="stopChatVoice()">
            <i class="fas fa-times"></i> Cancel
        </button>
    `;

    inputArea.insertBefore(statusDiv, inputArea.querySelector('.chat-input-wrapper'));
}


function hideChatVoiceStatus() {
    const status = document.getElementById('chatVoiceStatus');
    if (status) status.remove();
}


/* ==================== TEXT-TO-SPEECH (TTS) ==================== */
/*function speakText(text) {
    if (!ChatState.synthesis) {
        console.warn('Text-to-Speech not supported');
        return;
    }

    ChatState.synthesis.cancel();

    const cleanText = text
        //.replace(/\*\*///g, '')
        //.replace(/\*/g, '')
        //.replace(/`/g, '')
        //.replace(/#{1,6}\s/g, '')
        //.replace(/\[.*?\]\(.*?\)/g, '')
        //.replace(/<[^>]*>/g, '')
        //.replace(/https?:\/\/\S+/g, '')
        //.replace(/\n{2,}/g, '. ')
        //.replace(/\n/g, '. ')
        //.trim();

    /*if (!cleanText || cleanText.length < 5) return;

    const maxLength = 5000;
    const speakableText = cleanText.length > maxLength
        ? cleanText.substring(0, maxLength) + '... Text truncated.'
        : cleanText;

    const utterance = new SpeechSynthesisUtterance(speakableText);

    const langMap = {
        'en': 'en-US',
        'hi': 'hi-IN',
        'bn': 'bn-BD',
        'hinglish': 'en-IN',
        'benglish': 'en-IN',
        'auto': 'en-US'
    };

    utterance.lang = langMap[ChatState.currentLanguage] || 'en-US';
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;

    const voices = ChatState.synthesis.getVoices();
    const matchingVoice = voices.find(v => v.lang.startsWith(utterance.lang.split('-')[0]));
    if (matchingVoice) {
        utterance.voice = matchingVoice;
    }

    utterance.onstart = function () {
        ChatState.isSpeaking = true;
        ChatState.currentUtterance = utterance;
    };

    utterance.onend = function () {
        ChatState.isSpeaking = false;
        ChatState.currentUtterance = null;
        resetAllSpeakButtons();
    };

    utterance.onerror = function (event) {
        console.error('TTS Error:', event.error);
        ChatState.isSpeaking = false;
        ChatState.currentUtterance = null;
        resetAllSpeakButtons();
    };

    ChatState.synthesis.speak(utterance);
}*/

async function speakText(text) {
    try {
        ChatState.isSpeaking = true;
        ChatState.isPaused = false;

        // Stop any currently playing audio
        if (ChatState.currentAudio) {
            ChatState.currentAudio.pause();
            ChatState.currentAudio = null;
        }

        const response = await fetch(
            `${CONFIG.API_BASE_URL}/api/voice/speak`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text,
                    language: ChatState.currentLanguage
                })
            }
        );

        if (!response.ok) {
            throw new Error('TTS synthesis failed');
        }

        const blob = await response.blob();
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        
        ChatState.currentAudio = audio;

        audio.onended = function() {
            ChatState.isSpeaking = false;
            ChatState.isPaused = false;
            ChatState.currentAudio = null;
            resetAllSpeakButtons();
        };

        audio.onerror = function() {
            ChatState.isSpeaking = false;
            ChatState.isPaused = false;
            ChatState.currentAudio = null;
            resetAllSpeakButtons();
        };

        audio.play();

    } catch (error) {
        console.error('Speech synthesis error:', error);
        ChatState.isSpeaking = false;
        ChatState.isPaused = false;
        ChatState.currentAudio = null;
        resetAllSpeakButtons();
    }
}

function stopSpeaking() {
    if (ChatState.currentAudio) {
        ChatState.currentAudio.pause();
        ChatState.currentAudio = null;
    }
    if (ChatState.synthesis) {
        ChatState.synthesis.cancel();
    }
    ChatState.isSpeaking = false;
    ChatState.isPaused = false;
    ChatState.currentUtterance = null;
    resetAllSpeakButtons();
}

function togglePauseSpeak(buttonEl) {
    if (!ChatState.currentAudio) return;

    if (ChatState.isPaused) {
        // Resume playing
        ChatState.currentAudio.play();
        ChatState.isPaused = false;
        
        buttonEl.innerHTML = `
            <i class="fas fa-pause"></i>
            <span>Pause</span>
        `;
    } else {
        // Pause playing
        ChatState.currentAudio.pause();
        ChatState.isPaused = true;

        buttonEl.innerHTML = `
            <i class="fas fa-play"></i>
            <span>Resume</span>
        `;
    }
}

function speakMessage(buttonEl, encodedText) {
    if (!ChatState.synthesis) {
        showChatError('Text-to-Speech not supported in your browser.');
        return;
    }

    const text = decodeFromAttr(encodedText);

    // If this button is currently a Stop button, clicking it stops the voice output
    if (buttonEl.classList.contains('speaking')) {
        stopSpeaking();
        return;
    }

    // Stop any other active voice playback first
    stopSpeaking();

    // Reset all speak buttons to initial state
    resetAllSpeakButtons();
    
    // Turn this button into a Stop button
    buttonEl.classList.add('speaking');
    buttonEl.innerHTML = `
        <i class="fas fa-stop"></i>
        <span>Stop</span>
    `;

    // Show the pause button next to it
    const wrapper = buttonEl.parentElement;
    if (wrapper) {
        const pauseBtn = wrapper.querySelector('.btn-speak-pause');
        if (pauseBtn) {
            pauseBtn.style.display = 'inline-flex';
            pauseBtn.innerHTML = `
                <i class="fas fa-pause"></i>
                <span>Pause</span>
            `;
        }
    }

    ChatState.isSpeaking = true;
    ChatState.isPaused = false;

    speakText(text);

    const checkInterval = setInterval(() => {
        if (!ChatState.isSpeaking && !ChatState.isPaused) {
            clearInterval(checkInterval);
            resetAllSpeakButtons();
        }
    }, 500);
}

function resetAllSpeakButtons() {
    document.querySelectorAll('.chat-voice-controls').forEach(wrapper => {
        const mainBtn = wrapper.querySelector('.btn-speak-main');
        if (mainBtn) {
            mainBtn.classList.remove('speaking');
            mainBtn.innerHTML = `
                <i class="fas fa-volume-up"></i>
                <span>Listen</span>
            `;
        }
        const pauseBtn = wrapper.querySelector('.btn-speak-pause');
        if (pauseBtn) {
            pauseBtn.style.display = 'none';
            pauseBtn.innerHTML = `
                <i class="fas fa-pause"></i>
                <span>Pause</span>
            `;
        }
    });
}


/* ==================== AUTO-READ TOGGLE ==================== */
function toggleAutoRead() {
    ChatState.autoReadEnabled = !ChatState.autoReadEnabled;

    const toggle = document.getElementById('autoReadToggle');
    if (toggle) {
        if (ChatState.autoReadEnabled) {
            toggle.classList.add('active');
            toggle.innerHTML = '<i class="fas fa-volume-up"></i> Auto-read ON';
        } else {
            toggle.classList.remove('active');
            toggle.innerHTML = '<i class="fas fa-volume-up"></i> Auto-read OFF';
            stopSpeaking();
        }
    }

    localStorage.setItem('chatAutoRead', ChatState.autoReadEnabled ? 'true' : 'false');
}


/* ==================== ESCAPE FOR HTML ATTRIBUTE ==================== */
function escapeForAttr(str) {
    if (!str) return '';
    return btoa(encodeURIComponent(str));
}


function decodeFromAttr(encoded) {
    if (!encoded) return '';
    try {
        return decodeURIComponent(atob(encoded));
    } catch (e) {
        return '';
    }
}


/* ==================== UTILITY FUNCTIONS ==================== */
function formatChatTime(dateStr) {
    if (!dateStr) return '';

    try {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = Math.floor((now - date) / 1000);

        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;

        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return '';
    }
}


function extractDomain(url) {
    if (!url) return '';

    try {
        const domain = url.replace('https://', '').replace('http://', '').replace('www.', '');
        return domain.split('/')[0];
    } catch (e) {
        return url;
    }
}


function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}


/* ==================== EXPORT FOR GLOBAL ACCESS ==================== */
window.askSuggestedQuestion = askSuggestedQuestion;
window.selectLanguage = selectLanguage;
window.speakMessage = speakMessage;
window.stopSpeaking = stopSpeaking;
window.stopChatVoice = stopChatVoice;
window.toggleChatVoice = toggleChatVoice;
window.togglePauseSpeak = togglePauseSpeak;