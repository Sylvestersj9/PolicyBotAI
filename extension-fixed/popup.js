// Configuration
const API_BASE_URL = 'http://localhost:5000';

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
  function init() {
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
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });
      
      if (!response.ok) {
        throw new Error('Login failed');
      }
      
      const userData = await response.json();
      
      // Get API key
      const keyResponse = await fetch(`${API_BASE_URL}/api/extension/generate-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Include cookies for session authentication
      });
      
      if (!keyResponse.ok) {
        throw new Error('Failed to get API key');
      }
      
      const keyData = await keyResponse.json();
      apiKey = keyData.apiKey;
      
      // Save to local storage
      currentUser = userData;
      chrome.storage.local.set({ apiKey, user: userData });
      
      updateUserInterface();
      loginForm.classList.add('hidden');
    } catch (error) {
      console.error('Login error:', error);
      alert('Login failed. Please check your credentials and try again.');
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
      
      const response = await fetch(`${API_BASE_URL}/api/extension/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey
        },
        body: JSON.stringify({ query })
      });
      
      if (!response.ok) {
        throw new Error('Search failed');
      }
      
      const result = await response.json();
      
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
    } catch (error) {
      console.error('Search error:', error);
      resultsContent.innerHTML = '<p>Error: Failed to search policies. Please try again later.</p>';
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