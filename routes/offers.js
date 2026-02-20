const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Offer = require('../models/Offer');

// @route   GET api/offers
// @desc    Get all active lending offers
router.get('/', async (req, res) => {
    try {
        const offers = await Offer.find({ status: 'OPEN' })
            .populate('lender_id', 'name address')
            .sort({ created_at: -1 });
        res.json(offers);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
});

// @route   POST api/offers
// @desc    Create a lending offer
router.post('/', auth, async (req, res) => {
    const { amount, durationMonths, interestRate } = req.body;

    try {
        const newOffer = new Offer({
            lender_id: req.user.id,
            amount,
            durationMonths,
            interestRate
        });

        const offer = await newOffer.save();
        res.json(offer);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
});

// @route   PUT api/offers/:id
// @desc    Update an offer (e.g., reduce amount)
router.put('/:id', auth, async (req, res) => {
    try {
        let offer = await Offer.findById(req.params.id);
        if (!offer) return res.status(404).json({ msg: 'Offer not found' });

        // Check if user owns offer
        if (offer.lender_id.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        offer = await Offer.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true }
        );

        res.json(offer);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server error' });
    }
});

// @route   DELETE api/offers/:id
// @desc    Delete an offer
router.delete('/:id', auth, async (req, res) => {
    try {
        const offer = await Offer.findById(req.params.id);
        if (!offer) return res.status(404).json({ msg: 'Offer not found' });

        if (offer.lender_id.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        await Offer.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Offer removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server error' });
    }
});

module.exports = router;
