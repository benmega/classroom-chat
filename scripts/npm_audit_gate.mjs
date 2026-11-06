// npm audit gate for CI (#104, #110).
//
// Reads the JSON written by `npm audit --json` and exits 1 when it finds a high or
// critical advisory, unless that advisory id is in ALLOWED below. It also exits 1 when
// the audit file is missing, is not JSON, or is an npm error report, so a broken audit
// never passes silently. An ALLOWED entry that is no longer reported is printed as a
// warning so the list does not go stale.
//
// A new ALLOWED entry needs a written reason and a reviewer. Fixing the dependency
// (an override in frontend/package.json, or an upgrade) is always preferred.
//
// Usage: node scripts/npm_audit_gate.mjs <path-to-npm-audit.json>

import { existsSync, readFileSync } from 'node:fs';

const ALLOWED = {
  'GHSA-qr28-fpjm-wq7f':
    'decode-uri-component 0.2.2 (quadratic-time DoS on percent-encoded input) is reached only ' +
    'through react-admin > ra-core > query-string@7. The patched 0.5.1 is ESM-only, and ' +
    'query-string 7 loads it with require(), so it cannot be overridden. npm\'s only "fix" is ' +
    'downgrading react-admin to 3.0.2. Revisit when react-admin moves off query-string 7.',
};

const GATED_SEVERITIES = new Set(['high', 'critical']);

function fail(message) {
  console.error(`npm audit gate: ${message}`);
  process.exit(1);
}

const file = process.argv[2];
if (!file) fail('usage: node scripts/npm_audit_gate.mjs <path-to-npm-audit.json>');
if (!existsSync(file)) fail(`audit file not found: ${file}`);

let report;
try {
  report = JSON.parse(readFileSync(file, 'utf8'));
} catch (error) {
  fail(`audit file is not JSON: ${file} (${error.message})`);
}

if (!report || typeof report !== 'object' || Array.isArray(report)) {
  fail('audit file is not a JSON object');
}
if ('error' in report) {
  const detail = report.error?.summary ?? JSON.stringify(report.error);
  fail(`npm audit reported an error, so nothing was checked: ${detail}`);
}
if (!report.vulnerabilities || typeof report.vulnerabilities !== 'object') {
  fail('audit file has no vulnerabilities object, so nothing was checked');
}

// Advisory objects only: string entries in "via" point at another package and are skipped.
const findings = new Map();
for (const [pkg, vuln] of Object.entries(report.vulnerabilities)) {
  for (const via of vuln?.via ?? []) {
    if (!via || typeof via !== 'object') continue;
    if (!GATED_SEVERITIES.has(via.severity)) continue;
    const id = String(via.url ?? '').split('/').pop();
    if (!id) fail(`advisory for ${pkg} has no url, so its id is unknown`);
    if (!findings.has(id)) {
      findings.set(id, { id, pkg, severity: via.severity, title: via.title ?? '', url: via.url });
    }
  }
}

const allowed = [];
const blocked = [];
for (const finding of findings.values()) {
  if (Object.hasOwn(ALLOWED, finding.id)) {
    allowed.push(finding);
    console.log(`allowed: ${finding.id} ${finding.pkg} - ${ALLOWED[finding.id]}`);
  } else {
    blocked.push(finding);
    console.log(
      `BLOCKED: ${finding.id} ${finding.severity} ${finding.pkg} ${finding.title} ${finding.url}`,
    );
  }
}

let stale = 0;
for (const id of Object.keys(ALLOWED)) {
  if (!findings.has(id)) {
    stale += 1;
    console.log(`stale allowlist entry: ${id}`);
  }
}

const status = blocked.length > 0 ? 'FAIL' : 'PASS';
console.log(
  `npm audit gate ${status}: ${findings.size} high/critical advisories, ` +
    `${allowed.length} allowed, ${blocked.length} blocked, ${stale} stale allowlist entries`,
);
process.exit(blocked.length > 0 ? 1 : 0);
