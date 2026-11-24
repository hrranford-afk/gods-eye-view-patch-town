#!/usr/bin/env node
/* Safe-publish check for a PUBLIC repository. Scans files (given as arguments, or all files changed against a base ref with --diff <ref>, default origin/game/city-lab)
   HARD findings (exit 1): private key blocks, access tokens, password/secret assignments, email addresses, phone numbers, private network addresses, home-directory paths of a person.
   REVIEW findings (exit 0, printed): words that may describe a weakness of the home machines. A human must read each one and decide: publish a safe summary instead, or keep it local.
   It cannot prove a file is safe. It only catches the obvious. */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const HARD = [
  ['private key', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['GitHub token', /\b(ghp|gho|ghs|ghu|github_pat)_[A-Za-z0-9_]{20,}/],
  ['API key', /\b(sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]{10,}|AIza[0-9A-Za-z_-]{30,})/],
  ['password or secret assignment', /\b(password|passwd|secret|api[_-]?key|token)\s*[:=]\s*['"]?[A-Za-z0-9_\-\/+=]{8,}/i],
  ['email address', /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/],
  ['phone number', /(\+44\s?\d[\d\s]{8,12}\d|\b0\d{3}[\s-]?\d{3}[\s-]?\d{4}\b|\b07\d{3}[\s-]?\d{6}\b)/],
  ['private network address', /\b(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b/],
  ['personal home path', /\/Users\/[A-Za-z0-9._-]+\//]];
const REVIEW = [
  ['unsigned or unprotected job intake', /\b(unsigned|unauthenticated|no (signature|auth)\w*)\b.{0,60}\b(inbox|job|dock|door|executor)/i],
  ['job inbox or executor details', /\b(inbox|town\.py|executor|dock)\b/i],
  ['disk level of a home machine', /\b\d+(\.\d+)?\s?GB\s+(free|left|available)\b/i],
  ['unregistered or ghost programs', /\b(unregistered|ghost)\s+(programs?|processes?|jobs?)\b/i],
  ['code isolation weakness', /\b(unrestricted|unsandboxed|not sandboxed|no sandbox)\b/i],
  ['hostname or machine login', /\b(ssh|login|hostname|username)\b\s*[:=]/i]];
const args = process.argv.slice(2);
let files = [];
const di = args.indexOf('--diff');
if (di >= 0) {
  const base = args[di + 1] && !args[di + 1].startsWith('--') ? args[di + 1] : 'origin/game/city-lab';
  files = execFileSync('git', ['diff', '--name-only', '--diff-filter=AM', base + '...HEAD'], { encoding: 'utf8' }).split('\n').filter(Boolean);
  const wt = execFileSync('git', ['status', '--porcelain', '-uall'], { encoding: 'utf8' }).split('\n').filter(Boolean).map((l) => l.slice(3));
  files = [...new Set([...files, ...wt])];
} else files = args;
const textExt = /\.(md|txt|json|js|mjs|cjs|html|css|yml|yaml|csv)$/i;
let hard = 0, review = 0, scanned = 0;
for (const f of files) {
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory() || !textExt.test(f)) continue;
  scanned++;
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  lines.forEach((ln, i) => {
    if (f.endsWith('publish-check.mjs')) return;   /* this file lists the patterns */
    for (const [n, re] of HARD) if (re.test(ln)) { hard++; console.log('BLOCK  ' + f + ':' + (i + 1) + '  ' + n + '  ' + ln.trim().slice(0, 90).replace(/[A-Za-z0-9_\-\/+=]{12,}/g, '[long]')); }
    for (const [n, re] of REVIEW) if (re.test(ln)) { review++; console.log('REVIEW ' + f + ':' + (i + 1) + '  ' + n + '  ' + ln.trim().slice(0, 90)); }
  });
}
console.log('\npublish-check: ' + scanned + ' files scanned, ' + hard + ' BLOCK, ' + review + ' REVIEW');
if (review) console.log('REVIEW lines need a human decision: publish a safe summary or keep local.');
process.exit(hard ? 1 : 0);
