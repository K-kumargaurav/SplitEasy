const Group         = require("../models/Group");
const Expense       = require("../models/Expense");
const { refreshBalanceSnapshot } = require("../utils/balanceUtils");
const Settlement    = require("../models/Settlement");
const User          = require("../models/User");
const PendingAction = require("../models/PendingAction");
const sendNotification = require("../utils/sendNotification");
const { notifyVoters } = require("./pendingActionController");

// @POST /api/groups
const createGroup = async (req, res) => {
  try {
    const { name, description, members } = req.body;
    if (!name || !String(name).trim())
      return res.status(400).json({ message: "Group name is required" });

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

    await group.populate("members", "name email upiId phoneNumber paymentDetailsPublic");

    res.status(201).json({
      message: "Group created successfully",
      group,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @GET /api/groups
const getGroups = async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user._id })
      .populate("members", "name email upiId phoneNumber paymentDetailsPublic")
      .populate("createdBy", "name email upiId phoneNumber paymentDetailsPublic")
      .lean();

    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @GET /api/groups/:id
const getGroupById = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate("members", "name email upiId phoneNumber paymentDetailsPublic")
      .populate("createdBy", "name email upiId phoneNumber paymentDetailsPublic")
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
    res.status(500).json({ message: "Server error" });
  }
};

// @POST /api/groups/:id/expenses
const addExpense = async (req, res) => {
  try {
    const { description, amount, splitType = "equal", customSplits, paidById, category = "other" } = req.body;
    if (!description || typeof description !== "string" || !description.trim())
      return res.status(400).json({ message: "Description is required" });
    if (!amount || isNaN(amount) || amount <= 0 || amount > 1_000_000)
      return res.status(400).json({ message: "Amount must be between ₹0.01 and ₹10,00,000" });
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
      const memberIds = group.members.map((m) => m.toString());
      for (const s of customSplits) {
        if (!memberIds.includes(s.userId)) {
          return res.status(400).json({ message: "All split users must be group members" });
        }
      }
      const totalCustom = customSplits.reduce((sum, s) => sum + Math.round(s.share * 100), 0);
      if (Math.abs(totalCustom - amountInPaise) > 2)
        return res.status(400).json({ message: "Custom split amounts must sum to the total expense amount" });
      splitBetween = customSplits.map((s) => ({
        user: s.userId,
        share: Math.round(s.share * 100),
        paid: s.userId === payer || s.paid === true,
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

    await expense.populate("paidBy", "name email upiId phoneNumber paymentDetailsPublic");
    await expense.populate("splitBetween.user", "name email upiId phoneNumber paymentDetailsPublic");
    await expense.populate("comments.user", "name");

    expense.amount = expense.amount / 100;
    expense.splitBetween.forEach((s) => {
      s.share = s.share / 100;
    });

    // Invalidate balance snapshot fire-and-forget
    refreshBalanceSnapshot(req.params.id).catch(() => {});

    res.status(201).json({
      message: "Expense added successfully",
      expense,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @GET /api/groups/:id/expenses?cursor=<lastId>&limit=20
const getGroupExpenses = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id).select("members").lean();
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (!group.members.some((m) => m.toString() === req.user._id.toString()))
      return res.status(403).json({ message: "Not a member of this group" });

    const limit  = Math.min(parseInt(req.query.limit) || 20, 50);
    const query  = { group: req.params.id };
    if (req.query.cursor) query._id = { $lt: req.query.cursor };

    const expenses = await Expense.find(query)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .populate("paidBy", "name email upiId phoneNumber paymentDetailsPublic")
      .populate("splitBetween.user", "name email upiId phoneNumber paymentDetailsPublic")
      .populate("comments.user", "name")
      .lean();

    const hasMore    = expenses.length > limit;
    if (hasMore) expenses.pop();
    const nextCursor = hasMore ? expenses[expenses.length - 1]._id : null;

    expenses.forEach((exp) => {
      exp.amount = exp.amount / 100;
      exp.splitBetween.forEach((s) => { s.share = s.share / 100; });
    });

    res.json({ expenses, hasMore, nextCursor });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
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
    refreshBalanceSnapshot(req.params.id).catch(() => {});
    res.json({ message: "Expense deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @POST /api/groups/:id/invite
const sendInvite = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: "userId is required" });
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

    const isCreator = group.createdBy.toString() === req.user._id.toString();

    if (isCreator) {
      // Creator invites directly — invite goes straight to the user
      group.invites.push({ user: userId, status: "pending" });
      await group.save();

      await sendNotification(userId, `${req.user.name} invited you to join "${group.name}"`);
      if (global.io) {
        global.io.to(userId.toString()).emit("new_invite", { groupId: group._id.toString() });
      }
      res.json({ message: "Invite sent successfully" });
    } else {
      // Non-creator member — notify creator for approval first
      await sendNotification(
        group.createdBy,
        `${req.user.name} wants to invite someone to "${group.name}". Open the group to approve.`,
      );
      if (global.io) {
        global.io.to(group.createdBy.toString()).emit("invite_approval_needed", {
          groupId: group._id.toString(),
          requestedBy: req.user.name,
          inviteeId: userId,
        });
      }
      // Store a pending-approval invite (reuse invites array with status "pending_approval")
      group.invites.push({ user: userId, status: "pending_approval", requestedBy: req.user._id });
      await group.save();
      res.json({ message: "Invite request sent to group creator for approval" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error" });
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
    res.status(500).json({ message: "Server error" });
  }
};

// @PUT /api/groups/:id/invite/approve  (creator only — approve or reject a pending_approval invite)
const approveInvite = async (req, res) => {
  try {
    const { userId, approved } = req.body;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (group.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the creator can approve invites" });
    }

    const invite = group.invites.find(
      (i) => i.user.toString() === userId && i.status === "pending_approval"
    );
    if (!invite) return res.status(404).json({ message: "Invite request not found" });

    // Remove the pending_approval entry
    group.invites = group.invites.filter(
      (i) => !(i.user.toString() === userId && i.status === "pending_approval")
    );

    if (approved) {
      // Promote to a real invite
      group.invites.push({ user: userId, status: "pending" });
      await group.save();

      await sendNotification(userId, `${req.user.name} invited you to join "${group.name}"`);
      if (global.io) {
        global.io.to(userId.toString()).emit("new_invite", { groupId: group._id.toString() });
      }
      if (invite.requestedBy) {
        await sendNotification(
          invite.requestedBy,
          `Your invite request for "${group.name}" was approved by the creator`,
        );
      }
      res.json({ message: "Invite approved and sent" });
    } else {
      await group.save();
      if (invite.requestedBy) {
        await sendNotification(
          invite.requestedBy,
          `Your invite request for "${group.name}" was declined by the creator`,
        );
      }
      res.json({ message: "Invite request declined" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @GET /api/groups/invites/pending
const getPendingInvites = async (req, res) => {
  try {
    const groups = await Group.find({
      "invites.user": req.user._id,
      "invites.status": "pending",
    })
      .populate("createdBy", "name email upiId phoneNumber paymentDetailsPublic")
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
    res.status(500).json({ message: "Server error" });
  }
};

// @DELETE /api/groups/:id/leave  → creates a leave_request PendingAction
const leaveGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (!group.members.some((m) => m.toString() === req.user._id.toString()))
      return res.status(403).json({ message: "Not a member of this group" });

    if (group.createdBy.toString() === req.user._id.toString())
      return res.status(400).json({ message: "Group creator cannot leave. Delete the group instead." });

    // Block duplicate requests
    const existing = await PendingAction.findOne({
      group: group._id, type: "leave_request",
      targetUser: req.user._id, status: "pending",
    });
    if (existing)
      return res.status(400).json({ message: "Your leave request is already pending creator approval" });

    const action = await PendingAction.create({
      group:          group._id,
      type:           "leave_request",
      initiator:      req.user._id,
      targetUser:     req.user._id,
      requiredVoters: [group.createdBy],
    });

    await notifyVoters(
      [group.createdBy],
      `${req.user.name} wants to leave "${group.name}" — open the group to approve or reject`,
      group._id,
    );

    res.json({ message: "Leave request sent to group creator for approval", actionId: action._id });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @DELETE /api/groups/:id/members/:memberId  → creates a remove_member PendingAction
const removeMember = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (group.createdBy.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Only the group creator can initiate a member removal" });

    if (req.params.memberId === req.user._id.toString())
      return res.status(400).json({ message: "You cannot remove yourself" });

    if (!group.members.some((m) => m.toString() === req.params.memberId))
      return res.status(404).json({ message: "User is not a member of this group" });

    // Block duplicate requests
    const existing = await PendingAction.findOne({
      group: group._id, type: "remove_member",
      targetUser: req.params.memberId, status: "pending",
    });
    if (existing)
      return res.status(400).json({ message: "A removal request for this member is already pending" });

    // Required voters = all members except creator (initiator) and the target
    const requiredVoters = group.members
      .map((m) => m.toString())
      .filter((m) => m !== req.user._id.toString() && m !== req.params.memberId);

    const action = await PendingAction.create({
      group:          group._id,
      type:           "remove_member",
      initiator:      req.user._id,
      targetUser:     req.params.memberId,
      requiredVoters,
    });

    const targetUser = await User.findById(req.params.memberId).select("name");
    await notifyVoters(
      requiredVoters,
      `${req.user.name} wants to remove ${targetUser?.name || "a member"} from "${group.name}" — open the group to vote`,
      group._id,
    );

    res.json({ message: "Removal request sent to group members for vote", actionId: action._id });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @PUT /api/groups/:id/expenses/:expenseId
const editExpense = async (req, res) => {
  try {
    const { description, category } = req.body;
    const expense = await Expense.findById(req.params.expenseId);
    if (!expense) return res.status(404).json({ message: "Expense not found" });
    if (expense.group.toString() !== req.params.id)
      return res.status(400).json({ message: "Expense does not belong to this group" });
    if (expense.paidBy.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Only the payer can edit this expense" });

    if (description) expense.description = description;
    if (category)    expense.category    = category;
    await expense.save();

    await expense.populate("paidBy", "name email upiId phoneNumber paymentDetailsPublic");
    await expense.populate("splitBetween.user", "name email upiId phoneNumber paymentDetailsPublic");
    await expense.populate("comments.user", "name");

    expense.amount = expense.amount / 100;
    expense.splitBetween.forEach((s) => { s.share = s.share / 100; });

    res.json({ message: "Expense updated", expense });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
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
    res.status(500).json({ message: "Server error" });
  }
};

// @DELETE /api/groups/:id  (creator only)
const deleteGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (group.createdBy.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Only the group creator can delete this group" });

    await Expense.deleteMany({ group: group._id });
    await Settlement.deleteMany({ group: group._id });
    await PendingAction.deleteMany({ group: group._id });
    await group.deleteOne();

    res.json({ message: "Group deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
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
    if (groupPhoto !== undefined) {
      if (groupPhoto === "" || /^https:\/\/.+/.test(groupPhoto))
        group.groupPhoto = groupPhoto;
    }
    if (name !== undefined) group.name = String(name).trim().slice(0, 100);
    if (description !== undefined) group.description = String(description).slice(0, 300);

    await group.save();
    await group.populate("members", "name email upiId phoneNumber paymentDetailsPublic");
    await group.populate("createdBy", "name email upiId phoneNumber paymentDetailsPublic");

    res.json(group);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createGroup,
  getGroups,
  getGroupById,
  addExpense,
  getGroupExpenses,
  deleteExpense,
  editExpense,
  sendInvite,
  respondToInvite,
  approveInvite,
  getPendingInvites,
  leaveGroup,
  removeMember,
  addComment,
  updateGroup,
  deleteGroup,
};
