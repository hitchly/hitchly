Monorepo Development Guide

Welcome! This guide explains how to set up and work with our monorepo containing:
	•	API (apps/api): tRPC + Express + TypeScript + Drizzle ORM + Postgres (Dockerized).
	•	Mobile app (apps/mobile): Expo React Native (TypeScript), runs locally.
	•	Shared packages (packages/*): UI components, database schemas, and configuration.
	•	Monorepo tooling: Turborepo, pnpm workspaces.

This guide is written for developers who may not have experience with production-level code, Docker, or monorepos.

⸻

1. Project Structure

/apps
  /api          # Backend API
    src/        # API source code
    package.json
    tsconfig.json
    Dockerfile.dev
    .env
  /mobile       # Expo React Native app
    App.tsx
    package.json
    tsconfig.json
    .env
/packages
  /ui           # Shared UI components
  /db           # Shared database schemas and migrations
  /config       # Optional shared config/env
/docker
  docker-compose.dev.yml
  Dockerfile.api
  Dockerfile.api.dev
turbo.json
package.json    # Root pnpm workspace

Notes:
	•	apps/api – backend API code. Runs in Docker for consistency.
	•	apps/mobile – mobile app. Runs locally for fast development (not Dockerized).
	•	packages/db – shared database schemas/migrations (code only). Actual Postgres runs in Docker.
	•	docker/ – contains Docker Compose and Dockerfiles for API development.

⸻

2. Environment Variables

API (apps/api/.env)

DATABASE_URL=postgres://user:password@db:5432/mydb
JWT_SECRET=supersecret
NODE_ENV=development

	•	DATABASE_URL → API connects to Postgres.
	•	JWT_SECRET → used for authentication.
	•	Keep this file secret; do not commit.

Mobile (apps/mobile/.env)

API_URL=http://192.168.0.10:3000  # replace with your host LAN IP

	•	Mobile app uses this to reach the API.
	•	Never include secrets like JWT or database passwords.

Optional shared config (packages/config/.env)

API_VERSION=1

	•	Non-secret variables shared across apps.

⸻

3. Docker Setup

apps/api/Dockerfile.dev

FROM node:20

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install

# Copy source code
COPY . .

# Start development server
CMD ["pnpm", "dev"]

docker/docker-compose.dev.yml

version: "3.9"
services:
  api:
    build:
      context: ../apps/api
      dockerfile: Dockerfile.dev
    container_name: api-dev
    command: pnpm dev
    ports:
      - "3000:3000"
    volumes:
      - ../apps/api:/app
      - /app/node_modules
      - /app/.pnpm-store
    env_file:
      - ../apps/api/.env
    networks:
      - devnet
    depends_on:
      - db

  db:
    image: postgres:15
    container_name: postgres-dev
    restart: always
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: mydb
    ports:
      - "5432:5432"
    volumes:
      - db_data:/var/lib/postgresql/data
    networks:
      - devnet

volumes:
  db_data:

networks:
  devnet:
    driver: bridge

Expo tip: set API_URL in mobile .env to your host LAN IP to reach the API container.

⸻

4. Root package.json

{
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev:infra": "docker compose -f docker/docker-compose.dev.yml up -d",
    "dev": "pnpm dev:infra && turbo dev"
  },
  "devDependencies": {
    "turbo": "^1.10.0",
    "pnpm": "^8.0.0"
  }
}

	•	pnpm dev → starts Dockerized API + DB, then runs Turborepo dev scripts (including mobile).

⸻

5. API App (apps/api/package.json)

{
  "scripts": {
    "dev": "ts-node-dev --respawn src/index.ts",
    "build": "tsc",
    "migrate": "pnpm drizzle-kit migrate"
  },
  "dependencies": {
    "express": "^4.18.2",
    "trpc": "^10.0.0",
    "drizzle-orm": "^0.27.0",
    "pg": "^8.11.0"
  }
}


⸻

6. Mobile App (apps/mobile/package.json)

{
  "scripts": {
    "dev": "expo start"
  },
  "dependencies": {
    "expo": "^50.0.0",
    "react": "18.2.0",
    "react-native": "0.72.0"
  },
  "devDependencies": {
    "react-native-dotenv": "^4.3.1"
  }
}

	•	Expo reads .env via react-native-dotenv.
	•	Mobile app runs locally for development.

⸻

7. Packages (packages/db)
	•	Contains database schemas and migrations shared across apps.
	•	Example:

/packages/db
 ├─ schema.ts
 ├─ migrations/
 │   ├─ 001_initial.ts
 │   └─ 002_add_users.ts
 └─ index.ts

	•	API imports from this package:

import { users } from "@your-monorepo/db/schema";

	•	Note: This is code only, not the actual database runtime.

⸻

8. Day-to-Day Development Workflow
	1.	Install dependencies

pnpm install

	2.	Start development environment

pnpm dev

	•	Dockerized API + DB (docker compose)
	•	Expo mobile app locally (apps/mobile/dev) via Turborepo

	3.	Coding

	•	API → hot reload in Docker container.
	•	Mobile → hot reload in Expo (simulator/device).
	•	Mobile API calls → use API_URL with host LAN IP.

	4.	Adding dependencies

	•	API (inside container):

docker compose exec api pnpm add zod

	•	Mobile (locally):

pnpm add react-query --filter mobile


⸻

9. Tips for Beginners
	•	Keep .env files secret.
	•	Expo physical device testing requires same network as your machine.
	•	Turborepo orchestrates multiple apps from root.
	•	Docker ensures cross-platform consistency (Mac + Windows).
	•	Always use LAN IP for API access from mobile.

⸻

10 Rebuilding the Project From Scratch
	1.	Clone the repository.
	2.	Install pnpm and Turborepo:

npm install -g pnpm turbo

	3.	Create .env files for API and mobile (see above).
	4.	Install dependencies:

pnpm install

	5.	Start the development environment:

pnpm dev

	•	You now have a fully working local development environment.

⸻

11 Architecture Diagram (Local Dev)

+-------------------+        +-------------------+
|   Mobile App      |        |    Host Machine   |
| (Expo Simulator   |        |                   |
|  or Physical)     |        |                   |
|                   |        |                   |
|  API calls --->   |------> |  API Container    |
|  http://LAN_IP:3000       |                   |
|                   |        |                   |
+-------------------+        +-------------------+
                                    |
                                    v
                          +-------------------+
                          |   Postgres DB     |
                          |   (Docker)        |
                          +-------------------+

Mermaid Alternative

flowchart LR
    MobileApp[Mobile App (Expo)] -->|API Calls: http://LAN_IP:3000| API[API Container (Docker)]
    API -->|Connects| Postgres[Postgres DB (Docker)]

Notes:
	•	Mobile app connects to API container via LAN IP.
	•	API container talks to Postgres via Docker bridge network (devnet).
	•	Mobile app hot reload works on simulator and physical device.