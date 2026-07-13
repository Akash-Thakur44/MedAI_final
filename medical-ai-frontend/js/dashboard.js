/* ============================================
   DASHBOARD LOGIC
   ============================================ */

/* ==================== STATE ==================== */
const DashboardState = {
  currentUser: null,
  token: null,
  history: [],
  doctors: [],
  historyPage: 1,
  historyLimit: 5,
};

/* ==================== INIT ==================== */
document.addEventListener("DOMContentLoaded", function () {
  const path = window.location.pathname;
  if (path.includes("dashboard")) {
    initDashboard();
  }
});

async function initDashboard() {
  if (!checkDashboardAuth()) return;

  initDashboardSidebar();
  initDashboardTopbar();
  initDashboardLogout();
  setDashboardGreeting();
  setDashboardDate();

  // Load data with error handling - don't redirect on failure
  try {
    await loadDashboardStats();
  } catch (error) {
    console.error("Stats error:", error);
  }

  try {
    await loadUserHistory();
  } catch (error) {
    console.error("History error:", error);
  }

  try {
    await loadDashboardDoctors();
  } catch (error) {
    console.error("Doctors error:", error);
  }

  initDashboardModals();
  initQuickActions();
  initNotifications();

  // Hide page loader
  const loader = document.getElementById('pageLoader');
  if (loader) {
    loader.classList.add('loader-fade-out');
    setTimeout(() => loader.remove(), 300);
  }
}

/* ==================== AUTH CHECK ==================== */
function checkDashboardAuth() {
  const token = localStorage.getItem("userToken");
  const userData = localStorage.getItem("userData");

  console.log("=== AUTH CHECK ===");
  console.log("Token exists:", !!token);
  console.log("UserData exists:", !!userData);

  if (!token || !userData) {
    console.log("No auth, redirecting...");
    window.location.href = "login.html";
    return false;
  }

  try {
    DashboardState.token = token;
    DashboardState.currentUser = JSON.parse(userData);
    console.log("Auth OK for:", DashboardState.currentUser.name);
    return true;
  } catch (e) {
    console.error("Parse failed:", e);
    localStorage.removeItem("userToken");
    localStorage.removeItem("userData");
    window.location.href = "login.html";
    return false;
  }
}

/* ==================== SIDEBAR ==================== */
function initDashboardSidebar() {
  const toggleBtn = document.getElementById("sidebarToggle");
  const sidebar = document.getElementById("sidebar");
  const closeBtn = document.getElementById("sidebarClose");

  let overlay = document.getElementById("sidebarOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "sidebarOverlay";
    overlay.className = "sidebar-overlay";
    document.body.appendChild(overlay);
  }

  const openSidebar = () => {
    if (sidebar) sidebar.classList.add("open");
    overlay.classList.add("show");
  };

  const closeSidebar = () => {
    if (sidebar) sidebar.classList.remove("open");
    overlay.classList.remove("show");
  };

  if (toggleBtn) toggleBtn.addEventListener("click", openSidebar);
  if (closeBtn) closeBtn.addEventListener("click", closeSidebar);
  overlay.addEventListener("click", closeSidebar);
}

/* ==================== TOPBAR ==================== */
function initDashboardTopbar() {
  const user = DashboardState.currentUser;

  const topbarName = document.getElementById("topbarUserName");
  const sidebarName = document.getElementById("sidebarUserName");
  const sidebarRole = document.getElementById("sidebarUserRole");

  if (topbarName) topbarName.textContent = user?.name || "User";
  if (sidebarName) sidebarName.textContent = user?.name || "User";
  if (sidebarRole)
    sidebarRole.textContent = user?.role === "admin" ? "Admin" : "Patient";

  const topbarUser = document.getElementById("topbarUser");
  const userDropdown = document.getElementById("userDropdown");

  if (topbarUser && userDropdown) {
    topbarUser.addEventListener("click", function (e) {
      e.stopPropagation();
      userDropdown.classList.toggle("show");
    });

    document.addEventListener("click", function () {
      userDropdown.classList.remove("show");
    });
  }

  const dropdownProfile = document.getElementById("dropdownProfile");
  const dropdownSettings = document.getElementById("dropdownSettings");

  if (dropdownProfile) {
    dropdownProfile.addEventListener("click", function (e) {
      e.preventDefault();
      openProfileModal();
    });
  }

  if (dropdownSettings) {
    dropdownSettings.addEventListener("click", function (e) {
      e.preventDefault();
      openSettingsModal();
    });
  }
}

/* ==================== LOGOUT ==================== */
function initDashboardLogout() {
  const logoutBtns = document.querySelectorAll(
    "#logoutBtn, #dropdownLogout, .logout-link",
  );

  logoutBtns.forEach((btn) => {
    btn.addEventListener("click", async function (e) {
      e.preventDefault();

      try {
        await API.auth.logout();
      } catch (err) {
        console.warn("Logout error:", err);
      }

      localStorage.removeItem(CONFIG.USER_TOKEN_KEY);
      localStorage.removeItem(CONFIG.USER_DATA_KEY);
      window.location.href = "login.html";
    });
  });
}

/* ==================== GREETING ==================== */
function setDashboardGreeting() {
  const greetingEl = document.getElementById("greetingText");
  if (!greetingEl) return;

  const user = DashboardState.currentUser;
  const hour = new Date().getHours();

  let greeting = "Good morning";
  if (hour >= 12 && hour < 17) greeting = "Good afternoon";
  else if (hour >= 17) greeting = "Good evening";

  greetingEl.textContent = `${greeting}, ${user?.name?.split(" ")[0] || "User"}!`;
}

/* ==================== DATE ==================== */
function setDashboardDate() {
  const dateEl = document.getElementById("currentDate");
  if (!dateEl) return;

  const dateSpan = dateEl.querySelector("span");
  const now = new Date();
  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };

  const dateStr = now.toLocaleDateString("en-US", options);
  if (dateSpan) dateSpan.textContent = dateStr;
}

/* ==================== STATS CARDS ==================== */
async function loadDashboardStats() {
  try {
    const response = await API.symptoms.getHistory(100);

    if (!response) {
      console.log("No history response");
      return;
    }

    if (response && response.success) {
      const history = response.history || [];

      const totalCheckups = history.length;
      const lastSeverity =
        history.length > 0 ? history[0].severity || "N/A" : "N/A";

      const doctorsCount = history.filter((h) => h.has_recommendation).length;

      const imagesCount = history.filter(
        (h) => h.input_type === "image" || h.input_type === "combined",
      ).length;

      animateCounter("totalCheckups", totalCheckups);
      setStatText("lastSeverity", lastSeverity);
      animateCounter("doctorsConsulted", doctorsCount);
      animateCounter("imagesAnalyzed", imagesCount);

      const lastSevEl = document.getElementById("lastSeverity");
      if (lastSevEl && lastSeverity !== "N/A") {
        lastSevEl.style.color =
          CONFIG.SEVERITY_COLORS[lastSeverity] || "#64748b";
      }
    }
  } catch (error) {
    console.error("Stats load error:", error);
    // Don't throw, don't redirect
  }
}

function animateCounter(elementId, targetValue) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const duration = 1000;
  const start = 0;
  const increment = targetValue / (duration / 16);
  let current = start;

  const timer = setInterval(() => {
    current += increment;
    if (current >= targetValue) {
      current = targetValue;
      clearInterval(timer);
    }
    el.textContent = Math.floor(current);
  }, 16);
}

function setStatText(elementId, value) {
  const el = document.getElementById(elementId);
  if (el) el.textContent = value;
}

/* ==================== USER HISTORY ==================== */
async function loadUserHistory() {
  const loadingEl = document.getElementById("historyLoading");
  const emptyEl = document.getElementById("historyEmpty");
  const cardsEl = document.getElementById("historyCards");

  try {
    const response = await API.symptoms.getHistory(DashboardState.historyLimit);

    if (loadingEl) loadingEl.style.display = "none";

    if (!response) {
      if (emptyEl) emptyEl.style.display = "block";
      return;
    }

    if (
      response &&
      response.success &&
      response.history &&
      response.history.length > 0
    ) {
      DashboardState.history = response.history;

      if (cardsEl) {
        cardsEl.innerHTML = response.history
          .map((item) => createHistoryCard(item))
          .join("");

        cardsEl.querySelectorAll(".history-card").forEach((card) => {
          card.addEventListener("click", function () {
            const logId = this.dataset.logId;
            if (logId) viewHistoryDetail(logId);
          });
        });
      }

      if (emptyEl) emptyEl.style.display = "none";
    } else {
      if (emptyEl) emptyEl.style.display = "block";
    }
  } catch (error) {
    if (loadingEl) loadingEl.style.display = "none";
    if (emptyEl) emptyEl.style.display = "block";
    console.error("History error:", error);
    // Don't throw, don't redirect
  }
}

function createHistoryCard(item) {
  const severity = item.severity || "Low";
  const severityClass = severity.toLowerCase();
  const disease = item.primary_disease || "Unknown Condition";
  const symptoms = item.symptoms_text || "No symptoms recorded";
  const date = formatDashboardDate(item.created_at);

  const iconMap = {
    low: "check-circle",
    medium: "exclamation-circle",
    high: "exclamation-triangle",
    critical: "ambulance",
  };

  const icon = iconMap[severityClass] || "notes-medical";

  return `
        <div class="history-card" data-log-id="${item.id}" style="cursor: pointer;">
            <div class="history-card-icon severity-${severityClass}">
                <i class="fas fa-${icon}"></i>
            </div>
            <div class="history-card-info">
                <div class="history-card-disease">${escapeHtml(disease)}</div>
                <div class="history-card-symptoms">${escapeHtml(truncateText(symptoms, 80))}</div>
                <div class="history-card-meta">
                    <span class="history-card-date">
                        <i class="fas fa-clock"></i> ${date}
                    </span>
                    <span class="history-severity-badge ${severityClass}">
                        ${severity}
                    </span>
                </div>
            </div>
            <button class="history-delete-btn" data-log-id="${item.id}" title="Delete this record" onclick="event.stopPropagation(); deleteHistoryItem('${item.id}');">
                <i class="fas fa-trash-alt"></i>
            </button>
        </div>
    `;
}

async function deleteHistoryItem(logId) {
  if (!logId) return;

  const confirmed = confirm("Are you sure you want to delete this history record? This action cannot be undone.");
  if (!confirmed) return;

  try {
    const response = await API.symptoms.deleteHistory(logId);

    if (response && response.success) {
      const card = document.querySelector(`.history-card[data-log-id="${logId}"]`);
      if (card) {
        card.style.transition = "opacity 0.3s, transform 0.3s";
        card.style.opacity = "0";
        card.style.transform = "translateX(-20px)";
        setTimeout(() => {
          card.remove();
          const cardsContainer = document.getElementById("historyCards");
          const emptyEl = document.getElementById("historyEmpty");
          if (cardsContainer && cardsContainer.children.length === 0) {
            if (emptyEl) emptyEl.style.display = "block";
          }
        }, 300);
      }

      loadDashboardStats();
    } else {
      alert(response?.message || "Failed to delete history");
    }
  } catch (error) {
    console.error("Delete history error:", error);
    alert("Failed to delete history. Please try again.");
  }
}

async function viewHistoryDetail(logId) {
  try {
    const response = await API.symptoms.getHistoryById(logId);
    if (response && response.success) {
      localStorage.setItem(CONFIG.RESULTS_KEY, JSON.stringify(response.data));
      window.location.href = "results.html";
    }
  } catch (error) {
    console.error("History detail error:", error);
  }
}

/* ==================== DOCTORS ==================== */
async function loadDashboardDoctors() {
  try {
    const response = await API.doctors.getAll({ available: true });

    if (response && response.success) {
      DashboardState.doctors = response.doctors || [];
    }
  } catch (error) {
    console.error("Doctors load error:", error);
    // Don't throw, don't redirect
  }
}

function renderDoctorCards(doctors, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!doctors || doctors.length === 0) {
    container.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #64748b;">
                <i class="fas fa-user-md" style="font-size: 2rem; margin-bottom: 8px; display: block;"></i>
                <p>No doctors found</p>
            </div>
        `;
    return;
  }

  container.innerHTML = doctors
    .map(
      (doctor) => `
        <div class="doctor-card">
            <div class="doctor-avatar">
                <i class="fas fa-user-md"></i>
            </div>
            <div class="doctor-info">
                <div class="doctor-name">${escapeHtml(doctor.name)}</div>
                <div class="doctor-specialty">${doctor.specialty}</div>
                <div class="doctor-meta">
                    <span class="doctor-meta-item">
                        <i class="fas fa-map-marker-alt"></i>
                        ${doctor.location || "--"}
                    </span>
                    <span class="doctor-meta-item doctor-rating">
                        <i class="fas fa-star"></i>
                        ${doctor.rating || "N/A"}
                    </span>
                    <span class="doctor-meta-item">
                        <i class="fas fa-briefcase-medical"></i>
                        ${doctor.experience_years ? `${doctor.experience_years} yrs` : "--"}
                    </span>
                </div>
            </div>
            <div class="doctor-actions">
                <a href="tel:${doctor.contact || ""}"
                   class="btn btn-primary btn-sm"
                   ${!doctor.contact ? 'style="pointer-events:none;opacity:0.5;"' : ""}>
                    <i class="fas fa-phone"></i>
                </a>
            </div>
        </div>
    `,
    )
    .join("");
}

/* ==================== QUICK ACTIONS ==================== */
function initQuickActions() {
  const findDoctorBtn = document.getElementById("findDoctorBtn");
  if (findDoctorBtn) {
    findDoctorBtn.addEventListener("click", function (e) {
      e.preventDefault();
      openDoctorsModal();
    });
  }

  const historyLink = document.getElementById("historyLink");
  if (historyLink) {
    historyLink.addEventListener("click", function (e) {
      e.preventDefault();
      openFullHistory();
    });
  }

  const doctorsLink = document.getElementById("doctorsLink");
  if (doctorsLink) {
    doctorsLink.addEventListener("click", function (e) {
      e.preventDefault();
      openDoctorsModal();
    });
  }

  const profileLink = document.getElementById("profileLink");
  if (profileLink) {
    profileLink.addEventListener("click", function (e) {
      e.preventDefault();
      openProfileModal();
    });
  }

  const settingsLink = document.getElementById("settingsLink");
  if (settingsLink) {
    settingsLink.addEventListener("click", function (e) {
      e.preventDefault();
      openSettingsModal();
    });
  }

  const viewAllHistory = document.getElementById("viewAllHistory");
  if (viewAllHistory) {
    viewAllHistory.addEventListener("click", function (e) {
      e.preventDefault();
      openFullHistory();
    });
  }
}

function openFullHistory() {
  loadFullHistory();
}

async function loadFullHistory() {
  const historyEmptyEl = document.getElementById("historyEmpty");
  const historyCardsEl = document.getElementById("historyCards");

  try {
    const response = await API.symptoms.getHistory(50);
    if (response && response.success) {
      DashboardState.history = response.history;
      DashboardState.historyLimit = 50;

      if (historyCardsEl) {
        historyCardsEl.innerHTML = response.history
          .map((item) => createHistoryCard(item))
          .join("");

        historyCardsEl.querySelectorAll(".history-card").forEach((card) => {
          card.addEventListener("click", function () {
            const logId = this.dataset.logId;
            if (logId) viewHistoryDetail(logId);
          });
        });
      }

      if (historyEmptyEl) {
        historyEmptyEl.style.display =
          response.history.length === 0 ? "block" : "none";
      }
    }
  } catch (error) {
    console.error("Full history error:", error);
  }
}

/* ==================== MODALS ==================== */
function initDashboardModals() {
  initProfileModal();
  initDoctorsModal();
  initSettingsModal();
  initDeleteConfirmModal();

  document.querySelectorAll(".modal-overlay").forEach((overlay) => {
    overlay.addEventListener("click", function (e) {
      if (e.target === this) {
        this.style.display = "none";
      }
    });
  });
}

/* ==================== PROFILE MODAL ==================== */
function initProfileModal() {
  const closeBtn = document.getElementById("profileModalClose");
  if (closeBtn) closeBtn.addEventListener("click", closeProfileModal);

  const form = document.getElementById("profileForm");
  if (form) form.addEventListener("submit", handleProfileUpdate);
}

function openProfileModal() {
  const user = DashboardState.currentUser;
  if (!user) return;

  const nameInput = document.getElementById("profileName");
  const emailInput = document.getElementById("profileEmail");
  const ageInput = document.getElementById("profileAge");
  const genderInput = document.getElementById("profileGender");

  if (nameInput) nameInput.value = user.name || "";
  if (emailInput) emailInput.value = user.email || "";
  if (ageInput) ageInput.value = user.age || "";
  if (genderInput) genderInput.value = user.gender || "";

  const successEl = document.getElementById("profileSuccess");
  const errorEl = document.getElementById("profileError");
  if (successEl) successEl.style.display = "none";
  if (errorEl) errorEl.style.display = "none";

  const modal = document.getElementById("profileModal");
  if (modal) modal.style.display = "flex";
}

function closeProfileModal() {
  const modal = document.getElementById("profileModal");
  if (modal) modal.style.display = "none";
}

async function handleProfileUpdate(e) {
  e.preventDefault();

  const name = document.getElementById("profileName")?.value?.trim();
  const age = document.getElementById("profileAge")?.value;
  const gender = document.getElementById("profileGender")?.value;

  const successEl = document.getElementById("profileSuccess");
  const errorEl = document.getElementById("profileError");
  const errorMsg = document.getElementById("profileErrorMessage");

  if (successEl) successEl.style.display = "none";
  if (errorEl) errorEl.style.display = "none";

  if (!name || name.length < 2) {
    if (errorEl) errorEl.style.display = "flex";
    if (errorMsg) errorMsg.textContent = "Name must be at least 2 characters";
    return;
  }

  try {
    const response = await API.auth.updateProfile({
      name,
      age: parseInt(age) || null,
      gender,
    });

    if (response && response.success) {
      DashboardState.currentUser = {
        ...DashboardState.currentUser,
        name,
        age: parseInt(age) || null,
        gender,
      };

      localStorage.setItem(
        CONFIG.USER_DATA_KEY,
        JSON.stringify(DashboardState.currentUser),
      );

      const topbarName = document.getElementById("topbarUserName");
      const sidebarName = document.getElementById("sidebarUserName");
      if (topbarName) topbarName.textContent = name;
      if (sidebarName) sidebarName.textContent = name;

      if (successEl) successEl.style.display = "flex";

      setTimeout(() => {
        closeProfileModal();
        setDashboardGreeting();
      }, 1500);
    } else {
      if (errorEl) errorEl.style.display = "flex";
      if (errorMsg) errorMsg.textContent = response?.message || "Update failed";
    }
  } catch (error) {
    if (errorEl) errorEl.style.display = "flex";
    if (errorMsg) errorMsg.textContent = "Connection error. Please try again.";
  }
}

/* ==================== DOCTORS MODAL ==================== */
function initDoctorsModal() {
  const closeBtn = document.getElementById("doctorsModalClose");
  const filterBtn = document.getElementById("filterDoctorsBtn");

  if (closeBtn)
    closeBtn.addEventListener("click", () => {
      const modal = document.getElementById("doctorsModal");
      if (modal) modal.style.display = "none";
    });

  if (filterBtn) filterBtn.addEventListener("click", filterDoctorsModal);
}

async function openDoctorsModal() {
  const modal = document.getElementById("doctorsModal");
  if (modal) modal.style.display = "flex";

  const loadingEl = document.getElementById("doctorsLoading");
  const doctorCards = document.getElementById("doctorCards");

  if (loadingEl) loadingEl.style.display = "block";

  try {
    const response = await API.doctors.getAll({ available: true });

    if (loadingEl) loadingEl.style.display = "none";

    if (response && response.success) {
      DashboardState.doctors = response.doctors || [];
      renderDoctorCards(DashboardState.doctors, "doctorCards");
    }
  } catch (error) {
    if (loadingEl) loadingEl.style.display = "none";
    console.error("Doctors modal error:", error);
  }
}

async function filterDoctorsModal() {
  const specialty = document.getElementById("specialtyFilter")?.value;
  const location = document.getElementById("locationFilter")?.value;

  const loadingEl = document.getElementById("doctorsLoading");
  if (loadingEl) loadingEl.style.display = "block";

  try {
    const filters = {};
    if (specialty) filters.specialty = specialty;
    if (location) filters.location = location;

    const response = await API.doctors.getAll(filters);

    if (loadingEl) loadingEl.style.display = "none";

    if (response && response.success) {
      renderDoctorCards(response.doctors || [], "doctorCards");
    }
  } catch (error) {
    if (loadingEl) loadingEl.style.display = "none";
    console.error("Filter error:", error);
  }
}

/* ==================== SETTINGS MODAL ==================== */
function initSettingsModal() {
  const closeBtn = document.getElementById("settingsModalClose");
  if (closeBtn) closeBtn.addEventListener("click", closeSettingsModal);

  const changePasswordForm = document.getElementById("changePasswordForm");
  if (changePasswordForm) {
    changePasswordForm.addEventListener("submit", handleChangePassword);
  }

  const deleteAccountBtn = document.getElementById("deleteAccountBtn");
  if (deleteAccountBtn) {
    deleteAccountBtn.addEventListener("click", () => {
      closeSettingsModal();
      openDeleteConfirmModal();
    });
  }
}

function openSettingsModal() {
  const modal = document.getElementById("settingsModal");
  if (modal) modal.style.display = "flex";

  const successEl = document.getElementById("passwordSuccess");
  const errorEl = document.getElementById("passwordError");
  const form = document.getElementById("changePasswordForm");

  if (successEl) successEl.style.display = "none";
  if (errorEl) errorEl.style.display = "none";
  if (form) form.reset();
}

function closeSettingsModal() {
  const modal = document.getElementById("settingsModal");
  if (modal) modal.style.display = "none";
}

async function handleChangePassword(e) {
  e.preventDefault();

  const currentPassword = document.getElementById("currentPassword")?.value;
  const newPassword = document.getElementById("newPassword")?.value;
  const confirmPassword = document.getElementById("confirmPassword")?.value;

  const successEl = document.getElementById("passwordSuccess");
  const errorEl = document.getElementById("passwordError");
  const errorMsg = document.getElementById("passwordErrorMessage");

  if (successEl) successEl.style.display = "none";
  if (errorEl) errorEl.style.display = "none";

  if (!currentPassword || !newPassword || !confirmPassword) {
    if (errorEl) errorEl.style.display = "flex";
    if (errorMsg) errorMsg.textContent = "All fields are required";
    return;
  }

  if (newPassword.length < 6) {
    if (errorEl) errorEl.style.display = "flex";
    if (errorMsg)
      errorMsg.textContent = "New password must be at least 6 characters";
    return;
  }

  if (newPassword !== confirmPassword) {
    if (errorEl) errorEl.style.display = "flex";
    if (errorMsg) errorMsg.textContent = "New passwords do not match";
    return;
  }

  try {
    const response = await API.auth.changePassword(
      currentPassword,
      newPassword,
    );

    if (response && response.success) {
      if (successEl) successEl.style.display = "flex";

      const form = document.getElementById("changePasswordForm");
      if (form) form.reset();
    } else {
      if (errorEl) errorEl.style.display = "flex";
      if (errorMsg)
        errorMsg.textContent = response?.message || "Password change failed";
    }
  } catch (error) {
    if (errorEl) errorEl.style.display = "flex";
    if (errorMsg) errorMsg.textContent = "Connection error. Please try again.";
  }
}

/* ==================== DELETE ACCOUNT MODAL ==================== */
function initDeleteConfirmModal() {
  const closeBtn = document.getElementById("deleteConfirmClose");
  const cancelBtn = document.getElementById("cancelDeleteBtn");
  const confirmBtn = document.getElementById("confirmDeleteBtn");
  const emailInput = document.getElementById("deleteConfirmEmail");

  if (closeBtn)
    closeBtn.addEventListener("click", () => {
      const modal = document.getElementById("deleteConfirmModal");
      if (modal) modal.style.display = "none";
    });

  if (cancelBtn)
    cancelBtn.addEventListener("click", () => {
      const modal = document.getElementById("deleteConfirmModal");
      if (modal) modal.style.display = "none";
    });

  if (emailInput && confirmBtn) {
    emailInput.addEventListener("input", function () {
      const userEmail = DashboardState.currentUser?.email || "";
      confirmBtn.disabled = this.value.trim() !== userEmail;
    });
  }

  if (confirmBtn) confirmBtn.addEventListener("click", handleDeleteAccount);
}

function openDeleteConfirmModal() {
  const emailInput = document.getElementById("deleteConfirmEmail");
  const confirmBtn = document.getElementById("confirmDeleteBtn");

  if (emailInput) emailInput.value = "";
  if (confirmBtn) confirmBtn.disabled = true;

  const modal = document.getElementById("deleteConfirmModal");
  if (modal) modal.style.display = "flex";
}

async function handleDeleteAccount() {
  const confirmBtn = document.getElementById("confirmDeleteBtn");
  if (confirmBtn) confirmBtn.disabled = true;

  try {
    const response = await API.auth.deleteAccount();

    if (response && response.success) {
      localStorage.removeItem(CONFIG.USER_TOKEN_KEY);
      localStorage.removeItem(CONFIG.USER_DATA_KEY);
      localStorage.removeItem(CONFIG.RESULTS_KEY);

      window.location.href = "index.html";
    } else {
      alert(response?.message || "Account deletion failed");
      if (confirmBtn) confirmBtn.disabled = false;
    }
  } catch (error) {
    alert("Connection error. Please try again.");
    if (confirmBtn) confirmBtn.disabled = false;
  }
}

/* ==================== NOTIFICATIONS ==================== */
function initNotifications() {
  const notifBtn = document.getElementById("notificationBtn");
  const notifPanel = document.getElementById("notificationPanel");
  const markAllRead = document.getElementById("markAllRead");

  if (notifBtn && notifPanel) {
    notifBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      const isVisible = notifPanel.style.display !== "none";
      notifPanel.style.display = isVisible ? "none" : "block";
    });

    document.addEventListener("click", function (e) {
      if (!notifPanel.contains(e.target) && e.target !== notifBtn) {
        notifPanel.style.display = "none";
      }
    });
  }

  if (markAllRead) {
    markAllRead.addEventListener("click", function () {
      document.querySelectorAll(".notification-item.unread").forEach((item) => {
        item.classList.remove("unread");
      });

      const badge = document.getElementById("notificationBadge");
      if (badge) badge.textContent = "0";
      if (badge) badge.style.display = "none";
    });
  }
}

/* ==================== EXPORT FOR GLOBAL ACCESS ==================== */
window.deleteHistoryItem = deleteHistoryItem;

/* ==================== HELPERS ==================== */
function formatDashboardDate(dateStr) {
  if (!dateStr) return "--";
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch (e) {
    return "--";
  }
}

function truncateText(text, maxLength = 100) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + "...";
}

function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
