/* ============================================
   MAIN APP LOGIC - SYMPTOM CHECKER
   ============================================ */


/* ==================== LANGUAGES CONFIG ==================== */
const SYMPTOM_LANGUAGES = {
    'en': {
        code: 'en',
        name: 'English',
        nativeName: 'English',
        flag: '🇬🇧'
    },
    'hi': {
        code: 'hi',
        name: 'Hindi',
        nativeName: 'हिन्दी',
        flag: '🇮🇳'
    },
    'bn': {
        code: 'bn',
        name: 'Bengali',
        nativeName: 'বাংলা',
        flag: '🇧🇩'
    },
    'hinglish': {
        code: 'hinglish',
        name: 'Hinglish',
        nativeName: 'Hindi + English',
        flag: '🇮🇳'
    },
    'benglish': {
        code: 'benglish',
        name: 'Benglish',
        nativeName: 'Bengali + English',
        flag: '🇧🇩'
    },
    'auto': {
        code: 'auto',
        name: 'Auto Detect',
        nativeName: 'Detect language',
        flag: '🌐'
    }
};


/* ==================== APP STATE ==================== */
const AppState = {
    currentStep: 1,
    totalSteps: 3,
    patientData: {
        age: null,
        gender: null,
        duration: null
    },
    symptomData: {
        text: '',
        voice: '',
        combined: '',
        additionalNotes: ''
    },
    inputMethods: [],
    images: [],
    activeTab: 'text',
    isAnalyzing: false,
    currentLanguage: 'en',
    isLanguageDropdownOpen: false
};


/* ==================== INIT ==================== */
document.addEventListener('DOMContentLoaded', function () {
    const path = window.location.pathname;

    if (path.includes('symptom-checker')) {
        initSymptomChecker();
    } else if (path.includes('index') || path === '/' || path === '') {
        initLandingPage();
    }
});


/* ============================================
   LANDING PAGE
   ============================================ */
function initLandingPage() {
    initNavbar();
    initScrollAnimations();
    initSmoothScroll();
}


function initNavbar() {
    const navbar = document.querySelector('.navbar');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');

    if (navbar) {
        window.addEventListener('scroll', function () {
            if (window.scrollY > 20) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });
    }

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', toggleMobileMenu);
    }
}


function toggleMobileMenu() {
    let mobileMenu = document.getElementById('mobileNavMenu');

    if (!mobileMenu) {
        mobileMenu = createMobileMenu();
    }

    mobileMenu.classList.toggle('open');

    const icon = document.querySelector('.mobile-menu-btn i');
    if (icon) {
        icon.className = mobileMenu.classList.contains('open')
            ? 'fas fa-times'
            : 'fas fa-bars';
    }
}


function createMobileMenu() {
    const menu = document.createElement('div');
    menu.id = 'mobileNavMenu';
    menu.className = 'mobile-nav-menu';

    menu.innerHTML = `
        <a href="index.html" class="mobile-nav-link">Home</a>
        <a href="#features" class="mobile-nav-link">Features</a>
        <a href="#how-it-works" class="mobile-nav-link">How It Works</a>
        <a href="#about" class="mobile-nav-link">About</a>
        <div class="mobile-nav-auth">
            <a href="login.html" class="btn btn-outline btn-full">Login</a>
            <a href="register.html" class="btn btn-primary btn-full">Sign Up</a>
        </div>
    `;

    document.body.appendChild(menu);

    menu.querySelectorAll('.mobile-nav-link').forEach(link => {
        link.addEventListener('click', () => {
            menu.classList.remove('open');
            const icon = document.querySelector('.mobile-menu-btn i');
            if (icon) icon.className = 'fas fa-bars';
        });
    });

    return menu;
}


function initScrollAnimations() {
    const revealElements = document.querySelectorAll(
        '.feature-card, .step-card, .about-text, .about-image'
    );

    if (revealElements.length === 0) return;

    revealElements.forEach(el => el.classList.add('reveal'));

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    revealElements.forEach(el => observer.observe(el));
}


function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href === '#') return;

            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                const offset = 80;
                const top = target.getBoundingClientRect().top + window.scrollY - offset;
                window.scrollTo({ top, behavior: 'smooth' });
            }
        });
    });
}


/* ============================================
   SYMPTOM CHECKER
   ============================================ */
function initSymptomChecker() {
    checkUserAuth();
    initSidebarToggle();
    initLogout();
    initProgressSteps();
    initStep1();
    initStep2();
    initStep3();
    initInputTabs();
    initQuickSymptomTags();
    initCharacterCount();
    initLanguageSelector();
}


/* ==================== LANGUAGE SELECTOR ==================== */
function initLanguageSelector() {
    // Load saved language preference (sync with chat)
    const savedLanguage = localStorage.getItem('chatLanguage');
    if (savedLanguage && SYMPTOM_LANGUAGES[savedLanguage]) {
        AppState.currentLanguage = savedLanguage;
    }

    // Update UI
    updateLanguageUI();

    // Setup event listeners
    const languageBtn = document.getElementById('symptomLangBtn');
    if (languageBtn) {
        languageBtn.addEventListener('click', toggleLanguageDropdown);
    }

    // Language options
    const languageOptions = document.querySelectorAll('.symptom-lang-option');
    languageOptions.forEach(option => {
        option.addEventListener('click', function () {
            const lang = this.dataset.lang;
            selectLanguage(lang);
        });
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function (e) {
        const dropdown = document.getElementById('symptomLangDropdown');
        const button = document.getElementById('symptomLangBtn');

        if (dropdown && button && AppState.isLanguageDropdownOpen) {
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

    const dropdown = document.getElementById('symptomLangDropdown');
    const button = document.getElementById('symptomLangBtn');

    if (!dropdown || !button) return;

    AppState.isLanguageDropdownOpen = !AppState.isLanguageDropdownOpen;

    if (AppState.isLanguageDropdownOpen) {
        dropdown.style.display = 'block';
        button.classList.add('active');
    } else {
        dropdown.style.display = 'none';
        button.classList.remove('active');
    }
}


/* ==================== CLOSE LANGUAGE DROPDOWN ==================== */
function closeLanguageDropdown() {
    const dropdown = document.getElementById('symptomLangDropdown');
    const button = document.getElementById('symptomLangBtn');

    if (dropdown) dropdown.style.display = 'none';
    if (button) button.classList.remove('active');

    AppState.isLanguageDropdownOpen = false;
}


/* ==================== SELECT LANGUAGE ==================== */
function selectLanguage(langCode) {
    if (!SYMPTOM_LANGUAGES[langCode]) return;

    const previousLang = AppState.currentLanguage;
    AppState.currentLanguage = langCode;

    // Save preference (sync with chat)
    localStorage.setItem('chatLanguage', langCode);

    // Update UI
    updateLanguageUI();

    // Close dropdown
    closeLanguageDropdown();

    // Show toast notification
    if (previousLang !== langCode) {
        showLanguageToast(langCode);
    }

    console.log('Symptom checker language changed to:', langCode);
}


/* ==================== UPDATE LANGUAGE UI ==================== */
function updateLanguageUI() {
    const lang = SYMPTOM_LANGUAGES[AppState.currentLanguage];
    if (!lang) return;

    // Update button
    const button = document.getElementById('symptomLangBtn');
    if (button) {
        const flagEl = button.querySelector('.symptom-lang-flag');
        const codeEl = button.querySelector('.symptom-lang-code');

        if (flagEl) flagEl.textContent = lang.flag;
        if (codeEl) codeEl.textContent = lang.code.toUpperCase();
    }

    // Update active state in dropdown
    const options = document.querySelectorAll('.symptom-lang-option');
    options.forEach(option => {
        if (option.dataset.lang === AppState.currentLanguage) {
            option.classList.add('active');
        } else {
            option.classList.remove('active');
        }
    });
}


/* ==================== SHOW LANGUAGE TOAST ==================== */
function showLanguageToast(langCode) {
    const lang = SYMPTOM_LANGUAGES[langCode];
    if (!lang) return;

    // Remove existing toast
    const existingToast = document.querySelector('.symptom-lang-toast');
    if (existingToast) {
        existingToast.remove();
    }

    // Create new toast
    const toast = document.createElement('div');
    toast.className = 'symptom-lang-toast';
    toast.innerHTML = `
        <span class="toast-flag">${lang.flag}</span>
        <span>Language changed to ${lang.name}</span>
    `;

    document.body.appendChild(toast);

    // Auto-remove after 3 seconds
    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}


/* ==================== AUTH CHECK ==================== */
function checkUserAuth() {
    const token = localStorage.getItem('userToken');
    const userData = localStorage.getItem('userData');

    if (!token || !userData) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const user = JSON.parse(userData);
        const nameEl = document.getElementById('topbarUserName');
        const sidebarNameEl = document.getElementById('sidebarUserName');

        if (nameEl) nameEl.textContent = user.name || 'User';
        if (sidebarNameEl) sidebarNameEl.textContent = user.name || 'User';
    } catch (e) {
        window.location.href = 'login.html';
    }
}


/* ==================== SIDEBAR TOGGLE ==================== */
function initSidebarToggle() {
    const toggleBtn = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    const closeBtn = document.getElementById('sidebarClose');

    let overlay = document.getElementById('sidebarOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'sidebarOverlay';
        overlay.className = 'sidebar-overlay';
        document.body.appendChild(overlay);
    }

    const openSidebar = () => {
        if (sidebar) sidebar.classList.add('open');
        overlay.classList.add('show');
    };

    const closeSidebar = () => {
        if (sidebar) sidebar.classList.remove('open');
        overlay.classList.remove('show');
    };

    if (toggleBtn) toggleBtn.addEventListener('click', openSidebar);
    if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
    overlay.addEventListener('click', closeSidebar);
}


/* ==================== LOGOUT ==================== */
function initLogout() {
    const logoutBtns = document.querySelectorAll('#logoutBtn, .logout-link');

    logoutBtns.forEach(btn => {
        btn.addEventListener('click', async function (e) {
            e.preventDefault();

            try {
                await API.auth.logout();
            } catch (err) {
                console.warn('Logout error:', err);
            }

            localStorage.removeItem('userToken');
            localStorage.removeItem('userData');
            window.location.href = 'login.html';
        });
    });
}


/* ==================== PROGRESS STEPS ==================== */
function initProgressSteps() {
    updateProgressUI(1);
}


function updateProgressUI(step) {
    AppState.currentStep = step;

    const progressBar = document.getElementById('progressBar');
    const percent = ((step - 1) / (AppState.totalSteps - 1)) * 100;

    if (progressBar) {
        progressBar.style.width = `${Math.max(percent, 10)}%`;
    }

    for (let i = 1; i <= AppState.totalSteps; i++) {
        const stepEl = document.getElementById(`progressStep${i}`);
        if (!stepEl) continue;

        stepEl.classList.remove('active', 'completed');

        if (i < step) {
            stepEl.classList.add('completed');
            const circle = stepEl.querySelector('.progress-circle');
            if (circle) circle.innerHTML = '<i class="fas fa-check"></i>';
        } else if (i === step) {
            stepEl.classList.add('active');
            const circle = stepEl.querySelector('.progress-circle');
            if (circle) circle.textContent = i;
        } else {
            const circle = stepEl.querySelector('.progress-circle');
            if (circle) circle.textContent = i;
        }
    }

    for (let i = 1; i <= AppState.totalSteps; i++) {
        const stepEl = document.getElementById(`checkerStep${i}`);
        if (stepEl) {
            stepEl.style.display = i === step ? 'block' : 'none';
        }
    }
}


/* ==================== STEP 1: BASIC INFO ==================== */
function initStep1() {
    const nextBtn = document.getElementById('step1NextBtn');
    if (nextBtn) {
        nextBtn.addEventListener('click', handleStep1Next);
    }
}


function handleStep1Next() {
    const age = document.getElementById('patientAge')?.value;
    const gender = document.querySelector('input[name="patientGender"]:checked')?.value;
    const duration = document.getElementById('symptomDuration')?.value;

    clearErrors(['ageError', 'genderError', 'durationError']);

    let isValid = true;

    if (!age || age < 1 || age > 120) {
        showError('ageError', 'Please enter a valid age (1-120)');
        isValid = false;
    }

    if (!gender) {
        showError('genderError', 'Please select your gender');
        isValid = false;
    }

    if (!isValid) return;

    AppState.patientData.age = parseInt(age);
    AppState.patientData.gender = gender;
    AppState.patientData.duration = duration || 'Not specified';

    updateProgressUI(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}


/* ==================== STEP 2: SYMPTOMS INPUT ==================== */
function initStep2() {
    const backBtn = document.getElementById('step2BackBtn');
    const nextBtn = document.getElementById('step2NextBtn');

    if (backBtn) backBtn.addEventListener('click', () => {
        updateProgressUI(1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    if (nextBtn) nextBtn.addEventListener('click', handleStep2Next);

    const clearBtn = document.getElementById('clearTextBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            const textarea = document.getElementById('symptomsText');
            if (textarea) {
                textarea.value = '';
                updateCharCount(0);
            }
        });
    }
}


function handleStep2Next() {
    const textInput = document.getElementById('symptomsText')?.value?.trim();
    const voiceText = document.getElementById('transcriptionText')?.textContent?.trim();
    const additionalNotes = document.getElementById('additionalNotes')?.value?.trim();

    const hasText = textInput && textInput.length >= 10;
    const hasVoice = voiceText && voiceText !== 'Your speech will appear here in real-time...' && voiceText.length >= 10;
    const hasImages = AppState.images.length > 0;

    if (!hasText && !hasVoice && !hasImages) {
        alert('Please describe your symptoms using text, voice, or upload at least one image.');
        return;
    }

    if (hasText) {
        AppState.symptomData.text = textInput;
        if (!AppState.inputMethods.includes('text')) {
            AppState.inputMethods.push('text');
        }
    }

    if (hasVoice) {
        AppState.symptomData.voice = voiceText;
        if (!AppState.inputMethods.includes('voice')) {
            AppState.inputMethods.push('voice');
        }
    }

    if (hasImages) {
        if (!AppState.inputMethods.includes('image')) {
            AppState.inputMethods.push('image');
        }
    }

    const combined = [textInput, hasVoice ? voiceText : '']
        .filter(Boolean)
        .join(' ')
        .trim();

    AppState.symptomData.combined = combined || textInput || voiceText || '';
    AppState.symptomData.additionalNotes = additionalNotes || '';

    populateReviewSection();
    updateProgressUI(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}


/* ==================== STEP 3: REVIEW & SUBMIT ==================== */
function initStep3() {
    const backBtn = document.getElementById('step3BackBtn');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const editStep1Btn = document.getElementById('editStep1Btn');
    const editStep2Btn = document.getElementById('editStep2Btn');

    if (backBtn) backBtn.addEventListener('click', () => {
        updateProgressUI(2);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    if (analyzeBtn) analyzeBtn.addEventListener('click', handleAnalyze);

    if (editStep1Btn) editStep1Btn.addEventListener('click', () => {
        updateProgressUI(1);
    });

    if (editStep2Btn) editStep2Btn.addEventListener('click', () => {
        updateProgressUI(2);
    });
}


function populateReviewSection() {
    setReviewText('reviewAge', AppState.patientData.age);
    setReviewText('reviewGender', AppState.patientData.gender);
    setReviewText('reviewDuration', AppState.patientData.duration);
    setReviewText('reviewSymptoms', AppState.symptomData.combined || 'Not provided');

    const notesBlock = document.getElementById('reviewNotesBlock');
    const reviewNotes = document.getElementById('reviewNotes');
    if (AppState.symptomData.additionalNotes) {
        if (notesBlock) notesBlock.style.display = '';
        if (reviewNotes) reviewNotes.textContent = AppState.symptomData.additionalNotes;
    } else {
        if (notesBlock) notesBlock.style.display = 'none';
    }

    const badgesEl = document.getElementById('reviewInputMethods');
    if (badgesEl) {
        badgesEl.innerHTML = AppState.inputMethods.map(method => `
            <span class="review-badge badge-${method}">
                <i class="fas fa-${getMethodIcon(method)}"></i>
                ${capitalizeFirst(method)} Input
            </span>
        `).join('');

        if (AppState.inputMethods.length === 0) {
            badgesEl.innerHTML = '<span class="review-badge badge-text"><i class="fas fa-keyboard"></i> Text Input</span>';
        }
    }

    const imagesBlock = document.getElementById('reviewImagesBlock');
    const reviewImages = document.getElementById('reviewImages');
    if (AppState.images.length > 0) {
        if (imagesBlock) imagesBlock.style.display = '';
        if (reviewImages) {
            reviewImages.innerHTML = AppState.images.map(img => `
                <div class="review-image-item">
                    <img src="${img.preview}" alt="${img.type}">
                </div>
            `).join('');
        }
    } else {
        if (imagesBlock) imagesBlock.style.display = 'none';
    }
}


async function handleAnalyze() {
    const agreeEl = document.getElementById('agreeAnalysis');

    if (!agreeEl || !agreeEl.checked) {
        showError('agreeError', 'Please agree to the terms before analyzing');
        return;
    }

    if (AppState.isAnalyzing) return;

    const analyzeBtn = document.getElementById('analyzeBtn');
    setButtonState(analyzeBtn, true);
    AppState.isAnalyzing = true;

    try {
        const payload = buildAnalysisPayload();
        const result = await API.symptoms.analyze(payload);

        if (result && result.success) {
            saveResultsToStorage(result);
            window.location.href = 'results.html';
        } else {
            throw new Error(result?.message || 'Analysis failed');
        }
    } catch (error) {
        alert(handleAPIError(error, 'Analysis failed. Please try again.'));
        setButtonState(analyzeBtn, false);
        AppState.isAnalyzing = false;
    }
}


function buildAnalysisPayload() {
    const imageData = AppState.images.map(img => ({
        data: img.base64,
        type: img.type,
        mime_type: img.mimeType || 'image/jpeg'
    }));

    return {
        symptoms_text: AppState.symptomData.combined,
        additional_notes: AppState.symptomData.additionalNotes,
        age: AppState.patientData.age,
        gender: AppState.patientData.gender,
        duration: AppState.patientData.duration,
        input_type: AppState.inputMethods.length > 1
            ? 'combined'
            : (AppState.inputMethods[0] || 'text'),
        images: imageData,
        image_types: AppState.images.map(img => img.type),
        language: AppState.currentLanguage
    };
}


function saveResultsToStorage(result) {
    const resultsData = {
        ...result,
        patient: {
            age: AppState.patientData.age,
            gender: AppState.patientData.gender,
            duration: AppState.patientData.duration
        },
        symptoms_text: AppState.symptomData.combined,
        input_methods: AppState.inputMethods,
        images: AppState.images.map(img => ({
            preview: img.preview,
            type: img.type
        })),
        language: AppState.currentLanguage,
        timestamp: new Date().toISOString()
    };

    localStorage.setItem('latestResults', JSON.stringify(resultsData));
}


/* ==================== INPUT TABS ==================== */
function initInputTabs() {
    const tabs = document.querySelectorAll('.input-tab');
    const panels = {
        text: document.getElementById('textPanel'),
        voice: document.getElementById('voicePanel'),
        image: document.getElementById('imagePanel')
    };

    tabs.forEach(tab => {
        tab.addEventListener('click', function () {
            const tabName = this.dataset.tab;

            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');

            Object.values(panels).forEach(panel => {
                if (panel) panel.style.display = 'none';
            });

            if (panels[tabName]) {
                panels[tabName].style.display = 'block';
            }

            AppState.activeTab = tabName;

            if (tabName === 'voice' && typeof VoiceInput !== 'undefined') {
                VoiceInput.checkBrowserSupport();
            }
        });
    });
}


/* ==================== QUICK SYMPTOM TAGS ==================== */
function initQuickSymptomTags() {
    const tags = document.querySelectorAll('.symptom-tag');
    const textarea = document.getElementById('symptomsText');

    tags.forEach(tag => {
        tag.addEventListener('click', function () {
            const symptom = this.dataset.symptom;
            if (!symptom || !textarea) return;

            this.classList.toggle('selected');

            const current = textarea.value.trim();

            if (this.classList.contains('selected')) {
                textarea.value = current
                    ? `${current}, ${symptom}`
                    : symptom;
            } else {
                const regex = new RegExp(
                    `,?\\s*${escapeRegex(symptom)}\\s*,?`,
                    'gi'
                );
                textarea.value = textarea.value.replace(regex, ' ').trim();
                textarea.value = textarea.value.replace(/^,|,$/g, '').trim();
            }

            updateCharCount(textarea.value.length);
        });
    });
}


/* ==================== CHARACTER COUNT ==================== */
function initCharacterCount() {
    const textarea = document.getElementById('symptomsText');
    const charCountEl = document.getElementById('charCount');

    if (textarea && charCountEl) {
        textarea.addEventListener('input', function () {
            updateCharCount(this.value.length);
        });
    }
}


function updateCharCount(count) {
    const charCountEl = document.getElementById('charCount');
    if (!charCountEl) return;

    charCountEl.textContent = count;
    charCountEl.className = '';

    if (count > 1800) {
        charCountEl.classList.add('danger');
    } else if (count > 1500) {
        charCountEl.classList.add('warning');
    }
}


/* ==================== UTILITY FUNCTIONS ==================== */
function showError(elementId, message) {
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = message;
        el.style.display = 'block';
    }
}


function clearErrors(elementIds) {
    elementIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = '';
            el.style.display = 'none';
        }
    });
}


function setReviewText(elementId, value) {
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = value || '--';
    }
}


function setButtonState(btn, isLoading) {
    if (!btn) return;
    const textEl = btn.querySelector('.btn-text');
    const loaderEl = btn.querySelector('.btn-loader');

    btn.disabled = isLoading;

    if (textEl) textEl.style.display = isLoading ? 'none' : '';
    if (loaderEl) loaderEl.style.display = isLoading ? '' : 'none';
}


function getMethodIcon(method) {
    const icons = {
        text: 'keyboard',
        voice: 'microphone',
        image: 'camera',
        combined: 'layer-group'
    };
    return icons[method] || 'check';
}


function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}


function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


function formatDate(dateStr) {
    if (!dateStr) return '--';
    try {
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (e) {
        return '--';
    }
}


function formatTimeAgo(dateStr) {
    if (!dateStr) return '';
    const now = new Date();
    const date = new Date(dateStr);
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}


function getSeverityClass(severity) {
    const classes = {
        'Low': 'low',
        'Medium': 'medium',
        'High': 'high',
        'Critical': 'critical'
    };
    return classes[severity] || 'low';
}


function getSeverityIcon(severity) {
    const icons = {
        'Low': 'check-circle',
        'Medium': 'exclamation-circle',
        'High': 'exclamation-triangle',
        'Critical': 'ambulance'
    };
    return icons[severity] || 'info-circle';
}


function truncateText(text, maxLength = 100) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
}


function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}


function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}