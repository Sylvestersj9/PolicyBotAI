// Content script for PolicyBot AI extension
// This script runs on webpages and can interact with the DOM

let selectionPopup = null;
let resultPopup = null;
let notificationPopup = null;

function init() {
  console.log('PolicyBot AI content script loaded');
  
  // Add the CSS styles for the popup elements
  addStyles();
  
  // Add the selection popup
  createSelectionPopup();
  
  // Listen for messages from the background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Content script received message:', message.action);
    
    if (message.action === 'showLoadingPopup') {
      showLoadingPopup(message.data.query);
    } else if (message.action === 'showSearchResult') {
      showResultPopup(message.data.query, message.data.result);
    } else if (message.action === 'showSearchError') {
      showErrorPopup(message.data.query, message.data.error);
    } else if (message.action === 'showNotification') {
      showNotification(message.data.type, message.data.message);
    }
    
    sendResponse({ received: true });
  });
  
  // Listen for text selection events
  document.addEventListener('mouseup', handleTextSelection);
  document.addEventListener('keyup', handleTextSelection);
}

// Add the CSS styles for all our custom elements
function addStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .policybot-popup {
      position: fixed;
      z-index: 999999;
      background: white;
      border: 1px solid #ddd;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      font-family: Arial, sans-serif;
      font-size: 14px;
      max-width: 400px;
      transition: opacity 0.3s;
      overflow: hidden;
    }
    
    .policybot-selection-popup {
      padding: 8px;
      display: flex;
      align-items: center;
      opacity: 0;
      pointer-events: none;
    }
    
    .policybot-selection-popup.visible {
      opacity: 1;
      pointer-events: auto;
    }
    
    .policybot-logo {
      width: 24px;
      height: 24px;
      margin-right: 8px;
    }
    
    .policybot-search-btn {
      background-color: #1a73e8;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 6px 12px;
      cursor: pointer;
      font-size: 12px;
      white-space: nowrap;
    }
    
    .policybot-search-btn:hover {
      background-color: #0d66d0;
    }
    
    .policybot-result-popup {
      width: 320px;
      max-height: 400px;
      display: flex;
      flex-direction: column;
    }
    
    .policybot-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      border-bottom: 1px solid #eee;
      background-color: #f8f9fa;
    }
    
    .policybot-title {
      font-size: 14px;
      font-weight: bold;
      margin: 0;
      color: #1a73e8;
      display: flex;
      align-items: center;
    }
    
    .policybot-close-btn {
      background: transparent;
      border: none;
      cursor: pointer;
      color: #666;
      font-size: 18px;
      padding: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .policybot-close-btn:hover {
      color: #333;
    }
    
    .policybot-content {
      padding: 16px;
      overflow-y: auto;
      max-height: 320px;
    }
    
    .policybot-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    
    .policybot-spinner {
      border: 3px solid #f3f3f3;
      border-radius: 50%;
      border-top: 3px solid #1a73e8;
      width: 24px;
      height: 24px;
      animation: policybot-spin 1s linear infinite;
      margin-bottom: 12px;
    }
    
    @keyframes policybot-spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .policybot-query {
      font-style: italic;
      color: #666;
      margin-bottom: 16px;
    }
    
    .policybot-answer {
      line-height: 1.5;
      margin-bottom: 16px;
    }
    
    .policybot-source {
      font-size: 12px;
      color: #666;
      padding-top: 8px;
      border-top: 1px solid #eee;
    }
    
    .policybot-confidence {
      display: flex;
      align-items: center;
      margin-top: 12px;
      font-size: 12px;
      color: #666;
    }
    
    .policybot-bar {
      width: 100px;
      height: 6px;
      background-color: #eee;
      border-radius: 3px;
      margin-left: 8px;
      overflow: hidden;
    }
    
    .policybot-level {
      height: 100%;
      background-color: #1a73e8;
    }
    
    .policybot-footer {
      padding: 8px 16px;
      border-top: 1px solid #eee;
      font-size: 11px;
      color: #666;
      text-align: center;
    }
    
    .policybot-error {
      color: #d32f2f;
      padding: 12px;
      background-color: #ffebee;
      border-radius: 4px;
      margin-bottom: 12px;
    }
    
    .policybot-notification {
      position: fixed;
      bottom: 24px;
      right: 24px;
      padding: 12px 16px;
      background-color: #323232;
      color: white;
      border-radius: 4px;
      font-size: 14px;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
      z-index: 9999999;
      opacity: 0;
      transform: translateY(20px);
      transition: opacity 0.3s, transform 0.3s;
    }
    
    .policybot-notification.error {
      background-color: #d32f2f;
    }
    
    .policybot-notification.warning {
      background-color: #f57c00;
    }
    
    .policybot-notification.success {
      background-color: #388e3c;
    }
    
    .policybot-notification.visible {
      opacity: 1;
      transform: translateY(0);
    }
  `;
  document.head.appendChild(style);
}

// Create the selection popup that appears when text is selected
function createSelectionPopup() {
  if (selectionPopup) return;
  
  selectionPopup = document.createElement('div');
  selectionPopup.className = 'policybot-popup policybot-selection-popup';
  selectionPopup.innerHTML = `
    <img src="${chrome.runtime.getURL('icons/icon48.png')}" class="policybot-logo" alt="PolicyBot">
    <button class="policybot-search-btn">Search in company policies</button>
  `;
  
  // Add event listeners
  const searchBtn = selectionPopup.querySelector('.policybot-search-btn');
  searchBtn.addEventListener('click', () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      const query = selection.toString().trim();
      
      // Hide the selection popup
      selectionPopup.classList.remove('visible');
      
      // Show the loading popup
      showLoadingPopup(query);
      
      // Send message to background script to perform the search
      chrome.runtime.sendMessage({
        action: 'searchPolicies',
        data: { query }
      }, response => {
        if (response.success) {
          showResultPopup(query, response.result);
        } else {
          showErrorPopup(query, response.error);
        }
      });
    }
  });
  
  document.body.appendChild(selectionPopup);
}

// Handle text selection events to show the selection popup
function handleTextSelection(event) {
  // Don't show the popup if inside our own popups
  if (event.target.closest('.policybot-popup')) return;
  
  const selection = window.getSelection();
  if (selection && selection.toString().trim()) {
    // Get selection coordinates
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    // Position the popup below the selection
    const popupTop = rect.bottom + window.scrollY + 8;
    const popupLeft = rect.left + window.scrollX;
    
    selectionPopup.style.top = `${popupTop}px`;
    selectionPopup.style.left = `${popupLeft}px`;
    selectionPopup.classList.add('visible');
  } else {
    selectionPopup.classList.remove('visible');
  }
}

// Show the loading popup while waiting for search results
function showLoadingPopup(query) {
  if (resultPopup) {
    document.body.removeChild(resultPopup);
  }
  
  resultPopup = document.createElement('div');
  resultPopup.className = 'policybot-popup policybot-result-popup';
  resultPopup.innerHTML = `
    <div class="policybot-header">
      <h3 class="policybot-title">
        <img src="${chrome.runtime.getURL('icons/icon48.png')}" class="policybot-logo" alt="PolicyBot">
        PolicyBot AI
      </h3>
      <button class="policybot-close-btn">×</button>
    </div>
    <div class="policybot-loading">
      <div class="policybot-spinner"></div>
      <p>Searching for: "${query}"...</p>
    </div>
    <div class="policybot-footer">
      Powered by PolicyBot AI
    </div>
  `;
  
  // Position in the center of the viewport
  const popupTop = window.scrollY + 100;
  const popupLeft = window.scrollX + (window.innerWidth - 320) / 2;
  
  resultPopup.style.top = `${popupTop}px`;
  resultPopup.style.left = `${popupLeft}px`;
  
  // Add close button event listener
  const closeBtn = resultPopup.querySelector('.policybot-close-btn');
  closeBtn.addEventListener('click', () => {
    document.body.removeChild(resultPopup);
    resultPopup = null;
  });
  
  document.body.appendChild(resultPopup);
  
  // Make draggable
  makeElementDraggable(resultPopup);
}

// Show search results in the popup
function showResultPopup(query, result) {
  if (!resultPopup) {
    showLoadingPopup(query); // Create the popup if it doesn't exist
  }
  
  // Update the content
  const content = document.createElement('div');
  content.className = 'policybot-content';
  
  // Format confidence level as percentage
  const confidencePercentage = Math.round(result.confidence * 100);
  
  content.innerHTML = `
    <div class="policybot-query">
      Your query: "${query}"
    </div>
    <div class="policybot-answer">
      ${result.answer}
    </div>
    <div class="policybot-source">
      Source: ${result.policyName || 'Company Policy'}
    </div>
    <div class="policybot-confidence">
      Confidence:
      <div class="policybot-bar">
        <div class="policybot-level" style="width: ${confidencePercentage}%"></div>
      </div>
      ${confidencePercentage}%
    </div>
  `;
  
  // Replace the loading div with the content
  const loadingDiv = resultPopup.querySelector('.policybot-loading');
  loadingDiv.parentNode.replaceChild(content, loadingDiv);
}

// Show error message in the popup
function showErrorPopup(query, errorMessage) {
  if (!resultPopup) {
    showLoadingPopup(query); // Create the popup if it doesn't exist
  }
  
  // Update the content
  const content = document.createElement('div');
  content.className = 'policybot-content';
  
  content.innerHTML = `
    <div class="policybot-query">
      Your query: "${query}"
    </div>
    <div class="policybot-error">
      <strong>Error:</strong> ${errorMessage}
    </div>
    <p>
      Please try again or contact your administrator if the problem persists.
    </p>
  `;
  
  // Replace the loading div with the content
  const loadingDiv = resultPopup.querySelector('.policybot-loading');
  loadingDiv.parentNode.replaceChild(content, loadingDiv);
}

// Show notification message
function showNotification(type, message) {
  // Remove existing notification if any
  if (notificationPopup) {
    document.body.removeChild(notificationPopup);
  }
  
  notificationPopup = document.createElement('div');
  notificationPopup.className = `policybot-notification ${type}`;
  notificationPopup.textContent = message;
  
  document.body.appendChild(notificationPopup);
  
  // Make it visible after a small delay (for animation)
  setTimeout(() => {
    notificationPopup.classList.add('visible');
  }, 10);
  
  // Hide after 5 seconds
  setTimeout(() => {
    notificationPopup.classList.remove('visible');
    
    // Remove from DOM after animation completes
    setTimeout(() => {
      if (notificationPopup && notificationPopup.parentNode) {
        document.body.removeChild(notificationPopup);
        notificationPopup = null;
      }
    }, 300);
  }, 5000);
}

// Make an element draggable by its header
function makeElementDraggable(element) {
  const header = element.querySelector('.policybot-header');
  let isDragging = false;
  let offsetX, offsetY;
  
  header.addEventListener('mousedown', (e) => {
    // Don't drag when clicking the close button
    if (e.target.closest('.policybot-close-btn')) return;
    
    isDragging = true;
    offsetX = e.clientX - element.getBoundingClientRect().left;
    offsetY = e.clientY - element.getBoundingClientRect().top;
    
    // Add temporary event listeners
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    
    // Prevent text selection during drag
    e.preventDefault();
  });
  
  function onMouseMove(e) {
    if (!isDragging) return;
    
    const newX = e.clientX - offsetX;
    const newY = e.clientY - offsetY;
    
    element.style.left = `${newX}px`;
    element.style.top = `${newY}px`;
  }
  
  function onMouseUp() {
    isDragging = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }
}

// Run initialization
init();