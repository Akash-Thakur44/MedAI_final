/* ============================================
   API SERVICE - ALL BACKEND CALLS
   ============================================ */

const API = {
  /* ==================== BASE REQUEST ==================== */
  async request(endpoint, options = {}) {
    const token =
      localStorage.getItem("userToken") || localStorage.getItem("adminToken");

    const defaultHeaders = {
      "Content-Type": "application/json",
    };

    if (token) {
      defaultHeaders["Authorization"] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...(options.headers || {}),
      },
    };

    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, config);

      if (response.status === 401) {
        API.handleUnauthorized();
        return null;
      }

      return response;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw new Error("Network error. Please check your connection.");
    }
  },

  handleUnauthorized() {
    const currentPath = window.location.pathname;

    const isOnAuthPage =
      currentPath.includes("login") ||
      currentPath.includes("register") ||
      currentPath === "/" ||
      currentPath.includes("index");

    if (isOnAuthPage) {
      return;
    }

    const isAdmin = currentPath.includes("admin");

    localStorage.removeItem("userToken");
    localStorage.removeItem("userData");
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminData");

    if (isAdmin) {
      window.location.href = "/admin/admin-login.html";
    } else {
      window.location.href = "/login.html";
    }
  },

  /* ==================== AUTH APIs ==================== */
  auth: {
    async register(userData) {
      const response = await API.request("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(userData),
      });

      if (!response) throw new Error("No response from server");
      return await response.json();
    },

    async login(email, password) {
      const response = await API.request("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      if (!response) throw new Error("No response from server");
      return await response.json();
    },

    async adminLogin(email, password) {
      const response = await API.request("/api/auth/admin-login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      if (!response) throw new Error("No response from server");
      return await response.json();
    },

    async logout() {
      try {
        await API.request("/api/auth/logout", {
          method: "POST",
        });
      } catch (e) {
        console.warn("Logout API error:", e);
      } finally {
        localStorage.removeItem("userToken");
        localStorage.removeItem("userData");
      }
    },

    async getMe() {
      const response = await API.request("/api/auth/me");
      if (!response) return null;
      return await response.json();
    },

    async updateProfile(profileData) {
      const response = await API.request("/api/auth/profile", {
        method: "PUT",
        body: JSON.stringify(profileData),
      });

      if (!response) throw new Error("No response from server");
      return await response.json();
    },

    async changePassword(currentPassword, newPassword) {
      const response = await API.request("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      if (!response) throw new Error("No response from server");
      return await response.json();
    },

    async deleteAccount() {
      const response = await API.request("/api/auth/delete-account", {
        method: "DELETE",
      });

      if (!response) throw new Error("No response from server");
      return await response.json();
    },
  },

  /* ==================== SYMPTOM APIs ==================== */
  symptoms: {
    async analyze(symptomData) {
      const response = await API.request("/api/symptoms/analyze", {
        method: "POST",
        body: JSON.stringify(symptomData),
      });

      if (!response) throw new Error("No response from server");

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Analysis failed");
      }

      return data;
    },

    async getHistory(limit = 10, page = 1) {
      const response = await API.request(
        `/api/symptoms/history?limit=${limit}&page=${page}`,
      );

      if (!response) return { success: false, history: [] };
      return await response.json();
    },

    async getHistoryById(logId) {
      const response = await API.request(`/api/symptoms/history/${logId}`);
      if (!response) return null;
      return await response.json();
    },

    async deleteHistory(logId) {
      const response = await API.request(`/api/symptoms/history/${logId}`, {
        method: "DELETE",
      });

      if (!response) throw new Error("No response from server");
      return await response.json();
    },
  },

  /* ==================== IMAGE APIs ==================== */
  images: {
    async upload(imageFile, imageType) {
      const formData = new FormData();
      formData.append("image", imageFile);
      formData.append("image_type", imageType);

      const token = localStorage.getItem("userToken");
      const headers = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const response = await fetch(`${CONFIG.API_BASE_URL}/api/images/upload`, {
        method: "POST",
        headers,
        body: formData,
      });

      if (!response) throw new Error("Upload failed");
      return await response.json();
    },

    async uploadBase64(base64Data, imageType, mimeType = "image/jpeg") {
      const response = await API.request("/api/images/upload-base64", {
        method: "POST",
        body: JSON.stringify({
          image_data: base64Data,
          image_type: imageType,
          mime_type: mimeType,
        }),
      });

      if (!response) throw new Error("Upload failed");
      return await response.json();
    },

    async analyze(base64Data, imageType, symptoms = "") {
      const response = await API.request("/api/images/analyze", {
        method: "POST",
        body: JSON.stringify({
          image_data: base64Data,
          image_type: imageType,
          symptoms_context: symptoms,
        }),
      });

      if (!response) throw new Error("Analysis failed");
      return await response.json();
    },
  },

  /* ==================== DOCTOR APIs ==================== */
  doctors: {
    async getAll(filters = {}) {
      const params = new URLSearchParams();

      if (filters.specialty) params.append("specialty", filters.specialty);
      if (filters.location) params.append("location", filters.location);
      if (filters.available !== undefined) {
        params.append("available", filters.available);
      }

      const queryString = params.toString();
      const endpoint = queryString
        ? `/api/doctors?${queryString}`
        : "/api/doctors";

      const response = await API.request(endpoint);
      if (!response) return { success: false, doctors: [] };
      return await response.json();
    },

    async getById(doctorId) {
      const response = await API.request(`/api/doctors/${doctorId}`);
      if (!response) return null;
      return await response.json();
    },

    async getBySpecialty(specialty) {
      const response = await API.request(
        `/api/doctors?specialty=${encodeURIComponent(specialty)}`,
      );
      if (!response) return { success: false, doctors: [] };
      return await response.json();
    },
  },

  /* ==================== CHAT APIs (NEW) ==================== */
  chat: {
    async createSession(diagnosisId = null, symptomLogId = null) {
      const response = await API.request("/api/chat/session", {
        method: "POST",
        body: JSON.stringify({
          diagnosis_id: diagnosisId,
          symptom_log_id: symptomLogId,
        }),
      });

      if (!response) throw new Error("Failed to create session");
      return await response.json();
    },

    async sendMessage(sessionId, message, useWebSearch = true) {
      const response = await API.request("/api/chat/message", {
        method: "POST",
        body: JSON.stringify({
          session_id: sessionId,
          message: message,
          use_web_search: useWebSearch,
        }),
      });

      if (!response) throw new Error("Failed to send message");
      return await response.json();
    },

    async getMessages(sessionId, limit = 50, order = "asc") {
      const response = await API.request(
        `/api/chat/session/${sessionId}/messages?limit=${limit}&order=${order}`,
      );

      if (!response) return { success: false, messages: [] };
      return await response.json();
    },

    async getUserSessions(limit = 20, activeOnly = true) {
      const response = await API.request(
        `/api/chat/sessions?limit=${limit}&active_only=${activeOnly}`,
      );

      if (!response) return { success: false, sessions: [] };
      return await response.json();
    },

    async deleteSession(sessionId) {
      const response = await API.request(`/api/chat/session/${sessionId}`, {
        method: "DELETE",
      });

      if (!response) throw new Error("Failed to delete session");
      return await response.json();
    },

    async archiveSession(sessionId) {
      const response = await API.request(
        `/api/chat/session/${sessionId}/archive`,
        { method: "POST" },
      );

      if (!response) throw new Error("Failed to archive session");
      return await response.json();
    },

    async getSuggestions(sessionId) {
      const response = await API.request(`/api/chat/suggestions/${sessionId}`);

      if (!response) return { success: false, suggestions: [] };
      return await response.json();
    },

    async clearSession(sessionId) {
      const response = await API.request(
        `/api/chat/session/${sessionId}/clear`,
        { method: "POST" },
      );

      if (!response) throw new Error("Failed to clear session");
      return await response.json();
    },

    async checkHealth() {
      try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/api/chat/health`);

        if (!response) return { success: false };
        return await response.json();
      } catch (e) {
        return { success: false, error: e.message };
      }
    },
  },

  /* ==================== ADMIN APIs ==================== */
  admin: {
    async getStats() {
      const response = await API.request("/api/admin/stats");
      if (!response) return null;
      return await response.json();
    },

    async getAllUsers(page = 1, limit = 10, filters = {}) {
      const params = new URLSearchParams({ page, limit });
      if (filters.role) params.append("role", filters.role);
      if (filters.status) params.append("status", filters.status);

      const response = await API.request(`/api/admin/users?${params}`);
      if (!response) return { success: false, users: [] };
      return await response.json();
    },

    async getUserById(userId) {
      const response = await API.request(`/api/admin/users/${userId}`);
      if (!response) return null;
      return await response.json();
    },

    async updateUser(userId, userData) {
      const response = await API.request(`/api/admin/users/${userId}`, {
        method: "PUT",
        body: JSON.stringify(userData),
      });

      if (!response) throw new Error("Update failed");
      return await response.json();
    },

    async deleteUser(userId) {
      const response = await API.request(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });

      if (!response) throw new Error("Delete failed");
      return await response.json();
    },

    async getUserHistory(userId) {
      const response = await API.request(`/api/admin/users/${userId}/history`);
      if (!response) return { success: false, history: [] };
      return await response.json();
    },

    async getAllDoctors(page = 1, limit = 10) {
      const response = await API.request(
        `/api/admin/doctors?page=${page}&limit=${limit}`,
      );
      if (!response) return { success: false, doctors: [] };
      return await response.json();
    },

    async addDoctor(doctorData) {
      const response = await API.request("/api/admin/doctors", {
        method: "POST",
        body: JSON.stringify(doctorData),
      });

      if (!response) throw new Error("Add failed");
      return await response.json();
    },

    async updateDoctor(doctorId, doctorData) {
      const response = await API.request(`/api/admin/doctors/${doctorId}`, {
        method: "PUT",
        body: JSON.stringify(doctorData),
      });

      if (!response) throw new Error("Update failed");
      return await response.json();
    },

    async deleteDoctor(doctorId) {
      const response = await API.request(`/api/admin/doctors/${doctorId}`, {
        method: "DELETE",
      });

      if (!response) throw new Error("Delete failed");
      return await response.json();
    },

    async getDiagnoses(limit = 10, page = 1) {
      const response = await API.request(
        `/api/admin/diagnoses?limit=${limit}&page=${page}`,
      );
      if (!response) return { success: false, diagnoses: [] };
      return await response.json();
    },

    async getActivity(limit = 10) {
      const response = await API.request(`/api/admin/activity?limit=${limit}`);
      if (!response) return { success: false, activities: [] };
      return await response.json();
    },
  },

  /* ==================== HEALTH CHECK APIs ==================== */
  health: {
    async checkAll() {
      const checks = {
        api: false,
        database: false,
        ai: false,
        storage: false,
        search: false,
      };

      try {
        const apiRes = await fetch(`${CONFIG.API_BASE_URL}/api/health`);
        checks.api = apiRes.ok;
      } catch (e) {
        checks.api = false;
      }

      try {
        const dbRes = await fetch(`${CONFIG.API_BASE_URL}/api/health/db`);
        checks.database = dbRes.ok;
      } catch (e) {
        checks.database = false;
      }

      try {
        const aiRes = await fetch(`${CONFIG.API_BASE_URL}/api/health/ai`);
        checks.ai = aiRes.ok;
      } catch (e) {
        checks.ai = false;
      }

      try {
        const storRes = await fetch(
          `${CONFIG.API_BASE_URL}/api/health/storage`,
        );
        checks.storage = storRes.ok;
      } catch (e) {
        checks.storage = false;
      }

      try {
        const searchRes = await fetch(
          `${CONFIG.API_BASE_URL}/api/health/search`,
        );
        checks.search = searchRes.ok;
      } catch (e) {
        checks.search = false;
      }

      return checks;
    },

    async ping() {
      try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/api/health`, {
          method: "GET",
        });
        return response.ok;
      } catch (e) {
        return false;
      }
    },
  },
};

/* ==================== API HELPERS ==================== */

async function analyzeSymptoms(payload) {
  return await API.symptoms.analyze(payload);
}

async function getUserHistory(limit = 5) {
  return await API.symptoms.getHistory(limit);
}

async function getDoctors(filters = {}) {
  return await API.doctors.getAll(filters);
}

async function uploadImage(file, type) {
  return await API.images.upload(file, type);
}

/* ==================== ERROR HANDLER ==================== */
function handleAPIError(error, defaultMessage = "Something went wrong") {
  console.error("API Error:", error);

  if (error.message === "Failed to fetch") {
    return "Cannot connect to server. Please check your internet connection.";
  }

  if (error.message === "Network error. Please check your connection.") {
    return error.message;
  }

  return error.message || defaultMessage;
}

/* ==================== REQUEST TIMEOUT ==================== */
async function fetchWithTimeout(url, options = {}, timeout = 30000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    if (error.name === "AbortError") {
      throw new Error("Request timed out. Please try again.");
    }
    throw error;
  }
}

/* ==================== RETRY LOGIC ==================== */
async function fetchWithRetry(url, options = {}, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
    }
  }
}
