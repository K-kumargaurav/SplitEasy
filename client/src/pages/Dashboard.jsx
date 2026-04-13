import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import MemberSearch from "../components/MemberSearch";

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

  useEffect(() => {
    fetchGroups();
    fetchInvites();
    fetchNotifications();
  }, []);

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
      fetchGroups();
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
        className="relative p-2 text-gray-500 hover:text-gray-700"
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
        <div className="absolute right-0 mt-1 w-72 bg-white rounded-xl shadow-lg border border-gray-200 z-20">
          <div className="p-3 border-b border-gray-100">
            <p className="font-semibold text-gray-800 text-sm">Notifications</p>
          </div>
          {notifications.length === 0 ? (
            <p className="text-gray-400 text-sm p-4 text-center">No notifications</p>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              {notifications.map((n, i) => (
                <div
                  key={i}
                  className={`p-3 border-b border-gray-50 text-sm ${
                    !n.read ? 'bg-red-50' : ''
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
      className="bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600 transition text-sm"
    >
      Logout
    </button>
  </div>
</nav>

      <div className="max-w-2xl mx-auto px-3 py-5">
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
                      className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition text-sm font-medium"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() =>
                        handleInviteResponse(invite.groupId, "rejected")
                      }
                      className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition text-sm font-medium"
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
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Your Groups</h2>
          <button
            onClick={() => {
              setError("");
              setShowCreateForm(!showCreateForm);
            }}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm font-medium"
          >
            + New Group
          </button>
        </div>

        {/* Create Group Form */}
        {showCreateForm && (
          <div className="bg-white rounded-xl shadow-md p-4 mb-5">
            <h3 className="text-base font-semibold mb-4">Create New Group</h3>
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
                  placeholder="Goa Trip"
                  value={newGroup.name}
                  onChange={(e) =>
                    setNewGroup({ ...newGroup, name: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500 text-base"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="Trip expenses"
                  value={newGroup.description}
                  onChange={(e) =>
                    setNewGroup({ ...newGroup, description: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500 text-base"
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
                          className="text-green-500 hover:text-red-500 font-bold"
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
                  className="flex-1 bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 transition font-medium"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2.5 rounded-lg hover:bg-gray-300 transition font-medium"
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
                className="bg-white rounded-xl shadow-sm p-4 cursor-pointer hover:shadow-md active:scale-95 transition"
              >
                <div className="flex justify-between items-center">
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
