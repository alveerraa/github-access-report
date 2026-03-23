# GitHub Organization Access Report API

## Overview
This project generates a report showing which users have access to which repositories in a GitHub organization.

It connects to the GitHub API, retrieves repository and collaborator data, and exposes an API endpoint that returns a structured JSON access report.

---

## Features
- Fetch all repositories in an organization  
- Identify users with access to each repository  
- Generate user-to-repositories mapping  
- REST API to access the report  
- In-memory caching for improved performance  

---

## Tech Stack
- Node.js  
- Express.js  
- GitHub REST API  
- dotenv  

---

## Setup and Installation

1. Clone or download the repository

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
GITHUB_TOKEN=your_personal_access_token
GITHUB_ORG=your_organization_name
PORT=3000
```

4. Start the server:
```bash
npm start
```

The server will run at:
```
http://localhost:3000
```

---

## Authentication
The application uses a GitHub Personal Access Token (PAT) with the following scopes:
- repo  
- read:org  

---

## API Endpoints

### Get Full Report
```
GET /api/report
```

Returns complete organization access data including repositories and users.

---

### Get User Access
```
GET /api/report/user/:username
```

Returns all repositories accessible by a specific user.

---

### Clear Cache
```
POST /api/cache/clear
```

Clears cached data and forces fresh data retrieval.

---

## Sample Output
```json
{
  "alv": ["repo1", "repo2"],
  "sam": ["repo2"]
}
```

---

## Design Decisions
- Batched API calls using Promise.all() for efficiency  
- In-memory caching (5-minute TTL) to reduce API usage  
- Graceful error handling for inaccessible repositories  

---

## Assumptions
- The GitHub token has the required permissions  
- The organization is accessible with the provided token  

---

## How to Use
1. Start the server  
2. Open:
```
http://localhost:3000/api/report
```

---

## Notes
- The `.env` file is excluded from version control for security  
- Designed to handle organizations with 100+ repositories and large user bases  

---

## Author
Alveera Ahmad
