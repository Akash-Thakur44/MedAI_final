/* ============================================
   VOICE INPUT LOGIC (WITH MULTI-LANGUAGE)
   ============================================ */


/* ==================== VOICE LANGUAGES ==================== */
const VOICE_LANGUAGES = {
    'en': 'en-US',
    'hi': 'hi-IN',
    'bn': 'bn-BD',
    'hinglish': 'en-IN',
    'benglish': 'en-IN',
    'auto': 'en-US'
};


/* ==================== STATE ==================== */
const VoiceInput = {
    recognition: null,
    mediaRecorder: null,
    audioChunks: [],
    stream: null,
    isRecording: false,
    isSupported: false,
    transcript: '',
    interimTranscript: '',
    selectedLanguage: 'en-US',
    restartAttempts: 0,
    maxRestartAttempts: 3
};


/* ==================== INIT ==================== */
document.addEventListener('DOMContentLoaded', function () {
    const path = window.location.pathname;
    if (path.includes('symptom-checker')) {
        initVoiceInput();
    }
});


function initVoiceInput() {
    checkBrowserSupport();
    initVoiceButton();
    initLanguageSelector();
    initTranscriptionActions();
    syncVoiceLanguage();
}


/* ==================== BROWSER SUPPORT ==================== */
/*function checkBrowserSupport() {
    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        VoiceInput.isSupported = false;
        showVoiceWarning();
        disableVoiceButton();
        return false;
    }

    VoiceInput.isSupported = true;
    VoiceInput.recognition = new SpeechRecognition();
    setupRecognition();
    hideVoiceWarning();
    return true;
}*/
function checkBrowserSupport() {

    if (
        !navigator.mediaDevices ||
        !window.MediaRecorder
    ) {
        VoiceInput.isSupported = false;
        showVoiceWarning();
        disableVoiceButton();
        return false;
    }

    VoiceInput.isSupported = true;
    hideVoiceWarning();

    return true;
}

VoiceInput.checkBrowserSupport = checkBrowserSupport;


/* ==================== SETUP RECOGNITION ==================== */
/*function setupRecognition() {
    const recognition = VoiceInput.recognition;
    if (!recognition) return;

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = VoiceInput.selectedLanguage;

    recognition.onstart = function () {
        VoiceInput.isRecording = true;
        VoiceInput.restartAttempts = 0;
        updateVoiceUI('recording');
        showVoiceWave();
        setVoiceStatus('Listening... Speak now', true);
    };

    recognition.onresult = function (event) {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            const text = result[0].transcript;

            if (result.isFinal) {
                final += text + ' ';
            } else {
                interim += text;
            }
        }

        if (final) {
            VoiceInput.transcript += final;
        }

        VoiceInput.interimTranscript = interim;

        const fullText = VoiceInput.transcript + interim;
        updateTranscriptionDisplay(fullText, !!interim);
    };

    recognition.onerror = function (event) {
        console.error('Speech recognition error:', event.error);

        const errorMessages = {
            'no-speech': 'No speech detected. Please speak clearly.',
            'audio-capture': 'Microphone not found. Check your device.',
            'not-allowed': 'Microphone access denied. Please allow microphone.',
            'network': 'Network error. Check your connection.',
            'aborted': 'Recording stopped.',
            'language-not-supported': 'Selected language is not supported.'
        };

        const message = errorMessages[event.error] || 'Error: ' + event.error;

        if (event.error !== 'aborted' && event.error !== 'no-speech') {
            setVoiceStatus(message, false);
            stopVoiceRecording();
        } else if (event.error === 'no-speech') {
            setVoiceStatus('No speech detected. Try speaking louder.', false);
        }
    };

    recognition.onend = function () {
        if (VoiceInput.isRecording) {
            if (VoiceInput.restartAttempts < VoiceInput.maxRestartAttempts) {
                VoiceInput.restartAttempts++;
                try {
                    VoiceInput.recognition.start();
                    return;
                } catch (e) {
                    console.warn('Could not restart recognition:', e);
                }
            }
        }

        VoiceInput.isRecording = false;
        updateVoiceUI('stopped');
        hideVoiceWave();

        if (VoiceInput.transcript) {
            setVoiceStatus('Recording complete. Review your transcript below.', false);
        } else {
            setVoiceStatus('Click the microphone to start speaking', false);
        }
    };
}*/


/* ==================== VOICE BUTTON ==================== */
function initVoiceButton() {
    const recordBtn = document.getElementById('voiceRecordBtn');
    if (!recordBtn) return;

    recordBtn.addEventListener('click', toggleVoiceRecording);
}


function toggleVoiceRecording() {
    if (!VoiceInput.isSupported) {
        showVoiceWarning();
        return;
    }

    if (VoiceInput.isRecording) {
        stopVoiceRecording();
    } else {
        startVoiceRecording();
    }
}


/*async function startVoiceRecording() {
    if (!VoiceInput.isSupported || !VoiceInput.recognition) {
        showVoiceWarning();
        return;
    }

    if (VoiceInput.isRecording) return;

    // Check microphone permission
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
    } catch (e) {
        setVoiceStatus('Microphone access denied. Please allow microphone in browser settings.', false);
        return;
    }

    VoiceInput.transcript = '';
    VoiceInput.interimTranscript = '';
    VoiceInput.restartAttempts = 0;

    // Sync language
    syncVoiceLanguage();
    VoiceInput.recognition.lang = VoiceInput.selectedLanguage;

    clearTranscriptionDisplay();
    setVoiceStatus('Starting microphone...', false);

    try {
        VoiceInput.recognition.start();
    } catch (error) {
        console.error('Failed to start recognition:', error);
        setVoiceStatus('Failed to start microphone. Please try again.', false);

        if (error.name === 'InvalidStateError') {
            VoiceInput.recognition.stop();
            setTimeout(() => {
                try {
                    VoiceInput.recognition.start();
                } catch (e) {
                    console.error('Retry failed:', e);
                }
            }, 500);
        }
    }
}*/

async function startVoiceRecording() {

    if (VoiceInput.isRecording) return;

    try {

        VoiceInput.stream =
            await navigator.mediaDevices.getUserMedia({
                audio: true
            });

        VoiceInput.audioChunks = [];

        VoiceInput.mediaRecorder =
            new MediaRecorder(
                VoiceInput.stream
            );

        VoiceInput.mediaRecorder.ondataavailable =
            (event) => {

                if (event.data.size > 0) {
                    VoiceInput.audioChunks.push(
                        event.data
                    );
                }
            };

        VoiceInput.mediaRecorder.start();

        VoiceInput.isRecording = true;

        updateVoiceUI('recording');
        showVoiceWave();

        setVoiceStatus(
            'Listening... Speak now',
            true
        );

    } catch (err) {

        console.error(err);

        setVoiceStatus(
            'Microphone access denied.',
            false
        );
    }
}


/*function stopVoiceRecording() {
    if (!VoiceInput.recognition) return;

    VoiceInput.isRecording = false;
    VoiceInput.restartAttempts = VoiceInput.maxRestartAttempts;

    try {
        VoiceInput.recognition.stop();
    } catch (e) {
        console.warn('Stop recognition error:', e);
    }

    updateVoiceUI('stopped');
    hideVoiceWave();

    if (VoiceInput.transcript) {
        updateTranscriptionDisplay(VoiceInput.transcript, false);
        setVoiceStatus('Recording complete. Use the text below.', false);
    } else {
        setVoiceStatus('No speech recorded. Try again.', false);
    }
}


function disableVoiceButton() {
    const recordBtn = document.getElementById('voiceRecordBtn');
    if (recordBtn) {
        recordBtn.disabled = true;
        recordBtn.style.opacity = '0.5';
        recordBtn.style.cursor = 'not-allowed';
    }
}*/

async function stopVoiceRecording() {

    if (!VoiceInput.mediaRecorder) return;

    VoiceInput.mediaRecorder.stop();

    VoiceInput.mediaRecorder.onstop =
        async () => {

            const audioBlob =
                new Blob(
                    VoiceInput.audioChunks,
                    {
                        type: 'audio/webm'
                    }
                );

            const formData =
                new FormData();

            formData.append(
                'audio',
                audioBlob,
                'recording.webm'
            );

            setVoiceStatus(
                'Transcribing...',
                true
            );

            try {

                const response =
                    await fetch(
                        `${CONFIG.API_BASE_URL}/api/voice/transcribe`,
                        {
                            method: 'POST',
                            body: formData
                        }
                    );

                const data =
                    await response.json();

                VoiceInput.transcript =
                    data.text || '';

                updateTranscriptionDisplay(
                    VoiceInput.transcript,
                    false
                );

                setVoiceStatus(
                    'Recording complete.',
                    false
                );

            } catch (err) {

                console.error(err);

                setVoiceStatus(
                    'Transcription failed.',
                    false
                );
            }
        };

    VoiceInput.isRecording = false;

    updateVoiceUI('stopped');

    hideVoiceWave();

    if (VoiceInput.stream) {

        VoiceInput.stream
            .getTracks()
            .forEach(track => track.stop());
    }
}

/* ==================== SYNC VOICE LANGUAGE ==================== */
function syncVoiceLanguage() {
    // Get from AppState or localStorage
    let chatLang = 'en';

    if (typeof AppState !== 'undefined' && AppState.currentLanguage) {
        chatLang = AppState.currentLanguage;
    } else {
        chatLang = localStorage.getItem('chatLanguage') || 'en';
    }

    VoiceInput.selectedLanguage = VOICE_LANGUAGES[chatLang] || 'en-US';

    // Update voice language dropdown if exists
    const voiceLanguageSelect = document.getElementById('voiceLanguage');
    if (voiceLanguageSelect) {
        const langMap = {
            'en-US': 'en-US',
            'hi-IN': 'hi-IN',
            'bn-BD': 'bn-BD',
            'en-IN': 'en-IN'
        };

        const selectValue = langMap[VoiceInput.selectedLanguage];
        if (selectValue) {
            // Check if option exists
            for (let opt of voiceLanguageSelect.options) {
                if (opt.value === selectValue) {
                    voiceLanguageSelect.value = selectValue;
                    break;
                }
            }
        }
    }

    if (VoiceInput.recognition) {
        VoiceInput.recognition.lang = VoiceInput.selectedLanguage;
    }

    console.log('Voice language synced to:', VoiceInput.selectedLanguage);
}


/* ==================== LANGUAGE SELECTOR ==================== */
function initLanguageSelector() {
    const languageSelect = document.getElementById('voiceLanguage');
    if (!languageSelect) return;

    // Add more language options
    const existingOptions = new Set();
    for (let opt of languageSelect.options) {
        existingOptions.add(opt.value);
    }

    const additionalLanguages = [
        { value: 'hi-IN', text: 'Hindi' },
        { value: 'en-IN', text: 'Hinglish / Benglish' }
    ];

    additionalLanguages.forEach(lang => {
        if (!existingOptions.has(lang.value)) {
            const option = document.createElement('option');
            option.value = lang.value;
            option.textContent = lang.text;
            languageSelect.appendChild(option);
        }
    });

    languageSelect.addEventListener('change', function () {
        VoiceInput.selectedLanguage = this.value;

        if (VoiceInput.recognition) {
            VoiceInput.recognition.lang = this.value;
        }

        if (VoiceInput.isRecording) {
            stopVoiceRecording();
            setTimeout(() => startVoiceRecording(), 500);
        }
    });
}


/* ==================== TRANSCRIPTION ACTIONS ==================== */
function initTranscriptionActions() {
    const clearBtn = document.getElementById('clearTranscription');
    const useBtn = document.getElementById('useTranscription');

    if (clearBtn) {
        clearBtn.addEventListener('click', function () {
            VoiceInput.transcript = '';
            VoiceInput.interimTranscript = '';
            clearTranscriptionDisplay();
            setVoiceStatus('Transcript cleared. Click mic to record again.', false);
        });
    }

    if (useBtn) {
        useBtn.addEventListener('click', function () {
            const text = VoiceInput.transcript.trim();

            if (!text) {
                setVoiceStatus('No transcript to use. Please record first.', false);
                return;
            }

            // Put text into symptoms textarea
            const textarea = document.getElementById('symptomsText');
            if (textarea) {
                if (textarea.value.trim()) {
                    textarea.value = textarea.value.trim() + ' ' + text;
                } else {
                    textarea.value = text;
                }

                // Update character count
                const charCountEl = document.getElementById('charCount');
                if (charCountEl) {
                    charCountEl.textContent = textarea.value.length;
                }

                // Trigger input event
                textarea.dispatchEvent(new Event('input'));
            }

            // Update AppState if available
            if (typeof AppState !== 'undefined') {
                if (!AppState.inputMethods.includes('voice')) {
                    AppState.inputMethods.push('voice');
                }
                AppState.symptomData.voice = text;
            }

            // Switch to text tab
            const textTab = document.getElementById('textTab');
            const textPanel = document.getElementById('textPanel');
            const voiceTab = document.getElementById('voiceTab');
            const voicePanel = document.getElementById('voicePanel');

            if (textTab) textTab.classList.add('active');
            if (voiceTab) voiceTab.classList.remove('active');
            if (textPanel) textPanel.style.display = 'block';
            if (voicePanel) voicePanel.style.display = 'none';

            // Show success
            setVoiceStatus('Transcript added to symptoms text!', false);
            const statusText = document.getElementById('voiceStatusText');
            if (statusText) {
                statusText.style.color = '#10b981';
                setTimeout(() => {
                    statusText.style.color = '';
                    statusText.textContent = 'Click the microphone to start speaking';
                }, 2500);
            }
        });
    }
}


/* ==================== UI UPDATES ==================== */
function updateVoiceUI(state) {
    const recordBtn = document.getElementById('voiceRecordBtn');
    const btnIcon = document.getElementById('voiceBtnIcon');
    const btnLabel = document.getElementById('voiceBtnLabel');
    const voiceIconWrapper = document.getElementById('voiceIconWrapper');

    switch (state) {
        case 'recording':
            if (recordBtn) recordBtn.classList.add('recording');
            if (btnIcon) btnIcon.className = 'fas fa-stop';
            if (btnLabel) {
                btnLabel.textContent = 'Tap to Stop';
                btnLabel.classList.add('recording');
            }
            if (voiceIconWrapper) voiceIconWrapper.classList.add('recording');
            break;

        case 'stopped':
            if (recordBtn) recordBtn.classList.remove('recording');
            if (btnIcon) btnIcon.className = 'fas fa-microphone';
            if (btnLabel) {
                btnLabel.textContent = 'Tap to Speak';
                btnLabel.classList.remove('recording');
            }
            if (voiceIconWrapper) voiceIconWrapper.classList.remove('recording');
            break;
    }
}


function setVoiceStatus(message, isActive) {
    const statusText = document.getElementById('voiceStatusText');
    const voiceIconWrapper = document.getElementById('voiceIconWrapper');

    if (statusText) {
        statusText.textContent = message;
        statusText.className = isActive ? 'voice-status-text recording' : 'voice-status-text';
    }

    if (voiceIconWrapper) {
        if (isActive) {
            voiceIconWrapper.classList.add('recording');
        } else {
            voiceIconWrapper.classList.remove('recording');
        }
    }
}


function showVoiceWave() {
    const wave = document.getElementById('voiceWave');
    if (wave) wave.style.display = 'flex';
}


function hideVoiceWave() {
    const wave = document.getElementById('voiceWave');
    if (wave) wave.style.display = 'none';
}


function showVoiceWarning() {
    const warning = document.getElementById('voiceWarning');
    if (warning) warning.style.display = 'flex';
}


function hideVoiceWarning() {
    const warning = document.getElementById('voiceWarning');
    if (warning) warning.style.display = 'none';
}


/* ==================== TRANSCRIPTION DISPLAY ==================== */
function updateTranscriptionDisplay(text, hasInterim) {
    const transcriptionText = document.getElementById('transcriptionText');
    const transcriptionBox = document.getElementById('transcriptionBox');

    if (!transcriptionText) return;

    if (!text || !text.trim()) {
        transcriptionText.textContent = 'Your speech will appear here in real-time...';
        transcriptionText.className = 'transcription-text';
        if (transcriptionBox) transcriptionBox.classList.remove('active');
        return;
    }

    transcriptionText.textContent = text;
    transcriptionText.className = 'transcription-text has-text';

    if (transcriptionBox) {
        transcriptionBox.classList.toggle('active', hasInterim);
    }
}


function clearTranscriptionDisplay() {
    const transcriptionText = document.getElementById('transcriptionText');
    const transcriptionBox = document.getElementById('transcriptionBox');

    if (transcriptionText) {
        transcriptionText.textContent = 'Your speech will appear here in real-time...';
        transcriptionText.className = 'transcription-text';
    }

    if (transcriptionBox) {
        transcriptionBox.classList.remove('active');
    }
}


/* ==================== CLEANUP ==================== */
window.addEventListener('beforeunload', function () {
    if (VoiceInput.isRecording && VoiceInput.recognition) {
        try {
            VoiceInput.recognition.stop();
        } catch (e) {
            console.warn('Cleanup stop error:', e);
        }
    }
});

document.addEventListener('visibilitychange', function () {
    if (document.hidden && VoiceInput.isRecording) {
        stopVoiceRecording();
    }
});


/* ==================== GLOBAL EXPORTS ==================== */
window.VoiceInput = VoiceInput;
window.startVoiceRecording = startVoiceRecording;
window.stopVoiceRecording = stopVoiceRecording;
window.syncVoiceLanguage = syncVoiceLanguage;