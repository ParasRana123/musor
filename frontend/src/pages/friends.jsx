import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { Users, UserX, Loader2, User, Mail } from "lucide-react";
import { useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";

const Friends = () => {
  const [friends, setFriends] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [removingFriendId, setRemovingFriendId] = useState(null);

  const { getToken } = useAuth();
  const navigate = useNavigate();
  const backendapi = import.meta.env.VITE_BACKEND_URL;

  // Fetch friends
  const fetchFriends = useCallback(async () => {
    setIsLoading(true);
    setError("");
    
    try {
      const token = await getToken();
      const response = await axios.get(`${backendapi}/friends`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      setFriends(response.data.friends || []);
    } catch (error) {
      console.error("Error fetching friends:", error);
      if (error.response?.status === 404) {
        setFriends([]);
      } else if (error.response?.status !== 401) {
        setError("Failed to load friends. Please try again.");
      }
      setFriends([]);
    } finally {
      setIsLoading(false);
    }
  }, [backendapi, getToken]);

  // Remove a friend
  const handleRemoveFriend = useCallback(async (friendUserId) => {
    if (removingFriendId) return;
    
    if (!window.confirm("Are you sure you want to remove this friend?")) {
      return;
    }

    setRemovingFriendId(friendUserId);
    try {
      const token = await getToken();
      await axios.delete(`${backendapi}/friends/${friendUserId}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      // Remove from local state immediately
      setFriends((prev) => prev.filter((f) => f.clerk_user_id !== friendUserId));
    } catch (error) {
      console.error("Error removing friend:", error);
      setError("Failed to remove friend. Please try again.");
      setTimeout(() => setError(""), 5000);
    } finally {
      setRemovingFriendId(null);
    }
  }, [backendapi, getToken, removingFriendId]);

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
            <Users className="w-8 h-8 text-white animate-pulse" />
            <h1 className="text-5xl md:text-6xl font-bold">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-300 to-white">
                My Friends
              </span>
            </h1>
          </div>
          <p className="text-gray-400 text-lg">
            {friends.length} {friends.length === 1 ? 'friend' : 'friends'}
          </p>
        </div>

        {error && (
          <div className="max-w-2xl mx-auto mb-6">
            <div className="bg-red-900/20 border border-red-800 rounded-2xl px-6 py-4 text-center">
              <p className="text-red-400">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-gradient-to-br from-gray-900/50 to-black/50 border border-gray-800 rounded-3xl p-12 text-center">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                <Loader2 className="w-10 h-10 text-white animate-spin" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">
                Loading Friends...
              </h3>
              <p className="text-gray-400">
                Please wait while we fetch your friends
              </p>
            </div>
          </div>
        )}

        {/* Friends List */}
        {!isLoading && (
          <div className="max-w-4xl mx-auto">
            {friends.length === 0 ? (
              <div className="bg-gradient-to-br from-gray-900/50 to-black/50 border border-gray-800 rounded-3xl p-12 text-center">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Users className="w-10 h-10 text-gray-600" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">
                  No Friends Yet
                </h3>
                <p className="text-gray-400 leading-relaxed mb-6">
                  Start building your network! Add friends from the Add Friends page.
                </p>
                <a
                  href="/addfriend"
                  className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-500 hover:to-purple-500 transition-all duration-300 hover:scale-105"
                >
                  Add Friends
                </a>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {friends.map((friend) => (
                  <div
                    key={friend.clerk_user_id}
                    onClick={() => navigate(`/profile/${friend.clerk_user_id}`)}
                    className="group bg-gradient-to-br from-gray-900/50 to-black/50 border border-gray-800 rounded-xl overflow-hidden hover:border-white/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
                  >
                    <div className="p-6">
                      {/* Avatar */}
                      <div className="flex items-center justify-center mb-4">
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                          {friend.username?.charAt(0).toUpperCase() || "?"}
                        </div>
                      </div>

                      {/* User Info */}
                      <div className="text-center mb-4">
                        <h3 className="text-white font-semibold text-lg mb-1 truncate">
                          {friend.username || "Unknown User"}
                        </h3>
                        {friend.email && (
                          <div className="flex items-center justify-center gap-1 text-gray-400 text-sm">
                            <Mail className="w-4 h-4" />
                            <span className="truncate">{friend.email}</span>
                          </div>
                        )}
                        {friend.created_at && (
                          <p className="text-gray-500 text-xs mt-2">
                            Friends since {new Date(friend.created_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => handleRemoveFriend(friend.clerk_user_id)}
                        disabled={removingFriendId === friend.clerk_user_id}
                        className="w-full px-4 py-2 bg-red-900/20 border border-red-800 text-red-400 rounded-lg hover:bg-red-900/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {removingFriendId === friend.clerk_user_id ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Removing...</span>
                          </>
                        ) : (
                          <>
                            <UserX className="w-4 h-4" />
                            <span>Remove Friend</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
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
      `}</style>
    </div>
  );
};

export default Friends;

