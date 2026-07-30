---
name: SMARTCLASS overview
description: Architecture, auth flow, DB approach, and key file map for the SMARTCLASS project
---

# SMARTCLASS — Project Overview

## What it is
Full-stack classroom management + kiosk system for Exequiel R. Lina High School (ERLHS).  
Roles: Admin, Teacher, Student. Also has an unauthenticated Idle/Announcement screen.

## Stack
- **Frontend**: React 18 + TypeScript + Vite, served on port 5000 (`client/`)
- **Backend**: Express + TypeScript, port 3001 (`server/`)
- **Database**: In-memory JS object (`server/db.ts`) persisted to `data/db.json` — no external DB required
- **Auth**: JWT in HTTP-only cookies + bcrypt; `SESSION_SECRET` env var used
- **Forms**: React Hook Form + Zod
- **Styles**: Tailwind CSS; school color scheme (green #4E7D4B, gold #C89A2B, orange #E86A1D)

## Run command
`npm run dev` — concurrently starts Vite (port 5000) and tsx watch (port 3001)

## Auth flow
- Login via `/api/auth/login` → JWT set as HTTP-only cookie
- `AuthProvider` in `client/src/lib/auth.tsx` manages global user state
- `client/src/lib/api.ts` — Axios client with 401 interceptor that fires a `CustomEvent` to trigger global logout
- Server middleware: `requireAuth` + `requireRole` in `server/middleware/`

## Key directories
- `client/src/pages/admin/` — admin portal pages
- `client/src/pages/teacher/` — teacher portal pages
- `client/src/pages/student/` — student portal pages
- `client/src/pages/IdleScreen.tsx` — kiosk idle/announcement board (unauthenticated home screen)
- `client/src/components/layout/PortalLayout.tsx` — shared sidebar/navbar
- `client/src/components/ui/` — atomic UI components (Avatar, Badge, Button, Input, Modal, EmptyState)
- `server/routes/` — all API route handlers
- `server/db.ts` — in-memory store + seed + expand helpers (no Prisma at runtime despite schema existing)
- `prisma/schema.prisma` — schema exists for potential future PostgreSQL migration

## Database notes
`server/db.ts` uses plain JS arrays as the store, serialized to `data/db.json`.
Prisma schema exists but is NOT used at runtime — it documents the intended relational model.
`expandStudent`, `expandTeacher`, `expandAttendanceSession` are manual join helpers.

**Why:** The project was built to run on Replit without needing a provisioned PostgreSQL instance.

## Demo credentials
See `replit.md` for demo login identifiers and default passwords.
All accounts require a password change on first login.
