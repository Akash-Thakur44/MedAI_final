/* ============================================
   RESULTS PAGE LOGIC
   ============================================ */

/* ==================== STATE ==================== */
const ResultsState = {
    currentUser: null,
    token: null,
    resultsData: null,
    isLoading: true
};


/* ==================== INIT ==================== */
document.addEventListener('DOMContentLoaded', function () {
    const path = window.location.pathname;
    if (path.includes('results.html')) {
        initResultsPage();
    }
});


async function initResultsPage() {
    if (!checkResultsAuth()) return;

    initResultsSidebar();
    initResultsTopbar();
    initResultsLogout();
    startLoadingAnimation();

    await loadResultsData();
}


/* ==================== AUTH CHECK ==================== */
function checkResultsAuth() {
    const token = localStorage.getItem(CONFIG.USER_TOKEN_KEY);
    const userData = localStorage.getItem(CONFIG.USER_DATA_KEY);

    if (!token || !userData) {
        window.location.href = 'login.html';
        return false;
    }

    try {
        ResultsState.token = token;
        ResultsState.currentUser = JSON.parse(userData);
        return true;
    } catch (e) {
        window.location.href = 'login.html';
        return false;
    }
}


/* ==================== SIDEBAR ==================== */
function initResultsSidebar() {
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


/* ==================== TOPBAR ==================== */
function initResultsTopbar() {
    const user = ResultsState.currentUser;

    const printBtn = document.getElementById('printResultsBtn');
    const downloadBtn = document.getElementById('downloadResultsBtn');
    const shareBtn = document.getElementById('shareResultsBtn');

    if (printBtn) printBtn.addEventListener('click', handlePrintResults);
    if (downloadBtn) downloadBtn.addEventListener('click', handleDownloadResults);
    if (shareBtn) shareBtn.addEventListener('click', openShareModal);
}


/* ==================== LOGOUT ==================== */
function initResultsLogout() {
    const logoutBtns = document.querySelectorAll('#logoutBtn, .logout-link');
    logoutBtns.forEach(btn => {
        btn.addEventListener('click', async function (e) {
            e.preventDefault();
            try {
                await API.auth.logout();
            } catch (err) {
                console.warn('Logout error:', err);
            }
            localStorage.removeItem(CONFIG.USER_TOKEN_KEY);
            localStorage.removeItem(CONFIG.USER_DATA_KEY);
            window.location.href = 'login.html';
        });
    });
}


/* ==================== LOADING ANIMATION ==================== */
function startLoadingAnimation() {
    showSection('resultsLoading');
    hideSection('resultsData');
    hideSection('resultsError');
    hideSection('resultsEmpty');

    const steps = [
        { id: 'loadStep1', delay: 0 },
        { id: 'loadStep2', delay: 800 },
        { id: 'loadStep3', delay: 1600 },
        { id: 'loadStep4', delay: 2400 }
    ];

    steps.forEach(step => {
        setTimeout(() => {
            const el = document.getElementById(step.id);
            if (el) {
                el.classList.add('active');
                const icon = el.querySelector('i');
                if (icon) icon.className = 'fas fa-check-circle';
                el.classList.add('done');
            }
        }, step.delay);
    });
}


/* ==================== LOAD RESULTS ==================== */
async function loadResultsData() {
    await new Promise(resolve => setTimeout(resolve, 3000));

    try {
        const storedResults = localStorage.getItem(CONFIG.RESULTS_KEY);

        if (!storedResults) {
            showSection('resultsEmpty');
            hideSection('resultsLoading');
            return;
        }

        const results = JSON.parse(storedResults);

        if (!results || !results.diagnosis) {
            showSection('resultsEmpty');
            hideSection('resultsLoading');
            return;
        }

        ResultsState.resultsData = results;

        hideSection('resultsLoading');
        showSection('resultsData');

        renderResults(results);

    } catch (error) {
        console.error('Results load error:', error);
        hideSection('resultsLoading');
        showResultsError('Failed to load results. Please try again.');
    }
}


/* ==================== RENDER ALL RESULTS ==================== */
function renderResults(results) {
    renderDisclaimer();
    renderReportHeader(results);
    renderSeveritySection(results.diagnosis);
    renderDiagnosisCards(results.diagnosis);
    renderDetailedExplanation(results.diagnosis);
    renderCauses(results.diagnosis);
    renderDuration(results.diagnosis);
    renderWarningSigns(results.diagnosis);
    renderHomeRemedies(results.diagnosis);
    renderDietRecommendations(results.diagnosis);
    renderLifestyleChanges(results.diagnosis);
    renderSymptomsSummary(results);
    renderFAQs(results.diagnosis);
    renderPrecautions(results.diagnosis);
    renderDoctors(results.recommended_doctors);
    renderConfidenceBars(results.diagnosis);
    checkAndShowEmergency(results.diagnosis);
    initResultsActions(results);
}


/* ==================== DISCLAIMER ==================== */
function renderDisclaimer() {
    const dismissBtn = document.getElementById('dismissDisclaimer');
    const banner = document.querySelector('.disclaimer-banner');

    if (dismissBtn && banner) {
        dismissBtn.addEventListener('click', () => {
            banner.style.display = 'none';
        });
    }
}


/* ==================== REPORT HEADER ==================== */
function renderReportHeader(results) {
    const user = ResultsState.currentUser;
    const patient = results.patient || {};

    const reportDate = document.getElementById('reportDate');
    const reportId = document.getElementById('reportId');
    const patientName = document.getElementById('patientName');
    const patientInfo = document.getElementById('patientInfo');

    if (reportDate) {
        reportDate.innerHTML = `<i class="fas fa-calendar"></i> ${formatResultDate(results.timestamp)}`;
    }

    if (reportId) {
        const shortId = results.log_id
            ? results.log_id.substring(0, 8).toUpperCase()
            : 'N/A';
        reportId.innerHTML = `<i class="fas fa-hashtag"></i> ${shortId}`;
    }

    if (patientName) {
        patientName.textContent = user?.name || 'Patient';
    }

    if (patientInfo) {
        const age = patient.age || user?.age || '--';
        const gender = patient.gender || user?.gender || '--';
        patientInfo.textContent = `${age} years | ${capitalizeFirst(gender)}`;
    }
}


/* ==================== SEVERITY SECTION ==================== */
function renderSeveritySection(diagnosis) {
    if (!diagnosis) return;

    const severity = diagnosis.severity || 'Low';
    const severityBadge = document.getElementById('severityBadge');
    const gaugeFill = document.getElementById('gaugeFill');
    const gaugePointer = document.getElementById('gaugePointer');
    const severityAction = document.getElementById('severityAction');
    const severityActionText = document.getElementById('severityActionText');

    if (severityBadge) {
        severityBadge.textContent = severity;
        severityBadge.className = `severity-badge badge-${severity.toLowerCase()}`;
    }

    const positions = CONFIG.SEVERITY_POSITIONS;
    const position = positions[severity] || '12%';

    if (gaugePointer) {
        setTimeout(() => {
            gaugePointer.style.left = position;
        }, 500);
    }

    const actions = {
        Low: 'Rest at home and monitor your symptoms. Consider seeing a doctor if symptoms persist for more than 3 days.',
        Medium: 'Schedule an appointment with a doctor within the next few days. Monitor your symptoms closely.',
        High: 'See a doctor as soon as possible, preferably within 24-48 hours. Do not delay medical attention.',
        Critical: 'Seek immediate medical attention. Go to the nearest hospital or call emergency services now.'
    };

    if (severityActionText) {
        severityActionText.textContent = actions[severity] || actions['Low'];
    }

    if (severityAction) {
        const iconMap = {
            Low: 'info-circle',
            Medium: 'exclamation-circle',
            High: 'exclamation-triangle',
            Critical: 'ambulance'
        };

        const icon = severityAction.querySelector('i');
        if (icon) {
            icon.className = `fas fa-${iconMap[severity] || 'info-circle'}`;
        }
    }
}


/* ==================== DIAGNOSIS CARDS ==================== */
function renderDiagnosisCards(diagnosis) {
    const container = document.getElementById('diagnosisCards');
    if (!container || !diagnosis) return;

    const diseases = diagnosis.probable_diseases || [];

    if (diseases.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #64748b;">
                <p>No specific conditions identified</p>
            </div>
        `;
        return;
    }

    container.innerHTML = diseases.map((disease, index) => {
        const rank = index + 1;
        const confidence = Math.round((disease.confidence || 0) * 100);
        const rankClass = `rank-${Math.min(rank, 3)}`;

        return `
            <div class="diagnosis-card ${rankClass}">
                <div class="diagnosis-card-header">
                    <div class="diagnosis-card-left">
                        <div class="diagnosis-rank">#${rank}</div>
                        <div class="diagnosis-info">
                            <div class="diagnosis-disease-name">
                                ${escapeResultHtml(disease.name || 'Unknown')}
                            </div>
                            <p class="diagnosis-description">
                                ${escapeResultHtml(disease.description || '')}
                            </p>
                        </div>
                    </div>
                    <div class="diagnosis-confidence">
                        <span class="confidence-percent">${confidence}%</span>
                        <span class="confidence-label">match</span>
                        <div class="confidence-mini-bar">
                            <div class="confidence-mini-fill"
                                 style="width: 0%;"
                                 data-width="${confidence}%">
                            </div>
                        </div>
                    </div>
                </div>
                ${disease.tags && disease.tags.length > 0 ? `
                    <div class="diagnosis-tags">
                        ${disease.tags.map(tag => `
                            <span class="diagnosis-tag">
                                <i class="fas fa-tag"></i> ${escapeResultHtml(tag)}
                            </span>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');

    setTimeout(() => {
        container.querySelectorAll('.confidence-mini-fill').forEach(bar => {
            const width = bar.dataset.width;
            bar.style.width = width;
        });
    }, 600);
}


/* ==================== DETAILED EXPLANATION ==================== */
function renderDetailedExplanation(diagnosis) {
    const section = document.getElementById('aboutConditionSection');
    const container = document.getElementById('detailedExplanation');

    if (!diagnosis || !container || !section) return;

    const explanation = diagnosis.detailed_explanation;

    if (!explanation || explanation.trim() === '') {
        section.style.display = 'none';
        return;
    }

    section.style.display = '';

    const paragraphs = explanation.split('\n').filter(p => p.trim());

    container.innerHTML = paragraphs.map(p =>
        `<p>${escapeResultHtml(p.trim())}</p>`
    ).join('');
}


/* ==================== CAUSES ==================== */
function renderCauses(diagnosis) {
    const section = document.getElementById('causesSection');
    const container = document.getElementById('causesList');

    if (!diagnosis || !container || !section) return;

    const causes = diagnosis.causes || [];

    if (!causes || causes.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = '';

    container.innerHTML = causes.map((cause, index) => `
        <div class="cause-item">
            <div class="cause-number">${index + 1}</div>
            <div class="cause-text">${escapeResultHtml(cause)}</div>
        </div>
    `).join('');
}


/* ==================== DURATION & RECOVERY ==================== */
function renderDuration(diagnosis) {
    const section = document.getElementById('durationSection');

    if (!diagnosis || !section) return;

    const durationInfo = diagnosis.duration_info || {};

    const hasData = durationInfo.typical_duration ||
                    durationInfo.recovery_time ||
                    durationInfo.improvement_expected;

    if (!hasData) {
        section.style.display = 'none';
        return;
    }

    section.style.display = '';

    const typical = document.getElementById('typicalDuration');
    const recovery = document.getElementById('recoveryTime');
    const improvement = document.getElementById('improvementExpected');
    const details = document.getElementById('durationDetails');

    if (typical) typical.textContent = durationInfo.typical_duration || '--';
    if (recovery) recovery.textContent = durationInfo.recovery_time || '--';
    if (improvement) improvement.textContent = durationInfo.improvement_expected || '--';

    if (details && durationInfo.details) {
        details.innerHTML = `
            <i class="fas fa-info-circle"></i>
            <p>${escapeResultHtml(durationInfo.details)}</p>
        `;
    }
}


/* ==================== WARNING SIGNS ==================== */
function renderWarningSigns(diagnosis) {
    const section = document.getElementById('warningSignsSection');
    const container = document.getElementById('warningSignsList');

    if (!diagnosis || !container || !section) return;

    const warnings = diagnosis.warning_signs || [];

    if (!warnings || warnings.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = '';

    container.innerHTML = warnings.map(warning => `
        <div class="warning-item">
            <i class="fas fa-exclamation-circle"></i>
            <span>${escapeResultHtml(warning)}</span>
        </div>
    `).join('');
}


/* ==================== HOME REMEDIES ==================== */
function renderHomeRemedies(diagnosis) {
    const section = document.getElementById('remediesSection');
    const container = document.getElementById('remediesGrid');

    if (!diagnosis || !container || !section) return;

    const remedies = diagnosis.home_remedies || [];

    if (!remedies || remedies.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = '';

    container.innerHTML = remedies.map((remedy, index) => {
        if (typeof remedy === 'string') {
            return `
                <div class="remedy-card">
                    <div class="remedy-number">${index + 1}</div>
                    <div class="remedy-content">
                        <p>${escapeResultHtml(remedy)}</p>
                    </div>
                </div>
            `;
        }

        const name = remedy.name || `Remedy ${index + 1}`;
        const instructions = remedy.instructions || '';
        const frequency = remedy.frequency || '';
        const benefits = remedy.benefits || '';

        return `
            <div class="remedy-card">
                <div class="remedy-number">${index + 1}</div>
                <div class="remedy-content">
                    <h4 class="remedy-name">${escapeResultHtml(name)}</h4>
                    ${instructions ? `
                        <div class="remedy-section">
                            <strong><i class="fas fa-list-ol"></i> Instructions:</strong>
                            <p>${escapeResultHtml(instructions)}</p>
                        </div>
                    ` : ''}
                    ${frequency ? `
                        <div class="remedy-section">
                            <strong><i class="fas fa-clock"></i> Frequency:</strong>
                            <p>${escapeResultHtml(frequency)}</p>
                        </div>
                    ` : ''}
                    ${benefits ? `
                        <div class="remedy-section">
                            <strong><i class="fas fa-star"></i> Benefits:</strong>
                            <p>${escapeResultHtml(benefits)}</p>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}


/* ==================== DIET RECOMMENDATIONS ==================== */
function renderDietRecommendations(diagnosis) {
    const section = document.getElementById('dietSection');

    if (!diagnosis || !section) return;

    const diet = diagnosis.diet_recommendations || {};
    const foodsToEat = diet.foods_to_eat || [];
    const foodsToAvoid = diet.foods_to_avoid || [];

    if (foodsToEat.length === 0 && foodsToAvoid.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = '';

    const eatList = document.getElementById('foodsToEat');
    if (eatList) {
        if (foodsToEat.length > 0) {
            eatList.innerHTML = foodsToEat.map(food => `
                <li><i class="fas fa-check"></i> ${escapeResultHtml(food)}</li>
            `).join('');
        } else {
            eatList.innerHTML = '<li>No specific recommendations</li>';
        }
    }

    const avoidList = document.getElementById('foodsToAvoid');
    if (avoidList) {
        if (foodsToAvoid.length > 0) {
            avoidList.innerHTML = foodsToAvoid.map(food => `
                <li><i class="fas fa-times"></i> ${escapeResultHtml(food)}</li>
            `).join('');
        } else {
            avoidList.innerHTML = '<li>No specific restrictions</li>';
        }
    }

    const hydration = document.getElementById('hydrationInfo');
    if (hydration) {
        hydration.textContent = diet.hydration || 'Drink 8-10 glasses of water daily';
    }

    const mealPattern = document.getElementById('mealPattern');
    if (mealPattern) {
        mealPattern.textContent = diet.meal_pattern || 'Eat regular balanced meals';
    }
}


/* ==================== LIFESTYLE CHANGES ==================== */
function renderLifestyleChanges(diagnosis) {
    const section = document.getElementById('lifestyleSection');

    if (!diagnosis || !section) return;

    const lifestyle = diagnosis.lifestyle_changes || {};
    const activitiesDo = lifestyle.activities_to_do || [];
    const activitiesAvoid = lifestyle.activities_to_avoid || [];

    if (activitiesDo.length === 0 && activitiesAvoid.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = '';

    const doList = document.getElementById('activitiesToDo');
    if (doList) {
        if (activitiesDo.length > 0) {
            doList.innerHTML = activitiesDo.map(activity => `
                <li><i class="fas fa-check"></i> ${escapeResultHtml(activity)}</li>
            `).join('');
        } else {
            doList.innerHTML = '<li>No specific recommendations</li>';
        }
    }

    const avoidList = document.getElementById('activitiesToAvoid');
    if (avoidList) {
        if (activitiesAvoid.length > 0) {
            avoidList.innerHTML = activitiesAvoid.map(activity => `
                <li><i class="fas fa-times"></i> ${escapeResultHtml(activity)}</li>
            `).join('');
        } else {
            avoidList.innerHTML = '<li>No specific restrictions</li>';
        }
    }

    const sleep = document.getElementById('sleepRecommendation');
    if (sleep) {
        sleep.textContent = lifestyle.sleep_recommendations || 'Get 7-8 hours of quality sleep';
    }

    const exercise = document.getElementById('exerciseRecommendation');
    if (exercise) {
        exercise.textContent = lifestyle.exercise || 'Light activity as tolerated';
    }
}


/* ==================== FAQS ==================== */
function renderFAQs(diagnosis) {
    const section = document.getElementById('faqsSection');
    const container = document.getElementById('faqsContainer');

    if (!diagnosis || !container || !section) return;

    const faqs = diagnosis.faqs || [];

    if (!faqs || faqs.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = '';

    container.innerHTML = faqs.map((faq, index) => {
        const question = faq.question || `Question ${index + 1}`;
        const answer = faq.answer || 'No answer provided';

        return `
            <div class="faq-item" data-faq-index="${index}">
                <button class="faq-question" onclick="toggleFAQ(${index})">
                    <span class="faq-q-text">
                        <i class="fas fa-question-circle"></i>
                        ${escapeResultHtml(question)}
                    </span>
                    <i class="fas fa-chevron-down faq-toggle-icon"></i>
                </button>
                <div class="faq-answer" id="faqAnswer${index}">
                    <p>${escapeResultHtml(answer)}</p>
                </div>
            </div>
        `;
    }).join('');
}


/* ==================== TOGGLE FAQ ==================== */
function toggleFAQ(index) {
    const faqItem = document.querySelector(`[data-faq-index="${index}"]`);
    const answer = document.getElementById(`faqAnswer${index}`);

    if (!faqItem || !answer) return;

    faqItem.classList.toggle('open');

    if (faqItem.classList.contains('open')) {
        answer.style.maxHeight = answer.scrollHeight + 'px';
    } else {
        answer.style.maxHeight = '0';
    }
}


/* ==================== SYMPTOMS SUMMARY ==================== */
function renderSymptomsSummary(results) {
    const symptomsText = document.getElementById('symptomsTextDisplay');
    const inputMethodBadges = document.getElementById('inputMethodBadges');
    const uploadedImagesBlock = document.getElementById('uploadedImagesBlock');
    const uploadedImagesGrid = document.getElementById('uploadedImagesGrid');

    if (symptomsText) {
        symptomsText.textContent = results.symptoms_text || 'No symptoms recorded';
    }

    if (inputMethodBadges) {
        const methods = results.input_methods || ['text'];
        const badgeColors = {
            text: 'badge-text',
            voice: 'badge-voice',
            image: 'badge-image',
            combined: 'badge-text'
        };

        const icons = {
            text: 'keyboard',
            voice: 'microphone',
            image: 'camera',
            combined: 'layer-group'
        };

        inputMethodBadges.innerHTML = methods.map(method => `
            <span class="input-method-badge ${badgeColors[method] || 'badge-text'}">
                <i class="fas fa-${icons[method] || 'keyboard'}"></i>
                ${capitalizeFirst(method)} Input
            </span>
        `).join('');
    }

    const images = results.images || [];
    if (images.length > 0) {
        if (uploadedImagesBlock) uploadedImagesBlock.style.display = '';

        if (uploadedImagesGrid) {
            uploadedImagesGrid.innerHTML = images.map(img => `
                <div class="uploaded-image-item"
                     onclick="openResultImagePreview('${img.preview}', '${img.type}')">
                    <img src="${img.preview}" alt="${img.type}">
                    <div class="uploaded-image-type">
                        ${capitalizeFirst(img.type || 'image')}
                    </div>
                </div>
            `).join('');
        }
    } else {
        if (uploadedImagesBlock) uploadedImagesBlock.style.display = 'none';
    }
}


/* ==================== PRECAUTIONS ==================== */
function renderPrecautions(diagnosis) {
    const dosList = document.getElementById('dosList');
    const dontsList = document.getElementById('dontsList');

    if (!diagnosis) return;

    const precautions = diagnosis.precautions || {};
    const dos = precautions.dos || diagnosis.dos || [];
    const donts = precautions.donts || diagnosis.donts || [];

    const defaultDos = [
        'Rest and get adequate sleep',
        'Stay well hydrated - drink plenty of water',
        'Follow prescribed medications if any',
        'Monitor your symptoms regularly',
        'Consult a doctor for proper diagnosis'
    ];

    const defaultDonts = [
        'Do not self-medicate without doctor advice',
        'Avoid strenuous physical activity',
        'Do not ignore worsening symptoms',
        'Avoid alcohol and smoking',
        'Do not delay seeking medical help'
    ];

    if (dosList) {
        const doItems = dos.length > 0 ? dos : defaultDos;
        dosList.innerHTML = doItems.map(item => `
            <li>${escapeResultHtml(item)}</li>
        `).join('');
    }

    if (dontsList) {
        const dontItems = donts.length > 0 ? donts : defaultDonts;
        dontsList.innerHTML = dontItems.map(item => `
            <li>${escapeResultHtml(item)}</li>
        `).join('');
    }
}


/* ==================== DOCTORS SECTION ==================== */
function renderDoctors(doctors) {
    const container = document.getElementById('doctorsResultsGrid');
    const specialistType = document.getElementById('specialistType');

    if (!container) return;

    if (specialistType && ResultsState.resultsData?.diagnosis?.specialist_type) {
        specialistType.textContent = `Suggested Specialist: ${ResultsState.resultsData.diagnosis.specialist_type}`;
    }

    if (!doctors || doctors.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 24px; color: #64748b; grid-column: 1/-1;">
                <i class="fas fa-user-md" style="font-size: 2rem; margin-bottom: 8px; display: block;"></i>
                <p>No doctors available at this time</p>
            </div>
        `;
        return;
    }

    container.innerHTML = doctors.map(doctor => `
        <div class="doctor-result-card">
            <div class="doctor-result-avatar">
                <i class="fas fa-user-md"></i>
            </div>
            <div class="doctor-result-info">
                <div class="doctor-result-name">
                    ${escapeResultHtml(doctor.name)}
                </div>
                <div class="doctor-result-specialty">
                    ${escapeResultHtml(doctor.specialty)}
                </div>
                <div class="doctor-result-meta">
                    <span class="doctor-result-meta-item">
                        <i class="fas fa-map-marker-alt"></i>
                        ${doctor.location || '--'}
                    </span>
                    <span class="doctor-result-meta-item doctor-result-rating">
                        <i class="fas fa-star"></i>
                        ${doctor.rating || 'N/A'}
                    </span>
                    <span class="doctor-result-meta-item">
                        <i class="fas fa-briefcase-medical"></i>
                        ${doctor.experience_years ? `${doctor.experience_years} yrs` : '--'}
                    </span>
                </div>
            </div>
            <div class="doctor-result-actions">
                ${doctor.contact ? `
                    <a href="tel:${doctor.contact}"
                       class="btn btn-primary btn-sm">
                        <i class="fas fa-phone"></i>
                    </a>
                ` : ''}
                <button class="btn btn-outline btn-sm"
                    onclick="navigator.clipboard?.writeText('${escapeResultHtml(doctor.contact || '')}')">
                    <i class="fas fa-copy"></i>
                </button>
            </div>
        </div>
    `).join('');
}


/* ==================== CONFIDENCE BARS ==================== */
function renderConfidenceBars(diagnosis) {
    const container = document.getElementById('confidenceBars');
    if (!container || !diagnosis) return;

    const diseases = diagnosis.probable_diseases || [];

    if (diseases.length === 0) {
        container.innerHTML = '<p style="color: #64748b; font-size: 0.875rem;">No confidence data available</p>';
        return;
    }

    const rankClasses = ['bar-rank-1', 'bar-rank-2', 'bar-rank-3'];

    container.innerHTML = diseases.map((disease, index) => {
        const confidence = Math.round((disease.confidence || 0) * 100);
        const rankClass = rankClasses[Math.min(index, 2)];

        return `
            <div class="confidence-bar-item">
                <span class="confidence-bar-label">
                    ${escapeResultHtml(disease.name || `Condition ${index + 1}`)}
                </span>
                <div class="confidence-bar-track">
                    <div class="confidence-bar-fill ${rankClass}"
                         style="width: 0%;"
                         data-width="${confidence}%">
                    </div>
                </div>
                <span class="confidence-bar-percent">${confidence}%</span>
            </div>
        `;
    }).join('');

    setTimeout(() => {
        container.querySelectorAll('.confidence-bar-fill').forEach(bar => {
            bar.style.width = bar.dataset.width;
        });
    }, 800);
}


/* ==================== EMERGENCY CHECK ==================== */
function checkAndShowEmergency(diagnosis) {
    if (!diagnosis) return;

    const severity = diagnosis.severity;
    const emergencySection = document.getElementById('emergencySection');

    if (severity === CONFIG.SEVERITY.CRITICAL) {
        if (emergencySection) emergencySection.style.display = '';
        return;
    }

    const symptomsText = ResultsState.resultsData?.symptoms_text?.toLowerCase() || '';
    const hasEmergencyKeyword = CONFIG.EMERGENCY_KEYWORDS.some(keyword =>
        symptomsText.includes(keyword.toLowerCase())
    );

    if (hasEmergencyKeyword) {
        if (emergencySection) emergencySection.style.display = '';
    }
}


/* ==================== RESULTS ACTIONS ==================== */
function initResultsActions(results) {
    initShareModal(results);
    initImagePreviewModal();
}


/* ==================== SHARE MODAL ==================== */
function initShareModal(results) {
    const shareModal = document.getElementById('shareModal');
    const shareClose = document.getElementById('shareModalClose');
    const copyLinkBtn = document.getElementById('copyLinkBtn');
    const sendEmailBtn = document.getElementById('sendEmailBtn');
    const downloadPdfBtn = document.getElementById('downloadPdfBtn');
    const shareLink = document.getElementById('shareLink');

    if (shareClose) {
        shareClose.addEventListener('click', () => {
            if (shareModal) shareModal.style.display = 'none';
        });
    }

    if (shareLink) {
        shareLink.value = window.location.href;
    }

    if (copyLinkBtn) {
        copyLinkBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(window.location.href);
                showShareSuccess('Link copied to clipboard!');
            } catch (e) {
                shareLink.select();
                document.execCommand('copy');
                showShareSuccess('Link copied!');
            }
        });
    }

    if (sendEmailBtn) {
        sendEmailBtn.addEventListener('click', () => {
            const email = document.getElementById('shareEmail')?.value?.trim();
            if (!email) {
                alert('Please enter an email address');
                return;
            }
            const subject = encodeURIComponent('My MedAI Health Analysis Results');
            const body = encodeURIComponent(
                `Please find my health analysis results at: ${window.location.href}`
            );
            window.open(`mailto:${email}?subject=${subject}&body=${body}`);
            showShareSuccess('Email client opened!');
        });
    }

    if (downloadPdfBtn) {
        downloadPdfBtn.addEventListener('click', handleDownloadResults);
    }
}


function openShareModal() {
    const modal = document.getElementById('shareModal');
    if (modal) modal.style.display = 'flex';

    const shareSuccess = document.getElementById('shareSuccess');
    if (shareSuccess) shareSuccess.style.display = 'none';
}


function showShareSuccess(message) {
    const successEl = document.getElementById('shareSuccess');
    const successMsg = document.getElementById('shareSuccessMessage');

    if (successEl && successMsg) {
        successMsg.textContent = message;
        successEl.style.display = 'flex';

        setTimeout(() => {
            successEl.style.display = 'none';
        }, 3000);
    }
}


/* ==================== IMAGE PREVIEW MODAL ==================== */
function initImagePreviewModal() {
    const closeBtn = document.getElementById('imagePreviewClose');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            const modal = document.getElementById('imagePreviewModal');
            if (modal) modal.style.display = 'none';
        });
    }
}


function openResultImagePreview(src, type) {
    const modal = document.getElementById('imagePreviewModal');
    const previewImg = document.getElementById('previewImage');
    const previewType = document.getElementById('previewImageType');
    const previewDate = document.getElementById('previewImageDate');

    if (!modal) return;

    if (previewImg) previewImg.src = src;
    if (previewType) previewType.textContent = capitalizeFirst(type || 'image');
    if (previewDate) previewDate.textContent = formatResultDate(new Date().toISOString());

    modal.style.display = 'flex';
}


/* ==================== PRINT RESULTS ==================== */
function handlePrintResults() {
    window.print();
}


/* ==================== DOWNLOAD RESULTS ==================== */
function handleDownloadResults() {
    const results = ResultsState.resultsData;
    if (!results) return;

    const user = ResultsState.currentUser;
    const diagnosis = results.diagnosis || {};
    const diseases = diagnosis.probable_diseases || [];

    let content = `
MEDAI HEALTH ANALYSIS REPORT
==============================

Date: ${formatResultDate(results.timestamp)}
Patient: ${user?.name || 'N/A'}
Age: ${results.patient?.age || user?.age || 'N/A'}
Gender: ${capitalizeFirst(results.patient?.gender || user?.gender || 'N/A')}

SYMPTOMS REPORTED
-----------------
${results.symptoms_text || 'Not provided'}

AI ANALYSIS RESULTS
--------------------
Primary Condition: ${diagnosis.primary_disease || 'N/A'}
Severity Level: ${diagnosis.severity || 'N/A'}
Specialist Recommended: ${diagnosis.specialist_type || 'General Physician'}

PROBABLE CONDITIONS
-------------------
${diseases.map((d, i) => `${i + 1}. ${d.name} (${Math.round((d.confidence || 0) * 100)}% match)`).join('\n')}

DETAILED EXPLANATION
--------------------
${diagnosis.detailed_explanation || 'Not available'}

CAUSES
------
${(diagnosis.causes || []).map((c, i) => `${i + 1}. ${c}`).join('\n') || 'Not available'}

WARNING SIGNS
-------------
${(diagnosis.warning_signs || []).map(w => `- ${w}`).join('\n') || 'Not available'}

RECOMMENDED PRECAUTIONS
------------------------
DO:
${(diagnosis.precautions?.dos || []).map(d => `- ${d}`).join('\n') || '- Follow doctor advice'}

AVOID:
${(diagnosis.precautions?.donts || []).map(d => `- ${d}`).join('\n') || '- Self medication'}

DISCLAIMER
----------
This report is generated by AI for educational purposes only.
It is NOT a medical diagnosis. Please consult a qualified
healthcare professional for proper medical advice.

Report Generated: ${new Date().toLocaleString()}
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `medai-report-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
}


/* ==================== ERROR DISPLAY ==================== */
function showResultsError(message) {
    hideSection('resultsLoading');
    hideSection('resultsData');
    hideSection('resultsEmpty');
    showSection('resultsError');

    const errorMsg = document.getElementById('errorMessage');
    if (errorMsg) errorMsg.textContent = message;
}


/* ==================== SHOW/HIDE SECTIONS ==================== */
function showSection(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = '';
}


function hideSection(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
}


/* ==================== UTILITY FUNCTIONS ==================== */
function formatResultDate(dateStr) {
    if (!dateStr) return '--';
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return '--';
    }
}


function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}


function escapeResultHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}