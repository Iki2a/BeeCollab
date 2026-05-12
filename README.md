# 🐝 BeeCollab

**BeeCollab** is a premium, full-stack video conferencing platform inspired by Google Meet. Built for seamless collaboration, it provides high-quality real-time communication, screen sharing, and interactive meeting features.

![BeeCollab Preview](https://raw.githubusercontent.com/lucide-react/lucide/main/icons/video.svg)

---

## ✨ Features

### 🔐 Secure Authentication
- Full Register/Login flow with **JWT** security.
- Protected routes and session management.
- Persistent login using local storage tokens.

### 📹 Real-Time Video Meetings
- **WebRTC Peer-to-Peer** audio and video streaming.
- **Screen Sharing**: Present your screen to all participants instantly.
- **Voice Activity Detection**: Real-time indication of who is currently speaking.
- **Auto-Autoplay Handling**: Smooth handling of browser autoplay restrictions.

### 💬 Interactive Collaboration
- **Real-Time Chat**: Send messages within the meeting room.
- **Hand Raise**: Signal the host when you want to speak.
- **Participant Management**: 
  - Host & Co-host roles.
  - Kick participants.
  - Ask to unmute / Force mute.
  - View active participant list.

### 📱 Modern & Responsive UI
- **Google Meet Inspired Design**: Sleek, professional interface with a clean layout.
- **Dynamic Video Grid**: Automatically adjusts based on participant count and screen sharing status.
- **Mobile Optimized**: Fully responsive controls and video views for on-the-go meetings.
- **Network Aware**: Backend is configured to support cross-device testing on local networks.

---

## 🚀 Tech Stack

### Frontend
- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Styling**: Vanilla CSS (Premium Custom Design)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Real-time**: [Socket.io-client](https://socket.io/)

### Backend
- **Framework**: [NestJS](https://nestjs.com/)
- **Language**: TypeScript
- **Database**: [PostgreSQL](https://www.postgresql.org/) (via [Supabase](https://supabase.com/))
- **ORM**: [Prisma](https://www.prisma.io/)
- **Real-time**: [Socket.io](https://socket.io/) Gateway
- **Auth**: Passport.js & JWT

---

## 🛠️ Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- A PostgreSQL database (or Supabase project)

### 1. Backend Setup
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

### 2. Frontend Setup
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
├── bee-collab-frontend/         # Next.js 15 (Frontend Web App)
│   ├── public/                  # Static assets & illustrations
│   ├── src/app/
│   │   ├── (auth)/              # Auth-related route groups (Login/Register)
│   │   ├── meeting/[id]/        # Core Meeting Room (WebRTC, UI & Signaling)
│   │   ├── globals.css          # Global Design System & CSS Variables
│   │   ├── layout.tsx           # Root layout & global providers
│   │   ├── not-found.tsx        # Custom 404 Error Page
│   │   └── page.tsx             # Homepage Dashboard (Join/Create Meeting)
│   ├── next.config.ts           # Next.js configuration
│   └── package.json             # Frontend dependencies & scripts
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
