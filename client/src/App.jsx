import { useEffect, useMemo, useState } from 'react';

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

export default function App() {
  const [username, setUsername] = useState('');
  const [dashboard, setDashboard] = useState(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('updated');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savedProfiles, setSavedProfiles] = useState([]);
  const [savedError, setSavedError] = useState('');
  const [saving, setSaving] = useState(false);

  async function loadSavedProfiles() {
    try {
      const response = await fetch('/api/saved-profiles');
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || 'Saved profiles are unavailable.');
      setSavedProfiles(result.profiles);
      setSavedError('');
    } catch (loadError) {
      setSavedError(loadError.message);
    }
  }

  useEffect(() => { loadSavedProfiles(); }, []);

  async function saveCurrentProfile() {
    if (!dashboard?.profile?.username) return;
    setSaving(true);
    setSavedError('');
    try {
      const response = await fetch('/api/saved-profiles', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: dashboard.profile.username }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || 'Could not save this profile.');
      await loadSavedProfiles();
    } catch (saveError) {
      setSavedError(saveError.message);
    } finally { setSaving(false); }
  }

  async function removeSavedProfile(profileUsername) {
    try {
      const response = await fetch(`/api/saved-profiles/${encodeURIComponent(profileUsername)}`, { method: 'DELETE' });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Could not remove this profile.');
      }
      setSavedProfiles((profiles) => profiles.filter((profile) => profile.username.toLowerCase() !== profileUsername.toLowerCase()));
    } catch (removeError) { setSavedError(removeError.message); }
  }

  const repositories = useMemo(() => {
    const filtered = (dashboard?.repositories ?? []).filter((repo) =>
      `${repo.name} ${repo.description ?? ''} ${repo.language ?? ''}`.toLowerCase().includes(query.toLowerCase()),
    );
    return filtered.sort((a, b) => sort === 'stars' ? b.stars - a.stars : new Date(b.updatedAt) - new Date(a.updatedAt));
  }, [dashboard, query, sort]);

  const languages = useMemo(() => {
    const totals = new Map();
    for (const repo of dashboard?.repositories ?? []) {
      if (repo.language) totals.set(repo.language, (totals.get(repo.language) ?? 0) + 1);
    }
    const total = [...totals.values()].reduce((sum, count) => sum + count, 0);
    return [...totals.entries()]
      .map(([name, count]) => ({ name, count, percent: total ? Math.round((count / total) * 100) : 0 }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [dashboard]);

  async function handleSubmit(event) {
    event.preventDefault();
    const cleanUsername = username.trim();
    if (!cleanUsername) return;
    setLoading(true);
    setError('');
    setDashboard(null);
    try {
      const response = await fetch(`/api/github/${encodeURIComponent(cleanUsername)}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || 'Could not load GitHub data.');
      setDashboard(result);
    } catch (lookupError) {
      setError(lookupError.message || 'Could not reach the API. Make sure the server is running.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="#home" aria-label="DevPulse home">
          <span className="brand-mark">D</span><span>dev<span className="brand-accent">pulse</span></span>
        </a>
        <span className="connection connection-connected"><span className="connection-dot" />GitHub public data</span>
      </header>

      <section className="welcome" id="home">
        <p className="eyebrow">DEVELOPER COMMAND CENTER</p>
        <h1>Your work, <span>in focus.</span></h1>
        <p className="intro">Explore a developer’s public GitHub projects, find a repository, and see what’s active.</p>
        <form className="lookup-form" onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="github-username">GitHub username</label>
          <span className="input-prefix">github.com/</span>
          <input id="github-username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="username" autoComplete="off" />
          <button type="submit" disabled={loading || !username.trim()}>{loading ? 'Loading…' : 'View dashboard'}<span aria-hidden="true">↗</span></button>
        </form>
        {error && <p className="form-error" role="alert">{error}</p>}
      </section>

      <section className="saved-profiles" aria-label="Saved GitHub profiles">
        <div className="saved-heading"><div><p className="eyebrow">YOUR SHORTLIST</p><h2>Saved profiles</h2></div><span>{savedProfiles.length} saved</span></div>
        {savedProfiles.length ? <ul>{savedProfiles.map((profile) => <li key={profile.username}>
          <button className="saved-profile-link" type="button" onClick={() => { setUsername(profile.username); document.getElementById('github-username')?.focus(); }}><span className="saved-avatar">{profile.username.slice(0, 1).toUpperCase()}</span><span>@{profile.username}</span></button>
          <button className="remove-saved" type="button" onClick={() => removeSavedProfile(profile.username)} aria-label={`Remove ${profile.username} from saved profiles`}>Remove</button>
        </li>)}</ul> : <p className="saved-empty">Save a profile after looking it up to keep it on this device.</p>}
        {savedError && <p className="saved-error" role="status">{savedError.includes('DATABASE_URL') ? 'Saved profiles will be available once the hosted database is connected.' : savedError}</p>}
      </section>

      {!dashboard && !error && !loading && (
        <section className="setup-card empty-prompt">
          <div className="card-icon" aria-hidden="true">⌕</div>
          <div className="setup-copy"><p className="eyebrow">FIRST LOOKUP</p><h2>Start with a GitHub username</h2><p>We’ll show public profile details and repositories. For now, the dashboard uses GitHub’s public data only.</p></div>
        </section>
      )}
      {loading && <div className="loading-panel" role="status"><span className="spinner" />Fetching public GitHub data…</div>}

      {dashboard && (
        <section className="dashboard" aria-live="polite">
          <div className="profile-card">
            <img className="avatar" src={dashboard.profile.avatarUrl} alt="" />
            <div className="profile-info"><p className="eyebrow">GITHUB PROFILE</p><h2>{dashboard.profile.name || dashboard.profile.username}</h2><a href={dashboard.profile.profileUrl} target="_blank" rel="noreferrer">@{dashboard.profile.username} <span aria-hidden="true">↗</span></a>{dashboard.profile.bio && <p className="bio">{dashboard.profile.bio}</p>}</div>
            <div className="profile-actions"><div className="profile-stats"><div><strong>{dashboard.profile.publicRepos}</strong><span>public repos</span></div><div><strong>{dashboard.profile.followers}</strong><span>followers</span></div></div><button className="save-profile" type="button" onClick={saveCurrentProfile} disabled={saving || savedProfiles.some((profile) => profile.username.toLowerCase() === dashboard.profile.username.toLowerCase())}>{savedProfiles.some((profile) => profile.username.toLowerCase() === dashboard.profile.username.toLowerCase()) ? '✓ Saved' : saving ? 'Saving…' : '+ Save profile'}</button></div>
          </div>

          {languages.length > 0 && <section className="language-panel" aria-label="Repository language breakdown">
            <div className="language-heading"><div><p className="eyebrow">TECH STACK</p><h2>Languages</h2></div><span>By repository count</span></div>
            <div className="language-bar" aria-hidden="true">{languages.map((language) => <span key={language.name} style={{ width: `${language.percent}%` }} title={`${language.name}: ${language.count}`} />)}</div>
            <div className="language-list">{languages.slice(0, 6).map((language) => <div className="language-item" key={language.name}><span className="language-name"><i className="language-dot" />{language.name}</span><span>{language.count} <small>repos</small></span><strong>{language.percent}%</strong></div>)}</div>
            <p className="language-note">Based on up to {dashboard.repositoryLimit} loaded repositories that have a detected language.</p>
          </section>}

          <div className="section-heading"><div><p className="eyebrow">PROJECTS</p><h2>Repositories <span className="count">{repositories.length}</span></h2></div><div className="repo-controls"><label className="sr-only" htmlFor="repo-search">Search repositories</label><input id="repo-search" className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search repositories" /><label className="sr-only" htmlFor="repo-sort">Sort repositories</label><select id="repo-sort" value={sort} onChange={(event) => setSort(event.target.value)}><option value="updated">Recently updated</option><option value="stars">Most stars</option></select></div></div>

          {repositories.length ? <div className="repo-grid">{repositories.map((repo) => <article className="repo-card" key={repo.id}>
            <div className="repo-title"><h3><a href={repo.url} target="_blank" rel="noreferrer">{repo.name}<span aria-hidden="true">↗</span></a>{repo.isFork && <span className="fork-badge">Fork</span>}</h3><span className="repo-stars">☆ {repo.stars}</span></div>
            <p className="repo-description">{repo.description || 'No description provided.'}</p>
            <div className="repo-meta"><span>{repo.language && <><i className="language-dot" />{repo.language}</>}</span><span>Updated {formatDate(repo.updatedAt)}</span></div>
          </article>)}</div> : query ? <div className="no-results">No repositories match that search.</div> : <div className="no-repositories"><strong>No public repositories found</strong><span>This dashboard currently shows public GitHub data only. Private repositories will need GitHub sign-in.</span></div>}
          {dashboard.profile.publicRepos > dashboard.repositoryLimit && <p className="limit-note">Showing up to {dashboard.repositoryLimit} repositories, sorted by most recently updated.</p>}
        </section>
      )}

      <footer className="footer"><span>Built as a full-stack portfolio project</span><span>React · Express · GitHub REST API</span></footer>
    </main>
  );
}
