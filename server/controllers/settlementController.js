const Expense = require("../models/Expense");
const Settlement = require("../models/Settlement");
const Group = require("../models/Group");

// @GET /api/groups/:id/balances
const getBalances = async(req, res) => {
    try {
        const group = await Group.findById(req.params.id);

        if(!group) {
            return res.status(404).json({ message: "Group not found" });
        }

        // check membership
        if(!group.members.some(m => m.toString() === req.user._id.toString())) {
            return res.status(403).json({ message: "Not a member of this group" });
        }

        // get all unpaid expenses
        const expenses = await Expense.find({ group : req.params.id }).lean();

        // Build balance map { userId: netBalance }
        // Positive = owed money, Negative = owes money
        const balances = {};

        expenses.forEach(expense => {
            const paidBy = expense.paidBy.toString();

            expense.splitBetween.forEach(split => {
                const owedBy = split.user.toString();

                if(split.paid || owedBy === paidBy) return;

                const amount = split.share;

                // paidBy is owed this amount
                if(!balances[paidBy]) balances[paidBy] = {};
                if(!balances[paidBy][owedBy]) balances[paidBy][owedBy] = 0;
                balances[paidBy][owedBy] += amount;
            });
        });

        // format into readable array
        const result = [];
        for(const creditor in balances) {
            for(const debtor in balances[creditor]) {
                if(balances[creditor][debtor] > 0) {
                    result.push({
                        owedBy: debtor,
                        owedTo: creditor,
                        amount: balances[creditor][debtor] / 100  // convert paise to rupees
                    });
                }
            }
        }
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// @POST /api/groups/:id/settle
const settleUp = async(req, res) => {
    try {
        const { paidToId, amount } = req.body;
        const group = await Group.findById(req.params.id);
        
        if(!group) {
            return res.status(404).json({ message: "Group not found" });
        }

        // check membership
        if(!group.members.some(m => m.toString() === req.user._id.toString())) {
            return res.status(403).json({ message: "Not a member of this group" });
        }

        const amountInPaise = Math.round(amount * 100);

        // Mark related expense splits as paid
        const expenses = await Expense.find({
            group: req.params.id,
            paidBy: paidToId
        });

        for(const expense of expenses) {
            const split = expense.splitBetween.find(
                s => s.user.toString() === req.user._id.toString() && !s.paid
            );
            if(split) {
                split.paid = true;
                await expense.save();
            }
        }

        // Record the settlement
        const settlement = await Settlement.create({
            group: req.params.id,
            paidBy: req.user._id,
            paidTo: paidToId,
            amount: amountInPaise
        });

        await settlement.populate("paidBy", "name email");
        await settlement.populate("paidTo", "name email");

        res.status(201).json({
            message: 'Settlement recorded successfully',
            settlement: {
                ...settlement.toObject(),
                amount: settlement.amount / 100
            }
        });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// @GET /api/groups/:id/settlements
const getSettlements = async(req, res) => {
    try {
        const group = await Group.findById(req.params.id).select("members");

        if(!group) {
            return res.status(404).json({ message: "Group not found" });
        }

        if(!group.members.some(m => m.toString() === req.user._id.toString())) {
            return res.status(403).json({ message: "Not a member of this group" });
        }

        const settlements = await Settlement.find({ group: req.params.id })
        .populate("paidBy", "name email")
        .populate("paidTo", "name email")
        .lean();

        const formatted = settlements.map(s => ({
            ...s, 
            amount: s.amount / 100
        }));

        res.json(formatted);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
}

module.exports = { getBalances, settleUp, getSettlements };
