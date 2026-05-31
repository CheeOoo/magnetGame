# fridge poetry

Multiplayer word magnet game. Two players, private rooms, real-time sync over WebSocket.

## Local dev

```bash
npm install
npm start
# open http://localhost:3000
```

## Deploy to Render

1. Push this folder to a GitHub repo
2. On Render → New → Web Service → connect your repo
3. Settings:
   - **Build command:** `npm install`
   - **Start command:** `node server.js`
   - **Environment:** Node
4. Deploy — Render gives you a public URL
5. Open the URL, click **Create new room**, copy the link, send to your friend

## How it works

- `/new` — generates a random 8-char room ID
- WebSocket connects with `?room=<id>`
- First player to join gets index 0, second gets index 1
- Each player sees their own board (interactive) + the other's board (read-only, live)
- Board state is serialized as percentage positions so it scales to any screen size
- Updates are throttled to ~30ms to avoid flooding
- Rooms are cleaned up 30 minutes after both players leave
