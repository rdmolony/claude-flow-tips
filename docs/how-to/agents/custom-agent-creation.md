# How To: Create Custom Agents and Commands

## Overview
This guide shows how to create custom agents and slash commands in Claude Flow to automate specific workflows and build personalized AI assistants.

## Prerequisites
- Claude Flow installed and initialized
- Basic understanding of agent concepts
- Familiarity with command-line interfaces

## Understanding Agents vs Commands

Claude Flow supports two main automation approaches:

1. **Commands**: Automation scripts that execute specific tasks
2. **Agents**: Interactive AI assistants that can engage in guided workflows

<details>
<summary>Source Quote</summary>
> "what I've been doing is creating a sort of two approach or a bilateral approach. I don't know a command. The command will be like an automation command, which you see here, and then this command will then correlate to an agent that's in the agent folder."
> Source: en-AI Hackerspace August 1st_ From CLI Aliases to Neural Networks - Advancing AI Engineering.txt:246-250
</details>

## Steps

### Step 1: Create a Basic Command
Start by creating an automation command for repetitive tasks:

```bash
# Navigate to your project directory
cd my-project

# Use Claude to create a command
claude "create a new command called 'benchmark' that runs performance tests"
```

<details>
<summary>Source Quote</summary>
> "rather than have to remember all the commands and all the things i just create these commands and agents that do the the work that i need so if i want to benchmark all i need to do is that and it'll go and do my benchmarking for me"
> Source: en-AI Hackerspace August 1st_ From CLI Aliases to Neural Networks - Advancing AI Engineering.txt:262-266
</details>

### Step 2: Create an Interactive Agent
Build an agent that can guide users through complex processes:

```bash
claude "create an agent that helps with neural network development"
```

The agent will be created in the `agents/` folder and can be invoked with slash commands.

### Step 3: Access Your Custom Commands
Use slash commands to invoke your custom creations:

```bash
# In Claude interface
/benchmark  # Runs your benchmarking command
/neural-dev # Starts your neural development agent
```

<details>
<summary>Source Quote</summary>
> "creating a command gives you the slash option. You can invoke the agent. Let's say if I want to go back into here, and I want to invoke my ... I can do ... You can see all my different ... I think I have a fact agent here."
> Source: en-AI Hackerspace August 1st_ From CLI Aliases to Neural Networks - Advancing AI Engineering.txt:252-257
</details>

### Step 4: Build Interactive Workflows
Create agents that ask questions and guide users through processes:

```bash
# Example: Create a project setup agent
claude "create an agent that guides users through setting up a new AI project with questions about framework preferences, model choices, and deployment options"
```

<details>
<summary>Source Quote</summary>
> "so when you create an agent you can have it interactive like so it guides you through you know questions and answers"
> Source: en-AI Hackerspace August 1st_ From CLI Aliases to Neural Networks - Advancing AI Engineering.txt:277-278
</details>

## Advanced Agent Features

### Step 5: Create Domain-Specific Agents
Build specialized agents for specific business domains:

```bash
# Example: Employee onboarding agent
claude "create an agent that helps onboard new employees, asking about their role, department, and providing relevant resources"
```

<details>
<summary>Source Quote</summary>
> "I've got one client that's actually using this to basically create sort of personas for all their employees and then when they hire someone new they they can invoke these sorts of things and they're using like a web-based dashboard to do that"
> Source: en-AI Hackerspace August 1st_ From CLI Aliases to Neural Networks - Advancing AI Engineering.txt:269-274
</details>

### Step 6: Integrate with Web Dashboards
Create agents that work with web-based interfaces:

```bash
# Use streaming output for web integration
claude -p --output-format=stream-json "/my-custom-agent"
```

This allows your custom agents to be integrated into web applications and dashboards.

## Agent Examples

### Research Agent
```bash
claude "create a research agent that conducts deep analysis on any topic, gathering information from multiple sources and providing comprehensive reports"
```

### Email Agent
```bash
claude "create an email agent that helps compose, schedule, and manage email communications based on context and recipients"
```

### Code Review Agent
```bash
claude "create a code review agent that analyzes code quality, suggests improvements, and checks for best practices"
```

## Best Practices

### 1. Make Agents Conversational
Design agents to ask clarifying questions and provide guided assistance rather than just executing commands.

### 2. Use Clear Naming Conventions
Choose descriptive names for your agents and commands that clearly indicate their purpose.

### 3. Create Modular Functionality
Build agents that can be combined and work together for complex workflows.

### 4. Test Interactively
Always test your agents in interactive mode before deploying them in automated workflows.

### 5. Document Your Agents
Include descriptions and usage examples for each agent you create.

## Integration with Claude Flow

### Agent Coordination
Your custom agents can participate in swarm operations:

```bash
./claude-flow swarm --include-custom-agents "coordinate project deployment"
```

### Memory Integration
Agents can store and retrieve information using Claude Flow's memory system for context persistence.

### Tool Integration
Custom agents automatically gain access to all MCP tools and integrations available in your Claude Flow setup.

## Maintenance and Updates

### Update Existing Agents
```bash
claude "update my benchmark agent to include memory usage analysis"
```

### List Available Agents
```bash
claude "/help"  # Shows all available slash commands and agents
```

### Remove Outdated Agents
Clean up your agent directory periodically to remove unused or outdated agents.

## Troubleshooting

### Agent Not Responding
- Ensure Claude Flow is properly initialized
- Check that the agent file exists in the agents directory
- Verify slash command syntax

### Interactive Flow Issues
- Test the agent step by step
- Check for conflicts with existing commands
- Ensure proper question/response flow design

## Next Steps
- Explore building multi-agent workflows
- Integrate agents with external APIs
- Create domain-specific agent libraries
- Build web interfaces for your custom agents