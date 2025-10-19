# Repository Guidelines

## What is this Project? 
We're building a history simulator:  you change an event in history and you can see how that would have changed everything/anything else. Eventually, it will become a game that you can play at different levels, running in the browser. First, we're trying to create the knowledge graph. Nodes are events, and edges are causal/effect links between one event and another. You should be able to click on an event and change it, and then the changes will propagate through the whole downstream graph. 

## Project Structure & Module Organization
The Next.js app lives in `war-games-mvp/`. Use the App Router: UI screens in `app/`, shared styles in `app/globals.css`, and API handlers (e.g., `app/api/rewrite/route.ts`) for OpenAI rewrites. Deterministic timeline logic stays in `src/server/propagate.ts`; keep pure helpers there for re-use. Shared typings sit under `src/types`, and counterfactual datasets load from `public/data/wwi.json` and `public/data/wwii.json`.

## Build, Test, and Development Commands
Run `npm install` once inside `war-games-mvp/`. Use `npm run dev` for the local server on http://localhost:3000. `npm run build` performs Next.js' production build plus TypeScript checking; use it before every PR. `npm run start` serves the optimized build for smoke testing.

## Coding Style & Naming Conventions
Stick to TypeScript, 2-space indentation, and const-first imports. Prefer functional React components with hooks at the top of the file. Use Tailwind utility classes for layout; colocate custom styles in `globals.css`. Name files and components after their feature (`EditableNode.tsx`, `propagate.ts`), and reference shared modules via the `@/` alias rather than relative `../../` chains.

## Testing Guidelines
Automated tests are not yet configured. Until we adopt a runner, treat `npm run build` and targeted manual checks as the regression gate. When you add pure logic to `src/server`, factor it so it can be covered by future unit tests and document the expected behaviour near the function. Flag any gaps or manual steps in your PR description.

## Commit & Pull Request Guidelines
Commits follow short, imperative titles (`light/dark mode`, `cleanup`). Keep one logical change per commit, referencing affected areas in the body when needed. PRs should include a concise summary, screenshots or screen recordings for UI changes, reproduction steps for timeline updates, and a note about required environment variables. Tag relevant issues and confirm `OPENAI_API_KEY` configuration when touching the rewrite API.

## Environment & Data Notes
Store secrets in `war-games-mvp/.env.local`; never commit keys. Curate new historical scenarios under `public/data/` and update any fetch paths in `app/page.tsx` accordingly to avoid mismatches.
