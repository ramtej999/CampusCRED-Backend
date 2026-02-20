const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    address: { type: String }, // Algorand address
    mnemonic: { type: String }, // Plain for demo
    role: { type: String, enum: ['borrower', 'lender'], default: 'borrower' },
    reputation_score: { type: Number, default: 500 },
    total_lent: { type: Number, default: 0 },
    total_borrowed: { type: Number, default: 0 },
    age: { type: Number },
    gender: { type: String },
    mobile: { type: String },
    organization: { type: String },
    created_at: { type: Date, default: Date.now }
});

// Hash password before saving
UserSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, 10);
});

module.exports = mongoose.model('User', UserSchema);
