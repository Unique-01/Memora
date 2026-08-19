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
- Database (PostgreSQL/Prisma) configuration is NOT implemented. Do not attempt to use or configure these unless specified otherwise.
- Tailwind CSS is configured in `web/` with `@import "tailwindcss";` in `src/index.css`.
- Both projects use `pnpm`. If a command fails due to missing dependencies, ensure `pnpm install` has been run in the appropriate project directory.
