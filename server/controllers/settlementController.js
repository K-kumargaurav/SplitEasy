const Expense              = require("../models/Expense");
const Settlement           = require("../models/Settlement");
const Group                = require("../models/Group");
const BalanceSnapshot      = require("../models/BalanceSnapshot");
const sendNotification     = require("../utils/sendNotification");
const { refreshBalanceSnapshot } = require("../utils/balanceUtils");

// @GET /api/groups/:id/balances  — O(1) snapshot read
const getBalances = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id).select("members").lean();
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (!group.members.some((m) => m.toString() === req.user._id.toString()))
      return res.status(403).json({ message: "Not a member of this group" });

    const snapshot = await BalanceSnapshot.findOne({ groupId: req.params.id }).lean();
    if (snapshot) return res.json(snapshot.balances);

    // First-time: compute, persist, return
    await refreshBalanceSnapshot(req.params.id);
    const fresh = await BalanceSnapshot.findOne({ groupId: req.params.id }).lean();
    res.json(fresh?.balances ?? []);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @POST /api/groups/:id/settle
//CREATE REQUEST ONLY
const settleUp = async (req, res) => {
  try {
    const { paidToId, amount } = req.body;

    if (!paidToId || !amount || isNaN(amount) || Number(amount) <= 0)
      return res.status(400).json({ message: "paidToId and a positive amount are required" });
    if (paidToId === req.user._id.toString())
      return res.status(400).json({ message: "You cannot settle with yourself" });

    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (!group.members.some((m) => m.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: "Not a member" });
    }

    if (!group.members.some((m) => m.toString() === paidToId))
      return res.status(400).json({ message: "Recipient is not a group member" });

    const settlement = await Settlement.create({
      group: req.params.id,
      paidBy: req.user._id,
      paidTo: paidToId,
      amount: Math.round(amount * 100),
      status: "pending",
    });

    await sendNotification(
      paidToId,
      `${req.user.name} wants to settle ₹${amount} with you`,
    );

    if (global.io) {
      global.io.to(paidToId.toString()).emit("settlement_request", {
        message: `${req.user.name} wants to settle ₹${amount}`,
        groupId: req.params.id.toString(),
      });
    }

    res.status(201).json({
      message: "Settlement request sent",
      settlement: { ...settlement.toObject(), amount: settlement.amount / 100 },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @PUT /api/settlements/:id/respond
// CONFIRM / REJECT
const respondToSettlement = async (req, res) => {
  try {
    const { status } = req.body; // accepted / rejected
    if (!["accepted", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const settlement = await Settlement.findById(req.params.id);

    if (!settlement) {
      return res.status(404).json({ message: "Settlement not found" });
    }

    // Only receiver can respond
    if (settlement.paidTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (settlement.status !== "pending") {
      return res.status(400).json({ message: "Already processed" });
    }

    settlement.status = status;
    await settlement.save();

    // When accepted: mark splits as paid for the debtor in this group
    if (status === "accepted") {
      const expenses = await Expense.find({
        group:  settlement.group,
        paidBy: settlement.paidTo,
      });

      let remaining = settlement.amount; // in paise

      for (const expense of expenses) {
        let dirty = false;
        for (const split of expense.splitBetween) {
          if (split.user.toString() === settlement.paidBy.toString() && !split.paid) {
            if (remaining >= split.share) {
              remaining -= split.share;
              split.paid = true;
              dirty = true;
            }
          }
        }
        if (dirty) await expense.save();
        if (remaining <= 0) break;
      }
    }

    // Invalidate snapshot so next read is fresh
    if (status === "accepted") {
      refreshBalanceSnapshot(settlement.group).catch(() => {});
    }

    await sendNotification(
      settlement.paidBy,
      status === "accepted"
        ? `${req.user.name} accepted your settlement`
        : `${req.user.name} rejected your settlement`,
    );

    if (global.io) {
      global.io.to(settlement.paidBy.toString()).emit("settlement_update", {
        status,
        groupId: settlement.group.toString(),
      });
    }

    res.json({
      message:
        status === "accepted" ? "Settlement confirmed" : "Settlement rejected",
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @GET /api/settlements/pending
// GET RECEIVER REQUESTS
const getPendingSettlements = async (req, res) => {
  try {
    const settlements = await Settlement.find({
      paidTo: req.user._id,
      status: "pending",
    })
      .populate("paidBy", "name email")
      .populate("group", "name")
      .lean();

    res.json(settlements.map((s) => ({ ...s, amount: s.amount / 100 })));
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @GET /api/groups/:id/settlements
const getSettlements = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id).select("members");

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (!group.members.some((m) => m.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: "Not a member of this group" });
    }

    const settlements = await Settlement.find({ group: req.params.id })
      .populate("paidBy", "name email")
      .populate("paidTo", "name email");

    res.json(settlements);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getBalances,
  settleUp,
  respondToSettlement,
  getPendingSettlements,
  getSettlements,
};
