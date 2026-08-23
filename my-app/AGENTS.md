# Repository Guidelines

## Project Structure & Module Organization

This is a frontend-only Umi Max 4 + React 18 + TypeScript K12 question-bank prototype; no real backend is required. Runtime code lives in `src/`: pages in `src/pages`, shared UI in `src/components`, hooks in `src/hooks`, services in `src/services`, and HTML utilities in `src/utils`. Key areas include `ContentCenter/TagManage`, `ContentCenter/QuestionBankTask`, `PaperUpload`, and fullscreen `QuestionTagging`. Assets belong in `Public/`.

Routes are centralized in `config/routes.ts`. `/tag-system/*` is the main tag-settings path; `/question-bank/tag-system/*` redirects for compatibility. Fullscreen workflows use `layout: false`.

## Build, Test, and Development Commands

- `npm run dev` or `npm run start`: start the prototype at `http://localhost:8000`.
- `npm run build`: create a production build with `max build`.
- `npm run format`: run Prettier across the repository.
- `npm run setup`: regenerate Umi artifacts after dependency or config changes.

There is no `npm test` script or configured test runner.

## Coding Style & Naming Conventions

Use TypeScript and React function components. Follow the feature-first structure: complex pages should have an `index.tsx`, optional `components/`, `types.ts`, and related `.less` files. Before adding a component, search `src/components` and feature-local `components/`; reuse or extend existing components when behavior and layout match, especially in `TagManage` and `PaperUpload/Edit`. Component names use PascalCase, hooks use `useXxx`, and services should describe the API action. Prettier enforces single quotes, trailing commas, 80-character print width, package sorting, and organized imports.

## Testing Guidelines

Because no test framework is configured, verify changes with `npm run build` and targeted browser checks. Keep data files paired: `tagSystem.ts`, `paperUpload.ts`, and `questionBankTask.ts` each have matching files under both `src/services/` and `mock/`. Some pages use local mock data, such as `QuestionTagging/mockData.ts`. If tests are introduced later, colocate them near the feature and add a package script.

## Cross-Repository Product Requirements

Formal data-asset-center requirements are maintained in `/Users/jinwenyuan/my-repo/juwk/3-数据资产中心`. For cross-repository development, also read `/Users/jinwenyuan/my-repo/juwk/docs/跨仓需求与开发协作协议.md` and the requirement baseline identified by its exact `juwk` branch, full commit, relative path, title, and version.

- The frozen `juwk` requirement commit is the sole source for product goals, scope, business rules, and acceptance criteria. This repository is the source for code, UI behavior, engineering configuration, verification results, and implementation knowledge.
- Development tasks treat `juwk` as read-only. Local notes, code, mocks, and module documentation cannot redefine the frozen requirement. Return product ambiguities to the originating `juwk` product task; resolve engineering choices in this repository.
- Codex development tasks use a worktree by default unless the handoff explicitly selects the local checkout. The handoff must name the starting commit, delivery ref, and integration method. Before product acceptance, create a delivery branch or hand the task to Local and integrate the implementation into the agreed ref. A detached worktree commit is not a completed delivery, and work must not be described as present on `main` unless that commit is reachable from `main`.
- Do not stash, reset, overwrite, or absorb unrelated local changes to prepare a worktree or integration. Stop and report conflicts that prevent safe integration.
- The implementation receipt must include the frozen product baseline, repository path, workspace type, delivery ref, full implementation commit, integration status, `npm run build` result, targeted browser evidence, incomplete items, product deviations, a separate assumptions and open confirmations section, and the destination product or acceptance task.

## Commit & Pull Request Guidelines

Recent history uses Conventional Commit style, for example `feat(tagging): add doubtful marker filter`, `fix(tag-system): preserve selected tree node`, and `style(answer-manage): format drawer layout`. Keep commits scoped and imperative. Pull requests should include a short summary, affected routes or pages, manual verification steps, linked issues when relevant, and screenshots for visible UI changes.

## Security & Configuration Tips

Do not add backend servers, database dependencies, or production API assumptions. Keep prototype API boundaries in `src/services/` and mirror service changes in `mock/`. Sanitize HTML with `src/utils/sanitize.ts` before `dangerouslySetInnerHTML`, especially question stems, answers, and explanations.

## Agent-Specific Instructions

When assisting in this repository, reply to the user in Simplified Chinese.

## Agent skills

### Issue tracker

Issues live in GitLab Issues for this repo. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical roles mapped to default label strings: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout — one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
