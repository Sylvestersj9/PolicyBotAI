# Migrating PolicyBot AI to Another Platform

This guide provides step-by-step instructions for migrating the PolicyBot AI application from Replit to another hosting platform of your choice.

## Step 1: Export the Code

### Option A: Download as ZIP
1. In Replit, click on the three dots menu (⋮) in the top-left corner
2. Select "Download as zip"
3. Extract the downloaded zip file to your local machine

### Option B: Connect to GitHub
1. In Replit, click on the "Version Control" icon in the sidebar
2. Connect your GitHub account if not already connected
3. Initialize a Git repository and push to GitHub
4. Clone the repository to your local machine:
   ```bash
   git clone https://github.com/yourusername/policybot-ai.git
   cd policybot-ai
   ```

## Step 2: Set Up Development Environment

1. Install Node.js 18+ on your local machine or new hosting environment
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with the necessary environment variables:
   ```
   DATABASE_URL=postgres://username:password@host:port/database
   HUGGINGFACE_API_KEY=your_huggingface_api_key
   SESSION_SECRET=random_secure_string_for_session_encryption
   ```

## Step 3: Set Up PostgreSQL Database

### Option A: Local PostgreSQL

1. Install PostgreSQL on your machine
2. Create a new database:
   ```sql
   CREATE DATABASE policybot;
   ```
3. Update the DATABASE_URL in your `.env` file

### Option B: Cloud PostgreSQL (Example with AWS RDS)

1. Create a PostgreSQL database in AWS RDS
2. Configure security groups to allow connections
3. Update the DATABASE_URL in your `.env` file with the RDS endpoint

### Initialize Database Schema

Run the database migration:
```bash
npm run db:push
```

## Step 4: Test Locally

1. Start the application in development mode:
   ```bash
   npm run dev
   ```
2. Verify that both the frontend and backend are working correctly at http://localhost:5000

## Step 5: Deployment Options

### Option A: Traditional VPS (DigitalOcean, Linode, AWS EC2)

1. Set up a VPS with Node.js installed
2. Clone your repository to the server
3. Install dependencies and set up environment variables
4. Use PM2 for process management:
   ```bash
   npm install -g pm2
   pm2 start npm -- run dev
   ```
5. Set up Nginx as a reverse proxy:
   ```nginx
   server {
     listen 80;
     server_name yourdomain.com;
     
     location / {
       proxy_pass http://localhost:5000;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection 'upgrade';
       proxy_set_header Host $host;
       proxy_cache_bypass $http_upgrade;
     }
   }
   ```
6. Set up SSL with Let's Encrypt

### Option B: Platform as a Service (Heroku, Render, Railway)

#### For Heroku:
1. Install Heroku CLI
2. Create Heroku app:
   ```bash
   heroku create policybot-ai
   ```
3. Add PostgreSQL addon:
   ```bash
   heroku addons:create heroku-postgresql:hobby-dev
   ```
4. Set environment variables:
   ```bash
   heroku config:set HUGGINGFACE_API_KEY=your_key SESSION_SECRET=your_secret
   ```
5. Deploy the application:
   ```bash
   git push heroku main
   ```

#### For Render:
1. Create a new Web Service in the Render dashboard
2. Connect your GitHub repository
3. Set build command: `npm install`
4. Set start command: `npm run dev`
5. Add environment variables in the Render dashboard
6. Create a PostgreSQL database in Render and link it to your service

### Option C: Docker Deployment

1. Create a Dockerfile in the root directory:
   ```Dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm install
   COPY . .
   EXPOSE 5000
   CMD ["npm", "run", "dev"]
   ```
2. Build the Docker image:
   ```bash
   docker build -t policybot-ai .
   ```
3. Run the container:
   ```bash
   docker run -p 5000:5000 --env-file .env policybot-ai
   ```
4. For production, consider using Docker Compose with a PostgreSQL container

## Step 6: Update Browser Extension

1. Update the API base URL in extension files:
   - `extension-fixed/popup.js`
   - `extension-fixed/background.js`
   
   Change `API_BASE_URL` from Replit URL to your new domain.

2. Rebuild the extension:
   ```bash
   # Zip the extension files
   cd extension-fixed
   zip -r ../policybot-extension.zip .
   ```

3. Load the updated extension in Chrome

## Step 7: Domain Configuration

1. Purchase a domain if you don't have one
2. Configure DNS for your new hosting environment
3. Set up SSL certificates for secure HTTPS connections
4. Update all references to domains in your code and extension

## Step 8: Additional Considerations

### Continuous Integration/Deployment

Set up CI/CD pipelines with GitHub Actions or similar tools for automated testing and deployment.

Example GitHub Actions workflow (.github/workflows/deploy.yml):
```yaml
name: Deploy

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Use Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
      # Add deployment steps based on your chosen platform
```

### Monitoring and Logging

Implement monitoring and logging for your application:
- Consider using services like New Relic, Datadog, or Sentry
- Set up log aggregation with ELK stack or similar
- Monitor server resources and set up alerting

### Backup Strategy

Implement regular database backups:
```bash
# Example automated PostgreSQL backup
pg_dump -U username -d policybot > backup_$(date +%Y%m%d).sql
```

Consider automated backup solutions specific to your hosting platform.

## Step 9: Testing After Migration

After migration, thoroughly test:
1. User authentication
2. Policy management features
3. AI search functionality
4. Browser extension integration
5. API endpoints

## Step 10: Production Optimization

For production environments:
1. Set NODE_ENV to "production"
2. Configure proper caching headers
3. Optimize assets and implement CDN for static content
4. Set up database indexing for performance
5. Consider implementing rate limiting for API endpoints

## Troubleshooting Common Issues

1. **Database Connection Issues**
   - Check DATABASE_URL format and credentials
   - Verify network connectivity and firewall rules
   - Test connection with `psql` command-line tool

2. **API Integration Problems**
   - Verify Hugging Face API key is valid and properly set
   - Check API rate limits and quotas
   - Implement better error handling for API failures

3. **Cross-Origin (CORS) Issues**
   - Update CORS configuration in server/index.ts to allow your new domains
   - Use proper https:// URLs in all configurations

4. **SSL/HTTPS Problems**
   - Ensure all resources are loaded over HTTPS
   - Check SSL certificate validity and expiration
   - Configure browser extension to use HTTPS only

5. **Node.js Memory Issues**
   - Adjust Node.js memory limits if needed:
     ```bash
     NODE_OPTIONS=--max_old_space_size=4096 npm run dev
     ```
   - Consider implementing proper memory management practices