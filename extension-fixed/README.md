# PolicyHub Chrome Extension

This extension allows users to quickly search and access company policies without leaving their current tab.

## Installation Instructions

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" using the toggle in the top-right corner
3. Click "Load unpacked" and select this entire folder (the folder containing manifest.json)
4. The extension should now appear in your extensions list and in the Chrome toolbar

## Usage

1. Click the PolicyHub icon in your browser toolbar to open the extension popup
2. Log in with your PolicyHub account credentials
3. Use the search box to ask questions about company policies
4. View search results directly in the popup
5. Click "PolicyHub Dashboard" to open the full web application

## Configuration

The extension is currently configured to connect to `http://localhost:5000`. 

To change this configuration:
1. Open `popup.js`
2. Change the `API_BASE_URL` variable at the top of the file to your server's URL
3. Reload the extension in Chrome

## Troubleshooting

If you encounter any issues:
1. Make sure the PolicyHub server is running
2. Check that your API key is valid in the Settings page of the main application
3. Try logging out and logging back in
4. If problems persist, try reinstalling the extension