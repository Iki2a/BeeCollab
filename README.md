# BeeCollab - Live Meeting Backend

BeeCollab adalah back-end project untuk aplikasi **live meeting** seperti Google Meet, Zoom, atau Cisco Webex. Project ini berfokus pada pengelolaan meeting room, autentikasi user, participant management, chat, dan real-time signaling menggunakan **NestJS**.

> Catatan: Untuk MVP, audio/video meeting dapat menggunakan **WebRTC peer-to-peer**. Backend tidak mengirim stream video secara langsung, melainkan menjadi server untuk autentikasi, manajemen meeting, dan signaling antar-user. Untuk skala besar, project dapat dikembangkan dengan SFU seperti mediasoup, LiveKit, atau Jitsi.

---

## Daftar Isi

- [Tentang Project](#tentang-project)
- [Fitur Utama](#fitur-utama)
- [Tech Stack](#tech-stack)
- [Arsitektur Singkat](#arsitektur-singkat)
- [Alur Sistem](#alur-sistem)
- [Struktur Folder](#struktur-folder)
- [Database Design](#database-design)
- [REST API Endpoint](#rest-api-endpoint)
- [WebSocket Event](#websocket-event)
- [Environment Variables](#environment-variables)
- [Cara Menjalankan Project](#cara-menjalankan-project)
- [Testing](#testing)
- [Roadmap](#roadmap)
- [Author](#author)

---

## Tentang Project

**BeeCollab** adalah backend service untuk aplikasi meeting online yang memungkinkan user untuk membuat meeting room, bergabung ke meeting, melihat daftar participant, mengirim chat, dan melakukan proses signaling untuk koneksi audio/video secara real-time.

Project ini dibuat menggunakan **NestJS** karena framework ini mendukung struktur modular, dependency injection, guard, interceptor, decorator, dan WebSocket gateway yang cocok untuk aplikasi real-time.

---

## Fitur Utama

### Authentication & Authorization
- Register user
- Login user
- JWT authentication
- Protected endpoint menggunakan guard
- Role participant: `HOST`, `CO_HOST`, `PARTICIPANT`

### Meeting Management
- Membuat meeting room
- Generate room code / meeting ID
- Join meeting
- Leave meeting
- End meeting oleh host
- Melihat detail meeting
- Melihat daftar participant

### Real-Time Communication
- WebSocket gateway untuk komunikasi real-time
- Participant join/leave notification
- Meeting status update
- Chat real-time di dalam meeting room

### WebRTC Signaling
- Mengirim SDP offer
- Mengirim SDP answer
- Mengirim ICE candidate
- Forward signaling data ke participant tujuan
- Mendukung koneksi audio/video antar-user

### Participant Controls
- Mute/unmute microphone status
- Turn on/off camera status
- Host dapat mengeluarkan participant
- Host dapat mengakhiri meeting

---

## Tech Stack

| Kebutuhan | Teknologi |
|---|---|
| Backend Framework | NestJS |
| Language | TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Authentication | JWT |
| Realtime Communication | WebSocket / Socket.IO |
| Cache & Pub/Sub | Redis |
| API Documentation | Swagger |
| Containerization | Docker |
| Testing | Jest |

---

## Arsitektur Singkat

```text
Client Web / Mobile
        |
        | REST API
        v
NestJS Backend
        |
        |-- Auth Module
        |-- Users Module
        |-- Meetings Module
        |-- Participants Module
        |-- Chat Module
        |-- Signaling Gateway
        |
        | Database
        v
PostgreSQL

Client <------ WebSocket Signaling ------> Client
Client <---------- WebRTC Media ----------> Client
```

Pada arsitektur ini:

1. REST API digunakan untuk autentikasi, membuat meeting, join meeting, dan mengambil data meeting.
2. WebSocket digunakan untuk event real-time seperti participant join, participant leave, chat, dan signaling WebRTC.
3. WebRTC digunakan oleh client untuk mengirim audio/video secara langsung.
4. PostgreSQL menyimpan data user, meeting, participant, dan chat.
5. Redis dapat digunakan untuk scaling WebSocket jika backend berjalan di lebih dari satu instance.

---

## Alur Sistem

### 1. User Login
User login menggunakan email dan password. Jika data valid, server mengembalikan JWT access token.

```text
POST /api/v1/auth/login
```

### 2. Host Membuat Meeting
Host membuat meeting room melalui REST API. Server akan membuat data meeting dan menghasilkan room code.

```text
POST /api/v1/meetings
```

### 3. Participant Join Meeting
Participant memasukkan room code atau meeting ID. Server memvalidasi meeting lalu menambahkan participant ke meeting.

```text
POST /api/v1/meetings/:meetingId/join
```

### 4. Client Connect ke WebSocket
Setelah join meeting, client membuka koneksi WebSocket ke namespace meeting.

```text
ws://localhost:3000/meetings
```

### 5. WebRTC Signaling
Client saling bertukar `offer`, `answer`, dan `ice-candidate` melalui WebSocket gateway.

```text
User A -> Backend -> User B
User B -> Backend -> User A
```

### 6. Media Stream Berjalan
Setelah signaling selesai, audio/video berjalan lewat WebRTC antar-client.

---

## Struktur Folder

```text
src/
├── app.module.ts
├── main.ts
├── common/
│   ├── decorators/
│   ├── filters/
│   ├── guards/
│   ├── interceptors/
│   └── pipes/
├── config/
│   ├── app.config.ts
│   ├── database.config.ts
│   └── jwt.config.ts
├── database/
│   └── prisma.service.ts
├── modules/
│   ├── auth/
│   │   ├── dto/
│   │   ├── guards/
│   │   ├── strategies/
│   │   ├── auth.controller.ts
│   │   ├── auth.module.ts
│   │   └── auth.service.ts
│   ├── users/
│   │   ├── dto/
│   │   ├── users.controller.ts
│   │   ├── users.module.ts
│   │   └── users.service.ts
│   ├── meetings/
│   │   ├── dto/
│   │   ├── meetings.controller.ts
│   │   ├── meetings.module.ts
│   │   └── meetings.service.ts
│   ├── participants/
│   │   ├── dto/
│   │   ├── participants.module.ts
│   │   └── participants.service.ts
│   ├── chat/
│   │   ├── dto/
│   │   ├── chat.module.ts
│   │   └── chat.service.ts
│   └── signaling/
│       ├── dto/
│       ├── signaling.gateway.ts
│       ├── signaling.module.ts
│       └── signaling.service.ts
├── prisma/
│   └── schema.prisma
└── test/
```

---

## Database Design

### User

| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| name | String | Nama user |
| email | String | Email user, unique |
| passwordHash | String | Password yang sudah di-hash |
| avatarUrl | String? | Foto profil user |
| createdAt | DateTime | Waktu data dibuat |
| updatedAt | DateTime | Waktu data diubah |

### Meeting

| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| title | String | Judul meeting |
| roomCode | String | Kode meeting |
| hostId | UUID | ID host meeting |
| status | Enum | `SCHEDULED`, `LIVE`, `ENDED` |
| startedAt | DateTime? | Waktu meeting dimulai |
| endedAt | DateTime? | Waktu meeting berakhir |
| maxParticipants | Number | Maksimal participant |
| createdAt | DateTime | Waktu data dibuat |

### Participant

| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| meetingId | UUID | ID meeting |
| userId | UUID | ID user |
| socketId | String? | ID koneksi WebSocket |
| role | Enum | `HOST`, `CO_HOST`, `PARTICIPANT` |
| audioEnabled | Boolean | Status microphone |
| videoEnabled | Boolean | Status camera |
| joinedAt | DateTime | Waktu join |
| leftAt | DateTime? | Waktu leave |

### ChatMessage

| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| meetingId | UUID | ID meeting |
| senderId | UUID | ID pengirim |
| message | String | Isi pesan |
| type | Enum | `TEXT`, `SYSTEM` |
| createdAt | DateTime | Waktu pesan dikirim |

---

## REST API Endpoint

Base URL:

```text
http://localhost:3000/api/v1
```

### Auth

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Register user baru |
| POST | `/auth/login` | Login user |
| GET | `/auth/me` | Mengambil data user yang sedang login |
| POST | `/auth/logout` | Logout user |

### Users

| Method | Endpoint | Description |
|---|---|---|
| GET | `/users/:id` | Mengambil detail user |
| PATCH | `/users/:id` | Update profile user |

### Meetings

| Method | Endpoint | Description |
|---|---|---|
| POST | `/meetings` | Membuat meeting baru |
| GET | `/meetings` | Mengambil list meeting user |
| GET | `/meetings/:meetingId` | Mengambil detail meeting |
| POST | `/meetings/:meetingId/join` | Join ke meeting |
| POST | `/meetings/:meetingId/leave` | Leave dari meeting |
| PATCH | `/meetings/:meetingId/end` | Mengakhiri meeting |
| GET | `/meetings/:meetingId/participants` | Mengambil daftar participant |

### Participants

| Method | Endpoint | Description |
|---|---|---|
| PATCH | `/meetings/:meetingId/participants/:participantId/mute` | Mengubah status microphone |
| PATCH | `/meetings/:meetingId/participants/:participantId/camera` | Mengubah status camera |
| DELETE | `/meetings/:meetingId/participants/:participantId` | Mengeluarkan participant dari meeting |

### Chat

| Method | Endpoint | Description |
|---|---|---|
| GET | `/meetings/:meetingId/messages` | Mengambil chat history meeting |

---

## WebSocket Event

Namespace:

```text
/meetings
```

Connection URL:

```text
ws://localhost:3000/meetings
```

Authentication dapat dikirim melalui handshake auth.

```json
{
  "token": "JWT_ACCESS_TOKEN"
}
```

### Client to Server Events

#### Join Meeting Room

```text
meeting:join
```

Payload:

```json
{
  "meetingId": "meeting-uuid"
}
```

#### Leave Meeting Room

```text
meeting:leave
```

Payload:

```json
{
  "meetingId": "meeting-uuid"
}
```

#### Send WebRTC Offer

```text
webrtc:offer
```

Payload:

```json
{
  "meetingId": "meeting-uuid",
  "to": "target-socket-id",
  "sdp": {}
}
```

#### Send WebRTC Answer

```text
webrtc:answer
```

Payload:

```json
{
  "meetingId": "meeting-uuid",
  "to": "target-socket-id",
  "sdp": {}
}
```

#### Send ICE Candidate

```text
webrtc:ice-candidate
```

Payload:

```json
{
  "meetingId": "meeting-uuid",
  "to": "target-socket-id",
  "candidate": {}
}
```

#### Send Chat Message

```text
chat:send
```

Payload:

```json
{
  "meetingId": "meeting-uuid",
  "message": "Halo semuanya"
}
```

#### Update Media Status

```text
media:toggle
```

Payload:

```json
{
  "meetingId": "meeting-uuid",
  "audioEnabled": true,
  "videoEnabled": false
}
```

---

### Server to Client Events

| Event | Description |
|---|---|
| `meeting:joined` | User berhasil join room |
| `meeting:left` | User berhasil leave room |
| `participant:joined` | Ada participant baru |
| `participant:left` | Ada participant keluar |
| `participant:kicked` | Participant dikeluarkan host |
| `meeting:ended` | Meeting diakhiri host |
| `webrtc:offer` | Menerima SDP offer |
| `webrtc:answer` | Menerima SDP answer |
| `webrtc:ice-candidate` | Menerima ICE candidate |
| `chat:new-message` | Menerima pesan chat baru |
| `media:updated` | Status audio/video participant berubah |
| `error` | Error dari server |

---

## Environment Variables

Buat file `.env` berdasarkan contoh berikut:

```env
APP_NAME=BeeCollab
APP_PORT=3000
NODE_ENV=development

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/BeeCollab

JWT_SECRET=change_this_secret
JWT_EXPIRES_IN=1d

REDIS_HOST=localhost
REDIS_PORT=6379

CORS_ORIGIN=http://localhost:5173
```

---

## Cara Menjalankan Project

### 1. Clone Repository

```bash
git clone <GITHUB_REPOSITORY_URL>
cd bee-meet-backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Environment

```bash
cp .env.example .env
```

Lalu sesuaikan isi file `.env`.

### 4. Jalankan Database dan Redis

Jika menggunakan Docker:

```bash
docker compose up -d postgres redis
```

### 5. Generate Prisma Client

```bash
npx prisma generate
```

### 6. Jalankan Migration

```bash
npx prisma migrate dev
```

### 7. Jalankan Server

```bash
npm run start:dev
```

Server akan berjalan di:

```text
http://localhost:3000
```

Swagger API documentation dapat diakses di:

```text
http://localhost:3000/api/docs
```

---

## Testing

Menjalankan unit test:

```bash
npm run test
```

Menjalankan end-to-end test:

```bash
npm run test:e2e
```

Menjalankan test coverage:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
