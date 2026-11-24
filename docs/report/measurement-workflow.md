# Workflow measurement: one feature from prompt to merge

The feature measured here is the Spotlight (⌘K) search, built on 2026-11-24. The work started from the user's first prompt and ended with both PRs merged and deployed. That is PR #18 (theme) and PR #19 (search). All times are WIB (UTC+7).

## Summary

| Measure | Value |
| --- | --- |
| Prompt → last merge (PR #19) | **69 min 20 s** (08:38:31 → 09:47:51) |
| Prompt → deploy green | **72 min** (→ 09:50:30) |
| User input | 2 messages with answers, both in the first 4 min. Nothing waited on the user after that. |
| Output | 2 PRs, 17 commits, 12 plan tasks, 800 unit tests and 24 e2e tests passing. |
| Model API calls | 538 (Opus 5.5: 190, Sonnet 5: 348) |
| Output tokens | **264k** (Opus 131k, Sonnet 133k) |
| Input tokens | 61.2M cache reads, 2.42M cache writes, 1.1k uncached |
| Estimated API cost | **≈ $25.31** at Claude API list prices (Opus $12.80, Sonnet $12.52). CI cost $0. |
| GitHub CI | 4 runs, 9 min 16 s wall time, 8 min 46 s runner time |

## Team setup

| Role | Model | Count | Edits | Job |
| --- | --- | --- | --- | --- |
| orchestrator (main session) | Opus 5.5 | 1 | everything; only role that commits | brainstorm, gates, commits, rulings |
| docs-writer | Opus 5.5 | 1 | `docs/` only | spec, then both plans |
| test-writer | Sonnet 5 | 2 (one per team) | test files only | failing tests per task |
| implementer | Sonnet 5 | 2 (one per team) | everything except test files | code per task |
| reviewer | Opus 5.5 | 2 (one per branch) | nothing | one review per branch |
| pr-shipper | Sonnet 5 | 2 (one per branch) | nothing | push, PR, wait for CI, rebase-merge, watch deploy |

The feature had two plans with no shared file, so two teams ran in parallel (CLAUDE.md Rule 11). The theme team worked in its own worktree. The main team waited for the theme PR to merge before task 5, because the UI uses the theme tokens.

Each task has the same steps. The test-writer writes the tests, then the RED gate runs. The implementer writes the code, then the GREEN gate runs. Then the orchestrator commits.

## Timeline

| Phase | Start → end | Wall time |
| --- | --- | --- |
| 1. Brainstorm and user answers | 08:38:31 → 08:42:23 | 3:52 |
| 2. Spec (560 lines) | 08:42:23 → 08:50:51 | 8:28 |
| 3. Plans (3 + 9 tasks) | 08:50:51 → 08:57:07 | 6:16 |
| **Theme team** (parallel) | | |
| 4. Build, tasks 1–3 | 08:57:48 → 09:06:26 | 8:38 |
| 5. Review / fix | 09:06:48 → 09:12:45 | 3:05 / 2:32 |
| 6. Ship PR #18 | 09:13:09 → 09:15:38 merged | 2:29 (deploy 09:18:11) |
| **Main team** | | |
| 7a. Build, tasks 1–4 | 08:57:52 → 09:13:52 | 16:00 |
| 7b. Wait for PR #18 merge and deploy report | 09:13:52 → 09:19:04 | 5:12 |
| 7c. Build, tasks 5–9 | 09:19:04 → 09:34:25 | 15:21 |
| 8. Review | 09:34:40 → 09:37:43 | 3:03 |
| 9. Fix | 09:38:03 → 09:44:31 | 6:28 |
| 10. Ship PR #19 | 09:44:40 → 09:47:51 merged | 3:11 (deploy 09:50:30) |

Critical path (the main team), 69 min:

| Part | Time | Share |
| --- | --- | --- |
| Build | 31 min | 45% |
| Spec and plans | 15 min | 21% |
| Review and fix | 10 min | 14% |
| Wait for the theme merge | 5 min | 7% |
| Brainstorm | 4 min | 6% |
| Ship | 3 min | 5% |

Time per task, from dispatch to commit:

| Task | Main team | Theme team |
| --- | --- | --- |
| 1 | keyboard helpers 1:42 | contrast over layers 2:09 |
| 2 | recent-customer storage 2:00 | `--sp-*` tokens 2:35 |
| 3 | selector 9:28 (one test ruling) | panel and scrim CSS 3:42 |
| 4 | record visits 2:33 | |
| 5 | dialog 7:04 | |
| 6 | trigger and ⌘K 4:52 | |
| 7 | remove old search 2:56 | |
| 8–9 | docs and `cmdk` removal, orchestrator, under 1 min | |

Agent time was 85–95% model generation. Tool time per task was 0.0–0.5 min: tests, typecheck, and git. The orchestrator needed 3–15 s between an agent's report and the next dispatch.

## Tokens by phase

`Calls` counts API requests. `Cache write` and `Cache read` are input tokens. Uncached input was under 0.3k in every row, so it is not shown.

| Phase | Role | Model | Calls | Cache write | Cache read | Output |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| 1. Brainstorm | orchestrator | Opus | 11 | 74k | 0.85M | 14.5k |
| 2. Spec | docs-writer | Opus | 31 | 131k | 2.68M | 29.0k |
| 2. Spec | orchestrator | Opus | 7 | 14k | 0.76M | 3.6k |
| 3. Plans | docs-writer | Opus | 10 | 51k | 1.51M | 30.4k |
| 3. Plans | orchestrator | Opus | 11 | 14k | 1.35M | 4.9k |
| 4. Theme build | test-writer | Sonnet | 21 | 91k | 1.19M | 12.4k |
| 4. Theme build | implementer | Sonnet | 36 | 87k | 2.28M | 14.2k |
| 5. Theme review | reviewer | Opus | 13 | 152k | 0.55M | 8.1k |
| 5. Theme fix | test-writer + implementer | Sonnet | 21 | 212k | 2.01M | 4.2k |
| 6. Theme ship | pr-shipper | Sonnet | 21 | 31k | 0.49M | 0.7k |
| 7. Main build | test-writer | Sonnet | 108 | 441k | 13.16M | 56.7k |
| 7. Main build | implementer | Sonnet | 86 | 328k | 8.02M | 31.5k |
| 4–7. Gates, commits, dispatch for both teams | orchestrator | Opus | 78 | 250k | 13.95M | 30.3k |
| 8. Main review | reviewer | Opus | 15 | 76k | 0.70M | 1.9k |
| 9. Main fix | test-writer + implementer | Sonnet | 42 | 414k | 8.07M | 13.0k |
| 8–9. Main review and fix | orchestrator | Opus | 11 | 18k | 2.65M | 6.5k |
| 10. Main ship | pr-shipper | Sonnet | 13 | 29k | 0.27M | 0.5k |
| 10. Ship and final report | orchestrator | Opus | 3 | 3k | 0.75M | 1.5k |
| **Total** | | | **538** | **2.42M** | **61.2M** | **264k** |

## Tokens by role and model

| Role | Model | Calls | Cache read | Output | Output share |
| --- | --- | ---: | ---: | ---: | ---: |
| orchestrator | Opus 5.5 | 121 | 20.3M | 61.3k | 23% |
| docs-writer | Opus 5.5 | 41 | 4.18M | 59.5k | 23% |
| reviewer (×2) | Opus 5.5 | 28 | 1.25M | 10.0k | 4% |
| test-writer (×2) | Sonnet 5 | 161 | 19.8M | 79.5k | 30% |
| implementer (×2) | Sonnet 5 | 153 | 15.0M | 52.5k | 20% |
| pr-shipper (×2) | Sonnet 5 | 34 | 0.76M | 1.2k | 0.5% |
| **Opus 5.5 total** | | 190 | 25.7M | 130.8k | 50% |
| **Sonnet 5 total** | | 348 | 35.5M | 133.2k | 50% |

## Estimated API cost

This is an estimate at Claude API list prices, in USD. It shows what the same token use would cost through the API. The session ran in Claude Code, and the real charge depends on the plan used.

Prices used (per million tokens, standard speed, global routing, as on the [Claude pricing page](https://platform.claude.com/docs/en/about-claude/pricing) on 2026-11-24):

| Model | Input | Cache write 5 min | Cache write 1 h | Cache read | Output |
| --- | ---: | ---: | ---: | ---: | ---: |
| Opus 5.5 | $4 | $5 | $8 | $0.20 | $20 |
| Sonnet 5 | $2 | $2.50 | $4 | $0.20 | $10 |

The transcripts report the cache write type for each call. The orchestrator wrote to the 1-hour cache (373k tokens). All agents wrote to the 5-minute cache (2.04M tokens).

Cost by phase:

| Phase | Roles | Cost |
| --- | --- | ---: |
| 1. Brainstorm | orchestrator | $1.06 |
| 2. Spec | docs-writer $1.77, orchestrator $0.34 | $2.11 |
| 3. Plans | docs-writer $1.16, orchestrator $0.48 | $1.64 |
| 4. Theme build | test-writer $0.59, implementer $0.82 | $1.41 |
| 5. Theme review and fix | reviewer $1.03, test-writer and implementer $0.97 | $2.00 |
| 6. Theme ship | pr-shipper | $0.18 |
| 7. Main build | test-writer $4.30, implementer $2.74 | $7.04 |
| 4–7. Gates, commits, dispatch for both teams | orchestrator | $5.39 |
| 8–9. Main review and fix | reviewer $0.56, test-writer and implementer $2.78, orchestrator $0.80 | $4.14 |
| 10. Main ship and final report | pr-shipper $0.13, orchestrator $0.21 | $0.34 |
| **Total** | | **$25.31** |

Cost by role and by token type:

| Role | Cost | Share |
| --- | ---: | ---: |
| orchestrator (Opus) | $8.27 | 33% |
| test-writer ×2 (Sonnet) | $6.90 | 27% |
| implementer ×2 (Sonnet) | $5.30 | 21% |
| docs-writer (Opus) | $2.94 | 12% |
| reviewer ×2 (Opus) | $1.59 | 6% |
| pr-shipper ×2 (Sonnet) | $0.32 | 1% |

| Token type | Cost | Share |
| --- | ---: | ---: |
| Cache read (61.2M) | $12.25 | 48% |
| Cache write (2.42M) | $9.12 | 36% |
| Output (264k) | $3.95 | 16% |
| Uncached input (1.1k) | < $0.01 | 0% |

What the cost numbers show:

- **Context, not output, is the main cost.** Cache reads and writes are 84% of the cost. Every call reads the agent's whole context again, so long-lived agents with many calls cost the most. The main test-writer made 129 calls.
- **The orchestrator costs the most of any role.** It is Opus, and it stays in one session for the whole feature, so its context only grows.

## GitHub CI

Each PR runs `checks` and then `e2e`. Each push to `main` runs `checks`, `e2e`, and `deploy` (GitHub Pages).

| Run | Wall | checks | e2e | deploy |
| --- | --- | ---: | ---: | ---: |
| PR #18 (`feat/spotlight-theme`) | 1:45 | 0:55 | 0:45 | skipped |
| `main` after #18 | 2:31 | 1:17 | 0:52 | 0:11 |
| PR #19 (`feat/spotlight-search`) | 2:24 | 1:23 | 0:55 | skipped |
| `main` after #19 | 2:36 | 1:21 | 0:57 | 0:10 |
| **Total** | **9:16** | 4:56 | 3:29 | 0:21 |

Step times for PR #19:

| Job | Steps |
| --- | --- |
| `checks` | setup-node 6 s, `npm ci` 12 s, typecheck 6 s, lint 4 s, lint:md 1 s, **unit tests with coverage 37 s**, data check 1 s, build 7 s |
| `e2e` | setup-node 5 s, `npm ci` 10 s, cache 4 s, **Playwright install-deps 14 s**, **e2e 15 s** |

The PR run is on the merge path: pr-shipper merges only after both jobs pass. Each PR took 2–3 min from creation to merge. The run on `main` after the merge adds 2.5 min before the deploy is green.

## Findings

1. **Model output sets the speed.** Tools and CI took little time. Every long phase is long because an agent produced many tokens:
   - The spec took 29k output tokens for a 30 KB document. The plans took 30k for 33 KB.
   - Main task 3 (selector) took 26k output tokens for a 7 KB test file. The test-writer worked out each expected value by reasoning, and it ran 18 commands to check them.
2. **Every task has a fixed cost of about 2 min,** because the two agents work one after the other and each reads the task first. Main tasks 1, 2 and 4 were each almost only this fixed cost.
3. **Cache reads are 96% of input.** Continuing the same agents with `SendMessage` keeps their context warm. The cost is that context grows: the main test-writer read 17.5M cached tokens over 10 dispatches.
4. **Parallel teams saved about 5–10 min.** About 20 min of theme work ran beside main tasks 1–4. The split also added a 5 min wait, of which about 3 min was the deploy watch after the theme merge.
5. **Two rework rounds:**
   - An unused import in a test failed typecheck at the GREEN gate. The RED gate runs tests only.
   - A review fix made an older test match two elements.

   Each round cost about 1 min.

## Changes that would make it faster (not applied)

| Change | Expected saving |
| --- | --- |
| Shorter spec for UI-only features; the plan points to the spec and does not repeat it | 5–7 min |
| Merge very small tasks into one (main tasks 1, 2, 4) | ~3 min |
| Put exact expected values in the plan, so the test-writer does not work them out again | ~3 min |
| Continue the waiting team when the merge is done, not when the deploy is done | ~3 min |
| test-writer runs `tsc` and `eslint` on its own files before it reports | ~1 min |

## Method

- **Timing** comes from the timestamps in the Claude Code session transcripts: the main session and nine subagent transcripts. Commit times come from `git log`.
- **Tokens** come from the `usage` field of each assistant message in the same transcripts. A message is counted once by its message id.
  - Orchestrator tokens are split by time window. Agent tokens are split by role and by the task the agent was on.
  - The orchestrator rows for phases 4–7 cover both teams, because one session served both teams at the same time.
- **CI** times come from `gh run view --json jobs`: the job and step start and end times.
- **Cost** is tokens × list price for each call. The model comes from the call, and the cache type comes from `usage.cache_creation` (5-minute or 1-hour). Every call ran at standard speed with global routing, so no fast-mode or data-residency multiplier applies.
- **CI cost** is $0: the repo is public, and the jobs run on GitHub's standard `ubuntu-latest` runners.
- **Not measured:** time spent outside this session (for example, the user reading the spec).
