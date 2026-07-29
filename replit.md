# SMARTCLASS

A full-stack classroom management and kiosk system for Exequiel R. Lina High School (ERLHS).

## Overview

SMARTCLASS is a responsive web application that functions as both a classroom kiosk (22–24" touchscreen) and a web app accessible on desktop, tablet, and mobile. It features:

- **Idle Screen** — Digital Announcement Board for the kiosk
- **Student Portal** — Dashboard, subjects, schedule, attendance, academic performance
- **Teacher Portal** — Attendance management, presentation mode, academic performance
- **Admin Portal** — Full management of students, teachers, academic structure, announcements, settings

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS |
| Backend | Node.js + Express + TypeScript |
| ORM | Prisma |
| Database | PostgreSQL (Replit built-in) |
| Auth | JWT + HTTP-only Cookies + bcrypt |
| Forms | React Hook Form + Zod |

## Design System

- **Primary**: School Green `#4E7D4B`
- **Secondary**: Academic Gold `#C89A2B`
- **Accent**: Torch Orange `#E86A1D`
- **Fonts**: Poppins (headings) + Inter (body)

## Running the App

```bash
npm run dev
```

This starts:
- Vite dev server on port 5000 (frontend)
- Express API on port 3001 (backend)

## Default Credentials

| Role | Username/ID | Password |
|------|------------|----------|
| Admin | `admin` | `admin123` |
| Teacher | `teacher@erlhs.edu.ph` | `teacher123` |
| Student | `2024-00001` | `student123` |

> All demo accounts require a password change on first login.

## Project Structure

```
├── client/          # React frontend (Vite)
│   └── src/
│       ├── pages/   # All page components
│       ├── components/  # Shared UI components
│       └── lib/     # Auth context, API client, utils
├── server/          # Express backend
│   ├── routes/      # API route handlers
│   ├── middleware/  # Auth middleware
│   └── seed.ts      # Database seed script
├── prisma/
│   └── schema.prisma  # Database schema
└── uploads/         # File uploads (local storage)
```

## User Preferences

- Modern, responsive design — works on kiosk (22–24"), desktop, tablet, mobile
- Touchscreen-friendly with large touch targets
- School color scheme with Poppins + Inter typography
- Super responsive UI following modern design principles
