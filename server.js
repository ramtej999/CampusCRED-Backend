const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: [
        'http://localhost:5173',
        'https://campus-cred-frontend.vercel.app',
        process.env.FRONTEND_URL
    ],
    credentials: true
}));
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.get('/', (req, res) => {
    res.send('P2P Lending API is running...');
});

// Import Routes
const authRoutes = require('./routes/auth');
const loanRoutes = require('./routes/loans');
const offerRoutes = require('./routes/offers');

app.use('/api/auth', authRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/offers', offerRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
