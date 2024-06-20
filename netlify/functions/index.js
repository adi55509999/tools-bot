const { bot } = require('../../callback.js')

const http = require('http');
const express = require('express')
const { Server } = require('socket.io');
const variable = require('../../variables.js');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

io.on(`connected`, (socket) => {
    console.log('Client connected');

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

bot.launch({ dropPendingUpdates: true })
bot.telegram.sendMessage(variable.adminBot, `<b>Bot menyala!</b>\nSemua proses dibatalkan.`, { parse_mode: 'HTML' })

const port = process.env.PORT || 8000;

server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});