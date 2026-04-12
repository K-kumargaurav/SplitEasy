import { useState } from "react";
import api from "../utils/api";

export default function MemberSearch({ onAdd, existingMembers = [] }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (value) => {
    setQuery(value);
    if (value.length < 3) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get(`/users/search?email=${value}`);
      const filtered = res.data.filter(
        (u) => !existingMembers.find((m) => m._id === u._id || m === u._id),
      );
      setResults(filtered);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = (user) => {
    onAdd(user);
    setQuery("");
    setResults([]);
  };

  return (
    <div className="relative">
      <input
        type="text"
        placeholder="Search by email (min 3 characters)..."
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
      />
      {results.length > 0 && (
        <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1">
          {results.map((user) => (
            <div
              key={user._id}
              onClick={() => handleAdd(user)}
              className="flex justify-between items-center px-4 py-3 hover:bg-gray-50 cursor-pointer"
            >
              <div>
                <p className="font-medium text-gray-800">{user.name}</p>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
              <span className="text-green-600 font-medium text-sm">
                + Invite
              </span>
            </div>
          ))}
        </div>
      )}
      {loading && <p className="text-sm text-gray-400 mt-1">Searching...</p>}
      {query.length >= 3 && !loading && results.length === 0 && (
        <p className="text-sm text-gray-400 mt-1">No users found</p>
      )}
    </div>
  );
}
