# GitHub Access Report API – Explanation

## What This Project Does
This project generates a report showing which users have access to which repositories in a GitHub organization.

It connects to the GitHub API, collects repository and collaborator data, and organizes it into a structured format that can be accessed via API.

---

## How It Works (Simple Flow)

1. Fetch all repositories of an organization  
2. For each repository, fetch its collaborators  
3. Process data into two formats:
   - Repository → Users  
   - User → Repositories  
4. Store the result in cache  
5. Return the data through an API endpoint  

---

## Key Components

### github.js
Handles all communication with GitHub API:
- Fetches repositories  
- Fetches collaborators  
- Handles pagination  
- Retries on rate limits  

---

### app.js
Main server file:
- Creates API endpoints  
- Handles requests and responses  
- Manages in-memory caching  
- Sends JSON output  

---

### index.html
Simple UI to:
- Load full report  
- Search for a user  
- Clear cache  

---

## Important Concepts

### Batching
Repositories are processed in groups (e.g., 10 at a time) using `Promise.all()` to improve speed and avoid rate limits.

---

### Caching
The generated report is stored in memory for 5 minutes:
- First request → slow (fetch from GitHub)  
- Next requests → fast (served from cache)  

---

### Pagination
GitHub returns data in pages (max 100 items).  
The app keeps fetching pages until all data is collected.

---

### Error Handling
- If a repository cannot be accessed, it is skipped  
- If rate limited, the request is retried  

---

## API Endpoints

### GET /api/report
Returns full access report

### GET /api/report/user/:username
Returns repositories for a specific user

### POST /api/cache/clear
Clears cached data

---

## Data Output Format

Example:
```json
{
  "alv": [
    { "repoName": "frontend", "role": "admin" }
  ]
}
```

---

## Optimizations Used
- Parallel API calls using Promise.all()  
- Batch processing to control request load  
- In-memory caching (5-minute TTL)  
- Retry logic for rate limits  

---

## Assumptions
- GitHub token has required permissions  
- Organization is accessible  

---

## Summary
This project efficiently collects and organizes GitHub access data, providing a simple API to view which users can access which repositories.
