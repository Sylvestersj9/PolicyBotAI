// Configuration
// Try to get the URL from storage, fall back to Replit URL if not found
// IMPORTANT: HTTPS is required for Chrome extensions due to security restrictions
let API_BASE_URL = 'https://your-server-url.repl.co';

// Make sure you update this with your actual Replit URL before using the extension

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
        
        // Fix capitalization issues in HTTPS
        if (loginUrl.toUpperCase().startsWith('HTTPS://')) {
          loginUrl = 'https://' + loginUrl.substring(8);
        }
        
        // Convert HTTP to HTTPS
        if (loginUrl.toLowerCase().startsWith('http://')) {
          console.log("Converting HTTP URL to HTTPS for security reasons");
          loginUrl = 'https://' + loginUrl.substring(7);
        }
        
        // Add https:// if missing
        if (!loginUrl.toLowerCase().startsWith('https://')) {
          console.log("Adding HTTPS protocol to URL");
          loginUrl = 'https://' + loginUrl;
        }
        
        // Remove any trailing slashes
        while (loginUrl.endsWith('/')) {
          loginUrl = loginUrl.slice(0, -1);
        }
        
        console.log(`Sending login request to: ${loginUrl}/api/login`);
        console.log(`Request payload: ${JSON.stringify({ username, password })}`);
        
        // Add more detailed debugging information
        const requestStartTime = new Date().getTime();
        
        try {
          response = await Promise.race([
            fetch(`${loginUrl}/api/login`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              credentials: 'include', // Include cookies
              mode: 'cors', // Explicitly request CORS mode
              cache: 'no-cache', // Don't cache this request
              redirect: 'follow', // Follow any redirects
              body: JSON.stringify({ username, password })
            }),
            // Add a timeout to better diagnose network issues
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Request timed out after 15 seconds')), 15000)
            )
          ]);
          
          const requestEndTime = new Date().getTime();
          console.log(`Request completed in ${requestEndTime - requestStartTime}ms`);
        } catch (innerError) {
          console.error("Inner fetch error details:", innerError);
          throw innerError; // Re-throw to be caught by the outer catch
        }
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
        // First, try to get the text response to debug
        const responseText = await response.text();
        console.log("Login raw response:", responseText);
        
        // Try to parse it as JSON
        try {
          // Check if the response text is empty
          if (!responseText || responseText.trim() === '') {
            console.error("Response was empty");
            throw new Error('Empty response from server');
          }
          
          // Try to parse JSON
          userData = JSON.parse(responseText);
          console.log("Login successful, user data:", userData);
          
          // Verify we got a valid user object
          if (!userData || !userData.id || !userData.username) {
            console.error("Invalid user data object:", userData);
            throw new Error('Server returned incomplete user data');
          }
        } catch (jsonError) {
          console.error("Error parsing JSON:", jsonError);
          console.error("Response was not valid JSON:", responseText);
          
          // Add comprehensive diagnostics
          console.log("Response length:", responseText ? responseText.length : 0);
          console.log("Response first 100 chars:", responseText ? responseText.substring(0, 100) : 'empty');
          console.log("Response content type:", response.headers.get('content-type'));
          
          throw new Error(`Invalid response format from server. Check the console for details. Response preview: ${responseText ? responseText.substring(0, 30) : 'empty'}`);
        }
      } catch (e) {
        console.error("Error handling response:", e);
        throw new Error('Error processing server response: ' + e.message);
      }
      
      // Get API key
      // Make sure to use HTTPS for the API key URL too
      let keyUrl = loginUrl; // Use the same URL we used for login (already converted to HTTPS if needed)
      
      console.log(`Attempting to get API key from: ${keyUrl}/api/extension/generate-key`);
      let keyResponse;
      try {
        const apiKeyRequestStartTime = new Date().getTime();
        
        try {
          keyResponse = await Promise.race([
            fetch(`${keyUrl}/api/extension/generate-key`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              credentials: 'include', // Include cookies for session authentication
              mode: 'cors', // Explicitly request CORS mode
              cache: 'no-cache', // Don't cache this request
              redirect: 'follow' // Follow any redirects
            }),
            // Add a timeout to better diagnose network issues
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('API key request timed out after 15 seconds')), 15000)
            )
          ]);
          
          const apiKeyRequestEndTime = new Date().getTime();
          console.log(`API key request completed in ${apiKeyRequestEndTime - apiKeyRequestStartTime}ms`);
        } catch (innerError) {
          console.error("Inner fetch error details during API key request:", innerError);
          throw innerError; // Re-throw to be caught by the outer catch
        }
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
      
      // Fix capitalization issues in HTTPS
      if (searchUrl.toUpperCase().startsWith('HTTPS://')) {
        searchUrl = 'https://' + searchUrl.substring(8);
      }
      
      // Convert HTTP to HTTPS
      if (searchUrl.toLowerCase().startsWith('http://')) {
        console.log("Converting HTTP URL to HTTPS for security reasons");
        searchUrl = 'https://' + searchUrl.substring(7);
      }
      
      // Add https:// if missing
      if (!searchUrl.toLowerCase().startsWith('https://')) {
        console.log("Adding HTTPS protocol to URL");
        searchUrl = 'https://' + searchUrl;
      }
      
      // Remove any trailing slashes
      while (searchUrl.endsWith('/')) {
        searchUrl = searchUrl.slice(0, -1);
      }
      
      console.log(`Searching with query: "${query}" at ${searchUrl}/api/extension/search`);
      
      let response;
      try {
        console.log(`Sending search request with API key: ${apiKey ? 'present (hidden)' : 'missing'}`);
        const searchRequestStartTime = new Date().getTime();
        
        try {
          response = await Promise.race([
            fetch(`${searchUrl}/api/extension/search`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-API-Key': apiKey
              },
              mode: 'cors', // Explicitly request CORS mode
              cache: 'no-cache', // Don't cache this request
              redirect: 'follow', // Follow any redirects
              body: JSON.stringify({ query })
            }),
            // Add a timeout to better diagnose network issues
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Search request timed out after 15 seconds')), 15000)
            )
          ]);
          
          const searchRequestEndTime = new Date().getTime();
          console.log(`Search request completed in ${searchRequestEndTime - searchRequestStartTime}ms`);
        } catch (innerError) {
          console.error("Inner fetch error details during search:", innerError);
          throw innerError; // Re-throw to be caught by the outer catch
        }
        
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
    
    // Fix capitalization issues in HTTPS
    if (dashboardUrl.toUpperCase().startsWith('HTTPS://')) {
      dashboardUrl = 'https://' + dashboardUrl.substring(8);
    }
    
    // Convert HTTP to HTTPS
    if (dashboardUrl.toLowerCase().startsWith('http://')) {
      console.log("Converting dashboard HTTP URL to HTTPS");
      dashboardUrl = 'https://' + dashboardUrl.substring(7);
    }
    
    // Add https:// if missing
    if (!dashboardUrl.toLowerCase().startsWith('https://')) {
      console.log("Adding HTTPS protocol to dashboard URL");
      dashboardUrl = 'https://' + dashboardUrl;
    }
    
    // Remove any trailing slashes
    while (dashboardUrl.endsWith('/')) {
      dashboardUrl = dashboardUrl.slice(0, -1);
    }
    
    chrome.tabs.create({ url: dashboardUrl });
  }

  // Initialize the extension
  init();
});