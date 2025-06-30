import { Octokit } from '@octokit/rest';
import config from '../config.js';
import logger from '../logger.js';

const octokit = new Octokit({
  auth: config.github.token,
});

class GitHubTool {
  constructor() {
    this.name = 'mcp_github';
    this.description = 'A tool for interacting with GitHub repositories.';
  }

  async create_pull_request({ owner, repo, title, head, base, body }) {
    try {
      const response = await octokit.pulls.create({
        owner,
        repo,
        title,
        head,
        base,
        body,
      });
      logger.info('Successfully created pull request', {
        pr: response.data.html_url,
      });
      return { success: true, ...response.data };
    } catch (error) {
      logger.error('Error creating pull request', {
        error: error.message,
        owner,
        repo,
      });
      return { success: false, error: error.message };
    }
  }

  async list_pull_requests({ owner, repo, state = 'open' }) {
    try {
      const response = await octokit.pulls.list({
        owner,
        repo,
        state,
      });
      logger.info(
        `Found ${response.data.length} pull requests in ${owner}/${repo}`
      );
      return { success: true, pull_requests: response.data };
    } catch (error) {
      logger.error('Error listing pull requests', {
        error: error.message,
        owner,
        repo,
      });
      return { success: false, error: error.message };
    }
  }

  async get_pull_request({ owner, repo, pull_number }) {
    try {
      const response = await octokit.pulls.get({
        owner,
        repo,
        pull_number,
      });
      return { success: true, ...response.data };
    } catch (error) {
      logger.error('Error getting pull request', {
        error: error.message,
        pull_number,
      });
      return { success: false, error: error.message };
    }
  }

  async create_issue({ owner, repo, title, body }) {
    try {
      const response = await octokit.issues.create({
        owner,
        repo,
        title,
        body,
      });
      logger.info('Successfully created issue', {
        issue: response.data.html_url,
      });
      return { success: true, ...response.data };
    } catch (error) {
      logger.error('Error creating issue', {
        error: error.message,
        owner,
        repo,
      });
      return { success: false, error: error.message };
    }
  }

  async list_issues({ owner, repo, state = 'open' }) {
    try {
      const response = await octokit.issues.listForRepo({
        owner,
        repo,
        state,
      });
      logger.info(`Found ${response.data.length} issues in ${owner}/${repo}`);
      return { success: true, issues: response.data };
    } catch (error) {
      logger.error('Error listing issues', {
        error: error.message,
        owner,
        repo,
      });
      return { success: false, error: error.message };
    }
  }

  async get_repository_info({ owner, repo }) {
    try {
      const response = await octokit.repos.get({
        owner,
        repo,
      });
      return { success: true, ...response.data };
    } catch (error) {
      logger.error('Error getting repository info', {
        error: error.message,
        owner,
        repo,
      });
      return { success: false, error: error.message };
    }
  }
}

const githubTool = new GitHubTool();
export default githubTool;
