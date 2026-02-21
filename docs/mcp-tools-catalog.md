# Production Master MCP Tool Catalog

Generated from Production Master toolkit descriptors under:

- `/Users/tamirc/.cursor/projects/Users-tamirc-Projects-production-master/mcps/user-production-master/tools`
- Toolkit page: `https://mcp-s-connect.wewix.net/toolkits/tamirc@wix.com:production-master`

- Total tools found: **172**
- Total servers found: **1** (`user-production-master`)

## Toolkit setup

- Cursor endpoint: `https://mcp-s.wewix.net/mcp?toolkit=tamirc%40wix.com%3Aproduction-master`
- Claude Code:

```bash
claude mcp add --transport http mcp-s "https://mcp-s.wewix.net/mcp?toolkit=tamirc@wix.com:production-master"
```

## Tool Index

1. `context7__query-docs`
2. `context7__resolve-library-id`
3. `db-core__execute_sql_query`
4. `db-core__explain_sql_query`
5. `db-core__get_cluster_recommendation`
6. `db-core__get_db_process`
7. `db-core__get_logical_cluster`
8. `db-core__get_replication_lag`
9. `db-core__get_schema_analysis`
10. `db-core__list_bindings`
11. `db-core__list_cluster_tables`
12. `db-core__list_cluster_views`
13. `db-core__list_clusters`
14. `db-core__list_db_processes`
15. `db-core__list_db_schema_changes`
16. `db-core__list_instances`
17. `db-core__pre_validate_binding`
18. `devex__available_rcs`
19. `devex__code_owners_for_path`
20. `devex__find_commits_by_date_range`
21. `devex__fleets_pods_overview`
22. `devex__get_build`
23. `devex__get_build_by_external_id`
24. `devex__get_commit_information`
25. `devex__get_devex_fqdn`
26. `devex__get_ownership_tag_info`
27. `devex__get_project`
28. `devex__get_project_ownership`
29. `devex__get_rollout_history`
30. `devex__get_service_ownership`
31. `devex__project_quality_service_get_scores`
32. `devex__release_notes`
33. `devex__search_builds`
34. `devex__search_projects`
35. `devex__search_releases`
36. `devex__where_is_my_commit`
37. `devex__why_pr_build_failed_exp`
38. `docs-schema__client_lib`
39. `docs-schema__fqdn_info`
40. `docs-schema__fqdn_lookup`
41. `docs-schema__fqdn_schema`
42. `docs-schema__fqdn_service`
43. `docs-schema__search_docs`
44. `fire-console__find_site`
45. `fire-console__find_user`
46. `fire-console__generate_server_signature`
47. `fire-console__get_artifact_info`
48. `fire-console__get_cli_command`
49. `fire-console__get_client_spec_map`
50. `fire-console__get_editor_client_spec_map`
51. `fire-console__get_instances`
52. `fire-console__get_method_schema`
53. `fire-console__invoke_rpc`
54. `fire-console__list_artifacts`
55. `fire-console__list_services`
56. `fire-console__search_services`
57. `github__add_issue_comment`
58. `github__compare_branches`
59. `github__create_branch`
60. `github__create_issue`
61. `github__create_or_update_file`
62. `github__create_pull_request`
63. `github__create_pull_request_review`
64. `github__get_file_contents`
65. `github__get_issue`
66. `github__get_pull_request`
67. `github__get_pull_request_comments`
68. `github__get_pull_request_reviews`
69. `github__list_commits`
70. `github__list_issues`
71. `github__list_pull_requests`
72. `github__merge_pull_request`
73. `github__push_files`
74. `github__reply-to-pull-request-comment`
75. `github__search_code`
76. `github__search_issues`
77. `github__search_repositories`
78. `github__update_issue`
79. `github__update_pull_request_branch`
80. `gradual-feature-release__create-feature-release`
81. `gradual-feature-release__get-feature-toggle`
82. `gradual-feature-release__get-feature-toggle-counter`
83. `gradual-feature-release__list-releases`
84. `gradual-feature-release__list-strategies`
85. `gradual-feature-release__query-feature-toggles`
86. `gradual-feature-release__search-feature-toggles`
87. `grafana-datasource__grafana_query`
88. `grafana-datasource__list_datasources`
89. `grafana-datasource__query_access_logs`
90. `grafana-datasource__query_app_logs`
91. `grafana-datasource__query_bi_events`
92. `grafana-datasource__query_domain_events`
93. `grafana-datasource__query_loki`
94. `grafana-datasource__query_panorama`
95. `grafana-datasource__query_prometheus`
96. `grafana-datasource__query_prometheus_aggr`
97. `grafana-mcp__find_error_pattern_logs`
98. `grafana-mcp__find_slow_requests`
99. `grafana-mcp__get_alert_rule_by_uid`
100. `grafana-mcp__get_assertions`
101. `grafana-mcp__get_dashboard_by_uid`
102. `grafana-mcp__get_dashboard_panel_queries`
103. `grafana-mcp__get_datasource_by_name`
104. `grafana-mcp__get_datasource_by_uid`
105. `grafana-mcp__get_incident`
106. `grafana-mcp__list_alert_rules`
107. `grafana-mcp__list_contact_points`
108. `grafana-mcp__list_datasources`
109. `grafana-mcp__list_incidents`
110. `grafana-mcp__list_loki_label_names`
111. `grafana-mcp__list_loki_label_values`
112. `grafana-mcp__list_prometheus_label_names`
113. `grafana-mcp__list_prometheus_label_values`
114. `grafana-mcp__list_prometheus_metric_metadata`
115. `grafana-mcp__list_prometheus_metric_names`
116. `grafana-mcp__list_sift_investigations`
117. `grafana-mcp__query_loki_logs`
118. `grafana-mcp__query_loki_stats`
119. `grafana-mcp__query_prometheus`
120. `grafana-mcp__search_dashboards`
121. `grafana-mcp__update_dashboard`
122. `jira__bulk-move-issues`
123. `jira__comment-on-issue`
124. `jira__create-issue`
125. `jira__create-release-version`
126. `jira__create_issue_link`
127. `jira__delete_issue`
128. `jira__get-available-transitions`
129. `jira__get-create-meta-data`
130. `jira__get-issue-changelog`
131. `jira__get-issues`
132. `jira__get_user`
133. `jira__list-projects`
134. `jira__list_fields`
135. `jira__list_issue_types`
136. `jira__list_link_types`
137. `jira__transition-issue`
138. `jira__update-issue`
139. `kb-retrieval__get_all_documents_from_kb`
140. `kb-retrieval__get_document_from_kb`
141. `kb-retrieval__get_knowledge_base_entry_count`
142. `kb-retrieval__get_knowledge_base_info`
143. `kb-retrieval__insert_to_knowledge_base`
144. `kb-retrieval__list_knowledge_bases`
145. `kb-retrieval__retrieve_relevant_documents_from_kb`
146. `octocode__githubGetFileContent`
147. `octocode__githubSearchCode`
148. `octocode__githubSearchPullRequests`
149. `octocode__githubSearchRepositories`
150. `octocode__githubViewRepoStructure`
151. `octocode__packageSearch`
152. `root-cause__await_root_cause_analysis`
153. `root-cause__start_root_cause_analysis`
154. `slack__search-messages`
155. `slack__slack_add_reaction`
156. `slack__slack_find-channel-id`
157. `slack__slack_find-user-id-by-email`
158. `slack__slack_get_channel_history`
159. `slack__slack_get_thread_replies`
160. `slack__slack_get_user_profile`
161. `slack__slack_join_public_channel`
162. `slack__slack_list_channels`
163. `slack__slack_post_message`
164. `slack__slack_reply_to_thread`
165. `trino__execute_trino_sql_query`
166. `trino__get_approx_distinct_values_with_count`
167. `trino__get_sample_data`
168. `trino__get_table_file_stats`
169. `trino__get_table_partitions`
170. `trino__get_table_schema`
171. `trino__get_table_technical_metadata`
172. `trino__sleep`

## Tool Details

### 1. `context7__query-docs`

- **Description:** Retrieves and queries up-to-date documentation and code examples from Context7 for any programming library or framework.

You must call 'resolve-library-id' first to obtain the exact Context7-compatible library ID required to use this tool, UNLESS the user explicitly provides a library ID in the format '/org/project' or '/org/project/version' in their query.

IMPORTANT: Do not call this tool more than 3 times per question. If you cannot find what you need after 3 calls, use the best information you have.
- **Definition:**
- `libraryId` (string, required): Exact Context7-compatible library ID (e.g., '/mongodb/docs', '/vercel/next.js', '/supabase/supabase', '/vercel/next.js/v14.3.0-canary.87') retrieved from 'resolve-library-id' or directly from user query in the format '/org/project' or '/org/project/version'.
- `query` (string, required): The question or task you need help with. Be specific and include relevant details. Good: 'How to set up authentication with JWT in Express.js' or 'React useEffect cleanup function examples'. Bad: 'auth' or 'hooks'. IMPORTANT: Do not include any sensitive or confidential information such as API keys, passwords, credentials, or personal data in your query.
- **Descriptor:** `user-production-master/tools/context7__query-docs.json`

### 2. `context7__resolve-library-id`

- **Description:** Resolves a package/product name to a Context7-compatible library ID and returns matching libraries.

You MUST call this function before 'query-docs' to obtain a valid Context7-compatible library ID UNLESS the user explicitly provides a library ID in the format '/org/project' or '/org/project/version' in their query.

Selection Process:
1. Analyze the query to understand what library/package the user is looking for
2. Return the most relevant match based on:
- Name similarity to the query (exact matches prioritized)
- Description relevance to the query's intent
- Documentation coverage (prioritize libraries with higher Code Snippet counts)
- Source reputation (consider libraries with High or Medium reputation more authoritative)
- Benchmark Score: Quality indicator (100 is the highest score)

Response Format:
- Return the selected library ID in a clearly marked section
- Provide a brief explanation for why this library was chosen
- If multiple good matches exist, acknowledge this but proceed with the most relevant one
- If no good matches exist, clearly state this and suggest query refinements

For ambiguous queries, request clarification before proceeding with a best-guess match.

IMPORTANT: Do not call this tool more than 3 times per question. If you cannot find what you need after 3 calls, use the best result you have.
- **Definition:**
- `libraryName` (string, required): Library name to search for and retrieve a Context7-compatible library ID.
- `query` (string, required): The user's original question or task. This is used to rank library results by relevance to what the user is trying to accomplish. IMPORTANT: Do not include any sensitive or confidential information such as API keys, passwords, credentials, or personal data in your query.
- **Descriptor:** `user-production-master/tools/context7__resolve-library-id.json`

### 3. `db-core__execute_sql_query`

- **Description:** Execute SQL Query - Runs a safe, read-only SELECT query against a MySQL database.

PARAMETERS:
- clusterName (string, required, 1-128 chars): Logical cluster name
- dbName (string, required, 1-128 chars): Database name
- query (string, required, 1-10000 chars): SELECT query with LIMIT clause. Must be approved by user before execution.

RETURNS: Query results as JSON (pretty-printed)

MANDATORY PREREQUISITES (follow this exact sequence):
1. list_bindings - Verify you have access to the database (access is by ownership tag)
2. list_cluster_tables - Understand table scale and row counts to assess query risk
3. get_schema_analysis - Understand schema structure, identify PRIMARY KEY columns (critical for safe queries)
4. Write an optimized query following the rules below
5. explain_sql_query - Validate query plan - MUST DO BEFORE ACTUAL EXECUTE!!!
6. Show the query -  in a readable format to the user and get explicit approval before executing

QUERY SAFETY RULES (based on EXPLAIN access type and table size):
- const/system (PK lookup): LOW risk - Always allowed
- eq_ref (PK lookup per JOIN row): LOW risk - Allowed
- ref/ref_or_null (non-unique index): MEDIUM risk - Always allowed
- range (index range scan): MEDIUM-HIGH risk - BLOCKED if table > 10GB
- index (full index scan): HIGH risk - BLOCKED if table > 10GB
- ALL (full table scan): CRITICAL risk - BLOCKED on production; preprod only if table < 128KB

QUERY RULES:
- Only SELECT statements (read-only)
- Multi-table JOINs not supported
- Always include LIMIT (max 200 rows unless instructed otherwise)
- Use PRIMARY KEY lookups; for composite PKs include first column(s) in order
- Use relative time: WHERE created_at > NOW() - INTERVAL 7 DAY
- Avoid SELECT * - specify columns needed
- JSON columns: JSON_EXTRACT(entity, '$.field')
- Table format: FROM <tableName> (no database prefix)
- Aggregate functions (COUNT, SUM, AVG, MIN, MAX) NOT allowed

CONNECTION:
- DEV replica (fallback: BI replica) - never writes to primary
- 60-second timeout, rate limited per user/database
- Temporary MySQL user with 1-hour TTL

NOT SUPPORTED: CA/PII clusters, localized/sharded databases, INSERT/UPDATE/DELETE/DDL, large exports
- **Definition:**
- `clusterName` (string, required): Logical cluster name (required)
- `dbName` (string, required): Database name (required)
- `query` (string, required): SELECT query with LIMIT. Must be approved by user before execution (required)
- **Descriptor:** `user-production-master/tools/db-core__execute_sql_query.json`

### 4. `db-core__explain_sql_query`

- **Description:** Explain SQL Query - Analyzes SELECT query execution plan using EXPLAIN FORMAT=JSON without executing.

PARAMETERS:
- clusterName (string, required, 1-128 chars): Logical cluster name
- dbName (string, required, 1-128 chars): Database name
- query (string, required, 1-10000 chars): SELECT query to analyze
- physicalClusterName (string, optional, 1-100 chars): Physical cluster to run explain on (defaults to logical cluster)

RETURNS:
- Table access info: table_name, access_type, possible_keys, key_used, estimated_rows, table_size, risk_level
- Query info: has_limit, limit_value
- Raw EXPLAIN FORMAT=JSON output

USE WHEN:
- BEFORE execute_sql_query to verify query is safe and efficient
- Understanding why a query might be blocked
- Optimizing queries by checking index usage
- Detecting full table scans on large tables

RISK LEVELS (by access_type):
- LOW: const/system/eq_ref - PK or unique index lookup (single row)
- MEDIUM: ref/ref_or_null - Non-unique index (always allowed)
- HIGH: range/index - Index scan, BLOCKED if table > 10GB
- CRITICAL: ALL - Full table scan, BLOCKED on production (preprod: allowed if < 128KB)

WORKFLOW:
1. list_bindings - verify database access
2. list_cluster_tables - understand table sizes
3. get_schema_analysis - understand schema and PKs
4. explain_sql_query - validate query plan
5. execute_sql_query - run if risk acceptable

TIPS:
- Use PRIMARY KEY in WHERE for LOW risk
- Add LIMIT to reduce estimated_rows
- If access_type is "ALL", rewrite to use an index

NOT SUPPORTED: CA/PII clusters, non-SELECT statements, multi-table JOINs
- **Definition:**
- `clusterName` (string, required): Logical cluster name (required)
- `dbName` (string, required): Database name (required)
- `physicalClusterName` (string, optional): Physical cluster name to run the explain on. If not supplied, uses the logical cluster name.
- `query` (string, required): SELECT query to analyze (required). Must be a valid SELECT statement.
- **Descriptor:** `user-production-master/tools/db-core__explain_sql_query.json`

### 5. `db-core__get_cluster_recommendation`

- **Description:** Get Cluster Recommendation - Returns recommended clusters sorted by suitability for an artifact.

PARAMETERS:
- privacyLevel (enum, required): Privacy level - "CA" (Critical Assets), "PII", or "REGULAR"
- trafficType (enum, required): Traffic type - "INTERNAL", "USERS_EDITOR", or "UOU_PUBLIC"
- dbType (enum, required): Database type - "MYSQL", "MONGO", or "ELASTICSEARCH"
- artifactId (string, required, 1-100 chars): Artifact ID requiring database access

RETURNS:
- List of recommended clusters sorted by suitability
- Cluster name, database type, and recommendation reason for each

USE WHEN:
- Finding suitable clusters for a new artifact binding
- Planning database architecture for new services
- Determining which cluster to bind an artifact t
- Finding suitable cluster to promote the srtifact the service to

WORKFLOW:
1. Ask user for expected RPM and estimated DB size (GB)
   - If unknown, calculate from: estimated rows × row size
2. If RPM > 50,000 OR DB size > 500 GB:
   - Advise user to consult DBA or #db Slack channel
   - Do not proceed
3. Call this tool with all required parameters - ask the user for missing information and do not make assumptions!
4. Present recommendations to user
5. After user selects a cluster, call pre_validate_binding to verify

NEXT STEPS AFTER RECOMMENDATION:
- Use pre_validate_binding to verify the selected cluster can be bound
- **Definition:**
- `artifactId` (string, required): Artifact ID requiring database access
- `dbType` (string, required): Database type (MYSQL, MONGO, or ELASTICSEARCH)
- `privacyLevel` (string, required): Privacy level of the artifact (CA, PII, or REGULAR)
- `trafficType` (string, required): Type of traffic (INTERNAL, USERS_EDITOR, or UOU_PUBLIC)
- **Descriptor:** `user-production-master/tools/db-core__get_cluster_recommendation.json`

### 6. `db-core__get_db_process`

- **Description:** Get DB Process - Returns detailed information about a specific database background process.

Use this to drill into a specific DB Core process (e.g., schema migration, binding operation, cluster configuration change) identified from list_db_processes.

PARAMETERS:
- processId (string, required, 1-128 chars): Process ID (GUID format)

RETURNS:
- Process ID, type, current state
- Created by (name/email/ID) and creation timestamp
- Request ID for investigation
- Status trail: actions with triggered/completed timestamps, failures
- Process details (domain-specific information)
- Parent process ID (if subprocess)
- Pending process info: description, next action, delay
- Links: UI URL, Slack thread URL

USE WHEN:
- Getting detailed info about a specific DB process
- Investigating DB process failures or issues
- Understanding DB process execution flow and status trail
- Finding links to UI and Slack for further investigation
- Drilling into a process found via list_db_processes
- When a user provides a UUID that might be a DB process ID (e.g., pasted from Slack or a UI link)

RELATED TOOLS:
- list_db_processes: List all recent DB processes on a cluster or artifact
- list_db_schema_changes: List recent DDL schema changes
- **Definition:**
- `processId` (string, required): Process ID (GUID format)
- **Descriptor:** `user-production-master/tools/db-core__get_db_process.json`

### 7. `db-core__get_logical_cluster`

- **Description:** Get Logical Cluster - Retrieves MySQL logical cluster details by name.

Logical clusters are high-level groupings of physical MySQL clusters (MySQL only).

PARAMETERS:
- logicalClusterName (string, required, 1-40 chars): Logical cluster name

RETURNS:
- Logical cluster ID and name
- Physical shards composing the cluster (names, geo regions)
- ProxySQL clusters (main, CDC, BI, dev, quix)
- Privacy level, segment, pre-production flag
- Allowed ownership tags, binding block status

USE WHEN:
- Understanding physical infrastructure behind a logical MySQL cluster
- Finding ProxySQL routing information for database access
- Checking which ownership tags can bind to a cluster
- **Definition:**
- `logicalClusterName` (string, required): Logical cluster name
- **Descriptor:** `user-production-master/tools/db-core__get_logical_cluster.json`

### 8. `db-core__get_replication_lag`

- **Description:** Get Replication Lag - Retrieves replication lag for a physical cluster or host.

PARAMETERS (provide exactly one):
- clusterId (string, optional): Physical cluster ID (GUID format)
- host (object, optional): Host details
  - hostname (string, required): Host name
  - port (number, required, 1025-65535): Port number

RETURNS:
- Replication lag in seconds
- Whether lag is acceptable for remaster cutover

USE WHEN:
- Investigating replication lag incidents
- Before initiating remaster operations
- Monitoring replication health

NOTE: Must provide either clusterId OR host, not both
- **Definition:**
- `clusterId` (string, optional): The physical cluster id (GUID format). Required if host is not provided.
- `host` (object, optional): The host for which we want the lag (hostname and port). Required if clusterId is not provided.
- **Descriptor:** `user-production-master/tools/db-core__get_replication_lag.json`

### 9. `db-core__get_schema_analysis`

- **Description:** Get Schema Analysis - Extracts schema metadata for database tables (metadata only, no row data).

PARAMETERS:
- dbName (string, required, 1-128 chars): Database name to analyze
- clusterName (string, required, 1-128 chars): Logical cluster name
- tableNames (string[], optional): Specific tables to analyze (all tables if omitted)

RETURNS:
- Physical cluster names
- For each table:
  - Table name and DDL (CREATE TABLE statement with indexes, keys, data types)
  - For SDL tables: entity schema with typed fields, annotations (PII, encryption, ID strategies), artifact ownership, and origin
  - For non-SDL tables: JSON column structures with nested keys and types inferred from data sampling

USE WHEN:
- MUST!!! Before writing SQL queries (understand schema, find PRIMARY KEYs)
- Investigating available fields for querying
- Understanding nested JSON column structures - and table columns
- Preparing for execute_sql_query (prerequisite step 3)
- **Definition:**
- `clusterName` (string, required): Cluster name (required)
- `dbName` (string, required): Database name to analyze (e.g., "my_database")
- `tableNames` (array, optional): Table names to analyze (optional)
- **Descriptor:** `user-production-master/tools/db-core__get_schema_analysis.json`

### 10. `db-core__list_bindings`

- **Description:** List Bindings - Retrieves artifact-to-database bindings with optional filters.

A binding connects an artifact (service/application) to a database cluster (MySQL, MongoDB, or Elasticsearch).

PARAMETERS:
- bindingId (string, optional): Unique binding ID (GUID format)
- artifactId (string, optional): Full artifact-id to filter by (starts with 'com.wixpress')
- clusterName (string, optional): Logical cluster (MySQL) or physical cluster (MongoDB/Elasticsearch) name
- databaseName (string, optional): Database name
- databaseTypes (string[], optional, max 5): Filter by types: "mysql", "mongo", "elasticsearch", "proxysql"
- artifactIds (string[], optional, max 20): List of artifact-ids
- clusterNames (string[], optional, max 200): List of cluster names
- excludeFaultyBindings (boolean, optional): Exclude faulty bindings (default: false)
- ownershipTags (string[], optional, max 200): Filter by ownership tags

RETURNS:
- Binding ID, artifact ID, cluster name, database name
- Database type (mysql/mongo/elasticsearch)
- Ownership tag, creation/update timestamps
- SDL service and third-party artifact flags

USE WHEN:
- Finding which databases an artifact is bound to
- Verifying database access before executing queries
- Checking binding configuration and ownership

IDENTIFIERS:
- Database: clusterName + dbType + databaseName (all required)
- Binding: artifactId + clusterName + dbType + databaseName (all required)
- Cluster: clusterName + dbType
- **Definition:**
- `artifactId` (string, optional): Full artifact-id
- `artifactIds` (array, optional): List of full artifact-ids (max 20)
- `bindingId` (string, optional): The unique identifier of the binding (GUID format)
- `clusterName` (string, optional): Logical (mysql) / physical (mongo, elasticsearch) cluster name
- `clusterNames` (array, optional): List of cluster names (max 200)
- `databaseName` (string, optional): Name of the database
- `databaseTypes` (array, optional): Database types: "mysql", "mongo", "elasticsearch", "proxysql" (max 5)
- `excludeFaultyBindings` (boolean, optional): Whether to exclude faulty bindings (default: false)
- `ownershipTags` (array, optional): List of ownership tags to filter by (max 200)
- **Descriptor:** `user-production-master/tools/db-core__list_bindings.json`

### 11. `db-core__list_cluster_tables`

- **Description:** List Cluster Tables - Lists all tables for databases in a logical cluster.

PARAMETERS:
- clusterName (string, required, 1-128 chars): Logical cluster name
- includeSoftDeletedTables (boolean, optional): Include soft-deleted tables
- dbName (string, optional, 1-128 chars): Filter to specific database

RETURNS:
- All databases in the cluster
- Tables per database with: name, row count estimate, size estimate

USE WHEN:
- Discovering databases and tables in a cluster - and their sizes
- Assessing table sizes before running queries (prerequisite step 2 for execute_sql_query)
- Getting overview of table row counts and sizes
- **Definition:**
- `clusterName` (string, required): Cluster name (required)
- `dbName` (string, optional): Name of the database to filter by
- `includeSoftDeletedTables` (boolean, optional): Include soft deleted tables
- **Descriptor:** `user-production-master/tools/db-core__list_cluster_tables.json`

### 12. `db-core__list_cluster_views`

- **Description:** List Cluster Views - Lists all views for databases in a logical cluster.

PARAMETERS:
- clusterName (string, required, 1-128 chars): Logical cluster name
- dbName (string, optional, 1-128 chars): Filter to specific database

RETURNS:
- Views per database with view names

USE WHEN:
- Discovering available views in a cluster
- Getting overview of views across databases
- **Definition:**
- `clusterName` (string, required): Cluster name (required)
- `dbName` (string, optional): Name of the database to filter by
- **Descriptor:** `user-production-master/tools/db-core__list_cluster_views.json`

### 13. `db-core__list_clusters`

- **Description:** List Physical Clusters - Lists physical database clusters with optional filters.

PARAMETERS (all optional):
- dbType (string, 1-128 chars): Database type filter (e.g., "mysql", "mongo")
- segment (string, 1-128 chars): Cluster segment
- allowMoveTraffic (boolean): Filter by traffic move permission
- includeConsulClusters (boolean): Include Consul clusters
- isPreprod (boolean): Filter pre-production clusters
- logicalClusterId (string): Filter by logical cluster ID
- logicalClusterName (string, 1-100 chars): Filter by logical cluster name
- ownershipTag (string, 1-128 chars): Filter by ownership tag
- withEnrichments (boolean): Include instance/binding counts
- privacyLevel (string, 1-128 chars): Filter by privacy level
- dbVersion (string, 1-128 chars): Filter by database version

RETURNS:
- Cluster name, ID, database type and version
- Segment, privacy level, category
- Active DC (writeable), operational status
- Flags: pre-production, stopped, upgrading, deleted, test
- Associated logical clusters, allowed ownership tags
- Creator info, creation date
- Instance and binding counts (if withEnrichments=true)

USE WHEN:
- Discovering available clusters
- Debugging infrastructure-level issues
- Checking cluster configurations and status
- Finding clusters by specific criteria

NOTE: Use filters to narrow results - returns max 10 if >15 found
- **Definition:**
- `allowMoveTraffic` (boolean, optional)
- `dbType` (string, optional)
- `dbVersion` (string, optional)
- `includeConsulClusters` (boolean, optional)
- `isPreprod` (boolean, optional)
- `logicalClusterId` (string, optional)
- `logicalClusterName` (string, optional)
- `ownershipTag` (string, optional)
- `privacyLevel` (string, optional)
- `segment` (string, optional)
- `withEnrichments` (boolean, optional)
- **Descriptor:** `user-production-master/tools/db-core__list_clusters.json`

### 14. `db-core__list_db_processes`

- **Description:** List DB Processes - Lists database background processes (last 30 days) for a cluster or artifact.

These are DB Core background processes such as schema migrations, binding operations, cluster configuration changes, and other database management operations. Use this tool to see what is currently happening or recently happened on your database.

PARAMETERS (provide exactly one):
- clusterName (string, optional, 1-128 chars): Cluster name to list processes for
- artifactId (string, optional, 1-128 chars): Artifact ID to list processes for

RETURNS:
- Process ID, type, high-level state, creation time
- Slack thread URL (if available)
- Process UI URL

USE WHEN:
- Checking what is currently happening on a database or cluster
- Listing active or recent DB operations on a cluster or artifact
- Investigating blocking, locking, or performance issues on a database
- Tracking database background operations (schema changes, bindings, configurations)
- Answering "is something happening right now on my DB?"

RELATED TOOLS:
- get_db_process: Get full details of a specific DB process found here
- list_db_schema_changes: List recent DDL schema changes on a database

NOTE: Must provide either clusterName OR artifactId, not both
- **Definition:**
- `artifactId` (string, optional): Artifact ID (required if clusterName is not provided)
- `clusterName` (string, optional): Cluster name (required if artifactId is not provided)
- **Descriptor:** `user-production-master/tools/db-core__list_db_processes.json`

### 15. `db-core__list_db_schema_changes`

- **Description:** List DB Schema Changes - Lists database schema change history (DDL operations) with optional filters.

These are executed DDL changes on database schemas - part of the database activity that shows what structural changes have been made. Use this to check recent schema modifications on your database.

PARAMETERS (all optional):
- clusterName (string, 1-128 chars): Filter by cluster name
- dbName (string, 1-128 chars): Filter by database name
- artifactId (string, 1-100 chars): Filter by artifact ID
- createdFrom (string): ISO 8601 timestamp for start date (default: 7 days ago)
- createdTo (string): ISO 8601 timestamp for end date
- statuses (enum[], 1-10): Filter by status - "SCHEMA_CHANGE_IN_PROGRESS", "SCHEMA_CHANGE_DONE", "SCHEMA_CHANGE_FAILED", "SCHEMA_CHANGE_DOES_NOT_EXIST"

RETURNS:
- Schema change process IDs
- Artifact, cluster, database info
- Creator details and creation timestamp
- DDL statements executed
- Process status and status page URLs
- Dry run indication

USE WHEN:
- Checking what schema changes are happening or happened recently on a database
- Answering "is something happening right now on my DB?" (for DDL operations)
- Reviewing schema change history
- Tracking DDL operations on a database
- Auditing schema modifications
- Debugging schema change issues

RELATED TOOLS:
- list_db_processes: List all DB background processes (broader view of DB activity)
- get_db_process: Get details of a specific DB process

DEFAULT: Returns changes from last 7 days if createdFrom not specified
- **Definition:**
- `artifactId` (string, optional): Artifact ID
- `clusterName` (string, optional): Cluster name
- `createdFrom` (string, optional): Filter changes created after this ISO 8601 timestamp (e.g., "2024-01-01T00:00:00Z"). Defaults to 7 days ago.
- `createdTo` (string, optional): Filter changes created before this ISO 8601 timestamp (e.g., "2024-12-31T23:59:59Z")
- `dbName` (string, optional): Database name
- `statuses` (array, optional): Filter by statuses: SCHEMA_CHANGE_IN_PROGRESS, SCHEMA_CHANGE_DONE, SCHEMA_CHANGE_FAILED, SCHEMA_CHANGE_DOES_NOT_EXIST
- **Descriptor:** `user-production-master/tools/db-core__list_db_schema_changes.json`

### 16. `db-core__list_instances`

- **Description:** List Instances - Lists database instances for a cluster.

PARAMETERS:
- clusterName (string, required, 1-100 chars): Physical cluster name
- dbType (string, required): Database type (e.g., "mysql", "mongo")
- inMaintenance (boolean, optional): Filter by maintenance status
- writable (boolean, optional): Filter by writable status
- includeMaintenanceProcesses (boolean, optional): Include maintenance process info

RETURNS:
- Instance names and configurations
- Maintenance status, writable status

INSTANCE NAME FORMAT:
db-mysql-petri-reporter2c.42.wixprod.net
- db-mysql- = prefix and dbType identifier
- petri-reporter = physical cluster name
- 2c = instance identifier
- 42 = datacenter
- .wixprod.net = domain

USE WHEN:
- Locating where an artifact's database is hosted
- Debugging instance-level failures or replication issues
- Checking maintenance status
- Finding writable instances in a cluster
- **Definition:**
- `clusterName` (string, required): The name of the cluster to find instances by (required)
- `dbType` (string, required): The db type to find instances by (e.g., "mysql", "mongo")
- `inMaintenance` (boolean, optional): The maintenance status of the instance
- `includeMaintenanceProcesses` (boolean, optional): Whether to include maintenance processes in the response
- `writable` (boolean, optional): The writable status of the instance
- **Descriptor:** `user-production-master/tools/db-core__list_instances.json`

### 17. `db-core__pre_validate_binding`

- **Description:** Pre-Validate Binding - Validates if a binding can be created before actually creating it.

PARAMETERS:
- clusterName (string, required, 1-50 chars): Cluster name to bind to
- artifactId (string, required, 1-100 chars): Artifact ID to bind
- databaseName (string, required, 1-64 chars): Database name to create/use
- databaseType (string, required): Database type (e.g., "mysql", "mongo", "elasticsearch")

RETURNS:
- Success: "Binding validation passed" with artifact, cluster, database details
- Error: detailed reason to why the binding cannot be created

USE WHEN:
- Before creating a binding to ensure it will succeed - if fails show the user the error message and do not proceed.
- Validating permissions and requirements for binding creation
- After get_cluster_recommendation to verify user's cluster choice
- before promoting a database thorugh SDL or no
- **Definition:**
- `artifactId` (string, required): Name of the artifact to bind
- `clusterName` (string, required): Name of the cluster to bind to
- `databaseName` (string, required): Name of the database to create/use in the cluster
- `databaseType` (string, required): Type of the cluster (mysql, mongo, etc.)
- **Descriptor:** `user-production-master/tools/db-core__pre_validate_binding.json`

### 18. `devex__available_rcs`

- **Description:** Get available release candidates (RCs) for a project between two versions.
      
      The input requires:
      - project_name: The project name (e.g., "com.wixpress.dev")
      - from_version: Usually the current GA version (can be obtained from get_project tool)
      - to_version: Usually the current RC version (can be obtained from get_project tool)
      - paging: Optional pagination settings
      
      If from_version or to_version information is not available, the tool will ask the user to provide it.
      The versions don't have to exist as actual releases - they serve as search boundaries.
      Results are sorted by version in descending order.
- **Definition:**
- `from_version` (string, required): Starting version boundary (usually the current GA version)
- `paging` (object, optional): Optional pagination settings
- `project_name` (string, required): Project name in GroupId.ArtifactId format (e.g., "com.wixpress.dev")
- `to_version` (string, required): Ending version boundary (usually the current RC version)
- **Descriptor:** `user-production-master/tools/devex__available_rcs.json`

### 19. `devex__code_owners_for_path`

- **Description:** Returns the code owners for a repository and a path inside that repository according to CODEOWNERS file, including the actual users and slack channels in the ownership tag
- **Definition:**
- `path` (string, required): Path inside the repository, with a trailing slash, used to determine code owners (e.g., "src/main/java/Controller.java/", "packages/frontend/", or "./" for root)
- `repositoryUrl` (string, required): Git repository URL. Must be in SSH format, for example: git@github.com:wix-private/wix-ci.git. If the user specifices only the organization and repository name, you should add the SSH format to the end of the string.
- **Descriptor:** `user-production-master/tools/devex__code_owners_for_path.json`

### 20. `devex__find_commits_by_date_range`

- **Description:** A tool for finding Commits by date range, repository, and branch.
- **Definition:**
- `branch` (string, required): Git branch name
- `from` (string, required): Start date for commit query (ISO 8601 format)
- `paging` (object, optional): Offset-based pagination options
- `repository` (string, required): Git repository URL. Must be in SSH format, for example: git@github.com:wix-private/wix-ci.git. If the user specifices only the organization and repository name, you should add the SSH format to the end of the string.
- `to` (string, required): End date for commit query (ISO 8601 format)
- **Descriptor:** `user-production-master/tools/devex__find_commits_by_date_range.json`

### 21. `devex__fleets_pods_overview`

- **Description:** Get an overview of fleets status for a given service. this includes information about the fleet name, aggregated pod status by dc, last deployment date and served versions. It also provides information about pods, fleet type, served version, host, ip, last deployment date, etc.
- **Definition:**
- `serviceId` (string, required): service id, usually in "groupId.artifactId" format
- **Descriptor:** `user-production-master/tools/devex__fleets_pods_overview.json`

### 22. `devex__get_build`

- **Description:** Retrieve build data by its ID. 
      
      **When to use this tool:**
      - Use this tool ONLY when you are certain the ID is the build service's internal ID (a UUID format)
      - If uncertain about the ID type, ask the user to clarify whether it's an internal build service ID or an external build system ID
      
      **ID Requirements:**
      - The ID must be a valid UUID recognized by the build service
      - This is NOT the external ID from build systems like Bazel/Falcon
      
      **Error Handling:**
      - If this tool returns a 404 error, the user likely provided a Bazel external ID instead
      - FALLBACK: Use get_build_by_external_id tool with buildServerHost: "buildkite.com"
- **Definition:**
- `id` (string, required): The ID of the build to retrieve. It should be a valid UUID recognized by the build service. not the external ID (build system's ID). example: 123e4567-e89b-12d3-a456-426614174000
- **Descriptor:** `user-production-master/tools/devex__get_build.json`

### 23. `devex__get_build_by_external_id`

- **Description:** Retrieve build data by its external ID and build server host.
      If the user doesn't provide information about whether the ID is the build service's ID or an external ID, ask them to provide this information explicitly.
      Run this tool only if you sure that the ID is an external ID.
      Explain the user that the ID needs to be a valid build system's ID, Bazel or Falcon.
- **Definition:**
- `buildServerHost` (string, required): The host name of the build server. example: falcon-new.dev.wixpress.com or buildkite.com
- `externalId` (string, required): The external ID of the build to retrieve (build system's ID). example: 123456789
- **Descriptor:** `user-production-master/tools/devex__get_build_by_external_id.json`

### 24. `devex__get_commit_information`

- **Description:** Get information and data on a specific commit by repository, commit hash, and branch. Make sure you have all the parameters before calling this tool. Do not guess the parameters. Ask the user for the missing parameters if you need them.
- **Definition:**
- `branch` (string, required): Git branch name
- `commitHash` (string, required): Commit hash to retrieve
- `repository` (string, required): Git repository URL. Must be in SSH format, for example: git@github.com:wix-private/wix-ci.git. If the user specifices only the organization and repository name, you should add the SSH format to the end of the string.
- **Descriptor:** `user-production-master/tools/devex__get_commit_information.json`

### 25. `devex__get_devex_fqdn`

- **Description:** Returns entity schemas for FQDNs used in WQL queries (wix.devex.v1.build_data, wix.devex.ci.v1.project_data). Use this tool as a fallback when the docs-remote-schema-mcp server is unavailable. The schemas contain field names, types, enum values, and WQL query patterns needed to construct valid queries.
- **Definition:**
- `fqdn` (string, optional): Optional FQDN to filter results. If not provided, returns all available schemas.
- **Descriptor:** `user-production-master/tools/devex__get_devex_fqdn.json`

### 26. `devex__get_ownership_tag_info`

- **Description:** Get metadata about ownership tags — owners, slack channels, organization, description, etc. Does NOT return projects or services. To find projects owned by a user or tag, use get_project_ownership (it handles email → tag → project resolution automatically). For services, use get_service_ownership.

Two lookup modes:
- By ownershipTagName: get metadata for a specific ownership tag
- By email: find all ownership tags a user belongs to

Provide ONLY ONE of email or ownershipTagName - never both, and never empty strings.
- **Definition:**
- `email` (string, optional): Email address of the user to find ownership tags for. Do NOT provide if ownershipTagName is provided.
- `ownershipTagName` (string, optional): Name of the ownership tag to get metadata for. Do NOT provide if email is provided.
- **Descriptor:** `user-production-master/tools/devex__get_ownership_tag_info.json`

### 27. `devex__get_project`

- **Description:** A tool for retrieving a specific project (some might call it an artifact) by name
- **Definition:**
- `projectName` (string, required): Project name (GroupId.ArtifactId)
- **Descriptor:** `user-production-master/tools/devex__get_project.json`

### 28. `devex__get_project_ownership`

- **Description:** Find all projects owned by a user (email), by an ownership tag, or look up the ownership tag of a specific project.

USE THIS TOOL when the user asks "what projects does X own" or "find projects for email@wix.com". Do NOT manually chain get_ownership_tag_info + search_projects — this tool handles the full lookup internally.

Three lookup modes:
- By email: find all projects owned by a user (resolves email → ownership tags → projects automatically)
- By ownershipTagName: find all projects owned by an ownership tag
- By projectName: look up which ownership tag owns a specific project

A project ownership tag is used for codebase ownership. This is different from service ownership tags used for rollout.
If the user request is ambiguous about ownership type, ask whether they mean service ownership (rollout) or project ownership (codebase).
For tag metadata only (owners, slack channels, etc.), use get_ownership_tag_info instead.
Provide ONLY ONE of email, ownershipTagName, or projectName - never more than one, and never empty strings.
Supports cursor-based pagination (email/ownershipTagName paths only): pass the cursor from the previous response to get the next page.
- **Definition:**
- `cursor` (string, optional): Cursor for pagination (from previous response.pagingMetadata.cursors.next). Only applies to email/ownershipTagName lookups.
- `email` (string, optional): Email address of the user to find projects for. Do NOT provide if ownershipTagName or projectName is provided.
- `ownershipTagName` (string, optional): Name of the project ownership tag (codebase ownership) to find projects for. This is different from service ownership tags used for rollout. Do NOT provide if email or projectName is provided.
- `projectName` (string, optional): Project name (GroupId.ArtifactId, e.g. com.wixpress.my-project) to look up ownership for. Do NOT provide if email or ownershipTagName is provided.
- **Descriptor:** `user-production-master/tools/devex__get_project_ownership.json`

### 29. `devex__get_rollout_history`

- **Description:** Service for retrieving rollout history of a project. Returns a list of rollout history with details like version, status, and timestamp. You can optionally filter by start date, date range, and limit the number of entries returned.
- **Definition:**
- `artifactId` (string, required): Artifact ID
- `endDate` (string, optional): Optional end date to filter history to (format: YYYY-MM-DDThh:mm:ss.sssZ, e.g. 2025-01-01T00:00:00.000Z)
- `groupId` (string, required): Group ID
- `limit` (number, optional): Limit of rollout history to retrieve (optional, defaults to 50)
- `startDate` (string, optional): Optional start date to filter history from (format: YYYY-MM-DDThh:mm:ss.sssZ, e.g. 2025-01-01T00:00:00.000Z)
- **Descriptor:** `user-production-master/tools/devex__get_rollout_history.json`

### 30. `devex__get_service_ownership`

- **Description:** Find all services/artifacts owned by a user (email), by an ownership tag, or look up the ownership tag of a specific service.

USE THIS TOOL when the user asks "what services does X own" or "find services for email@wix.com". Do NOT manually chain get_ownership_tag_info — this tool handles the full email → tag → services lookup internally.

Three lookup modes:
- By email: find all services owned by a user (resolves email → ownership tags → services automatically)
- By ownershipTagName: find all services owned by an ownership tag
- By serviceName: look up which ownership tag owns a specific service

A service ownership tag is used for rollout and service-related actions. This is different from project ownership tags used for codebase ownership.
If the user request is ambiguous about ownership type, ask whether they mean service ownership (rollout) or project ownership (codebase).
For tag metadata only (owners, slack channels, etc.), use get_ownership_tag_info instead.
Provide ONLY ONE of email, ownershipTagName, or serviceName - never more than one, and never empty strings.
- **Definition:**
- `email` (string, optional): Email address of the user to find ownership tags for. Do NOT provide if ownershipTagName or serviceName is provided.
- `ownershipTagName` (string, optional): Name of the service ownership tag (used for rollout and service-related actions) to retrieve. This is different from project ownership tags used for codebase ownership. Do NOT provide if email or serviceName is provided.
- `serviceName` (string, optional): Service/artifact name (e.g. com.wixpress.my-service) to look up ownership for. Do NOT provide if email or ownershipTagName is provided.
- **Descriptor:** `user-production-master/tools/devex__get_service_ownership.json`

### 31. `devex__project_quality_service_get_scores`

- **Description:** Service for retrieving project quality scores and metrics including security, performance and other categories
- **Definition:**
- `projectName` (string, required): Project name in <groupId>.<artifactId> format
- **Descriptor:** `user-production-master/tools/devex__project_quality_service_get_scores.json`

### 32. `devex__release_notes`

- **Description:** Get release notes for a project between a range of versions.
      
      CRITICAL EFFICIENCY REQUIREMENT:
      ALWAYS use a SINGLE call for version ranges. DO NOT make multiple calls for consecutive versions.
      
      CORRECT: One call from "1.100.0" to "1.105.0" to get all changes in that range
      WRONG: Multiple calls like 1.100.0→1.101.0, then 1.101.0→1.102.0, etc.
      
      This tool returns the changeset/release notes containing all changes made between the specified versions.
      The versions should be valid release versions for the specified project.
- **Definition:**
- `from_version` (string, required): Starting version to get changes from
- `project_name` (string, required): Project name in GroupId.ArtifactId format (e.g., "com.wixpress.dev")
- `to_version` (string, required): Ending version to get changes to
- **Descriptor:** `user-production-master/tools/devex__release_notes.json`

### 33. `devex__search_builds`

- **Description:** This tool provides information on Builds. It holds the build result, the build system, commit hash, branch, repository, pull request number, dates when the build start/ended and others If the users asks for their own builds, use the authorDetails.wix_username field to filter the builds. The value should be the username (e.g. john and not john@wix.com) API for querying wix.devex.v1.build_data using WQL (Wix Query Language).
    
    MANDATORY STEPS BEFORE USING THIS TOOL:
    1. ALWAYS retrieve the schema details for FQDN wix.devex.v1.build_data to determine the exact field names and allowed enum values:
       - FIRST, try using the docs-remote-schema-mcp server's fqdn_info tool to get the schema.
       - If docs-remote-schema-mcp is unavailable or returns an error, use the get_devex_fqdn tool from this MCP server as a fallback (pass fqdn: "wix.devex.v1.build_data").
       Use only the field names and enum values from the retrieved schema. Do NOT guess or use assumed names.
    2. Construct and execute the query using the exact field names and values from the schema.
    3. If you encounter WQL errors or are unsure about the syntax, use the search_docs tool (if available) to search for "WQL - Wix Query Language" documentation.
    
      IMPORTANT:
    - ALWAYS convert all proto field names to camelCase when building the query. For example, "commit_hash" → "commitHash", "author_details.wix_username" → "authorDetails.wixUsername".
    - NEVER use snake_case or proto field names in the query object. If you do, the query will fail.
    - Enum values must be written in UPPER_SNAKE_CASE.
    - You MUST respect the comments in the proto file for the fields, and match their format if in use in the query.
    - Before building any query, double-check that all field names are in camelCase, not proto or snake_case.
    - The query should follow the Wix API Query Language structure with filter, sort, and cursor_paging sections.
    
    The query should follow the Wix API Query Language structure with filter, sort, and cursor_paging sections.
    
    IMPORTANT PAGINATION NOTE: 
    - When using the cursor_paging.cursor parameter to fetch the next page, both the filter and sort params MUST be omitted (empty) in the query object. Only the cursor_paging section should be present when cursor is used.
    - NEVER modify the cursor - always send the cursor from the previous response.
- **Definition:**
- `search` (object, required)
- **Descriptor:** `user-production-master/tools/devex__search_builds.json`

### 34. `devex__search_projects`

- **Description:** This tool provides information on Project which holds the project name, ownership tag, the framework, the repository and others. For finding projects by owner email or ownership tag, use get_project_ownership instead. API for querying wix.devex.ci.v1.project_data using WQL (Wix Query Language).
    
    MANDATORY STEPS BEFORE USING THIS TOOL:
    1. ALWAYS retrieve the schema details for FQDN wix.devex.ci.v1.project_data to determine the exact field names and allowed enum values:
       - FIRST, try using the docs-remote-schema-mcp server's fqdn_info tool to get the schema.
       - If docs-remote-schema-mcp is unavailable or returns an error, use the get_devex_fqdn tool from this MCP server as a fallback (pass fqdn: "wix.devex.ci.v1.project_data").
       Use only the field names and enum values from the retrieved schema. Do NOT guess or use assumed names.
    2. Construct and execute the query using the exact field names and values from the schema.
    3. If you encounter WQL errors or are unsure about the syntax, use the search_docs tool (if available) to search for "WQL - Wix Query Language" documentation.
    
      IMPORTANT:
    - ALWAYS convert all proto field names to camelCase when building the query. For example, "commit_hash" → "commitHash", "author_details.wix_username" → "authorDetails.wixUsername".
    - NEVER use snake_case or proto field names in the query object. If you do, the query will fail.
    - Enum values must be written in UPPER_SNAKE_CASE.
    - You MUST respect the comments in the proto file for the fields, and match their format if in use in the query.
    - Before building any query, double-check that all field names are in camelCase, not proto or snake_case.
    - The query should follow the Wix API Query Language structure with filter, sort, and cursor_paging sections.
    
    The query should follow the Wix API Query Language structure with filter, sort, and cursor_paging sections.
    
    IMPORTANT PAGINATION NOTE: 
    - When using the cursor_paging.cursor parameter to fetch the next page, both the filter and sort params MUST be omitted (empty) in the query object. Only the cursor_paging section should be present when cursor is used.
    - NEVER modify the cursor - always send the cursor from the previous response.
- **Definition:**
- `search` (object, required)
- **Descriptor:** `user-production-master/tools/devex__search_projects.json`

### 35. `devex__search_releases`

- **Description:** This tool provides information on Releases (aka RCs/Release Candidates and deploy previews) including version, release type/status, commit hash, dates, and related project details. IMPORTANT: By default, ALWAYS filter by type = "RC" unless the user explicitly asks for other types. PREVIEW releases are filtered out by default - inform the user they can explicitly request type = "PREVIEW" or remove the type filter if they want to see preview releases. If the user wants to find releases by build, filter by build_id. If the user wants to find a release by commit, filter by commit_hash, then use get_commit_information to return the commit entity. API for querying wix.devex.ci.v1.release_data using WQL (Wix Query Language).
    
    MANDATORY STEPS BEFORE USING THIS TOOL:
    1. ALWAYS retrieve the schema details for FQDN wix.devex.ci.v1.release_data to determine the exact field names and allowed enum values:
       - FIRST, try using the docs-remote-schema-mcp server's fqdn_info tool to get the schema.
       - If docs-remote-schema-mcp is unavailable or returns an error, use the get_devex_fqdn tool from this MCP server as a fallback (pass fqdn: "wix.devex.ci.v1.release_data").
       Use only the field names and enum values from the retrieved schema. Do NOT guess or use assumed names.
    2. Construct and execute the query using the exact field names and values from the schema.
    3. If you encounter WQL errors or are unsure about the syntax, use the search_docs tool (if available) to search for "WQL - Wix Query Language" documentation.
    
      IMPORTANT:
    - ALWAYS convert all proto field names to camelCase when building the query. For example, "commit_hash" → "commitHash", "author_details.wix_username" → "authorDetails.wixUsername".
    - NEVER use snake_case or proto field names in the query object. If you do, the query will fail.
    - Enum values must be written in UPPER_SNAKE_CASE.
    - You MUST respect the comments in the proto file for the fields, and match their format if in use in the query.
    - Before building any query, double-check that all field names are in camelCase, not proto or snake_case.
    - The query should follow the Wix API Query Language structure with filter, sort, and cursor_paging sections.
    
    The query should follow the Wix API Query Language structure with filter, sort, and cursor_paging sections.
    
    IMPORTANT PAGINATION NOTE: 
    - When using the cursor_paging.cursor parameter to fetch the next page, both the filter and sort params MUST be omitted (empty) in the query object. Only the cursor_paging section should be present when cursor is used.
    - NEVER modify the cursor - always send the cursor from the previous response.
- **Definition:**
- `search` (object, required)
- **Descriptor:** `user-production-master/tools/devex__search_releases.json`

### 36. `devex__where_is_my_commit`

- **Description:** Returns the RC that contains this commit. It returns the RC that contains this commit.
      
      IMPORTANT: Do not guess any parameter values. If any required parameters (project_name, commit_hash, repo_url) are missing or unclear, explicitly ask the user to provide them before proceeding with the tool call.
- **Definition:**
- `commit_hash` (string, required): Commit hash to find in RCs
- `project_name` (string, required): Project name in GroupId.ArtifactId format (e.g., "com.wixpress.dev")
- `repo_url` (string, required): Git repository URL. Must be in SSH format, for example: git@github.com:wix-private/wix-ci.git. If the user specifices only the organization and repository name, you should add the SSH format to the end of the string.
- **Descriptor:** `user-production-master/tools/devex__where_is_my_commit.json`

### 37. `devex__why_pr_build_failed_exp`

- **Description:** ⚠️ **EXPERIMENTAL:** This tool is under active development and subject to change.
      
      Analyze pull request (PR) or branch build failures in CI environment and get AI-powered root cause analysis and fix suggestions.
      
      **Common Questions This Tool Answers:**
      - "Why did my PR build fail?"
      - "What caused the build failure in CI?"
      - "How to fix my failing build in CI?"
      - "Why is my CI failing?"
      - "Build error analysis in CI"
      - "CI/CD troubleshooting"
      
      **Smart Context Detection:**
      When working in a git repository, extract information from your environment:
      - Repository name: from git remote (e.g., 'wix-private/devex-playground' → use 'devex-playground')
      - Branch name: from current git branch ('git branch --show-current')
      - GitHub PR URL: can be decomposed (e.g., 'https://github.com/wix-private/wix-ci/pull/123' → repoName='wix-ci', prNumber=123)
      
      **Parameters:**
      - repoName (required): Repository name, either short form (e.g., "wix-ci") or full with organization (e.g., "wix-private/wix-ci")
      - prNumber: Pull request number (provide either prNumber OR branchName)
      - branchName: Branch name (provide either prNumber OR branchName)
      
      **Usage Examples:**
      - "Why did my PR build fail?" → analyze current PR build issues
      - "Analyze PR 123 for repo X" → use specified repo and PR number
      - "What's wrong with my CI build?" → analyze current branch build failures
      - "Check build issues on feature branch" → specify branch name
      - "Troubleshoot failing build" → get root cause analysis
- **Definition:**
- `branchName` (string, optional): Branch name. Provide either prNumber or branchName.
- `prNumber` (number, optional): Pull request number. Provide either prNumber or branchName.
- `repoName` (string, required): Repository name. Can be short form (e.g., "wix-ci", "devex-playground") or full with organization (e.g., "wix-private/wix-ci")
- **Descriptor:** `user-production-master/tools/devex__why_pr_build_failed_exp.json`

### 38. `docs-schema__client_lib`

- **Description:** Finds the appropriate client library package name for interacting with a Wix business entity by a given FQDN. Returns the SDK package name for platformized services, falling back to ambassador package for legacy services. Essential for determining correct import paths when making API calls.
- **Definition:**
- `fqdn` (string, required): The Fully Qualified Domain Name to lookup
- **Descriptor:** `user-production-master/tools/docs-schema__client_lib.json`

### 39. `docs-schema__fqdn_info`

- **Description:** Extracts comprehensive API information for a Wix business entity identified by its FQDN (Fully Qualified Domain Name). FQDNs follow the pattern: "wix.<domain?>.<product>.<version>.<resource>". Supports wildcard asterisks in version segment to extract schemas for multiple versions. Returns detailed entity information including actions (with HTTP mappings, permissions, request/response schemas), events, ownership details, and metadata.
- **Definition:**
- `fqdn` (string, required): The Fully Qualified Domain Name to extract info from
- **Descriptor:** `user-production-master/tools/docs-schema__fqdn_info.json`

### 40. `docs-schema__fqdn_lookup`

- **Description:** Searches for Wix business entities by keywords across FQDN components (domain, product, resource). Enables discovery of relevant APIs and services when exact FQDN is unknown. Returns matching FQDNs only.
- **Definition:**
- `keywords` (array, required): Array of keywords to search for in FQDN names
- **Descriptor:** `user-production-master/tools/docs-schema__fqdn_lookup.json`

### 41. `docs-schema__fqdn_schema`

- **Description:** Each business-entity with an FQDN has actions request and response schemas, event schemas, and nested members schemas. This tool extracts the schema details for a given FQDN and a schema-name that is part of the entity API info. Each schema has members that are the fields of the subject schema. members also have schemas, and those member schemas can be queried as well.
- **Definition:**
- `fqdn` (string, required): The Fully Qualified Domain Name to extract schema from. no wildcards or asterisks allowed.
- `schemaNames` (array, required): The names of the schemas to extract
- **Descriptor:** `user-production-master/tools/docs-schema__fqdn_schema.json`

### 42. `docs-schema__fqdn_service`

- **Description:** Each business-entity with an FQDN has actions and events. Each action or event belongs to a service. This tool extracts detailed service information for a given FQDN and service names, including ownership details, server mappings, artifact IDs, and team contact information.
- **Definition:**
- `fqdn` (string, required): The Fully Qualified Domain Name to extract service from. no wildcards or asterisks allowed.
- `serviceNames` (array, required): The names of the services to extract
- **Descriptor:** `user-production-master/tools/docs-schema__fqdn_service.json`

### 43. `docs-schema__search_docs`

- **Description:** Search for Wix documentation resources. 

IMPORTANT USAGE GUIDELINES:
- At least ONE of the following must be provided: query, portalId, or resourceId
- Do NOT call this tool without providing at least one search parameter
- If searching by text, use the 'query' parameter (max 256 characters)
- If searching within a specific portal, use 'portalId' (must be a valid GUID)
- If searching for a specific resource, use 'resourceId' (must be a valid GUID)
- Multiple parameters can be combined to narrow down results

The tool returns a list of matching documentation resources with their metadata.
- **Definition:**
- `filterBy` (object, optional): Additional filters as a key-value object. Structure depends on the search context.
- `limit` (integer, optional): Maximum number of results to return (default: 10). This limits the response size for better performance.
- `portalId` (string, optional): Portal ID (GUID format) to search within a specific portal. Example: "550e8400-e29b-41d4-a716-446655440000"
- `query` (string, optional): Search query text to find relevant documentation. Maximum 256 characters. Use this to search by keywords or phrases.
- `resourceId` (string, optional): Resource ID (GUID format) to search for a specific resource. Example: "550e8400-e29b-41d4-a716-446655440000"
- **Descriptor:** `user-production-master/tools/docs-schema__search_docs.json`

### 44. `fire-console__find_site`

- **Description:** Search for Wix sites (metasites) by name, URL, or ID.

Finds Wix sites matching the search query for a specific user.

Parameters:
- query: Search term (site name, URL, or partial metasite ID)
- userId: User ID to search sites for (required)
- accountId: Account ID (required, usually same as userId)

Returns for each match:
- Meta Site ID
- Site name
- Site URL
- Owner user ID

When to Use:
- To find a site's metasite ID for context
- To look up site details for debugging
- To find sites owned by a specific user

Note: Use find_user first to get the userId if you only have an email.
- **Definition:**
- `accountId` (string, required): Account ID (required, usually same as userId — use find_user to get this)
- `query` (string, required): Search query (site name, URL, or metasite ID)
- `userId` (string, required): User ID to search sites for (use find_user to get this from an email)
- **Descriptor:** `user-production-master/tools/fire-console__find_site.json`

### 45. `fire-console__find_user`

- **Description:** Search for users by email, name, or user ID.

Finds Wix users matching the search query.

Parameters:
- query: Search term (email, name, or partial user ID)

Returns for each match:
- User ID (GUID)
- Email address
- Name
- Account ID

When to Use:
- To find a user's ID for impersonation
- To look up user details for debugging
- To find the user ID from an email address
- **Definition:**
- `query` (string, required): Search query (email, name, or user ID)
- **Descriptor:** `user-production-master/tools/fire-console__find_user.json`

### 46. `fire-console__generate_server_signature`

- **Description:** Generate a server signature for an application.

Creates a signed instance token that can be used for server-to-server authentication.

Parameters:
- appDefId: The app definition ID to generate a signature for
- metaSiteId: Optional site context
- userId: Optional user context

Returns:
- Signed server signature
- Instance token (if applicable)

When to Use:
- To generate tokens for server-side API testing
- To authenticate as an app for RPC calls
- To debug server-to-server communication
- **Definition:**
- `appDefId` (string, required): App definition ID to generate signature for
- `metaSiteId` (string, optional): Optional meta site ID for site context
- `userId` (string, optional): Optional user ID for user context
- **Descriptor:** `user-production-master/tools/fire-console__generate_server_signature.json`

### 47. `fire-console__get_artifact_info`

- **Description:** Get ownership information about a specific artifact.

Returns artifact metadata including:
- Ownership tag (the team that owns the artifact)
- Main Slack channel for the team

When to Use:
- To find who owns a specific artifact
- To find the Slack channel to contact the team
- To understand artifact ownership before debugging
- **Definition:**
- `artifactId` (string, required): The artifact ID to get information for (e.g., "com.wixpress.my-service")
- **Descriptor:** `user-production-master/tools/fire-console__get_artifact_info.json`

### 48. `fire-console__get_cli_command`

- **Description:** Get the equivalent CLI command for an RPC call.

Generates a command-line invocation (grpcurl or similar) that can be used outside Fire Console.

Parameters:
- target: Same targeting options as invoke_rpc
- service: Service name
- method: Method name
- payload: Request payload
- aspects: Key-value pairs for aspects
- headers: Custom headers as key-value pairs
- experiments: Petri experiment overrides
- identities: Array of identity objects for impersonation

Returns:
- A shell command that can be executed to make the same RPC call

When to Use:
- To get a reproducible command for documentation
- To share RPC calls with teammates
- To use in scripts or automation
- To debug calls outside the Fire Console UI
- **Definition:**
- `aspects` (object, optional): Aspects as key-value pairs (e.g., {"user-id": "123", "meta-site-id": "456"})
- `experiments` (object, optional): Petri experiment overrides (e.g., {"specs.mySpec": "true"})
- `headers` (object, optional): Custom headers as key-value pairs
- `identities` (array, optional): Array of identity objects for impersonation
- `method` (string, required): Method name
- `payload` (object, optional): Request payload as JSON object
- `service` (string, required): Full service name
- `target` (object, required): RPC target - specify artifactId OR host+port
- **Descriptor:** `user-production-master/tools/fire-console__get_cli_command.json`

### 49. `fire-console__get_client_spec_map`

- **Description:** Get the public client spec map for a site.

Retrieves the client specification map used by Wix applications on a site.

Parameters:
- metaSiteId: The metasite ID to get specs for
- signedInstance: Optional signed instance for authentication

Returns:
- Map of app definition IDs to client specs
- Instance tokens
- Instance IDs

When to Use:
- To debug client-side application issues
- To understand what apps are installed on a site
- To get instance tokens for app debugging
- **Definition:**
- `metaSiteId` (string, required): Meta site ID to get client specs for
- `signedInstance` (string, optional): Optional signed instance for authentication
- **Descriptor:** `user-production-master/tools/fire-console__get_client_spec_map.json`

### 50. `fire-console__get_editor_client_spec_map`

- **Description:** Get the editor client spec map for a site.

Retrieves the client specification map used by Wix applications in the editor context.

Parameters:
- metaSiteId: The metasite ID to get specs for
- userId: User ID (required — use find_user to get this)
- accountId: Account ID (required, usually same as userId)
- editorSessionId: Optional editor session ID

Returns:
- Map of app definition IDs to client specs
- Editor-specific instance tokens
- Instance IDs

When to Use:
- To debug editor-side application issues
- To understand what apps are available in the editor
- To get editor instance tokens for debugging
- **Definition:**
- `accountId` (string, required): Account ID (required, usually same as userId — use find_user to get this)
- `editorSessionId` (string, optional): Optional editor session ID
- `metaSiteId` (string, required): Meta site ID to get editor client specs for
- `userId` (string, required): User ID (required — use find_user to get this from an email)
- **Descriptor:** `user-production-master/tools/fire-console__get_editor_client_spec_map.json`

### 51. `fire-console__get_instances`

- **Description:** Get running instances for an artifact.

Returns a list of instances (pods/containers) running the artifact.

Parameters:
- artifactId: The artifact to get instances for
- dc: Optional datacenter filter

Returns for each instance:
- IP address
- Pod name
- Datacenter
- Fleet
- Version
- Routing labels

When to Use:
- To find specific instances for targeted testing
- To check instance distribution across datacenters
- To identify instances for debugging
- **Definition:**
- `artifactId` (string, required): Artifact ID to get instances for
- `dc` (string, optional): Filter by datacenter (e.g., "us-east-1", "eu-west-1")
- **Descriptor:** `user-production-master/tools/fire-console__get_instances.json`

### 52. `fire-console__get_method_schema`

- **Description:** Get the schema/metadata for a service method.

Returns the input and output schema for a gRPC/JSON-RPC method as JSON.

Parameters:
- service: Service name
- method: Method name
- artifactId: Target by artifact ID (or use host/port)
- host + port: Target specific instance

Returns JSON with:
- requestType / responseType: Type names
- requestStream / responseStream: Streaming flags
- messageTypes: Full field definitions with names, types, and flags
- enumTypes: Enum type definitions
- queryFields: { filterableFields, searchableFields } extracted from wix.api.crud annotations (if available)
- entityType: Entity type name from wix.api.service_entity annotation (if available)
- classification: { isRead, reason, crudType? } — read-only vs write/mutating (if available).
  A method is read if it has a read CRUD code, or if its name starts with a read prefix (Get/Query/Search/List/Count/Find) and the permission does not explicitly indicate a write operation (CREATE, UPDATE, DELETE, WRITE, MANAGE).

When to Use:
- To understand the request/response structure before invoking
- To see available fields and their types
- To construct valid RPC payloads
- **Definition:**
- `artifactId` (string, optional): Artifact ID to target
- `host` (string, optional): Direct host address (use with port)
- `method` (string, required): Method name
- `port` (number, optional): Port number (use with host)
- `service` (string, required): Service name
- `serviceType` (string, optional): Service type (default: "grpc")
- **Descriptor:** `user-production-master/tools/fire-console__get_method_schema.json`

### 53. `fire-console__invoke_rpc`

- **Description:** Invoke a gRPC or JSON-RPC method on a service.

This is the main tool for calling remote procedures. Supports both gRPC and JSON-RPC protocols.

This tool is always flagged as destructive since it can invoke any RPC method, including those that modify state.
Before invocation, it fetches method annotations to classify whether the method is read-only or write/mutating (best-effort, for logging only).

Target (one required):
- target.artifactId: Route to artifact via production routing
- target.host + target.port: Direct instance targeting
- target.instance: Specific instance identifier

Parameters:
- service: Full service name (FQDN recommended)
- method: Method name to invoke
- payload: Request payload as JSON object
- aspects: Key-value pairs for aspects (e.g., {"user-id": "123", "meta-site-id": "456"})
- headers: Custom headers as key-value pairs
- experiments: Petri experiment overrides (e.g., {"specs.mySpec": "true"})
- identities: Array of identity objects for impersonation:
  - User identity: {type: "user", user: {userId, accountId?}}
  - Public segment: {type: "publicSegment", publicSegment: {metaSiteId, appDefId, siteMemberId?}}
  - Editor segment: {type: "editorSegment", editorSegment: {userId, accountId, metaSiteId, appDefId}}
  - Server signature: {type: "serverSignature", serverSignature: {appDefId, instanceId?, metaSiteId?, targetAccountId?}}
- impersonation: Generate impersonation aspects automatically:
  - userId: User GUID to impersonate
  - accountId: Account ID for context
  When provided, aspects are generated via Fire Console /impersonate and merged into the request aspects.
- timeout: Request timeout in milliseconds
- isJsonRpc: Set to true for JSON-RPC instead of gRPC

Returns:
- success: Whether the call succeeded
- response: The response payload
- duration: Call duration in milliseconds
- metadata: Response headers/trailers

When to Use:
- To test gRPC services
- To test JSON-RPC services
- To invoke methods with specific user context (via aspects, identities, or impersonation)

**Warning**: This tool is flagged as destructive because it can modify state. Use with caution in production.
The tool classifies methods as read or write (best-effort) and logs the classification, but the destructive flag applies to all invocations.
- **Definition:**
- `aspects` (object, optional): Aspects as key-value pairs (e.g., {"user-id": "123", "meta-site-id": "456"})
- `experiments` (object, optional): Petri experiment overrides (e.g., {"specs.mySpec": "true"})
- `headers` (object, optional): Custom headers as key-value pairs
- `identities` (array, optional): Array of identity objects for impersonation
- `impersonation` (object, optional): Auto-generate impersonation aspects (userId, email, metaSiteId, accountId). Merged with explicit aspects.
- `isJsonRpc` (boolean, optional): Set to true for JSON-RPC instead of gRPC
- `method` (string, required): Method name to invoke
- `payload` (object, optional): Request payload as JSON object
- `service` (string, required): Full service name (FQDN recommended, e.g., "com.wixpress.MyService")
- `target` (object, required): RPC target - specify artifactId OR host+port
- `timeout` (number, optional): Request timeout in milliseconds (default: 30000)
- **Descriptor:** `user-production-master/tools/fire-console__invoke_rpc.json`

### 54. `fire-console__list_artifacts`

- **Description:** List all available artifacts in Fire Console.

Returns a list of artifacts (services/applications) that can be targeted for RPC invocation.

Returns information about:
- Name (the artifact identifier, e.g., com.wixpress.example.service)
- Label (human-readable name)
- Type (application or lambda)

When to Use:
- To discover available services for testing
- To find artifact names for RPC invocation
- To explore the service catalog
- **Definition:**
- No structured arguments defined.
- **Descriptor:** `user-production-master/tools/fire-console__list_artifacts.json`

### 55. `fire-console__list_services`

- **Description:** List services available on an artifact or instance.

Returns a list of gRPC/JSON-RPC services with their methods.

Parameters:
- artifactId: Target by artifact ID (production routing)
- host + port: Target a specific instance directly

Returns for each service:
- Service name and FQDN
- Available methods
- Method signatures (input/output types)

When to Use:
- To discover what methods a service exposes
- To find the correct service name for RPC invocation
- To explore API structure before making calls
- **Definition:**
- `artifactId` (string, optional): Artifact ID to list services for
- `host` (string, optional): Direct host address (use with port)
- `port` (number, optional): Port number (use with host)
- **Descriptor:** `user-production-master/tools/fire-console__list_services.json`

### 56. `fire-console__search_services`

- **Description:** Search for artifacts, services, endpoints, or FQDNs.

Performs a fuzzy search across the service catalog.

Parameters:
- query: Search term (artifact name, service name, method name, or FQDN)
- type: Optional filter for result type (artifact, service, endpoint, fqdn)
- limit: Maximum number of results to return

Returns JSON with:
- results: Array of matching artifacts with their services and endpoints
- failedToFetchFrom: Any data sources that failed to respond

When to Use:
- To find services when you don't know the exact artifact ID
- To search by FQDN or partial name
- To discover related services
- **Definition:**
- `limit` (number, optional): Maximum number of results (default: 20)
- `query` (string, required): Search query (artifact name, service name, method name, or FQDN)
- `type` (string, optional): Filter by result type
- **Descriptor:** `user-production-master/tools/fire-console__search_services.json`

### 57. `github__add_issue_comment`

- **Description:** Add a comment to an existing issue
- **Definition:**
- `body` (string, required): Comment body
- `issue_number` (integer, required): Issue number
- `owner` (string, required): Repository owner
- `repo` (string, required): Repository name
- **Descriptor:** `user-production-master/tools/github__add_issue_comment.json`

### 58. `github__compare_branches`

- **Description:** Compare two branches in a GitHub repository
- **Definition:**
- `base` (string, required): Base branch
- `head` (string, required): Head branch
- `owner` (string, required): Repository owner
- `repo` (string, required): Repository name
- **Descriptor:** `user-production-master/tools/github__compare_branches.json`

### 59. `github__create_branch`

- **Description:** Create a new branch in a GitHub repository
- **Definition:**
- `branch` (string, required): New branch name
- `from_branch_sha` (string, required): The SHA1 value for this reference.
- `owner` (string, required): Repository owner
- `repo` (string, required): Repository name
- **Descriptor:** `user-production-master/tools/github__create_branch.json`

### 60. `github__create_issue`

- **Description:** Create a new issue in a GitHub repository
- **Definition:**
- `assignees` (array, optional): Issue assignees (optional)
- `body` (string, optional): Issue body (optional)
- `labels` (array, optional): Issue labels (optional)
- `owner` (string, required): Repository owner
- `repo` (string, required): Repository name
- `title` (string, required): Issue title
- **Descriptor:** `user-production-master/tools/github__create_issue.json`

### 61. `github__create_or_update_file`

- **Description:** Create or update a single file in a GitHub repository
- **Definition:**
- `branch` (string, optional): Branch name (optional)
- `content` (string, required): File content as plain text
- `message` (string, required): Commit message
- `owner` (string, required): Repository owner
- `path` (string, required): File path
- `repo` (string, required): Repository name
- `sha` (string, optional): File SHA if updating (optional)
- **Descriptor:** `user-production-master/tools/github__create_or_update_file.json`

### 62. `github__create_pull_request`

- **Description:** Create a new pull request in a GitHub repository
- **Definition:**
- `base` (string, required): Base branch
- `body` (string, optional): PR description (optional)
- `draft` (boolean, optional): Create as draft PR (optional)
- `head` (string, required): Head branch
- `maintainer_can_modify` (boolean, optional): Allow maintainers to modify (optional)
- `owner` (string, required): Repository owner
- `repo` (string, required): Repository name
- `title` (string, required): PR title
- **Descriptor:** `user-production-master/tools/github__create_pull_request.json`

### 63. `github__create_pull_request_review`

- **Description:** Create a review on a pull request
- **Definition:**
- `body` (string, required): Review comment
- `event` (string, required): Review action (APPROVE, REQUEST_CHANGES, COMMENT)
- `owner` (string, required): Repository owner
- `pull_number` (integer, required): Pull request number
- `repo` (string, required): Repository name
- **Descriptor:** `user-production-master/tools/github__create_pull_request_review.json`

### 64. `github__get_file_contents`

- **Description:** Get the contents of a file or directory from a GitHub repository
- **Definition:**
- `branch` (string, optional): Branch name (optional)
- `owner` (string, required): Repository owner
- `path` (string, required): File or directory path
- `repo` (string, required): Repository name
- **Descriptor:** `user-production-master/tools/github__get_file_contents.json`

### 65. `github__get_issue`

- **Description:** Get details of a specific issue in a GitHub repository
- **Definition:**
- `issue_number` (integer, required): Issue number
- `owner` (string, required): Repository owner
- `repo` (string, required): Repository name
- **Descriptor:** `user-production-master/tools/github__get_issue.json`

### 66. `github__get_pull_request`

- **Description:** Get details of a specific pull request
- **Definition:**
- `owner` (string, required): Repository owner
- `pull_number` (integer, required): Pull request number
- `repo` (string, required): Repository name
- **Descriptor:** `user-production-master/tools/github__get_pull_request.json`

### 67. `github__get_pull_request_comments`

- **Description:** Get the review comments on a pull request
- **Definition:**
- `owner` (string, required): Repository owner
- `pull_number` (integer, required): Pull request number
- `repo` (string, required): Repository name
- **Descriptor:** `user-production-master/tools/github__get_pull_request_comments.json`

### 68. `github__get_pull_request_reviews`

- **Description:** Get the reviews on a pull request
- **Definition:**
- `owner` (string, required): Repository owner
- `pull_number` (integer, required): Pull request number
- `repo` (string, required): Repository name
- **Descriptor:** `user-production-master/tools/github__get_pull_request_reviews.json`

### 69. `github__list_commits`

- **Description:** Get list of commits of a branch in a GitHub repository
- **Definition:**
- `owner` (string, required): Repository owner
- `page` (integer, optional): Page number (optional)
- `perPage` (integer, optional): Results per page (optional)
- `repo` (string, required): Repository name
- `sha` (string, optional): Branch name or commit SHA (optional)
- **Descriptor:** `user-production-master/tools/github__list_commits.json`

### 70. `github__list_issues`

- **Description:** List issues in a GitHub repository with filtering options
- **Definition:**
- `direction` (string, optional): Sort direction (asc, desc)
- `labels` (string, optional): Comma-separated list of label names
- `owner` (string, required): Repository owner
- `repo` (string, required): Repository name
- `sort` (string, optional): Sort field (created, updated, comments)
- `state` (string, optional): Issue state (open, closed, all)
- **Descriptor:** `user-production-master/tools/github__list_issues.json`

### 71. `github__list_pull_requests`

- **Description:** List and filter repository pull requests
- **Definition:**
- `branch` (string, optional): Branch name (optional)
- `direction` (string, optional): Sort direction (asc, desc)
- `owner` (string, required): Repository owner
- `repo` (string, required): Repository name
- `sort` (string, optional): Sort field (created, updated, popularity, long-running)
- `state` (string, optional): Pull request state (open, closed, all)
- **Descriptor:** `user-production-master/tools/github__list_pull_requests.json`

### 72. `github__merge_pull_request`

- **Description:** Merge a pull request
- **Definition:**
- `commit_message` (string, optional): Extra detail to append to automatic commit message (optional)
- `commit_title` (string, optional): Title for the commit message (optional)
- `merge_method` (string, optional): Merge method (merge, squash, rebase)
- `owner` (string, required): Repository owner
- `pull_number` (integer, required): Pull request number
- `repo` (string, required): Repository name
- **Descriptor:** `user-production-master/tools/github__merge_pull_request.json`

### 73. `github__push_files`

- **Description:** Push multiple files to a GitHub repository in a single commit
- **Definition:**
- `branch` (string, required): Branch name
- `files` (array, required): Array of file objects
- `message` (string, required): Commit message
- `owner` (string, required): Repository owner
- `repo` (string, required): Repository name
- **Descriptor:** `user-production-master/tools/github__push_files.json`

### 74. `github__reply-to-pull-request-comment`

- **Description:** Replies to a specific comment on a pull request in a GitHub repository
- **Definition:**
- `body` (string, required): The text of the reply
- `comment_id` (integer, required): The ID of the comment to reply to
- `owner` (string, required): The owner of the repository
- `pull_number` (integer, required): The number of the pull request
- `repo` (string, required): The name of the repository
- **Descriptor:** `user-production-master/tools/github__reply-to-pull-request-comment.json`

### 75. `github__search_code`

- **Description:** Search for code across GitHub repositories
- **Definition:**
- `page` (integer, optional): Page number (optional)
- `perPage` (integer, optional): Results per page (optional)
- `query` (string, required): Search query
- **Descriptor:** `user-production-master/tools/github__search_code.json`

### 76. `github__search_issues`

- **Description:** Search for issues and pull requests across GitHub repositories
- **Definition:**
- `page` (integer, optional): Page number (optional)
- `perPage` (integer, optional): Results per page (optional)
- `query` (string, required): Search query
- **Descriptor:** `user-production-master/tools/github__search_issues.json`

### 77. `github__search_repositories`

- **Description:** Search for GitHub repositories
- **Definition:**
- `page` (integer, optional): Page number (optional)
- `perPage` (integer, required): Results per page (optional)
- `query` (string, required): Search query
- **Descriptor:** `user-production-master/tools/github__search_repositories.json`

### 78. `github__update_issue`

- **Description:** Update an existing issue in a GitHub repository
- **Definition:**
- `assignees` (array, optional): Issue assignees (optional)
- `body` (string, optional): New issue body (optional)
- `issue_number` (integer, required): Issue number
- `labels` (array, optional): Issue labels (optional)
- `owner` (string, required): Repository owner
- `repo` (string, required): Repository name
- `state` (string, optional): Issue state (open, closed)
- `title` (string, optional): New issue title (optional)
- **Descriptor:** `user-production-master/tools/github__update_issue.json`

### 79. `github__update_pull_request_branch`

- **Description:** Update a pull request branch with the latest changes from the base branch
- **Definition:**
- `expected_head_sha` (string, optional): The expected SHA of the pull request head (optional)
- `owner` (string, required): Repository owner
- `pull_number` (integer, required): Pull request number
- `repo` (string, required): Repository name
- **Descriptor:** `user-production-master/tools/github__update_pull_request_branch.json`

### 80. `gradual-feature-release__create-feature-release`

- **Description:** Creates a new gradual feature release for controlled rollout.

PRE-FLIGHT CHECKLIST:
1. Check quota with get-feature-toggle-counter tool for your ownership tag
2. Verify feature toggle ID uniqueness with search-feature-toggles tool
3. Review available strategies with list-strategies tool if using strategyId

REQUIRED FIELDS:
- featureToggleId: camelCase identifier (5-200 chars) used in code
- codeOwnerTag: Team ownership tag
- displayName: Human-readable name (min 5 chars)

STRATEGY CONFIG (one of the following is required):
- strategyType: VISITOR_ID | USER_ID | ACCOUNT_ID | METASITE_ID | RANDOM
- strategyId: Specific strategy ID from list-strategies

OPTIONAL FIELDS:
- description: Feature description (max 500 chars)
- extraNotificationChannels: Additional Slack channels
- scopes: Scope configuration for centralized conduction
- withStartRelease: Start immediately after creation (default: false)
- **Definition:**
- `codeOwnerTag` (string, required): Team ownership tag that owns this feature. Use get-feature-toggle-counter tool first to verify quota availability for the tag.
- `description` (string, optional): Optional description of what this feature does
- `displayName` (string, required): Human-readable name shown in the UI. Example: "New Checkout Flow" or "Dark Mode Support"
- `extraNotificationChannels` (array, optional): Additional Slack channels to receive notifications about this release. Use lowercase with hyphens only.
- `featureToggleId` (string, required): Unique identifier for the feature toggle used in code. Must be camelCase. Examples: newCheckoutFlow, darkModeSupport, enhancedSearchV2
- `scopes` (object, optional): Scope configuration for centralized conduction. Structure: { values: ["scope1", "scope2"] }
- `strategyId` (string, optional): Specific strategy ID to use. Either strategyId OR strategyType must be provided. Use list-strategies tool to see available strategies.
- `strategyType` (string, optional): Determines how the feature is rolled out. Either strategyType OR strategyId must be provided.

STRATEGY SELECTION GUIDE:
Q: Is this for end-users visiting Wix sites (not logged in)?
   → Use VISITOR_ID

Q: Is this for logged-in Wix users where each user should have their own experience?
   → Use USER_ID (also allows "new users first" rollout)

Q: Should all users under the same account see the same thing?
   → Use ACCOUNT_ID

Q: Should the feature be consistent across an entire site/tenant?
   → Use METASITE_ID

Q: Is there no specific user/visitor context (e.g., external API calls)?
   → Use RANDOM

STRATEGY DETAILS:
- VISITOR_ID: Best for site visitor features (e.g., new checkout flow, UI changes). Visitor always gets same experience across sessions.
- USER_ID: Best for logged-in user features (e.g., dashboard updates, editor tools). Supports "expose new users first" for safer rollouts.
- ACCOUNT_ID: Best for account-wide features (e.g., billing changes, plan features). All team members see the same thing.
- METASITE_ID: Best for site-level features (e.g., SEO changes, site-wide widgets). Ensures consistency within a Meta Site.
- RANDOM: Best for features without user context (e.g., external integrations, background jobs). Each call has X% chance of returning true.
- `withStartRelease` (boolean, optional): If true, starts the release immediately after creation. Default: false
- **Descriptor:** `user-production-master/tools/gradual-feature-release__create-feature-release.json`

### 81. `gradual-feature-release__get-feature-toggle`

- **Description:** Retrieves a specific feature toggle by its unique identifier. Returns the complete feature toggle configuration including target groups, filters, and status.
- **Definition:**
- `featureToggleId` (string, required): The unique ID of the feature toggle to retrieve (e.g., "myFeatureToggle")
- **Descriptor:** `user-production-master/tools/gradual-feature-release__get-feature-toggle.json`

### 82. `gradual-feature-release__get-feature-toggle-counter`

- **Description:** Retrieves the quota counter for a specific ownership tag, showing how many active feature toggles exist vs. the allowed limit. Returns default values (limit: 1, value: 0) if counter does not exist.
- **Definition:**
- `ownershipTag` (string, required): The ownership tag to check quota for (e.g., "my-team")
- **Descriptor:** `user-production-master/tools/gradual-feature-release__get-feature-toggle-counter.json`

### 83. `gradual-feature-release__list-releases`

- **Description:** Lists feature releases with optional filtering by feature toggle name. Returns releases with their status, current step information, and completion state. Use the status field to determine if a release is finished (TERMINATED, ROLLDOWN_COMPLETED) or still in progress. Each release includes its associated feature toggle information.
- **Definition:**
- `featureToggleId` (string, optional): Filter by feature toggle ID/name (exact match). This is the feature toggle name/identifier, not a UUID.
- `limit` (number, optional): Maximum number of results to return (1-100, default: 50)
- `offset` (number, optional): Number of results to skip for pagination (default: 0)
- **Descriptor:** `user-production-master/tools/gradual-feature-release__list-releases.json`

### 84. `gradual-feature-release__list-strategies`

- **Description:** List all strategies
- **Definition:**
- No structured arguments defined.
- **Descriptor:** `user-production-master/tools/gradual-feature-release__list-strategies.json`

### 85. `gradual-feature-release__query-feature-toggles`

- **Description:** Query feature toggles with filtering, pagination, and sorting. Provides more control than search-feature-toggles for large result sets.
- **Definition:**
- `displayName` (string, optional): Filter by display name (contains match)
- `id` (string, optional): Filter by feature toggle ID (exact match)
- `limit` (number, optional): Maximum number of results to return (1-100, default: 50)
- `offset` (number, optional): Number of results to skip for pagination (default: 0)
- `ownershipTag` (string, optional): Filter by ownership tag (exact match)
- `sortField` (string, optional): Field to sort by
- `sortOrder` (string, optional): Sort order (ascending or descending)
- `status` (string, optional): Filter by status
- **Descriptor:** `user-production-master/tools/gradual-feature-release__query-feature-toggles.json`

### 86. `gradual-feature-release__search-feature-toggles`

- **Description:** Simple search for feature toggles by text, ownership tag, or status. For pagination and sorting, use query-feature-toggles instead.
- **Definition:**
- `ownershipTag` (string, optional): Filter by ownership tag (exact match)
- `searchText` (string, optional): Text to search in feature toggle ID and display name (partial match)
- `status` (string, optional): Filter by status
- **Descriptor:** `user-production-master/tools/gradual-feature-release__search-feature-toggles.json`

### 87. `grafana-datasource__grafana_query`

- **Description:** Execute universal Grafana queries (SQL for ClickHouse/MySQL or PromQL for Prometheus or LogQL for Loki) against any datasource by name or ID.

**Common Datasources:**
- app-logs - Server application logs (ClickHouse)
- access-logs - HTTP access logs (ClickHouse)
- panorama - Frontend/Astra application logs (ClickHouse)
- bi-events - BI event data (ClickHouse)
- domain-events - Domain event data (ClickHouse)
- Prometheus - Main Prometheus metrics
- Prometheus-aggr - Aggregated Prometheus metrics (longer retention)
- loki - Loki log aggregation

**Query Types:**
- sql: For ClickHouse, MySQL, PostgreSQL (default). MUST include time macro and LIMIT clause (max 100).
- prometheus: For Prometheus datasources (PromQL)
- loki: For Loki datasources (LogQL)
- timestream: For Amazon Timestream datasources. MUST include $__timeFilter(time) and LIMIT clause.

**SQL Time Macros (required for SQL queries):**
- $__timeFilter(column) - Generates: column >= from AND column <= to
- $__fromTime - Replaced with the start timestamp
- $__toTime - Replaced with the end timestamp

**PERFORMANCE TIPS:**
- For app-logs: Use the dedicated query_app_logs tool (artifact_id filter required)
- For access-logs: Use the dedicated query_access_logs tool (nginx_artifact_name filter required)
- For Prometheus: Always use label selectors {job="my-service"}
- For Loki: Use specific app labels, not broad patterns like {job=~".+"}
- Start with narrow time ranges (1 hour), expand only if needed

**Example SQL Query (ClickHouse):**
SELECT timestamp, artifact_id, level, message
FROM app_logs
WHERE $__timeFilter(timestamp) AND artifact_id = 'my-service' AND level = 'ERROR'
ORDER BY timestamp DESC
LIMIT 100

**Example PromQL Query:**
rate(http_requests_total{job="my-service"}[5m])

**Example LogQL Query:**
{app="my-service"} |= "error"

**Example Timestream Query:**
SELECT targetGroupKey, BIN(time, 1h) as time, sum(measure_value::bigint) as measure_value
FROM conductor-reporter.report
WHERE $__timeFilter(time) AND experimentId = 'myToggle' AND measure_name = 'conductor-reporter'
GROUP BY targetGroupKey, BIN(time, 1h)
ORDER BY time DESC
LIMIT 100

Use list_datasources to find available datasources.
- **Definition:**
- `datasource` (string, required): Datasource name (e.g., "app-logs", "Prometheus") or datasource ID as string (e.g., "2319")
- `from` (string, optional): Start time in ISO 8601 format (e.g., "2024-01-15T10:00:00Z"). Defaults to 24 hours ago.
- `limit` (number, optional): Maximum number of results for Loki queries only (default: 100, max: 100). For SQL queries, use LIMIT clause in the query.
- `query` (string, required): SQL query, PromQL expression, or LogQL query to execute
- `queryType` (string, optional): Type of query: "sql" (default) for ClickHouse/MySQL, "prometheus" for PromQL, "loki" for LogQL, "timestream" for Amazon Timestream
- `to` (string, optional): End time in ISO 8601 format (e.g., "2024-01-15T11:00:00Z"). Defaults to now.
- **Descriptor:** `user-production-master/tools/grafana-datasource__grafana_query.json`

### 88. `grafana-datasource__list_datasources`

- **Description:** List all available Grafana datasources with their IDs, names, and types.

Use this tool to discover available datasources before querying. Common datasource types:
- grafana-clickhouse-datasource: ClickHouse databases (app-logs, access-logs, panorama, bi-events)
- prometheus: Prometheus metrics (Prometheus, Prometheus-aggr)
- loki: Loki log aggregation
- mysql: MySQL databases
- elasticsearch: Elasticsearch clusters

You can filter by type using the typeFilter parameter.
- **Definition:**
- `typeFilter` (string, optional): Optional filter to show only datasources of a specific type (e.g., "prometheus", "grafana-clickhouse-datasource", "loki")
- **Descriptor:** `user-production-master/tools/grafana-datasource__list_datasources.json`

### 89. `grafana-datasource__query_access_logs`

- **Description:** Query HTTP access logs from ClickHouse via Grafana. Execute SQL queries against the access-logs datasource.

Table: nginx

IMPORTANT REQUIREMENTS:
- Queries MUST include nginx_artifact_name filter (enforced)
- Queries must include a LIMIT clause (max 100)
- Queries must use a Grafana time macro for time filtering (the fromTime/toTime parameters only work with these macros)
The table has trillions of rows and queries without these will timeout.

TIME MACROS:
- $__timeFilter(column) - Generates: column >= fromTime AND column <= toTime
- $__fromTime - Replaced with the start timestamp
- $__toTime - Replaced with the end timestamp

Key columns: timestamp, nginx_artifact_name, nginx_request_method, nginx_request_uri, http_status_code, request_time, nginx_http_user_agent, nginx_remote_addr.

Example queries:
- SELECT * FROM nginx WHERE $__timeFilter(timestamp) AND nginx_artifact_name = 'com.wixpress.bookings.bookings-service' LIMIT 10
- SELECT http_status_code, count() as cnt FROM nginx WHERE $__timeFilter(timestamp) AND nginx_artifact_name = 'com.wixpress.bookings.bookings-service' GROUP BY http_status_code LIMIT 10
- SELECT * FROM nginx WHERE $__timeFilter(timestamp) AND nginx_artifact_name = 'com.wixpress.bookings.bookings-service' AND http_status_code >= 500 LIMIT 10
- **Definition:**
- `fromTime` (string, required): Start time in ISO 8601 format (e.g., "2024-01-15T10:00:00Z")
- `sql` (string, required): SQL query. Must include: (1) $__timeFilter(timestamp) for time filtering, (2) nginx_artifact_name filter, (3) LIMIT clause (max 100).
- `toTime` (string, required): End time in ISO 8601 format (e.g., "2024-01-15T11:00:00Z")
- **Descriptor:** `user-production-master/tools/grafana-datasource__query_access_logs.json`

### 90. `grafana-datasource__query_app_logs`

- **Description:** Query application logs from Clickhouse via Grafana. Execute SQL queries against the app-logs datasource to search and analyze application logs.

IMPORTANT REQUIREMENTS:
- Queries MUST include artifact_id OR request_id filter (enforced)
- Queries must include a LIMIT clause (max 100)
- Queries must use a Grafana time macro for time filtering (the fromTime/toTime parameters only work with these macros)

The app_logs table has billions of rows. Queries without artifact_id or request_id filter will timeout.

TIME MACROS:
- $__timeFilter(column) - Generates: column >= fromTime AND column <= toTime
- $__fromTime - Replaced with the start timestamp
- $__toTime - Replaced with the end timestamp

Available tables: app_logs (main), app_logs_buffer, artifact_ids, external_api_calls, logs_keys.

KEY COLUMNS (app_logs):
- timestamp, request_id, dc, hostname, artifact_id
- level: DEBUG, INFO, WARN, ERROR
- message: Log message text
- data: JSON column with structured log data (visibility events, etc.)
- stack_trace, error_class, error_code
- caller: Code location or component name (e.g., SDL entity name, grpc-handler)
- meta_site_id, user_agent, response_status

WIX LOG PATTERNS:
- visibility.GenericEvent - Custom visibility logs (parse data column for details)
- visibility.ScalikeVisibilityEvent - SDL operations with SQL and timing
- visibility.ProducedRecord - Domain events published to Kafka
- Experiment Conduction Summary - Feature toggle/experiment conductions

COMMON CALLERS:
- SDL queries: caller contains entity name (e.g., 'bookings', 'schedules')
- gRPC handlers: caller = 'grpc-handler'
- Domain events: message LIKE '%ProducedRecord%'

DATA COLUMN (JSON) - Use ClickHouse JSON functions:
- JSONExtractString(data, 'details') - Extract string fields
- JSONExtractInt(data, 'duration') - Extract numeric fields
- JSONExtractString(data, 'topic') - Kafka topic for domain events

PERFORMANCE TIPS:
- Use narrow time ranges (1 hour or less for exploratory queries)
- Filter by level='ERROR' when debugging issues
- For aggregations, add selective WHERE clauses first

QUERY EXAMPLES:

Basic query:
SELECT * FROM app_logs WHERE $__timeFilter(timestamp) AND artifact_id = 'my-service' LIMIT 10

Request tracing (when artifact is unknown):
SELECT * FROM app_logs WHERE $__timeFilter(timestamp) AND request_id = '1234-5678-abcd' LIMIT 50

Filter by level:
SELECT * FROM app_logs WHERE $__timeFilter(timestamp) AND artifact_id = 'my-service' AND level = 'ERROR' LIMIT 10

Search by message pattern:
SELECT timestamp, level, message, caller, error_class FROM app_logs WHERE $__timeFilter(timestamp) AND artifact_id = 'my-service' AND message LIKE '%timeout%' LIMIT 50

Aggregate errors by class:
SELECT error_class, count() as cnt FROM app_logs WHERE $__timeFilter(timestamp) AND artifact_id = 'my-service' AND level = 'ERROR' GROUP BY error_class ORDER BY cnt DESC LIMIT 20

Log volume by level:
SELECT level, count() as cnt FROM app_logs WHERE $__timeFilter(timestamp) AND artifact_id = 'my-service' GROUP BY level ORDER BY cnt DESC LIMIT 10

SDL operations:
SELECT timestamp, message, caller, JSONExtractString(data, 'sql') as sql FROM app_logs WHERE $__timeFilter(timestamp) AND artifact_id = 'my-service' AND message LIKE '%ScalikeVisibilityEvent%' LIMIT 50

Domain events published:
SELECT timestamp, message, JSONExtractString(data, 'topic') as topic FROM app_logs WHERE $__timeFilter(timestamp) AND artifact_id = 'my-service' AND message LIKE '%ProducedRecord%' LIMIT 50
- **Definition:**
- `fromTime` (string, required): Start time for the query in ISO 8601 format (e.g., "2024-01-15T10:00:00Z")
- `sql` (string, required): SQL query to execute. Must include: (1) artifact_id OR request_id filter (required), (2) a time macro like $__timeFilter(timestamp), (3) LIMIT clause (max 100). Example: SELECT * FROM app_logs WHERE $__timeFilter(timestamp) AND artifact_id = 'my-service' LIMIT 10. For request tracing: SELECT * FROM app_logs WHERE $__timeFilter(timestamp) AND request_id = '1234-5678-abcd' LIMIT 10
- `toTime` (string, required): End time for the query in ISO 8601 format (e.g., "2024-01-15T11:00:00Z")
- **Descriptor:** `user-production-master/tools/grafana-datasource__query_app_logs.json`

### 91. `grafana-datasource__query_bi_events`

- **Description:** Query BI event data from ClickHouse via Grafana. Execute SQL queries against the bi-events datasource.

IMPORTANT REQUIREMENTS:
- Queries must include a LIMIT clause (max 100)
- Queries must use a Grafana time macro for time filtering (the fromTime/toTime parameters only work with these macros)

TIME MACROS:
- $__timeFilter(column) - Generates: column >= fromTime AND column <= toTime
- $__fromTime - Replaced with the start timestamp
- $__toTime - Replaced with the end timestamp

Table: bi_events_raw

Key columns: event_time, src, evid, dimensions (Map), measures (Map).

Example queries:
- SELECT * FROM bi_events_raw WHERE $__timeFilter(event_time) LIMIT 10
- SELECT evid, count() as cnt FROM bi_events_raw WHERE $__timeFilter(event_time) GROUP BY evid ORDER BY cnt DESC LIMIT 20
- SELECT event_time, src, evid FROM bi_events_raw WHERE $__timeFilter(event_time) AND evid = 12 LIMIT 10

Use DESCRIBE bi_events_raw to see the full schema.
- **Definition:**
- `fromTime` (string, required): Start time in ISO 8601 format (e.g., "2024-01-15T10:00:00Z")
- `sql` (string, required): SQL query. Must include: (1) $__timeFilter(event_time) for time filtering, (2) LIMIT clause (max 100).
- `toTime` (string, required): End time in ISO 8601 format (e.g., "2024-01-15T11:00:00Z")
- **Descriptor:** `user-production-master/tools/grafana-datasource__query_bi_events.json`

### 92. `grafana-datasource__query_domain_events`

- **Description:** Query domain event data from ClickHouse via Grafana. Execute SQL queries against the domain-events datasource.

IMPORTANT REQUIREMENTS:
- Queries must include a LIMIT clause (max 100)
- Queries must use a Grafana time macro for time filtering (the fromTime/toTime parameters only work with these macros)

TIME MACROS:
- $__timeFilter(column) - Generates: column >= fromTime AND column <= toTime
- $__fromTime - Replaced with the start timestamp
- $__toTime - Replaced with the end timestamp

Table: domain_events_raw

Key columns: event_time, fqdn, slug, dimensions (Map), measures (Map).

Example queries:
- SELECT * FROM domain_events_raw WHERE $__timeFilter(event_time) AND fqdn LIKE '%order%' LIMIT 10
- SELECT fqdn, count() as cnt FROM domain_events_raw WHERE $__timeFilter(event_time) GROUP BY fqdn ORDER BY cnt DESC LIMIT 20
- SELECT event_time, fqdn, slug FROM domain_events_raw WHERE $__timeFilter(event_time) LIMIT 10

Use DESCRIBE domain_events_raw to see the full schema.
- **Definition:**
- `fromTime` (string, required): Start time in ISO 8601 format (e.g., "2024-01-15T10:00:00Z")
- `sql` (string, required): SQL query. Must include: (1) $__timeFilter(event_time) for time filtering, (2) LIMIT clause (max 100).
- `toTime` (string, required): End time in ISO 8601 format (e.g., "2024-01-15T11:00:00Z")
- **Descriptor:** `user-production-master/tools/grafana-datasource__query_domain_events.json`

### 93. `grafana-datasource__query_loki`

- **Description:** Query logs using LogQL. Execute LogQL queries against the Loki datasource.

IMPORTANT: The limit parameter is required (max 100).

LogQL is similar to PromQL but for logs. It combines label matching with text search.

LogQL Syntax:
- {app="my-service"} - Select logs by label
- {app="my-service"} |= "error" - Contains text
- {app="my-service"} |~ "error|warning" - Regex match
- {app="my-service"} != "debug" - Does not contain
- {app="my-service"} !~ "debug|trace" - Regex exclude
- {app="my-service"} | json - Parse JSON logs
- {app="my-service"} | json | level="error" - Filter parsed JSON
- {app="my-service"} | line_format "{{.message}}" - Format output

Common labels: app, namespace, pod, container, job, instance.

Example queries:
- {app="my-service"} |= "error"
- {namespace="production", app="api"} | json | status >= 500
- {app="my-service"} |~ "exception|error|failed"
- rate({app="my-service"} |= "error" [5m]) - Error rate
- **Definition:**
- `from` (string, optional): Start time in ISO 8601 format. Defaults to 1 hour ago.
- `limit` (number, required): Maximum number of log lines to return (max 100)
- `query` (string, required): LogQL query to execute
- `to` (string, optional): End time in ISO 8601 format. Defaults to now.
- **Descriptor:** `user-production-master/tools/grafana-datasource__query_loki.json`

### 94. `grafana-datasource__query_panorama`

- **Description:** Query frontend/Astra application logs from ClickHouse via Grafana. Execute SQL queries against the panorama datasource.

IMPORTANT REQUIREMENTS:
- Queries must include a LIMIT clause (max 100)
- Queries must use a Grafana time macro for time filtering (the fromTime/toTime parameters only work with these macros)

TIME MACROS:
- $__timeFilter(column) - Generates: column >= fromTime AND column <= toTime
- $__fromTime - Replaced with the start timestamp
- $__toTime - Replaced with the end timestamp

This datasource contains frontend and Astra application logs with a different schema than app-logs.

Key columns: date_created, log_level, full_artifact_id, message, data, user_agent, url, error_message, stack_trace.

Note: Column names differ from app-logs:
- Use date_created instead of timestamp
- Use log_level instead of level
- Use full_artifact_id instead of artifact_id

Example queries:
- SELECT * FROM panorama WHERE $__timeFilter(date_created) AND full_artifact_id LIKE '%my-app%' LIMIT 10
- SELECT log_level, count() as cnt FROM panorama WHERE $__timeFilter(date_created) GROUP BY log_level LIMIT 10
- SELECT * FROM panorama WHERE $__timeFilter(date_created) AND log_level = 'ERROR' LIMIT 10
- **Definition:**
- `fromTime` (string, required): Start time in ISO 8601 format (e.g., "2024-01-15T10:00:00Z")
- `sql` (string, required): SQL query. Must include: (1) $__timeFilter(date_created) for time filtering, (2) LIMIT clause (max 100).
- `toTime` (string, required): End time in ISO 8601 format (e.g., "2024-01-15T11:00:00Z")
- **Descriptor:** `user-production-master/tools/grafana-datasource__query_panorama.json`

### 95. `grafana-datasource__query_prometheus`

- **Description:** Query Prometheus metrics using PromQL. Execute PromQL expressions against the main Prometheus datasource.

This is the primary Prometheus instance with standard retention.

WIX RPC METRICS (primary use case):
- rpc_server_duration_count - Total RPC requests (counter)
- rpc_server_duration_sum - Total request duration
- rpc_server_duration_bucket - Latency histogram buckets

WIX LABELS:
- artifact_id: Service identifier (e.g., "com.wixpress.bookings.bookings-service")
- rpc_method: Endpoint/method name (e.g., "CreateBooking", "Query")
- grpc_status: gRPC status code (OK, INVALID_ARGUMENT, NOT_FOUND, etc.)
- dc: Data center

WIX RPC EXAMPLES:
- rate(rpc_server_duration_count{artifact_id="com.wixpress.bookings.bookings-service"}[5m]) - RPS by endpoint
- sum by (rpc_method) (rate(rpc_server_duration_count{artifact_id="com.wixpress.bookings.bookings-service"}[5m])) - RPS grouped by endpoint
- sum by (rpc_method, grpc_status) (increase(rpc_server_duration_count{artifact_id="com.wixpress.bookings.bookings-service", grpc_status!="OK"}[1h])) - Errors by endpoint
- histogram_quantile(0.95, sum by (rpc_method, le) (rate(rpc_server_duration_bucket{artifact_id="com.wixpress.bookings.bookings-service"}[5m]))) - P95 latency
- rate(rpc_server_duration_count{artifact_id="com.wixpress.bookings.bookings-service", rpc_method=~".*Query.*"}[5m]) - Filter by endpoint name

GENERIC PromQL patterns:
- rate(http_requests_total{job="my-service"}[5m]) - Request rate over 5 minutes
- sum(rate(http_requests_total[5m])) by (status_code) - Request rate by status
- histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) - P95 latency
- up{job="my-service"} - Check if service is up

RESULT FORMAT:
Results include metric labels as fields in each data entry. For example, a query like:
  sum by (rpc_method) (rate(rpc_server_duration_count{artifact_id="..."}[5m]))
Returns entries with Time, Value, and rpc_method fields.

PERFORMANCE TIPS:
- Always use label selectors (e.g., {artifact_id="..."}) to limit data scanned
- Keep time ranges short for high-cardinality metrics (1h for debugging)
- Use query_prometheus_aggr for historical analysis (30+ days)
- Avoid queries without label selectors - they scan all metrics
- **Definition:**
- `expr` (string, required): PromQL expression to execute
- `from` (string, optional): Start time in ISO 8601 format. Defaults to 1 hour ago.
- `to` (string, optional): End time in ISO 8601 format. Defaults to now.
- **Descriptor:** `user-production-master/tools/grafana-datasource__query_prometheus.json`

### 96. `grafana-datasource__query_prometheus_aggr`

- **Description:** Query aggregated Prometheus metrics using PromQL. Execute PromQL expressions against the Prometheus-aggr datasource.

This datasource has LONGER RETENTION but LOWER RESOLUTION than the main Prometheus.
Use this for:
- Historical queries (weeks/months of data)
- Trend analysis
- Capacity planning

Use the main Prometheus (query_prometheus) for:
- Real-time monitoring
- Recent data with full resolution
- Debugging current issues

WIX RPC METRICS:
- rpc_server_duration_count - Total RPC requests (counter)
- rpc_server_duration_sum - Total request duration
- rpc_server_duration_bucket - Latency histogram buckets

WIX LABELS:
- artifact_id: Service identifier (e.g., "com.wixpress.bookings.bookings-service")
- rpc_method: Endpoint/method name (e.g., "CreateBooking", "Query")
- grpc_status: gRPC status code (OK, INVALID_ARGUMENT, NOT_FOUND, etc.)
- dc: Data center

WIX RPC EXAMPLES:
- sum by (rpc_method) (rate(rpc_server_duration_count{artifact_id="com.wixpress.bookings.bookings-service"}[1h])) - RPS by endpoint (historical)
- sum by (rpc_method, grpc_status) (increase(rpc_server_duration_count{artifact_id="com.wixpress.bookings.bookings-service", grpc_status!="OK"}[1d])) - Daily errors

GENERIC PromQL patterns:
- rate(http_requests_total{job="my-service"}[5m])
- sum by (status_code) (rate(http_requests_total[5m]))
- histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

RESULT FORMAT:
Results include metric labels as fields in each data entry. For example, a query like:
  sum by (rpc_method) (rate(rpc_server_duration_count{artifact_id="..."}[5m]))
Returns entries with Time, Value, and rpc_method fields.
- **Definition:**
- `expr` (string, required): PromQL expression to execute
- `from` (string, optional): Start time in ISO 8601 format. Defaults to 24 hours ago.
- `to` (string, optional): End time in ISO 8601 format. Defaults to now.
- **Descriptor:** `user-production-master/tools/grafana-datasource__query_prometheus_aggr.json`

### 97. `grafana-mcp__find_error_pattern_logs`

- **Description:** Searches Loki logs for elevated error patterns compared to the last day's average, waits for the analysis to complete, and returns the results including any patterns found.
- **Definition:**
- `end` (string, optional): End time for the investigation. Defaults to now if not specified.
- `labels` (object, required): Labels to scope the analysis
- `name` (string, required): The name of the investigation
- `start` (string, optional): Start time for the investigation. Defaults to 30 minutes ago if not specified.
- **Descriptor:** `user-production-master/tools/grafana-mcp__find_error_pattern_logs.json`

### 98. `grafana-mcp__find_slow_requests`

- **Description:** Searches relevant Tempo datasources for slow requests, waits for the analysis to complete, and returns the results.
- **Definition:**
- `end` (string, optional): End time for the investigation. Defaults to now if not specified.
- `labels` (object, required): Labels to scope the analysis
- `name` (string, required): The name of the investigation
- `start` (string, optional): Start time for the investigation. Defaults to 30 minutes ago if not specified.
- **Descriptor:** `user-production-master/tools/grafana-mcp__find_slow_requests.json`

### 99. `grafana-mcp__get_alert_rule_by_uid`

- **Description:** Retrieves the full configuration and detailed status of a specific Grafana alert rule identified by its unique ID (UID). The response includes fields like title, condition, query data, folder UID, rule group, state settings (no data, error), evaluation interval, annotations, and labels.
- **Definition:**
- `uid` (string, required): The uid of the alert rule
- **Descriptor:** `user-production-master/tools/grafana-mcp__get_alert_rule_by_uid.json`

### 100. `grafana-mcp__get_assertions`

- **Description:** Get assertion summary for a given entity with its type, name, env, site, namespace, and a time range
- **Definition:**
- `endTime` (string, required): The end time in RFC3339 format
- `entityName` (string, optional): The name of the entity to list
- `entityType` (string, optional): The type of the entity to list (e.g. Service, Node, Pod, etc.)
- `env` (string, optional): The env of the entity to list
- `namespace` (string, optional): The namespace of the entity to list
- `site` (string, optional): The site of the entity to list
- `startTime` (string, required): The start time in RFC3339 format
- **Descriptor:** `user-production-master/tools/grafana-mcp__get_assertions.json`

### 101. `grafana-mcp__get_dashboard_by_uid`

- **Description:** Retrieves the complete dashboard, including panels, variables, and settings, for a specific dashboard identified by its UID.
- **Definition:**
- `uid` (string, required): The UID of the dashboard
- **Descriptor:** `user-production-master/tools/grafana-mcp__get_dashboard_by_uid.json`

### 102. `grafana-mcp__get_dashboard_panel_queries`

- **Description:** Get the title, query string, and datasource information for each panel in a dashboard. The datasource is an object with fields `uid` (which may be a concrete UID or a template variable like "$datasource") and `type`. If the datasource UID is a template variable, it won't be usable directly for queries. Returns an array of objects, each representing a panel, with fields: title, query, and datasource (an object with uid and type).
- **Definition:**
- `uid` (string, required): The UID of the dashboard
- **Descriptor:** `user-production-master/tools/grafana-mcp__get_dashboard_panel_queries.json`

### 103. `grafana-mcp__get_datasource_by_name`

- **Description:** Retrieves detailed information about a specific datasource using its name. Returns the full datasource model, including UID, type, URL, access settings, JSON data, and secure JSON field status.
- **Definition:**
- `name` (string, required): The name of the datasource
- **Descriptor:** `user-production-master/tools/grafana-mcp__get_datasource_by_name.json`

### 104. `grafana-mcp__get_datasource_by_uid`

- **Description:** Retrieves detailed information about a specific datasource using its UID. Returns the full datasource model, including name, type, URL, access settings, JSON data, and secure JSON field status.
- **Definition:**
- `uid` (string, required): The uid of the datasource
- **Descriptor:** `user-production-master/tools/grafana-mcp__get_datasource_by_uid.json`

### 105. `grafana-mcp__get_incident`

- **Description:** Get a single incident by ID. Returns the full incident details including title, status, severity, labels, timestamps, and other metadata.
- **Definition:**
- `id` (string, optional): The ID of the incident to retrieve
- **Descriptor:** `user-production-master/tools/grafana-mcp__get_incident.json`

### 106. `grafana-mcp__list_alert_rules`

- **Description:** Lists Grafana alert rules, returning a summary including UID, title, current state (e.g., 'pending', 'firing', 'inactive'), and labels. Supports filtering by labels using selectors and pagination. Example label selector: `[{'name': 'severity', 'type': '=', 'value': 'critical'}]`. Inactive state means the alert state is normal, not firing
- **Definition:**
- `label_selectors` (array, optional): Optionally, a list of matchers to filter alert rules by labels
- `limit` (integer, optional): The maximum number of results to return. Default is 100.
- `page` (integer, optional): The page number to return.
- **Descriptor:** `user-production-master/tools/grafana-mcp__list_alert_rules.json`

### 107. `grafana-mcp__list_contact_points`

- **Description:** Lists Grafana notification contact points, returning a summary including UID, name, and type for each. Supports filtering by name - exact match - and limiting the number of results.
- **Definition:**
- `limit` (integer, optional): The maximum number of results to return. Default is 100.
- `name` (string, optional): Filter contact points by name
- **Descriptor:** `user-production-master/tools/grafana-mcp__list_contact_points.json`

### 108. `grafana-mcp__list_datasources`

- **Description:** List available Grafana datasources. Optionally filter by datasource type (e.g., 'prometheus', 'loki'). Returns a summary list including ID, UID, name, type, and default status.
- **Definition:**
- `type` (string, optional): The type of datasources to search for. For example, 'prometheus', 'loki', 'tempo', etc...
- **Descriptor:** `user-production-master/tools/grafana-mcp__list_datasources.json`

### 109. `grafana-mcp__list_incidents`

- **Description:** List Grafana incidents. Allows filtering by status ('active', 'resolved') and optionally including drill incidents. Returns a preview list with basic details.
- **Definition:**
- `drill` (boolean, optional): Whether to include drill incidents
- `limit` (integer, optional): The maximum number of incidents to return
- `status` (string, optional): The status of the incidents to include. Valid values: 'active', 'resolved'
- **Descriptor:** `user-production-master/tools/grafana-mcp__list_incidents.json`

### 110. `grafana-mcp__list_loki_label_names`

- **Description:** Lists all available label names (keys) found in logs within a specified Loki datasource and time range. Returns a list of unique label strings (e.g., `["app", "env", "pod"]`). If the time range is not provided, it defaults to the last hour.
- **Definition:**
- `datasourceUid` (string, required): The UID of the datasource to query
- `endRfc3339` (string, optional): Optionally, the end time of the query in RFC3339 format (defaults to now)
- `startRfc3339` (string, optional): Optionally, the start time of the query in RFC3339 format (defaults to 1 hour ago)
- **Descriptor:** `user-production-master/tools/grafana-mcp__list_loki_label_names.json`

### 111. `grafana-mcp__list_loki_label_values`

- **Description:** Retrieves all unique values associated with a specific `labelName` within a Loki datasource and time range. Returns a list of string values (e.g., for `labelName="env"`, might return `["prod", "staging", "dev"]`). Useful for discovering filter options. Defaults to the last hour if the time range is omitted.
- **Definition:**
- `datasourceUid` (string, required): The UID of the datasource to query
- `endRfc3339` (string, optional): Optionally, the end time of the query in RFC3339 format (defaults to now)
- `labelName` (string, required): The name of the label to retrieve values for (e.g. 'app', 'env', 'pod')
- `startRfc3339` (string, optional): Optionally, the start time of the query in RFC3339 format (defaults to 1 hour ago)
- **Descriptor:** `user-production-master/tools/grafana-mcp__list_loki_label_values.json`

### 112. `grafana-mcp__list_prometheus_label_names`

- **Description:** List label names in a Prometheus datasource. Allows filtering by series selectors and time range.
- **Definition:**
- `datasourceUid` (string, required): The UID of the datasource to query
- `endRfc3339` (string, optional): Optionally, the end time of the time range to filter the results by
- `limit` (integer, optional): Optionally, the maximum number of results to return
- `matches` (array, optional): Optionally, a list of label matchers to filter the results by
- `startRfc3339` (string, optional): Optionally, the start time of the time range to filter the results by
- **Descriptor:** `user-production-master/tools/grafana-mcp__list_prometheus_label_names.json`

### 113. `grafana-mcp__list_prometheus_label_values`

- **Description:** Get the values for a specific label name in Prometheus. Allows filtering by series selectors and time range.
- **Definition:**
- `datasourceUid` (string, required): The UID of the datasource to query
- `endRfc3339` (string, optional): Optionally, the end time of the query
- `labelName` (string, required): The name of the label to query
- `limit` (integer, optional): Optionally, the maximum number of results to return
- `matches` (array, optional): Optionally, a list of selectors to filter the results by
- `startRfc3339` (string, optional): Optionally, the start time of the query
- **Descriptor:** `user-production-master/tools/grafana-mcp__list_prometheus_label_values.json`

### 114. `grafana-mcp__list_prometheus_metric_metadata`

- **Description:** List Prometheus metric metadata. Returns metadata about metrics currently scraped from targets. Note: This endpoint is experimental.
- **Definition:**
- `datasourceUid` (string, required): The UID of the datasource to query
- `limit` (integer, optional): The maximum number of metrics to return
- `limitPerMetric` (integer, optional): The maximum number of metrics to return per metric
- `metric` (string, optional): The metric to query
- **Descriptor:** `user-production-master/tools/grafana-mcp__list_prometheus_metric_metadata.json`

### 115. `grafana-mcp__list_prometheus_metric_names`

- **Description:** List metric names in a Prometheus datasource. Retrieves all metric names and then filters them locally using the provided regex. Supports pagination.
- **Definition:**
- `datasourceUid` (string, required): The UID of the datasource to query
- `limit` (integer, optional): The maximum number of results to return
- `page` (integer, optional): The page number to return
- `regex` (string, optional): The regex to match against the metric names
- **Descriptor:** `user-production-master/tools/grafana-mcp__list_prometheus_metric_names.json`

### 116. `grafana-mcp__list_sift_investigations`

- **Description:** Retrieves a list of Sift investigations with an optional limit. If no limit is specified, defaults to 10 investigations.
- **Definition:**
- `limit` (integer, optional): Maximum number of investigations to return. Defaults to 10 if not specified.
- **Descriptor:** `user-production-master/tools/grafana-mcp__list_sift_investigations.json`

### 117. `grafana-mcp__query_loki_logs`

- **Description:** Executes a LogQL query against a Loki datasource to retrieve log entries or metric values. Returns a list of results, each containing a timestamp, labels, and either a log line (`line`) or a numeric metric value (`value`). Defaults to the last hour, a limit of 10 entries, and 'backward' direction (newest first). Supports full LogQL syntax for log and metric queries (e.g., `{app="foo"} |= "error"`, `rate({app="bar"}[1m])`). Prefer using `query_loki_stats` first to check stream size and `list_loki_label_names` and `list_loki_label_values` to verify labels exist.
- **Definition:**
- `datasourceUid` (string, required): The UID of the datasource to query
- `direction` (string, optional): Optionally, the direction of the query: 'forward' (oldest first) or 'backward' (newest first, default)
- `endRfc3339` (string, optional): Optionally, the end time of the query in RFC3339 format
- `limit` (integer, optional): Optionally, the maximum number of log lines to return (default: 10, max: 100)
- `logql` (string, required): The LogQL query to execute against Loki. This can be a simple label matcher or a complex query with filters, parsers, and expressions. Supports full LogQL syntax including label matchers, filter operators, pattern expressions, and pipeline operations.
- `startRfc3339` (string, optional): Optionally, the start time of the query in RFC3339 format
- **Descriptor:** `user-production-master/tools/grafana-mcp__query_loki_logs.json`

### 118. `grafana-mcp__query_loki_stats`

- **Description:** Retrieves statistics about log streams matching a given LogQL *selector* within a Loki datasource and time range. Returns an object containing the count of streams, chunks, entries, and total bytes (e.g., `{"streams": 5, "chunks": 50, "entries": 10000, "bytes": 512000}`). The `logql` parameter **must** be a simple label selector (e.g., `{app="nginx", env="prod"}`) and does not support line filters, parsers, or aggregations. Defaults to the last hour if the time range is omitted.
- **Definition:**
- `datasourceUid` (string, required): The UID of the datasource to query
- `endRfc3339` (string, optional): Optionally, the end time of the query in RFC3339 format
- `logql` (string, required): The LogQL matcher expression to execute. This parameter only accepts label matcher expressions and does not support full LogQL queries. Line filters, pattern operations, and metric aggregations are not supported by the stats API endpoint. Only simple label selectors can be used here.
- `startRfc3339` (string, optional): Optionally, the start time of the query in RFC3339 format
- **Descriptor:** `user-production-master/tools/grafana-mcp__query_loki_stats.json`

### 119. `grafana-mcp__query_prometheus`

- **Description:** Query Prometheus using a PromQL expression. Supports both instant queries (at a single point in time) and range queries (over a time range). Time can be specified either in RFC3339 format or as relative time expressions like 'now', 'now-1h', 'now-30m', etc.
- **Definition:**
- `datasourceUid` (string, required): The UID of the datasource to query
- `endTime` (string, optional): The end time. Required if queryType is 'range', ignored if queryType is 'instant' Supported formats are RFC3339 or relative to now (e.g. 'now', 'now-1.5h', 'now-2h45m'). Valid time units are 'ns', 'us' (or 'µs'), 'ms', 's', 'm', 'h', 'd'.
- `expr` (string, required): The PromQL expression to query
- `queryType` (string, optional): The type of query to use. Either 'range' or 'instant'
- `startTime` (string, required): The start time. Supported formats are RFC3339 or relative to now (e.g. 'now', 'now-1.5h', 'now-2h45m'). Valid time units are 'ns', 'us' (or 'µs'), 'ms', 's', 'm', 'h', 'd'.
- `stepSeconds` (integer, optional): The time series step size in seconds. Required if queryType is 'range', ignored if queryType is 'instant'
- **Descriptor:** `user-production-master/tools/grafana-mcp__query_prometheus.json`

### 120. `grafana-mcp__search_dashboards`

- **Description:** Search for Grafana dashboards by a query string. Returns a list of matching dashboards with details like title, UID, folder, tags, and URL.
- **Definition:**
- `query` (string, optional): The query to search for
- **Descriptor:** `user-production-master/tools/grafana-mcp__search_dashboards.json`

### 121. `grafana-mcp__update_dashboard`

- **Description:** Create or update a dashboard
- **Definition:**
- `dashboard` (object, required): The full dashboard JSON
- `folderUid` (string, optional): The UID of the dashboard's folder
- `message` (string, optional): Set a commit message for the version history
- `overwrite` (boolean, optional): Overwrite the dashboard if it exists. Otherwise create one
- `userId` (integer, optional)
- **Descriptor:** `user-production-master/tools/grafana-mcp__update_dashboard.json`

### 122. `jira__bulk-move-issues`

- **Description:** Move multiple issues (up to 1000, including subtasks) to a target project and issue type. This operation sets sensible defaults for field mappings, status transitions, and classification handling. All subtasks will automatically move with their parent issues.
- **Definition:**
- `issueKeys` (array, required): List of issue IDs or keys to move (maximum 1000 issues including subtasks)
- `sendBulkNotification` (boolean, optional): Whether to send bulk notification emails to users about the move. Default is false.
- `targetIssueTypeId` (string, required): ID of the destination issue type
- `targetParentKey` (string, optional): Key or ID of the parent issue (required only when moving to a subtask issue type)
- `targetProjectKey` (string, required): Key or ID of the destination project
- **Descriptor:** `user-production-master/tools/jira__bulk-move-issues.json`

### 123. `jira__comment-on-issue`

- **Description:** Comment on a Jira issue
- **Definition:**
- `comment` (string, required): Comment to add
- `issueKey` (string, required): Key of the issue
- `link` (string, optional): Optional link to include in the comment
- **Descriptor:** `user-production-master/tools/jira__comment-on-issue.json`

### 124. `jira__create-issue`

- **Description:** Create a new Jira issue. Before creating an issue, use the 'Get Create Meta Data' tool with your project key to get:
1. Available issue types and their IDs
2. Required and optional fields for each issue type
3. Custom fields configuration and allowed values

This meta data is essential as different projects and issue types may have different required fields.
- **Definition:**
- `customFields` (object, optional): Custom fields configuration. First call 'Get Create Meta Data' to get available fields and their formats. Common examples:

1. Single-select fields (e.g. Priority, Components):
   customFields: { "customfield_10123": { "id": "10234" } }

2. Multi-select fields (e.g. Labels, Fix Versions):
   customFields: { "customfield_10124": [{ "id": "10234" }, { "id": "10235" }] }

3. Text fields:
   customFields: { "customfield_10125": "text value" }

4. User picker fields:
   customFields: { "customfield_10126": { "accountId": "user123" } }

5. Date fields (format: YYYY-MM-DD):
   customFields: { "customfield_10127": "2024-03-20" }

Note: The customfield IDs and allowed values are specific to your Jira instance.
- `description` (string, optional): Description for the new issue in Markdown format. Supports headings, lists, code blocks, links, etc. Example: "This is a title\n\n```javascript\nconsole.log(123)\n```"
- `issueTypeId` (string, required): ID of the issue type - get this from 'Get Create Meta Data' response
- `projectKey` (string, required): Project key (e.g., "PP")
- `summary` (string, required): Summary/title for the new issue
- **Descriptor:** `user-production-master/tools/jira__create-issue.json`

### 125. `jira__create-release-version`

- **Description:** Create a new release version for a project
- **Definition:**
- `description` (string, optional): Description of the release version
- `isReleased` (boolean, optional): Is the release version released
- `name` (string, required): Name of the release version
- `projectKey` (string, required): Key of the project
- `releaseDate` (string, optional): Release date of the release version
- `startDate` (string, optional): Start date of the release version
- **Descriptor:** `user-production-master/tools/jira__create-release-version.json`

### 126. `jira__create_issue_link`

- **Description:** Create a link between two issues
- **Definition:**
- `inwardIssueKey` (string, required): Key of the inward issue (e.g., blocked issue)
- `linkType` (string, required): Type of link (e.g., 'blocks')
- `outwardIssueKey` (string, required): Key of the outward issue (e.g., blocking issue)
- **Descriptor:** `user-production-master/tools/jira__create_issue_link.json`

### 127. `jira__delete_issue`

- **Description:** Delete a Jira issue or subtask. use this tool if and only if you're explicitly requested to.
- **Definition:**
- `issueKey` (string, required): Key of the issue to delete
- **Descriptor:** `user-production-master/tools/jira__delete_issue.json`

### 128. `jira__get-available-transitions`

- **Description:** Get the list of available workflow transitions for a specific issue. Each transition represents a possible status change (e.g., 'To Do' → 'In Progress', 'In Progress' → 'Done'). Use this before transitioning an issue to find the correct transition ID.
- **Definition:**
- `issueKey` (string, required): Key of the issue (e.g., 'PROJECT-123')
- **Descriptor:** `user-production-master/tools/jira__get-available-transitions.json`

### 129. `jira__get-create-meta-data`

- **Description:** Get the create meta data for a project
- **Definition:**
- `expand` (string, optional): Optional: Expand the response with the given fields. default: 'projects.issuetypes.fields'
- `projectKey` (string, required): Key of the project
- **Descriptor:** `user-production-master/tools/jira__get-create-meta-data.json`

### 130. `jira__get-issue-changelog`

- **Description:** Retrieve the changelog of a specific Jira issue. You can provide startAt and maxResults as optional arguments to paginate through the changelog entries.
- **Definition:**
- `issueKey` (string, required): Key of the issue to retrieve changelog
- `maxResults` (integer, optional): The maximum number of items to return per page (optional)
- `startAt` (integer, optional): The index of the first item to return in a page of results (optional)
- **Descriptor:** `user-production-master/tools/jira__get-issue-changelog.json`

### 131. `jira__get-issues`

- **Description:** Get all issues and subtasks for a project.
jira base url is "https://wix.atlassian.net/"
- **Definition:**
- `fields` (array, optional): Optional array of field names to include in the response. If not provided, default fields will be used. Common fields: key, summary, status, issuetype, priority, reporter, assignee, created, updated, description, comment
- `jql` (string, optional): Optional JQL to filter issues. This overrides the projectKey and the basic fields, if needed add them to the JQL query as project=<projectKey>.
- `maxResults` (number, optional): Optional max results to return. Default is 1.
- `projectKey` (string, required): Project key (e.g., "PP")
- **Descriptor:** `user-production-master/tools/jira__get-issues.json`

### 132. `jira__get_user`

- **Description:** Get a user's account ID by email address
- **Definition:**
- `email` (string, required): User's email address
- **Descriptor:** `user-production-master/tools/jira__get_user.json`

### 133. `jira__list-projects`

- **Description:** List all Jira projects accessible to you
- **Definition:**
- No structured arguments defined.
- **Descriptor:** `user-production-master/tools/jira__list-projects.json`

### 134. `jira__list_fields`

- **Description:** List all available Jira fields
- **Definition:**
- No structured arguments defined.
- **Descriptor:** `user-production-master/tools/jira__list_fields.json`

### 135. `jira__list_issue_types`

- **Description:** List all available issue types
- **Definition:**
- No structured arguments defined.
- **Descriptor:** `user-production-master/tools/jira__list_issue_types.json`

### 136. `jira__list_link_types`

- **Description:** List all available issue link types
- **Definition:**
- No structured arguments defined.
- **Descriptor:** `user-production-master/tools/jira__list_link_types.json`

### 137. `jira__transition-issue`

- **Description:** Move an issue to a different status by executing a workflow transition (e.g., move to 'In Progress', 'Done', 'Archived'). Before using this tool, call 'Get Available Transitions' to find the correct transition ID for the desired status change.
- **Definition:**
- `comment` (string, optional): Optional comment to add when transitioning the issue
- `issueKey` (string, required): Key of the issue to transition (e.g., 'PROJECT-123')
- `transitionId` (string, required): ID of the transition to execute. Get this from 'Get Available Transitions' tool.
- **Descriptor:** `user-production-master/tools/jira__transition-issue.json`

### 138. `jira__update-issue`

- **Description:** Update an existing Jira issue. Before updating an issue with custom fields, use the 'Get Create Meta Data' tool with your project key to understand:
1. Available fields for the issue type
2. Required fields that must be preserved
3. Custom fields format and allowed values

Note: When updating an issue, you only need to provide the fields you want to change. Omitted fields will retain their current values.
- **Definition:**
- `customFields` (object, optional): Custom fields to update. First call 'Get Create Meta Data' to get available fields and their formats. Common examples:

1. Single-select fields (e.g. Priority, Components):
   customFields: { "customfield_10123": { "id": "10234" } }

2. Multi-select fields (e.g. Labels, Fix Versions):
   customFields: { "customfield_10124": [{ "id": "10234" }, { "id": "10235" }] }

3. Text fields:
   customFields: { "customfield_10125": "text value" }

4. User picker fields:
   customFields: { "customfield_10126": { "accountId": "user123" } }

5. Date fields (format: YYYY-MM-DD):
   customFields: { "customfield_10127": "2024-03-20" }

6. Clear/empty a field:
   customFields: { "customfield_10128": null }

Note: The customfield IDs and allowed values are specific to your Jira instance. Only include fields you want to change.
- `description` (string, optional): New description for the issue in Markdown format. Supports headings, lists, code blocks, links, etc. Example: "This is a title\n\n```javascript\nconsole.log(123)\n```"
- `issueKey` (string, required): Key of the issue to update (e.g., 'PROJECT-123')
- `summary` (string, optional): New summary/title for the issue
- **Descriptor:** `user-production-master/tools/jira__update-issue.json`

### 139. `kb-retrieval__get_all_documents_from_kb`

- **Description:** Get all documents from a knowledge base.

  Args:
      knowledge_base_id (str): The ID of the knowledge base
  Returns:
      dict: key is "documents" and value is list of documents with their metadata and relevance scores
- **Definition:**
- `knowledge_base_id` (string, required)
- **Descriptor:** `user-production-master/tools/kb-retrieval__get_all_documents_from_kb.json`

### 140. `kb-retrieval__get_document_from_kb`

- **Description:** Retrieve a specific document by its ID from a knowledge base.

  Args:
      knowledge_base_id (str): The ID of the knowledge base
      doc_id (str): The unique identifier of the document

  Returns:
      dict: key is "document" and value is document data including content, doc_id, title, updated_date and chunked_content
- **Definition:**
- `doc_id` (string, required)
- `knowledge_base_id` (string, required)
- **Descriptor:** `user-production-master/tools/kb-retrieval__get_document_from_kb.json`

### 141. `kb-retrieval__get_knowledge_base_entry_count`

- **Description:** Get the total number of entries in a knowledge base.

  Args:
      knowledge_base_id (str): The ID of the knowledge base
      ownership_tag (list[str]): The ownership tag of the knowledge base (comma separated list of tags)
  Returns:
      dict: key is "entry_count" and value is the total number of entries in the knowledge base as a string
- **Definition:**
- `knowledge_base_id` (string, required)
- **Descriptor:** `user-production-master/tools/kb-retrieval__get_knowledge_base_entry_count.json`

### 142. `kb-retrieval__get_knowledge_base_info`

- **Description:** Get information about a specific knowledge base by its ID.

  Args:
      knowledge_base_id (str): The ID of the knowledge base

  Returns:
      dict:  key is "knowledge_base" and value is knowledge base data including metadata and configuration

      example:
      {
      "id": "0861f884-99d2-4c88-86d1-c4cd9ea001ae",
      "revision": "1",
      "created_date": "2025-03-26T09:45:52.399Z",
      "updated_date": "2025-03-26T09:45:52.399Z",
      "name": "demo",
      "description": "demoing",
      "ownership_tag": "ds-data-engineering-team",
      "embeddings_vendor": "open-ai",
      "embeddings_model": "TEXT_EMBEDDING_ADA_002",
      "chunk_size": "0",
      "chunk_overlap": "50"
      }
- **Definition:**
- `knowledge_base_id` (string, required)
- **Descriptor:** `user-production-master/tools/kb-retrieval__get_knowledge_base_info.json`

### 143. `kb-retrieval__insert_to_knowledge_base`

- **Description:** Insert a document to a knowledge base.

  Args:
      knowledge_base_id (str): The ID of the knowledge base
      doc_id (str): The unique identifier of the document
      doc_title (str): The title of the document
      doc_content (str): The content of the document
      metadata (str, optional): The metadata of the document
- **Definition:**
- `doc_content` (string, required)
- `doc_id` (string, required)
- `doc_title` (string, required)
- `knowledge_base_id` (string, required)
- `metadata` (any, optional)
- **Descriptor:** `user-production-master/tools/kb-retrieval__insert_to_knowledge_base.json`

### 144. `kb-retrieval__list_knowledge_bases`

- **Description:** List all available knowledge bases with optional filtering.

      Args:
      ownership_filter (str): Filter by ownership tag (comma separated list of tags)
      name_filter (str, optional): Filter by name
      Returns:
      dict: key is "knowledge_bases" and value is list of knowledge bases with their metadata and configuration
- **Definition:**
- `name_filter` (any, optional)
- `ownership_filter` (array, required)
- **Descriptor:** `user-production-master/tools/kb-retrieval__list_knowledge_bases.json`

### 145. `kb-retrieval__retrieve_relevant_documents_from_kb`

- **Description:** Search documents in a knowledge base using semantic similarity search


  Args:
      query (str): The search query text (max 10,000 characters)
      knowledge_base_id (str): The ID of the knowledge base to search in
      limit (int): Maximum number of results to return (1-100, default: 10)
      offset (int): Number of results to skip for pagination (default: 0, max: 100)
      min_relevance (float): Minimum relevance score for results (0.0-1.0, default: 0.0)

  Returns:
      dict: key is "documents" and value is list of documents with their metadata and relevance scores

      example:
       [
          {
              "entry": {
              "doc_id": "8",
              "updated_date": "2025-03-26T09:46:56Z",
              "title": "Coq au Vin",
              "content": "A French dish featuring chicken braised slowly in red wine with mushrooms, lardons, and pearl onions, leading to a rich, flavorful stew.",
              "chunked_content": [
                  "A French dish featuring chicken braised slowly in red wine with mushrooms, lardons, and pearl onions, leading to a rich, flavorful stew."
              ]
              },
              "scores_info": {
              "overall_match_score": 0.8174340461667696,
              "semantic_score": 0.8174340461667696,
              "avg_chunk_score": 0.8174340550619063,
              "avg_chunk_similarity": 0.7766597270965576,
              "max_chunk_score": 0.8174340550619063,
              "max_chunk_similarity": 0.7766597270965576,
              "all_chunk_scores": [
                  0.8174340724945068
              ],
              "all_chunk_similarities": [
                  0.7766597270965576
              ]
              }
          }
       ]
- **Definition:**
- `knowledge_base_id` (string, required)
- `limit` (integer, optional)
- `min_relevance` (number, optional)
- `offset` (integer, optional)
- `query` (string, required)
- **Descriptor:** `user-production-master/tools/kb-retrieval__retrieve_relevant_documents_from_kb.json`

### 146. `octocode__githubGetFileContent`

- **Description:** Read file content (patterns, ranges, or full)

**USE**: Need implementation details | Configs | Known file path.
**AVOID**: Unknown location → `githubSearchCode`.

**Workflow**:
1. After `githubSearchCode` → use `matchString` to fetch full context around matches.
2. Know function/class name → use `matchString` (most efficient).
3. Know exact lines → use `startLine` + `endLine`.
4. Small files (<500KB) → `fullContent=true` OK.
5. Large files → always use `matchString` or line ranges.

**Transitions**:
- **SELF**: Widen `matchStringContextLines` | Read related file.
- `githubSearchCode`: Trace imports/usages.
- `githubViewRepoStructure`: Check file context.
- `githubSearchRepositories`: Find usage in other repos.
- `packageSearch`: Check dependencies / imports repo locations.

**Gotchas**:
- Cannot combine `fullContent` with `startLine/endLine/matchString`.
- Prefer `matchString` over `fullContent` (token-efficient).

**Examples**:
`matchString="validateUser", matchStringContextLines=20` (best for functions)
`startLine=1, endLine=100` (known location)
`fullContent=true` (small configs only)

**Context**: Check `.octocode/context/context.md` for user focus.`
- **Definition:**
- `queries` (array, required): Research queries for githubGetFileContent (1-3 queries per call for optimal resource management). Review schema before use for optimal results
- **Descriptor:** `user-production-master/tools/octocode__githubGetFileContent.json`

### 147. `octocode__githubSearchCode`

- **Description:** Search file content or filenames/paths

**USE**: Find code patterns | Locate files | Discovery.
**AVOID**: Broad terms | No owner/repo (rate limits) | Finding package repos (use `packageSearch` first).

**Workflow**: Find File (`match="path"`) → Find Pattern (`match="file"`, `limit=5`) → Read with `githubGetFileContent`.

**Transitions**:
- **SELF**: Refine query | Try semantic variants | Switch `match="path"↔"file"`.
- `githubGetFileContent`: Read full content (copy `text_matches` to `matchString`).
- `githubViewRepoStructure`: Locate file in tree.
- `githubSearchRepositories`: Find repo from code snippet.
- `githubSearchPullRequests`: Find history/blame.
- `packageSearch`: Check imported packages (use FIRST for packages from imports/dependencies).

**Optimization**:
- Start lean: exact term → single query; uncertain → bulk with variants.
- Semantic variants: "auth"→"authorization"/"authenticate", "config"→"settings"/"options".

**Gotchas**:
- `match="file"` without `limit` = token explosion.
- Always set `owner` & `repo` (rate limits).
- Use `extension` filter for precision.

**Examples**:
`match="path", keywordsToSearch=["auth"]` (fast discovery)
`owner="facebook", repo="react", keywordsToSearch=["useState"], match="file", limit=5`
`path="src/api", extension="ts", keywordsToSearch=["export"]`

**Context**: Check `.octocode/context/context.md` for user focus.`
- **Definition:**
- `queries` (array, required): Research queries for githubSearchCode (1-3 queries per call for optimal resource management). Review schema before use for optimal results
- **Descriptor:** `user-production-master/tools/octocode__githubSearchCode.json`

### 148. `octocode__githubSearchPullRequests`

- **Description:** Search or fetch Pull Requests (metadata, diffs, discussions)

**USE**: Implementation history | Review changes | Find rationale.
**AVOID**: Current code → `githubGetFileContent`.

**Workflow**: Find PR → Review Meta (`type="metadata"`) → Check Diffs (`type="fullContent"` if critical).

**Transitions**:
- **SELF**: Refine query | Try semantic variants | Check related PRs | Widen date range.
- `githubSearchRepositories`: Find related repos.
- `githubGetFileContent`: Read current file version.
- `githubSearchCode`: Search changed code.
- `githubViewRepoStructure`: Check modified paths.
- `packageSearch`: Check dependencies.

**Gotchas**:
- `merged=true` requires `state="closed"`.
- `prNumber` ignores all other filters.
- `type="fullContent"` is token-heavy; start with `type="metadata"`.

**Examples**: `prNumber=123` | `state="closed", merged=true` | `query="auth", limit=3`

**Context**: Check `.octocode/context/context.md` for user focus.`
- **Definition:**
- `queries` (array, required): Research queries for githubSearchPullRequests (1-3 queries per call for optimal resource management). Review schema before use for optimal results
- **Descriptor:** `user-production-master/tools/octocode__githubSearchPullRequests.json`

### 149. `octocode__githubSearchRepositories`

- **Description:** Search repos by keywords/topics (ENTRY POINT for discovery)

**USE**: Starting research | Finding repos | Discovering projects.
**AVOID**: Known package → `packageSearch` (use FIRST) | Known repo → `githubViewRepoStructure` | Need code → `githubSearchCode`.

**Workflow**: Discovery → Explore Structure → Search Code.

**Data Freshness**:
| Field     | Meaning                               | Example Trigger                                            |
|-----------|---------------------------------------|------------------------------------------------------------|
| createdAt | When the repository was first created | Initial git init + push to GitHub                          |
| updatedAt | Last metadata/activity update         | Editing description, changing settings, new stars, issues  |
| pushedAt  | Last code push to any branch          | git push (actual code changes)                             |

**Guidance**:
- **Understanding**: To understand orgs/projects, PREFER updated docs (.md) and updated code.
- **Avoid**: Old repositories (>1 year without updates). Check `updated` or `pushed` dates.
- **Ask**: If only old repos are found, ask the user.

**Transitions**:
- **SELF**: Refine query | Try semantic variants | Switch topics↔keywords.
- `githubSearchCode`: Find patterns in found repos.
- `githubViewRepoStructure`: Explore file tree of found repo.
- `githubGetFileContent`: Read README/docs.
- `githubSearchPullRequests`: Check activity/history.
- `packageSearch`: Check packages found in repo.

**Optimization**:
- Start lean: exact topic → `topicsToSearch` + stars; uncertain → bulk topics + keywords.
- Semantic variants: "auth"→"authentication"/"oauth", "ai"→"machine-learning"/"llm".

**Gotchas**:
- Public: Use `stars=">1000"` to filter toy projects.
- Private/Org: Use `keywordsToSearch` + `updated` (topics often missing).
- `topicsToSearch` = curated (public); `keywordsToSearch` = broad search.

**Examples**:
`topicsToSearch=["typescript", "cli"], stars=">1000"` (curated quality)
`keywordsToSearch=["authentication", "jwt"], stars=">500"`
`owner="facebook", sort="stars", limit=10` (org repos)

**Context**: Check `.octocode/context/context.md` for user focus.`
- **Definition:**
- `queries` (array, required): Research queries for githubSearchRepositories (1-3 queries per call for optimal resource management). Review schema before use for optimal results
- **Descriptor:** `user-production-master/tools/octocode__githubSearchRepositories.json`

### 150. `octocode__githubViewRepoStructure`

- **Description:** Display directory structure & file sizes

**USE**: New codebase | Need overview | Discover files | Understand layout.
**AVOID**: Know filename → `githubSearchCode`.

**Workflow**: Map Root (`depth=1`) → Drill Down (`path` + `depth=2`) → Locate Configs.

**Transitions**:
- **SELF**: Drill into subdirectory | Explore sibling paths.
- `githubSearchCode`: Search specific path found.
- `githubGetFileContent`: Read found file (config/readme).
- `githubSearchRepositories`: Switch repo.
- `githubSearchPullRequests`: Check directory history.
- `packageSearch`: Check dependencies in config.

**Optimization**:
- Bulk queries: Explore key directories in parallel (e.g., `[{path:"src"}, {path:"tests"}, {path:"docs"}]`).
- Start with `depth=1`, only go `depth=2` if structure unclear.

**Gotchas**:
- `depth=2` is slow on large dirs (>50 subdirs).
- Path format: `"src"` (no leading slash). Truncates at 100 items.
- Monorepos: Check `packages/` individually.

**Examples**:
`path="", depth=1` (root overview)
`path="src", depth=2` (drill down)
`path="packages/core", depth=1` (monorepo package)

**Context**: Check `.octocode/context/context.md` for user focus.`
- **Definition:**
- `queries` (array, required): Research queries for githubViewRepoStructure (1-3 queries per call for optimal resource management). Review schema before use for optimal results
- **Descriptor:** `user-production-master/tools/octocode__githubViewRepoStructure.json`

### 151. `octocode__packageSearch`

- **Description:** Find NPM/Python packages & their repository URLs (ENTRY POINT)

**USE**: Researching libraries | Finding dependencies (from imports/package.json) | Locating package source.
**AVOID**: Using `githubSearchCode` or `githubSearchRepositories` for package discovery.

**Workflow**: Find Package → Get Repo URL → Explore with GitHub tools.

**Transitions**:
- **SELF**: Compare alternatives | Try semantic variants.
- `githubSearchRepositories`: Go to source repo.
- `githubSearchCode`: Find usage examples.
- `githubViewRepoStructure`: Explore package structure.
- `githubGetFileContent`: Read README/source.
- `githubSearchPullRequests`: Check history/fixes.

**Gotchas**:
- Python: "pillow" vs "PIL" (import vs package name).
- NPM scoped: `@scope/name`.
- Use `searchLimit=1` if name known; `searchLimit=5` for alternatives.
- ALWAYS use this tool first for packages, then fallback to GitHub search tools if not found.

**Examples**: `ecosystem="npm", name="express"` | `ecosystem="python", name="requests"`

**Context**: Check `.octocode/context/context.md` for user focus.`
- **Definition:**
- `queries` (array, required): Research queries for packageSearch (1-3 queries per call for optimal resource management). Review schema before use for optimal results
- **Descriptor:** `user-production-master/tools/octocode__packageSearch.json`

### 152. `root-cause__await_root_cause_analysis`

- **Description:** Polls for root cause analysis results.

Returns one of three statuses:
- `COMPLETED`: Contains markdown report with the analysis findings, plus an `analysisUrl` for sharing
- `FAILED`: Contains the reason why analysis couldn't complete
- `RUNNING`: Analysis still in progress - call again with same `analysisId`

The `analysisUrl` is for sharing with humans (HTML format) - do not fetch it.

IMPORTANT: Keep polling with the same `analysisId`. Do NOT start a new analysis.

TIP: If you have HTTP/terminal access, consider polling the markdown URL directly instead:
https://bo.wix.com/_api/root-cause/v1/analyses/{analysisId}.md
(Returns 202 while running, 200 with content when done)
- **Definition:**
- `analysisId` (string, required): Analysis ID from `start_root_cause_analysis`
- `timeoutSeconds` (number, optional): Polling timeout in seconds. Default: 25 (under 30s edge timeout)
- **Descriptor:** `user-production-master/tools/root-cause__await_root_cause_analysis.json`

### 153. `root-cause__start_root_cause_analysis`

- **Description:** Starts an AI-powered root cause analysis to investigate a production issue.

The analysis fetches and analyzes logs to identify the root cause.
Returns `analysisId` and `pollingUrl` immediately - the analysis runs asynchronously and may take several minutes.

## Polling for Results

### Option A: Direct HTTP Polling (Recommended)
If you have terminal/HTTP access, poll the `pollingUrl` directly:
- Returns `202 Accepted` while in progress
- Returns `200 OK` with markdown content when complete

```bash
# Analysis typically takes 4-5 minutes. Recommend using a 10-minute timeout.
while [ "$(curl -s -o /dev/null -w '%{http_code}' '{pollingUrl}')" = "202" ]; do
  sleep 10
done
curl -s '{pollingUrl}'
```

### Option B: Use `await_root_cause_analysis` Tool
If you cannot make HTTP requests, use `await_root_cause_analysis` with the `analysisId`.
Note: You may need to call it multiple times due to timeout limits.

IMPORTANT: Do NOT call this tool again for the same issue.
- **Definition:**
- `artifactIds` (array, optional): Filter logs to specific artifacts (e.g., com.wixpress.service-name). Omit to search all.
- `fromDate` (string, optional): Start time (ISO 8601). Default: 2 min before request timestamp, or 24h ago if no timestamp
- `hint` (string, optional): Free-text context to guide analysis (e.g., "Focus on authentication failures")
- `requestId` (string, required): The request ID to investigate (timestamp format, e.g., 1743428994.68187642512522647652, or GUID)
- `toDate` (string, optional): End time (ISO 8601). Default: 11 min after request timestamp, or now if no timestamp
- **Descriptor:** `user-production-master/tools/root-cause__start_root_cause_analysis.json`

### 154. `slack__search-messages`

- **Description:** Search across messages using powerful query operators such as channel, author, phrase, and date. Supports scoping queries like in:#channel, from:<@USER>, "exact phrase", after:YYYY-MM-DD, before:YYYY-MM-DD.
- **Definition:**
- `after` (string, optional): Search for messages after this date, format YYYY-MM-DD
- `before` (string, optional): Search for messages before this date, format YYYY-MM-DD
- `exactPhrase` (string, optional): Exact phrase to search for
- `from` (string, optional): User to search messages from, e.g., '<@USER>'
- `in` (string, optional): Channel to search in, e.g., '#general'
- `searchText` (string, optional): Text to search for in messages
- **Descriptor:** `user-production-master/tools/slack__search-messages.json`

### 155. `slack__slack_add_reaction`

- **Description:** Add a reaction emoji to a message
- **Definition:**
- `channel_id` (string, required): The ID of the channel containing the message
- `reaction` (string, required): The name of the emoji reaction (without ::)
- `timestamp` (string, required): The timestamp of the message to react to
- **Descriptor:** `user-production-master/tools/slack__slack_add_reaction.json`

### 156. `slack__slack_find-channel-id`

- **Description:** Find the channel id for a given channel name
- **Definition:**
- `channelName` (string, required): Name of the channel (without #)
- **Descriptor:** `user-production-master/tools/slack__slack_find-channel-id.json`

### 157. `slack__slack_find-user-id-by-email`

- **Description:** Retrieves the user ID associated with a given email address in the Slack workspace.
- **Definition:**
- `email` (string, required): The email address of the user whose ID you want to find.
- **Descriptor:** `user-production-master/tools/slack__slack_find-user-id-by-email.json`

### 158. `slack__slack_get_channel_history`

- **Description:** Get recent messages from a channel
- **Definition:**
- `channel_id` (string, required): The ID of the channel
- `limit` (number, optional): Number of messages to retrieve (default 10)
- **Descriptor:** `user-production-master/tools/slack__slack_get_channel_history.json`

### 159. `slack__slack_get_thread_replies`

- **Description:** Get all replies in a message thread
- **Definition:**
- `channel_id` (string, required): The ID of the channel containing the thread
- `thread_ts` (string, required): The timestamp of the parent message in the format '1234567890.123456'. Timestamps in the format without the period can be converted by adding the period such that 6 numbers come after it.
- **Descriptor:** `user-production-master/tools/slack__slack_get_thread_replies.json`

### 160. `slack__slack_get_user_profile`

- **Description:** Get detailed profile information for a specific user
- **Definition:**
- `user_id` (string, required): The ID of the user
- **Descriptor:** `user-production-master/tools/slack__slack_get_user_profile.json`

### 161. `slack__slack_join_public_channel`

- **Description:** Join a public channel
- **Definition:**
- `channel_id` (string, required): The ID of the channel to join
- **Descriptor:** `user-production-master/tools/slack__slack_join_public_channel.json`

### 162. `slack__slack_list_channels`

- **Description:** List public channels in the workspace with pagination
- **Definition:**
- `cursor` (string, optional): Pagination cursor for next page of results
- `limit` (number, optional): Maximum number of channels to return (default 100, max 200)
- **Descriptor:** `user-production-master/tools/slack__slack_list_channels.json`

### 163. `slack__slack_post_message`

- **Description:** Post a new message to a Slack channel
- **Definition:**
- `blocks` (array, optional): Array of Block Kit blocks for rich formatting (tables, buttons, etc.)
- `channel_id` (string, required): The ID of the channel to post to
- `text` (string, required): The message text to post
- **Descriptor:** `user-production-master/tools/slack__slack_post_message.json`

### 164. `slack__slack_reply_to_thread`

- **Description:** Reply to a specific message thread in Slack
- **Definition:**
- `channel_id` (string, required): The ID of the channel containing the thread
- `text` (string, required): The reply text
- `thread_ts` (string, required): The timestamp of the parent message in the format '1234567890.123456'. Timestamps in the format without the period can be converted by adding the period such that 6 numbers come after it.
- **Descriptor:** `user-production-master/tools/slack__slack_reply_to_thread.json`

### 165. `trino__execute_trino_sql_query`

- **Description:** Execute a read-only SQL query using Trino and return data in LLM preferred format.
    Use when you need to aggregate, transform, or analyze data from trino analytics cluster.
    Only read-only queries are allowed: Only SELECT and WITH statements allowed.
    (NO CREATE/ALTER/INSERT/UPDATE/DELETE/DROP/MERGE/CALL/ANALYZE/EXPLAIN ANALYZE/PREPARE/TRUNCATE)
- **Definition:**
- `description` (string, required)
- `sql_query` (string, required)
- **Descriptor:** `user-production-master/tools/trino__execute_trino_sql_query.json`

### 166. `trino__get_approx_distinct_values_with_count`

- **Description:** Fetch approximately distinct values and approximate count from a column using Trino.
    use it to understand the distribution of values in the column and how many distinct values are there.
    it will help you to understand the cardinality of the column and how build sql logic according to the business requirements.
- **Definition:**
- `column_name` (string, required)
- `table_name` (string, required)
- **Descriptor:** `user-production-master/tools/trino__get_approx_distinct_values_with_count.json`

### 167. `trino__get_sample_data`

- **Description:** Retrieve sample rows from a table to understand data patterns and values.
    Use when you need to see actual data examples before writing queries or See real examples of how data is stored
- **Definition:**
- `columns_to_sample` (any, optional)
- `limit` (integer, optional)
- `table_name` (string, required)
- **Descriptor:** `user-production-master/tools/trino__get_sample_data.json`

### 168. `trino__get_table_file_stats`

- **Description:** Get file statistics and column bounds for a specific table using Trino.
    use it to understand the column statistics and how values are distributed in the table
- **Definition:**
- `table_name` (string, required)
- **Descriptor:** `user-production-master/tools/trino__get_table_file_stats.json`

### 169. `trino__get_table_partitions`

- **Description:** Get partitioning information for a table using Trino.
    Use it to list partition columns, useful for partition-pruning filters, incremental queries, and backfills.
- **Definition:**
- `table_name` (string, required)
- **Descriptor:** `user-production-master/tools/trino__get_table_partitions.json`

### 170. `trino__get_table_schema`

- **Description:** Get the schema (column names and types) for a table.
    Use when you need to understand table structure before writing queries.
- **Definition:**
- `table_name` (string, required)
- **Descriptor:** `user-production-master/tools/trino__get_table_schema.json`

### 171. `trino__get_table_technical_metadata`

- **Description:** Get technical metadata information for a specific table in `prod` catalog.
    use it to get information about the following attributes: is_view, files_count, rows_count, total_size,
    snapshot_count.
- **Definition:**
- `table_name` (string, required)
- **Descriptor:** `user-production-master/tools/trino__get_table_technical_metadata.json`

### 172. `trino__sleep`

- **Description:** Sleep for a specified amount of time.
- **Definition:**
- `sleep_time` (integer, required)
- **Descriptor:** `user-production-master/tools/trino__sleep.json`

