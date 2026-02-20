const mongoose = require('mongoose');

const LoanSchema = new mongoose.Schema({
    borrower_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    lender_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    amount: { type: Number, required: true },
    purpose: { type: String, required: true },
    description: { type: String },
    status: {
        type: String,
        enum: ['PENDING', 'ACTIVE', 'REPAID', 'DEFAULTED'],
        default: 'PENDING'
    },
    repayment_date: { type: Date },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Loan', LoanSchema);
