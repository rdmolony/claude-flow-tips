The `Claude Flow` community demonstrates usage & guides on best practices in a series of videos on https://video.agentics.org/ 

I want to extract how-to, tips, gotchas, mental models, questions (& more?) from these transcripts into an easy to access manner. By documenting these guidances I hope to open up `Claude Flow` and make it easier to use and understand.

I want each reference to quote one (or more) relevant lines from the transcript, and reference the source transcript file name at those lines so I can check where each reference originates (and verify it isn't hallucinated).

Let's do the initial version as a collection of linked Markdown files.

Examples -

1. The team warns against using claude with permissions disabled unless you are executing it in a `Docker` container or in an ephemeral cloud environment for security reasons.

  We can extract this as a gotcha -
  
  Gotcha!
  If you run `claude --dangerously-skip-permissions` locally outside of a sandbox (like `Docker`) `claude` will likely be able access any credentials you have locally & may even brick your machine (by editing your drivers) rendering it unusable. Please run it in either a sandbox or in an ephemeral cloud environment (like `GitHub Codespaces`) so that it cannot do so!
  <collapsible>
    <quote>
    <link to source file>
  <\collapsible>

2. The team suggests specifying what you want beforehand in 300-400 words, and to ask Claude to clarigy 10 things that are unclear or need to be improved, answer, then walk away.

  Tip!
  We can extract this as a tip - The better your specification the better the results, 
  <collapsible>
    <quote>
    <link to source file>
  <\collapsible>

3. The team suggests that batchtool is the key that makes it all work.

   How it works?
   Batchtool lets Claude Code spawn multiple agents as separate operating system processes which it can then orchestrate to run tasks in parallel
   <collapsible>
    <quote>
    <link to source file>
  <\collapsible>

4. The team suggests using Slack or GitHub for bi-directional communication with agent swarms

  Tip!
  We can communicate with ...
  <collapsible>
    <quote>
    <link to source file>
  <\collapsible>

5. The team provides guidance on how to setup a connection between GitHub and the swarm

  How To ...
  We can setup 2-way sync between the swarm and GitHub by ...
  <collapsible>
    <quote>
    <link to source file>
  <\collapsible>

5. The team is asked a question

  Question
  What's the difference between ruv-swarm and claude-flow?
  claude-flow came first, and allowed ruv-swarm to be built ...
  <collapsible>
    <quote>
    <link to source file>
  <\collapsible>
