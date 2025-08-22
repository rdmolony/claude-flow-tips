# How To: Troubleshoot Common Claude Flow Issues

## Overview
This guide covers the most common issues encountered when using Claude Flow and their solutions, based on real user experiences and debugging sessions.

## Prerequisites
- Claude Flow installed
- Basic command line knowledge
- Understanding of log file locations

## Common Issues and Solutions

### Issue 1: Memory Problems
**Symptoms**: Agents fail to coordinate, inconsistent behavior between swarm members, memory corruption errors.

**Solution**: Clear and reinitialize memory system
```bash
# Clear memory files
rm -rf memory/
# Reinitialize with force flag
./claude-flow init spark --force
```

<details>
<summary>Source Quote</summary>
> "And by the way, if anyone ran into that memory issue, I fixed it last night. I'm one guy and I'm trying to juggle probably more than I should. And that was a bug that I induced a couple days ago and never had a chance to fix."
> Source: en-Agentics Live Vibe Coding - June 19, 2025.txt:135-140
</details>

### Issue 2: Permission Denied Errors
**Symptoms**: Claude refuses to execute commands, bash permission errors, tool access failures.

**Solution**: Use development permission flags
```bash
# For development environments
claude --dangerously-skip-permissions "your task here"
```

<details>
<summary>Source Quote</summary>
> "Claude doesn't permission to bash. You haven't granted it... This time, oh, actually before I do that I'm going to go and do help and I'm gonna add the dangerously skipped permissions."
> Source: en-AI Hacker League July 24th_ Exploring Cloud Flow and Open Code CLI Integration.txt:152-165
</details>

**Warning**: Only use permission skipping in secure development environments.

### Issue 3: Node Modules Path Issues
**Symptoms**: "Module not found" errors, npm/npx command failures, installation problems.

**Solution**: Use the wrapper script
```bash
# Instead of calling npm package directly
# Use the generated wrapper script
./claude-flow command
```

<details>
<summary>Source Quote</summary>
> "This wrapper essentially allows me to execute from a working folder it's and this essentially gets around the problem with the node modules that you sometimes might might experience"
> Source: en-Agentics Live Vibe Coding - June 19, 2025.txt:52-54
</details>

### Issue 4: API Rate Limiting
**Symptoms**: "Rate limit exceeded" errors, swarm operations stopping mid-execution, Claude Opus 4 limits reached.

**Solutions**:
1. Reduce concurrent agents
```bash
# Limit agent count for resource management
./claude-flow swarm --agents=5 "your task"
```

2. Use incremental scaling
```bash
# Start with small swarms and scale up gradually
./claude-flow swarm --agents=3 "test task"
# If successful, increase to 5, then 10, etc.
```

<details>
<summary>Source Quote</summary>
> "I've done this at the 50 agents. I'm not going to do 50 agents right now because I know it'll max it out. And I got work to do this afternoon beyond this call. So I don't want to be rate limited um by by clod"
> Source: en-Agentics Live Vibe Coding - June 19, 2025.txt:227-232
</details>

### Issue 5: Installation File Creation Problems
**Symptoms**: Missing configuration files after init, incomplete setup, missing directories.

**Solution**: Force reinstallation
```bash
# Create in subfolder first (safe)
mkdir test-init
cd test-init
npx claude-flow@latest init spark

# Copy needed files to main project
cp -r .claude-flow ../
cp claude-flow ../
```

<details>
<summary>Source Quote</summary>
> "what I could have done if I was worried about overriding the memory, I haven't done anything yet to really care about that. But what I could have done is did this in a subfolder and just copied the bits and pieces that I wanted from a subfolder"
> Source: en-Agentics Live Vibe Coding - June 19, 2025.txt:204-208
</details>

### Issue 6: Thinking Mode Not Working
**Symptoms**: No detailed reasoning output, shallow responses, missing analysis depth.

**Solution**: Ensure Claude folder exists
```bash
# Check for Claude configuration
ls -la .claude/

# If missing, reinitialize
./claude-flow init spark --force
```

<details>
<summary>Source Quote</summary>
> "the thinking is working again okay so i this one the thing is working because i added the cloud folder so that specifically is relating"
> Source: en-Agentics Live Vibe Coding - June 19, 2025.txt:247-249
</details>

### Issue 7: Version Compatibility Problems
**Symptoms**: Unexpected behavior, missing features, deprecated command warnings.

**Solution**: Ensure latest version
```bash
# Check current version
npx claude-flow@latest --version

# Update to latest
npx claude-flow@latest init spark --force
```

<details>
<summary>Source Quote</summary>
> "So make sure you're using the version, the most recent version... make sure you're using the the version 72 and you're wondering why there's 72 one of the i'm using the the swarm itself to build the swarm so sometimes it decides to go and auto publish"
> Source: en-Agentics Live Vibe Coding - June 19, 2025.txt:19-28
</details>

## Advanced Troubleshooting

### Debug Streaming Output
Use streaming mode to see detailed execution:
```bash
claude -p --output-format=stream-json --verbose "debug task"
```

<details>
<summary>Source Quote</summary>
> "the minus P switch basically tells Claude to reveal everything that it's doing under the covers. Yeah, it's exactly what it's doing."
> Source: en-AI Hacker League July 24th_ Exploring Cloud Flow and Open Code CLI Integration.txt:186-189
</details>

### Memory Debugging
Check memory files for corruption:
```bash
# Examine memory files
cat memory/*.json | jq .

# Look for malformed JSON or unexpected entries
```

### Tool Integration Issues
Monitor tool usage in streaming mode:
```json
{
  "type": "tool_use", 
  "tool": "web_search",
  "status": "error",
  "message": "Tool timeout"
}
```

## Prevention Strategies

### 1. Regular Memory Maintenance
Clear memory periodically to prevent corruption:
```bash
# Weekly memory cleanup
rm -rf memory/agent_*
# Keep only essential memory files
```

### 2. Gradual Scaling
Always test with small swarms before scaling:
```bash
# Test pattern
./claude-flow swarm --agents=3 "test"
./claude-flow swarm --agents=5 "test"
./claude-flow swarm --agents=10 "production task"
```

### 3. Version Management
Pin to stable versions for production:
```bash
# Use specific version instead of @latest
npx claude-flow@1.2.3 init spark
```

### 4. Resource Monitoring
Monitor resource usage during operations:
```bash
# Keep an eye on system resources
htop
# Watch network usage for API calls
```

## Emergency Procedures

### Complete Reset
If nothing else works, perform a complete reset:
```bash
# Backup important files
cp -r agents/ backup/
cp -r memory/important_*.json backup/

# Complete reset
rm -rf .claude-flow/
rm -rf memory/
rm -rf agents/
rm claude-flow*

# Fresh installation
npx claude-flow@latest init spark
```

### Recovery from Backup
```bash
# Restore from backup
cp -r backup/agents/ ./
cp -r backup/memory/ ./
```

## Getting Help

### 1. Enable Verbose Logging
```bash
claude --verbose "problematic task"
```

### 2. Capture Error Details
Always include in bug reports:
- Claude Flow version
- Error messages (full text)
- System information (OS, Node version)
- Steps to reproduce

### 3. Community Resources
- Check existing issues on GitHub
- Use community forums for common problems
- Share minimal reproduction examples

## Performance Optimization After Issues

### 1. Cleanup After Fixes
```bash
# Clear temporary files
rm -rf /tmp/claude-*
# Restart any running services
```

### 2. Verify Installation
```bash
# Test basic functionality
./claude-flow --help
./claude-flow swarm --agents=1 "simple test"
```

### 3. Monitor Performance
Track system performance after fixes to ensure stability.

## Next Steps
- Set up monitoring and logging
- Create backup procedures
- Establish testing protocols
- Document custom fixes for your environment