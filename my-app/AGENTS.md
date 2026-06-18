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

## Commit & Pull Request Guidelines

Recent history uses Conventional Commit style, for example `feat(tagging): add doubtful marker filter`, `fix(tag-system): preserve selected tree node`, and `style(answer-manage): format drawer layout`. Keep commits scoped and imperative. Pull requests should include a short summary, affected routes or pages, manual verification steps, linked issues when relevant, and screenshots for visible UI changes.

## Security & Configuration Tips

Do not add backend servers, database dependencies, or production API assumptions. Keep prototype API boundaries in `src/services/` and mirror service changes in `mock/`. Sanitize HTML with `src/utils/sanitize.ts` before `dangerouslySetInnerHTML`, especially question stems, answers, and explanations.

## Agent-Specific Instructions

When assisting in this repository, reply to the user in Simplified Chinese.
