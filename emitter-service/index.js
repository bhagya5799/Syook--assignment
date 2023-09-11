const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);


const AES_KEY = crypto.randomBytes(32); // Replace with your own passphrase
const IV = crypto.randomBytes(16); // Generate a random IV (16 bytes)

// Sample data for names and cities
const data = require('./data.json');
const names = data.names;
const cities = data.cities;

// Function to create a SHA-256 hash
const createHash = (data) => {
    const hash = crypto.createHash('sha256');
    hash.update(data);
    return hash.digest();
};


// Function to encrypt a message using AES-256-CTR
const encryptMessage = (message) => {
    const cipher = crypto.createCipheriv('aes-256-ctr', Buffer.from(AES_KEY), IV);
    let encrypted = cipher.update(message, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
};

// Function to generate a random message
const generateMessage = () => {
    const randomName = names[Math.floor(Math.random() * names.length)];
    const randomOrigin = cities[Math.floor(Math.random() * cities.length)];
    const randomDestination = cities[Math.floor(Math.random() * cities.length)];

    const originalMessage = {
        name: randomName,
        origin: randomOrigin,
        destination: randomDestination,
    };

    const secretKey = createHash(JSON.stringify(originalMessage));

    const message = {
        ...originalMessage,
        secret_key: secretKey.toString('hex'), // Convert the hash to a hexadecimal string
    };

    return encryptMessage(JSON.stringify(message));
};

// Periodically send messages every 10 seconds
setInterval(() => {
    const numberOfMessages = Math.floor(Math.random() * (499 - 49 + 1)) + 49;
    let messageStream = '';
    for (let i = 0; i < numberOfMessages; i++) {
        messageStream += generateMessage() + '|';
    }
    io.emit('dataStream', messageStream);
}, 10000);

// Start the server
server.listen(3000, () => {
    console.log('Emitter service is running on port 3000');
});
