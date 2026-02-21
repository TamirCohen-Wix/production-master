---
description: "Search Slack for production discussions and incidents"
argument-hint: "<keywords> [--channel NAME] [--from USER] [--time 7d] [--help]"
user-invocable: true
---

# Slack Search — Standalone Slack Query Tool (Cursor Adapter)

You search Slack for production discussions, incidents, and deployment threads. Execute MCP calls inline. No subagent dispatch needed.

---

## Argument Parsing

Parse `$ARGUMENTS` for flags:
- If `$ARGUMENTS` is empty or contains `--help` or `-h`, print usage and STOP:

```
Usage: /slack-search <keywords> [options]

Arguments:
  <keywords>          Search terms (e.g., SCHED-45895, "bookings outage")

Options:
  --channel NAME      Search in specific channel (e.g., bookings-alerts)
  --from USER         Filter by message author
  --time RANGE        Time range: 1d, 3d, 7d, 30d (default: 7d)
  --limit N           Max threads to return (default: 10)
  --help, -h          Show this help message

Examples:
  /slack-search SCHED-45895
  /slack-search bookings outage --channel bookings-alerts --time 3d
  /slack-search "deploy notifications" --from tamir
```

- Parse known flags from `$ARGUMENTS`: split on spaces, extract `--key value` pairs
- Everything that isn't a flag is the positional argument (keywords)

---

## Step 0: Load Domain Config

Detect the current repo name from `git remote get-url origin` (strip path and `.git` suffix).

Search for domain config in this order:
1. `~/.cursor/production-master/domains/<repo-name>/domain.json` (primary)
2. `.cursor/domain.json` (repo-local fallback)
3. `~/.cursor/domain.json` (legacy global fallback)

If found, extract:
```
SLACK_CHANNELS = domain.json -> slack_channels (object with alerts, dev, incidents)
JIRA_PROJECT = domain.json -> jira_project
```

If not found: log "No domain.json found. Searching across all channels."

---

## Step 1: Parse Arguments

Parse `$ARGUMENTS` to extract:
- **keywords** — the primary search terms
- **channel** — specific channel to search in (optional)
- **date_range** — after/before dates (optional)
- **author** — specific user (optional)

---

## Step 2: Load Skill

Read `core/skills/slack/SKILL.md` for search parameters, thread handling, and tool reference.

---

## Step 3: Execute

### Step 3a: Run multiple searches with different keyword strategies

Run 2-4 searches depending on context:

1. **Primary keywords:** `search-messages(searchText: "<user keywords>")`
2. **In alert channel (if domain config loaded):** `search-messages(searchText: "<keywords>", in: "<SLACK_CHANNELS.alerts>")`
3. **Ticket ID (if detected):** `search-messages(searchText: "<JIRA_PROJECT>-<number>")`
4. **Service + error:** `search-messages(searchText: "<service-name> error")`

### Step 3b: Fetch ALL thread replies

For EVERY thread found in search results:
1. Extract `channel_id` and `thread_ts` from the search result
2. Call `slack_get_thread_replies(channel_id: "<ID>", thread_ts: "<TS>")`
3. Read ALL replies — later replies often contain the resolution or correction

**Never conclude based on a thread's root message alone.**

---

## Step 4: Present Results

```
=== Slack Search Results ===
Keywords: <search terms>
Channels searched: <list>
Threads found: <count>

### Thread 1: <root message preview>
Channel: #<channel-name> | Author: <name> | Date: <timestamp>

**Root message:**
> <quoted message>

**Replies (<count>):**
> <reply 1 -- author, timestamp, message>
> <reply 2 -- author, timestamp, message>
> ...

---

### Thread 2: ...
```

**Rules:**
- Report raw data only — quote messages verbatim, don't draw conclusions.
- Always verify the time window matches the investigation period.
- Thread replies may reverse or correct the root message — include the FULL thread.
- If no results found, suggest alternative search terms.
- Never fabricate Slack messages.
