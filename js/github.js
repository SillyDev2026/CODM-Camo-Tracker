// Fine-grained GitHub PAT stays ONLY in application memory. Never commit, log, or persist it.
const BASE = 'https://api.github.com';
function validateRepo(owner, repo) {
  if (!/^[\w-]{1,39}$/.test(owner) || !/^[\w.-]{1,100}$/.test(repo) || repo === '.' || repo === '..') throw new Error('Enter a valid GitHub owner and repository');
}
export function cloudPath(profile) {
  if (!/^[\w-]{6,100}$/.test(profile.id)) throw new Error('Invalid player profile ID');
  return `camovault/profiles/${profile.id}.json`;
}
async function api(token, url, init = {}) {
  if (!token || typeof token !== 'string') throw new Error('Enter your fine-grained GitHub token');
  const response = await fetch(`${BASE}${url}`, {
    ...init,
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token.trim()}`, 'X-GitHub-Api-Version': '2022-11-28', ...init.headers },
    cache: 'no-store'
  });
  if (response.status === 404) return { status: 404, data: null };
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`GitHub ${response.status}: ${data.message || 'Request failed'}`);
  return { status: response.status, data };
}
function encodeUtf8Base64(text) {
  const bytes = new TextEncoder().encode(text);
  let output = '';
  for (let i = 0; i < bytes.length; i += 0x8000) output += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(output);
}
function decodeUtf8Base64(text) {
  const bin = atob(text.replace(/\s/g, ''));
  return new TextDecoder().decode(Uint8Array.from(bin, char => char.charCodeAt(0)));
}
export async function readCloudProfile(token, owner, repo, profile) {
  validateRepo(owner, repo);
  const path = cloudPath(profile);
  const { data } = await api(token, `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path}`);
  if (!data) return { profile: null, sha: null };
  if (data.type !== 'file' || !data.content) throw new Error('GitHub backup file has an invalid format');
  if (data.size > 2_000_000) throw new Error('Backup is larger than 2 MB');
  let parsed;
  try { parsed = JSON.parse(decodeUtf8Base64(data.content)); }
  catch { throw new Error('Backup on GitHub is not valid JSON'); }
  return { profile: parsed, sha: data.sha };
}
export async function writeCloudProfile(token, owner, repo, profile) {
  validateRepo(owner, repo);
  const remote = await readCloudProfile(token, owner, repo, profile);
  // Refuse accidental overwrite of an independently modified copy.
  if (remote.profile && Number(remote.profile.savedAt || 0) > Number(profile.cloudSyncAt || 0)) {
    throw new Error('GitHub has a newer backup. Download it first or export a local backup before overwriting.');
  }
  const payload = { version: 1, id: profile.id, name: profile.name, createdAt: profile.createdAt, progress: profile.progress, builds: profile.builds || {}, attachmentLibrary: profile.attachmentLibrary || {}, savedAt: Date.now() };
  const path = cloudPath(profile);
  const body = { message: `Backup CODM camo progress (${profile.name})`, content: encodeUtf8Base64(JSON.stringify(payload, null, 2)) };
  if (remote.sha) body.sha = remote.sha;
  const result = await api(token, `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { commit: result.data.commit?.sha, savedAt: payload.savedAt };
}
