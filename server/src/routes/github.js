import { Router } from 'express';

const router = Router();
const GITHUB_API = 'https://api.github.com';
const USERNAME_PATTERN = /^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i;
const README_AUDIT_LIMIT = 12;

async function githubRequest(path) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'DevPulse-Portfolio',
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return fetch(`${GITHUB_API}${path}`, { headers });
}

router.get('/:username', async (req, res) => {
  const username = req.params.username.trim();
  if (!USERNAME_PATTERN.test(username)) {
    return res.status(400).json({ error: { message: 'Enter a valid GitHub username.' } });
  }

  try {
    const profileResponse = await githubRequest(`/users/${encodeURIComponent(username)}`);
    if (profileResponse.status === 404) {
      return res.status(404).json({ error: { message: `GitHub user “${username}” was not found.` } });
    }
    if (!profileResponse.ok) {
      return res.status(profileResponse.status === 403 ? 429 : 502).json({
        error: { message: profileResponse.status === 403 ? 'GitHub rate limit reached. Try again later.' : 'GitHub could not return this profile.' },
      });
    }

    const profile = await profileResponse.json();
    const repositoriesResponse = await githubRequest(`/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated`);
    if (!repositoriesResponse.ok) {
      return res.status(repositoriesResponse.status === 403 ? 429 : 502).json({
        error: { message: repositoriesResponse.status === 403 ? 'GitHub rate limit reached. Try again later.' : 'GitHub could not return this user’s repositories.' },
      });
    }

    const repositories = await repositoriesResponse.json();
    const repositoriesToAudit = repositories.filter((repo) => !repo.fork && !repo.archived).slice(0, README_AUDIT_LIMIT);
    const readmeResults = new Map();
    for (let index = 0; index < repositoriesToAudit.length; index += 3) {
      const batch = repositoriesToAudit.slice(index, index + 3);
      const results = await Promise.all(batch.map(async (repo) => {
        try {
          const owner = encodeURIComponent(profile.login);
          const repository = encodeURIComponent(repo.name);
          const [readmeResponse, workflowsResponse] = await Promise.all([
            githubRequest(`/repos/${owner}/${repository}/readme`),
            githubRequest(`/repos/${owner}/${repository}/actions/workflows?per_page=1`),
          ]);
          const hasReadme = readmeResponse.ok ? true : readmeResponse.status === 404 ? false : null;
          let hasWorkflows = null;
          if (workflowsResponse.ok) {
            const workflowData = await workflowsResponse.json();
            hasWorkflows = workflowData.total_count > 0;
          } else if (workflowsResponse.status === 404) {
            hasWorkflows = false;
          }
          return [repo.id, hasReadme, hasWorkflows];
        } catch {
          return [repo.id, null, null];
        }
      }));
      results.forEach(([id, hasReadme, hasWorkflows]) => readmeResults.set(id, { hasReadme, hasWorkflows }));
    }

    return res.json({
      profile: {
        username: profile.login,
        name: profile.name,
        avatarUrl: profile.avatar_url,
        profileUrl: profile.html_url,
        bio: profile.bio,
        followers: profile.followers,
        publicRepos: profile.public_repos,
      },
      repositories: repositories.map((repo) => ({
        id: repo.id,
        name: repo.name,
        description: repo.description,
        url: repo.html_url,
        isFork: repo.fork,
        language: repo.language,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        updatedAt: repo.updated_at,
        pushedAt: repo.pushed_at,
        license: repo.license?.spdx_id || null,
        topics: repo.topics || [],
        archived: repo.archived,
        hasReadme: readmeResults.get(repo.id)?.hasReadme ?? null,
        hasWorkflows: readmeResults.get(repo.id)?.hasWorkflows ?? null,
      })),
      repositoryLimit: 100,
      readmeAuditLimit: README_AUDIT_LIMIT,
    });
  } catch (error) {
    console.error('GitHub lookup failed:', error);
    return res.status(502).json({ error: { message: 'Could not connect to GitHub. Please try again.' } });
  }
});

export default router;
