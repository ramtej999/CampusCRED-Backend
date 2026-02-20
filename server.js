const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Allowed origins
const allowedOrigins = [
    'http://localhost:5173',                   // dev frontend
    'https://campus-cred-frontend.vercel.app', // production frontend
    process.env.FRONTEND_URL                    // optional env variable
];

// CORS middleware
app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like Postman or server-to-server)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"]
}));

// JSON parsing
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Test route
app.get('/', (req, res) => {
    res.send('P2P Lending API is running...');
});

// Import Routes
const authRoutes = require('./routes/auth');
const loanRoutes = require('./routes/loans');
const offerRoutes = require('./routes/offers');

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/offers', offerRoutes);

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
