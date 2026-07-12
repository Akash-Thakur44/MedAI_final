/* ============================================
   CONFIG - API CONFIGURATION
   ============================================ */

const CONFIG = {
  /* ==================== API URL ==================== */
  API_BASE_URL: (() => {
    const hostname = window.location.hostname;

    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0"
    ) {
      return "http://localhost:5000";
    }

    return 'https://medical-ai-backend-production-7d86.up.railway.app';
  })(),

  /* ==================== APP INFO ==================== */
  APP_NAME: "MedAI",
  APP_VERSION: "1.0.0",

  /* ==================== TIMEOUTS ==================== */
  REQUEST_TIMEOUT: 30000,
  ANALYSIS_TIMEOUT: 60000,

  /* ==================== IMAGE LIMITS ==================== */
  MAX_IMAGE_SIZE_MB: 5,
  MAX_IMAGE_SIZE_BYTES: 5 * 1024 * 1024,
  MAX_IMAGES: 3,
  ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/webp"],

  /* ==================== SYMPTOM TEXT LIMITS ==================== */
  MIN_SYMPTOM_LENGTH: 10,
  MAX_SYMPTOM_LENGTH: 2000,

  /* ==================== PAGINATION ==================== */
  DEFAULT_PAGE_SIZE: 10,
  HISTORY_PAGE_SIZE: 5,

  /* ==================== TOKEN KEYS ==================== */
  USER_TOKEN_KEY: "userToken",
  USER_DATA_KEY: "userData",
  ADMIN_TOKEN_KEY: "adminToken",
  ADMIN_DATA_KEY: "adminData",
  RESULTS_KEY: "latestResults",

  /* ==================== ROUTES ==================== */
  ROUTES: {
    home: "/index.html",
    login: "/login.html",
    register: "/register.html",
    dashboard: "/dashboard.html",
    symptomChecker: "/symptom-checker.html",
    results: "/results.html",
    adminLogin: "/admin/admin-login.html",
    adminDashboard: "/admin/admin-dashboard.html",
  },

  /* ==================== SEVERITY LEVELS ==================== */
  SEVERITY: {
    LOW: "Low",
    MEDIUM: "Medium",
    HIGH: "High",
    CRITICAL: "Critical",
  },

  /* ==================== SEVERITY COLORS ==================== */
  SEVERITY_COLORS: {
    Low: "#10b981",
    Medium: "#f59e0b",
    High: "#ef4444",
    Critical: "#dc2626",
  },

  /* ==================== SEVERITY GAUGE POSITIONS ==================== */
  SEVERITY_POSITIONS: {
    Low: "12%",
    Medium: "37%",
    High: "62%",
    Critical: "88%",
  },

  /* ==================== EMERGENCY KEYWORDS ==================== */
  EMERGENCY_KEYWORDS: [
    "chest pain",
    "heart attack",
    "can't breathe",
    "cannot breathe",
    "difficulty breathing",
    "severe bleeding",
    "unconscious",
    "stroke",
    "seizure",
    "overdose",
    "suicidal",
    "severe head injury",
    "anaphylaxis",
    "anaphylactic",
  ],

  /* ==================== DOCTOR SPECIALTIES ==================== */
  SPECIALTIES: [
    "General Physician",
    "Dermatologist",
    "Ophthalmologist",
    "ENT Specialist",
    "Neurologist",
    "Cardiologist",
    "Orthopedist",
    "Gastroenterologist",
    "Pulmonologist",
    "Psychiatrist",
  ],

  /* ==================== LOCATIONS ==================== */
  LOCATIONS: [
    "Dhaka",
    "Chittagong",
    "Sylhet",
    "Rajshahi",
    "Khulna",
    "Barisal",
    "Rangpur",
    "Mymensingh",
  ],
};

/* ==================== FREEZE CONFIG ==================== */
Object.freeze(CONFIG);
Object.freeze(CONFIG.ROUTES);
Object.freeze(CONFIG.SEVERITY);
Object.freeze(CONFIG.SEVERITY_COLORS);
Object.freeze(CONFIG.SEVERITY_POSITIONS);
Object.freeze(CONFIG.EMERGENCY_KEYWORDS);
Object.freeze(CONFIG.SPECIALTIES);
Object.freeze(CONFIG.LOCATIONS);
Object.freeze(CONFIG.ALLOWED_IMAGE_TYPES);
