import { Octokit } from '@octokit/rest';
import { logger } from '../logger.js';

// Initialize Octokit with environment variable
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

/**
 * Enhanced GitHub tool with comprehensive repository management capabilities
 */

/**
 * Create a pull request
 * @param {object} params - Parameters
 * @param {string} params.owner - Repository owner
 * @param {string} params.repo - Repository name
 * @param {string} params.title - Pull request title
 * @param {string} params.head - Head branch
 * @param {string} params.base - Base branch
 * @param {string} [params.body] - Pull request body
 * @param {boolean} [params.draft] - Create as draft
 * @returns {Promise<object>} Pull request data
 */
export async function mcp_github_create_pull_request(params) {
  logger.info('Executing mcp_github_create_pull_request', { params });

  try {
    const { owner, repo, title, head, base, body = '', draft = false } = params;

    // Input validation
    if (!owner || !repo || !title || !head || !base) {
      throw new Error('Missing required parameters: owner, repo, title, head, base');
    }

    if (!process.env.GITHUB_TOKEN) {
      throw new Error('GITHUB_TOKEN environment variable is required');
    }

    const response = await octokit.pulls.create({
      owner,
      repo,
      title,
      head,
      base,
      body,
      draft
    });

    logger.info('Successfully created pull request', {
      pr: response.data.html_url,
      number: response.data.number
    });

    return {
      success: true,
      pullRequest: {
        number: response.data.number,
        title: response.data.title,
        url: response.data.html_url,
        state: response.data.state,
        draft: response.data.draft,
        head: response.data.head.ref,
        base: response.data.base.ref,
        created_at: response.data.created_at,
        author: response.data.user.login
      }
    };

  } catch (error) {
    logger.error('mcp_github_create_pull_request failed', { error: error.message });
    throw new Error(`GitHub PR creation failed: ${error.message}`);
  }
}

/**
 * List pull requests
 * @param {object} params - Parameters
 * @param {string} params.owner - Repository owner
 * @param {string} params.repo - Repository name
 * @param {string} [params.state] - PR state (open, closed, all)
 * @param {number} [params.per_page] - Results per page
 * @returns {Promise<object>} Pull requests list
 */
export async function mcp_github_list_pull_requests(params) {
  logger.info('Executing mcp_github_list_pull_requests', { params });

  try {
    const { owner, repo, state = 'open', per_page = 30 } = params;

    if (!owner || !repo) {
      throw new Error('Missing required parameters: owner, repo');
    }

    const response = await octokit.pulls.list({
      owner,
      repo,
      state,
      per_page
    });

    const pullRequests = response.data.map(pr => ({
      number: pr.number,
      title: pr.title,
      url: pr.html_url,
      state: pr.state,
      draft: pr.draft,
      head: pr.head.ref,
      base: pr.base.ref,
      created_at: pr.created_at,
      updated_at: pr.updated_at,
      author: pr.user.login,
      mergeable: pr.mergeable,
      mergeable_state: pr.mergeable_state
    }));

    logger.info(`Found ${pullRequests.length} pull requests in ${owner}/${repo}`);

    return {
      success: true,
      pullRequests,
      count: pullRequests.length,
      repository: `${owner}/${repo}`
    };

  } catch (error) {
    logger.error('mcp_github_list_pull_requests failed', { error: error.message });
    throw new Error(`GitHub PR listing failed: ${error.message}`);
  }
}

/**
 * Get repository information and analytics
 * @param {object} params - Parameters
 * @param {string} params.owner - Repository owner
 * @param {string} params.repo - Repository name
 * @param {boolean} [params.includeStats] - Include detailed statistics
 * @returns {Promise<object>} Repository information
 */
export async function mcp_github_get_repository_info(params) {
  logger.info('Executing mcp_github_get_repository_info', { params });

  try {
    const { owner, repo, includeStats = true } = params;

    if (!owner || !repo) {
      throw new Error('Missing required parameters: owner, repo');
    }

    // Get basic repository info
    const repoResponse = await octokit.repos.get({
      owner,
      repo
    });

    const repoData = {
      name: repoResponse.data.name,
      fullName: repoResponse.data.full_name,
      description: repoResponse.data.description,
      url: repoResponse.data.html_url,
      language: repoResponse.data.language,
      languages: {},
      size: repoResponse.data.size,
      stargazers: repoResponse.data.stargazers_count,
      watchers: repoResponse.data.watchers_count,
      forks: repoResponse.data.forks_count,
      openIssues: repoResponse.data.open_issues_count,
      defaultBranch: repoResponse.data.default_branch,
      private: repoResponse.data.private,
      archived: repoResponse.data.archived,
      disabled: repoResponse.data.disabled,
      created_at: repoResponse.data.created_at,
      updated_at: repoResponse.data.updated_at,
      pushed_at: repoResponse.data.pushed_at,
      license: repoResponse.data.license?.name
    };

    if (includeStats) {
      try {
        // Get languages
        const languagesResponse = await octokit.repos.listLanguages({
          owner,
          repo
        });
        repoData.languages = languagesResponse.data;

        // Get contributors
        const contributorsResponse = await octokit.repos.listContributors({
          owner,
          repo,
          per_page: 10
        });
        repoData.topContributors = contributorsResponse.data.map(contributor => ({
          login: contributor.login,
          contributions: contributor.contributions,
          avatar_url: contributor.avatar_url
        }));

        // Get recent commits
        const commitsResponse = await octokit.repos.listCommits({
          owner,
          repo,
          per_page: 5
        });
        repoData.recentCommits = commitsResponse.data.map(commit => ({
          sha: commit.sha.substring(0, 7),
          message: commit.commit.message.split('\n')[0],
          author: commit.commit.author.name,
          date: commit.commit.author.date,
          url: commit.html_url
        }));

      } catch (statsError) {
        logger.warn('Failed to fetch additional repository stats', { error: statsError.message });
        repoData.statsError = statsError.message;
      }
    }

    logger.info('Successfully retrieved repository information', {
      repo: `${owner}/${repo}`,
      stars: repoData.stargazers,
      language: repoData.language
    });

    return {
      success: true,
      repository: repoData
    };

  } catch (error) {
    logger.error('mcp_github_get_repository_info failed', { error: error.message });
    throw new Error(`GitHub repository info failed: ${error.message}`);
  }
}

/**
 * Create an issue
 * @param {object} params - Parameters
 * @param {string} params.owner - Repository owner
 * @param {string} params.repo - Repository name
 * @param {string} params.title - Issue title
 * @param {string} [params.body] - Issue body
 * @param {string[]} [params.labels] - Issue labels
 * @param {string[]} [params.assignees] - Issue assignees
 * @returns {Promise<object>} Created issue data
 */
export async function mcp_github_create_issue(params) {
  logger.info('Executing mcp_github_create_issue', { params });

  try {
    const { owner, repo, title, body = '', labels = [], assignees = [] } = params;

    if (!owner || !repo || !title) {
      throw new Error('Missing required parameters: owner, repo, title');
    }

    const response = await octokit.issues.create({
      owner,
      repo,
      title,
      body,
      labels,
      assignees
    });

    logger.info('Successfully created issue', {
      issue: response.data.html_url,
      number: response.data.number
    });

    return {
      success: true,
      issue: {
        number: response.data.number,
        title: response.data.title,
        url: response.data.html_url,
        state: response.data.state,
        created_at: response.data.created_at,
        author: response.data.user.login,
        labels: response.data.labels.map(label => label.name)
      }
    };

  } catch (error) {
    logger.error('mcp_github_create_issue failed', { error: error.message });
    throw new Error(`GitHub issue creation failed: ${error.message}`);
  }
}

/**
 * Search repositories
 * @param {object} params - Parameters
 * @param {string} params.query - Search query
 * @param {string} [params.sort] - Sort criteria (stars, forks, updated)
 * @param {string} [params.order] - Sort order (asc, desc)
 * @param {number} [params.per_page] - Results per page
 * @returns {Promise<object>} Search results
 */
export async function mcp_github_search_repositories(params) {
  logger.info('Executing mcp_github_search_repositories', { params });

  try {
    const { query, sort = 'stars', order = 'desc', per_page = 10 } = params;

    if (!query) {
      throw new Error('Missing required parameter: query');
    }

    const response = await octokit.search.repos({
      q: query,
      sort,
      order,
      per_page
    });

    const repositories = response.data.items.map(repo => ({
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      url: repo.html_url,
      language: repo.language,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      updated_at: repo.updated_at,
      owner: repo.owner.login
    }));

    logger.info(`Found ${repositories.length} repositories for query: ${query}`);

    return {
      success: true,
      repositories,
      totalCount: response.data.total_count,
      query
    };

  } catch (error) {
    logger.error('mcp_github_search_repositories failed', { error: error.message });
    throw new Error(`GitHub repository search failed: ${error.message}`);
  }
}

/**
 * Get file content from repository
 * @param {object} params - Parameters
 * @param {string} params.owner - Repository owner
 * @param {string} params.repo - Repository name
 * @param {string} params.path - File path
 * @param {string} [params.ref] - Branch/commit reference
 * @returns {Promise<object>} File content
 */
export async function mcp_github_get_file_content(params) {
  logger.info('Executing mcp_github_get_file_content', { params });

  try {
    const { owner, repo, path, ref = 'main' } = params;

    if (!owner || !repo || !path) {
      throw new Error('Missing required parameters: owner, repo, path');
    }

    const response = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref
    });

    const fileData = response.data;
    
    if (fileData.type !== 'file') {
      throw new Error(`Path ${path} is not a file`);
    }

    const content = Buffer.from(fileData.content, 'base64').toString('utf8');

    return {
      success: true,
      file: {
        name: fileData.name,
        path: fileData.path,
        size: fileData.size,
        content,
        encoding: fileData.encoding,
        sha: fileData.sha,
        url: fileData.html_url,
        download_url: fileData.download_url
      }
    };

  } catch (error) {
    logger.error('mcp_github_get_file_content failed', { error: error.message });
    throw new Error(`GitHub file content retrieval failed: ${error.message}`);
  }
}

export default {
  mcp_github_create_pull_request,
  mcp_github_list_pull_requests,
  mcp_github_get_repository_info,
  mcp_github_create_issue,
  mcp_github_search_repositories,
  mcp_github_get_file_content
};
