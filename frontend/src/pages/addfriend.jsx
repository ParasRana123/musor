import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { UserPlus, Search, Users, Loader2, Check, X, User } from "lucide-react";
import { useAuth } from "@clerk/clerk-react";

const AddFriend = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [friends, setFriends] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingFriends, setIsLoadingFriends] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [addingFriendId, setAddingFriendId] = useState(null);

  const { getToken, userId } = useAuth();
  const backendapi = import.meta.env.VITE_BACKEND_URL;
  const searchUsers = useCallback(async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const token = await getToken();
      const response = await axios.get(`${backendapi}/getall` , {
        headers: {
          "Content-Type" : "application/json",
          Authorization: `Bearer ${token}`
        }
      });

      const allUsers = response.data || [];
      console.log(allUsers)
      // Filter users by search query (username or email)
      const filtered = allUsers.filter(
        (user) =>
          user.clerk_user_id !== userId &&
          (user.username?.toLowerCase().includes(query.toLowerCase()) ||
            user.email?.toLowerCase().includes(query.toLowerCase()))
      );

      // Check which users are already friends
      // const friendsUserIds = new Set(friends.map((f) => f.clerk_user_id));
      // const resultsWithStatus = filtered.map((user) => ({
      //   ...user,
      //   isFriend: friendsUserIds.has(user.clerk_user_id),
      // }));

      // setSearchResults(resultsWithStatus);
      setSearchResults(filtered);
    } catch (error) {
      console.error("Error searching users:", error);
      setError("Failed to search users. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [backendapi, userId, friends]);

  // Fetch current user's friends
  const fetchFriends = useCallback(async () => {
    setIsLoadingFriends(true);
    try {
      const token = await getToken();
      const response = await axios.get(`${backendapi}/friends`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = response?.data;
      if (Array.isArray(data)) {
        setFriends(data);
      } else if (Array.isArray(data?.friends)) {
        setFriends(data.friends);
      } else {
        console.warn("Unexpected friends response:", data);
        setFriends([]);
      }


    } catch (error) {
      console.error("Error fetching friends:", error);
      if (error.response?.status === 404) {
        // User not found or endpoint doesn't exist - set empty friends
        setFriends([]);
      } else if (error.response?.status !== 401) {
        // Only show error if it's not auth related
        console.error("Failed to load friends:", error.response?.data?.error || error.message);
      }
      setFriends([]); // Set empty array on error
    } finally {
      setIsLoadingFriends(false);
    }
  }, [backendapi, getToken]);

  // Add a friend
const handleAddFriend = useCallback(
  async (friendUserId) => {
    if (addingFriendId) return;

    setAddingFriendId(friendUserId);
    setError("");
    setSuccessMessage("");

    // Optimistic update – set status immediately
    setSearchResults((prev) =>
      prev.map((user) =>
        user.clerk_user_id === friendUserId
          ? { ...user, status: "requested" }
          : user
      )
    );

    try {
      const token = await getToken();
      await axios.post(
        `${backendapi}/friends`,
        { friendUserId },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setSuccessMessage("Friend request sent successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);

      // ✅ Don't call fetchFriends() here — it removes requested state
      // ✅ Don't call searchUsers() again — it resets the list
      // We'll rely on backend sync later (on mount or accept)
    } catch (error) {
      console.error("Error adding friend:", error);
      let errorMessage = "Failed to add friend. Please try again.";

      if (error.response) {
        errorMessage = error.response.data?.error || errorMessage;
      } else if (error.request) {
        errorMessage = "Network error. Please check your connection.";
      }

      setError(errorMessage);
      setTimeout(() => setError(""), 5000);
    } finally {
      setAddingFriendId(null);
    }
  },
  [backendapi, getToken, addingFriendId]
);


  const handleAcceptFriend = useCallback(async (friendUserId) => {
  try {
    const token = await getToken();
    await axios.post(
      `${backendapi}/friends/accept`,
      { friendUserId },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    setSuccessMessage("Friend request accepted!");
    setTimeout(() => setSuccessMessage(""), 3000);
    await fetchFriends();
    if (searchQuery) searchUsers(searchQuery);
  } catch (error) {
    console.error("Error accepting friend:", error);
    setError("Failed to accept friend request.");
    setTimeout(() => setError(""), 3000);
  }
}, [backendapi, getToken, fetchFriends, searchQuery, searchUsers]);


  // Remove a friend
  const handleRemoveFriend = useCallback(
    async (friendUserId) => {
      try {
        const token = await getToken();
        await axios.delete(`${backendapi}/friends/${friendUserId}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        setSuccessMessage("Friend removed successfully!");
        setTimeout(() => setSuccessMessage(""), 3000);

        // Refresh friends list
        await fetchFriends();
        if (searchQuery) {
          searchUsers(searchQuery);
        }
      } catch (error) {
        console.error("Error removing friend:", error);
        let errorMessage = "Failed to remove friend. Please try again.";
        
        if (error.response) {
          errorMessage = error.response.data?.error || errorMessage;
        } else if (error.request) {
          errorMessage = "Network error. Please check your connection.";
        }
        
        setError(errorMessage);
        setTimeout(() => setError(""), 5000);
      }
    },
    [backendapi, getToken, fetchFriends, searchQuery, searchUsers]
  );

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      searchUsers(searchQuery);
    }, 500);

    return () => clearTimeout(handler);
  }, [searchQuery, searchUsers]);

  // Fetch friends on mount
  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      {/* Animated Background */}
      <div className="fixed inset-0 opacity-20 pointer-events-none">
        {[...Array(40)].map((_, i) => (
          <div
            key={i}
            className="absolute bg-white rounded-full"
            style={{
              width: Math.random() * 3 + 1 + "px",
              height: Math.random() * 3 + 1 + "px",
              left: Math.random() * 100 + "%",
              top: Math.random() * 100 + "%",
              animation: `float ${
                Math.random() * 10 + 10
              }s ease-in-out infinite`,
              animationDelay: Math.random() * 5 + "s",
            }}
          />
        ))}
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center gap-3 mb-4">
            <UserPlus className="w-8 h-8 text-white animate-pulse" />
            <h1 className="text-5xl md:text-6xl font-bold">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-300 to-white">
                Add Friends
              </span>
            </h1>
          </div>
          <p className="text-gray-400 text-lg">
            Search and connect with other users
          </p>
        </div>

        {/* Messages */}
        {error && (
          <div className="max-w-2xl mx-auto mb-6">
            <div className="bg-red-900/20 border border-red-800 rounded-2xl px-6 py-4 text-center">
              <p className="text-red-400">{error}</p>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="max-w-2xl mx-auto mb-6">
            <div className="bg-green-900/20 border border-green-800 rounded-2xl px-6 py-4 text-center">
              <p className="text-green-400">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Search Section */}
        <div className="mb-12">
          <div className="relative max-w-2xl mx-auto">
            <div className="relative group">
              <div className="absolute inset-0 bg-white/10 rounded-full blur-xl group-hover:bg-white/20 transition-all duration-300"></div>
              <div className="relative bg-gradient-to-br from-gray-900 to-black border border-gray-700 rounded-full overflow-hidden group-hover:border-white/50 transition-all duration-300">
                <div className="flex items-center">
                  <div className="pl-6 pr-4">
                    <Search className="w-6 h-6 text-gray-400 group-hover:text-white transition-colors duration-300" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by username or email..."
                    className="flex-1 bg-transparent text-white placeholder-gray-500 py-3 pr-6 outline-none text-lg"
                  />
                  {isLoading && (
                    <div className="pr-6">
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Search Results */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-4 px-2">
              Search Results
            </h2>
            <div className="space-y-3 max-h-[calc(100vh-350px)] overflow-y-auto pr-2 custom-scrollbar">
              {Array.isArray(searchResults) && searchResults.length === 0 && searchQuery && !isLoading && (
                <div className="bg-gradient-to-br from-gray-900/50 to-black/50 border border-gray-800 rounded-xl p-8 text-center">
                  <p className="text-gray-400">No users found</p>
                </div>
              )}

              {Array.isArray(searchResults) && searchResults.map((user) => (
                <div
                  key={user.clerk_user_id}
                  className="group bg-gradient-to-br from-gray-900/50 to-black/50 border border-gray-800 rounded-xl overflow-hidden hover:border-white/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
                >
                  <div className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">
                          {user.username || "Unknown User"}
                        </p>
                        <p className="text-gray-400 text-sm truncate">
                          {user.email || "No email"}
                        </p>
                      </div>
                    </div>
                    {/* {user.isFriend ? (
                      <button
                        onClick={() => handleRemoveFriend(user.clerk_user_id)}
                        className="px-4 py-2 bg-red-900/20 border border-red-800 text-red-400 rounded-lg hover:bg-red-900/30 transition-all flex items-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        <span>Remove</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAddFriend(user.clerk_user_id)}
                        disabled={addingFriendId === user.clerk_user_id}
                        className="px-4 py-2 bg-green-900/20 border border-green-800 text-green-400 rounded-lg hover:bg-green-900/30 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {addingFriendId === user.clerk_user_id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        <span>Add</span>
                      </button>
                    )} */}
                    {user.status === "friend" ? (
  <button
    onClick={() => handleRemoveFriend(user.clerk_user_id)}
    className="px-4 py-2 bg-red-900/20 border border-red-800 text-red-400 rounded-lg hover:bg-red-900/30 transition-all flex items-center gap-2"
  >
    <X className="w-4 h-4" />
    <span>Remove</span>
  </button>
) : user.status === "requested" ? (
  <button
    disabled
    className="px-4 py-2 bg-yellow-900/20 border border-yellow-700 text-yellow-400 rounded-lg flex items-center gap-2 cursor-not-allowed"
  >
    <Loader2 className="w-4 h-4 animate-pulse" />
    <span>Requested</span>
  </button>
) : user.status === "incoming" ? (
  <button
    onClick={() => handleAcceptFriend(user.clerk_user_id)}
    className="px-4 py-2 bg-green-900/20 border border-green-800 text-green-400 rounded-lg hover:bg-green-900/30 transition-all flex items-center gap-2"
  >
    <Check className="w-4 h-4" />
    <span>Accept</span>
  </button>
) : (
  <button
    onClick={() => handleAddFriend(user.clerk_user_id)}
    disabled={addingFriendId === user.clerk_user_id}
    className="px-4 py-2 bg-green-900/20 border border-green-800 text-green-400 rounded-lg hover:bg-green-900/30 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
  >
    {addingFriendId === user.clerk_user_id ? (
      <Loader2 className="w-4 h-4 animate-spin" />
    ) : (
      <Check className="w-4 h-4" />
    )}
    <span>Add</span>
  </button>
)}

                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: My Friends */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-4 px-2">
              My Friends ({Array.isArray(friends) ? friends.length : 0})
            </h2>
            <div className="space-y-3 max-h-[calc(100vh-350px)] overflow-y-auto pr-2 custom-scrollbar">
              {isLoadingFriends ? (
                <div className="bg-gradient-to-br from-gray-900/50 to-black/50 border border-gray-800 rounded-xl p-8 text-center">
                  <Loader2 className="w-8 h-8 text-white animate-spin mx-auto mb-4" />
                  <p className="text-gray-400">Loading friends...</p>
                </div>
              ) : !Array.isArray(friends) || friends.length === 0 ? (
                <div className="bg-gradient-to-br from-gray-900/50 to-black/50 border border-gray-800 rounded-xl p-8 text-center">
                  <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No friends yet</p>
                  <p className="text-gray-500 text-sm mt-2">
                    Search for users and add them as friends
                  </p>
                </div>
              ) : (
                friends.map((friend) => (
                  <div
                    key={friend.clerk_user_id}
                    className="group bg-gradient-to-br from-gray-900/50 to-black/50 border border-gray-800 rounded-xl overflow-hidden hover:border-white/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
                  >
                    <div className="p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate">
                            {friend.username || "Unknown User"}
                          </p>
                          <p className="text-gray-400 text-sm truncate">
                            {friend.email || "No email"}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveFriend(friend.clerk_user_id)}
                        className="px-4 py-2 bg-red-900/20 border border-red-800 text-red-400 rounded-lg hover:bg-red-900/30 transition-all flex items-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </div>
  );
};

export default AddFriend;
