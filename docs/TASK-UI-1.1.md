# TASK-UI-1.1 — Explorer filters and responsive tables

## Implementation

- [x] Move Platform Filters out of global navigation into shared AppFilterSidebar, including its mobile drawer.
- [x] Replace the separate Environment selector with the unified selector; preserve URL-based platform filter state.
- [x] Enable the Monitors mobile filter drawer.
- [x] Use flexible explorer content sizing so collapsed sidebars release their width.
- [x] Keep table horizontal overflow internal, respect TanStack column sizes, preserve cell-specific whitespace and truncation, and wrap pagination controls.

## Validation

- [x] Frontend TypeScript check and Vite production build passed.
- [x] Five frontend tests passed, including two new layout markup regression tests.
- [x] Existing Graphify nodes and import edges checked for the shared table and explorer consumers.
- [ ] Graphify refresh: unavailable because the graphify executable is not installed/on PATH.
- [ ] Authenticated visual breakpoint testing: the isolated test browser opens the login page; no credentials were entered. Markup tests do not replace visual testing.

The production build retains its existing large-chunk warning. No backend changes or cluster deployment were made for this task.
