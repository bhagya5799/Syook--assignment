const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const crypto = require('crypto');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// MongoDB connection
mongoose.connect('mongodb+srv://bhagyashree:bhagya5799@cluster0.q2xpdj1.mongodb.net/?retryWrites=true&w=majority').then(
    () => console.log("DB Connected .....!")
).catch((error) => { // Fix typo here
    console.error('MongoDB Connection Error:', error);
});

const db = mongoose.connection;

db.on('error', (error) => {
    console.error('MongoDB Connection Error:', error);
});

db.once('open', () => {
    console.log('Connected to MongoDB');
});

// Define a Mongoose schema for your time-series data
const timeSeriesSchema = new mongoose.Schema({
    timestamp: Date,
    // Define other fields you want to save for each object
    name: String,
    origin: String,
    destination: String,
    secret_key: String,
    // ... other fields
});

// Create a model for your time-series data
const TimeSeriesModel = mongoose.model('TimeSeries', timeSeriesSchema);

// Listen for incoming socket connections
io.on('connection', (socket) => {
    console.log('A client connected');

    // Listen for the 'dataStream' event sent by the emitter
    socket.on('dataStream', (dataStream) => {
        console.log('Received data stream:', dataStream);

        // Split the data stream into individual encrypted messages
        const encryptedMessages = dataStream.split('|');

        // Process each encrypted message
        encryptedMessages.forEach(async (encryptedMessage) => {
            try {
                // Decrypt the message using the same AES key and IV used for encryption in the emitter
                const decipher = crypto.createDecipheriv(
                    'aes-256-ctr',
                    Buffer.from(AES_KEY),
                    IV
                );
                let decryptedMessage = decipher.update(
                    encryptedMessage,
                    'hex',
                    'utf8'
                );
                decryptedMessage += decipher.final('utf8');

                // Parse the decrypted message as JSON
                const parsedMessage = JSON.parse(decryptedMessage);

                // Validate data integrity using the secret_key
                const calculatedSecretKey = createHash(
                    JSON.stringify(parsedMessage)
                ).toString('hex');
                if (parsedMessage.secret_key === calculatedSecretKey) {
                    // Data integrity is valid, add a timestamp
                    parsedMessage.timestamp = new Date();

                    // Save the validated data to MongoDB
                    const timeSeriesData = new TimeSeriesModel(parsedMessage);
                    await timeSeriesData.save();
                    console.log('Data saved:', parsedMessage);
                } else {
                    console.log('Data integrity compromised. Discarding:', parsedMessage);
                }
            } catch (error) {
                console.error('Error processing message:', error);
            }
        });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('A client disconnected');
    });
});

// Start the server on port 4000
server.listen(4000, () => {
    console.log('Listener service is running on port 4000');
});
