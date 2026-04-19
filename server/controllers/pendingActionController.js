const PendingAction = require("../models/PendingAction");
const Group         = require("../models/Group");
const Expense       = require("../models/Expense");
const sendNotification = require("../utils/sendNotification");

const ACTION_LABELS = {
  leave_request: "leave request",
  expense_edit:  "expense edit",
  remove_member: "member removal",
};

/* ── Apply the action once approved ── */
const executeAction = async (action) => {
  const group = await Group.findById(action.group);
  if (!group) return;

  if (action.type === "leave_request") {
    group.members = group.members.filter(
      (m) => m.toString() !== action.targetUser.toString()
    );
    await group.save();
    await sendNotification(
      action.targetUser,
      `Your request to leave "${group.name}" was approved by the creator`
    );
    if (global.io) {
      global.io
        .to(action.targetUser.toString())
        .emit("group_left", { groupId: group._id.toString() });
    }
  } else if (action.type === "remove_member") {
    group.members = group.members.filter(
      (m) => m.toString() !== action.targetUser.toString()
    );
    await group.save();
    await sendNotification(
      action.targetUser,
      `You were removed from "${group.name}" by group vote`
    );
    if (global.io) {
      global.io
        .to(action.targetUser.toString())
        .emit("group_removed", { groupId: group._id.toString() });
    }
  } else if (action.type === "expense_edit") {
    const expense = await Expense.findById(action.expenseId);
    if (expense) {
      if (action.proposedChanges?.description)
        expense.description = action.proposedChanges.description;
      if (action.proposedChanges?.category)
        expense.category = action.proposedChanges.category;
      await expense.save();
    }
  }
};

/* ── Notify all required voters ── */
const notifyVoters = async (requiredVoters, message, groupId) => {
  for (const voterId of requiredVoters) {
    await sendNotification(voterId, message);
    if (global.io) {
      global.io
        .to(voterId.toString())
        .emit("new_pending_action", { groupId: groupId.toString() });
    }
  }
};

/* ── Check if resolution criteria are met ── */
const checkResolution = (action) => {
  const total     = action.requiredVoters.length;
  const approvals = action.votes.filter((v) => v.approve).length;
  const rejections= action.votes.filter((v) => !v.approve).length;

  if (total === 0) return "approved"; // no one needs to vote → auto-approve

  if (action.type === "leave_request") {
    // Creator is sole voter — any vote resolves it
    if (approvals > 0)  return "approved";
    if (rejections > 0) return "rejected";
  } else if (action.type === "expense_edit") {
    // All required voters must approve; any single rejection kills it
    if (rejections > 0)          return "rejected";
    if (approvals === total)     return "approved";
  } else if (action.type === "remove_member") {
    // Strict majority (more than half)
    const majority = Math.floor(total / 2) + 1;
    if (approvals  >= majority)              return "approved";
    if (rejections >  total - majority)      return "rejected";
  }

  return null; // not resolved yet
};

// @GET /api/groups/:id/pending-actions
const getPendingActions = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id).select("members");
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (!group.members.some((m) => m.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: "Not a member" });
    }

    const actions = await PendingAction.find({
      group: req.params.id,
      status: "pending",
    })
      .populate("initiator",  "name")
      .populate("targetUser", "name")
      .populate("expenseId",  "description category amount")
      .populate("votes.user", "name")
      .populate("requiredVoters", "name _id");

    res.json(actions);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// @POST /api/groups/:id/pending-actions/:actionId/vote
const castVote = async (req, res) => {
  try {
    const { approve } = req.body; // boolean
    if (typeof approve !== "boolean")
      return res.status(400).json({ message: "approve (boolean) is required" });

    const action = await PendingAction.findById(req.params.actionId)
      .populate("initiator", "name");

    if (!action) return res.status(404).json({ message: "Action not found" });
    if (action.group.toString() !== req.params.id)
      return res.status(400).json({ message: "Action does not belong to this group" });
    if (action.status !== "pending")
      return res.status(400).json({ message: "This action is already resolved" });

    const userId = req.user._id.toString();

    // Must be a required voter
    if (!action.requiredVoters.some((v) => v.toString() === userId))
      return res.status(403).json({ message: "You are not a required voter for this action" });

    // Can't vote twice
    if (action.votes.some((v) => v.user.toString() === userId))
      return res.status(400).json({ message: "You have already voted" });

    action.votes.push({ user: req.user._id, approve });

    const resolution = checkResolution(action);

    if (resolution) {
      action.status = resolution;
      await action.save();
      await executeAction(action);

      const label = ACTION_LABELS[action.type];
      const msg   = `Your ${label} was ${resolution}`;
      await sendNotification(action.initiator._id, msg);
      if (global.io) {
        global.io
          .to(action.initiator._id.toString())
          .emit("pending_action_resolved", {
            groupId: action.group.toString(),
            type:    action.type,
            status:  resolution,
          });
      }
    } else {
      await action.save();
    }

    res.json({ message: "Vote recorded", resolved: !!resolution, status: action.status });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getPendingActions, castVote, notifyVoters, ACTION_LABELS };
