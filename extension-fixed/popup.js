// Configuration
// Try to get the URL from storage, fall back to custom domain if not found
// IMPORTANT: HTTPS is required for Chrome extensions due to security restrictions
let API_BASE_URL = 'https://policybotai.replit.app'; // Default API URL

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
  // Normalize the URL before saving
  if (url) {
    // Remove trailing slashes
    while (url.endsWith('/')) {
      url = url.slice(0, -1);
    }
    
    // Ensure https:// prefix
    if (url.toLowerCase().startsWith('http://')) {
      url = 'https://' + url.substring(7);
    } else if (!url.toLowerCase().startsWith('https://')) {
      url = 'https://' + url;
    }
    
    // Ensure proper casing (lowercase for protocol)
    if (url.toUpperCase().startsWith('HTTPS://')) {
      url = 'https://' + url.substring(8);
    }
  }
  
  console.log("Saving normalized API URL:", url);
  // Save to local storage
  chrome.storage.local.set({ apiBaseUrl: url });
  
  // Also update the background script
  chrome.runtime.sendMessage({
    action: 'updateApiInfo',
    data: { apiBaseUrl: url }
  });
  
  API_BASE_URL = url;
}

// Normalize URL for security and consistency
function normalizeUrl(url) {
  if (!url) return url;
  
  // Fix capitalization issues in HTTPS
  if (url.toUpperCase().startsWith('HTTPS://')) {
    url = 'https://' + url.substring(8);
  }
  
  // Convert HTTP to HTTPS
  if (url.toLowerCase().startsWith('http://')) {
    console.log("Converting HTTP URL to HTTPS for security reasons");
    url = 'https://' + url.substring(7);
  }
  
  // Add https:// if missing
  if (!url.toLowerCase().startsWith('https://')) {
    console.log("Adding HTTPS protocol to URL");
    url = 'https://' + url;
  }
  
  // Remove any trailing slashes
  while (url.endsWith('/')) {
    url = url.slice(0, -1);
  }
  
  return url;
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
        
        // Update background script with API key
        chrome.runtime.sendMessage({
          action: 'updateApiInfo',
          data: { apiKey: result.apiKey }
        });
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
      usernameDisplay.textContent = currentUser.username || 'User';
      loginBtn.classList.add('hidden');
      logoutBtn.classList.remove('hidden');
      loginForm.classList.add('hidden');
      
      // Show recent searches section if available
      if (searchHistory && searchHistory.length > 0) {
        recentSearches.classList.remove('hidden');
        updateRecentSearches();
      }
    } else {
      usernameDisplay.textContent = 'Not logged in';
      loginBtn.classList.remove('hidden');
      logoutBtn.classList.add('hidden');
      recentSearches.classList.add('hidden');
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
      
      // Normalize URL for security
      const loginUrl = normalizeUrl(API_BASE_URL);
      
      console.log(`Sending login request to: ${loginUrl}/api/extension/login`);
      
      // Add more detailed debugging information
      const requestStartTime = new Date().getTime();
      
      // Attempt login via the extension-specific login endpoint
      let response;
      try {
        response = await Promise.race([
          fetch(`${loginUrl}/api/extension/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            cache: 'no-cache',
            mode: 'cors',
            credentials: 'omit', // Don't include cookies for extensions
            body: JSON.stringify({ username, password })
          }),
          // Add a timeout to better diagnose network issues
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timed out after 15 seconds')), 15000)
          )
        ]);
        
        const requestEndTime = new Date().getTime();
        console.log(`Request completed in ${requestEndTime - requestStartTime}ms`);
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
        }
        throw new Error(errorMessage);
      }

      let userData;
      try {
        userData = await response.json();
      } catch (e) {
        throw new Error('Invalid response format from server. Expected JSON.');
      }
      
      // We already have the API key from the extension/login response
      if (userData && userData.apiKey) {
        console.log("API key obtained directly from login response");
        apiKey = userData.apiKey;
      } else {
        console.error("No API key in login response");
        throw new Error("Login succeeded but no API key was provided");
      }
      
      // We don't need to make an additional API call for the key anymore
      
      // Save to local storage
      currentUser = userData;
      chrome.storage.local.set({ 
        apiKey: apiKey, // We already have the apiKey from userData
        user: userData,
        apiBaseUrl: loginUrl
      });
      
      // Update the background script with the new API key
      chrome.runtime.sendMessage({
        action: 'updateApiInfo',
        data: {
          apiKey: apiKey, // We already have the apiKey from userData
          apiBaseUrl: loginUrl
        }
      });
      
      // Update the UI
      updateUserInterface();
      
      // Reset form and button
      authForm.reset();
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
      
      console.log(`Searching with query: "${query}" at ${API_BASE_URL}/api/extension/search`);
      
      // Normalize URL for security
      const searchUrl = normalizeUrl(API_BASE_URL);
      
      console.log(`Searching with query: "${query}" at ${searchUrl}/api/extension/search with key ${apiKey.substring(0, 5)}...`);
      
      const response = await Promise.race([
        fetch(`${searchUrl}/api/extension/search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-API-Key': apiKey
          },
          cache: 'no-cache',
          mode: 'cors',
          body: JSON.stringify({ query })
        }),
        // Add a timeout to better diagnose network issues
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timed out after 30 seconds')), 30000)
        )
      ]);
      
      if (!response.ok) {
        let errorMessage = 'Search failed';
        try {
          // Try to parse error message from response
          const errorData = await response.json();
          if (errorData && errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (e) {
          // If response isn't JSON, use text or status
          errorMessage = `Search failed with status ${response.status}`;
        }
        throw new Error(errorMessage);
      }
      
      let result;
      try {
        result = await response.json();
      } catch (e) {
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
    chrome.tabs.create({ url: API_BASE_URL });
  }

  // Initialize the extension
  init();
});