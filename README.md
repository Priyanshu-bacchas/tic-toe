# Zero Cross — backend + Neon database

This repository preserves the existing React screens and game files. The backend/API and Neon schema are being added alongside them; the existing frontend is still the earlier local-storage implementation and has **not yet been fully connected to these APIs**.

## Neon setup (manual SQL)
1. Create a project at https://neon.tech/.
2. Open SQL Editor in Neon.
3. Open [database/neon-schema.sql](database/neon-schema.sql), copy the complete SQL and run it.
4. In Neon, choose Connect and copy the PostgreSQL connection string. Keep sslmode=require.

## Backend setup
```bash
cd server
npm install
```
Copy `.env.example` to `.env` and fill in:
```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DB?sslmode=require"
JWT_SECRET="use-a-long-random-secret-of-at-least-32-characters"
CLIENT_URL="http://localhost:5173"
PORT=5000
```
Then:
```bash
npx prisma generate
npm run dev
```
Health check: http://localhost:5000/api/health

## Database tables
- User: name, email, bcrypt password hash, Game ID, optional bcrypt PIN hash.
- GameStats: wins, losses, draws.
- Message: sender, receiver, content, read timestamp, expiry timestamp.
- ChatPreference: one-to-one conversation timer: off / after_seen / 24h / 7d.
- CallLog: caller, receiver, voice/video type, status and timestamps.

## API
- POST /api/auth/register — name, email, password.
- POST /api/auth/login — email, password.
- GET /api/auth/me — JWT required.
- GET /api/users/search?q=GAME_ID_OR_EMAIL — JWT required.
- GET /api/game/stats and PUT /api/game/stats — JWT required.
- PUT /api/chat/pin and POST /api/chat/unlock — private PIN setup/verification.
- GET /api/chat/contacts; GET /api/chat/:userId; POST /api/chat/message.
- GET/PUT /api/chat/:userId/settings — disappearing timer preference.
- POST /api/calls and PUT /api/calls/:id/end — call log.
- Socket.IO events: message:new, message:deleted, chat:setting-changed, call:signal, call:end.

## Disappearing messages
Timer preferences are stored per one-to-one chat and apply to new messages. 24h and 7d messages receive an expiry timestamp. After seen starts a 3-second grace period when the recipient opens the conversation. The backend periodically deletes expired rows and broadcasts message:deleted to both participants.

## Important current limitations
- Existing React login/chat/game components have not yet been migrated from localStorage to JWT/API calls. Do not assume two-account chat works in the browser until that frontend integration and end-to-end testing is completed.
- Call signalling endpoints/events are scaffolding only; real audio/video requires WebRTC, device permissions and a TURN server.
- PIN is an access gate, not end-to-end encryption. Message content is stored in the database.
- Keep .env private; never commit your Neon URL or JWT secret.
