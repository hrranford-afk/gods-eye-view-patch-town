# PatchTown Works: sources and ideas

Checked 16 Nov 2026. Licences read from each project's LICENSE file on GitHub (raw files) or the publisher's terms.
**Nothing below is copied into the page as code.** We take ideas only, plus three.js itself (MIT).

| Project | Licence | Commercial use? | What we take |
|---|---|---|---|
| **Generative Agents / Smallville** (joonspk-research/generative_agents) | Apache-2.0 (code) | Yes for the code. **The Smallville map art is NOT ours to use**: it is built from third-party paid tilesets credited in their repo. | The idea of a town where every agent has a place to be, a daily plan and a memory stream; their "replay" of a saved run, which is our timeline scrubber. |
| **AI Town** (a16z-infra/ai-town) | MIT | Yes (code). Its sprite and tile art comes from separately credited packs: check each before reuse. | Agents as walkers on a map, their activity shown as speech bubbles; a small engine that replays from a log. |
| **ChatDev** (OpenBMB/ChatDev) | Apache-2.0 | Yes | The software company as roles (CEO, programmer, reviewer, tester) and its log visualiser that replays a run step by step. Our roles: foreman, builders, yard, post office. |
| **Langfuse** | MIT, except folders named `ee/` (separate commercial licence) | Yes for the MIT part; **do not use the `ee/` parts** without a licence | The trace -> span -> event tree, sessions, and the timeline view. One foreman session = one trace, each builder = a span. |
| **AgentOps** (AgentOps-AI/agentops) | MIT (SDK) | Yes (the hosted dashboard is their service) | Session replay "waterfall" and event types (LLM call, tool, action, error) that map onto our ledger `kind`. |
| **Arize Phoenix** | **Elastic License 2.0** (source-available, not open source) | Use is allowed, but **you may not offer it to others as a hosted service**, or remove licence checks. Flagged. | OpenInference span kinds (AGENT, TOOL, LLM, RETRIEVER) as a vocabulary only. |
| **OpenTelemetry GenAI semantic conventions** | Apache-2.0 (specification) | Yes | Field names for a later ledger-to-OTel bridge: `gen_ai.operation.name` (`invoke_agent`, `execute_tool`), `gen_ai.agent.name`, `gen_ai.tool.name`, `gen_ai.usage.input_tokens`. Status is still "development", so names may change. |
| **Claude Code OpenTelemetry and hooks** | Claude Code is Anthropic's product under its commercial terms; the hooks and telemetry are settings we can turn on | Yes, within Anthropic's terms | Telemetry (`CLAUDE_CODE_ENABLE_TELEMETRY=1` plus OTLP exporters) gives metrics such as sessions, commits, lines changed, cost and tokens, and events such as `user_prompt`, `tool_result`, `api_request`. Hooks (`SessionStart`, `PostToolUse`, `SubagentStop`, `Stop`) can run a one-line command, e.g. `works_log` from LEDGER.md. **Not switched on**: no `.claude` settings were changed. |
| **Gource** | **GPL-3.0 (copyleft)** | The program can be used, but **any code copied from it would force our page to be GPL**. Flagged: idea only. | The look of a repository as a living tree that grows while time plays, with a clock and speed control. We draw our own town instead. |
| **Kenney 3D kits** (City Kit Suburban, City Kit Commercial, Mini Characters, Town Kit) | **CC0 1.0** (public domain) | Yes, no credit required (we credit anyway) | Planned: toy houses, shops and little people to replace our box houses. **Download blocked from this machine** (kenney.nl answered 403 to the build machine), so v1 uses the mock-up's own shapes, improved. See THIRD_PARTY.md for how to add them. |
| **three.js** r128 and its examples (GLTFLoader) | MIT | Yes | The 3D engine (from cdnjs) and GLTFLoader (from jsdelivr three@0.128.0), the same versions the games use. Example *assets* (models, textures) have their own licences: none used. |

## Not OK for commercial use, or with strings attached

- **Arize Phoenix**: Elastic License 2.0. Not open source; no hosted-service resale. We use none of it.
- **Gource**: GPL-3.0. Copyleft. We use none of its code.
- **Smallville and AI Town art**: third-party tilesets with their own (some paid) licences. We use none of it.
- **Langfuse `ee/` folders**: commercial licence. We use none of it.

Everything we actually ship (three.js, GLTFLoader, our own shapes, Google Fonts under the SIL Open Font Licence)
is fine for commercial use.
