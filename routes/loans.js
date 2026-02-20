const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Loan = require('../models/Loan');
const User = require('../models/User'); // ADDED
const algorandService = require('../services/algorand'); // ADDED

// @route   GET api/loans
// @desc    Get all loans
router.get('/', async (req, res) => {
    try {
        const loans = await Loan.find()
            .populate('borrower_id', 'name address')
            .populate('lender_id', 'name address')
            .sort({ created_at: -1 });
        res.json(loans);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
});

// @route   POST api/loans
// @desc    Create a loan request
router.post('/', auth, async (req, res) => {
    const { amount, purpose, description, repayment_date } = req.body;

    try {
        const newLoan = new Loan({
            borrower_id: req.user.id,
            amount,
            purpose,
            description,
            repayment_date
        });

        const loan = await newLoan.save();
        res.json(loan);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
});

// @route   PUT api/loans/:id
// @desc    Update a loan (fund or repay)
router.put('/:id', auth, async (req, res) => {
    const { status } = req.body;

    try {
        let loan = await Loan.findById(req.params.id).populate('borrower_id lender_id');

        if (!loan) return res.status(404).json({ msg: 'Loan not found' });

        const currentUser = await User.findById(req.user.id);
        if (!currentUser || !currentUser.mnemonic) {
            return res.status(400).json({ msg: 'User mnemonic not found for blockchain transaction' });
        }

        const durationSecs = 30 * 24 * 60 * 60; // 30 days default

        // 1. Funding Logic (Lender)
        if (status === 'ACTIVE' && loan.status === 'PENDING') {
            const borrowerUser = await User.findById(loan.borrower_id._id);
            if (!borrowerUser || !borrowerUser.address) return res.status(400).json({ msg: 'Borrower address not found' });

            console.log(`Executing Algorand create_loan for amount ${loan.amount}...`);
            await algorandService.createLoanOnChain(
                currentUser.mnemonic,
                loan._id.toString(),
                borrowerUser.address,
                Math.floor(loan.amount * 1000000), // microAlgos
                durationSecs
            );
            console.log("Blockchain transaction successful.");

            // Database Cache Update
            loan.status = 'ACTIVE';
            loan.lender_id = currentUser._id;
        }
        // 2. Repayment Logic (Borrower)
        else if (status === 'REPAID' && loan.status === 'ACTIVE') {
            const lenderUser = await User.findById(loan.lender_id._id);
            if (!lenderUser || !lenderUser.address) return res.status(400).json({ msg: 'Lender address not found' });

            console.log(`Executing Algorand repay_loan for amount ${loan.amount}...`);
            await algorandService.repayLoanOnChain(
                currentUser.mnemonic,
                loan._id.toString(),
                lenderUser.address,
                Math.floor(loan.amount * 1000000)
            );
            console.log("Blockchain transaction successful.");

            // Database Cache Update
            loan.status = 'REPAID';
        }
        // 3. Admin or unknown logic
        else {
            if (status) loan.status = status;
        }

        await loan.save();
        res.json(loan);
    } catch (err) {
        console.error("Blockchain or Server Error:", err.message);
        res.status(500).json({ msg: 'Transaction failed', error: err.message });
    }
});

module.exports = router;
