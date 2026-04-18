const Group = require("../models/Group");
const Expense = require("../models/Expense");
const User = require("../models/User");
const sendNotification = require("../utils/sendNotification");

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
    const { description, amount, splitType = "equal", customSplits, paidById, category = "other" } = req.body;
    const amountInPaise = Math.round(amount * 100);
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if user is a member
    if (!group.members.some((m) => m.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: "Not a member of this group" });
    }

    // Validate paidById is a group member if provided
    const payer = paidById || req.user._id.toString();
    if (paidById && !group.members.some((m) => m.toString() === paidById)) {
      return res.status(400).json({ message: "Paid-by user is not a group member" });
    }

    let splitBetween = [];

    if (splitType === "equal") {
      const share = Math.floor(amountInPaise / group.members.length);
      const remainder = amountInPaise % group.members.length;

      splitBetween = group.members.map((memberId, index) => ({
        user: memberId,
        share: share + (index < remainder ? 1 : 0),
        paid: memberId.toString() === payer,
      }));
    } else {
      if (!customSplits || customSplits.length === 0) {
        return res.status(400).json({ message: "Custom splits required" });
      }
      splitBetween = customSplits.map((s) => ({
        user: s.userId,
        share: Math.round(s.share * 100),
        paid: s.userId === payer,
      }));
    }

    const expense = await Expense.create({
      group: req.params.id,
      description,
      amount: amountInPaise,
      paidBy: payer,
      splitBetween,
      splitType,
      category,
    });

    await expense.populate("paidBy", "name email");
    await expense.populate("splitBetween.user", "name email");
    await expense.populate("comments.user", "name");

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
      .populate("comments.user", "name")
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

// @DELETE /api/groups/:groupId/expenses/:expenseId
const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.expenseId);
    if (!expense) return res.status(404).json({ message: "Expense not found" });
    if (expense.group.toString() !== req.params.id)
      return res.status(400).json({ message: "Expense does not belong to this group" });
    if (expense.paidBy.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Only the payer can delete this expense" });
    await expense.deleteOne();
    res.json({ message: "Expense deleted" });
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

    // Only members can send invites
    if (!group.members.some((m) => m.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: "Only group members can send invites" });
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

    await sendNotification(
      userId,
      `${req.user.name} invited you to join "${group.name}"`,
    );

    if (global.io) {
      global.io
        .to(userId.toString())
        .emit("new_invite", { groupId: group._id.toString() });
    }

    res.json({ message: "Invite sent successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @PUT /api/groups/:id/invite/respond
const respondToInvite = async (req, res) => {
  try {
    const { status } = req.body; // 'accepted' or 'rejected'
    if (!["accepted", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
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

    if (status === "accepted") {
      group.members.push(req.user._id);
      await sendNotification(
        group.createdBy,
        `${req.user.name} accepted your invite to "${group.name}"`,
      );
    }

    if (status === "rejected") {
      await sendNotification(
        group.createdBy,
        `${req.user.name} rejected your invite to "${group.name}"`,
      );
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

// @POST /api/groups/:id/expenses/:expenseId/comments
const addComment = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Comment text is required" });
    }

    const expense = await Expense.findById(req.params.expenseId);
    if (!expense) return res.status(404).json({ message: "Expense not found" });
    if (expense.group.toString() !== req.params.id)
      return res.status(400).json({ message: "Expense does not belong to this group" });

    expense.comments.push({ user: req.user._id, text: text.trim() });
    await expense.save();
    await expense.populate("comments.user", "name");

    res.status(201).json({ comments: expense.comments });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @PUT /api/groups/:id
const updateGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (!group.members.some((m) => m.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: "Not a member of this group" });
    }

    const { groupPhoto, name, description } = req.body;
    if (groupPhoto !== undefined) group.groupPhoto = groupPhoto;
    if (name !== undefined) group.name = name;
    if (description !== undefined) group.description = description;

    await group.save();
    await group.populate("members", "name email");
    await group.populate("createdBy", "name email");

    res.json(group);
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
  deleteExpense,
  sendInvite,
  respondToInvite,
  getPendingInvites,
  addComment,
  updateGroup,
};
