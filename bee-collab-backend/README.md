# BeeCollab — Backend

NestJS backend for **BeeCollab**, a real-time P2P video meeting platform. Handles authentication, meeting management, WebRTC signaling, live chat, and implements several SE design patterns.

📄 **Swagger UI:** [https://api.beecollab.joman.id/api/docs](https://api.beecollab.joman.id/api/docs)

---

## Tech Stack

| | |
|---|---|
| Framework | NestJS 11 (TypeScript) |
| Database | PostgreSQL via Prisma 7 (`@prisma/adapter-pg`) |
| Real-time | Socket.io — `/meetings` namespace |
| Auth | Passport.js + JWT |
| Events | `@nestjs/event-emitter` |
| API Docs | `@nestjs/swagger` |

---

## SE Design Patterns

### 1. Repository Pattern
All database access is abstracted behind interfaces (`IUserRepository`, `IMeetingRepository`, `IParticipantRepository`, `IChatRepository`). Services depend on the interface, not on Prisma directly. Concrete Prisma implementations are injected via DI tokens — satisfying the Dependency Inversion Principle.

```
src/repositories/
├── interfaces/         ← abstract contracts (IUserRepository, etc.)
├── prisma/             ← concrete Prisma implementations
├── tokens.ts           ← DI injection tokens
└── repository.module.ts
```

### 2. Decorator Pattern — Global Response Interceptor
`ResponseInterceptor` wraps every successful HTTP response in a consistent envelope without any controller changes:
```json
{ "success": true, "data": {}, "message": "Success", "timestamp": "...", "path": "..." }
```

### 3. Global Exception Filter
`HttpExceptionFilter` catches all `HttpException` instances and formats errors in the same envelope shape:
```json
{ "success": false, "error": "...", "statusCode": 404, "timestamp": "...", "path": "..." }
```

### 4. Swagger / OpenAPI
Full interactive docs at `/api/docs`. All endpoints documented with tags, operation summaries, param descriptions, and response status codes. DTOs have `@ApiProperty` with examples. JWT Bearer auth built in with `persistAuthorization`.

### 5. Observer Pattern — Event-Driven Architecture
Domain events are emitted by publishers and handled independently by `MeetingEventsListener`, with zero coupling between them.

| Event | Emitted by | Listener action |
|---|---|---|
| `meeting.ended` | `SignalingService`, `MeetingsService`, `CleanupService` | Audit log |
| `participant.joined` | `SignalingService` | Audit log |
| `participant.left` | `SignalingService` | Audit log + **auto-end meeting if empty** |

The auto-end feature was added entirely inside the listener — no publisher was modified, demonstrating the Open/Closed Principle.

---

## Project Structure

```text
src/
├── auth/                        # JWT auth, guards, login/register DTOs
│   ├── dto/auth.dto.ts
│   ├── guards/
│   │   ├── jwt-auth.guard.ts    # REST guard
│   │   └── ws-jwt.guard.ts      # WebSocket guard
│   ├── jwt.strategy.ts
│   ├── auth.service.ts
│   └── auth.controller.ts
├── chat/                        # Chat history REST endpoint
├── common/
│   ├── filters/
│   │   └── http-exception.filter.ts   # Pattern #3
│   └── interceptors/
│       └── response.interceptor.ts    # Pattern #2
├── events/                      # Pattern #5 — Observer
│   ├── meeting.events.ts        # Event payload classes
│   ├── meeting-events.listener.ts
│   └── events.module.ts
├── meetings/                    # Meeting CRUD + scheduled cleanup
│   ├── dto/meeting.dto.ts
│   ├── meetings.service.ts
│   ├── meetings.controller.ts
│   └── meetings.cleanup.service.ts
├── repositories/                # Pattern #1 — Repository
│   ├── interfaces/
│   ├── prisma/
│   ├── tokens.ts
│   └── repository.module.ts
├── signaling/                   # WebRTC signaling gateway (Socket.io)
│   ├── signaling.gateway.ts
│   ├── signaling.service.ts
│   └── signaling.types.ts
├── users/                       # User profile endpoint
├── prisma/                      # PrismaService + PrismaModule
├── app.module.ts
└── main.ts                      # Bootstrap, Swagger, CORS, global pipes
```

---

## REST API Endpoints

> All responses are wrapped in `ApiResponse`. See Swagger UI for full schema.

### Auth
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | — | Register new account |
| POST | `/auth/login` | — | Login, returns `access_token` |

### Users
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/users/me` | 🔒 JWT | Get current user's profile |

### Meetings
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/meetings` | 🔒 JWT | Create meeting, auto-assign HOST |
| GET | `/meetings` | 🔒 JWT | List my hosted meetings |
| GET | `/meetings/:id` | 🔒 JWT | Get meeting by ID |
| GET | `/meetings/code/:code` | 🔒 JWT | Resolve room code → meeting |
| POST | `/meetings/:id/join` | 🔒 JWT | Join meeting by room code |
| GET | `/meetings/:id/participants` | 🔒 JWT | List active participants |
| DELETE | `/meetings/:id` | 🔒 JWT | End meeting (HOST only) |

### Chat
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/meetings/:id/chat` | 🔒 JWT | Get chat history |

---

## WebSocket Events

Namespace: `/meetings`
Authentication: handshake `{ auth: { token: "JWT" } }`

| Client → Server | Payload | Notes |
|---|---|---|
| `meeting:join` | `{ meetingId, audioEnabled, videoEnabled }` | Joins socket room, emits `meeting:state` |
| `webrtc:offer` | `{ to, from, sdp }` | Relay to target socket |
| `webrtc:answer` | `{ to, from, sdp }` | Relay to target socket |
| `webrtc:ice-candidate` | `{ to, from, candidate }` | Relay to target socket |
| `media:toggle` | `{ meetingId, type, enabled }` | Persist + broadcast |
| `chat:message` | `{ meetingId, message }` | Persist + broadcast |
| `meeting:end` | `{ meetingId }` | HOST only |
| `meeting:kick` | `{ meetingId, targetSocketId }` | HOST/CO_HOST only |
| `hand:toggle` | `{ meetingId, raised }` | Broadcast to room |
| `media:force-mute` | `{ meetingId, targetSocketId }` | HOST/CO_HOST only |

---

## Environment Variables

```env
DATABASE_URL="postgresql://user:password@host:5432/dbname"
JWT_SECRET="your_secure_random_secret"
JWT_EXPIRES_IN="1d"
PORT=3000
```

---

## Setup

```bash
npm install
npx prisma generate
npx prisma db push
npm run start:dev
```

Swagger UI: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)

---

## Deployment (VPS)

```bash
git pull origin joshua
npm install
npm run build
pm2 restart beecollab-backend
```

---

## Author

**2802484110 — Reiki Indrasyahdewa Kierana**
Project: BeeCollab — Live Meeting Backend
