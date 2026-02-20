const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const algosdk = require('algosdk');

// @route   POST api/auth/register
// @desc    Register user
router.post('/register', async (req, res) => {
    const { name, email, password, address, mnemonic, role } = req.body;

    try {
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        let newAddress = address;
        let newMnemonic = mnemonic;

        if (!newAddress || !newMnemonic) {
            const account = algosdk.generateAccount();
            newAddress = account.addr;
            newMnemonic = algosdk.secretKeyToMnemonic(account.sk);
        }

        user = new User({
            name,
            email,
            password,
            address: newAddress,
            mnemonic: newMnemonic,
            role
        });

        await user.save();

        const payload = {
            user: { id: user.id }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '30d' },
            (err, token) => {
                if (err) throw err;
                res.json({ token, user: { id: user.id, name, email, role, address, mnemonic } });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
});

// @route   POST api/auth/login
// @desc    Authenticate user & get token
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const payload = {
            user: { id: user.id }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '30d' },
            (err, token) => {
                if (err) throw err;
                res.json({ token, user: { id: user.id, name: user.name, email, role: user.role, address: user.address, mnemonic: user.mnemonic } });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
});

// @route   GET api/auth/user
// @desc    Get user by token
const auth = require('../middleware/auth');
router.get('/user', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
});

module.exports = router;
