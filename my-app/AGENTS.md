# Repository Guidelines

## Project Structure & Module Organization

This is a frontend-only Umi Max 4 + React 18 + TypeScript K12 question-bank prototype. It does not require a real backend. Runtime code lives in `src/`: pages in `src/pages`, UI in `src/components`, hooks in `src/hooks`, services in `src/services`, and HTML utilities in `src/utils`. Routes are configured in `config/routes.ts`; layout and Umi settings live in `.umirc.ts` and `config/defaultSettings.ts`. Mock API handlers are in `mock/`; some pages keep local mock data beside the feature, such as `src/pages/QuestionTagging/mockData.ts`. Assets belong in `Public/`.

## Build, Test, and Development Commands

- `npm run dev` or `npm run start`: start the local prototype at `http://localhost:8000`.
- `npm run build`: create a production build with `max build`.
- `npm run format`: run Prettier across the repository.
- `npm run setup`: regenerate Umi setup artifacts after dependency or config changes.

There is currently no `npm test` script or configured test runner.

## Coding Style & Naming Conventions

Use TypeScript and React function components. Follow the existing feature-first structure: complex pages should have an `index.tsx`, optional `components/`, `types.ts`, and related `.less` files. Before adding a component, search `src/components` and feature-local `components/`; reuse or extend existing components when behavior and layout match. Component names use PascalCase, hooks use `useXxx`, and service functions should describe the API action. Prettier enforces single quotes, trailing commas, 80-character print width, package sorting, and organized imports. ESLint and Stylelint extend `@umijs/max`.

## Testing Guidelines

Because no test framework is configured, verify changes with `npm run build` and targeted browser checks. For data flows, update the matching `mock/*.ts` or feature-local `mockData.ts` with UI changes. If tests are introduced later, colocate them near the feature and add a package script before relying on CI.

## Commit & Pull Request Guidelines

Recent history uses Conventional Commit style, for example `feat(tagging): add doubtful marker filter`, `fix(tag-system): preserve selected tree node`, and `style(answer-manage): format drawer layout`. Keep commits scoped and imperative. Pull requests should include a short summary, affected routes or pages, manual verification steps, linked issues when relevant, and screenshots for visible UI changes.

## Security & Configuration Tips

Do not add backend servers, database dependencies, or production API assumptions. Keep prototype API boundaries in `src/services/` and mirror service changes in `mock/`. Sanitize any HTML before rendering with `dangerouslySetInnerHTML` by using `src/utils/sanitize.ts`.

## Agent-Specific Instructions

When assisting in this repository, reply to the user in Simplified Chinese.
