# PolicyBot AI Extension - Step by Step Usage Guide

This guide walks you through using the PolicyBot AI Chrome extension to search your company's policies directly from your browser.

## Installation

1. **Load the extension in Chrome**
   * Open Chrome and go to chrome://extensions/
   * Enable "Developer Mode" in the top-right corner
   * Click "Load unpacked" and select the `extension-fixed` folder
   * The PolicyBot AI icon should appear in your browser toolbar

2. **Initial Setup**
   * Click the PolicyBot AI icon in your toolbar
   * The default API URL is set to "https://policybotai.replit.app"
   * If your PolicyBot is hosted elsewhere, click the "Login" button, then scroll down to update the API URL

## Logging In

1. **Open the extension popup**
   * Click the PolicyBot AI icon in your toolbar

2. **Enter credentials**
   * Click the "Login" button to show the login form
   * Enter your username and password (default: admin/password123)
   * Click "Login"

3. **Successful login**
   * Your username will be displayed at the top
   * The "Login" button will be replaced with "Logout"
   * Your login and API key are now stored securely in your browser

## Searching Policies

### Method 1: Direct Search from Extension Popup

1. **Open the extension**
   * Click the PolicyBot AI icon in your toolbar

2. **Enter search query**
   * Type your question in the search field
   * Click "Search" button or press Enter

3. **View results**
   * The answer will appear below
   * You'll see which policy document it came from
   * The confidence score indicates how certain the AI is about the answer

### Method 2: Context Menu Search

1. **Select text on any webpage**
   * Highlight any text that contains your question

2. **Use context menu**
   * Right-click on the selected text
   * Choose "Search policies for [your text]" from the menu

3. **View results**
   * A popup window will appear with the answer
   * You can drag this window around by its header
   * Close it when you're done by clicking the X

### Method 3: Selection Popup

1. **Select text on any webpage**
   * Highlight any text that contains your question

2. **Use quick popup**
   * A small popup will appear near your selection
   * Click "Search in company policies"

3. **View results**
   * A larger popup window will appear with the answer
   * You can drag this window around
   * Close it when you're done

## Recent Searches

* Your recent searches are saved for quick access
* They appear in the extension popup
* Click on any recent search to see the results again

## Logout

* To log out, click the "Logout" button
* This will clear your credentials from the browser storage
* You'll need to log in again to use the extension

## Troubleshooting

* **Login fails**: Ensure the API URL is correct and the server is running
* **Search doesn't work**: Make sure you're logged in and the API key is valid
* **Results don't show**: Check your internet connection and try again
* **Context menu or selection popup doesn't appear**: Reload the page or restart Chrome

## Security Notes

* Your API key is stored securely in browser storage
* All communications are forced to use HTTPS
* No data is sent to third parties
* Your credentials are only transmitted during login