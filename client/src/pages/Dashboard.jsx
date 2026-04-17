import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import MemberSearch from "../components/MemberSearch";
import socket from "../utils/socket";
import toast from "react-hot-toast";

function Avatar({ name, size = "md" }) {
  const initials = name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const colors = ["from-emerald-400 to-teal-500", "from-violet-400 to-purple-500", "from-orange-400 to-rose-500", "from-blue-400 to-cyan-500", "from-pink-400 to-fuchsia-500"];
  const color = colors[name?.charCodeAt(0) % colors.length] || colors[0];
  const sz = size === "sm" ? "w-8 h-8 text-xs" : size === "lg" ? "w-12 h-12 text-lg" : "w-10 h-10 text-sm";
  return (
    <div className={`${sz} rounded-full bg-linear-to-br ${color} flex items-center justify-center text-white font-bold shrink-0`}>
      {initials}
    </div>
  );
}

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

    const settlementRequestHandler = (data) => {
      toast((t) => (
        <div onClick={() => { navigate(`/groups/${data.groupId}`); toast.dismiss(t.id); }} style={{ cursor: "pointer", padding: "8px" }}>
          💰 {data.message}
        </div>
      ));
    };
    const settlementUpdateHandler = (data) => {
      toast((t) => (
        <div onClick={() => { navigate("/dashboard"); toast.dismiss(t.id); }} style={{ cursor: "pointer", padding: "8px" }}>
          {data.status === "accepted" ? "✅ Settlement accepted" : "❌ Settlement rejected"}
        </div>
      ));
    };
    const newInviteHandler = (data) => {
      toast((t) => (
        <div onClick={() => { navigate(`/groups/${data.groupId}`); toast.dismiss(t.id); }} style={{ cursor: "pointer", padding: "8px" }}>
          📩 New invite — Click to open
        </div>
      ));
    };

    socket.on("settlement_request", settlementRequestHandler);
    socket.on("settlement_update", settlementUpdateHandler);
    socket.on("new_invite", newInviteHandler);

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
    }
  };

  const handleNotificationClick = async () => {
    setShowNotifications(!showNotifications);
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
    }
  };

  const handleSettlementResponse = async (settlementId, status) => {
    try {
      await api.put(`/settlements/${settlementId}/respond`, { status });
      setPendingSettlements((prev) => prev.filter((s) => s._id !== settlementId));
      toast.success(status === "accepted" ? "Settlement confirmed!" : "Settlement rejected");
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
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-100 px-4 py-3 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xl">💸</span>
          <h1 className="text-xl font-bold bg-linear-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
            SplitEasy
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-500 text-sm hidden sm:block font-medium">
            Hey, {user?.name}!
          </span>

          {/* Notification Bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={handleNotificationClick}
              className="relative p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-20 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                  <p className="font-semibold text-gray-800 text-sm">Notifications</p>
                </div>
                {notifications.length === 0 ? (
                  <p className="text-gray-400 text-sm p-6 text-center">No notifications yet</p>
                ) : (
                  <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                    {notifications.map((n, i) => (
                      <div key={i} className={`px-4 py-3 text-sm ${!n.read ? "bg-emerald-50" : ""}`}>
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
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-semibold transition"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-6 pb-24 space-y-5">

        {/* Pending Settlements */}
        {pendingSettlements.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Settlement Requests ({pendingSettlements.length})
            </p>
            <div className="space-y-3">
              {pendingSettlements.map((s) => (
                <div key={s._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar name={s.paidBy.name} size="sm" />
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{s.paidBy.name} wants to pay you</p>
                      <p className="text-xs text-gray-400">{s.group.name}</p>
                    </div>
                    <span className="ml-auto text-xl font-bold text-emerald-600">₹{s.amount / 100}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSettlementResponse(s._id, "accepted")}
                      className="flex-1 bg-linear-to-r from-emerald-500 to-green-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition"
                    >
                      Confirm ✓
                    </button>
                    <button
                      onClick={() => handleSettlementResponse(s._id, "rejected")}
                      className="flex-1 bg-gray-100 text-gray-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-200 transition"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending Invites */}
        {invites.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Pending Invites ({invites.length})
            </p>
            <div className="space-y-3">
              {invites.map((invite) => (
                <div key={invite.groupId} className="bg-white rounded-2xl border border-amber-100 shadow-sm p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-lg shrink-0">👥</div>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{invite.groupName}</p>
                      <p className="text-xs text-gray-400">Invited by <span className="text-emerald-600 font-medium">{invite.invitedBy.name}</span></p>
                      {invite.description && <p className="text-xs text-gray-400 mt-0.5">{invite.description}</p>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleInviteResponse(invite.groupId, "accepted")}
                      className="flex-1 bg-linear-to-r from-emerald-500 to-green-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleInviteResponse(invite.groupId, "rejected")}
                      className="flex-1 bg-gray-100 text-gray-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-200 transition"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Groups */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Your Groups</p>
            <button
              onClick={() => { setError(""); setShowCreateForm(true); }}
              className="bg-linear-to-r from-emerald-500 to-green-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition shadow-sm"
            >
              + New Group
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl mb-4 text-sm">{error}</div>
          )}

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
            </div>
          ) : groups.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
              <p className="text-5xl mb-3">💸</p>
              <p className="text-gray-700 font-semibold">No groups yet</p>
              <p className="text-gray-400 text-sm mt-1">Create a group to start splitting expenses</p>
            </div>
          ) : (
            <div className="space-y-3">
              {groups.map((group) => (
                <div
                  key={group._id}
                  onClick={() => navigate(`/groups/${group._id}`)}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4 cursor-pointer hover:shadow-md hover:border-emerald-100 active:scale-[0.99] transition-all duration-150"
                >
                  <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-emerald-50 to-teal-100 flex items-center justify-center text-xl shrink-0">
                    👥
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{group.name}</h3>
                    {group.description && (
                      <p className="text-gray-400 text-sm truncate mt-0.5">{group.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {group.members.length} member{group.members.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Group Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Create Group</h2>
              <button onClick={() => setShowCreateForm(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition">✕</button>
            </div>

            {error && (
              <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl text-sm">{error}</div>
            )}

            <form onSubmit={handleCreateGroup} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Group Name</label>
                <input
                  type="text"
                  placeholder="e.g. Goa Trip, Room Rent..."
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                  className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition text-base"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
                <input
                  type="text"
                  placeholder="Purpose, dates, activities..."
                  value={newGroup.description}
                  onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                  className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Invite Members</label>
                <MemberSearch
                  onAdd={(u) => setSelectedMembers((prev) => [...prev, u])}
                  existingMembers={selectedMembers}
                />
                {selectedMembers.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {selectedMembers.map((member) => (
                      <span key={member._id} className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full text-sm font-medium">
                        {member.name}
                        <button
                          type="button"
                          onClick={() => setSelectedMembers((prev) => prev.filter((m) => m._id !== member._id))}
                          className="text-emerald-400 hover:text-red-500 transition"
                        >×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-linear-to-r from-emerald-500 to-green-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition shadow-sm">
                  Create
                </button>
                <button type="button" onClick={() => setShowCreateForm(false)} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
