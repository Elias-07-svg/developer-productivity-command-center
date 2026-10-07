import { useEffect, useMemo, useState } from 'react';

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

function auditItems(repo) {
  const daysSincePush = (Date.now() - new Date(repo.pushedAt || repo.updatedAt).getTime()) / 86_400_000;
  return [
    { label: 'Description', ready: Boolean(repo.description), action: 'Add a one-line project description.' },
    { label: 'README', ready: repo.hasReadme === true, unknown: repo.hasReadme === null, action: 'Add a README with setup steps and a screenshot.' },
    { label: 'License', ready: Boolean(repo.license), action: 'Choose and add a license if you want others to reuse this project.' },
    { label: 'Topics', ready: repo.topics?.length > 0, action: 'Add topic tags so people can understand and find this project.' },
    { label: 'Automated checks', ready: repo.hasWorkflows === true, unknown: repo.hasWorkflows === null, action: 'Add a GitHub Actions workflow to build or test changes automatically.' },
    { label: 'Recent activity', ready: daysSincePush <= 180, action: 'Review whether this project is still active; update it or mark it complete.' },
  ];
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

  async function loadDashboard(cleanUsername) {
    setUsername(cleanUsername);
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
    } finally { setLoading(false); }
  }

  const repositories = useMemo(() => {
    const filtered = (dashboard?.repositories ?? []).filter((repo) =>
      `${repo.name} ${repo.description ?? ''} ${repo.language ?? ''}`.toLowerCase().includes(query.toLowerCase()),
    );
    return filtered.sort((a, b) => sort === 'stars' ? b.stars - a.stars : sort === 'attention' ? auditItems(b).filter((item) => !item.ready && !item.unknown).length - auditItems(a).filter((item) => !item.ready && !item.unknown).length : new Date(b.updatedAt) - new Date(a.updatedAt));
  }, [dashboard, query, sort]);

  const originalRepositories = useMemo(() => (dashboard?.repositories ?? []).filter((repo) => !repo.isFork && !repo.archived), [dashboard]);
  const auditSummary = useMemo(() => {
    const checks = originalRepositories.map(auditItems);
    return {
      repos: originalRepositories.length,
      readmeChecked: originalRepositories.filter((repo) => repo.hasReadme !== null).length,
      missingReadme: originalRepositories.filter((repo) => repo.hasReadme === false).length,
      missingWorkflows: originalRepositories.filter((repo) => repo.hasWorkflows === false).length,
      workflowsChecked: originalRepositories.filter((repo) => repo.hasWorkflows !== null).length,
      missingDescription: originalRepositories.filter((repo) => !repo.description).length,
      missingLicense: originalRepositories.filter((repo) => !repo.license).length,
      missingTopics: originalRepositories.filter((repo) => !repo.topics?.length).length,
      stale: checks.filter((items) => !items.find((item) => item.label === 'Recent activity')?.ready).length,
    };
  }, [originalRepositories]);

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
    await loadDashboard(cleanUsername);
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
        <p className="intro">Review public repositories for portfolio basics and get a practical list of improvements to make projects easier to understand and showcase.</p>
        <form className="lookup-form" onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="github-username">GitHub username</label>
          <span className="input-prefix">github.com/</span>
          <input id="github-username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="username" autoComplete="off" />
          <button type="submit" disabled={loading || !username.trim()}>{loading ? 'Auditing…' : 'Audit repositories'}<span aria-hidden="true">↗</span></button>
        </form>
        {error && <p className="form-error" role="alert">{error}</p>}
      </section>

      <section className="saved-profiles" aria-label="GitHub account audit watchlist">
        <div className="saved-heading"><div><p className="eyebrow">YOUR WATCHLIST</p><h2>Saved accounts</h2></div><span>{savedProfiles.length} tracked</span></div>
        {savedProfiles.length ? <ul>{savedProfiles.map((profile) => <li key={profile.username}>
          <button className="saved-profile-link" type="button" onClick={() => loadDashboard(profile.username)}><span className="saved-avatar">{profile.username.slice(0, 1).toUpperCase()}</span><span>Run audit for @{profile.username}</span></button>
          <button className="remove-saved" type="button" onClick={() => removeSavedProfile(profile.username)} aria-label={`Remove ${profile.username} from saved profiles`}>Remove</button>
        </li>)}</ul> : <p className="saved-empty">Track a GitHub account after auditing it to rerun the checklist later.</p>}
        {savedError && <p className="saved-error" role="status">{savedError.includes('DATABASE_URL') ? 'Saved profiles will be available once the hosted database is connected.' : savedError}</p>}
      </section>

      {!dashboard && !error && !loading && (
        <section className="setup-card empty-prompt">
          <div className="card-icon" aria-hidden="true">⌕</div>
          <div className="setup-copy"><p className="eyebrow">PORTFOLIO AUDIT</p><h2>Find your next improvement</h2><p>Enter a GitHub username to review public repositories for useful portfolio basics and get a clear list of next steps.</p></div>
        </section>
      )}
      {loading && <div className="loading-panel" role="status"><span className="spinner" />Fetching public GitHub data…</div>}

      {dashboard && (
        <section className="dashboard" aria-live="polite">
          <div className="profile-card">
            <img className="avatar" src={dashboard.profile.avatarUrl} alt="" />
            <div className="profile-info"><p className="eyebrow">GITHUB PROFILE</p><h2>{dashboard.profile.name || dashboard.profile.username}</h2><a href={dashboard.profile.profileUrl} target="_blank" rel="noreferrer">@{dashboard.profile.username} <span aria-hidden="true">↗</span></a>{dashboard.profile.bio && <p className="bio">{dashboard.profile.bio}</p>}</div>
            <div className="profile-actions"><div className="profile-stats"><div><strong>{dashboard.profile.publicRepos}</strong><span>public repos</span></div><div><strong>{dashboard.profile.followers}</strong><span>followers</span></div></div><button className="save-profile" type="button" onClick={saveCurrentProfile} disabled={saving || savedProfiles.some((profile) => profile.username.toLowerCase() === dashboard.profile.username.toLowerCase())}>{savedProfiles.some((profile) => profile.username.toLowerCase() === dashboard.profile.username.toLowerCase()) ? '✓ In your watchlist' : saving ? 'Saving…' : '+ Track for later audits'}</button></div>
          </div>

          {auditSummary.repos > 0 && <section className="audit-panel" aria-label="Portfolio audit summary">
            <div className="audit-heading"><div><p className="eyebrow">PORTFOLIO AUDIT</p><h2>Small improvements, clearer projects</h2></div><span>Original, non-archived repositories</span></div>
            <p className="audit-intro">A checklist based on public repository details—not a quality grade. Start with the gaps that make projects harder to evaluate.</p>
            <div className="audit-summary-grid">
              <div className="audit-summary-item"><strong>{auditSummary.missingReadme} / {auditSummary.readmeChecked}</strong><span>missing README / checked</span></div>
              <div className="audit-summary-item"><strong>{auditSummary.missingDescription}</strong><span>missing description</span></div>
              <div className="audit-summary-item"><strong>{auditSummary.missingLicense}</strong><span>missing license</span></div>
              <div className="audit-summary-item"><strong>{auditSummary.missingTopics}</strong><span>missing topics</span></div>
              <div className="audit-summary-item"><strong>{auditSummary.missingWorkflows} / {auditSummary.workflowsChecked}</strong><span>no automated checks / checked</span></div>
              <div className="audit-summary-item"><strong>{auditSummary.stale}</strong><span>no push in 180 days</span></div>
            </div>
            {auditSummary.readmeChecked < auditSummary.repos && <p className="audit-note">README and workflow checks cover up to {dashboard.readmeAuditLimit} recently updated original repositories to conserve GitHub’s public API quota. The other checks use repository details already loaded.</p>}
          </section>}

          {languages.length > 0 && <section className="language-panel" aria-label="Repository language breakdown">
            <div className="language-heading"><div><p className="eyebrow">TECH STACK</p><h2>Languages</h2></div><span>By repository count</span></div>
            <div className="language-bar" aria-hidden="true">{languages.map((language) => <span key={language.name} style={{ width: `${language.percent}%` }} title={`${language.name}: ${language.count}`} />)}</div>
            <div className="language-list">{languages.slice(0, 6).map((language) => <div className="language-item" key={language.name}><span className="language-name"><i className="language-dot" />{language.name}</span><span>{language.count} <small>repos</small></span><strong>{language.percent}%</strong></div>)}</div>
            <p className="language-note">Based on up to {dashboard.repositoryLimit} loaded repositories that have a detected language.</p>
          </section>}

          <div className="section-heading"><div><p className="eyebrow">PROJECTS</p><h2>Repository checklist <span className="count">{repositories.length}</span></h2></div><div className="repo-controls"><label className="sr-only" htmlFor="repo-search">Search repositories</label><input id="repo-search" className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search repositories" /><label className="sr-only" htmlFor="repo-sort">Sort repositories</label><select id="repo-sort" value={sort} onChange={(event) => setSort(event.target.value)}><option value="updated">Recently updated</option><option value="stars">Most stars</option><option value="attention">Needs attention</option></select></div></div>

          {repositories.length ? <div className="repo-grid">{repositories.map((repo) => <article className="repo-card" key={repo.id}>
            <div className="repo-title"><h3><a href={repo.url} target="_blank" rel="noreferrer">{repo.name}<span aria-hidden="true">↗</span></a>{repo.isFork && <span className="fork-badge">Fork</span>}</h3><span className="repo-stars">☆ {repo.stars}</span></div>
            <p className="repo-description">{repo.description || 'No description yet. Add one to make the project easier to recognize.'}</p>
            {!repo.isFork && !repo.archived && <div className="repo-audit-list" aria-label={`${repo.name} audit checklist`}>{auditItems(repo).map((item) => <div className={`repo-audit-item ${item.unknown ? 'audit-unknown' : item.ready ? 'audit-ready' : 'audit-missing'}`} key={item.label}><span className="audit-check-icon" aria-hidden="true">{item.unknown ? '·' : item.ready ? '✓' : '!'}</span><span><strong>{item.label}</strong><small>{item.unknown ? 'Not checked' : item.ready ? 'Looks good' : item.action}</small></span></div>)}</div>}
            <div className="repo-meta"><span>{repo.language && <><i className="language-dot" />{repo.language}</>}</span><span>Updated {formatDate(repo.updatedAt)}</span></div>
          </article>)}</div> : query ? <div className="no-results">No repositories match that search.</div> : <div className="no-repositories"><strong>No public repositories found</strong><span>This dashboard currently shows public GitHub data only. Private repositories will need GitHub sign-in.</span></div>}
          {dashboard.profile.publicRepos > dashboard.repositoryLimit && <p className="limit-note">Showing up to {dashboard.repositoryLimit} repositories, sorted by most recently updated.</p>}
        </section>
      )}

      <footer className="footer"><span>Built as a full-stack portfolio project</span><span>React · Express · GitHub REST API</span></footer>
    </main>
  );
}
