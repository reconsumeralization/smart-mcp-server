#!/usr/bin/env node
/**
 * Quick audit for the Gemini CLI credential store.
 * Runs cross-platform from Node ≥ 18.
 *
 *  – Detects where `credentials.json` lives.
 *  – Checks basic file permissions (POSIX).
 *  – On Windows, fetches ACL via `icacls` for advisory output.
 *  – Emits a PASS / WARN / FAIL summary + JSON details.
 *
 * Usage:
 *   node scripts/audit-gemini-credentials.js   # or simply ./audit-gemini-credentials.js
 */
import fs from 'fs/promises';
import { constants as fsConstants } from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { existsSync } from 'fs';

function locateCredentials() {
  const platform = os.platform();
  if (platform === 'win32') {
    const possible = [
      path.join(process.env.APPDATA, 'gemini-cli', 'credentials.json'),
      path.join(os.homedir(), '.gemini', 'oauth_creds.json')
    ];
    // return first that exists or default first path
    for (const p of possible) {
      if (existsSync(p)) return p;
    }
    return possible[0];
  }
  // linux, darwin, etc.
  const possible = [
    path.join(os.homedir(), '.config', 'gemini-cli', 'credentials.json'),
    path.join(os.homedir(), '.gemini', 'oauth_creds.json'),
  ];
  for (const p of possible) {
    if (existsSync(p)) return p;
  }
  return possible[0];
}

function posixPerms(mode) {
  return '0' + (mode & 0o777).toString(8);
}

async function audit() {
  const file = await locateCredentials();
  const result = {
    file,
    exists: false,
    platform: os.platform(),
    stats: null,
    posixPerms: null,
    verdict: 'UNKNOWN',
    notes: []
  };

  try {
    await fs.access(file, fsConstants.R_OK);
    result.exists = true;
  } catch {
    result.verdict = 'FAIL';
    result.notes.push('Credentials file not found. Run "gemini login" first.');
    printResult(result);
    process.exitCode = 1;
    return;
  }

  const st = await fs.stat(file);
  result.stats = {
    mode: st.mode,
    uid: st.uid,
    gid: st.gid,
    size: st.size
  };

  if (result.platform !== 'win32') {
    result.posixPerms = posixPerms(st.mode);
    if (st.mode & 0o077) {
      result.verdict = 'WARN';
      result.notes.push('File is readable by group/others. Recommend chmod 600.');
    } else {
      result.verdict = 'PASS';
    }
  } else {
    // Windows – use icacls
    const out = spawnSync('icacls', [file], { encoding: 'utf8' });
    if (out.error) {
      result.verdict = 'WARN';
      result.notes.push('Could not run icacls to inspect ACLs.');
    } else {
      result.notes.push('icacls output:', out.stdout.trim());
      // naive check – if string contains "(F)" for BUILTIN\\Users then warn
      if (/Users:\(.+\)/i.test(out.stdout) && out.stdout.includes('(R)')) {
        result.verdict = 'WARN';
        result.notes.push('Credential readable by Users group; tighten ACLs.');
      } else {
        result.verdict = 'PASS';
      }
    }
  }

  printResult(result);
  if (result.verdict !== 'PASS') process.exitCode = 1;
}

function printResult(res) {
  console.log('=== Gemini CLI credential audit ===');
  console.log(`Platform: ${res.platform}`);
  console.log(`Credentials file: ${res.file}`);
  if (!res.exists) {
    console.log('‼  NOT FOUND');
  } else {
    if (res.posixPerms) console.log(`Permissions: ${res.posixPerms}`);
    res.notes.forEach(n => console.log('• ' + n));
    console.log('Verdict:', res.verdict);
  }
}

// Run
audit().catch(err => {
  console.error('Audit failed', err);
  process.exitCode = 1;
}); 