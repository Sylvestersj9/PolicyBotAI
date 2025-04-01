# API and Database Reference for PolicyBot AI

## Database Schema Reference

The core database schema is defined in `shared/schema.ts` using Drizzle ORM. Below is a summary of the main tables:

### Users Table
Stores user account information and authentication details.

| Column         | Type          | Description                           |
|----------------|---------------|---------------------------------------|
| id             | integer       | Primary key, auto-increment           |
| username       | text          | Unique username for login             |
| password       | text          | Hashed password                       |
| name           | text          | Full name of the user                 |
| email          | text          | Email address (unique)                |
| company        | text          | Company/organization name             |
| role           | text          | User role (admin, editor, viewer)     |
| apiKey         | text          | API key for extension auth            |
| profilePicture | text          | Path to profile picture (nullable)    |
| createdAt      | timestamp     | Account creation timestamp            |

### Categories Table
Used to categorize policies.

| Column         | Type          | Description                           |
|----------------|---------------|---------------------------------------|
| id             | integer       | Primary key, auto-increment           |
| name           | text          | Category name                         |
| description    | text          | Category description                  |
| color          | text          | Color code for UI display             |

### Policies Table
Stores policy documents and metadata.

| Column         | Type          | Description                           |
|----------------|---------------|---------------------------------------|
| id             | integer       | Primary key, auto-increment           |
| title          | text          | Policy title                          |
| content        | text          | Full policy text content              |
| summary        | text          | AI-generated summary (nullable)       |
| categoryId     | integer       | Foreign key to categories table       |
| status         | text          | Status (draft, active, archived)      |
| createdBy      | integer       | Foreign key to users table            |
| createdAt      | timestamp     | Creation timestamp                    |
| updatedAt      | timestamp     | Last update timestamp                 |
| tags           | text[]        | Array of tags for the policy          |
| filePath       | text          | Path to uploaded file (if any)        |

### SearchQueries Table
Logs search queries and results.

| Column         | Type          | Description                           |
|----------------|---------------|---------------------------------------|
| id             | integer       | Primary key, auto-increment           |
| query          | text          | Search query text                     |
| userId         | integer       | Foreign key to users table            |
| result         | text          | JSON string of search results         |
| timestamp      | timestamp     | Search timestamp                      |

### Activities Table
Tracks user activities for audit purposes.

| Column         | Type          | Description                           |
|----------------|---------------|---------------------------------------|
| id             | integer       | Primary key, auto-increment           |
| userId         | integer       | Foreign key to users table            |
| action         | text          | Action performed                      |
| resourceType   | text          | Type of resource affected             |
| resourceId     | integer       | ID of affected resource (nullable)    |
| details        | text          | Additional action details             |
| timestamp      | timestamp     | Activity timestamp                    |

### AiTraining Table
Tracks AI model training status and metrics.

| Column         | Type          | Description                           |
|----------------|---------------|---------------------------------------|
| id             | integer       | Primary key, auto-increment           |
| model          | text          | AI model name/identifier              |
| description    | text          | Training description                  |
| parameters     | text          | JSON string with training parameters  |
| createdBy      | integer       | Foreign key to users table            |
| createdAt      | timestamp     | Creation timestamp                    |
| startedAt      | timestamp     | Training start timestamp              |
| completedAt    | timestamp     | Training completion timestamp         |
| status         | text          | Status (pending, running, completed)  |
| progress       | integer       | Progress percentage (0-100)           |
| metrics        | text          | JSON string with training metrics     |
| isActive       | boolean       | Whether this model is active          |
| errorMessage   | text          | Error message if training failed      |

## API Endpoints Reference

### Authentication

#### Register User
- **URL**: `/api/register`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "username": "newuser",
    "password": "securepassword",
    "name": "New User",
    "email": "user@example.com",
    "company": "Example Corp",
    "role": "editor"
  }
  ```
- **Response**: User object with authentication session

#### Login
- **URL**: `/api/login`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "username": "admin",
    "password": "password123"
  }
  ```
- **Response**: User object with authentication session

#### Logout
- **URL**: `/api/logout`
- **Method**: `POST`
- **Response**: Success message

#### Get Current User
- **URL**: `/api/user`
- **Method**: `GET`
- **Authentication**: Required
- **Response**: Current user object

### Categories

#### Get All Categories
- **URL**: `/api/categories`
- **Method**: `GET`
- **Authentication**: Required
- **Response**: Array of category objects

#### Create Category
- **URL**: `/api/categories`
- **Method**: `POST`
- **Authentication**: Required
- **Body**:
  ```json
  {
    "name": "HR Policies",
    "description": "Human Resources policies",
    "color": "#4A90E2"
  }
  ```
- **Response**: New category object

### Policies

#### Get All Policies
- **URL**: `/api/policies`
- **Method**: `GET`
- **Authentication**: Required
- **Response**: Array of policy objects

#### Get Policy by ID
- **URL**: `/api/policies/:id`
- **Method**: `GET`
- **Authentication**: Required
- **Response**: Policy object

#### Create Policy
- **URL**: `/api/policies`
- **Method**: `POST`
- **Authentication**: Required
- **Body**:
  ```json
  {
    "title": "Employee Code of Conduct",
    "content": "Full policy text here...",
    "summary": "Guidelines for employee behavior",
    "categoryId": 1,
    "status": "active",
    "tags": ["conduct", "employees", "guidelines"]
  }
  ```
- **Response**: New policy object

#### Update Policy
- **URL**: `/api/policies/:id`
- **Method**: `PATCH`
- **Authentication**: Required
- **Body**: Policy fields to update
- **Response**: Updated policy object

#### Delete Policy
- **URL**: `/api/policies/:id`
- **Method**: `DELETE`
- **Authentication**: Required
- **Response**: Success message

### Search

#### Search Policies
- **URL**: `/api/search`
- **Method**: `POST`
- **Authentication**: Required
- **Body**:
  ```json
  {
    "query": "What is the vacation policy?"
  }
  ```
- **Response**:
  ```json
  {
    "id": 123,
    "query": "What is the vacation policy?",
    "result": {
      "answer": "Employees are entitled to 20 days of vacation per year...",
      "confidence": 0.92,
      "policyId": 5,
      "policyTitle": "Employee Benefits Policy"
    },
    "timestamp": "2023-04-01T12:34:56Z"
  }
  ```

#### Get Recent Searches
- **URL**: `/api/searches`
- **Method**: `GET`
- **Authentication**: Required
- **Response**: Array of recent search objects

### Extension API

#### Extension Login
- **URL**: `/api/extension/login`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "username": "admin",
    "password": "password123"
  }
  ```
- **Response**: User object with API key

#### Generate API Key
- **URL**: `/api/extension/generate-key`
- **Method**: `POST`
- **Authentication**: Required
- **Response**: New API key

#### Extension Search
- **URL**: `/api/extension/search`
- **Method**: `POST`
- **Authentication**: API Key (X-API-Key header)
- **Body**:
  ```json
  {
    "query": "What is the policy on remote work?"
  }
  ```
- **Response**: Search result object

### User Profile

#### Get User Profile
- **URL**: `/api/user/profile`
- **Method**: `GET`
- **Authentication**: Required
- **Response**: User profile object

#### Update User Profile
- **URL**: `/api/user/profile`
- **Method**: `PATCH`
- **Authentication**: Required
- **Body**: Profile fields to update
- **Response**: Updated user object

#### Change Password
- **URL**: `/api/user/change-password`
- **Method**: `POST`
- **Authentication**: Required
- **Body**:
  ```json
  {
    "currentPassword": "oldpassword",
    "newPassword": "newpassword"
  }
  ```
- **Response**: Success message

### AI Training

#### Get All AI Trainings
- **URL**: `/api/ai-trainings`
- **Method**: `GET`
- **Authentication**: Required
- **Response**: Array of AI training objects

#### Create AI Training
- **URL**: `/api/ai-trainings`
- **Method**: `POST`
- **Authentication**: Required
- **Body**:
  ```json
  {
    "model": "policy-mistral",
    "description": "Training on HR policies",
    "parameters": "{\"epochs\": 3, \"batchSize\": 16}"
  }
  ```
- **Response**: New AI training object

#### Update Training Status
- **URL**: `/api/ai-trainings/:id/status`
- **Method**: `PATCH`
- **Authentication**: Required
- **Body**:
  ```json
  {
    "status": "completed",
    "completedAt": "2023-04-01T15:30:45Z",
    "metrics": "{\"accuracy\": 0.95, \"loss\": 0.03}"
  }
  ```
- **Response**: Updated AI training object

## HTTP Status Codes

| Status Code | Description                           |
|-------------|---------------------------------------|
| 200         | Success                               |
| 201         | Created                               |
| 400         | Bad Request                           |
| 401         | Unauthorized                          |
| 403         | Forbidden                             |
| 404         | Not Found                             |
| 500         | Internal Server Error                 |

## Authentication Mechanisms

The API uses two authentication mechanisms:

1. **Session-based authentication** for web application
   - Login creates a session
   - Session is stored server-side
   - Client uses cookies to maintain session

2. **API Key authentication** for extension
   - API key is generated for users
   - API key is passed in X-API-Key header
   - Stateless authentication for extension requests