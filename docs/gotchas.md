# Gotchas and Critical Warnings

*Important pitfalls and warnings extracted from Claude Flow community discussions*

---

*This documentation highlights critical warnings and common pitfalls that could lead to security issues, system failures, or unexpected behavior.*

## Quick Navigation
- [Security Warnings](#security-warnings)
- [System Safety](#system-safety)
- [Configuration Pitfalls](#configuration-pitfalls)
- [Performance Traps](#performance-traps)

---

## Security Warnings

### ⚠️ CRITICAL: Never Run Claude with Skip Permissions Locally
Running `claude --dangerously-skip-permissions` on your local machine outside of a sandbox can expose all your credentials and potentially brick your system by modifying drivers.

**Why this matters:** Claude can access any credentials you have locally and may render your machine unusable by editing system drivers.

**Confidence:** High

**Required Action:** Only run with disabled permissions in Docker containers or ephemeral cloud environments like GitHub Codespaces.

<details>
<summary>Source Reference</summary>

> "The team warns against using claude with permissions disabled unless you are executing it in a Docker container or in an ephemeral cloud environment for security reasons. If you run claude --dangerously-skip-permissions locally outside of a sandbox (like Docker) claude will likely be able access any credentials you have locally & may even brick your machine (by editing your drivers) rendering it unusable."

Source: `spec.md:11-16`
</details>

---

## System Safety

### File System Access Risks
Claude Code with full permissions can modify any file your user account can access, including system configurations and credentials.

**Why this matters:** Uncontrolled file system access can lead to data loss, security breaches, or system instability.

**Confidence:** High

<details>
<summary>Source Reference</summary>

*[To be populated from transcript analysis]*

Source: `[pending_analysis]`
</details>

---

## Configuration Pitfalls

### Agent Coordination Failures
Improper swarm topology or agent configuration can lead to coordination deadlocks or resource conflicts.

**Why this matters:** Failed coordination wastes computational resources and can cause task failures.

**Confidence:** Medium

<details>
<summary>Source Reference</summary>

*[To be populated from transcript analysis]*

Source: `[pending_analysis]`
</details>

---

*More gotchas will be populated as transcript analysis completes...*

[← Back to Index](README.md) | [View How-To Guides →](how-to.md)