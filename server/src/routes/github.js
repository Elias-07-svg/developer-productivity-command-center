import { Router } from 'express';

const router = Router();
const GITHUB_API = 'https://api.github.com';
const USERNAME_PATTERN = /^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i;

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
      })),
      repositoryLimit: 100,
    });
  } catch (error) {
    console.error('GitHub lookup failed:', error);
    return res.status(502).json({ error: { message: 'Could not connect to GitHub. Please try again.' } });
  }
});

export default router;
