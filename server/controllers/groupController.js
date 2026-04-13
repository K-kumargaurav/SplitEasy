const Group = require("../models/Group");
const Expense = require("../models/Expense");
const User = require("../models/User");

// @POST /api/groups
const createGroup = async (req, res) => {
  try {
    const { name, description, members } = req.body;

    const group = await Group.create({
      name,
      description,
      createdBy: req.user._id,
      members: [req.user._id], // only creator is always a member

      invites: (members || []).map((userId) => ({
        user: userId,
        status: "pending",
      })), 
    });

    await group.populate("members", "name email");

    res.status(201).json({
      message: "Group created successfully",
      group,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @GET /api/groups
const getGroups = async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user._id })
      .populate("members", "name email")
      .populate("createdBy", "name email")
      .lean();

    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @GET /api/groups/:id
const getGroupById = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate("members", "name email")
      .populate("createdBy", "name email")
      .lean();

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if user is a member
    if (
      !group.members.some((m) => m._id.toString() === req.user._id.toString())
    ) {
      return res.status(403).json({ message: "Not a member of this group" });
    }

    res.json(group);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @POST /api/groups/:id/expenses
const addExpense = async (req, res) => {
  try {
    const { description, amount, splitType = "equal", customSplits } = req.body;
    const amountInPaise = Math.round(amount * 100);
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if user is a member
    if (!group.members.some((m) => m.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: "Not a member of this group" });
    }

    let splitBetween = [];

    if (splitType === "equal") {
      // Divide equally among all members
      const share = Math.floor(amountInPaise / group.members.length);
      const remainder = amountInPaise % group.members.length;

      splitBetween = group.members.map((memberId, index) => ({
        user: memberId,
        share: share + (index < remainder ? 1 : 0),
        paid: memberId.toString() === req.user._id.toString(),
      }));
    } else {
      // Custom split
      if (!customSplits || customSplits.length === 0) {
        return res.status(400).json({ message: "Custom splits required" });
      }
      splitBetween = customSplits.map((s) => ({
        user: s.userId,
        share: Math.round(s.share * 100),
        paid: s.userId === req.user._id.toString(),
      }));
    }

    const expense = await Expense.create({
      group: req.params.id,
      description,
      amount: amountInPaise,
      paidBy: req.user._id,
      splitBetween,
      splitType,
    });

    await expense.populate("paidBy", "name email");
    await expense.populate("splitBetween.user", "name email");

    expense.amount = expense.amount / 100;
    expense.splitBetween.forEach((s) => {
      s.share = s.share / 100;
    });

    res.status(201).json({
      message: "Expense added successfully",
      expense,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @GET /api/groups/:id/expenses
const getGroupExpenses = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id).select("members");

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (!group.members.some((m) => m.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: "Not a member of this group" });
    }

    const expenses = await Expense.find({ group: req.params.id })
      .populate("paidBy", "name email")
      .populate("splitBetween.user", "name email")
      .lean();

    expenses.forEach((exp) => {
      exp.amount = exp.amount / 100;

      exp.splitBetween.forEach((s) => {
        s.share = s.share / 100;
      });
    });

    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @POST /api/groups/:id/invite
const sendInvite = async (req, res) => {
  try {
    const { userId } = req.body;
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Only creator can send invites
    if (group.createdBy.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Only group creator can send invites" });
    }

    // Check if already a member
    if (group.members.includes(userId)) {
      return res.status(400).json({ message: "User is already a member" });
    }

    // Check if invite already sent
    const alreadyInvited = group.invites.find(
      (i) => i.user.toString() === userId && i.status === "pending",
    );
    if (alreadyInvited) {
      return res.status(400).json({ message: "Invite already sent" });
    }

    group.invites.push({ user: userId });
    await group.save();

    res.json({ message: "Invite sent successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @PUT /api/groups/:id/invite/respond
const respondToInvite = async (req, res) => {
  try {
    const { status } = req.body; // 'accepted' or 'rejected'
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Find the invite for this user
    const invite = group.invites.find(
      (i) =>
        i.user.toString() === req.user._id.toString() && i.status === "pending",
    );

    if (!invite) {
      return res.status(404).json({ message: "Invite not found" });
    }

    group.invites = group.invites.filter(
      (i) =>
        !(
          i.user.toString() === req.user._id.toString() &&
          i.status === "pending"
        ),
    );

    // If accepted, add to members
    if (status === "accepted") {
      group.members.push(req.user._id);
    }

    // Notify the group creator if rejected
    if (status === "rejected") {
      const creator = await User.findById(group.createdBy);
      if (creator) {
        creator.notifications.push({
          message: `${req.user.name} rejected your invite to "${group.name}"`,
        });
        await creator.save();
      }
    }
    await group.save();

    res.json({
      message:
        status === "accepted"
          ? "Joined group successfully!"
          : "Invite rejected",
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @GET /api/groups/invites/pending
const getPendingInvites = async (req, res) => {
  try {
    const groups = await Group.find({
      "invites.user": req.user._id,
      "invites.status": "pending",
    })
      .populate("createdBy", "name email")
      .select("name description createdBy invites");

    // Only return relevant invite info
    const invites = groups.map((group) => ({
      groupId: group._id,
      groupName: group.name,
      description: group.description,
      invitedBy: group.createdBy,
    }));

    res.json(invites);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  createGroup,
  getGroups,
  getGroupById,
  addExpense,
  getGroupExpenses,
  sendInvite,
  respondToInvite,
  getPendingInvites,
};
