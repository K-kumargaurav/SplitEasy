import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import MemberSearch from "../components/MemberSearch";

export default function GroupDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("expenses");
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [newExpense, setNewExpense] = useState({
    description: "",
    amount: "",
    splitType: "equal",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAll();
  }, [id]);

  const fetchAll = async () => {
    try {
      const [groupRes, expensesRes, balancesRes] = await Promise.all([
        api.get(`/groups/${id}`),
        api.get(`/groups/${id}/expenses`),
        api.get(`/groups/${id}/balances`),
      ]);
      setGroup(groupRes.data);
      setExpenses(expensesRes.data);
      setBalances(balancesRes.data);
    } catch (err) {
      setError("Failed to load group data");
    } finally {
      setLoading(false);
    }
  };

  const getMemberName = (userId) => {
    const member = group?.members.find((m) => m._id === userId);
    return member ? member.name : userId;
  };

  const handleSendInvite = async (invitedUser) => {
    try {
      await api.post(`/groups/${id}/invite`, { userId: invitedUser._id });
      setInviteSuccess(`Invite sent to ${invitedUser.name}!`);
      setShowAddMember(false);
      setTimeout(() => setInviteSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send invite");
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/groups/${id}/expenses`, {
        description: newExpense.description,
        amount: parseFloat(newExpense.amount),
        splitType: newExpense.splitType,
      });
      setNewExpense({ description: "", amount: "", splitType: "equal" });
      setShowExpenseForm(false);
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add expense");
    }
  };

  const handleSettle = async (balance) => {
    try {
      await api.post(`/groups/${id}/settle`, {
        paidToId: balance.owedTo,
        amount: balance.amount,
      });
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to settle");
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navbar */}
      <nav className="bg-white shadow-sm px-4 py-3 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/dashboard")}
            className="text-gray-500 hover:text-gray-700 text-lg"
          >
            ←
          </button>
          <h1 className="text-base font-bold text-green-600 truncate max-w-[180px] sm:max-w-xs">
            {group?.name}
          </h1>
        </div>
        <span className="text-gray-400 text-xs">
          {group?.members.length} members
        </span>
      </nav>

      <div className="max-w-2xl mx-auto px-3 py-4">
        {error && (
          <p className="bg-red-100 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</p>
        )}

        {/* Members Card */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-medium text-gray-600">
              Members ({group?.members.length})
            </span>
            {group?.createdBy._id === user?.id && (
              <button
                onClick={() => setShowAddMember(!showAddMember)}
                className="text-green-600 text-sm font-medium"
              >
                + Invite
              </button>
            )}
          </div>

          <div className="flex gap-2 flex-wrap">
            {group?.members.map((member) => (
              <span
                key={member._id}
                className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium"
              >
                {member.name} {member._id === user?.id ? "(You)" : ""}
              </span>
            ))}
          </div>

          {inviteSuccess && (
            <p className="text-green-600 text-sm mt-2">{inviteSuccess}</p>
          )}

          {showAddMember && (
            <div className="mt-3">
              <MemberSearch
                onAdd={handleSendInvite}
                existingMembers={group?.members}
              />
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {["expenses", "balances"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 rounded-lg font-medium capitalize transition text-sm ${
                activeTab === tab
                  ? "bg-green-600 text-white"
                  : "bg-white text-gray-600"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Expenses Tab */}
        {activeTab === "expenses" && (
          <div>
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-base font-semibold text-gray-800">Expenses</h2>
              <button
                onClick={() => setShowExpenseForm(!showExpenseForm)}
                className="bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition text-sm"
              >
                + Add
              </button>
            </div>

            {/* Add Expense Form */}
            {showExpenseForm && (
              <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
                <form onSubmit={handleAddExpense} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      placeholder="Hotel booking"
                      value={newExpense.description}
                      onChange={(e) =>
                        setNewExpense({ ...newExpense, description: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500 text-base"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount (₹)
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder="2000"
                      value={newExpense.amount}
                      onChange={(e) =>
                        setNewExpense({ ...newExpense, amount: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500 text-base"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Split Type
                    </label>
                    <select
                      value={newExpense.splitType}
                      onChange={(e) =>
                        setNewExpense({ ...newExpense, splitType: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500 text-base"
                    >
                      <option value="equal">Equal Split</option>
                      <option value="custom">Custom Split</option>
                    </select>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      className="flex-1 bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 transition font-medium"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowExpenseForm(false)}
                      className="flex-1 bg-gray-200 text-gray-700 py-2.5 rounded-lg hover:bg-gray-300 transition font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Expenses List */}
            {expenses.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-3xl mb-2">🧾</p>
                <p className="text-gray-400 text-sm">No expenses yet!</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {expenses.map((expense) => (
                  <div key={expense._id} className="bg-white rounded-xl shadow-sm p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-800 text-sm">
                          {expense.description}
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Paid by{" "}
                          <span className="text-green-600 font-medium">
                            {expense.paidBy.name}
                          </span>
                        </p>
                      </div>
                      <span className="font-bold text-gray-800">₹{expense.amount}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {expense.splitBetween.map((split) => (
                        <span
                          key={split._id}
                          className={`text-xs px-2 py-1 rounded-full ${
                            split.paid
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-600"
                          }`}
                        >
                          {split.user.name}: ₹{split.share} {split.paid ? "✓" : "✗"}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Balances Tab */}
        {activeTab === "balances" && (
          <div>
            <h2 className="text-base font-semibold text-gray-800 mb-3">Balances</h2>
            {balances.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl shadow-sm">
                <p className="text-green-600 font-medium">🎉 All settled up!</p>
                <p className="text-gray-400 text-sm mt-1">No pending balances</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {balances.map((balance, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-xl shadow-sm p-4"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-800">
                          <span className="text-red-500 font-medium">
                            {getMemberName(balance.owedBy)}
                          </span>
                          {" owes "}
                          <span className="text-green-600 font-medium">
                            {getMemberName(balance.owedTo)}
                          </span>
                        </p>
                        <p className="text-xl font-bold text-gray-800 mt-1">
                          ₹{balance.amount}
                        </p>
                      </div>
                      {balance.owedBy === user?.id && (
                        <button
                          onClick={() => handleSettle(balance)}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm font-medium"
                        >
                          Settle Up
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
