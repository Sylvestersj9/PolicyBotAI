# Extension Changes and Improvements

## Version 1.0.2 (April 2025)
- Fixed critical syntax error in popup.js that caused extension failure
- Added clear comment to prevent wrong formatting of chrome.storage.local.set calls
- Enhanced error handling for HuggingFace AI model access issues
- Added fallback AI model support when primary model fails
- Improved JSON response parsing from AI models

## Security Improvements
- Enforced HTTPS for all API calls (HTTP URLs are automatically converted to HTTPS)
- Added proper error handling for network issues and improved diagnostics
- Added detailed console logging throughout the extension to aid in troubleshooting

## UI/UX Improvements
- Added better error messages with specific information about what went wrong
- Added loading states during requests to improve user feedback
- Added support for configuring the API server URL with proper validation

## Network Reliability Improvements
- Added timeouts for API requests to prevent hanging on network issues
- Added better CORS handling with explicit mode settings
- Improved URL normalization to handle trailing slashes and protocol prefixes
- Added request timings in console logs to help diagnose performance issues

## Default Configuration
- Set the default API URL to `https://policybotai.replit.app`
- All URLs are normalized to use HTTPS, even if HTTP is entered

## Using the Extension
1. Install the extension in Chrome from the extensions page
2. Click the extension icon to open the popup
3. Enter your username and password (default: admin/password123)
4. After logging in, you can search for policies
5. The extension will remember your login state between browser restarts

## Troubleshooting
- If you encounter "Failed to fetch" errors, check that you're using HTTPS in the API URL
- If the server returns unexpected responses, check the browser console for detailed logs
- Make sure CORS is properly configured on the server side to allow requests from the extension
- Verify that the API server URL is correct and the server is running
- If you see "Uncaught SyntaxError: Unexpected token '.'" in popup.js, please update to version 1.0.2 or later
- For AI search issues, try logging in again to refresh your session and API key