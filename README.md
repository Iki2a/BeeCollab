# 🐝 BeeCollab

**BeeCollab** is a premium, full-stack video conferencing platform inspired by Google Meet. Built for seamless real-time collaboration, it provides high-quality P2P video/audio, screen sharing, live chat, and a host of participant controls — with a polished, mobile-first experience.

🌐 **Live:** [https://beecollab.joman.id](https://beecollab.joman.id)
📄 **API Docs (Swagger):** [https://api.beecollab.joman.id/api/docs](https://api.beecollab.joman.id/api/docs)

---

## ✨ Features

### 🔐 Secure Authentication
- Full Sign In / Sign Up flow with **JWT** security
- **Password strength indicator** with live feedback
- **Show / hide password** toggle for easier typing on mobile
- **Logout confirmation modal** to prevent accidental logouts
- Persistent login via localStorage token
- Logged-in user's **display name** shown in the homepage header

### 📹 Real-Time Video Meetings
- **WebRTC Peer-to-Peer** audio and video streaming (full mesh, no SFU)
- **Screen Sharing**: present your screen to all participants instantly
- **Voice Activity Detection**: real-time speaking indicator
- **Auto-Autoplay Handling**: graceful "Ready to Join?" overlay on browser autoplay block
- **Device Settings**: switch microphone and camera mid-meeting

### 💬 Interactive Collaboration
- **Real-Time Chat**: messages persisted to DB and delivered to all participants
- **Hand Raise**: signal the host when you want to speak
- **Participant Management**:
  - Host & Co-host roles
  - Kick participants
  - Ask to unmute / Force mute
  - Live participant list with search
- **Meeting Info Modal**: view meeting name and shareable room code

### 📱 Modern & Responsive UI
- **Google Meet Inspired Design**: sleek, professional layout
- **Dynamic Video Grid**: auto-adjusts for participant count and screen sharing
- **Mobile-Optimized Meeting Room**: compact top bar, kebab menu for secondary controls, fullscreen chat
- **Adaptive Home Page**: inline time on desktop, floating pill on mobile
- **Branded Loading Screens**: consistent transitions between routes

---

## 🏗️ Software Engineering Design Patterns

This project implements the following SE patterns as part of the architecture:

| # | Pattern | Implementation |
|---|---|---|
| 1 | **Repository Pattern** | `src/repositories/` — abstracts all DB access behind interfaces (`IUserRepository`, `IMeetingRepository`, etc.), with Prisma implementations injected via DI tokens. Satisfies DIP from SOLID. |
| 2 | **Decorator Pattern** (Response Interceptor) | `ResponseInterceptor` wraps every HTTP response in a consistent `ApiResponse` envelope without touching any controller. |
| 3 | **Exception Filter** | `HttpExceptionFilter` centralises all error formatting into a single class — one source of truth for error shape. |
| 4 | **Swagger / OpenAPI** | Full interactive API documentation at `/api/docs`, with JWT auth, `@ApiProperty` on all DTOs, and documented status codes on every endpoint. |
| 5 | **Observer Pattern** (Event-Driven Architecture) | `@nestjs/event-emitter` — services emit domain events (`meeting.ended`, `participant.joined`, `participant.left`); `MeetingEventsListener` reacts independently. Enables auto-end of empty meetings without modifying any publisher (Open/Closed Principle). |

---

## 🚀 Tech Stack

### Frontend
| | |
|---|---|
| Framework | [Next.js 16](https://nextjs.org/) (App Router, React 19) |
| Language | TypeScript |
| Styling | CSS Modules + inline styles |
| Real-time | [Socket.io-client](https://socket.io/) |

### Backend
| | |
|---|---|
| Framework | [NestJS 11](https://nestjs.com/) |
| Language | TypeScript |
| Database | PostgreSQL (VPS — `103.143.12.138`) |
| ORM | [Prisma 7](https://www.prisma.io/) with `@prisma/adapter-pg` |
| Real-time | Socket.io Gateway — `/meetings` namespace |
| Auth | Passport.js + JWT (REST guards + WebSocket guards) |
| Events | `@nestjs/event-emitter` (Observer Pattern) |
| Docs | `@nestjs/swagger` — Swagger UI at `/api/docs` |
| Process Manager | PM2 (VPS deployment) |
| Reverse Proxy | Nginx + Certbot (HTTPS) |

---

## 🛠️ Getting Started

### Prerequisites
- Node.js v18+
- npm
- PostgreSQL database

### ⚡ Quick Start (Windows)
```bash
run.bat
```
Auto-installs dependencies and launches both apps in separate terminals.

> Requires `bee-collab-backend/.env` to be configured first.

### Manual Setup

#### 1. Backend
```bash
cd bee-collab-backend
npm install
```

Create `bee-collab-backend/.env`:
```env
DATABASE_URL="postgresql://user:password@host:5432/dbname"
JWT_SECRET="your_secure_random_secret"
JWT_EXPIRES_IN="1d"
PORT=3000
```

```bash
npx prisma generate
npx prisma db push
npm run start:dev
```

#### 2. Frontend
```bash
cd bee-collab-frontend
npm install
```

Create `bee-collab-frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001).

---

## 📂 Project Structure

```text
BeeCollab/
├── bee-collab-backend/          # NestJS — Signaling & REST API server
│   ├── prisma/
│   │   └── schema.prisma        # Database schema (User, Meeting, Participant, ChatMessage)
│   └── src/
│       ├── auth/                # JWT auth, guards, login/register
│       ├── chat/                # Chat REST endpoint + service
│       ├── common/
│       │   ├── filters/         # HttpExceptionFilter (Global Exception Filter)
│       │   └── interceptors/    # ResponseInterceptor (Global Response Wrapper)
│       ├── events/              # Observer Pattern — domain events + listener
│       │   ├── meeting.events.ts
│       │   ├── meeting-events.listener.ts
│       │   └── events.module.ts
│       ├── meetings/            # Meeting CRUD, cleanup scheduler, room code logic
│       ├── repositories/        # Repository Pattern — interfaces + Prisma implementations
│       │   ├── interfaces/      # IUserRepository, IMeetingRepository, etc.
│       │   ├── prisma/          # Concrete Prisma implementations
│       │   └── repository.module.ts
│       ├── signaling/           # WebRTC Signaling Gateway (Socket.io)
│       ├── users/               # User profile
│       ├── app.module.ts        # Root module
│       └── main.ts              # Bootstrap, CORS, Swagger, global pipes
├── bee-collab-frontend/         # Next.js 16 — Web app
│   └── src/app/
│       ├── login/               # Sign In / Sign Up page
│       ├── meeting/[id]/        # Meeting room (WebRTC, chat, controls)
│       └── page.tsx             # Homepage (join / create meeting)
├── run.bat                      # One-click launcher (Windows)
└── README.md
```

---

## 🌐 Deployment

| | URL |
|---|---|
| Frontend | `https://beecollab.joman.id` |
| Backend API | `https://api.beecollab.joman.id` |
| Swagger UI | `https://api.beecollab.joman.id/api/docs` |

Hosted on a VPS (`103.143.12.138`) with:
- **PM2** managing both Node.js processes
- **Nginx** as reverse proxy with separate virtual hosts
- **Certbot** for SSL certificates

---

## 🔌 WebSocket Events

Namespace: `/meetings` — auth via handshake `{ token: "JWT" }`

| Client → Server | Payload | Server → Client |
|---|---|---|
| `meeting:join` | `{ meetingId }` | `participant:joined`, `meeting:state`, `chat:history` |
| `webrtc:offer` | `{ to, from, sdp }` | `webrtc:offer` (to target) |
| `webrtc:answer` | `{ to, from, sdp }` | `webrtc:answer` (to target) |
| `webrtc:ice-candidate` | `{ to, from, candidate }` | `webrtc:ice-candidate` (to target) |
| `media:toggle` | `{ meetingId, type, enabled }` | `media:updated` (to room) |
| `chat:message` | `{ meetingId, message }` | `chat:message` (to room) |
| `meeting:end` | `{ meetingId }` | `meeting:ended` (HOST only) |
| `meeting:kick` | `{ meetingId, targetSocketId }` | `meeting:kicked` (HOST only) |
| `hand:toggle` | `{ meetingId, raised }` | `hand:updated` (to room) |
| `media:force-mute` | `{ meetingId, targetSocketId }` | `media:force-mute` (HOST only) |
| *disconnect* | — | `participant:left` (to room) |

---

## 📝 License
This project is for educational and collaborative purposes.

---
*Created with ❤️ for BeeCollab Developers.*
