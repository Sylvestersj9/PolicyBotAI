# PolicyBot AI - Project Handover Documentation

## Project Overview

PolicyBot AI is a Policy & Procedure Management SaaS platform that uses AI to help enterprises optimize workflow and manage documents. The system includes both a web application and a Chrome extension that allows users to search and interact with policy documents.

### Core Features

- User authentication with role-based access control
- Policy management system (upload, edit, delete, tag, categorize)
- AI-powered policy search using Hugging Face's language models
- REST API for browser extension integration
- Admin dashboard for monitoring policies and user activity
- Chrome extension for contextual policy search

## Technology Stack

### Backend
- Node.js with Express
- TypeScript for type safety
- Drizzle ORM for database interactions
- PostgreSQL database for data storage
- Hugging Face API integration for AI capabilities

### Frontend
- React for UI components
- TypeScript
- Tailwind CSS + shadcn/ui for styling
- TanStack Query (React Query) for data fetching
- React Hook Form for form handling

### Browser Extension
- Chrome Extension API
- Vanilla JavaScript 
- REST API integration

## Environment Setup

### Prerequisites
- Node.js (version 18+ recommended)
- PostgreSQL (version 13+ recommended)
- Hugging Face API key
- Git (for version control)

### Required Environment Variables
The following environment variables need to be set:

```
DATABASE_URL=postgres://username:password@host:port/database
HUGGINGFACE_API_KEY=your_huggingface_api_key
SESSION_SECRET=random_secure_string_for_session_encryption
```

## Project Structure

```
├── client/                  # Frontend React application
│   ├── src/                 # React source code
│   │   ├── components/      # Reusable UI components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # Utility functions and helpers
│   │   ├── pages/           # Application pages
│   │   ├── App.tsx          # Main application component
│   │   └── main.tsx         # Entry point
│   └── index.html           # HTML template
│
├── server/                  # Backend Express server
│   ├── auth.ts              # Authentication logic
│   ├── huggingface.ts       # Hugging Face API integration
│   ├── index.ts             # Server entry point
│   ├── routes.ts            # API routes
│   ├── storage.ts           # Database operations
│   └── vite.ts              # Vite server integration
│
├── shared/                  # Shared code between client and server
│   └── schema.ts            # Database schema and types
│
├── extension/               # Chrome extension source code
│   ├── background.js        # Extension background script
│   ├── content.js           # Content script injected into pages
│   ├── popup.html           # Extension popup UI
│   └── popup.js             # Popup logic
│
├── extension-fixed/         # Fixed version of the extension
├── extension-dist/          # Built extension ready for distribution
│
├── drizzle.config.ts        # Drizzle ORM configuration
├── package.json             # Project dependencies and scripts
└── tsconfig.json            # TypeScript configuration
```

## Database Schema

The database schema is defined in `shared/schema.ts` using Drizzle ORM. Key entities include:

- **Users**: Authentication and user profiles
- **Categories**: Policy categorization
- **Policies**: The main policy documents
- **SearchQueries**: Record of user searches
- **Activities**: User activity tracking
- **AiTraining**: AI model training data and status

## Getting Started

### Installation

1. Clone the repository
   ```bash
   git clone <repository-url>
   cd policybot-ai
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Set up environment variables
   Create a `.env` file in the root directory with the required environment variables listed above.

4. Set up the database
   ```bash
   # Push schema to database
   npm run db:push
   ```

### Running the Application

Development mode:
```bash
npm run dev
```

This will start both the backend server on port 5000 and the frontend development server.

### Browser Extension Setup

The browser extension needs to be loaded into Chrome:

1. Navigate to `chrome://extensions/` in Chrome
2. Enable "Developer mode" (toggle in the top-right)
3. Click "Load unpacked" and select the `extension-fixed` directory
4. Update the API base URL in the extension options if needed

## API Documentation

### Authentication Endpoints

- `POST /api/register` - Register a new user
- `POST /api/login` - User login
- `POST /api/logout` - User logout
- `GET /api/user` - Get current user information

### Policy Management Endpoints

- `GET /api/policies` - Get all policies
- `GET /api/policies/:id` - Get a specific policy
- `POST /api/policies` - Create a new policy
- `PATCH /api/policies/:id` - Update a policy
- `DELETE /api/policies/:id` - Delete a policy

### Search Endpoints

- `POST /api/search` - Search policies with AI
- `GET /api/searches` - Get recent searches

### Extension Endpoints

- `POST /api/extension/login` - Extension login
- `POST /api/extension/generate-key` - Generate API key for extension
- `POST /api/extension/search` - Search policies from extension

## Browser Extension Integration

The Chrome extension communicates with the backend API using a REST interface. Key files:

- `background.js` - Handles background tasks and API communication
- `content.js` - Injects UI elements into web pages
- `popup.js` - Manages the extension popup interface

The extension uses an API key for authentication, which is generated when users log in.

## External Services

### Hugging Face API

The application uses Hugging Face's models for AI search and analysis. The integration is implemented in `server/huggingface.ts`.

## Deployment Considerations

### Database Migration

When deploying to a new environment, you need to migrate the database schema:

```bash
npm run db:push
```

### Custom Domain Setup

The application can be configured to use a custom domain instead of the default Replit URL. Update the following:

1. Configure DNS settings for your domain
2. Update the extension configuration to use your custom domain:
   - Update `API_BASE_URL` in `extension-fixed/popup.js`
   - Update `apiBaseUrl` in `extension-fixed/background.js`

### Security Considerations

- All API keys should be stored securely and not committed to version control
- The browser extension requires HTTPS for security
- The session secret should be a strong random string

## Known Issues and Limitations

1. Error handling in some parts of the application could be improved
2. Extension search requires an active API connection
3. The application currently uses in-memory session storage which doesn't scale well with multiple instances

## Future Enhancements

1. Implement subscription-based payment model
2. Add bulk policy import/export functionality
3. Enhance AI training with more sophisticated models
4. Implement more comprehensive analytics

## Contact Information

For questions or issues regarding this project, please contact the original developer.