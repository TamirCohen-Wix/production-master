# Executive Summary  
This report designs an Autonomous Production Investigation Platform spanning Cursor and Claude Code plugins and a standalone service. We analyze Cursor’s plugin architecture (packaging, rules vs skills, subagents, hooks, MCP integration) and Claude Code’s plugin ecosystem (manifest, skills, hooks, subagents, agent teams, memory model).  We compare their features (rules vs hooks, skills, subagents vs agent teams, context handling, isolation, distribution).  We propose a shared-core/adapter architecture (monorepo strategy, stable API, CI/CD, independent releases) with repo and pipeline designs.  We outline advanced multi-agent orchestration (hierarchical, planner-executor, debate/consensus, long-lived agents) with tradeoffs.  We detail model-routing (dynamic model selection, cascades) citing OpenAI and AWS Bedrock strategies【63†L79-L88】【63†L125-L134】.  We define a full observability and AI audit framework (trace logging with OpenTelemetry, trace replay, evidence graphs【67†L60-L69】【67†L88-L95】).  We cover knowledge and learning (enterprise RAG and GraphRAG best practices【91†L39-L47】, memory partitioning, continuous improvement) and deployment/infrastructure (containers, scaling, security, CI/CD).  Finally, we assess risk (injection, misuse, cost) and “unknown unknowns” (debugging meta-agents, cascading failures, knowledge poisoning, governance). Citations include official docs and engineering sources to ensure a comprehensive, CTO-level analysis.  

# Table of Contents  
- Executive Summary  
- Table of Contents  
- Cursor Deep Dive  
  - Plugin Packaging & Manifest【76†L297-L305】  
  - Rules vs Skills【79†L1-L3】【78†L232-L234】  
  - Subagent Model【92†L15-L22】  
  - Hooks System【39†L22-L30】【39†L54-L62】  
  - MCP Integration【76†L297-L305】  
  - Distribution & Permissions (Marketplace, .cursor-plugin)【76†L297-L305】  
- Claude Code Deep Dive  
  - Plugin Manifest Structure【83†L458-L467】  
  - Skills (AgentSkills)【86†L81-L90】【86†L93-L96】  
  - Hooks (Event Automation)【87†L82-L90】  
  - Subagent Model【13†L1-L9】  
  - Agent Teams【89†L49-L57】  
  - Cross-Agent Communication【89†L49-L57】  
  - Memory & Isolation【90†L1-L4】  
  - Tool Invocation & Runtime (CLI vs extension)  
  - Distribution & Versioning (marketplace, git)【83†L363-L371】  
- Comparative Platform Strategy  
  - Comparison Table (Rules vs Hooks, Skills, Subagents vs Teams, Context, Isolation, Runtime, Distribution)【79†L1-L3】【87†L82-L90】【89†L49-L57】  
  - Platform-Specific Architectural Guidance  
- Core Engine + Adapters Architecture  
  - Monorepo vs Multi-Repo Strategy  
  - Shared Core Engine Module (stable API)  
  - Platform-Specific Adapter Modules (Cursor, Claude)  
  - Avoiding Duplication & Ensuring Back-Compatibility  
  - Repository Structure Diagram (e.g. core/, cursor-adapter/, claude-adapter/)  
  - Versioning Strategy (semver, release tags)  
  - CI/CD Pipeline Design (independent pipelines, validation)  
  - Release Orchestration (core bump triggers adapter updates)  
- Advanced Multi-Agent System Design  
  - Hierarchical Orchestration (lead agent with subagents)【54†L103-L112】  
  - Planner-Executor Pattern  
  - Debate-Based Consensus【60†L52-L61】【60†L85-L92】  
  - Voting/Consensus Agents  
  - Long-Lived / Memory-Persistent Agents  
  - Event-Driven Agents (trigger on incidents)  
  - Self-Improving Agents & Feedback Agents  
  - Cost-Aware Routing Agents (model selection agents)  
  - Policy-Enforcement Agents (monitoring and compliance)  
  - Orchestration Frameworks & Patterns (Azure AI patterns【56†L55-L64】, Anthropic multi-agent learnings【54†L52-L61】)  
  - Tradeoff Matrix (complexity vs robustness vs cost)  
- Model Routing Strategy  
  - Dynamic Model Selection (size vs speed vs cost)  
  - Hybrid Cascades (small-model fast checks, escalate to large-model if needed)【63†L79-L88】【63†L125-L134】  
  - Cost-Aware and Latency-Aware Routing (similar to AWS Bedrock Intelligent Prompt Routing【63†L79-L88】【63†L125-L134】)  
  - Governance & Evaluation (scoring models, audits)  
  - User-Configurable Modes (e.g. “economy” vs “precision”)  
  - Patterns from OpenAI/Anthropic (zero-shot->few-shot, function calling) and AWS Bedrock multi-model routing【63†L79-L88】【63†L125-L134】.  
- Observability & Transparency Framework  
  - Logging and Tracing Standards (OpenTelemetry for LLMs【65†L349-L358】【66†L1-L4】)  
  - End-to-End Trace Capture (every prompt, tool call, response)【67†L60-L69】  
  - Deterministic Tool Logging (capturing shell commands, tool outputs)  
  - Hypothesis/Evidence Logging (score tagging)  
  - Evidence Graph Visualization (links between decisions and data)  
  - Trace Export and Replay (reproducibility tools to re-run sessions)【67†L88-L95】  
  - Privacy and PII (sanitization/redaction in logs)  
  - Telemetry Architecture (instrumentation, Otel collectors, dashboards)【65†L373-L382】【65†L398-L407】  
  - Audit System (immutable logs, human reviews)  
- Knowledge & Learning Architecture  
  - RAG and Retrieval Pipeline (vector DB, embeddings)  
  - Graph-Enhanced Retrieval (GraphRAG for multi-hop & compliance)【91†L39-L47】  
  - Knowledge Graphs & Entity Linking  
  - Incident Similarity Search (clustering past incidents by embeddings)  
  - Feedback Loop (capture human validation of hypotheses)  
  - Continuous Learning Pipelines (periodic model fine-tuning from new data)  
  - Guardrails & Review Policy for Auto-Updates (human-in-loop updates)  
  - Service/Domain Memory Partitioning (separate contexts for different tenants)  
  - Governance of Knowledge Base (versioning, approvals)  
- Deployment & Infrastructure  
  - Containerized Deployment (Docker/K8s for microservices)  
  - Horizontal Scaling (stateless agents, stateful DBs, autoscaling)  
  - Asynchronous Job Orchestration (message queues, task workers)  
  - Secure Tool Access (network controls, VPC, ssh gateways)  
  - Multi-Tenancy Isolation (K8s namespaces or clusters per tenant【70†L1-L7】)  
  - Credential Vault (HashiCorp Vault or cloud secrets)  
  - CI/CD for AI Systems (separate pipelines for code, models; model registry)  
  - Rollback & Canary Releases (feature flags for agents, incremental rollout)  
  - Independent Adapter Deployability (core vs plugin container/service)  
  - **Diagram:** Multi-tier deployment (API gateway, agent workers, databases, message bus).  
- CI/CD & Repository Strategy  
  - Mono- vs Multi-Repo Tradeoffs (cross-module changes vs independent lifecycle)【51†L0-L3】  
  - Core+Adapter Repo Structure (e.g. monorepo with `core/`, `cursor-adapter/`, `claude-adapter/` folders, or separate repos with core as dependency)  
  - Plugin Wrappers (thin clients invoking core via APIs/CLI)  
  - Versioning (semantic versions for core and each adapter; adapter releases depend on core)  
  - CI Pipelines (lint, unit tests, integration tests per adapter; core builds independent)  
  - CI Diagram: e.g. GitHub Actions matrix running tests on each push, publish to artifact registry.  
  - Release Orchestration (tagging core, auto-updating adapters, avoiding one-platform lock)  
- Risk & Governance  
  - **Risk Matrix:** List risks vs likelihood/impact (e.g. prompt injection, tool misuse, privilege escalation, AI drift, misclassification)  
  - Prompt Injection & Guardrails (input validation, paraphrase detection)【72†L139-L148】  
  - Tool Misuse (restrict CLI commands, sandboxing)  
  - Privilege Escalation (least-privilege credentials, audit logs)  
  - AI Overreach (restrict agent capabilities, kill-switch)【72†L139-L148】  
  - Misjudgment/Escalation (human override, thresholds)  
  - Economic Risk (token costs, runaway loops; cost monitoring)  
  - Organizational Risk (trust, siloing)  
  - Governance (policies, review boards, security audits)  
- Economic Considerations  
  - Cost model (token usage, cloud compute, storage)  
  - Cost-Saving Strategies (caching, lower-tier models for routine tasks, usage quotas)  
  - Total cost of ownership (multi-agent vs single-agent tradeoff)【54†L77-L86】  
  - ROI scenarios (automation benefits vs AI licensing costs)  
- Unknown Unknowns  
  - “Debugging the debugger”: agents that modify/investigate other agents  
  - Failure Cascades (one agent’s error triggering others)  
  - Knowledge Poisoning (malicious data injecting into memory/RAG)  
  - Governance at Scale (organizational inertia, inter-department AI policies)  
  - Shadow AI (unofficial agents in enterprise)  
  - Future Regulations (AI accountability laws, data residency)  
  - Security of Debug Tools (attacks via CI/CD or introspection)  

# Cursor Deep Dive  

**Plugin Packaging:** Cursor plugins are organized with a root `.cursor-plugin` folder. Each plugin has a manifest `plugin.json` inside `.cursor-plugin`, plus directories for `skills/` and `rules/`, and an optional `mcp.json` for external tool servers【76†L297-L305】.  For example, a plugin repo contains:
- `.cursor-plugin/plugin.json` (name, version, description, etc)  
- `skills/` (Agent Skill definitions, each as `SKILL.md` with frontmatter)  
- `rules/` (`.mdc` files with always-on instructions)  
- `mcp.json` (Model Context Protocol servers)【76†L297-L305】.  
This structure supports Cursor’s marketplace distribution and versioning.  

**Rules vs Skills:** Cursor distinguishes *rules* (static project context) from *skills* (on-demand capabilities). Rules are declarative instructions always-included at conversation start. For example, rules in `.cursor/rules/` can list commands or coding style guidelines. _Rules “provide persistent instructions… as always-on context that the agent sees at the start of every conversation.”_【79†L1-L3】. Skills, by contrast, are *dynamic workflows*: defined in `SKILL.md` with frontmatter, invoked with a slash-command or auto-loaded when relevant. Skills contain custom commands, scripts or additional domain knowledge. Importantly, Cursor only loads skills on demand. _“Unlike Rules which are always included, Skills are loaded dynamically when the agent decides they’re relevant.”_【78†L232-L234】. This keeps context windows focused. Skills effectively allow reusable procedures and specialized logic; rules provide the baseline guardrails (coding standards, essential commands) that the agent always follows【78†L222-L230】【78†L232-L234】.  

**Subagent Model:** Cursor 2.4 introduced *subagents*: specialized parallel workers within a session. A subagent is an independent assistant with its own context window and configuration. It handles a discrete subtask of the parent agent.  In practice, subagents are defined as `.mdc` files (or `AGENT.md`) with frontmatter including a name, description, model, etc. Cursor subagents “handle discrete parts of a task in parallel with their own context and configuration”【92†L15-L22】. The main agent can delegate parts of the investigation to subagents (e.g. one searching documentation, another running tests). Subagents run in parallel, and report their results back to the parent agent. They cannot spawn further subagents (to avoid unbounded recursion), and inherit the parent’s available tools (unless specifically overridden). Parallel execution speeds up work and keeps each agent’s context smaller. A key performance implication is token usage: running N subagents uses roughly N× the tokens, so design subagent tasks judiciously. Subagents in Cursor currently cannot directly share memory; they simply return findings.  

**Hooks System:** Cursor offers a beta *hooks* feature (in `.cursor/hooks.json`) that lets you run scripts at lifecycle events. Supported hook points include, for example, **before submitting a prompt**, **after executing a shell command**, **before reading a file**, **after writing a file**, and **stop** events (looping logic)【39†L22-L30】【39†L54-L62】. Each hook is a shell command or script that receives JSON input (e.g. conversation state or command context) and can output JSON (e.g. a followup prompt). Hooks give deterministic control – for instance, you can auto-format code after the agent writes it, or enforce security checks before any high-risk operation. Scott Chacon’s blog explains the hook schema and shows examples of running custom code on events【39†L22-L30】【39†L54-L62】. For building our platform, hooks can automate lifecycle tasks: e.g. a “before tool-run” hook might sanitize inputs, or a “stop” hook could loop an agent until tests pass.  

**MCP Integrations:** The plugin’s `mcp.json` defines one or more MCP servers. MCP (Model Context Protocol) allows an agent to query external data sources. Cursor plugins can include MCP definitions to expose tools like Slack, Datadog, or custom APIs to the agent【76†L297-L305】. When invoked from a rule, skill, or hook, the agent can call an MCP endpoint to fetch logs or metadata. This integration enables the platform to autonomously gather evidence (e.g. query a database for logs, lookup documentation) within the plugin.  

**Marketplace & Permissions:** Cursor plugins are typically published via the Cursor Marketplace or distributed as code repos. The manifest declares a version and permissions. Cursor’s permission model restricts what agents can do (e.g. tool access). Plugin rules/skills run with those permissions. The context injection respects user/project scope: e.g. user-level rules load globally, project rules load per repo. Overall, Cursor’s plugin system uses rules for baseline guardrails, skills for extensible workflows, subagents for parallel tasks, and hooks for automation. A best practice is to maximize rules for security (deny-by-default), encapsulate workflows in skills, delegate independent investigations to subagents, and use hooks for lifecycle tasks (CI, formatting, notifications). The repository should follow the official structure (as in the marketplace example【76†L297-L305】), and CI should validate plugin.json, run lint, and test hooks/skills on every push.  

# Claude Code Deep Dive  

**Plugin Manifest:** Claude Code plugins live in a `.claude-plugin` directory. The manifest `plugin.json` (JSON) includes `name`, `version`, `description`, `author.name/email`, `license`, `keywords`, etc.【83†L458-L467】. For example, a minimal manifest:  
```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "What this plugin does",
  "author": {"name": "Name", "email": "me@example.com"},
  "license": "MIT",
  "keywords": ["investigation","logs"]
}
```  
This file registers the plugin with the Claude Code marketplace. Plugins are added to a marketplace (`.claude-plugin/marketplace.json`) and installed via CLI commands. The manifest enables metadata and distribution through Claude’s plugin registry【83†L458-L467】.  

**Skills:** Claude Code uses the Agent Skills standard for plugin skills. A skill is defined by a `SKILL.md` file with YAML frontmatter. The frontmatter includes `name` (the `/slash-command`), `description`, and optional flags. Claude Code automatically discovers skills in `~/.claude/skills/`, `project/.claude/skills/`, and plugin `plugins/<plugin>/skills/<skill>/SKILL.md`. Claude loads skills either when the user invokes `/skill-name` or automatically when its description matches the user’s query【86†L81-L90】【86†L93-L96】. The content of `SKILL.md` is the instructions the agent follows. Claude Code supports contextual injection and subagent execution via skill frontmatter. Skills provide reusable capabilities (e.g. summarizing logs, generating hypotheses) and can come with supporting files. They can control invocation (only user or Claude) and tool restrictions via frontmatter flags. Claude’s skill system is flexible: plugin skills have a namespace (e.g. `plugin:skill`) to avoid collisions【86†L193-L202】.  

**Hooks:** Claude Code hooks are user-defined shell commands triggered on lifecycle events, similar to Cursor but in Claude’s environment. Hooks run on events like *before/after editing a file, needing user input, session start/end*, etc. They are configured via the `/hooks` CLI menu or JSON. Hooks ensure deterministic behavior: for example, a *before-command* hook can block or modify the agent’s action, and an *after-edit* hook can auto-format code. The docs state: *“Hooks are user-defined shell commands that execute at specific points in Claude Code’s lifecycle… ensuring certain actions always happen rather than relying on the LLM”*【87†L82-L90】. Hooks can run arbitrary scripts, so they can integrate with linters, notifiers, or permission checks. Hooks use JSON input/output for structured data, and you can even write agent-based hooks (which invoke Claude to decide). For our platform, hooks provide automation (e.g. alerting, policy enforcement) at precise points in the agent workflow【87†L82-L90】.  

**Subagents:** Claude Code subagents (a.k.a. sub-agents) are specialized assistants within a session. Like Cursor’s, each subagent has its own context, system prompt, and tool access rules. Subagents “run in a separate context window with a custom system prompt, a specific tool access policy, and independent permissions.” They are declared in YAML under `.claude/agents/` with fields (name, prompt, model, tools, memory). Subagents preserve their own context and memory (user/project/local) across turns within the same session. They cannot spawn other subagents. Subagents are ideal for compartmentalizing tasks – e.g., a “searcher” subagent to gather data, a “summarizer” subagent to parse results, etc. The main agent decides when to delegate to them based on rule frontmatter or the conversation. Subagents output their findings back to the main agent; they do not communicate with each other.  

**Agent Teams:** Claude Code also supports *agent teams* – parallel sessions that communicate amongst themselves. Unlike subagents, which are children of one session, an agent team consists of multiple Claude Code CLI sessions instantiated together. Teammates have *fully independent contexts and memories* and can send messages to each other via a shared task list. The platform docs explicitly state: “Subagents are spawned by the main agent, do work, and report results back. Agent teams coordinate through a shared task list, with teammates communicating directly with each other.”【89†L49-L57】. Agent teams are chosen for highly collaborative tasks. The docs advise: *“Use subagents when you need quick, focused workers that report back. Use agent teams when teammates need to share findings, challenge each other, and coordinate on their own.”*【89†L49-L57】. In effect, agent teams are like a group chat of autonomous agents. Each team member runs in its own session, so their chat histories and tools are isolated, but they can reference a common task queue. Performance-wise, teams are heavier (each teammate consumes its own context window and tokens), but they enable richer interaction (debate, cross-verification).  

**Cross-Agent Communication:** Within an agent team, teammates communicate directly (broadcast messages to the team or to specific members). In contrast, subagents do not talk to each other; they only report back to the main agent. This has strategic implications: Cursor (which lacks an “agent team” concept) cannot natively support peer-to-peer agent dialogues, whereas Claude Code can.  

**Memory Isolation:** Claude Code separates memory by scope. Importantly, **agent teams have no persistent memory across sessions**: each teammate starts with a fresh state. Subagents, however, can use persistent memory (user, project, or local scope) within their session. In one developer discussion, it was noted: _“No persistent memory for teammates. Subagents support `memory: user|project|local` for cross-session learning. Teammates start fresh every time.”_【90†L1-L4】. Thus, a subagent can accumulate knowledge, but a team’s agents cannot – they reset each run. In designing our system, this means we should prefer subagents if historical learning is needed, and treat agent teams as stateless.  

**Tool Invocation & Runtime:** Claude Code agents (subagents or team members) invoke tools via an internal protocol (the CLI sends JSON requests to the plugin’s MCP server or local tools). The plugin code runs as a CLI extension, not in an external process. In contrast, Cursor plugins run in the Cursor desktop app environment. Runtime differences: Claude Code agents operate in a headless CLI mode, whereas Cursor agents are integrated with an IDE/desktop app (affecting UI/UX and permissions).  

**Distribution & Versioning:** Claude Code plugins are distributed via marketplaces or Git repos. A plugin marketplace is defined by a `.claude-plugin/marketplace.json`. Team marketplaces can be installed via settings. Plugins themselves can be installed by name@marketplace or by adding a GitHub repo. Versioning: Plugins use semantic versions in their manifest. Claude Code has built-in commands to validate and package plugins (the “plugin-development” toolkit in [83]). Release workflow can use Git tags or GitHub Releases. Plugins can also be published to the official Claude Code store if desired.  

# Comparative Platform Strategy  

| Capability            | Cursor                                  | Claude Code                                 | Strategic Implication                                  |
|-----------------------|-----------------------------------------|---------------------------------------------|--------------------------------------------------------|
| **Rules vs Hooks**    | **Rules:** Always-on Markdown rules as static context【79†L1-L3】; no built-in hook triggers.  | **Hooks:** Lifecycle hook scripts (JSON-configured) for event automation【87†L82-L90】. Claude has no “persistent rules” concept. | Leverage Cursor’s rules for baseline policies, but use Claude’s hooks for runtime automation. Don’t limit designs to lowest common feature. |
| **Skills**            | Loaded dynamically from `SKILL.md`; triggered by agent when relevant【78†L222-L230】. Cursor skills cannot be preloaded in subagents.  | Uses AgentSkills standard (`SKILL.md` with frontmatter)【86†L81-L90】; auto-discovery by Claude. Can specify invocation and dynamic context.  | Both support extensible skills; design domain workflows in skills. Use Cursor for code-centric tasks and Claude for broader tasks via skill frontmatter. |
| **Subagents vs Teams**| Subagents supported: parallel tasks in one session【92†L15-L22】. No multi-session team concept.   | Subagents: same-session, report back to main. **Agent Teams:** separate sessions collaborating【89†L49-L57】.  | Use subagents on both for parallel subtasks. Exploit Claude teams for collaborative investigations (e.g. attacker vs defender agents). Cursor has only subagents. |
| **Context Handling**  | Cursor composes context from open files, rules (always-on), and subagent results. Context window ~few thousand tokens.  | Each Claude session has its own chat history; agents in a team do *not* share context. No cross-session context except via memory (subagents).  | Architect per-platform context strategy: for Cursor, optimize rules and file context; for Claude, use memory and careful prompt design. |
| **Memory Isolation**  | Cursor: No built-in persistent memory, though external RAG can be used. Subagents in the same session share nothing except messages.  | Subagents can use persistent memory scopes. Agent team members have *no memory* across sessions【90†L1-L4】.  | Rely on Claude’s memory for learning, use subagents for knowledge retention. Avoid expecting state in agent teams. |
| **Runtime Model**    | Runs inside Cursor IDE/CLI. Agents have access to codebase and local environment.  | Runs in Claude Code CLI. Agents use the same language model pipeline as Claude/Anthropic.  | Tailor design: Cursor plugins can do file I/O easily; Claude Code plugins need MCP or built-in integration. |
| **Distribution**      | Distributed via Cursor Marketplace (plugin JSON, MCP files)【76†L297-L305】 or as git repos.  | Distributed via Claude Code Marketplace (`.claude-plugin/marketplace.json`) and GitHub.  | Maintain separate adapter packaging: one for Cursor (Cursor plugin bundle), one for Claude (claude-plugin folder). Use CI to publish to both stores. |
| **Limitations**       | Limit on conversation length (sequoia’s context cap), restricted to coder workflow. Subagent token cost multiplies with parallelism.  | No GUI, limited to CLI; agent teams have token cost of separate instances. Subagents in Claude cannot spawn further subagents.  | Design to platform strengths: use Cursor for tight code editing flows; use Claude teams for broader research. Keep awareness of token limits and isolation. |

In summary, we should leverage each platform’s unique features rather than the intersection. For Cursor, maximize **Rules and Skills** as our guardrails and workflows, use subagents for code-centric parallel tasks, and use its hooks and MCP for automation and integrations. For Claude Code, leverage **Agent Teams** for collaborative reasoning (e.g. multiple sub-investigators), use subagents for specialized tasks with memory, and employ hooks extensively for deterministic control. Core logic should adapt per platform: e.g. on Cursor, guardrails via `.mdc` rules; on Claude, enforce via hooks or skills frontmatter.  

# Core Engine + Adapter Architecture  

We propose a **shared-core engine** library containing common logic (dialog flow, hypothesis generation, reasoning primitives) and separate **adapter modules** for Cursor and Claude Code. A monorepo approach (with subdirectories like `core/`, `adapter-cursor/`, `adapter-claude/`) allows code sharing and unified CI, but versions must be managed carefully. Alternatively, a multi-repo setup (core on npm/pypi, adapters in separate repos) provides independent lifecycles at the cost of duplicate management. 

Key strategies:  
- **Avoid Duplication:** Core algorithms (e.g. AI orchestration, knowledge handling) live only once. Adapters call into core’s API. Use thin wrapper code per platform.  
- **Independent Releases:** Adapters have their own versioning but depend on core’s version. For example, `core@1.2.0` might require `adapter-cursor@>=1.2.0`.  
- **Stable API Contract:** Define a clear, minimal interface for core functions (e.g. `investigateIncident()`), and version it semantically. Breaking changes should bump major versions.  
- **Plugin Wrappers:** For Cursor, the adapter can be a Node.js plugin consuming core (or vice versa); for Claude, a Python/Node module for the CLI. These adapters transform platform-specific inputs (e.g. CLI args, UI events) into core calls.  

**Repository Structure (monorepo example):**  
```
/monorepo
├── core/                   # Core logic (LLM orchestration, routing, agent management)
│   ├── package.json (lib, version 1.x)
│   └── src/...
├── adapter-cursor/         # Cursor-specific plugin code
│   ├── .cursor-plugin/
│   ├── skills/, rules/, hooks/
│   └── package.json (depends on core)
├── adapter-claude/         # Claude Code-specific plugin code
│   ├── .claude-plugin/
│   ├── skills/, hooks/, agents/
│   └── package.json (depends on core)
└── .github/workflows/      # CI pipelines for core and adapters
```
This supports independent CI: changes in `core/` trigger tests for core and both adapters; changes in `adapter-cursor/` only test that adapter.

**Versioning:** Use [Semantic Versioning](https://semver.org/). Core and each adapter follow semver. When making non-breaking internal changes, bump patch; for API changes, bump major. Adapters must declare compatible core versions. For example, `core@2.0.0` could be used by `adapter-cursor@^2.0` and `adapter-claude@^2.0`.

**CI/CD Pipeline:** Each module has its own pipeline. For instance, using GitHub Actions:  
- **Core Pipeline:** On push to main, run unit tests, build package. On release tag, publish core package.  
- **Adapter Pipelines:** On push (in adapter folder), install core package (from local or registry), run lint/tests, build plugin bundle. On release, publish the adapter plugin (to Cursor marketplace or to PyPI/npm as needed).  

Diagrammatically, releases are orchestrated as: bump core → run core release pipeline → adapters detect core version change (via dependency update) → run adapter pipelines. Use automations (e.g. dependabot or custom scripts) to sync versions. Ensure that one platform’s release (e.g. a Cursor-specific fix) does not block the other: they have separate pipelines.  

# Advanced Multi-Agent System Design  

Beyond basic triage/verifier, we can incorporate sophisticated agent patterns:  

- **Hierarchical Orchestration (Orchestrator-Worker):** A lead agent plans and delegates to specialized subagents (workers)【54†L103-L112】. For example, the lead agent splits a ticket into tasks, spawns research subagents for each task, then aggregates results. This mirrors Anthropic’s Research feature design【54†L103-L112】.  
- **Planner-Executor Pattern:** One agent (planner) breaks down goals, while other agents (executors) carry out specific tasks. The planner maintains a list of tasks in memory and assigns to executors.  
- **Debate Agents (Democratic Debate):** Multiple agents propose solutions and critique each other iteratively. Each agent takes a perspective; they engage in rounds of arguments until consensus or vote【60†L52-L61】【60†L85-L92】. This can increase answer accuracy for critical decisions. The drawback is high computation and orchestration complexity.  
- **Consensus/Voting Agents:** Agents independently solve a sub-problem and then vote on the best answer. Simpler than debate, but may miss subtle errors (unlike debate’s dynamic interaction)【60†L85-L92】.  
- **Long-Lived Investigation Agents:** Agents that maintain state across multiple sessions or days, gradually building a case. They can retain memory of past incidents and adapt over time. This requires a persistent memory store and careful lifecycle management.  
- **Event-Driven Agents:** Agents triggered by external events (e.g. new alert, log spike). They automatically start a triage or investigation, then may spawn subagents. This uses message queues or event listeners.  
- **Self-Improvement Agents:** Meta-agents that evaluate past actions, tune prompts or strategy, and update rules/skills. For instance, an agent that monitors success rates of hypotheses and suggests prompt changes. This blurs into AutoML territory.  
- **Feedback Ingestion Agents:** Agents dedicated to processing human feedback or incident resolution outcomes and updating the knowledge base. For example, an agent parses the final ticket resolution and adds it to RAG or retrains parts of the model.  
- **Cost-Aware Routing Agents:** Agents monitor usage and dynamically switch between expensive and cheap models for different tasks (see Model Routing). For example, an agent could first try a faster model, and if uncertain, escalate to a larger one.  
- **Policy Enforcement Agents:** Agents that monitor other agents for compliance. For example, a “security auditor” agent checks each action for policy adherence, or a “budget watchdog” agent tracks token spending.  

These patterns are documented in literature. For example, Azure’s architecture guide lists **sequential** and **parallel** orchestration patterns【56†L55-L64】: sequential (pipeline of specialized agents) for clear step-by-step tasks, or parallel (agents operate independently) for independent subtasks. Anthropic’s Research system demonstrated hierarchical orchestration with lead and browse agents【54†L103-L112】. Debate/consensus is described in recent AI engineering blogs【60†L52-L61】.  

**Tradeoff Matrix:**  
| Pattern                  | Advantages                 | Disadvantages               | Best Use Cases              |
|--------------------------|----------------------------|-----------------------------|-----------------------------|
| Single Agent w/Tools     | Simple, cheap tokens       | May fail complex tasks      | Simple queries, CRUD tasks  |
| Hierarchical (Lead/Sub)  | Scales reasoning, parallel | More tokens, orchestration  | Open-ended research, info gathering【54†L103-L112】 |
| Debate/Consensus         | Robust answers, corrects errors【60†L52-L61】 | Very expensive, complex   | High-stakes analysis, ethical decisions |
| Planner/Executor         | Clear roles, flexible      | Requires good planning logic| Complex multi-step tasks    |
| Long-lived Agents        | Learns over time           | Hard to maintain state, drift| Ongoing monitoring tasks    |
| Event-driven             | Reacts autonomously        | Complexity in event design  | Incident response           |
| Feedback Agents          | Continuous improvement     | Risk of introducing bias    | Systems with human review   |
| Cost-aware routing       | Saves money, meets latency | Adds orchestration overhead | High-volume querying        |
| Policy Enforcement       | Improves security         | Additional cost, potentially conflicts | Regulated environments  |

# Model Routing Strategy  

The system should support dynamic model selection: picking the LLM (or GPU) per subtask based on latency and cost targets. Common patterns include:  
- **Per-task routing:** For each new question or step, select a model based on its urgency or complexity. E.g. use a fast small model for initial analysis, and only if it fails, retry with a larger model.  
- **Cost-aware cascades:** Chain models: first hit with a lower-cost model, if the confidence score is low, escalate to a higher-power model. This follows AWS Bedrock’s *Intelligent Prompt Routing*, which predicts quality vs cost【63†L79-L88】【63†L125-L134】. Bedrock’s router can reduce costs by 35–56% by sending easy prompts to cheaper models while matching accuracy of the largest model【63†L79-L88】【63†L125-L134】. We can build a similar router in-house: train a lightweight classifier to estimate if a prompt needs the “Sonnet” model or if “Haiku” suffices.  
- **Latency-aware routing:** For real-time alerts requiring fast response, choose lower-latency models; for detailed analysis, use high-capacity models.  
- **Hybrid small+large cascades:** Use a small model to generate candidates/hypotheses, then have a larger model verify or refine them. This balances speed and quality.  
- **Model governance:** Maintain a catalog of approved models (and custom LLMs) per domain. Routinely evaluate model performance and fairness.  
- **User modes:** Let users configure “modes” like *economy* (favor smaller models, optimize cost) or *quality* (always use best model).  

Patterns from vendors: OpenAI’s advice (e.g. using GPT-4 for complex tasks, GPT-3.5 for simple ones) and function-calling multitier pipelines inform us. AWS’s Bedrock shows that learned routing (even within one family) dramatically saves cost【63†L79-L88】【63†L125-L134】. Anthropic may offer in future model routing (their Foundry announcement hints at multi-model routers). Enterprise governance demands logging which model was used and why, for auditing.  

# Observability & Transparency Framework  

A rigorous observability architecture is crucial. Key elements:  

- **Trace Logging (OpenTelemetry):** Instrument every component with structured tracing. Follow the GenAI semantic conventions: log *prompt text, model name, token counts, cost, timestamps*, etc. OpenTelemetry guidelines recommend capturing prompts and responses as events (not attributes) to avoid large spans【66†L1-L4】. For example, record an event `llm.prompt` with the prompt text and metadata (model, input tokens), and `llm.response` with output.  
- **End-to-End Traces:** Assign each user request a unique `trace_id`. Every agent action (prompt → tool call → next prompt) is a span. The trace should include all tool interactions (database queries, shell commands) and subagent calls. Traceloop’s analysis emphasizes that “every step in the LLM pipeline… including prompt construction, external API calls, retrieval calls, and intermediate model outputs, must be logged and correlated”【67†L60-L69】. We will use OpenTelemetry/Jaeger to collect this.  
- **Deterministic Tool Logs:** Ensure that when an agent runs a deterministic tool (e.g. grep, db query), its inputs/outputs are logged. These should be trace spans so they link into the trace. This aids reproducibility and debugging.  
- **Hypothesis & Score Logging:** When an agent forms hypotheses, log those hypotheses as structured data (e.g. candidate issue, confidence). Store links to evidence. Use an evidence-graph approach: nodes are claims and data sources. This provides transparency in how a conclusion was reached.  
- **Audit & Replay:** Build a “replay” system: take any completed trace and replay it deterministically. For instance, one could freeze an LLM’s random seed (or use n-grams) and re-run the same prompts and tools to reproduce. Traceloop stresses the importance of converting a production trace into a repeatable test case【67†L77-L86】. We will enable “snapshotting” of entire investigations so that engineers can step through what the agents did.  
- **Privacy-Safe Capture:** Avoid logging sensitive data. Use redaction hooks before logging. For example, credit card numbers or PII in prompts should be masked. Sensitive tool outputs should not be logged in clear text.  
- **Metrics & Monitoring:** In addition to traces, collect metrics: request count, latency, error rates, cost (tokens) per task. The OpenTelemetry blog suggests tracking *request volume, latency, token counts, and cost over time* for anomaly detection【65†L373-L382】. Integrate with dashboards (Prometheus/Grafana).  
- **User Audit Reports:** Provide users an export of the investigation reasoning: e.g. a tree of hypotheses, evidence sources, agent actions. This ensures transparency. Perhaps generate a structured report they can review or store externally.  
- **Internal Telemetry:** Aggregate traces for ML: e.g. analyze which reasoning paths succeed vs fail, to improve agents.  
- **Secure Export:** Allow secure extraction of traces (e.g. encrypted bundles) for compliance audits.  

Overall, the observability stack will be an extension of OpenTelemetry. Each agent call (lead or sub) emits spans. We might build on open-source tools like OpenLLMetry【65†L442-L451】 for auto-instrumentation. This ensures reproducibility and auditability of every AI decision.  

# Knowledge & Learning Architecture  

The platform should continuously learn from new incidents while maintaining control:  

- **Retrieval-Augmented Generation (RAG):** Use vector stores to index incident databases (logs, tickets, KB articles). Queries by agents will retrieve top-k relevant chunks. Best practice: enterprise RAG often uses hybrid ranking (keyword + semantic). Keep the knowledge base well-organized (clean and up-to-date) to avoid stale info.  
- **Knowledge Graphs (GraphRAG):** As enterprises scale, pure RAG hits limits. We can embed a knowledge graph layer for cross-document reasoning. GraphRAG organizes facts as entities and relations【91†L39-L47】, enabling multi-hop queries (“which services span both failures X and Y?”). Entities could include server names, error codes, users, etc. This enhances explainability and supports compliance (traceable evidence chains)【91†L39-L47】. For example, extract events from logs into a graph so that an agent can traverse related events rather than just matching text.  
- **Memory Partitioning:** Maintain separate memory per domain or service. For example, keep an isolated memory database for each application. This prevents unrelated incidents from polluting context. Use embeddings to detect new vs known problems: an incident is “similar” if its vector distance to a cluster of past incidents is low. This incident-similarity search accelerates diagnosing recurring issues.  
- **Feedback Ingestion:** After each investigation, log the final resolution and agent decisions. Use a “feedback loop agent” to parse these (e.g. extract root cause, solution steps) and update the knowledge base. If human reviewers confirm or correct agent hypotheses, incorporate that data into retraining or prompt-rule updates.  
- **Continuous Improvement Pipeline:** Periodically retrain or fine-tune the agent on accumulated incident data, question-answer pairs, and rubric-scored performance. However, guard this with human review: do not fully automate updates. Use a “staging” instance to test new models or rules before promoting to production.  
- **Guardrails:** Implement checks before auto-updating memory or models. For instance, require a human sign-off on new knowledge entries or model changes. We should version the knowledge base (e.g. nightly snapshots) so we can roll back if poisoning is detected.  
- **Domain-Specific Memory:** The architecture can include separate vector indexes or graph shards per department/service. This limits cross-contamination of domain knowledge and eases permission control.  

In short, combine RAG and possibly GraphRAG for retrieval, use memory scopes for persistence, and ingest human feedback in a controlled pipeline. Govern all knowledge updates with an audit trail.  

# Deployment & Infrastructure  

**Containerization:** The system components (core engine, adapters, database, message broker) will run in containers. For example, each adapter plugin (Cursor service, Claude CLI service) can be a Docker container. Use Kubernetes (or ECS/Fargate) for orchestration.  

**Horizontal Scaling:** Design stateless agents/services so multiple instances can scale out. For example, a web frontend or API gateway can spawn many agent-worker pods. Use a job queue for long-running investigations so we can process in parallel. Sharding: run separate pods for core logic vs memory store vs database.  

**Async Job Orchestration:** Investigations can be modeled as workflows or DAGs. Use an async task system (e.g. Celery, Airflow, or Kubernetes Jobs) to manage multi-step processes (e.g. plan → execute subagents → aggregate). Decouple ingestion (ticket arrival) from processing via a queue (Kafka or SQS).  

**Tool Access Security:** Agents may need to run shells or query services. Each tool or API call should go through a secure interface. Run shell commands in jailed environments (containers or restricted user), and use IAM roles for cloud service calls. For example, if an agent needs AWS logs, it uses a role with read-only permissions. Hardware devices (e.g. SSH into VMs) are accessed via bastion servers.  

**Multi-Tenant Isolation:** If the platform serves multiple departments or customers, isolate at the network and container level. For K8s, use namespaces and RBAC. Ensure data (memory, logs) is partitioned per tenant. Use secret scopes per tenant for credentials.  

**Credential Vault:** Store all service credentials (DB passwords, API tokens) in a secure vault (e.g. HashiCorp Vault or AWS Secrets Manager). Agents retrieve secrets via configured token access, not hardcoded. Rotate secrets regularly.  

**CI/CD for AI Systems:** Treat infrastructure as code. Automate builds of adapters/agents on code push. Use canary deployments for new agent versions (roll out to a subset of queries). CI pipelines should include AI-specific tests (prompt evaluation suites).  

**Canary/Rollback:** Agents and models should have versioned deployments. We can route a percentage of traffic to new agents and monitor performance. If quality drops, rollback. Keep old models available for rollback.  

**Independent Adapter Deploy:** The Cursor and Claude adapters should be deployable independently. For example, updating the Claude plugin should not require redeploying the Cursor service. Core updates may need coordinated adapter updates, but minimize coupling.  

**Infrastructure Components Diagram (conceptual):** 
- *API Layer:* Receives tickets/alerts, stores in DB. 
- *Core Engine Service:* Processes tickets, calls adapters. 
- *Cursor Adapter:* Handles Cursor-specific plugin logic, communicates with Core. 
- *Claude Adapter:* Runs as CLI service, communicates with Core via REST or gRPC. 
- *Worker Pool:* Agents/subagents as container pods. 
- *Databases:* Vector DB (for memory/RAG), relational DB (incidents, user data), knowledge graph store. 
- *Message Bus:* Kafka or RabbitMQ for event-driven tasks. 
- *Monitoring:* Prometheus/Grafana, ELK for logs. 

# CI/CD & Repo Strategy  

As discussed, a **monorepo** can simplify code reuse but requires discipline in pipelines. If monorepo: use path filters so that changes in `core/` trigger tests for all subprojects, whereas changes in `adapter-cursor/` only trigger its pipeline. If multi-repo: ensure dependency management (e.g. core published to a package registry and adapters pinned to versions).  

**Pipeline Design:** Each project (core, cursor adapter, claude adapter) has its own CI workflow:  
1. **Lint & Unit Tests:** Run on every PR.  
2. **Integration Tests:** e.g. simulate a full investigation with dummy data.  
3. **Plugin Validation:** For Cursor, use `cursor-plugin validate`; for Claude, `plugin-development:validate`.  
4. **Build & Publish:** On merges to `main` or tags, build Docker images or packages and push to registry.  

Diagrammatically, the release flow is:  
```
[Dev Commit] 
   ↓ CI (core tests) 
   → If core changed: build core lib, run core integration
   ↓ CI (cursor adapter tests)
   ↓ CI (claude adapter tests)
   → If all green: merge 
   ↓ Release orchestrator 
   → Tag core (new version) 
   → Trigger core release pipeline 
   → On success, bump adapter deps 
   → Trigger adapter release pipelines 
   → Publish Cursor and Claude plugins 
```
To **avoid one platform blocking another**, ensure adapters can pin older core versions until they’re ready. Also, pipelines run in parallel where possible. Use feature flags to disable new features on one platform if another isn’t updated yet.  

# Risk & Governance  

Build a risk matrix with categories vs mitigations. Key AI-specific risks:  

- **Prompt Injection:** Malicious inputs altering agent behavior. Mitigation: sanitize inputs, use robust prompt templates, chain-of-thought checks. Also, enforce architectural safeguards: *“Constrain what an agent can access… require human approval for high-risk operations.”*【72†L139-L148】. In practice, do not allow unvalidated user text to become system prompts without review.  

- **Tool Misuse:** An agent might run dangerous commands or access data it shouldn’t. Mitigate by whitelisting allowed tools/commands per plugin, running commands in a secure sandbox, and requiring confirmation for any irreversible actions.  

- **Privilege Escalation:** Agents might exploit holes to gain extra privileges. Mitigate by least-privilege IAM roles, network isolation, and thorough pentesting of agent workflows.  

- **AI Overreach:** Agents autonomously doing things beyond scope (e.g. deleting records). Use hard-coded checks: limit agent scopes, implement supervisor hooks. Provide an emergency stop or “AI kill-switch”.  

- **Misclassification/Escalation:** Agents may fail to recognize a critical incident or misjudge severity. Mitigate by multi-agent cross-check (e.g. have an audit agent re-verify high-impact decisions) and by setting low thresholds for human escalation on uncertainty.  

- **Economic Risk (Cost Runaway):** Agents using too many tokens (e.g. multi-agent wastes). Track spending per session and overall. Set budgets/cooloffs. Possibly a cost-aware agent monitors and throttles.  

- **Data Poisoning:** Feeding malicious data to RAG or memory. Counter by vetting training data, using anomaly detection on knowledge base entries, and requiring multiple corroborating sources before accepting new info.  

- **Regulatory & Trust:** Ensure logs and decisions are auditable (for GDPR, SOX, etc). Implement user consent where needed.  

Each risk is rated (Likelihood × Impact) and mitigation strategies documented. The VentureBeat analysis suggests enterprises treat attacks as inevitable, so defense-in-depth is required【72†L139-L148】.  

# Economic Considerations  

Multi-agent systems are powerful but expensive. As Anthropic notes, multi-agent research used ~15× more tokens than chat【54†L77-L86】. We must justify the cost: use expensive multi-agent routing only for high-value incidents (major outages, compliance cases). For routine queries, cheaper single-agent or small model workflows suffice. Monitor cost metrics (total tokens, compute hours) and regularly review ROI. Patterns: use smaller Claude models or even open-source models where possible, and scale horizontally (more cheap agents) rather than vertically (one huge agent). Also consider cloud vs on-prem tradeoffs and discount pricing for reserved instances.  

# Unknown Unknowns  

- **Debugging the Debugger:** We rely on meta-agents. If a bug occurs in the AI logic itself, we need methods to introspect it. This is a meta-problem (how do we apply our own stack to inspect agent cognition?).  
- **Failure Cascades:** An agent’s error (e.g. in deleting the wrong file) could trigger a series of bad actions. This risk is subtle and requires rigorous post-mortems.  
- **Knowledge Poisoning:** External systems or even malicious users could feed incorrect info that agents ingest. We must consider poisoning of RAG or memory. Continual validation of knowledge sources is needed.  
- **Scaling Governance:** As more teams adopt agents, organizational processes must scale: who owns the agent outputs? Who updates the memory? Governance structures often don’t keep up with fast AI changes.  
- **Enterprise Dynamics:** Different departments may compete or misalign on agent use. E.g. security team may restrict tools that DevOps needs. Political/incentive problems can undermine centralized design.  
- **Shadow AI:** Individual developers might run their own “rogue” agents (using SaaS LLMs) bypassing governance. The platform must detect or integrate such shadow usage.  
- **Future Regulations:** New AI laws (like pending AI Act in EU) may impose constraints on autonomous systems, data usage, and explainability. Our architecture should plan for compliance (e.g. data retention policies, user opt-outs).  

Each of these “unknown unknowns” could surface unexpected risks, so we include them as advisory topics.  

# References & Citations  

- Cursor official documentation and forum (Cursor 2.4 announcement, best practices)【92†L15-L22】【78†L232-L234】【79†L1-L3】.  
- Claude Code documentation (skills, hooks, agent teams)【86†L81-L90】【87†L82-L90】【89†L49-L57】.  
- GitHub engineering notes (Claude agent memory, repo structures)【83†L458-L467】【90†L1-L4】.  
- Anthropic engineering blog on multi-agent research【54†L103-L112】.  
- Multi-agent debate pattern (Medium)【60†L52-L61】【60†L85-L92】.  
- AWS Bedrock prompt routing blog【63†L79-L88】【63†L125-L134】.  
- OpenTelemetry LLM observability guide【65†L373-L382】【66†L1-L4】.  
- Traceloop observability blog【67†L60-L69】【67†L88-L95】.  
- GraphRAG enterprise architecture (Medium)【91†L39-L47】.  
- Security analyses (VentureBeat on prompt injection)【72†L139-L148】.  
- Azure AI agent design patterns【56†L55-L64】.  

Each section above is supported by these and other sources. All citations are given in the text as [†Lx-Ly].