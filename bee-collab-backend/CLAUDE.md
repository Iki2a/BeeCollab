# BeeCollab Backend — Implementation Progress

> **Status: ✅ COMPLETED** — Build passing, all modules implemented. Database: **Supabase PostgreSQL** via `@prisma/adapter-pg`.

---

## ✅ Completed Tasks

### Phase 1: Foundation
- [x] **Prisma Schema** (`prisma/schema.prisma`) — Models: `User`, `Meeting`, `Participant`, `ChatMessage` dengan enums `MeetingStatus`, `ParticipantRole`, `MessageType`
- [x] **PrismaModule** (`src/prisma/`) — Global module dengan `PrismaService` menggunakan **`@prisma/adapter-pg`** (Prisma v7 Driver Adapter, kompatibel dengan Supabase Supavisor/PgBouncer)
- [x] **ConfigModule** — Global, membaca `.env` otomatis
- [x] **main.ts** — `ValidationPipe` global + CORS enabled

### Phase 2: Authentication Module
- [x] **DTOs** (`src/auth/dto/auth.dto.ts`) — `RegisterDto`, `LoginDto` dengan `class-validator`
- [x] **JwtStrategy** (`src/auth/jwt.strategy.ts`) — Passport JWT Strategy, load user dari DB
- [x] **JwtAuthGuard** (`src/auth/guards/jwt-auth.guard.ts`) — Guard untuk REST endpoints
- [x] **WsJwtGuard** (`src/auth/guards/ws-jwt.guard.ts`) — Guard untuk WebSocket handshake & events
- [x] **AuthService** (`src/auth/auth.service.ts`) — `register` (bcrypt hash) + `login` (bcrypt compare) → return JWT
- [x] **AuthController** (`src/auth/auth.controller.ts`) — `POST /auth/register`, `POST /auth/login`
- [x] **AuthModule** (`src/auth/auth.module.ts`) — Export `JwtModule` & `WsJwtGuard`

### Phase 3: Users Module
- [x] **UsersService** (`src/users/users.service.ts`) — `getProfile` (tanpa `passwordHash`)
- [x] **UsersController** (`src/users/users.controller.ts`) — `GET /users/me` (JWT protected)
- [x] **UsersModule** (`src/users/users.module.ts`)

### Phase 4: Meetings Module (REST)
- [x] **DTOs** (`src/meetings/dto/meeting.dto.ts`) — `CreateMeetingDto`, `JoinMeetingDto`
- [x] **MeetingsService** (`src/meetings/meetings.service.ts`)
  - `createMeeting` — auto-generate `roomCode`, auto-assign `HOST` di `Participant`
  - `joinMeeting` — validate `roomCode` + kapasitas, upsert participant
  - `getParticipants` — return active participants dengan `socketId`
  - `endMeeting` — HOST-only, set `ENDED` + `endedAt`
  - `getMyMeetings`, `getMeetingById`
- [x] **MeetingsController** (`src/meetings/meetings.controller.ts`)
  - `POST /meetings`
  - `GET /meetings`
  - `GET /meetings/:meetingId`
  - `POST /meetings/:meetingId/join`
  - `GET /meetings/:meetingId/participants`
  - `DELETE /meetings/:meetingId`
- [x] **MeetingsModule** (`src/meetings/meetings.module.ts`)

### Phase 5: Chat Module
- [x] **ChatService** (`src/chat/chat.service.ts`) — `saveMessage`, `getMessages`
- [x] **ChatController** (`src/chat/chat.controller.ts`) — `GET /meetings/:meetingId/chat`
- [x] **ChatModule** (`src/chat/chat.module.ts`)

### Phase 6: Signaling Module (WebSocket + WebRTC)
- [x] **SignalingService** (`src/signaling/signaling.service.ts`)
  - `handleJoin` — update `socketId`, auto-start meeting → `LIVE`
  - `handleDisconnect` — nullify `socketId`, set `leftAt`
  - `toggleMedia` — persist `audioEnabled`/`videoEnabled`
  - `endMeeting` — HOST-only check
- [x] **SignalingGateway** (`src/signaling/signaling.gateway.ts`) — Namespace `/meetings`
  - `handleConnection` / `handleDisconnect` — lifecycle hooks
  - `meeting:join` → join socket room, emit `participant:joined` + `meeting:state`
  - `webrtc:offer` → relay to `targetSocketId`
  - `webrtc:answer` → relay to `targetSocketId`
  - `webrtc:ice-candidate` → relay to `targetSocketId`
  - `media:toggle` → persist + broadcast `media:updated`
  - `chat:message` → persist + broadcast ke room
  - `meeting:end` → HOST-only, broadcast `meeting:ended`
  - `meeting:kick` → HOST-only, emit `meeting:kicked` ke target
- [x] **SignalingModule** (`src/signaling/signaling.module.ts`)

---

## 📁 Final Directory Structure

```
src/
├── auth/
│   ├── dto/auth.dto.ts
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   └── ws-jwt.guard.ts
│   ├── jwt.strategy.ts
│   ├── auth.service.ts
│   ├── auth.controller.ts
│   └── auth.module.ts
├── chat/
│   ├── chat.service.ts
│   ├── chat.controller.ts
│   └── chat.module.ts
├── meetings/
│   ├── dto/meeting.dto.ts
│   ├── meetings.service.ts
│   ├── meetings.controller.ts
│   └── meetings.module.ts
├── prisma/
│   ├── prisma.service.ts
│   └── prisma.module.ts
├── signaling/
│   ├── signaling.service.ts
│   ├── signaling.gateway.ts
│   └── signaling.module.ts
├── users/
│   ├── users.service.ts
│   ├── users.controller.ts
│   └── users.module.ts
├── app.module.ts
└── main.ts
```

---

## 🔧 WebSocket Events Reference

| Event (Client → Server) | Payload | Response (Server → Client) |
|---|---|---|
| `meeting:join` | `{ meetingId }` | `participant:joined` (to room), `meeting:state` (to sender) |
| `webrtc:offer` | `{ to, from, sdp }` | `webrtc:offer` (to target) |
| `webrtc:answer` | `{ to, from, sdp }` | `webrtc:answer` (to target) |
| `webrtc:ice-candidate` | `{ to, from, candidate }` | `webrtc:ice-candidate` (to target) |
| `media:toggle` | `{ meetingId, type, enabled }` | `media:updated` (to room) |
| `chat:message` | `{ meetingId, message }` | `chat:message` (to room, with DB id) |
| `meeting:end` | `{ meetingId }` | `meeting:ended` (to room) — HOST only |
| `meeting:kick` | `{ meetingId, targetSocketId }` | `meeting:kicked` (to target) — HOST only |
| *disconnect* | — | `participant:left` (to room) |

---

## 🚀 Setup Supabase (Step-by-Step)

### 1. Buat Project Supabase
1. Buka [supabase.com](https://supabase.com) → New Project
2. Pilih region terdekat (Singapore untuk Indonesia)

### 2. Ambil Connection Strings
1. Di dashboard Supabase → klik **"Connect"** (pojok kanan atas)
2. Tab **"ORMs"** → copy:
   - **Transaction Pooler** (port 6543) → untuk `DATABASE_URL` (runtime)
   - **Direct Connection** (port 5432) → untuk `DIRECT_URL` (migration)

### 3. Update `.env`
```env
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres"
JWT_SECRET="ganti_dengan_string_acak_panjang"
JWT_EXPIRES_IN="1d"
PORT=3000
```

### 4. Jalankan Migrasi
```bash
npx prisma migrate dev --name init
```

### 5. Jalankan Server
```bash
npm run start:dev
```