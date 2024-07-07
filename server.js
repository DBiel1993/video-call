const { createServer } = require('http');
const { Server } = require('ws');
const express = require('express');
const path = require('path');

const app = express();
const server = createServer(app);
const wss = new Server({ server });

app.use(express.static(path.join(__dirname, '../public')));

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    });
});

server.listen(8080, () => {
    console.log('Signaling server running on ws://localhost:8080');
});

module.exports = app;