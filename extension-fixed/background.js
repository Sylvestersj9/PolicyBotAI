// Background script for PolicyBot AI extension
// Handles background tasks and communications

// Global state
let apiKey = null;
let apiBaseUrl = 'https://policybotai.replit.app'; // Default API URL

// Load stored API key and URL when background script starts
chrome.storage.local.get(['apiKey', 'apiBaseUrl', 'user'], (result) => {
  if (result.apiKey) {
    apiKey = result.apiKey;
    console.log('API key loaded from storage');
  }
  
  if (result.apiBaseUrl) {
    apiBaseUrl = result.apiBaseUrl;
    console.log('API URL loaded from storage:', apiBaseUrl);
  }
});

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('PolicyBot AI extension installed');
  
  // Create a context menu item for searching selected text
  chrome.contextMenus.create({
    id: 'searchPolicies',
    title: 'Search policies for "%s"',
    contexts: ['selection']
  });

  // Create a context menu item for the extension icon
  chrome.contextMenus.create({
    id: 'openPolicyHub',
    title: 'Open PolicyBot Dashboard',
    contexts: ['action']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'searchPolicies') {
    const query = info.selectionText;
    
    // Make sure we have an API key
    if (!apiKey) {
      // We need to alert the user that they need to log in first
      chrome.tabs.sendMessage(tab.id, {
        action: 'showNotification',
        data: {
          type: 'error',
          message: 'Please log in to PolicyBot first by clicking the extension icon'
        }
      });
      return;
    }
    
    // Send message to the content script to show a loading popup
    chrome.tabs.sendMessage(tab.id, {
      action: 'showLoadingPopup',
      data: { query }
    });
    
    // Make API request to search the policies
    searchPolicies(query)
      .then(result => {
        // Send the search result to the content script
        chrome.tabs.sendMessage(tab.id, {
          action: 'showSearchResult',
          data: { query, result }
        });
      })
      .catch(error => {
        console.error('Search error:', error);
        chrome.tabs.sendMessage(tab.id, {
          action: 'showSearchError',
          data: { 
            query,
            error: error.message || 'Failed to search policies'
          }
        });
      });
  } else if (info.menuItemId === 'openPolicyHub') {
    chrome.tabs.create({ url: apiBaseUrl });
  }
});

// Handle messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message.action);
  
  if (message.action === 'getApiKey') {
    sendResponse({ apiKey: apiKey || null });
    return true;
  }
  
  if (message.action === 'checkAuthentication') {
    chrome.storage.local.get(['user', 'apiKey'], (result) => {
      sendResponse({ 
        isAuthenticated: !!(result.user && result.apiKey),
        user: result.user || null
      });
    });
    return true;
  }
  
  if (message.action === 'updateApiInfo') {
    // Update API key and URL
    if (message.data.apiKey) {
      apiKey = message.data.apiKey;
    }
    
    if (message.data.apiBaseUrl) {
      apiBaseUrl = message.data.apiBaseUrl;
    }
    
    console.log('API info updated in background');
    sendResponse({ success: true });
    return true;
  }
  
  if (message.action === 'searchPolicies') {
    // Handle policy search request
    const { query } = message.data;
    
    if (!apiKey) {
      sendResponse({ 
        success: false, 
        error: 'Not logged in. Please log in through the extension popup.'
      });
      return true;
    }
    
    searchPolicies(query)
      .then(result => {
        sendResponse({ success: true, result });
      })
      .catch(error => {
        console.error('Search error:', error);
        sendResponse({ 
          success: false,
          error: error.message || 'Failed to search policies'
        });
      });
    
    // Return true to indicate we'll send a response asynchronously
    return true;
  }
});

// Function to search policies using the API
async function searchPolicies(query) {
  console.log(`Searching policies for: "${query}" at ${apiBaseUrl}`);
  
  if (!apiKey) {
    throw new Error('No API key available. Please log in first.');
  }
  
  // Make sure URL is valid for fetch
  let searchUrl = apiBaseUrl;
  
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
  
  try {
    // First check if server is reachable with a health check
    try {
      console.log("Performing health check before search");
      const healthResponse = await fetch(`${searchUrl}/api/extension/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        cache: 'no-cache',
        mode: 'cors'
      });
      
      if (!healthResponse.ok) {
        throw new Error(`Server health check failed with status ${healthResponse.status}`);
      }
      
      const healthData = await healthResponse.json();
      console.log("Server health check result:", healthData);
      
      if (healthData.status !== 'ok') {
        console.warn("Server health check returned non-ok status:", healthData.status);
      }
    } catch (healthError) {
      console.error("Health check error:", healthError);
      // We'll continue with the search anyway, but log the health check failure
    }
    
    console.log(`Making search request to ${searchUrl}/api/extension/search with API key`);
    const requestStartTime = new Date().getTime();
    
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
    
    const requestEndTime = new Date().getTime();
    console.log(`Search request completed in ${requestEndTime - requestStartTime}ms`);
    
    if (!response.ok) {
      let errorMessage = 'Search failed';
      try {
        const errorData = await response.json();
        if (errorData && errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (e) {
        errorMessage = `Search failed with status ${response.status}`;
      }
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API search error:', error);
    throw new Error(`Search failed: ${error.message}`);
  }
}