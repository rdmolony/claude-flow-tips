# How To: Install and Setup Claude Flow

## Overview
This guide covers the complete setup process for Claude Flow, including Claude Code installation and initial configuration.

## Prerequisites
- Unix-style system (Mac, Linux, Windows Linux Subsystem)
- Node.js and npm installed
- Claude account with API access

## Steps

### Step 1: Install Claude Code
Before installing Claude Flow, ensure Claude Code is properly installed and configured.

```bash
# Check if Claude Code is installed
claude --version
```

<details>
<summary>Source Quote</summary>
> "so what you want to do before you even start she logged in and and you've installed clod flow or sorry clod code so i think it's mpn i actually don't remember what the mpn is but you can you can do a search for that and find that pretty easily but make sure make sure it's installed"
> Source: en-Agentics Live Vibe Coding - June 19, 2025.txt:66-71
</details>

### Step 2: Install Claude Flow System
Install the latest version of Claude Flow using npm.

```bash
npx claude-flow@latest
```

<details>
<summary>Source Quote</summary>
> "step one install cloud code step to install the cloud flow system step three once it once those two things are both initialized you can start running various options"
> Source: en-Agentics Live Vibe Coding - June 19, 2025.txt:103-106
</details>

### Step 3: Initialize Claude Flow in Your Project
Create a new project directory or navigate to your existing project and initialize Claude Flow.

```bash
mkdir my-project
cd my-project
npx claude-flow@latest init spark
```

<details>
<summary>Source Quote</summary>
> "So to instantiate it, you're going to run something like mpx quad dash flow at latest. And then you can do init and then spark."
> Source: en-Agentics Live Vibe Coding - June 19, 2025.txt:36-38
</details>

### Step 4: Use the Wrapper Script
After initialization, use the wrapper script for execution instead of calling Claude Flow directly.

```bash
./claude-flow --help
```

<details>
<summary>Source Quote</summary>
> "This wrapper essentially allows me to execute from a working folder it's and this essentially gets around the problem with the node modules that you sometimes might might experience but in order to use it what you have to do is you're gonna have to use something like this so dot quad flow"
> Source: en-Agentics Live Vibe Coding - June 19, 2025.txt:52-58
</details>

### Step 5: Verify Installation
Check that all components are working properly:

```bash
./claude-flow swarm --help
```

This will show you all available swarm commands and options.

<details>
<summary>Source Quote</summary>
> "and let me do help on that now this this will show us all the various help commands now you if you don't add anything even you just you need to run it with this command"
> Source: en-Agentics Live Vibe Coding - June 19, 2025.txt:110-113
</details>

## Configuration Files Created

After initialization, Claude Flow creates several important files:
- `claude-flow` - The wrapper script
- `claude-flow.config.json` - Configuration file
- Various agent and command definitions in subdirectories

## Troubleshooting

### Permission Issues
If you encounter permission errors, use the dangerously skip permissions flag during development:

```bash
claude --dangerously-skip-permissions
```

<details>
<summary>Source Quote</summary>
> "this time what i'm going to do is i'm going to you know to to do research to a simple world in, hello. All right, so I'm just gonna grab that quick so I have that handy. So once I have that, so this is the initial output."
> Source: en-AI Hacker League July 24th_ Exploring Cloud Flow and Open Code CLI Integration.txt:171-175
</details>

### Node Modules Issues
The wrapper script should resolve most Node.js module path issues. If problems persist, ensure you're using the wrapper script (`./claude-flow`) rather than calling the npm package directly.

## Next Steps
After successful installation, you can:
- Create your first swarm with `./claude-flow swarm`
- Set up bash aliases for frequently used commands
- Configure custom agents and workflows