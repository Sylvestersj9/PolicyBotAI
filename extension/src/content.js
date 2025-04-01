// Content script for PolicyHub extension
// This script runs in the context of web pages

// Initialize the content script
function init() {
  console.log('PolicyHub content script initialized');
  
  // Check if we're authenticated
  chrome.runtime.sendMessage({ action: 'checkAuthentication' }, (response) => {
    if (response && response.isAuthenticated) {
      // We could inject page-specific features here when authenticated
      // For example, highlight policy-related terms on the page
    }
  });
}

// Create a context menu for quick policy search
function createContextMenu() {
  // Get API key first to check if we're authenticated
  chrome.runtime.sendMessage({ action: 'getApiKey' }, (response) => {
    if (response && response.apiKey) {
      // Context menu is created in the background script
      // but we could send a message to create it dynamically
    }
  });
}

// Initialize
init();