# 🐝 BeeCollab

**BeeCollab** is a premium, full-stack video conferencing platform inspired by Google Meet. Built for seamless collaboration, it provides high-quality real-time communication, screen sharing, and interactive meeting features — with a polished, mobile-first experience.

![BeeCollab Preview](https://raw.githubusercontent.com/lucide-react/lucide/main/icons/video.svg)

---

## ✨ Features

### 🔐 Secure Authentication
- Full Sign In / Sign Up flow with **JWT** security.
- **Password strength indicator** with live feedback (minimum-length progress counter that shifts color as you type).
- **Show / hide password** toggle (eye icon) for easier typing on mobile.
- **Logout confirmation modal** so accidental clicks don't end your session.
- Protected routes and session management.
- Persistent login using local storage tokens.

### 📹 Real-Time Video Meetings
- **WebRTC Peer-to-Peer** audio and video streaming.
- **Screen Sharing**: Present your screen to all participants instantly.
- **Voice Activity Detection**: Real-time indication of who is currently speaking.
- **Auto-Autoplay Handling**: Graceful "Ready to Join?" overlay when the browser blocks autoplay.
- **Device Settings**: Pick your preferred microphone and camera mid-meeting.

### 💬 Interactive Collaboration
- **Real-Time Chat**: Send messages within the meeting room, with long-message wrapping and fullscreen mobile chat.
- **Hand Raise**: Signal the host when you want to speak.
- **Participant Management**:
  - Host & Co-host roles.
  - Kick participants.
  - Ask to unmute / Force mute.
  - View active participant list with search.
- **Meeting Info Modal**: View the meeting name and shareable code with one tap.

### 📱 Modern & Responsive UI
- **Google Meet Inspired Design**: Sleek, professional interface with a clean layout.
- **Dynamic Video Grid**: Automatically adjusts based on participant count and screen sharing status.
- **Mobile-Optimized Meeting Room**:
  - Compact top bar with meeting title chip + connection status dot + pill-shaped leave button.
  - Kebab menu consolidates screen share & device settings on small screens.
  - Chat opens fullscreen; participants list appears as a centered modal.
- **Adaptive Home Page**:
  - Date & time shows inline in the header on desktop, becomes a floating pill on mobile that smoothly slides toward the top corner on scroll.
  - System status indicator floats in the bottom-left corner (always visible).
- **Branded Loading Screens**: Consistent green-themed loading transitions between Home and Meeting routes.
- **Responsive Meeting End Screen**: Scales gracefully from desktop down to narrow mobile, with auto-return countdown.
- **Network Aware**: Backend is configured to support cross-device testing on local networks.

---

## 🚀 Tech Stack

### Frontend
- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, React 19)
- **Language**: TypeScript
- **Styling**: CSS Modules + inline styles (custom design system)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Real-time**: [Socket.io-client](https://socket.io/)

### Backend
- **Framework**: [NestJS 11](https://nestjs.com/)
- **Language**: TypeScript
- **Database**: [PostgreSQL](https://www.postgresql.org/) (via [Supabase](https://supabase.com/))
- **ORM**: [Prisma](https://www.prisma.io/) (v7, with `@prisma/adapter-pg` driver adapter)
- **Real-time**: [Socket.io](https://socket.io/) Gateway on the `/meetings` namespace
- **Auth**: Passport.js & JWT (REST + WebSocket guards)

---

## 🛠️ Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- A PostgreSQL database (or Supabase project)

### ⚡ Quick Start (Windows)
A one-click launcher script is provided for convenience. From the repo root:
```bash
run.bat
```
On first run it auto-installs dependencies for both apps and generates the Prisma client. On subsequent runs it skips straight to launching the backend and frontend in separate terminal windows.

> Make sure `bee-collab-backend/.env` is set up before running (see template below).

### Manual Setup

#### 1. Backend Setup
```bash
cd bee-collab-backend
npm install
```
- Create a `.env` file in `bee-collab-backend/`:
```env
DATABASE_URL="your_supabase_transaction_pooler_url"
DIRECT_URL="your_supabase_direct_connection_url"
JWT_SECRET="your_secure_random_secret"
JWT_EXPIRES_IN="1d"
PORT=3000
```
- Initialize Database:
```bash
npx prisma generate
npx prisma db push
```
- Start Backend:
```bash
npm run start:dev
```

#### 2. Frontend Setup
```bash
cd bee-collab-frontend
npm install
```
- Start Frontend:
```bash
npm run dev
```
- Access the app at `http://localhost:3001` (or your local IP for cross-device testing).

---

## 📂 Project Structure

```text
BeeCollab/
├── bee-collab-backend/          # NestJS (Signaling & Management Server)
│   ├── prisma/                  # Database Layer
│   │   └── schema.prisma        # Database schema & relationships
│   ├── src/
│   │   ├── auth/                # Auth (JWT, Guards, Strategies, Login/Register)
│   │   ├── meetings/            # Meeting CRUD, validation & room code logic
│   │   ├── signaling/           # WebRTC Signaling Gateway (Socket.io)
│   │   ├── chat/                # Real-time chat & message persistence
│   │   ├── users/               # User profile management
│   │   ├── prisma/              # Prisma Client Service & Module
│   │   ├── app.module.ts        # Root application module
│   │   └── main.ts              # Entry point, CORS & binding (0.0.0.0:3000)
│   ├── .env.example             # Template for backend environment variables
│   └── package.json             # Backend dependencies & scripts
├── bee-collab-frontend/         # Next.js 16 (Frontend Web App)
│   ├── public/                  # Static assets & illustrations
│   ├── src/app/
│   │   ├── login/               # Sign In / Sign Up (single page, mode toggle)
│   │   ├── meeting/[id]/        # Core Meeting Room (WebRTC, UI & Signaling)
│   │   ├── globals.css          # Global Design System & CSS Variables
│   │   ├── layout.tsx           # Root layout & global providers
│   │   ├── not-found.tsx        # Custom 404 Error Page
│   │   ├── page.module.css      # Home page styles & responsive rules
│   │   └── page.tsx             # Homepage Dashboard (Join / Create Meeting)
│   ├── next.config.ts           # Next.js configuration
│   └── package.json             # Frontend dependencies & scripts
├── run.bat                      # One-click launcher (Windows)
└── README.md                    # Unified Project Documentation
```

---

## 🌐 Network Testing
BeeCollab is configured to be accessible across your local network.
1. Find your local IP address (e.g., `192.168.1.XX`).
2. Update the `next.config.ts` `allowedDevOrigins` if necessary.
3. Access the frontend via `http://YOUR_IP:3001`.
4. The backend explicitly listens on `0.0.0.0:3000` to facilitate these connections.

---

## 📝 License
This project is for educational and collaborative purposes.

---
*Created with ❤️ for BeeCollab Developers.*
