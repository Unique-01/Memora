# Agents

This repository is a monorepo containing two independent applications: `api/` (NestJS) and `web/` (React/Vite).

## Development Commands

### API (NestJS)
- **Install:** `cd api && pnpm install`
- **Develop:** `cd api && pnpm start:dev`
- **Health Check:** `GET /health`

### Web (React + Vite + Tailwind)
- **Install:** `cd web && pnpm install`
- **Develop:** `cd web && pnpm dev`

## Architectural Notes
- The applications are strictly independent. They do not share a common build process or configuration.
- Database: PostgreSQL via Prisma 7 in `api/`. Connection comes from `DATABASE_URL` in `api/.env` (see `api/.env.example`). Prisma 7 does not auto-load `.env`; it is loaded in `prisma.config.ts` and `src/main.ts`.
- Generated Prisma Client lives in `api/src/generated/prisma` (gitignored). Run `pnpm prisma generate` (or any `pnpm install`) after schema changes. Import types from the generated path, never from `@prisma/client`.
- Prisma access is encapsulated: `MemoryRepository` -> `PrismaService` (`api/src/database/`) -> PostgreSQL. Do not instantiate `PrismaClient` elsewhere.
- Interpretation layer (`api/src/memories/interpretation/`): `MemoryInterpreter` interface + validation boundary. `OpenRouterMemoryInterpreter` (`interpretation/providers/openrouter-memory.interpreter.ts`, model `openai/gpt-oss-20b`) is bound to the `MEMORY_INTERPRETER` symbol in `memories.module.ts`; consumers never import concrete interpreters. Config: `OPENROUTER_API_KEY`, `AI_MODEL`, `OPENROUTER_BASE_URL`. Provider code uses native fetch only — no SDK.
- Capture flow: `POST /memories/capture` (`MemoriesController` → `MemoriesService.capture` → interpreter → repository). Original input becomes `Memory.content` verbatim; unsupported/ambiguous interpretations return HTTP 422 without persisting.
- Query and Search flow: `GET /memories` supports optional `type` filter and case-insensitive partial text `search` (matching `title`, `summary`, or `content`), ordered deterministically by `createdAt` descending.
- Apply schema changes with migrations: `pnpm prisma migrate dev` (never `prisma db push`).
- Tailwind CSS is configured in `web/` with `@import "tailwindcss";` in `src/index.css`.
- Both projects use `pnpm`. If a command fails due to missing dependencies, ensure `pnpm install` has been run in the appropriate project directory.
- `pnpm test` in `api/` runs jest with ts-jest; relative `.js` imports are mapped to `.ts` via `moduleNameMapper` (nodenext style).
