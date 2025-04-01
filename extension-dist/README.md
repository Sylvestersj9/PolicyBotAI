# PolicyBot AI Chrome Extension

## Overview
This Chrome extension allows you to search your company's policies directly from your browser. When text is selected on any webpage, a popup appears that lets you search for related policies in your organization's knowledge base.

## Features
- Highlight any text on a webpage and search for relevant policies
- See answers extracted directly from your policy documents
- View confidence scores for AI-generated answers
- Access your recent searches
- Drag-and-drop search results window
- Secure communication with API keys
- HTTPS enforcement for security

## Installation Instructions

### Installing from source (for developers)
1. Download or clone the extension files
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer Mode" by toggling the switch in the top-right corner
4. Click "Load unpacked" and select the extension directory
5. The extension should now appear in your Chrome toolbar

### Configuration
1. Click the extension icon in your Chrome toolbar
2. Log in with your PolicyBot credentials (default: admin/password123)
3. The extension will automatically generate an API key for secure communication
4. To update the API URL, click the "Login" button to show the login form, then scroll down to find the API URL configuration section

## Using the Extension

### Context Menu Search
1. Select any text on a webpage
2. Right-click and choose "Search policies for [selected text]"
3. A popup will appear with search results from your company policies

### Direct Search from Popup
1. Click the extension icon in your Chrome toolbar
2. Type your query in the search box
3. Click "Search" or press Enter
4. View the search results and confidence score

### Selection Popup
1. When you select text on any webpage, a small popup appears
2. Click "Search in company policies" to search for the selected text
3. View the search results in a draggable popup

## Troubleshooting
- If you encounter "Failed to fetch" errors, ensure the API URL is correct and using HTTPS
- If login fails, verify your credentials and check that the server is running
- For any other issues, check the browser console for detailed error messages

## Security Features
- All API communication requires a valid API key
- HTTP URLs are automatically converted to HTTPS
- Authentication data is stored securely in Chrome's local storage
- No sensitive information is transmitted in plain text

## Privacy
This extension only sends search queries and authentication information to your organization's PolicyBot server. No data is sent to third parties.