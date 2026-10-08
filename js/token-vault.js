// CamoVault encrypted device vault. No GitHub PAT is ever stored in plaintext.
const KEY = 'camovault-github-token-v1';
const ITERATIONS = 310000;
const AAD = new TextEncoder().encode('camovault-github-vault-v1');
const encoder = new TextEncoder();

function cryptoApi() {
  if (!globalThis.crypto?.subtle || !globalThis.crypto?.getRandomValues) throw new Error('Encrypted token storage needs HTTPS and a modern browser');
  return globalThis.crypto;
}
function bytesToBase64(bytes) {
  let text = '';
  for (let i = 0; i < bytes.length; i += 8192) text += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(text);
}
function base64ToBytes(text) {
  const raw = atob(text);
  return Uint8Array.from(raw, character => character.charCodeAt(0));
}
async function encryptionKey(passphrase, salt) {
  const baseKey = await cryptoApi().subtle.importKey('raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return cryptoApi().subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS }, baseKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
function validateProfile({ token, owner, repo }) {
  if (typeof token !== 'string' || token.trim().length < 20 || token.length > 500) throw new Error('Enter a valid fine-grained GitHub token before saving');
  if (typeof owner !== 'string' || !/^[a-zA-Z0-9-]{1,39}$/.test(owner)) throw new Error('Enter a valid GitHub username');
  if (typeof repo !== 'string' || !/^[\w.-]{1,100}$/.test(repo) || repo === '.' || repo === '..') throw new Error('Enter a valid GitHub backup repository');
}
export async function encryptTokenVault(profile, passphrase) {
  validateProfile(profile);
  if (typeof passphrase !== 'string' || passphrase.length < 12) throw new Error('Choose a vault password of at least 12 characters');
  const salt = cryptoApi().getRandomValues(new Uint8Array(16));
  const iv = cryptoApi().getRandomValues(new Uint8Array(12));
  const key = await encryptionKey(passphrase, salt);
  const plaintext = encoder.encode(JSON.stringify({ token: profile.token.trim(), owner: profile.owner, repo: profile.repo }));
  const encrypted = await cryptoApi().subtle.encrypt({ name: 'AES-GCM', iv, additionalData: AAD }, key, plaintext);
  return { version: 1, iterations: ITERATIONS, salt: bytesToBase64(salt), iv: bytesToBase64(iv), ciphertext: bytesToBase64(new Uint8Array(encrypted)) };
}
export async function decryptTokenVault(vault, passphrase) {
  if (!vault || vault.version !== 1 || vault.iterations !== ITERATIONS || typeof vault.salt !== 'string' || typeof vault.iv !== 'string' || typeof vault.ciphertext !== 'string') throw new Error('Saved token vault is invalid');
  if (typeof passphrase !== 'string' || !passphrase) throw new Error('Enter your vault password');
  try {
    const salt = base64ToBytes(vault.salt);
    const iv = base64ToBytes(vault.iv);
    if (salt.length !== 16 || iv.length !== 12) throw new Error('Invalid encryption parameters');
    const key = await encryptionKey(passphrase, salt);
    const bytes = await cryptoApi().subtle.decrypt({ name: 'AES-GCM', iv, additionalData: AAD }, key, base64ToBytes(vault.ciphertext));
    const profile = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    validateProfile(profile);
    return profile;
  } catch { throw new Error('Incorrect vault password or damaged saved token'); }
}
export function hasSavedToken(storage = globalThis.localStorage) {
  try { return storage.getItem(KEY) !== null; }
  catch { return false; }
}
export async function saveTokenVault(profile, passphrase, storage = globalThis.localStorage) {
  const vault = await encryptTokenVault(profile, passphrase);
  storage.setItem(KEY, JSON.stringify(vault));
}
export async function unlockTokenVault(passphrase, storage = globalThis.localStorage) {
  const stored = storage.getItem(KEY);
  if (!stored) throw new Error('No encrypted GitHub token is saved on this device');
  let vault;
  try { vault = JSON.parse(stored); }
  catch { throw new Error('Saved token vault is damaged'); }
  return decryptTokenVault(vault, passphrase);
}
export function forgetTokenVault(storage = globalThis.localStorage) {
  storage.removeItem(KEY);
}
