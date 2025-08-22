# How To: Use Claude Code Streaming for Programmatic Integration

## Overview
This guide explains how to use Claude Code's streaming capabilities for programmatic integration, bypassing the interactive UI for automated workflows and web applications.

## Prerequisites
- Claude Code installed and configured
- Understanding of JSON output formats
- Basic command line knowledge

## Steps

### Step 1: Understanding Streaming Mode
Streaming mode allows you to invoke Claude programmatically and receive real-time output in JSON format, perfect for API integration and automated workflows.

```bash
claude -p --output-format=stream-json --verbose "your task description"
```

<details>
<summary>Source Quote</summary>
> "If you want to invoke clod programmatically from, let's say, an API or an action or a serverless function, this is how you do it. In this case, I'm going to use the output format and i'm gonna use verbose"
> Source: en-AI Hackerspace August 1st_ From CLI Aliases to Neural Networks - Advancing AI Engineering.txt:174-181
</details>

### Step 2: Configure Output Formats
Choose the appropriate output format for your use case:

#### Stream JSON (Recommended)
```bash
claude -p --output-format=stream-json --verbose "analyze this data"
```

<details>
<summary>Source Quote</summary>
> "But I like the stream JSON because it's sort of real time. So, in this case, I'm creating the structure."
> Source: en-AI Hackerspace August 1st_ From CLI Aliases to Neural Networks - Advancing AI Engineering.txt:193-196
</details>

#### Other Available Formats
```bash
# Standard JSON output
claude -p --output-format=json "task description"

# Plain text output  
claude -p --output-format=text "task description"

# Binary/blob format
claude -p --output-format=blob "task description"
```

### Step 3: Skip Interactive Components
Use the `-p` flag to bypass Claude's interactive user interface:

```bash
claude -p "create a REST API endpoint"
```

<details>
<summary>Source Quote</summary>
> "Now, this is streaming. So this is bypassing the user, the sort of interactive user components. So it's kind of cool."
> Source: en-AI Hackerspace August 1st_ From CLI Aliases to Neural Networks - Advancing AI Engineering.txt:213-215
</details>

### Step 4: Handle Permissions Programmatically
For automated scripts, use the dangerous skip permissions flag:

```bash
claude -p --dangerously-skip-permissions --output-format=stream-json "deploy application"
```

<details>
<summary>Source Quote</summary>
> "I'm going to just test. So what I'm trying to do figure out exactly how this stuff all works under the covers... This time, oh, actually before I do that I'm going to go and do help and I'm gonna add the dangerously skipped permissions."
> Source: en-AI Hacker League July 24th_ Exploring Cloud Flow and Open Code CLI Integration.txt:160-165
</details>

### Step 5: Parse Streaming Output
The streaming output provides real-time insight into Claude's thinking process:

```json
{
  "type": "assistant",
  "id": "msg_123",
  "content": "Analyzing requirements...",
  "thinking": "I need to break this down into steps..."
}
```

<details>
<summary>Source Quote</summary>
> "the minus P switch basically tells Claude to reveal everything that it's doing under the covers. Yeah, it's exactly what it's doing."
> Source: en-AI Hacker League July 24th_ Exploring Cloud Flow and Open Code CLI Integration.txt:186-189
</details>

## Integration Examples

### Web Application Integration
For web dashboards and real-time applications:

```bash
# Stream output to your web application
curl -X POST /api/claude-stream \
  -d "claude -p --output-format=stream-json 'analyze user behavior'"
```

<details>
<summary>Source Quote</summary>
> "So, if you want to use Ocean's line AGI and you want to integrate the output, this is exactly how you do it which i'm i might be still in the ocean's thunder here because i think he's about to give a similar presentation on how he's doing the sorts of things"
> Source: en-AI Hackerspace August 1st_ From CLI Aliases to Neural Networks - Advancing AI Engineering.txt:223-228
</details>

### API Wrapper Creation
```javascript
// Example Node.js integration
const { spawn } = require('child_process');

function callClaude(task) {
  const claude = spawn('claude', [
    '-p',
    '--output-format=stream-json',
    '--verbose',
    task
  ]);

  claude.stdout.on('data', (data) => {
    const response = JSON.parse(data);
    console.log('Claude response:', response);
  });
}
```

### Serverless Function Integration
Perfect for AWS Lambda, Azure Functions, or Google Cloud Functions:

```bash
# In your serverless function
claude -p --output-format=json "process this request: ${input}"
```

## Advanced Features

### Tool Integration Visibility
Streaming mode reveals MCP tool usage:

```json
{
  "type": "tool_use",
  "tool": "web_search",
  "parameters": {"query": "AI safety research"}
}
```

<details>
<summary>Source Quote</summary>
> "This last thing, it basically reverse engineer their UI. We can see here that it's using my MPX tools."
> Source: en-AI Hacker League July 24th_ Exploring Cloud Flow and Open Code CLI Integration.txt:182-184
</details>

### Verbose Output Benefits
The `--verbose` flag provides additional context:
- Detailed reasoning steps
- Tool interaction logs
- Performance metrics
- Error details

## Output Processing

### Real-time Processing
Stream JSON allows for real-time parsing and response:

```python
import subprocess
import json

def stream_claude(task):
    process = subprocess.Popen([
        'claude', '-p', 
        '--output-format=stream-json',
        '--verbose', task
    ], stdout=subprocess.PIPE, text=True)
    
    for line in process.stdout:
        try:
            data = json.loads(line)
            yield data
        except json.JSONDecodeError:
            continue
```

### Dashboard Integration
Use streaming output to populate real-time dashboards:

<details>
<summary>Source Quote</summary>
> "so when i show you my dashboards and things this is how i'm actually doing it it's kind of cool"
> Source: en-AI Hackerspace August 1st_ From CLI Aliases to Neural Networks - Advancing AI Engineering.txt:233-235
</details>

## Best Practices

1. **Error Handling**: Always implement proper JSON parsing with error handling
2. **Rate Limiting**: Respect API limits when making programmatic calls
3. **Security**: Use environment variables for sensitive configurations
4. **Logging**: Log both inputs and outputs for debugging
5. **Timeouts**: Implement timeouts for long-running operations

## Troubleshooting

### Permission Issues
If you encounter permission errors, ensure the `--dangerously-skip-permissions` flag is used appropriately in secure environments.

### JSON Parsing Errors
Stream JSON may contain partial responses. Implement robust JSON parsing:

```javascript
function parseStreamJSON(data) {
  const lines = data.split('\n');
  const results = [];
  
  for (const line of lines) {
    try {
      if (line.trim()) {
        results.push(JSON.parse(line));
      }
    } catch (e) {
      console.warn('Failed to parse JSON line:', line);
    }
  }
  
  return results;
}
```

## Next Steps
- Implement error handling and retries
- Create wrapper libraries for your preferred programming language
- Build monitoring and analytics around your programmatic Claude usage
- Explore advanced MCP tool integration for specialized workflows