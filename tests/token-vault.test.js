import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { encryptTokenVault, decryptTokenVault, hasSavedToken, saveTokenVault, unlockTokenVault, forgetTokenVault } from '../js/token-vault.js';
if (!globalThis.crypto) globalThis.crypto = webcrypto;
const profile = { owner: 'SillyDev2026', repo: 'my-private-camo-backups', token: 'github_pat_12345678901234567890' };
const password = 'a strong vault password 2026!';
function mockStore() {
  const map = new Map();
  return { getItem: key => map.has(key) ? map.get(key) : null, setItem: (key, value) => map.set(key, value), removeItem: key => map.delete(key), raw: () => [...map.values()].join('') };
}
test('AES-GCM encryption roundtrips the GitHub PAT and repository', async () => {
  const vault = await encryptTokenVault(profile, password);
  assert.deepEqual(await decryptTokenVault(vault, password), profile);
  assert.equal(vault.version, 1);
  assert.equal(vault.iterations, 310000);
  assert.doesNotMatch(JSON.stringify(vault), /github_pat_/);
});
test('incorrect password cannot decrypt stored token', async () => {
  const vault = await encryptTokenVault(profile, password);
  await assert.rejects(decryptTokenVault(vault, 'incorrect password'), /Incorrect vault password/);
});
test('persistent vault saves encrypted ciphertext and can be removed', async () => {
  const storage = mockStore();
  assert.equal(hasSavedToken(storage), false);
  await saveTokenVault(profile, password, storage);
  assert.equal(hasSavedToken(storage), true);
  assert.doesNotMatch(storage.raw(), /github_pat_/);
  assert.deepEqual(await unlockTokenVault(password, storage), profile);
  forgetTokenVault(storage);
  assert.equal(hasSavedToken(storage), false);
  await assert.rejects(unlockTokenVault(password, storage), /No encrypted/);
});
test('weak vault passwords are rejected', async () => {
  await assert.rejects(encryptTokenVault(profile, 'weak'), /at least 12/);
});
test('tampering with the ciphertext is detected', async () => {
  const vault = await encryptTokenVault(profile, password);
  vault.ciphertext = 'AAAA' + vault.ciphertext.slice(4);
  await assert.rejects(decryptTokenVault(vault, password), /Incorrect vault password/);
});
