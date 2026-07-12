/* ============================================
   ADMIN PANEL JAVASCRIPT
   ============================================ */

/* ==================== STATE ==================== */
const AdminState = {
    currentAdmin: null,
    token: null,
    currentPage: 1,
    itemsPerPage: 10,
    doctors: [],
    users: [],
    filteredDoctors: [],
    filteredUsers: [],
    editingDoctorId: null,
    editingUserId: null,
    deletingDoctorId: null,
    deletingUserId: null
};


/* ==================== INIT ==================== */
document.addEventListener('DOMContentLoaded', function () {
    detectAdminPage();
});


function detectAdminPage() {
    const path = window.location.pathname;

    if (path.includes('admin-login')) {
        initAdminLoginPage();
    } else if (path.includes('admin-dashboard')) {
        initAdminDashboardPage();
    } else if (path.includes('manage-doctors')) {
        initManageDoctorsPage();
    } else if (path.includes('manage-users')) {
        initManageUsersPage();
    }
}


/* ==================== AUTH CHECK ==================== */
function checkAdminAuth() {
    const token = localStorage.getItem('adminToken');
    const adminData = localStorage.getItem('adminData');

    if (!token || !adminData) {
        window.location.href = 'admin-login.html';
        return false;
    }

    try {
        AdminState.token = token;
        AdminState.currentAdmin = JSON.parse(adminData);

        const nameEl = document.getElementById('adminName');
        if (nameEl) {
            nameEl.textContent = AdminState.currentAdmin.name || 'Admin';
        }

        return true;
    } catch (e) {
        window.location.href = 'admin-login.html';
        return false;
    }
}


/* ============================================
   ADMIN LOGIN PAGE
   ============================================ */
function initAdminLoginPage() {
    const existingToken = localStorage.getItem('adminToken');
    if (existingToken) {
        window.location.href = 'admin-dashboard.html';
        return;
    }

    const form = document.getElementById('adminLoginForm');
    const toggleBtn = document.getElementById('toggleAdminPassword');
    const passwordInput = document.getElementById('adminPassword');

    if (form) {
        form.addEventListener('submit', handleAdminLogin);
    }

    if (toggleBtn && passwordInput) {
        toggleBtn.addEventListener('click', function () {
            const type = passwordInput.type === 'password' ? 'text' : 'password';
            passwordInput.type = type;
            const icon = toggleBtn.querySelector('i');
            icon.className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
        });
    }
}


async function handleAdminLogin(e) {
    e.preventDefault();

    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value;
    const loginBtn = document.getElementById('adminLoginBtn');
    const alertEl = document.getElementById('adminLoginAlert');
    const alertMsg = document.getElementById('adminLoginAlertMessage');
    const successEl = document.getElementById('adminLoginSuccess');
    const successMsg = document.getElementById('adminLoginSuccessMessage');

    hideElement(alertEl);
    hideElement(successEl);

    if (!email || !password) {
        showAdminAlert(alertEl, alertMsg, 'Please enter email and password');
        return;
    }

    if (!isValidEmail(email)) {
        showAdminAlert(alertEl, alertMsg, 'Please enter a valid email address');
        return;
    }

    setButtonLoading(loginBtn, true);

    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/api/auth/admin-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            localStorage.setItem('adminToken', data.token);
            localStorage.setItem('adminData', JSON.stringify(data.user));

            showAdminSuccess(successEl, successMsg, 'Login successful! Redirecting...');

            setTimeout(() => {
                window.location.href = 'admin-dashboard.html';
            }, 1200);
        } else {
            showAdminAlert(alertEl, alertMsg, data.message || 'Invalid credentials');
        }
    } catch (error) {
        showAdminAlert(alertEl, alertMsg, 'Connection error. Please try again.');
    } finally {
        setButtonLoading(loginBtn, false);
    }
}


/* ============================================
   ADMIN DASHBOARD PAGE
   ============================================ */
function initAdminDashboardPage() {
    if (!checkAdminAuth()) return;

    initAdminSidebar();
    loadDashboardStats();
    loadRecentDiagnoses();
    loadRecentActivity();
    setCurrentDate('adminCurrentDate');
    setAdminGreeting();
    initSystemStatus();
    initDashboardModals();
    initAdminLogout();
}


async function loadDashboardStats() {
    try {
        const response = await adminFetch('/api/admin/stats');
        const data = await response.json();

        if (response.ok && data.success) {
            const stats = data.stats;

            setTextContent('statTotalUsers', stats.total_users || 0);
            setTextContent('statTotalDoctors', stats.total_doctors || 0);
            setTextContent('statTotalDiagnoses', stats.total_diagnoses || 0);
            setTextContent('statCriticalCases', stats.critical_cases || 0);

            setTextContent('totalUsersBadge', stats.total_users || 0);
            setTextContent('totalDoctorsBadge', stats.total_doctors || 0);

            if (stats.severity_distribution) {
                renderSeverityChart(stats.severity_distribution);
            }

            if (stats.specialty_distribution) {
                renderSpecialtyChart(stats.specialty_distribution);
            }
        }
    } catch (error) {
        console.error('Stats load error:', error);
    }
}


function renderSeverityChart(distribution) {
    const total = Object.values(distribution).reduce((a, b) => a + b, 0);

    const severities = ['Low', 'Medium', 'High', 'Critical'];
    severities.forEach(sev => {
        const count = distribution[sev] || 0;
        const percent = total > 0 ? (count / total * 100).toFixed(0) : 0;

        const barEl = document.getElementById(`severity${sev}Bar`);
        const countEl = document.getElementById(`severity${sev}Count`);

        if (barEl) {
            setTimeout(() => {
                barEl.style.width = `${percent}%`;
            }, 300);
        }

        if (countEl) countEl.textContent = count;
    });
}


function renderSpecialtyChart(distribution) {
    const specialties = [
        { key: 'General', id: 'specialtyGeneral' },
        { key: 'Dermatologist', id: 'specialtyDerma' },
        { key: 'Ophthalmologist', id: 'specialtyEye' },
        { key: 'ENT Specialist', id: 'specialtyENT' }
    ];

    const total = Object.values(distribution).reduce((a, b) => a + b, 0);

    specialties.forEach(spec => {
        const count = distribution[spec.key] || 0;
        const percent = total > 0 ? (count / total * 100).toFixed(0) : 0;

        const barEl = document.getElementById(`${spec.id}Bar`);
        const countEl = document.getElementById(`${spec.id}Count`);

        if (barEl) {
            setTimeout(() => {
                barEl.style.width = `${percent}%`;
            }, 300);
        }

        if (countEl) countEl.textContent = count;
    });
}


async function loadRecentDiagnoses() {
    const loadingEl = document.getElementById('diagnosesLoading');
    const emptyEl = document.getElementById('diagnosesEmpty');
    const tableWrapper = document.getElementById('diagnosesTableWrapper');
    const tbody = document.getElementById('diagnosesTableBody');

    try {
        const response = await adminFetch('/api/admin/diagnoses?limit=10');
        const data = await response.json();

        hideElement(loadingEl);

        if (response.ok && data.success && data.diagnoses.length > 0) {
            showElement(tableWrapper);

            tbody.innerHTML = data.diagnoses.map(diag => `
                <tr>
                    <td data-label="Patient">
                        <div class="table-user-cell">
                            <div class="table-user-avatar">
                                ${getInitials(diag.user_name || 'U')}
                            </div>
                            <div class="table-user-info">
                                <span class="table-user-name">${diag.user_name || 'Anonymous'}</span>
                                <span class="table-user-email">${diag.user_email || '--'}</span>
                            </div>
                        </div>
                    </td>
                    <td data-label="Disease">${diag.primary_disease || '--'}</td>
                    <td data-label="Severity">
                        <span class="severity-badge-sm ${(diag.severity || '').toLowerCase()}">
                            ${diag.severity || '--'}
                        </span>
                    </td>
                    <td data-label="Date">${formatDate(diag.created_at)}</td>
                    <td data-label="Actions">
                        <div class="table-actions">
                            <button class="table-action-btn view-btn"
                                onclick="openDiagnosisDetail('${diag.id}', ${JSON.stringify(diag).replace(/"/g, '&quot;')})">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        } else {
            showElement(emptyEl);
        }
    } catch (error) {
        hideElement(loadingEl);
        showElement(emptyEl);
    }
}


async function loadRecentActivity() {
    const loadingEl = document.getElementById('activityLoading');
    const itemsEl = document.getElementById('activityItems');
    const emptyEl = document.getElementById('activityEmpty');

    try {
        const response = await adminFetch('/api/admin/activity?limit=8');
        const data = await response.json();

        hideElement(loadingEl);

        if (response.ok && data.success && data.activities.length > 0) {
            showElement(itemsEl);

            itemsEl.innerHTML = data.activities.map(activity => `
                <div class="admin-activity-item">
                    <div class="admin-activity-icon activity-${activity.color || 'blue'}">
                        <i class="fas fa-${activity.icon || 'info-circle'}"></i>
                    </div>
                    <div class="admin-activity-info">
                        <p class="admin-activity-text">${activity.message}</p>
                        <span class="admin-activity-time">${formatTimeAgo(activity.created_at)}</span>
                    </div>
                </div>
            `).join('');
        } else {
            showElement(emptyEl);
        }
    } catch (error) {
        hideElement(loadingEl);
        showElement(emptyEl);
    }
}


function initSystemStatus() {
    checkSystemStatus();
}


async function checkSystemStatus() {
    const checks = [
        { id: 'apiStatus', endpoint: '/api/health', label: 'API' },
        { id: 'dbStatus', endpoint: '/api/health/db', label: 'Database' },
        { id: 'aiStatus', endpoint: '/api/health/ai', label: 'AI' },
        { id: 'storageStatus', endpoint: '/api/health/storage', label: 'Storage' }
    ];

    for (const check of checks) {
        const el = document.getElementById(check.id);
        if (!el) continue;

        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}${check.endpoint}`);
            if (response.ok) {
                el.textContent = 'Operational';
                el.className = 'system-status-value';
            } else {
                el.textContent = 'Error';
                el.className = 'system-status-value status-error';
            }
        } catch (error) {
            el.textContent = 'Offline';
            el.className = 'system-status-value status-error';
        }
    }
}


function initDashboardModals() {
    const diagDetailClose = document.getElementById('diagnosisDetailClose');
    if (diagDetailClose) {
        diagDetailClose.addEventListener('click', () => {
            hideElement(document.getElementById('diagnosisDetailModal'));
        });
    }

    const systemHealthBtn = document.getElementById('systemHealthBtn');
    if (systemHealthBtn) {
        systemHealthBtn.addEventListener('click', () => {
            showElement(document.getElementById('systemHealthModal'));
        });
    }

    const systemHealthClose = document.getElementById('systemHealthClose');
    if (systemHealthClose) {
        systemHealthClose.addEventListener('click', () => {
            hideElement(document.getElementById('systemHealthModal'));
        });
    }

    const runHealthCheckBtn = document.getElementById('runHealthCheckBtn');
    if (runHealthCheckBtn) {
        runHealthCheckBtn.addEventListener('click', runSystemHealthCheck);
    }
}


function openDiagnosisDetail(id, diag) {
    setTextContent('diagDetailPatient', diag.user_name || 'Anonymous');
    setTextContent('diagDetailEmail', diag.user_email || '--');
    setTextContent('diagDetailDisease', diag.primary_disease || '--');
    setTextContent('diagDetailSeverity', diag.severity || '--');
    setTextContent('diagDetailConfidence', diag.confidence_score ? `${(diag.confidence_score * 100).toFixed(0)}%` : '--');
    setTextContent('diagDetailDate', formatDate(diag.created_at));
    setTextContent('diagDetailSymptoms', diag.symptoms_text || '--');
    setTextContent('diagDetailAI', diag.description || '--');

    showElement(document.getElementById('diagnosisDetailModal'));
}


async function runSystemHealthCheck() {
    const checks = [
        { iconId: 'healthApiIcon', statusId: 'healthApiStatus', endpoint: '/api/health', name: 'API' },
        { iconId: 'healthDbIcon', statusId: 'healthDbStatus', endpoint: '/api/health/db', name: 'Database' },
        { iconId: 'healthAiIcon', statusId: 'healthAiStatus', endpoint: '/api/health/ai', name: 'AI' },
        { iconId: 'healthStorageIcon', statusId: 'healthStorageStatus', endpoint: '/api/health/storage', name: 'Storage' }
    ];

    for (const check of checks) {
        const iconEl = document.getElementById(check.iconId);
        const statusEl = document.getElementById(check.statusId);

        if (iconEl) {
            iconEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            iconEl.className = 'health-check-icon';
        }

        if (statusEl) statusEl.textContent = 'Checking...';

        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}${check.endpoint}`);

            if (response.ok) {
                if (iconEl) {
                    iconEl.innerHTML = '<i class="fas fa-check"></i>';
                    iconEl.className = 'health-check-icon check-pass';
                }
                if (statusEl) {
                    statusEl.textContent = 'Operational';
                    statusEl.className = 'health-check-status check-pass';
                }
            } else {
                throw new Error('Error');
            }
        } catch (error) {
            if (iconEl) {
                iconEl.innerHTML = '<i class="fas fa-times"></i>';
                iconEl.className = 'health-check-icon check-fail';
            }
            if (statusEl) {
                statusEl.textContent = 'Offline';
                statusEl.className = 'health-check-status check-fail';
            }
        }
    }
}


/* ============================================
   MANAGE DOCTORS PAGE
   ============================================ */
function initManageDoctorsPage() {
    if (!checkAdminAuth()) return;

    initAdminSidebar();
    initAdminLogout();
    loadDoctors();
    initDoctorFilters();
    initDoctorFormModal();
    initDeleteDoctorModal();
    initViewDoctorModal();

    const addBtn = document.getElementById('addDoctorBtn');
    if (addBtn) addBtn.addEventListener('click', openAddDoctorModal);

    const addEmptyBtn = document.getElementById('addDoctorEmptyBtn');
    if (addEmptyBtn) addEmptyBtn.addEventListener('click', openAddDoctorModal);
}


async function loadDoctors() {
    const loadingEl = document.getElementById('doctorsLoading');
    const emptyEl = document.getElementById('doctorsEmpty');
    const tableWrapper = document.getElementById('doctorsTableWrapper');

    showElement(loadingEl);
    hideElement(emptyEl);
    hideElement(tableWrapper);

    try {
        const response = await adminFetch('/api/admin/doctors');
        const data = await response.json();

        hideElement(loadingEl);

        if (response.ok && data.success) {
            AdminState.doctors = data.doctors || [];
            AdminState.filteredDoctors = [...AdminState.doctors];

            updateDoctorStats();
            renderDoctorsTable();
        } else {
            showElement(emptyEl);
        }
    } catch (error) {
        hideElement(loadingEl);
        showElement(emptyEl);
    }
}


function updateDoctorStats() {
    const doctors = AdminState.doctors;
    const active = doctors.filter(d => d.available).length;
    const specialties = [...new Set(doctors.map(d => d.specialty))].length;
    const avgRating = doctors.length > 0
        ? (doctors.reduce((sum, d) => sum + (d.rating || 0), 0) / doctors.length).toFixed(1)
        : 0;

    setTextContent('statTotalDoctors', doctors.length);
    setTextContent('statActiveDoctors', active);
    setTextContent('statSpecialties', specialties);
    setTextContent('statAvgRating', avgRating);
}


function renderDoctorsTable() {
    const tableWrapper = document.getElementById('doctorsTableWrapper');
    const emptyEl = document.getElementById('doctorsEmpty');
    const tbody = document.getElementById('doctorsTableBody');
    const paginationInfo = document.getElementById('doctorsPaginationInfo');
    const paginationEl = document.getElementById('doctorsPagination');

    const doctors = AdminState.filteredDoctors;

    if (doctors.length === 0) {
        hideElement(tableWrapper);
        showElement(emptyEl);
        return;
    }

    hideElement(emptyEl);
    showElement(tableWrapper);

    const start = (AdminState.currentPage - 1) * AdminState.itemsPerPage;
    const end = start + AdminState.itemsPerPage;
    const pageDoctors = doctors.slice(start, end);

    tbody.innerHTML = pageDoctors.map(doctor => `
        <tr>
            <td data-label="Doctor">
                <div class="table-user-cell">
                    <div class="table-doctor-avatar">
                        <i class="fas fa-user-md"></i>
                    </div>
                    <div class="table-user-info">
                        <span class="table-user-name">${doctor.name}</span>
                        <span class="table-user-email">${doctor.email || '--'}</span>
                    </div>
                </div>
            </td>
            <td data-label="Specialty">${doctor.specialty}</td>
            <td data-label="Location">${doctor.location || '--'}</td>
            <td data-label="Experience">${doctor.experience_years ? `${doctor.experience_years} yrs` : '--'}</td>
            <td data-label="Rating">
                <div class="table-rating">
                    <i class="fas fa-star"></i>
                    ${doctor.rating || 'N/A'}
                </div>
            </td>
            <td data-label="Status">
                <span class="status-badge ${doctor.available ? 'available' : 'unavailable'}">
                    <i class="fas fa-circle" style="font-size: 0.5rem;"></i>
                    ${doctor.available ? 'Available' : 'Unavailable'}
                </span>
            </td>
            <td data-label="Actions">
                <div class="table-actions">
                    <button class="table-action-btn view-btn"
                        onclick="openViewDoctor('${doctor.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="table-action-btn edit-btn"
                        onclick="openEditDoctor('${doctor.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="table-action-btn delete-btn"
                        onclick="openDeleteDoctor('${doctor.id}', '${escapeHTML(doctor.name)}')">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    if (paginationInfo) {
        paginationInfo.textContent = `Showing ${start + 1}-${Math.min(end, doctors.length)} of ${doctors.length} doctors`;
    }

    renderPagination(paginationEl, doctors.length, AdminState.currentPage, (page) => {
        AdminState.currentPage = page;
        renderDoctorsTable();
    });
}


function initDoctorFilters() {
    const searchInput = document.getElementById('doctorSearchInput');
    const specialtyFilter = document.getElementById('specialtyFilter');
    const locationFilter = document.getElementById('locationFilter');
    const statusFilter = document.getElementById('statusFilter');

    const applyFilters = () => {
        const search = searchInput ? searchInput.value.toLowerCase() : '';
        const specialty = specialtyFilter ? specialtyFilter.value : '';
        const location = locationFilter ? locationFilter.value : '';
        const status = statusFilter ? statusFilter.value : '';

        AdminState.filteredDoctors = AdminState.doctors.filter(doctor => {
            const matchSearch = !search ||
                doctor.name.toLowerCase().includes(search) ||
                (doctor.email && doctor.email.toLowerCase().includes(search));
            const matchSpecialty = !specialty || doctor.specialty === specialty;
            const matchLocation = !location || doctor.location === location;
            const matchStatus = status === '' || String(doctor.available) === status;

            return matchSearch && matchSpecialty && matchLocation && matchStatus;
        });

        AdminState.currentPage = 1;
        renderDoctorsTable();
    };

    if (searchInput) searchInput.addEventListener('input', applyFilters);
    if (specialtyFilter) specialtyFilter.addEventListener('change', applyFilters);
    if (locationFilter) locationFilter.addEventListener('change', applyFilters);
    if (statusFilter) statusFilter.addEventListener('change', applyFilters);
}


function initDoctorFormModal() {
    const form = document.getElementById('doctorForm');
    const closeBtn = document.getElementById('doctorFormClose');
    const cancelBtn = document.getElementById('cancelDoctorBtn');

    if (form) form.addEventListener('submit', handleDoctorFormSubmit);

    if (closeBtn) closeBtn.addEventListener('click', closeDoctorFormModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeDoctorFormModal);
}


function openAddDoctorModal() {
    AdminState.editingDoctorId = null;

    const title = document.getElementById('doctorFormTitle');
    if (title) title.innerHTML = '<i class="fas fa-user-md"></i> Add New Doctor';

    const form = document.getElementById('doctorForm');
    if (form) form.reset();

    document.getElementById('doctorId').value = '';

    hideElement(document.getElementById('doctorFormError'));
    hideElement(document.getElementById('doctorFormSuccess'));

    showElement(document.getElementById('doctorFormModal'));
}


function openEditDoctor(doctorId) {
    const doctor = AdminState.doctors.find(d => d.id === doctorId);
    if (!doctor) return;

    AdminState.editingDoctorId = doctorId;

    const title = document.getElementById('doctorFormTitle');
    if (title) title.innerHTML = '<i class="fas fa-edit"></i> Edit Doctor';

    document.getElementById('doctorId').value = doctor.id;
    document.getElementById('doctorName').value = doctor.name || '';
    document.getElementById('doctorEmail').value = doctor.email || '';
    document.getElementById('doctorSpecialty').value = doctor.specialty || '';
    document.getElementById('doctorLocation').value = doctor.location || '';
    document.getElementById('doctorContact').value = doctor.contact || '';
    document.getElementById('doctorExperience').value = doctor.experience_years || '';
    document.getElementById('doctorRating').value = doctor.rating || '';
    document.getElementById('doctorAvailable').value = String(doctor.available);

    hideElement(document.getElementById('doctorFormError'));
    hideElement(document.getElementById('doctorFormSuccess'));

    hideElement(document.getElementById('viewDoctorModal'));
    showElement(document.getElementById('doctorFormModal'));
}


async function handleDoctorFormSubmit(e) {
    e.preventDefault();

    const saveBtn = document.getElementById('saveDoctorBtn');
    const errorEl = document.getElementById('doctorFormError');
    const errorMsg = document.getElementById('doctorFormErrorMessage');
    const successEl = document.getElementById('doctorFormSuccess');
    const successMsg = document.getElementById('doctorFormSuccessMessage');

    hideElement(errorEl);
    hideElement(successEl);

    const doctorData = {
        name: document.getElementById('doctorName').value.trim(),
        email: document.getElementById('doctorEmail').value.trim(),
        specialty: document.getElementById('doctorSpecialty').value,
        location: document.getElementById('doctorLocation').value,
        contact: document.getElementById('doctorContact').value.trim(),
        experience_years: parseInt(document.getElementById('doctorExperience').value) || null,
        rating: parseFloat(document.getElementById('doctorRating').value) || null,
        available: document.getElementById('doctorAvailable').value === 'true'
    };

    if (!doctorData.name || !doctorData.specialty || !doctorData.location) {
        showAdminAlert(errorEl, errorMsg, 'Name, specialty, and location are required');
        return;
    }

    setButtonLoading(saveBtn, true);

    try {
        const isEditing = !!AdminState.editingDoctorId;
        const endpoint = isEditing
            ? `/api/admin/doctors/${AdminState.editingDoctorId}`
            : '/api/admin/doctors';
        const method = isEditing ? 'PUT' : 'POST';

        const response = await adminFetch(endpoint, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(doctorData)
        });

        const data = await response.json();

        if (response.ok && data.success) {
            const msg = isEditing ? 'Doctor updated successfully!' : 'Doctor added successfully!';
            showAdminSuccess(successEl, successMsg, msg);

            setTimeout(() => {
                closeDoctorFormModal();
                loadDoctors();
            }, 1200);
        } else {
            showAdminAlert(errorEl, errorMsg, data.message || 'Something went wrong');
        }
    } catch (error) {
        showAdminAlert(errorEl, errorMsg, 'Connection error. Please try again.');
    } finally {
        setButtonLoading(saveBtn, false);
    }
}


function closeDoctorFormModal() {
    hideElement(document.getElementById('doctorFormModal'));
    AdminState.editingDoctorId = null;
}


function openViewDoctor(doctorId) {
    const doctor = AdminState.doctors.find(d => d.id === doctorId);
    if (!doctor) return;

    setTextContent('viewDoctorName', doctor.name);
    setTextContent('viewDoctorSpecialty', doctor.specialty);
    setTextContent('viewDoctorLocation', doctor.location || '--');
    setTextContent('viewDoctorExperience', doctor.experience_years ? `${doctor.experience_years} years` : '--');
    setTextContent('viewDoctorRating', doctor.rating ? `${doctor.rating} / 5.0` : '--');
    setTextContent('viewDoctorContact', doctor.contact || '--');
    setTextContent('viewDoctorEmail', doctor.email || '--');
    setTextContent('viewDoctorStatus', doctor.available ? 'Available' : 'Unavailable');

    const editBtn = document.getElementById('editFromViewBtn');
    const deleteBtn = document.getElementById('deleteFromViewBtn');

    if (editBtn) editBtn.onclick = () => openEditDoctor(doctorId);
    if (deleteBtn) deleteBtn.onclick = () => {
        hideElement(document.getElementById('viewDoctorModal'));
        openDeleteDoctor(doctorId, doctor.name);
    };

    showElement(document.getElementById('viewDoctorModal'));
}


function initViewDoctorModal() {
    const closeBtn = document.getElementById('viewDoctorClose');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            hideElement(document.getElementById('viewDoctorModal'));
        });
    }
}


function initDeleteDoctorModal() {
    const closeBtn = document.getElementById('deleteDoctorClose');
    const cancelBtn = document.getElementById('cancelDeleteDoctorBtn');
    const confirmBtn = document.getElementById('confirmDeleteDoctorBtn');

    if (closeBtn) closeBtn.addEventListener('click', () => {
        hideElement(document.getElementById('deleteDoctorModal'));
    });

    if (cancelBtn) cancelBtn.addEventListener('click', () => {
        hideElement(document.getElementById('deleteDoctorModal'));
    });

    if (confirmBtn) confirmBtn.addEventListener('click', handleDeleteDoctor);
}


function openDeleteDoctor(doctorId, doctorName) {
    AdminState.deletingDoctorId = doctorId;
    document.getElementById('deleteDoctorId').value = doctorId;
    setTextContent('deleteDoctorName', doctorName);
    showElement(document.getElementById('deleteDoctorModal'));
}


async function handleDeleteDoctor() {
    const confirmBtn = document.getElementById('confirmDeleteDoctorBtn');
    const doctorId = AdminState.deletingDoctorId;

    if (!doctorId) return;

    setButtonLoading(confirmBtn, true);

    try {
        const response = await adminFetch(`/api/admin/doctors/${doctorId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (response.ok && data.success) {
            hideElement(document.getElementById('deleteDoctorModal'));
            showPageAlert('doctorSuccessAlert', 'doctorSuccessMessage', 'Doctor deleted successfully!');
            loadDoctors();
        } else {
            showPageAlert('doctorErrorAlert', 'doctorErrorMessage', data.message || 'Delete failed');
        }
    } catch (error) {
        showPageAlert('doctorErrorAlert', 'doctorErrorMessage', 'Connection error. Please try again.');
    } finally {
        setButtonLoading(confirmBtn, false);
    }
}


/* ============================================
   MANAGE USERS PAGE
   ============================================ */
function initManageUsersPage() {
    if (!checkAdminAuth()) return;

    initAdminSidebar();
    initAdminLogout();
    loadUsers();
    initUserFilters();
    initUserModals();

    const exportBtn = document.getElementById('exportUsersBtn');
    if (exportBtn) exportBtn.addEventListener('click', exportUsersCSV);
}


async function loadUsers() {
    const loadingEl = document.getElementById('usersLoading');
    const emptyEl = document.getElementById('usersEmpty');
    const tableWrapper = document.getElementById('usersTableWrapper');

    showElement(loadingEl);
    hideElement(emptyEl);
    hideElement(tableWrapper);

    try {
        const response = await adminFetch('/api/admin/users');
        const data = await response.json();

        hideElement(loadingEl);

        if (response.ok && data.success) {
            AdminState.users = data.users || [];
            AdminState.filteredUsers = [...AdminState.users];

            updateUserStats();
            renderUsersTable();
        } else {
            showElement(emptyEl);
        }
    } catch (error) {
        hideElement(loadingEl);
        showElement(emptyEl);
    }
}


function updateUserStats() {
    const users = AdminState.users;
    const active = users.filter(u => u.is_active).length;
    const inactive = users.filter(u => !u.is_active).length;

    setTextContent('statTotalUsers', users.length);
    setTextContent('statActiveUsers', active);
    setTextContent('statInactiveUsers', inactive);
}


function renderUsersTable() {
    const tableWrapper = document.getElementById('usersTableWrapper');
    const emptyEl = document.getElementById('usersEmpty');
    const tbody = document.getElementById('usersTableBody');
    const paginationInfo = document.getElementById('usersPaginationInfo');
    const paginationEl = document.getElementById('usersPagination');

    const users = AdminState.filteredUsers;

    if (users.length === 0) {
        hideElement(tableWrapper);
        showElement(emptyEl);
        return;
    }

    hideElement(emptyEl);
    showElement(tableWrapper);

    const start = (AdminState.currentPage - 1) * AdminState.itemsPerPage;
    const end = start + AdminState.itemsPerPage;
    const pageUsers = users.slice(start, end);

    tbody.innerHTML = pageUsers.map(user => `
        <tr>
            <td data-label="User">
                <div class="table-user-cell">
                    <div class="table-user-avatar">
                        ${getInitials(user.name)}
                    </div>
                    <div class="table-user-info">
                        <span class="table-user-name">${user.name}</span>
                        <span class="table-user-email">${user.email}</span>
                    </div>
                </div>
            </td>
            <td data-label="Age">${user.age || '--'}</td>
            <td data-label="Gender" style="text-transform: capitalize;">${user.gender || '--'}</td>
            <td data-label="Role">
                <span class="status-badge ${user.role}">
                    ${user.role || 'user'}
                </span>
            </td>
            <td data-label="Checkups">${user.checkup_count || 0}</td>
            <td data-label="Status">
                <span class="status-badge ${user.is_active ? 'active' : 'inactive'}">
                    <i class="fas fa-circle" style="font-size: 0.5rem;"></i>
                    ${user.is_active ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td data-label="Joined">${formatDate(user.created_at)}</td>
            <td data-label="Actions">
                <div class="table-actions">
                    <button class="table-action-btn view-btn"
                        onclick="openViewUser('${user.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="table-action-btn edit-btn"
                        onclick="openEditUser('${user.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="table-action-btn toggle-btn"
                        onclick="openToggleStatus('${user.id}', '${escapeHTML(user.name)}', ${user.is_active})">
                        <i class="fas fa-toggle-${user.is_active ? 'on' : 'off'}"></i>
                    </button>
                    <button class="table-action-btn delete-btn"
                        onclick="openDeleteUser('${user.id}', '${escapeHTML(user.name)}', '${user.email}')">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    if (paginationInfo) {
        paginationInfo.textContent = `Showing ${start + 1}-${Math.min(end, users.length)} of ${users.length} users`;
    }

    renderPagination(paginationEl, users.length, AdminState.currentPage, (page) => {
        AdminState.currentPage = page;
        renderUsersTable();
    });
}


function initUserFilters() {
    const searchInput = document.getElementById('userSearchInput');
    const roleFilter = document.getElementById('roleFilter');
    const statusFilter = document.getElementById('userStatusFilter');
    const genderFilter = document.getElementById('genderFilter');

    const applyFilters = () => {
        const search = searchInput ? searchInput.value.toLowerCase() : '';
        const role = roleFilter ? roleFilter.value : '';
        const status = statusFilter ? statusFilter.value : '';
        const gender = genderFilter ? genderFilter.value : '';

        AdminState.filteredUsers = AdminState.users.filter(user => {
            const matchSearch = !search ||
                user.name.toLowerCase().includes(search) ||
                user.email.toLowerCase().includes(search);
            const matchRole = !role || user.role === role;
            const matchStatus = status === '' || String(user.is_active) === status;
            const matchGender = !gender || user.gender === gender;

            return matchSearch && matchRole && matchStatus && matchGender;
        });

        AdminState.currentPage = 1;
        renderUsersTable();
    };

    if (searchInput) searchInput.addEventListener('input', applyFilters);
    if (roleFilter) roleFilter.addEventListener('change', applyFilters);
    if (statusFilter) statusFilter.addEventListener('change', applyFilters);
    if (genderFilter) genderFilter.addEventListener('change', applyFilters);
}


function initUserModals() {
    const viewClose = document.getElementById('viewUserClose');
    if (viewClose) viewClose.addEventListener('click', () => {
        hideElement(document.getElementById('viewUserModal'));
    });

    const editClose = document.getElementById('editUserClose');
    const cancelEdit = document.getElementById('cancelEditUserBtn');
    if (editClose) editClose.addEventListener('click', () => hideElement(document.getElementById('editUserModal')));
    if (cancelEdit) cancelEdit.addEventListener('click', () => hideElement(document.getElementById('editUserModal')));

    const editForm = document.getElementById('editUserForm');
    if (editForm) editForm.addEventListener('submit', handleEditUserSubmit);

    const deleteClose = document.getElementById('deleteUserClose');
    const cancelDelete = document.getElementById('cancelDeleteUserBtn');
    if (deleteClose) deleteClose.addEventListener('click', () => hideElement(document.getElementById('deleteUserModal')));
    if (cancelDelete) cancelDelete.addEventListener('click', () => hideElement(document.getElementById('deleteUserModal')));

    const deleteConfirmEmail = document.getElementById('deleteUserConfirmEmail');
    const confirmDeleteBtn = document.getElementById('confirmDeleteUserBtn');
    if (deleteConfirmEmail && confirmDeleteBtn) {
        deleteConfirmEmail.addEventListener('input', function () {
            const user = AdminState.users.find(u => u.id === AdminState.deletingUserId);
            confirmDeleteBtn.disabled = this.value !== (user ? user.email : '');
        });
    }

    if (confirmDeleteBtn) confirmDeleteBtn.addEventListener('click', handleDeleteUser);

    const toggleClose = document.getElementById('toggleStatusClose');
    const cancelToggle = document.getElementById('cancelToggleStatusBtn');
    if (toggleClose) toggleClose.addEventListener('click', () => hideElement(document.getElementById('toggleStatusModal')));
    if (cancelToggle) cancelToggle.addEventListener('click', () => hideElement(document.getElementById('toggleStatusModal')));

    const confirmToggle = document.getElementById('confirmToggleStatusBtn');
    if (confirmToggle) confirmToggle.addEventListener('click', handleToggleUserStatus);
}


function openViewUser(userId) {
    const user = AdminState.users.find(u => u.id === userId);
    if (!user) return;

    setTextContent('viewUserName', user.name);
    setTextContent('viewUserEmail', user.email);
    setTextContent('viewUserAge', user.age || '--');
    setTextContent('viewUserGender', user.gender || '--');
    setTextContent('viewUserRole', user.role || 'user');
    setTextContent('viewUserStatus', user.is_active ? 'Active' : 'Inactive');
    setTextContent('viewUserJoined', formatDate(user.created_at));
    setTextContent('viewUserLastLogin', formatDate(user.last_login));

    const toggleBtn = document.getElementById('toggleUserStatusBtn');
    const toggleText = document.getElementById('toggleUserStatusText');
    if (toggleBtn && toggleText) {
        toggleText.textContent = user.is_active ? 'Deactivate' : 'Activate';
        toggleBtn.onclick = () => openToggleStatus(userId, user.name, user.is_active);
    }

    const deleteBtn = document.getElementById('deleteUserFromViewBtn');
    if (deleteBtn) {
        deleteBtn.onclick = () => {
            hideElement(document.getElementById('viewUserModal'));
            openDeleteUser(userId, user.name, user.email);
        };
    }

    loadUserHistory(userId);
    showElement(document.getElementById('viewUserModal'));
}


async function loadUserHistory(userId) {
    const loadingEl = document.getElementById('userHistoryLoading');
    const emptyEl = document.getElementById('userHistoryEmpty');
    const tableEl = document.getElementById('userHistoryTable');
    const tbody = document.getElementById('userHistoryBody');

    showElement(loadingEl);
    hideElement(emptyEl);
    hideElement(tableEl);

    try {
        const response = await adminFetch(`/api/admin/users/${userId}/history`);
        const data = await response.json();

        hideElement(loadingEl);

        if (response.ok && data.success && data.history.length > 0) {
            showElement(tableEl);

            tbody.innerHTML = data.history.map(item => `
                <tr>
                    <td>${item.primary_disease || '--'}</td>
                    <td>
                        <span class="severity-badge-sm ${(item.severity || '').toLowerCase()}">
                            ${item.severity || '--'}
                        </span>
                    </td>
                    <td>${item.confidence_score ? `${(item.confidence_score * 100).toFixed(0)}%` : '--'}</td>
                    <td>${formatDate(item.created_at)}</td>
                </tr>
            `).join('');
        } else {
            showElement(emptyEl);
        }
    } catch (error) {
        hideElement(loadingEl);
        showElement(emptyEl);
    }
}


function openEditUser(userId) {
    const user = AdminState.users.find(u => u.id === userId);
    if (!user) return;

    AdminState.editingUserId = userId;

    document.getElementById('editUserId').value = user.id;
    document.getElementById('editUserName').value = user.name || '';
    document.getElementById('editUserAge').value = user.age || '';
    document.getElementById('editUserGender').value = user.gender || '';
    document.getElementById('editUserRole').value = user.role || 'user';
    document.getElementById('editUserActive').value = String(user.is_active);

    hideElement(document.getElementById('editUserError'));
    hideElement(document.getElementById('editUserSuccess'));

    showElement(document.getElementById('editUserModal'));
}


async function handleEditUserSubmit(e) {
    e.preventDefault();

    const saveBtn = document.getElementById('saveEditUserBtn');
    const errorEl = document.getElementById('editUserError');
    const errorMsg = document.getElementById('editUserErrorMessage');
    const successEl = document.getElementById('editUserSuccess');
    const successMsg = document.getElementById('editUserSuccessMessage');

    hideElement(errorEl);
    hideElement(successEl);

    const userData = {
        name: document.getElementById('editUserName').value.trim(),
        age: parseInt(document.getElementById('editUserAge').value) || null,
        gender: document.getElementById('editUserGender').value,
        role: document.getElementById('editUserRole').value,
        is_active: document.getElementById('editUserActive').value === 'true'
    };

    if (!userData.name) {
        showAdminAlert(errorEl, errorMsg, 'Name is required');
        return;
    }

    setButtonLoading(saveBtn, true);

    try {
        const response = await adminFetch(`/api/admin/users/${AdminState.editingUserId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showAdminSuccess(successEl, successMsg, 'User updated successfully!');
            setTimeout(() => {
                hideElement(document.getElementById('editUserModal'));
                loadUsers();
            }, 1200);
        } else {
            showAdminAlert(errorEl, errorMsg, data.message || 'Update failed');
        }
    } catch (error) {
        showAdminAlert(errorEl, errorMsg, 'Connection error. Please try again.');
    } finally {
        setButtonLoading(saveBtn, false);
    }
}


function openDeleteUser(userId, userName, userEmail) {
    AdminState.deletingUserId = userId;
    document.getElementById('deleteUserId').value = userId;
    setTextContent('deleteUserName', userName);

    const emailInput = document.getElementById('deleteUserConfirmEmail');
    if (emailInput) emailInput.value = '';

    const confirmBtn = document.getElementById('confirmDeleteUserBtn');
    if (confirmBtn) confirmBtn.disabled = true;

    showElement(document.getElementById('deleteUserModal'));
}


async function handleDeleteUser() {
    const confirmBtn = document.getElementById('confirmDeleteUserBtn');
    const userId = AdminState.deletingUserId;
    if (!userId) return;

    setButtonLoading(confirmBtn, true);

    try {
        const response = await adminFetch(`/api/admin/users/${userId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (response.ok && data.success) {
            hideElement(document.getElementById('deleteUserModal'));
            showPageAlert('userSuccessAlert', 'userSuccessMessage', 'User deleted successfully!');
            loadUsers();
        } else {
            showPageAlert('userErrorAlert', 'userErrorMessage', data.message || 'Delete failed');
        }
    } catch (error) {
        showPageAlert('userErrorAlert', 'userErrorMessage', 'Connection error. Please try again.');
    } finally {
        setButtonLoading(confirmBtn, false);
    }
}


function openToggleStatus(userId, userName, isActive) {
    AdminState.editingUserId = userId;

    document.getElementById('toggleStatusUserId').value = userId;
    document.getElementById('toggleStatusValue').value = String(!isActive);
    setTextContent('toggleStatusUserName', userName);

    const iconEl = document.getElementById('toggleStatusIcon');
    const titleEl = document.getElementById('toggleStatusTitle');
    const descEl = document.getElementById('toggleStatusDescription');
    const confirmText = document.getElementById('confirmToggleText');

    if (isActive) {
        if (iconEl) iconEl.innerHTML = '<i class="fas fa-user-slash" style="color: #f59e0b;"></i>';
        if (titleEl) titleEl.textContent = 'Deactivate User?';
        if (descEl) descEl.innerHTML = `This will prevent <strong>${userName}</strong> from logging in. You can reactivate them later.`;
        if (confirmText) confirmText.textContent = 'Deactivate';
    } else {
        if (iconEl) iconEl.innerHTML = '<i class="fas fa-user-check" style="color: #10b981;"></i>';
        if (titleEl) titleEl.textContent = 'Activate User?';
        if (descEl) descEl.innerHTML = `This will allow <strong>${userName}</strong> to login and use the platform again.`;
        if (confirmText) confirmText.textContent = 'Activate';
    }

    showElement(document.getElementById('toggleStatusModal'));
}


async function handleToggleUserStatus() {
    const confirmBtn = document.getElementById('confirmToggleStatusBtn');
    const userId = document.getElementById('toggleStatusUserId').value;
    const newStatus = document.getElementById('toggleStatusValue').value === 'true';

    setButtonLoading(confirmBtn, true);

    try {
        const response = await adminFetch(`/api/admin/users/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_active: newStatus })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            hideElement(document.getElementById('toggleStatusModal'));
            const msg = newStatus ? 'User activated successfully!' : 'User deactivated successfully!';
            showPageAlert('userSuccessAlert', 'userSuccessMessage', msg);
            loadUsers();
        } else {
            showPageAlert('userErrorAlert', 'userErrorMessage', data.message || 'Status update failed');
        }
    } catch (error) {
        showPageAlert('userErrorAlert', 'userErrorMessage', 'Connection error. Please try again.');
    } finally {
        setButtonLoading(confirmBtn, false);
    }
}


function exportUsersCSV() {
    const users = AdminState.users;
    if (users.length === 0) return;

    const headers = ['Name', 'Email', 'Age', 'Gender', 'Role', 'Status', 'Joined'];
    const rows = users.map(u => [
        u.name,
        u.email,
        u.age || '',
        u.gender || '',
        u.role,
        u.is_active ? 'Active' : 'Inactive',
        formatDate(u.created_at)
    ]);

    const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `medai-users-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}


/* ============================================
   SHARED ADMIN UTILITIES
   ============================================ */
function initAdminSidebar() {
    const toggleBtn = document.getElementById('adminToggleBtn');
    const sidebar = document.getElementById('adminSidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            if (overlay) overlay.classList.toggle('show');
        });
    }

    if (overlay) {
        overlay.addEventListener('click', () => {
            if (sidebar) sidebar.classList.remove('open');
            overlay.classList.remove('show');
        });
    }
}


function initAdminLogout() {
    const logoutBtn = document.getElementById('adminLogoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function (e) {
            e.preventDefault();
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminData');
            window.location.href = 'admin-login.html';
        });
    }
}


async function adminFetch(endpoint, options = {}) {
    const token = AdminState.token || localStorage.getItem('adminToken');
    return fetch(`${CONFIG.API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...(options.headers || {})
        }
    });
}


function renderPagination(container, total, currentPage, onPageChange) {
    if (!container) return;

    const totalPages = Math.ceil(total / AdminState.itemsPerPage);
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = '';

    html += `<button class="page-btn" ${currentPage === 1 ? 'disabled' : ''}
        onclick="(${onPageChange})(${currentPage - 1})">
        <i class="fas fa-chevron-left"></i>
    </button>`;

    for (let i = 1; i <= totalPages; i++) {
        if (
            i === 1 ||
            i === totalPages ||
            (i >= currentPage - 1 && i <= currentPage + 1)
        ) {
            html += `<button class="page-btn ${i === currentPage ? 'active' : ''}"
                onclick="(${onPageChange})(${i})">${i}</button>`;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            html += `<span class="page-btn" style="border:none; cursor:default;">...</span>`;
        }
    }

    html += `<button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''}
        onclick="(${onPageChange})(${currentPage + 1})">
        <i class="fas fa-chevron-right"></i>
    </button>`;

    container.innerHTML = html;
}


function setCurrentDate(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;

    const dateSpan = el.querySelector('span');
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateStr = now.toLocaleDateString('en-US', options);

    if (dateSpan) dateSpan.textContent = dateStr;
    else el.textContent = dateStr;
}


function setAdminGreeting() {
    const el = document.getElementById('adminGreeting');
    if (!el) return;

    const admin = AdminState.currentAdmin;
    const hour = new Date().getHours();
    let greeting = 'Good morning';
    if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
    else if (hour >= 17) greeting = 'Good evening';

    el.textContent = `${greeting}, ${admin ? admin.name : 'Admin'}`;
}


function showPageAlert(alertId, messageId, message) {
    const alertEl = document.getElementById(alertId);
    const msgEl = document.getElementById(messageId);

    if (alertEl && msgEl) {
        msgEl.textContent = message;
        showElement(alertEl);
        setTimeout(() => hideElement(alertEl), 4000);
    }
}


function showAdminAlert(el, msgEl, message) {
    if (el && msgEl) {
        msgEl.textContent = message;
        showElement(el);
    }
}


function showAdminSuccess(el, msgEl, message) {
    if (el && msgEl) {
        msgEl.textContent = message;
        showElement(el);
    }
}


function setButtonLoading(btn, isLoading) {
    if (!btn) return;
    const textEl = btn.querySelector('.btn-text');
    const loaderEl = btn.querySelector('.btn-loader');

    if (isLoading) {
        btn.disabled = true;
        if (textEl) hideElement(textEl);
        if (loaderEl) showElement(loaderEl);
    } else {
        btn.disabled = false;
        if (textEl) showElement(textEl);
        if (loaderEl) hideElement(loaderEl);
    }
}


function showElement(el) {
    if (el) el.style.display = '';
}


function hideElement(el) {
    if (el) el.style.display = 'none';
}


function setTextContent(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}


function getInitials(name) {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}


function formatDate(dateStr) {
    if (!dateStr) return '--';
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
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
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
    return formatDate(dateStr);
}


function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}


function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}