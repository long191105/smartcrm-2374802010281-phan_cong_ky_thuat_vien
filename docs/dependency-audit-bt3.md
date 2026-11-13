# Dependency Audit — BT3

The initial scan found 9 advisories affecting four dependencies in the production dependency tree.
Direct dependencies are now exact-version pinned; the package manager lockfile resolves transitive
dependencies. Remediation upgraded the direct packages and their resolved vulnerable dependencies.

| Advisory | Severity | Before | Resolved |
|---|---|---|---|
| CVE-2026-12590 | Low | `body-parser@1.20.3` | `body-parser@1.20.9` via Express |
| CVE-2026-111181 | High | `body-parser@1.20.3` | `body-parser@1.20.9` via Express |
| CVE-2026-4867 | High | `path-to-regexp@0.1.12` | `path-to-regexp@0.1.13` via Express |
| CVE-2025-15284 | Medium | `qs@6.13.0` | `qs@6.16.2` via Express |
| CVE-2026-2391 | Low | `qs@6.13.0` | `qs@6.16.2` via Express |
| CVE-2026-8723 | Medium | `qs@6.13.0` | `qs@6.16.2` via Express |
| CVE-2026-82417 | Medium | `qs@6.13.0` | `qs@6.16.2` via Express |
| CVE-2026-110816 | Medium | `qs@6.13.0` | `qs@6.16.2` via Express |
| CVE-2023-54404 | High | `zod@3.25.76` | `zod@4.6.6` |

Express was upgraded from `4.21.2` to `4.22.3`; Zod was upgraded across a major version to `4.6.6`.
The dependency-remediation checks passed: `npm ci`, `npm test` (77/77 at that point),
`npm run build`, `npm audit`, `npm audit --omit=dev`, and the final GitHub Security Advisories scan.
After the separate BUG-04 regression test was added, the latest `npm test` result is 78/78. Both
audit commands report zero vulnerabilities. The final advisory scan report is retained in the
session artifact directory.
