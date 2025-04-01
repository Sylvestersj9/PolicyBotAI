// Configuration
// Try to get the URL from storage, fall back to Replit URL if not found
// IMPORTANT: HTTPS is required for Chrome extensions due to security restrictions
let API_BASE_URL = 'https://yourreplit.repl.co';

// Function to get stored API URL or use default
function getApiBaseUrl() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['apiBaseUrl'], (result) => {
      if (result.apiBaseUrl) {
        resolve(result.apiBaseUrl);
      } else {
        resolve(API_BASE_URL);
      }
    });
  });
}

// Function to save API URL
function saveApiBaseUrl(url) {
  chrome.storage.local.set({ apiBaseUrl: url });
  API_BASE_URL = url;
}

// DOM Elements
document.addEventListener('DOMContentLoaded', function() {
  const loginForm = document.getElementById('login-form');
  const authForm = document.getElementById('auth-form');
  const usernameInput = document.getElementById('username-input');
  const passwordInput = document.getElementById('password-input');
  const loginBtn = document.getElementById('login-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const usernameDisplay = document.getElementById('username');
  const searchInput = document.getElementById('search-input');
  const searchBtn = document.getElementById('search-btn');
  const resultsSection = document.getElementById('results-section');
  const resultsContent = document.getElementById('results-content');
  const recentSearches = document.getElementById('recent-searches');
  const recentSearchesList = document.getElementById('recent-searches-list');
  const openAppLink = document.getElementById('open-app');

  // State
  let apiKey = null;
  let currentUser = null;
  let searchHistory = [];

  // Initialize the extension
  async function init() {
    // Load the API URL first
    API_BASE_URL = await getApiBaseUrl();
    
    // Add settings/configuration section to the login form
    const settingsHtml = `
      <div class="form-group api-url-config" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee;">
        <label for="api-url">API Server URL</label>
        <input type="text" id="api-url-input" value="${API_BASE_URL}" style="margin-bottom: 5px;">
        <button type="button" id="save-api-url" style="width: 100%;">Save API URL</button>
      </div>
    `;
    
    // Add settings to login form
    loginForm.insertAdjacentHTML('beforeend', settingsHtml);
    
    // Add event listener for the save API URL button
    document.getElementById('save-api-url').addEventListener('click', () => {
      const newUrl = document.getElementById('api-url-input').value.trim();
      if (newUrl) {
        saveApiBaseUrl(newUrl);
        alert(`API URL updated to: ${newUrl}`);
      }
    });
    
    // Load saved state
    chrome.storage.local.get(['apiKey', 'user', 'searchHistory'], (result) => {
      if (result.apiKey) {
        apiKey = result.apiKey;
      }
      
      if (result.user) {
        currentUser = result.user;
        updateUserInterface();
      }
      
      if (result.searchHistory) {
        searchHistory = result.searchHistory;
        updateRecentSearches();
      }
    });
    
    // Set up event listeners
    loginBtn.addEventListener('click', toggleLoginForm);
    logoutBtn.addEventListener('click', handleLogout);
    authForm.addEventListener('submit', handleLogin);
    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleSearch();
    });
    openAppLink.addEventListener('click', openDashboard);
  }

  // Update UI based on authentication state
  function updateUserInterface() {
    if (currentUser) {
      usernameDisplay.textContent = currentUser.username;
      loginBtn.classList.add('hidden');
      logoutBtn.classList.remove('hidden');
      loginForm.classList.add('hidden');
    } else {
      usernameDisplay.textContent = 'Not logged in';
      loginBtn.classList.remove('hidden');
      logoutBtn.classList.add('hidden');
    }
  }

  // Toggle login form visibility
  function toggleLoginForm() {
    loginForm.classList.toggle('hidden');
  }

  // Handle login form submission
  async function handleLogin(e) {
    e.preventDefault();
    
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    
    if (!username || !password) {
      alert('Please enter both username and password');
      return;
    }
    
    try {
      // Show loading/progress indicator
      const submitBtn = document.getElementById('submit-login');
      const originalBtnText = submitBtn.textContent;
      submitBtn.textContent = 'Logging in...';
      submitBtn.disabled = true;
      
      console.log(`Attempting login to: ${API_BASE_URL}/api/login`);
      
      // First, try a direct login (will work with CORS enabled servers)
      let response;
      try {
        // Make sure the URL is HTTPS, not HTTP (Chrome security restriction)
        let loginUrl = API_BASE_URL;
        if (loginUrl.startsWith('http://')) {
          console.log("Converting HTTP URL to HTTPS for security reasons");
          loginUrl = loginUrl.replace('http://', 'https://');
        }
        
        console.log(`Sending login request to: ${loginUrl}/api/login`);
        
        response = await fetch(`${loginUrl}/api/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          credentials: 'include', // Include cookies
          body: JSON.stringify({ username, password })
        });
      } catch (fetchError) {
        console.error("Fetch error during login:", fetchError);
        throw new Error(`Network error: ${fetchError.message}. Make sure you're using HTTPS in the API URL and the server is running.`);
      }
      
      if (!response.ok) {
        let errorMessage = 'Login failed';
        try {
          // Try to parse error message from response
          const errorData = await response.json();
          if (errorData && errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (e) {
          // If response isn't JSON, use text or status
          errorMessage = `Login failed with status ${response.status}`;
          try {
            const textError = await response.text();
            if (textError) {
              errorMessage += `: ${textError}`;
            }
          } catch (_) {
            // Ignore if we can't get text
          }
        }
        throw new Error(errorMessage);
      }
      
      let userData;
      try {
        userData = await response.json();
        console.log("Login successful, user data:", userData);
      } catch (e) {
        console.error("Error parsing user data:", e);
        throw new Error('Invalid response format from server. Expected JSON.');
      }
      
      // Get API key
      // Make sure to use HTTPS for the API key URL too
      let keyUrl = loginUrl; // Use the same URL we used for login (already converted to HTTPS if needed)
      
      console.log(`Attempting to get API key from: ${keyUrl}/api/extension/generate-key`);
      let keyResponse;
      try {
        keyResponse = await fetch(`${keyUrl}/api/extension/generate-key`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          credentials: 'include' // Include cookies for session authentication
        });
      } catch (fetchError) {
        console.error("Fetch error during API key generation:", fetchError);
        throw new Error(`Network error during API key generation: ${fetchError.message}. Make sure you're using HTTPS.`);
      }
      
      if (!keyResponse.ok) {
        let errorMessage = 'Failed to get API key';
        try {
          const errorData = await keyResponse.json();
          if (errorData && errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (e) {
          errorMessage = `API key generation failed with status ${keyResponse.status}`;
          try {
            const textError = await keyResponse.text();
            console.error("API key error response:", textError);
          } catch (_) {
            // Ignore if we can't get text
          }
        }
        throw new Error(errorMessage);
      }
      
      let keyData;
      try {
        keyData = await keyResponse.json();
        console.log("API key response received:", keyData);
        if (!keyData || !keyData.apiKey) {
          throw new Error('No API key returned from server');
        }
      } catch (e) {
        console.error("Error parsing API key response:", e);
        throw new Error('Invalid response format from server. Expected JSON with apiKey property.');
      }
      
      apiKey = keyData.apiKey;
      
      // Save to local storage
      currentUser = userData;
      chrome.storage.local.set({ apiKey, user: userData });
      
      updateUserInterface();
      loginForm.classList.add('hidden');
      
      // Reset button state
      submitBtn.textContent = originalBtnText;
      submitBtn.disabled = false;
      
    } catch (error) {
      console.error('Login error:', error);
      // Reset button state
      const submitBtn = document.getElementById('submit-login');
      if (submitBtn) {
        submitBtn.textContent = 'Login';
        submitBtn.disabled = false;
      }
      
      alert(`Login error: ${error.message}`);
    }
  }

  // Handle logout
  function handleLogout() {
    // Clear local storage
    chrome.storage.local.remove(['apiKey', 'user']);
    apiKey = null;
    currentUser = null;
    
    updateUserInterface();
  }

  // Handle search
  async function handleSearch() {
    const query = searchInput.value.trim();
    
    if (!query) {
      alert('Please enter a search query');
      return;
    }
    
    if (!apiKey) {
      alert('Please log in to search policies');
      toggleLoginForm();
      return;
    }
    
    try {
      // Show loading state
      resultsContent.innerHTML = '<p>Searching policies...</p>';
      resultsSection.classList.remove('hidden');
      
      // Disable search button during request
      const searchButtonOrigText = searchBtn.textContent;
      searchBtn.textContent = 'Searching...';
      searchBtn.disabled = true;
      
      // Make sure the URL is HTTPS, not HTTP (Chrome security restriction)
      let searchUrl = API_BASE_URL;
      if (searchUrl.startsWith('http://')) {
        console.log("Converting HTTP URL to HTTPS for security reasons");
        searchUrl = searchUrl.replace('http://', 'https://');
      }
      
      console.log(`Searching with query: "${query}" at ${searchUrl}/api/extension/search`);
      
      let response;
      try {
        response = await fetch(`${searchUrl}/api/extension/search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-API-Key': apiKey
          },
          body: JSON.stringify({ query })
        });
        console.log("Search response status:", response.status);
      } catch (fetchError) {
        console.error("Fetch error during search:", fetchError);
        throw new Error(`Network error during search: ${fetchError.message}. Make sure you're using HTTPS in the API URL and the server is running.`);
      }
      
      if (!response.ok) {
        let errorMessage = 'Search failed';
        try {
          // Try to parse error message from response
          const errorData = await response.json();
          console.error("Error data from server:", errorData);
          if (errorData && errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (e) {
          // If response isn't JSON, use text or status
          errorMessage = `Search failed with status ${response.status}`;
          try {
            const textError = await response.text();
            console.error("Error text from server:", textError);
            if (textError) {
              errorMessage += `: ${textError}`;
            }
          } catch (_) {
            // Ignore if we can't get text
          }
        }
        throw new Error(errorMessage);
      }
      
      let result;
      try {
        result = await response.json();
        console.log("Search result:", result);
      } catch (e) {
        console.error("Error parsing search result:", e);
        throw new Error('Invalid response format from server. Expected JSON.');
      }
      
      // Update search history
      const newSearch = {
        query,
        timestamp: new Date().toISOString(),
        result
      };
      searchHistory = [newSearch, ...searchHistory.slice(0, 4)];
      chrome.storage.local.set({ searchHistory });
      updateRecentSearches();
      
      // Display results
      displaySearchResults(result, query);
      
      // Reset search button
      searchBtn.textContent = searchButtonOrigText;
      searchBtn.disabled = false;
    } catch (error) {
      console.error('Search error:', error);
      
      // Reset search button
      searchBtn.textContent = 'Search';
      searchBtn.disabled = false;
      
      resultsContent.innerHTML = `<p>Error: ${error.message}</p>
        <p>Please check your connection and API URL settings.</p>
        <p>Current API URL: ${API_BASE_URL}</p>
        <button id="fix-api-url" class="error-action">Update API URL</button>`;
      
      // Add event listener to the fix button
      document.getElementById('fix-api-url')?.addEventListener('click', () => {
        toggleLoginForm();
        // Focus the API URL input
        setTimeout(() => {
          const apiUrlInput = document.getElementById('api-url-input');
          if (apiUrlInput) {
            apiUrlInput.focus();
          }
        }, 100);
      });
    }
  }

  // Display search results
  function displaySearchResults(result, query) {
    let html = '';
    
    if (result.policyId) {
      const confidencePercent = Math.round(result.confidence * 100);
      
      html = `
        <div class="result-item">
          <h4>${result.policyTitle || 'Policy'}</h4>
          <p>${result.answer}</p>
          <div class="result-meta">
            <span>Reference: Policy #${result.policyId}</span>
            <div class="confidence">
              <span>${confidencePercent}%</span>
              <div class="confidence-bar">
                <div class="confidence-level" style="width: ${confidencePercent}%"></div>
              </div>
            </div>
          </div>
        </div>
      `;
    } else {
      html = `
        <div class="result-item">
          <p>${result.answer}</p>
        </div>
      `;
    }
    
    resultsContent.innerHTML = html;
  }

  // Update recent searches list
  function updateRecentSearches() {
    if (searchHistory.length > 0) {
      recentSearches.classList.remove('hidden');
      recentSearchesList.innerHTML = '';
      
      searchHistory.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item.query;
        li.addEventListener('click', () => {
          searchInput.value = item.query;
          displaySearchResults(item.result, item.query);
          resultsSection.classList.remove('hidden');
        });
        recentSearchesList.appendChild(li);
      });
    } else {
      recentSearches.classList.add('hidden');
    }
  }

  // Open the main dashboard
  function openDashboard() {
    // Make sure we use HTTPS for opening the dashboard too
    let dashboardUrl = API_BASE_URL;
    if (dashboardUrl.startsWith('http://')) {
      console.log("Converting dashboard HTTP URL to HTTPS");
      dashboardUrl = dashboardUrl.replace('http://', 'https://');
    }
    chrome.tabs.create({ url: dashboardUrl });
  }

  // Initialize the extension
  init();
});