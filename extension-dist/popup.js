// Configuration
// Try to get the URL from storage, fall back to Replit URL if not found
// IMPORTANT: HTTPS is required for Chrome extensions due to security restrictions
let API_BASE_URL = 'https://policybotai.replit.app';

// Replit automatically adds HTTPS for production deployments

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
      
      // Attempt login
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

      const data = await response.json();
      
      if (!data.success || !data.apiKey) {
        throw new Error('Invalid server response: API key not received');
      }
      
      // Save user data and API key in storage
      apiKey = data.apiKey;
      currentUser = data.user;
      
      chrome.storage.local.set({ 
        user: data.user,
        apiKey: data.apiKey,
        apiBaseUrl: loginUrl,
        loggedIn: true
      });
      
      // Update the background script with the new API key
      chrome.runtime.sendMessage({
        action: 'updateApiInfo',
        data: {
          apiKey: data.apiKey,
          apiBaseUrl: loginUrl
        }
      });
      
      // Update the UI
      updateUserInterface();
      
      // Reset form and button
      authForm.reset();
      submitBtn.textContent = originalBtnText;
      submitBtn.disabled = false;
      
      // Indicate success with a message that fades away
      const resultBox = document.createElement('div');
      resultBox.textContent = 'Login successful!';
      resultBox.style.color = 'green';
      resultBox.style.padding = '10px';
      resultBox.style.textAlign = 'center';
      resultBox.style.fontWeight = 'bold';
      loginForm.after(resultBox);
      
      setTimeout(() => {
        resultBox.remove();
      }, 3000);
    } catch (error) {
      console.error('Login error:', error);
      
      // Display the error message to the user
      const errorBox = document.createElement('div');
      errorBox.className = 'error-item';
      errorBox.textContent = error.message || 'Login failed. Please check your credentials.';
      errorBox.style.color = 'red';
      errorBox.style.padding = '10px';
      errorBox.style.marginTop = '10px';
      errorBox.style.border = '1px solid red';
      errorBox.style.borderRadius = '4px';
      errorBox.style.backgroundColor = '#ffebee';
      
      // Add error hint if needed
      if (error.message && error.message.includes('Failed to fetch')) {
        const errorHint = document.createElement('div');
        errorHint.className = 'error-hint';
        errorHint.innerHTML = `
          <p>This might be due to:</p>
          <ul>
            <li>Server unavailable or unreachable</li>
            <li>CORS policy restrictions</li>
            <li>Network connectivity issues</li>
          </ul>
          <p>Make sure the API URL is correct and the server is running.</p>
        `;
        errorBox.appendChild(errorHint);
      }
      
      const formActions = document.querySelector('.form-actions');
      formActions.after(errorBox);
      
      // Reset the button
      const submitBtn = document.getElementById('submit-login');
      submitBtn.textContent = 'Login';
      submitBtn.disabled = false;
      
      // Auto-remove the error message after 10 seconds
      setTimeout(() => {
        errorBox.remove();
      }, 10000);
    }
  }

  // Handle logout
  function handleLogout() {
    // Clear local storage
    chrome.storage.local.remove(['apiKey', 'user', 'loggedIn']);
    
    // Update background script
    chrome.runtime.sendMessage({
      action: 'updateApiInfo',
      data: {
        apiKey: null
      }
    });
    
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
      resultsContent.innerHTML = `
        <div class="result-item">
          <div style="display: flex; align-items: center; justify-content: center; padding: 20px;">
            <div style="border: 3px solid #f3f3f3; border-radius: 50%; border-top: 3px solid #1a73e8; width: 24px; height: 24px; animation: spin 1s linear infinite; margin-right: 10px;"></div>
            <p>Searching policies for: "${query}"...</p>
          </div>
        </div>
        <style>
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      `;
      resultsSection.classList.remove('hidden');
      
      // Disable search button during request
      const searchButtonOrigText = searchBtn.textContent;
      searchBtn.textContent = 'Searching...';
      searchBtn.disabled = true;
      
      // Ask background script to do the search (it has the API key)
      chrome.runtime.sendMessage({
        action: 'searchPolicies',
        data: { query }
      }, response => {
        // Re-enable search button
        searchBtn.textContent = searchButtonOrigText;
        searchBtn.disabled = false;
        
        if (response.success) {
          // Add this search to history
          addToSearchHistory(query, response.result);
          
          // Display results
          displaySearchResults(response.result, query);
        } else {
          // Show error
          resultsContent.innerHTML = `
            <div class="result-item error">
              <h4>Search Error</h4>
              <p>${response.error || 'Failed to search policies. Please try again.'}</p>
              <div class="error-hint">
                This might be due to a server error or network issue. Please try again or contact your administrator.
              </div>
            </div>
          `;
        }
      });
    } catch (error) {
      console.error('Search error:', error);
      
      // Re-enable search button
      searchBtn.textContent = 'Search';
      searchBtn.disabled = false;
      
      // Show error
      resultsContent.innerHTML = `
        <div class="result-item error">
          <h4>Search Error</h4>
          <p>${error.message || 'Failed to search policies. Please try again.'}</p>
        </div>
      `;
    }
  }

  // Display search results
  function displaySearchResults(result, query) {
    // Clear previous results
    resultsContent.innerHTML = '';
    
    // Calculate confidence percentage for display
    const confidencePercentage = Math.round((result.confidence || 0) * 100);
    
    // Create result HTML
    const resultHtml = `
      <div class="result-item">
        <h4>Search Results for: "${query}"</h4>
        <p>${result.answer || 'No answer found'}</p>
        <div class="result-meta">
          ${result.policyName ? `<span>Source: ${result.policyName}</span>` : ''}
          <div class="confidence">
            Confidence: 
            <div class="confidence-bar">
              <div class="confidence-level" style="width: ${confidencePercentage}%;"></div>
            </div>
            ${confidencePercentage}%
          </div>
        </div>
      </div>
    `;
    
    resultsContent.innerHTML = resultHtml;
  }

  // Add search to history
  function addToSearchHistory(query, result) {
    // Add to front of array (most recent first)
    searchHistory.unshift({
      query,
      result,
      timestamp: new Date().toISOString()
    });
    
    // Limit to 10 entries
    if (searchHistory.length > 10) {
      searchHistory = searchHistory.slice(0, 10);
    }
    
    // Save to storage
    chrome.storage.local.set({ searchHistory });
    
    // Update UI
    updateRecentSearches();
  }

  // Update recent searches list
  function updateRecentSearches() {
    if (!searchHistory || searchHistory.length === 0) {
      recentSearches.classList.add('hidden');
      return;
    }
    
    recentSearches.classList.remove('hidden');
    recentSearchesList.innerHTML = '';
    
    searchHistory.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item.query;
      li.addEventListener('click', () => {
        // Set the search input to this query
        searchInput.value = item.query;
        
        // Show the result directly
        resultsSection.classList.remove('hidden');
        displaySearchResults(item.result, item.query);
      });
      
      recentSearchesList.appendChild(li);
    });
  }

  // Open the main app dashboard
  function openDashboard() {
    const url = normalizeUrl(API_BASE_URL);
    chrome.tabs.create({ url });
  }

  // Run initialization
  init();
});