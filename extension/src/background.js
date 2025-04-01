// Background script for PolicyHub extension
// Handles background tasks and communications

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('PolicyHub extension installed');
});

// Handle messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getApiKey') {
    chrome.storage.local.get(['apiKey'], (result) => {
      sendResponse({ apiKey: result.apiKey || null });
    });
    return true; // Required for async sendResponse
  }
  
  if (message.action === 'checkAuthentication') {
    chrome.storage.local.get(['user', 'apiKey'], (result) => {
      sendResponse({ 
        isAuthenticated: !!(result.user && result.apiKey),
        user: result.user || null
      });
    });
    return true; // Required for async sendResponse
  }
});