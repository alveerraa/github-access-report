<<<<<<< HEAD
# GitHub Organization Access Report API

## Overview

This tool generates a comprehensive access report for a GitHub organization, mapping which users have access to which repositories and with what permissions. It provides a REST API endpoint that returns organization access data in a structured JSON format.

## Prerequisites

- Node.js 18+
- A GitHub Personal Access Token with scopes: `repo`, `read:org`
  - Generate at: https://github.com/settings/tokens

## Setup & Installation

1. **Clone the repository**
   ```bash
   cd GitAccessAPI
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   - Create a `.env` file in the project root:
   ```bash
   GITHUB_TOKEN=your_personal_access_token_here
   GITHUB_ORG=your_organization_name_here
   PORT=3000
   ```

4. **Verify setup**
   ```bash
   npm start
   ```
   You should see: `Server running on port 3000`

## How Authentication Works

Every GitHub API request includes a Bearer token in the `Authorization` header:
```
Authorization: Bearer {GITHUB_TOKEN}
```

The token grants read access to organization and repository data. **Never commit the `.env` file to version control**—it contains sensitive credentials. The `.gitignore` file automatically excludes it.

## Running the Project

**Start the server:**
```bash
npm start
```

**Development mode** (auto-restart on file changes):
```bash
npm run dev
```

**Open the UI:**
- Navigate to `http://localhost:3000` in your browser to access the web interface
- Or use the API endpoints directly with curl/Postman

## Web Interface

The UI provides three main features:

### Load Full Report
Click **Load Full Report** to fetch the complete organization access data. Results show all repositories with their collaborators and a user map of permissions. The response includes:
- `generatedAt`: Timestamp of report generation
- `totalRepos`: Count of repositories analyzed
- `totalUsers`: Count of unique users
- `repoMap`: Repository-centric view of access
- `userMap`: User-centric view of repository access

### Clear Cache & Reload
Click **Clear Cache & Reload** to invalidate the in-memory cache and fetch fresh data from GitHub. Useful when organization access has recently changed and you need the latest information.

### Search User
Enter a GitHub username and click **Search User** to see all repositories that user has access to, along with their permission level (admin, write, or read). Shows "User not found" if the username doesn't exist in the organization.

## API Endpoints

### GET /api/report

Returns the complete organization access report with all repositories and user permissions.

**Query the API:**
```bash
curl http://localhost:3000/api/report
```

**Sample Response (200 OK):**
```json
{
  "generatedAt": "2026-03-23T10:30:45.123Z",
  "totalRepos": 42,
  "totalUsers": 15,
  "repoMap": {
    "frontend": {
      "repoName": "frontend",
      "fullName": "acme-corp/frontend",
      "private": true,
      "url": "https://github.com/acme-corp/frontend",
      "collaborators": [
        { "login": "alice", "role_name": "admin" },
        { "login": "bob", "role_name": "write" }
      ]
    },
    "backend": {
      "repoName": "backend",
      "fullName": "acme-corp/backend",
      "private": false,
      "url": "https://github.com/acme-corp/backend",
      "collaborators": [
        { "login": "alice", "role_name": "admin" },
        { "login": "charlie", "role_name": "read" }
      ]
    }
  },
  "userMap": {
    "alice": {
      "login": "alice",
      "repos": [
        { "repoName": "frontend", "role": "admin" },
        { "repoName": "backend", "role": "admin" }
      ]
    },
    "bob": {
      "login": "bob",
      "repos": [
        { "repoName": "frontend", "role": "write" }
      ]
    },
    "charlie": {
      "login": "charlie",
      "repos": [
        { "repoName": "backend", "role": "read" }
      ]
    }
  }
}
```

**Response Fields:**
- `generatedAt` - ISO 8601 timestamp of when report was generated
- `totalRepos` - Count of repositories analyzed
- `totalUsers` - Count of unique users with access
- `repoMap` - Object mapping repository names to their details and collaborators
- `userMap` - Object mapping usernames to their accessible repositories and roles
- `X-Cache` header - `HIT` if served from cache, `MISS` if freshly fetched

**Error Response (500):**
```json
{
  "error": "Failed to fetch repositories for org your_org: GitHub API error"
}
```

### POST /api/cache/clear

Clears the in-memory cache and forces a fresh report generation on the next request.

**Query the API:**
```bash
curl -X POST http://localhost:3000/api/cache/clear
```

**Sample Response (200 OK):**
```json
{
  "message": "Cache cleared successfully"
}
```

### GET /api/report/user/:username

Returns access details for a specific user (repositories and roles).

**Query the API:**
```bash
curl http://localhost:3000/api/report/user/alice
```

**Sample Response (200 OK):**
```json
{
  "login": "alice",
  "repos": [
    { "repoName": "frontend", "role": "admin" },
    { "repoName": "backend", "role": "admin" },
    { "repoName": "api", "role": "write" }
  ]
}
```

**When user not found (404):**
```json
{ "error": "User not found" }
```

## Design Decisions

### Batching Strategy (10 Repos at a Time)
Instead of fetching collaborators sequentially (slow) or all-in-parallel (rate limit explosion), the report generation processes repositories in batches of 10 using `Promise.all()`. Each batch waits for completion before starting the next. This balances speed with GitHub's rate limits: 60 requests per minute for authenticated users. Batching of 10 allows multiple batch cycles without hitting limits for organizations with hundreds of repos.

### In-Memory Caching with 5-Minute TTL
The `/api/report` endpoint caches results in memory with a 5-minute time-to-live (TTL). This minimizes repeated API calls for organizations that monitor access frequently. The cache is validated on each request: if still valid, results are served with `X-Cache: HIT`; if expired, a fresh report is generated and cached with `X-Cache: MISS`. Use the `POST /api/cache/clear` endpoint to manually invalidate the cache when needed.

### Using `affiliation=all` for Collaborators
The collaborators endpoint is called with `?affiliation=all` to capture:
- **Direct collaborators**: Users explicitly added to the repo
- **Team members**: Users with access through organization teams

This provides a complete picture of who has access. Without this parameter, you'd miss team-based access, which is common in organizations.

### Error Handling with Graceful Degradation
If a repository is inaccessible (e.g., 403 forbidden on private/restricted repos), the API returns an empty collaborators array rather than failing the entire report. This allows the report to complete successfully even if some repos cannot be accessed.

### Rate Limit Retry Logic
If GitHub returns a 429 (rate limit) response, the client automatically retries up to 3 times with 1-second delays between attempts. This prevents temporary rate limit issues from causing failures.

### Limitation: Nested Team Memberships
The API does not resolve nested team memberships. If a user is in "Team A" and "Team A" is a member of "Team B," the report shows access through "Team A" only, not the transitive "Team B" relationship. Full transitive team resolution would require additional GitHub API calls.

## Project Structure

```
.
├── app.js              # Express API server with endpoints
├── github.js           # GitHub API integration and data transformation
├── index.html          # Web UI for the application
├── style.css           # Styling for the web UI
├── package.json        # Project dependencies and scripts
├── README.md           # This file
├── EXPLANATION.md      # Detailed code explanation
└── .env                # Environment variables (not committed to git)
```

## Technical Stack

- **Framework**: Express.js (Node.js)
- **HTTP Client**: node-fetch
- **Configuration**: dotenv
- **Middleware**: CORS (enables cross-origin requests)

## Example Usage

**Python client example:**
```python
import requests

response = requests.get('http://localhost:3000/api/report')
report = response.json()

for username, user_data in report['userMap'].items():
    print(f"{username}: {len(user_data['repos'])} repositories")
    for repo in user_data['repos']:
        print(f"  - {repo['repoName']} ({repo['role']})")
```

**cURL example:**
```bash
# Get full report
curl -s http://localhost:3000/api/report | jq '.totalUsers'

# Pretty print with jq
curl -s http://localhost:3000/api/report | jq '.'
```

## Scaling Notes

For organizations with 1000+ repositories:

- **Increases API calls**: Preparing reports will take longer on first generation
- **Rate limits matter**: GitHub enforces 60 requests/minute for authenticated users (300 for enterprise)
- **Retry logic helps**: Automatic retries prevent temporal failures
- **Batch processing essential**: Processing 10 repos at a time prevents overwhelming the API

For production deployments at scale, consider:
- Caching results with Redis
- Background job queues for report generation
- Webhook subscriptions for incremental updates
- Database storage for historical snapshots
```

---

## Design Decisions

### Batching Strategy (10 Repos at a Time)
Instead of fetching collaborators sequentially (slow) or all-in-parallel (rate limit explosion), the report generation processes repositories in batches of 10 using `Promise.all()`. Each batch waits for completion before starting the next. This balances speed with GitHub's rate limits: 60 requests per minute for authenticated users. Batching of 10 allows multiple batch cycles without hitting limits for organizations with hundreds of repos.

### In-Memory Caching with 5-Minute TTL
The `/api/report` endpoint caches results in memory with a 5-minute time-to-live. This minimizes repeated API calls for organizations that monitor access frequently. The cache is invalidated after 5 minutes to ensure access changes are detected in a reasonable timeframe. The `X-Cache` header indicates whether data was served from cache (HIT) or freshly fetched (MISS).

### Using `affiliation=all` for Collaborators
The collaborators endpoint is called with `?affiliation=all` to capture:
- **Direct collaborators**: Users explicitly added to the repo
- **Team members**: Users with access through organization teams

This provides a complete picture of who has access. Without this parameter, you'd miss team-based access, which is common in organizations.

### Limitation: Nested Team Memberships
The API does not resolve nested team memberships. If a user is in "Team A" and "Team A" is a member of "Team B," the report shows access through "Team A" only, not the transitive "Team B" relationship. Full transitive team resolution would require additional GitHub API calls and caching complexity.

## Scaling Notes

For organizations with 1000+ repositories and multi-server deployments, the following upgrades are now available or recommended:

### Already Implemented ✅
- **Redis Cache Support**: Optional Redis integration for cache persistence and horizontal scaling (see "Caching" section above)
- **Rate Limit Retry Logic**: Automatic retry on 429 responses with exponential backoff (up to 3 retries)
- **Request Logging**: All requests logged for monitoring and debugging
- **Integration Tests**: Comprehensive test suite to verify API contracts

### Recommended for Further Scaling
- **Job Queue**: Use a background job system (Bull, RabbitMQ) to defer report generation and prevent blocking on large orgs
- **Webhooks**: Subscribe to GitHub organization events (member.added, repository.created, etc.) to update cache incrementally
- **Database**: Store historical snapshots to track access changes over time and enable audit trails
- **Pagination**: Implement cursor-based pagination in API responses to handle 50+ MB datasets
- **Async Report Generation**: Expose a job endpoint that returns a job ID, then allow polling for completion
- **CDN/Caching Proxy**: Nginx with caching in front of the API for geographic distribution

=======
# GitAPIAccess
>>>>>>> 571034b52eb2e59d8a5f8d94f37bb8d236f086cc
