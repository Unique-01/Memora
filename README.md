# Personal Memory Application

This project contains two independent applications:

- `api/`: A NestJS backend.
- `web/`: A React frontend (Vite + Tailwind).

## Local Development

### API
```bash
cd api
pnpm install
pnpm start:dev
```
The API will be available and provide a health check at `GET /health`.

### Web
```bash
cd web
pnpm install
pnpm dev
```
The frontend will be available as specified by the Vite development server.
