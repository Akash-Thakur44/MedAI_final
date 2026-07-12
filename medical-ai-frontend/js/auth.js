/* ============================================
   AUTH LOGIC - LOGIN & REGISTER
   ============================================ */

/* ==================== INIT ==================== */
document.addEventListener("DOMContentLoaded", function () {
  const path = window.location.pathname;

  if (path.includes("login.html")) {
    initLoginPage();
  } else if (path.includes("register.html")) {
    initRegisterPage();
  }
});

/* ============================================
   LOGIN PAGE
   ============================================ */
function initLoginPage() {
  redirectIfLoggedIn();
  initLoginForm();
  initPasswordToggle("password", "togglePassword");
  initNavbarMobile();
}

function redirectIfLoggedIn() {
  const token = localStorage.getItem("userToken");
  const userData = localStorage.getItem("userData");

  // Check if user wants to switch account
  const urlParams = new URLSearchParams(window.location.search);
  const switchAccount = urlParams.get("switch");

  // If ?switch=true in URL, clear old session and stay
  if (switchAccount === "true") {
    localStorage.removeItem("userToken");
    localStorage.removeItem("userData");
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminData");
    localStorage.removeItem("latestResults");
    return;
  }

  // If token exists, show option to continue or switch
  if (token && userData) {
    try {
      const user = JSON.parse(userData);
      showAlreadyLoggedIn(user);
    } catch (e) {
      // Invalid data, clear and stay
      localStorage.removeItem("userToken");
      localStorage.removeItem("userData");
    }
  }
}

function showAlreadyLoggedIn(user) {
  // Create overlay
  const overlay = document.createElement("div");
  overlay.className = "already-logged-overlay";
  overlay.innerHTML = `
        <div class="already-logged-card">
            <div class="already-logged-avatar">
                <i class="fas fa-user-circle"></i>
            </div>
            <h3>Already Logged In</h3>
            <p>You are logged in as <strong>${user.name || user.email}</strong></p>
            <div class="already-logged-actions">
                <a href="dashboard.html" class="btn btn-primary btn-full">
                    <i class="fas fa-arrow-right"></i> Continue to Dashboard
                </a>
                <button class="btn btn-outline btn-full" onclick="switchAccount()">
                    <i class="fas fa-user-plus"></i> Use Different Account
                </button>
            </div>
        </div>
    `;

  document.body.appendChild(overlay);
}

function switchAccount() {
  // Clear all stored data
  localStorage.removeItem("userToken");
  localStorage.removeItem("userData");
  localStorage.removeItem("adminToken");
  localStorage.removeItem("adminData");
  localStorage.removeItem("latestResults");

  // Remove overlay
  const overlay = document.querySelector(".already-logged-overlay");
  if (overlay) overlay.remove();
}

function initLoginForm() {
  const form = document.getElementById("loginForm");
  if (!form) return;

  form.addEventListener("submit", handleLogin);

  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");

  if (emailInput) {
    emailInput.addEventListener("blur", function () {
      validateEmailField(this.value, "emailError");
    });

    emailInput.addEventListener("input", function () {
      clearFieldError("emailError");
    });
  }

  if (passwordInput) {
    passwordInput.addEventListener("input", function () {
      clearFieldError("passwordError");
    });
  }
}

async function handleLogin(e) {
  e.preventDefault();

  const email = document.getElementById("email")?.value?.trim();
  const password = document.getElementById("password")?.value;
  const rememberMe = document.getElementById("rememberMe")?.checked;

  const alertEl = document.getElementById("loginAlert");
  const alertMsg = document.getElementById("loginAlertMessage");
  const successEl = document.getElementById("loginSuccess");
  const successMsg = document.getElementById("loginSuccessMessage");
  const loginBtn = document.getElementById("loginBtn");

  hideAuthAlert(alertEl);
  hideAuthAlert(successEl);

  let isValid = true;

  if (!email) {
    showFieldError("emailError", "Email is required");
    isValid = false;
  } else if (!isValidEmail(email)) {
    showFieldError("emailError", "Please enter a valid email address");
    isValid = false;
  }

  if (!password) {
    showFieldError("passwordError", "Password is required");
    isValid = false;
  } else if (password.length < 6) {
    showFieldError("passwordError", "Password must be at least 6 characters");
    isValid = false;
  }

  if (!isValid) return;

  setAuthButtonLoading(loginBtn, true, "Signing In...");

  try {
    const data = await API.auth.login(email, password);

    if (data && data.success) {
      if (rememberMe) {
        localStorage.setItem("rememberEmail", email);
      } else {
        localStorage.removeItem("rememberEmail");
      }

      localStorage.setItem("userToken", data.token);
      localStorage.setItem("userData", JSON.stringify(data.user));

      showAuthSuccess(
        successEl,
        successMsg,
        "Login successful! Redirecting to dashboard...",
      );

      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 1200);
    } else {
      showAuthAlert(
        alertEl,
        alertMsg,
        data?.message || "Invalid email or password",
      );
    }
  } catch (error) {
    showAuthAlert(
      alertEl,
      alertMsg,
      handleAPIError(error, "Login failed. Please try again."),
    );
  } finally {
    setAuthButtonLoading(loginBtn, false, "");
  }
}

/* ============================================
   REGISTER PAGE
   ============================================ */
function initRegisterPage() {
  redirectIfLoggedIn();
  initRegisterForm();
  initRegisterSteps();
  initPasswordToggle("password", "togglePassword");
  initPasswordToggle("confirmPassword", "toggleConfirmPassword");
  initPasswordStrength();
  initNavbarMobile();

  const savedEmail = localStorage.getItem("rememberEmail");
  if (savedEmail) {
    const emailInput = document.getElementById("email");
    if (emailInput) emailInput.value = savedEmail;
  }
}

/* ==================== REGISTER STEPS ==================== */
const RegisterState = {
  currentStep: 1,
  formData: {
    fullName: "",
    email: "",
    age: null,
    gender: "",
    password: "",
    confirmPassword: "",
  },
};

function initRegisterSteps() {
  // Use setTimeout to ensure DOM is fully ready
  setTimeout(function () {
    const nextToStep2 = document.getElementById("nextToStep2");
    const backToStep1 = document.getElementById("backToStep1");
    const nextToStep3 = document.getElementById("nextToStep3");
    const backToStep2 = document.getElementById("backToStep2");

    if (nextToStep2) {
      nextToStep2.onclick = function () {
        handleNextToStep2();
      };
      console.log("nextToStep2 listener attached");
    }

    if (backToStep1) {
      backToStep1.onclick = function () {
        goToStep(1);
      };
    }

    if (nextToStep3) {
      nextToStep3.onclick = function () {
        handleNextToStep3();
      };
      console.log("nextToStep3 listener attached");
    }

    if (backToStep2) {
      backToStep2.onclick = function () {
        goToStep(2);
      };
    }

    console.log("All register step listeners attached!");
  }, 100);
}

function goToStep(step) {
  RegisterState.currentStep = step;

  for (let i = 1; i <= 3; i++) {
    const stepEl = document.getElementById(`formStep${i}`);
    if (stepEl) {
      stepEl.style.display = i === step ? "block" : "none";
    }

    const indicator = document.getElementById(`step${i}Indicator`);
    if (indicator) {
      indicator.classList.remove("active", "completed");
      if (i < step) indicator.classList.add("completed");
      else if (i === step) indicator.classList.add("active");
    }

    const line = document.getElementById(`stepLine${i}`);
    if (line) {
      line.classList.toggle("completed", i < step);
    }
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function handleNextToStep2() {
  const fullName = document.getElementById("fullName")?.value?.trim();
  const email = document.getElementById("email")?.value?.trim();

  clearFieldError("fullNameError");
  clearFieldError("emailError");

  let isValid = true;

  if (!fullName || fullName.length < 3) {
    showFieldError("fullNameError", "Full name must be at least 3 characters");
    isValid = false;
  }

  if (!email) {
    showFieldError("emailError", "Email address is required");
    isValid = false;
  } else if (!isValidEmail(email)) {
    showFieldError("emailError", "Please enter a valid email address");
    isValid = false;
  }

  if (!isValid) return;

  RegisterState.formData.fullName = fullName;
  RegisterState.formData.email = email;

  goToStep(2);
}

function handleNextToStep3() {
  const age = document.getElementById("age")?.value;
  const gender = document.querySelector('input[name="gender"]:checked')?.value;

  clearFieldError("ageError");
  clearFieldError("genderError");

  let isValid = true;

  if (!age || age < 1 || age > 120) {
    showFieldError("ageError", "Please enter a valid age (1-120)");
    isValid = false;
  }

  if (!gender) {
    showFieldError("genderError", "Please select your gender");
    isValid = false;
  }

  if (!isValid) return;

  RegisterState.formData.age = parseInt(age);
  RegisterState.formData.gender = gender;

  goToStep(3);
}

/* ==================== REGISTER FORM ==================== */
function initRegisterForm() {
  const form = document.getElementById("registerForm");
  if (!form) return;

  form.addEventListener("submit", handleRegister);

  const passwordInput = document.getElementById("password");
  const confirmInput = document.getElementById("confirmPassword");

  if (confirmInput) {
    confirmInput.addEventListener("input", function () {
      const password = document.getElementById("password")?.value;
      if (this.value && this.value !== password) {
        showFieldError("confirmPasswordError", "Passwords do not match");
      } else {
        clearFieldError("confirmPasswordError");
      }
    });
  }
}

async function handleRegister(e) {
  e.preventDefault();

  const password = document.getElementById("password")?.value;
  const confirmPassword = document.getElementById("confirmPassword")?.value;
  const agreeTerms = document.getElementById("agreeTerms")?.checked;
  const agreeDisclaimer = document.getElementById("agreeDisclaimer")?.checked;

  const alertEl = document.getElementById("registerAlert");
  const alertMsg = document.getElementById("registerAlertMessage");
  const successEl = document.getElementById("registerSuccess");
  const successMsg = document.getElementById("registerSuccessMessage");
  const registerBtn = document.getElementById("registerBtn");

  hideAuthAlert(alertEl);
  hideAuthAlert(successEl);

  clearFieldError("passwordError");
  clearFieldError("confirmPasswordError");
  clearFieldError("termsError");
  clearFieldError("disclaimerError");

  let isValid = true;

  if (!password || password.length < 6) {
    showFieldError("passwordError", "Password must be at least 6 characters");
    isValid = false;
  }

  if (!confirmPassword) {
    showFieldError("confirmPasswordError", "Please confirm your password");
    isValid = false;
  } else if (password !== confirmPassword) {
    showFieldError("confirmPasswordError", "Passwords do not match");
    isValid = false;
  }

  if (!agreeTerms) {
    showFieldError("termsError", "You must agree to the Terms of Service");
    isValid = false;
  }

  if (!agreeDisclaimer) {
    showFieldError(
      "disclaimerError",
      "You must acknowledge the medical disclaimer",
    );
    isValid = false;
  }

  if (!isValid) return;

  RegisterState.formData.password = password;

  setAuthButtonLoading(registerBtn, true, "Creating Account...");

  try {
    const userData = {
      name: RegisterState.formData.fullName,
      email: RegisterState.formData.email,
      password: RegisterState.formData.password,
      age: RegisterState.formData.age,
      gender: RegisterState.formData.gender,
    };

    const data = await API.auth.register(userData);

    if (data && data.success) {
      localStorage.setItem("userToken", data.token);
      localStorage.setItem("userData", JSON.stringify(data.user));

      showAuthSuccess(
        successEl,
        successMsg,
        "Account created successfully! Redirecting to dashboard...",
      );

      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 1500);
    } else {
      showAuthAlert(
        alertEl,
        alertMsg,
        data?.message || "Registration failed. Please try again.",
      );
    }
  } catch (error) {
    showAuthAlert(
      alertEl,
      alertMsg,
      handleAPIError(error, "Registration failed. Please try again."),
    );
  } finally {
    setAuthButtonLoading(registerBtn, false, "");
  }
}

/* ==================== PASSWORD STRENGTH ==================== */
function initPasswordStrength() {
  const passwordInput = document.getElementById("password");
  if (!passwordInput) return;

  passwordInput.addEventListener("input", function () {
    checkPasswordStrength(this.value);
    checkPasswordRequirements(this.value);
  });
}

function checkPasswordStrength(password) {
  const bars = [
    document.getElementById("strengthBar1"),
    document.getElementById("strengthBar2"),
    document.getElementById("strengthBar3"),
    document.getElementById("strengthBar4"),
  ];
  const textEl = document.getElementById("strengthText");

  bars.forEach((bar) => {
    if (bar) bar.className = "strength-bar";
  });

  if (!password) {
    if (textEl) {
      textEl.textContent = "Password Strength";
      textEl.className = "strength-text";
    }
    return;
  }

  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  let level, label;

  if (score <= 1) {
    level = "weak";
    label = "Weak";
  } else if (score === 2) {
    level = "fair";
    label = "Fair";
  } else if (score === 3) {
    level = "good";
    label = "Good";
  } else {
    level = "strong";
    label = "Strong";
  }

  const fillCount = {
    weak: 1,
    fair: 2,
    good: 3,
    strong: 4,
  }[level];

  bars.forEach((bar, index) => {
    if (bar && index < fillCount) {
      bar.className = `strength-bar ${level}`;
    }
  });

  if (textEl) {
    textEl.textContent = label;
    textEl.className = `strength-text ${level}`;
  }
}

function checkPasswordRequirements(password) {
  const requirements = [
    {
      id: "reqLength",
      met: password.length >= 6,
      icon: "fa-check-circle",
    },
    {
      id: "reqUppercase",
      met: /[A-Z]/.test(password),
      icon: "fa-check-circle",
    },
    {
      id: "reqNumber",
      met: /[0-9]/.test(password),
      icon: "fa-check-circle",
    },
    {
      id: "reqSpecial",
      met: /[^A-Za-z0-9]/.test(password),
      icon: "fa-check-circle",
    },
  ];

  requirements.forEach((req) => {
    const el = document.getElementById(req.id);
    if (!el) return;

    const icon = el.querySelector("i");

    if (req.met) {
      el.classList.add("met");
      if (icon) icon.className = "fas fa-check-circle";
    } else {
      el.classList.remove("met");
      if (icon) icon.className = "fas fa-circle";
    }
  });
}

/* ==================== PASSWORD TOGGLE ==================== */
function initPasswordToggle(inputId, btnId) {
  const input = document.getElementById(inputId);
  const btn = document.getElementById(btnId);

  if (!input || !btn) return;

  btn.addEventListener("click", function () {
    const isPassword = input.type === "password";
    input.type = isPassword ? "text" : "password";

    const icon = this.querySelector("i");
    if (icon) {
      icon.className = isPassword ? "fas fa-eye-slash" : "fas fa-eye";
    }
  });
}

/* ==================== NAVBAR MOBILE ==================== */
function initNavbarMobile() {
  const mobileMenuBtn = document.getElementById("mobileMenuBtn");
  const navLinks = document.getElementById("navLinks");
  const navAuth = document.querySelector(".nav-auth");

  if (!mobileMenuBtn) return;

  mobileMenuBtn.addEventListener("click", function () {
    let mobileMenu = document.getElementById("authMobileMenu");

    if (!mobileMenu) {
      mobileMenu = document.createElement("div");
      mobileMenu.id = "authMobileMenu";
      mobileMenu.className = "mobile-nav-menu";
      mobileMenu.innerHTML = `
                <a href="index.html" class="mobile-nav-link">Home</a>
                <a href="index.html#features" class="mobile-nav-link">Features</a>
                <a href="index.html#how-it-works" class="mobile-nav-link">How It Works</a>
                <a href="index.html#about" class="mobile-nav-link">About</a>
                <div class="mobile-nav-auth">
                    <a href="login.html" class="btn btn-outline btn-full">Login</a>
                    <a href="register.html" class="btn btn-primary btn-full">Sign Up</a>
                </div>
            `;
      document.body.appendChild(mobileMenu);
    }

    mobileMenu.classList.toggle("open");

    const icon = this.querySelector("i");
    if (icon) {
      icon.className = mobileMenu.classList.contains("open")
        ? "fas fa-times"
        : "fas fa-bars";
    }
  });
}

/* ==================== FIELD VALIDATION HELPERS ==================== */
function showFieldError(elementId, message) {
  const el = document.getElementById(elementId);
  if (el) {
    el.textContent = message;
    el.style.display = "flex";
  }

  const inputId = elementId.replace("Error", "");
  const inputEl = document.getElementById(inputId);
  if (inputEl) inputEl.classList.add("input-error");
}

function clearFieldError(elementId) {
  const el = document.getElementById(elementId);
  if (el) {
    el.textContent = "";
    el.style.display = "none";
  }

  const inputId = elementId.replace("Error", "");
  const inputEl = document.getElementById(inputId);
  if (inputEl) inputEl.classList.remove("input-error");
}

function validateEmailField(email, errorId) {
  if (!email) {
    showFieldError(errorId, "Email is required");
    return false;
  }
  if (!isValidEmail(email)) {
    showFieldError(errorId, "Please enter a valid email address");
    return false;
  }
  clearFieldError(errorId);
  return true;
}

/* ==================== ALERT HELPERS ==================== */
function showAuthAlert(el, msgEl, message) {
  if (!el || !msgEl) return;
  msgEl.textContent = message;
  el.style.display = "flex";
}

function hideAuthAlert(el) {
  if (el) el.style.display = "none";
}

function showAuthSuccess(el, msgEl, message) {
  if (!el || !msgEl) return;
  msgEl.textContent = message;
  el.style.display = "flex";
}

/* ==================== BUTTON LOADING ==================== */
function setAuthButtonLoading(btn, isLoading, loadingText) {
  if (!btn) return;

  const textEl = btn.querySelector(".btn-text");
  const loaderEl = btn.querySelector(".btn-loader");

  btn.disabled = isLoading;

  if (isLoading) {
    if (textEl) textEl.style.display = "none";
    if (loaderEl) loaderEl.style.display = "flex";
  } else {
    if (textEl) textEl.style.display = "flex";
    if (loaderEl) loaderEl.style.display = "none";
  }
}

/* ==================== VALIDATION HELPERS ==================== */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function handleAPIError(error, defaultMessage) {
  if (!error) return defaultMessage;

  if (error.message === "Failed to fetch") {
    return "Cannot connect to server. Please check your internet.";
  }

  return error.message || defaultMessage;
}
