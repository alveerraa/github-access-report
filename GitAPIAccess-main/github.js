require('dotenv').config();
const fetch = require('node-fetch');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_ORG = process.env.GITHUB_ORG;

/**
 * Make a single GET request to the GitHub API
 * Sends authorization token and required headers
 * Includes retry logic for rate limits (429 status)
 * @param {string} endpoint - API endpoint path (without domain)
 * @param {number} retries - Number of retries remaining (default: 3)
 * @returns {Promise<Object>} Parsed JSON response
 * @throws {Error} If response is not ok after retries
 */
async function githubFetch(endpoint, retries = 3) {
  const url = `https://api.github.com/${endpoint}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });

  // Handle rate limiting with retry
  if (response.status === 429 && retries > 0) {
    console.warn(`Rate limited (429). Retrying in 1 second... (${retries} retries left)`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    return githubFetch(endpoint, retries - 1);
  }

  if (!response.ok) {
    throw new Error(`GitHub API error: Status ${response.status} for endpoint ${endpoint}`);
  }

  return response.json();
}

/**
 * Fetch all pages of results from a GitHub API endpoint
 * Automatically handles pagination, fetching up to 100 results per page
 * Continues fetching until a page returns fewer than 100 results
 * @param {string} endpoint - API endpoint path (without domain or query params)
 * @returns {Promise<Array>} Combined array of all paginated results
 */
async function githubFetchAll(endpoint) {
  let allResults = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const url = `${endpoint}?per_page=100&page=${page}`;
    const results = await githubFetch(url);

    allResults = allResults.concat(results);

    // Stop if we got fewer than 100 results (last page)
    if (results.length < 100) {
      hasMore = false;
    }

    page++;
  }

  return allResults;
}

/**
 * Get all repositories for an organization
 * Filters out forks and returns only relevant fields
 * @param {string} org - Organization name
 * @returns {Promise<Array>} Array of repo objects with name, full_name, private, html_url
 * @throws {Error} If API call fails
 */
async function getOrgRepos(org) {
  try {
    const repos = await githubFetchAll(`orgs/${org}/repos`);
    
    return repos
      .filter(repo => !repo.fork)
      .map(repo => ({
        name: repo.name,
        full_name: repo.full_name,
        private: repo.private,
        html_url: repo.html_url
      }));
  } catch (error) {
    throw new Error(`Failed to fetch repositories for org ${org}: ${error.message}`);
  }
}

/**
 * Get all collaborators for a repository
 * Returns login and role for each collaborator
 * Returns empty array if API call fails (e.g., 403 forbidden)
 * @param {string} org - Organization name
 * @param {string} repoName - Repository name
 * @returns {Promise<Array>} Array of collaborator objects with login and role_name
 */
async function getRepoCollaborators(org, repoName) {
  try {
    const collaborators = await githubFetchAll(`repos/${org}/${repoName}/collaborators?affiliation=all`);
    
    return collaborators.map(collaborator => ({
      login: collaborator.login,
      role_name: collaborator.role_name
    }));
  } catch (error) {
    console.warn(`Failed to fetch collaborators for ${org}/${repoName}:`, error.message);
    return [];
  }
}

/**
 * Get all members of an organization
 * @param {string} org - Organization name
 * @returns {Promise<Array>} Array of member objects with login and html_url
 * @throws {Error} If API call fails
 */
async function getOrgMembers(org) {
  try {
    const members = await githubFetchAll(`orgs/${org}/members`);
    
    return members.map(member => ({
      login: member.login,
      html_url: member.html_url
    }));
  } catch (error) {
    throw new Error(`Failed to fetch members for org ${org}: ${error.message}`);
  }
}

/**
 * Generate a comprehensive access report for an organization
 * 
 * Batching Strategy: To avoid rate limit issues with organizations having 100+
 * repositories, this function fetches collaborators in batches of 10 using Promise.all.
 * Each batch waits for completion before the next batch starts, allowing up to 10
 * concurrent API requests per batch without overwhelming the GitHub rate limit.
 * 
 * @param {string} org - Organization name
 * @returns {Promise<Object>} Report with generatedAt, totalRepos, totalUsers, repoMap, userMap
 */
async function generateAccessReport(org) {
  // Get all repos for the organization
  const repos = await getOrgRepos(org);
  
  // Helper function to split an array into chunks
  const chunkArray = (arr, size) => {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  };
  
  // Process repos in batches of 10
  const repoMap = {};
  const chunks = chunkArray(repos, 10);
  
  for (const chunk of chunks) {
    // Fetch collaborators for all repos in this batch in parallel
    const collaboratorResults = await Promise.all(
      chunk.map(repo => getRepoCollaborators(org, repo.name))
    );
    
    // Build repoMap for this batch
    chunk.forEach((repo, index) => {
      repoMap[repo.name] = {
        repoName: repo.name,
        fullName: repo.full_name,
        private: repo.private,
        url: repo.html_url,
        collaborators: collaboratorResults[index]
      };
    });
  }
  
  // Build userMap from repoMap data
  const userMap = {};
  
  Object.values(repoMap).forEach(repo => {
    repo.collaborators.forEach(collaborator => {
      if (!userMap[collaborator.login]) {
        userMap[collaborator.login] = {
          login: collaborator.login,
          repos: []
        };
      }
      
      userMap[collaborator.login].repos.push({
        repoName: repo.repoName,
        role: collaborator.role_name
      });
    });
  });
  
  return {
    generatedAt: new Date().toISOString(),
    totalRepos: repos.length,
    totalUsers: Object.keys(userMap).length,
    repoMap,
    userMap
  };
}

module.exports = { githubFetch, githubFetchAll, getOrgRepos, getRepoCollaborators, getOrgMembers, generateAccessReport };
