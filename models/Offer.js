const mongoose = require('mongoose');

const OfferSchema = new mongoose.Schema({
    lender_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    durationMonths: { type: Number, required: true },
    interestRate: { type: Number, required: true },
    status: {
        type: String,
        enum: ['OPEN', 'CLOSED'],
        default: 'OPEN'
    },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Offer', OfferSchema);
