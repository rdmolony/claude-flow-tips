# ⚠️ Gotchas and Warnings - Curated Examples

*These are manually curated examples demonstrating critical warnings and common pitfalls.*

## 🚨 Gotcha 1: Security Risk with Permissions Disabled

**Never run `claude --dangerously-skip-permissions` locally unless you're in a sandbox!** Claude will have access to your credentials and could potentially brick your machine by editing system files like drivers.

**May affect:** credentials, system, drivers, machine

<details>
<summary>📍 Source & Context</summary>

**Source:** `en-AI Hackerspace Live - June 20_ Swarm Development, AI Security, and Finland's AGI Preparation.txt` (Line 892)  
**Quality Score:** 98%  
**Severity:** high

**Original Quote:**
> This is really important - if you run Claude with permissions disabled outside of Docker or a cloud environment, it can access any credentials you have locally. We've seen cases where it edited driver files and made machines unusable. Always use a sandbox!

</details>

---

## ⚠️ Gotcha 2: Agent Memory Limitations in Long Sessions

Agents can lose context or accumulate stale information in very long sessions. You need to periodically restart or checkpoint agent state to maintain performance and accuracy.

**May affect:** system, performance

<details>
<summary>📍 Source & Context</summary>

**Source:** `en-AI Hackerspace August 8th_ From Asteroid Games to AI-Powered Research Assistants.txt` (Line 567)  
**Quality Score:** 87%  
**Severity:** medium

**Original Quote:**
> We noticed that after about 2-3 hours of continuous operation, the agents start to degrade. They hold onto old context that's no longer relevant, or they miss important new information. You need to build in restart mechanisms.

</details>

---

## 🚨 Gotcha 3: Rate Limiting with Multiple Agents

When running large swarms, you can hit API rate limits quickly. The system doesn't automatically throttle, so you need to implement backoff strategies or your agents will start failing.

**May affect:** api, system

<details>
<summary>📍 Source & Context</summary>

**Source:** `en-Agentics Live Vibe Coding - June 19, 2025.txt` (Line 723)  
**Quality Score:** 91%  
**Severity:** high

**Original Quote:**
> Big gotcha here - if you spin up 8 agents all hitting the API at once, you'll hit rate limits fast. The system doesn't handle this gracefully yet. You need to implement your own backoff logic or stagger the agent start times.

</details>

---

## ⚠️ Gotcha 4: Docker Networking Issues on Windows

Docker networking can be problematic on Windows when agents need to communicate with each other or external services. Port forwarding and host networking modes may not work as expected.

**May affect:** docker, networking, system

<details>
<summary>📍 Source & Context</summary>

**Source:** `en-AI Hackerspace July 18_ Optimizing Swarms, Visualizing Agents, and Democratizing AI Learning.txt` (Line 445)  
**Quality Score:** 82%  
**Severity:** medium

**Original Quote:**
> Windows Docker networking is tricky. We've had issues where agents can't talk to each other or reach external APIs because of how Docker handles networking on Windows. Mac and Linux work fine, but Windows needs special configuration.

</details>

---

## ⚠️ Gotcha 5: Configuration Drift in Swarm State

When agents modify configuration files or environment state, changes can accumulate and cause unexpected behavior. Always use version control and checkpoint clean states.

**May affect:** configuration, state, files

<details>
<summary>📍 Source & Context</summary>

**Source:** `en-AI Hacker League July 24th_ Exploring Cloud Flow and Open Code CLI Integration.txt` (Line 634)  
**Quality Score:** 85%  
**Severity:** medium

**Original Quote:**
> Watch out for configuration drift. When you have multiple agents making changes to config files, settings can get into weird states. We learned to always commit clean configurations and have agents work from known good states.

</details>

---

*Showing top 5 critical gotchas sorted by severity and quality.*  
*[← Back to Index](./index.md)*