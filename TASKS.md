# Tasks

## Current Focus

- Stabilize production behavior on Vercel + Supabase
- Reduce mypage request fan-out and DB connection pressure
- Keep AI Office task contracts explicit and reviewable
- Continue `AccountPageClient` Phase 2 split after runtime stability work

## Active Tracks

### Runtime Stability

- confirm Supabase runtime connection strategy
- reduce parallel API load on `mypage`
- keep approval flow stable under production latency

### AI Office

- keep task input and output contracts synced
- improve metrics visibility for generated tasks
- prepare next task types only after current flows are stable

### Repository Automation

- standardize Issues and PRs through `.github`
- use Codex for triage, implementation, and review in bounded scopes
- keep CI as the hard gate for merge quality

## Ready Queue

1. Inspect `mypage` API fan-out and reduce duplicate calls
2. Clarify Supabase `DATABASE_URL` / `DIRECT_URL` guidance in docs
3. Resume `AccountPageClient` Phase 2 once runtime pressure is lower
