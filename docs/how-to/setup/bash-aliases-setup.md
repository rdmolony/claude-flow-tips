# How To: Create Bash Aliases for Claude Commands

## Overview
Setting up bash aliases can significantly speed up your workflow with Claude Code and Claude Flow. This guide shows you how to create custom shortcuts for frequently used commands.

## Steps

### Step 1: Create Basic Aliases
Use Claude to help create bash aliases for common commands.

```bash
claude "create an alias in bash rc for the following command"
```

<details>
<summary>Source Quote</summary>
> "So, in clod, what you need to do is say, create an alias in bash rc for the following command. And for that, what we'll do is I'm just going to grab this quickly"
> Source: en-AI Hackerspace August 1st_ From CLI Aliases to Neural Networks - Advancing AI Engineering.txt:112-115
</details>

### Step 2: Example - Dangerous Skip Permissions Alias
Create a shortcut for the commonly used dangerously skip permissions command:

```bash
# Add this alias to your ~/.bashrc
alias dsp="claude --dangerously-skip-permissions"
```

<details>
<summary>Source Quote</summary>
> "So, in clod, what you need to do is say, create an alias in bash rc for the following command... dangerously skip permissions. So in this case, and you could use it for all kinds of things."
> Source: en-AI Hackerspace August 1st_ From CLI Aliases to Neural Networks - Advancing AI Engineering.txt:112-122
</details>

### Step 3: Create Custom Project Aliases
You can create project-specific aliases that include context:

```bash
# Example: Create a "hackerspace" alias
alias hackerspace="claude --dangerously-skip-permissions --context='AI Hackerspace project'"
```

<details>
<summary>Source Quote</summary>
> "Let's call it hackerspace. and whenever i type hackerspace i want to do this but i gotta go here and i'm going to do claude"
> Source: en-AI Hackerspace August 1st_ From CLI Aliases to Neural Networks - Advancing AI Engineering.txt:127-131
</details>

### Step 4: Streaming Output Aliases
Create aliases for programmatic use with streaming output:

```bash
alias agent="claude -p --output-format=stream-json --verbose"
```

<details>
<summary>Source Quote</summary>
> "If you want to invoke clod programmatically from, let's say, an API or an action or a serverless function, this is how you do it. In this case, I'm going to use the output format and i'm gonna use verbose"
> Source: en-AI Hackerspace August 1st_ From CLI Aliases to Neural Networks - Advancing AI Engineering.txt:174-181
</details>

### Step 5: Continuation Aliases
Set up aliases that support continuing where you left off:

```bash
alias dsp-c="claude --dangerously-skip-permissions -c"
```

<details>
<summary>Source Quote</summary>
> "I can also do things, I don't know if I actually did this here, but I can also do things like dangerously skip permissions dash C. And these are bash aliases that allow me, and with the dash C, it allows me to continue where I left off."
> Source: en-AI Hackerspace August 1st_ From CLI Aliases to Neural Networks - Advancing AI Engineering.txt:94-98
</details>

## Output Formats for Programmatic Use

### Stream JSON Format
For real-time applications and web interfaces:

```bash
claude -p --output-format=stream-json --verbose "your task here"
```

<details>
<summary>Source Quote</summary>
> "But I like the stream JSON because it's sort of real time. So, in this case, I'm creating the structure."
> Source: en-AI Hackerspace August 1st_ From CLI Aliases to Neural Networks - Advancing AI Engineering.txt:193-196
</details>

### Other Formats
- `--output-format=json` - Standard JSON output
- `--output-format=text` - Plain text output
- `--output-format=blob` - Binary/blob format

## System Compatibility

### Unix-Style Systems
These aliases work on:
- Mac
- Linux
- Windows Linux Subsystem

<details>
<summary>Source Quote</summary>
> "when you do create a new alias for your bash, and this is obviously going to work on Unix style systems, so Mac, Linux, Windows, Linux subsystem."
> Source: en-AI Hackerspace August 1st_ From CLI Aliases to Neural Networks - Advancing AI Engineering.txt:148-151
</details>

### Windows PowerShell
For Windows users not using WSL, similar functionality can be achieved using PowerShell profiles instead of bash aliases.

## Applying Changes
After adding aliases to your `.bashrc` file, reload your shell configuration:

```bash
source ~/.bashrc
```

Or simply open a new terminal session to use your new aliases.

## Integration with Applications
These programmatic approaches are particularly useful for:
- Web-based dashboards
- API integrations
- Serverless functions
- Custom automation scripts

<details>
<summary>Source Quote</summary>
> "So, if you want to use Ocean's line AGI and you want to integrate the output, this is exactly how you do it"
> Source: en-AI Hackerspace August 1st_ From CLI Aliases to Neural Networks - Advancing AI Engineering.txt:223-225
</details>