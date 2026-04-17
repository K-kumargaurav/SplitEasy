import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import MemberSearch from "../components/MemberSearch";
import socket from "../utils/socket";
import toast from "react-hot-toast";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: "", description: "" });
  const [error, setError] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [pendingSettlements, setPendingSettlements] = useState([]);
  const notifRef = useRef(null);

  useEffect(() => {
  if (!user?._id) return;

  socket.emit("join", user._id);

  // settlement_request
  const settlementRequestHandler = (data) => {
    toast((t) => (
      <div
        onClick={() => {
          navigate(`/groups/${data.groupId}`);
          toast.dismiss(t.id);
        }}
        style={{ cursor: "pointer", padding: "8px" }}
      >
        💰 {data.message}
      </div>
    ));
  };

  // settlement_update
  const settlementUpdateHandler = (data) => {
    toast((t) => (
      <div
        onClick={() => {
          navigate("/dashboard");
          toast.dismiss(t.id);
        }}
        style={{ cursor: "pointer", padding: "8px" }}
      >
        {data.status === "accepted"
          ? "✅ Settlement accepted"
          : "❌ Settlement rejected"}
      </div>
    ));
  };

  // new_invite
  const newInviteHandler = (data) => {
    toast((t) => (
      <div
        onClick={() => {
          navigate(`/groups/${data.groupId}`);
          toast.dismiss(t.id);
        }}
        style={{ cursor: "pointer", padding: "8px" }}
      >
        📩 New invite — Click to open
      </div>
    ));
  };

  // attach
  socket.on("settlement_request", settlementRequestHandler);
  socket.on("settlement_update", settlementUpdateHandler);
  socket.on("new_invite", newInviteHandler);

  // cleanup
  return () => {
    socket.off("settlement_request", settlementRequestHandler);
    socket.off("settlement_update", settlementUpdateHandler);
    socket.off("new_invite", newInviteHandler);
    socket.disconnect();
  };
}, [user?._id]);

  useEffect(() => {
    if (!user?._id) return;

    fetchGroups();
    fetchInvites();
    fetchNotifications();
    fetchPendingSettlements();
  }, [user]);

  const fetchInvites = async () => {
    try {
      const res = await api.get("/groups/invites/pending");
      setInvites(res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to load invites");
    }
  };

  const handleInviteResponse = async (groupId, status) => {
    try {
      await api.put(`/groups/${groupId}/invite/respond`, { status });
      setInvites((prev) => prev.filter((i) => i.groupId !== groupId));
      if (status === "accepted") fetchGroups();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to respond");
    }
  };

  const fetchGroups = async () => {
    try {
      const res = await api.get("/groups");
      setGroups(res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to load groups");
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await api.get("/users/notifications");
      setNotifications(res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to load notifications");
    }
  };

  const handleNotificationClick = async () => {
    setShowNotifications(!showNotifications);
    // Mark as read when opened
    if (!showNotifications && unreadCount > 0) {
      await api.put("/users/notifications/read");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    try {
      await api.post("/groups", {
        ...newGroup,
        members: selectedMembers.map((m) => m._id),
      });
      setNewGroup({ name: "", description: "" });
      setSelectedMembers([]);
      setShowCreateForm(false);
      fetchGroups();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create group");
    }
  };

  const fetchPendingSettlements = async () => {
    try {
      const res = await api.get("/settlements/pending");
      setPendingSettlements(res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to load pending settlements");
    }
  };

  const handleSettlementResponse = async (settlementId, status) => {
    try {
      await api.put(`/settlements/${settlementId}/respond`, { status });
      setPendingSettlements((prev) =>
        prev.filter((s) => s._id !== settlementId),
      );
      toast.success(
        status === "accepted"
          ? "Settlement confirmed! ✅"
          : "Settlement rejected",
      );
    } catch (err) {
      setError(err.response?.data?.message || "Failed to respond");
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navbar */}
      <nav className="bg-white shadow-sm px-4 py-3 flex justify-between items-center sticky top-0 z-10">
        <h1 className="text-xl font-bold text-green-600">SplitEasy</h1>
        <div className="flex items-center gap-2">
          <span className="text-gray-600 text-sm hidden sm:block">
            Hey, {user?.name}! 👋
          </span>

          {/* 🔔 Notification Bell */}
          <div className="relative">
            <button
              onClick={handleNotificationClick}
              className="relative p-3 text-gray-500 hover:text-gray-700"
            >
              🔔
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Dropdown */}
            {showNotifications && (
              <div className="fixed right-2 top-16 w-[calc(100vw-16px)] sm:absolute sm:right-0 sm:top-auto sm:w-72 bg-white rounded-xl shadow-lg border border-gray-200 z-20">
                <div className="p-3 border-b border-gray-100">
                  <p className="font-semibold text-gray-800 text-sm">
                    Notifications
                  </p>
                </div>
                {notifications.length === 0 ? (
                  <p className="text-gray-400 text-sm p-4 text-center">
                    No notifications
                  </p>
                ) : (
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.map((n, i) => (
                      <div
                        key={i}
                        className={`p-3 border-b border-gray-50 text-sm ${
                          !n.read ? "bg-red-50" : ""
                        }`}
                      >
                        <p className="text-gray-700">{n.message}</p>
                        <p className="text-gray-400 text-xs mt-1">
                          {new Date(n.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Pending Settlements */}
      {pendingSettlements.length > 0 && (
        <div className="mb-5">
          <h2 className="text-base font-semibold text-gray-800 mb-3">
            💰 Settlement Requests ({pendingSettlements.length})
          </h2>
          <div className="grid gap-3">
            {pendingSettlements.map((s) => (
              <div
                key={s._id}
                className="bg-blue-50 border border-blue-200 rounded-xl p-4"
              >
                <div className="mb-3">
                  <p className="font-semibold text-gray-800">
                    {s.paidBy.name} wants to pay you
                  </p>
                  <p className="text-xl font-bold text-green-600 mt-1">
                    ₹{s.amount / 100}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Group: {s.group.name}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSettlementResponse(s._id, "accepted")}
                    className="flex-1 bg-green-600 text-white py-3 rounded-lg text-base font-medium"
                  >
                    Confirm ✅
                  </button>
                  <button
                    onClick={() => handleSettlementResponse(s._id, "rejected")}
                    className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg text-base font-medium"
                  >
                    Reject ❌
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-2 sm:px-4 py-5 pb-24">
        {/* Pending Invites */}
        {invites.length > 0 && (
          <div className="mb-5">
            <h2 className="text-base font-semibold text-gray-800 mb-3">
              🔔 Pending Invites ({invites.length})
            </h2>
            <div className="grid gap-3">
              {invites.map((invite) => (
                <div
                  key={invite.groupId}
                  className="bg-yellow-50 border border-yellow-200 rounded-xl p-4"
                >
                  <div className="mb-3">
                    <p className="font-semibold text-gray-800">
                      {invite.groupName}
                    </p>
                    <p className="text-sm text-gray-500">
                      Invited by{" "}
                      <span className="text-green-600">
                        {invite.invitedBy.name}
                      </span>
                    </p>
                    {invite.description && (
                      <p className="text-sm text-gray-400 mt-0.5">
                        {invite.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        handleInviteResponse(invite.groupId, "accepted")
                      }
                      className="flex-1 bg-green-600 text-white py-3 rounded-lg text-base font-medium"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() =>
                        handleInviteResponse(invite.groupId, "rejected")
                      }
                      className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg text-base font-medium"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-center mb-4 gap-2">
          <h2 className="text-lg font-semibold text-gray-800">Your Groups</h2>
          <button
            onClick={() => {
              setError("");
              setShowCreateForm(!showCreateForm);
            }}
            className="bg-green-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium"
          >
            + New Group
          </button>
        </div>

        {/* Create Group Form */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-white z-50 p-4 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Create Group</h2>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-gray-500 text-xl"
              >
                ✕
              </button>
            </div>
            {error && (
              <p className="bg-red-100 text-red-600 p-3 rounded-lg mb-4 text-sm">
                {error}
              </p>
            )}

            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Group Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Goa Trip, Room Rent, Monthly Bills etc."
                  value={newGroup.name}
                  onChange={(e) =>
                    setNewGroup({ ...newGroup, name: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-xl px-4 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-green-500 text-base"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  placeholder="Add details like purpose, activities, items, dates etc. (optional)"
                  value={newGroup.description}
                  onChange={(e) =>
                    setNewGroup({ ...newGroup, description: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-xl px-4 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-green-500 text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Add Members
                </label>
                <MemberSearch
                  onAdd={(user) =>
                    setSelectedMembers((prev) => [...prev, user])
                  }
                  existingMembers={selectedMembers}
                />
                {selectedMembers.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedMembers.map((member) => (
                      <span
                        key={member._id}
                        className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                      >
                        {member.name}
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedMembers((prev) =>
                              prev.filter((m) => m._id !== member._id),
                            )
                          }
                          className="ml-1 bg-red-100 text-red-500 px-2 py-1 rounded-full text-xs"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition font-medium"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Groups List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">💸</p>
            <p className="text-gray-500 font-medium">No groups yet!</p>
            <p className="text-gray-400 text-sm mt-1">
              Create a group to start splitting expenses
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {groups.map((group) => (
              <div
                key={group._id}
                onClick={() => navigate(`/groups/${group._id}`)}
                className="bg-white rounded-xl shadow-sm p-4 active:scale-95 transition duration-150"
              >
                <div className="flex flex-col gap-3">
                  <div>
                    <h3 className="font-semibold text-gray-800">
                      {group.name}
                    </h3>
                    {group.description && (
                      <p className="text-gray-500 text-sm mt-0.5">
                        {group.description}
                      </p>
                    )}
                    <p className="text-gray-400 text-xs mt-1">
                      {group.members.length} member
                      {group.members.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <span className="text-green-500 text-xl">›</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
