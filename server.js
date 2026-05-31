const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

// rooms: { roomId: { players: [ws, ws], state: { 0: [...magnets], 1: [...magnets] } } }
const rooms = new Map();

app.use(express.static(path.join(__dirname, 'public')));

app.get('/new', (req, res) => {
  const roomId = uuidv4().slice(0, 8);
  res.json({ roomId });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://localhost`);
  const roomId = url.searchParams.get('room');

  if (!roomId) {
    ws.close(1008, 'No room specified');
    return;
  }

  if (!rooms.has(roomId)) {
    rooms.set(roomId, { players: [], state: { 0: [], 1: [] } });
  }

  const room = rooms.get(roomId);

  if (room.players.length >= 2) {
    ws.send(JSON.stringify({ type: 'error', message: 'Room is full' }));
    ws.close();
    return;
  }

  const playerIndex = room.players.length;
  room.players.push(ws);
  ws.playerIndex = playerIndex;
  ws.roomId = roomId;

  ws.send(JSON.stringify({
    type: 'init',
    playerIndex,
    state: room.state
  }));

  broadcast(room, { type: 'player_joined', count: room.players.length }, ws);

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === 'board_update') {
      room.state[msg.playerIndex] = msg.magnets;
      broadcast(room, {
        type: 'board_update',
        playerIndex: msg.playerIndex,
        magnets: msg.magnets
      }, ws);
    }

    if (msg.type === 'reset') {
      room.state[msg.playerIndex] = [];
      broadcast(room, {
        type: 'reset',
        playerIndex: msg.playerIndex
      }, ws);
    }
  });

  ws.on('close', () => {
    room.players = room.players.filter(p => p !== ws);
    broadcast(room, { type: 'player_left', count: room.players.length });
    if (room.players.length === 0) {
      setTimeout(() => {
        if (rooms.get(roomId)?.players.length === 0) {
          rooms.delete(roomId);
        }
      }, 60000 * 30);
    }
  });
});

function broadcast(room, msg, exclude = null) {
  const data = JSON.stringify(msg);
  room.players.forEach(p => {
    if (p !== exclude && p.readyState === WebSocket.OPEN) {
      p.send(data);
    }
  });
}

server.listen(PORT, () => {
  console.log(`Fridge poetry running on port ${PORT}`);
});
