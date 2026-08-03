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
- `client/src/pages/tools/` — public interactive tools (Smartboard, Canvas, Split-Screen, Formula, Health)
- `client/src/components/layout/PortalLayout.tsx` — shared sidebar/navbar for portals
- `client/src/components/layout/LandingSidebar.tsx` — slide-in sidebar on the landing page
- `client/src/components/layout/ToolLayout.tsx` — shared header wrapper for tool pages
- `client/src/components/ui/` — atomic UI components (Avatar, Badge, Button, Input, Modal, EmptyState)
- `server/routes/` — all API route handlers
- `server/db.ts` — in-memory store + seed + expand helpers (no Prisma at runtime despite schema existing)
- `prisma/schema.prisma` — schema exists for potential future PostgreSQL migration

## Sidebar Navigation Module (Landing Page)
- Hamburger (☰) icon in the header top-left replaces the old Login button
- Clicking opens `LandingSidebar` which slides in from the left
- Sidebar items: Login (→ /login), Health (→ /health), Interactive Learning (collapsible group)
- Interactive Learning sub-items: SMARTBOARD (→ /smartboard), Canvas Mode (→ /canvas), Split-Screen (→ /splitscreen), Formula/Graph Finder (→ /formula)
- If a user is already logged in, the sidebar shows their info + Go to Dashboard + Logout instead of Login
- A logged-in user chip also appears in the header right — tapping it opens the sidebar

## Public Tool Routes
All tools are publicly accessible (no login required):
- `/health` — Student Wellness Tools (Health Tips carousel, BMI Calculator, Water Intake, Sleep Recommendation)
- `/smartboard` — Digital whiteboard with freehand, shapes, text, undo/redo, PNG download
- `/canvas` — Infinite canvas with sticky notes, text boxes, shapes, pan/zoom
- `/splitscreen` — Split-screen teaching: file upload on left + annotation canvas on right
- `/formula` — Formula/Graph Finder: 19 STEM formulas across Algebra, Geometry, Trig, Physics, Chemistry with graph previews

## Database notes
`server/db.ts` uses plain JS arrays as the store, serialized to `data/db.json`.
Prisma schema exists but is NOT used at runtime — it documents the intended relational model.
`expandStudent`, `expandTeacher`, `expandAttendanceSession` are manual join helpers.

**Why:** The project was built to run on Replit without needing a provisioned PostgreSQL instance.

## Demo credentials
See `replit.md` for demo login identifiers and default passwords.
All accounts require a password change on first login.
