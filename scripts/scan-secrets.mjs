#!/usr/bin/env node
/**
 * Lightweight local secret pattern scan (cross-platform).
 * CI also runs gitleaks for deeper coverage — see .github/workflows/secret-scan.yml
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const ROOT = process.cwd();

const SCAN_DIRS = ['src', 'scripts', '.github'];
const SCAN_FILES = ['.env.example', 'package.json'];

const IGNORE_DIRS = new Set(['node_modules', 'dist', 'coverage', '.git']);
const IGNORE_FILES = new Set(['scripts/scan-secrets.mjs']);

const PATTERNS = [
  { name: 'Stripe live secret', regex: /sk_live_[0-9a-zA-Z]{16,}/ },
  { name: 'Stripe test secret', regex: /sk_test_[0-9a-zA-Z]{16,}/ },
  { name: 'AWS access key', regex: /AKIA[0-9A-Z]{16}/ },
  { name: 'Private key block', regex: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: 'Hardcoded Clerk secret', regex: /sk_[a-z]+_[A-Za-z0-9]{20,}/ },
  { name: 'Generic assigned secret', regex: /(?:secret|api[_-]?key|password)\s*[:=]\s*['"][^'"]{8,}['"]/i },
];

/** @type {{ file: string; line: number; pattern: string; excerpt: string }[]} */
const findings = [];

function shouldScanFile(relativePath) {
  if (IGNORE_FILES.has(relativePath.replace(/\\/g, '/'))) {
    return false;
  }
  return true;
}

function scanFile(filePath, relativePath) {
  if (!shouldScanFile(relativePath)) {
    return;
  }

  const content = readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    if (line.includes('[REDACTED]') || line.includes('.env.example')) {
      return;
    }

    for (const pattern of PATTERNS) {
      if (pattern.regex.test(line)) {
        findings.push({
          file: relativePath,
          line: index + 1,
          pattern: pattern.name,
          excerpt: line.trim().slice(0, 120),
        });
      }
    }
  });
}

function walk(dir, relativeDir = '') {
  for (const entry of readdirSync(dir)) {
    if (IGNORE_DIRS.has(entry)) {
      continue;
    }

    const fullPath = join(dir, entry);
    const relativePath = relativeDir ? join(relativeDir, entry) : entry;
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      walk(fullPath, relativePath);
      continue;
    }

    scanFile(fullPath, relative(ROOT, fullPath));
  }
}

for (const dir of SCAN_DIRS) {
  const fullDir = join(ROOT, dir);
  try {
    walk(fullDir, dir);
  } catch {
    // Directory may not exist in minimal checkouts
  }
}

for (const file of SCAN_FILES) {
  const fullPath = join(ROOT, file);
  try {
    scanFile(fullPath, file);
  } catch {
    // Optional file
  }
}

if (findings.length > 0) {
  console.error('Potential secrets detected:\n');
  for (const finding of findings) {
    console.error(
      `  ${finding.file}:${finding.line} [${finding.pattern}]\n    ${finding.excerpt}\n`,
    );
  }
  console.error(`${findings.length} finding(s). Remove secrets before committing.`);
  process.exit(1);
}

console.log('No obvious secret patterns found in scanned paths.');
