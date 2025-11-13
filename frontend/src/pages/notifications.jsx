import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { Bell, UserPlus, Check, X, Loader2, Users } from "lucide-react";
import { useAuth } from "@clerk/clerk-react";

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [processingId, setProcessingId] = useState(null);
  const [lastNotificationCount, setLastNotificationCount] = useState(0);
  const [hasNewNotifications, setHasNewNotifications] = useState(false);

  const { getToken, userId } = useAuth();
  const backendapi = import.meta.env.VITE_BACKEND_URL;

  // Fetch notifications (with optional silent flag for background refresh)
  const fetchNotifications = useCallback(async (silent = false) => {
    if (!silent) {
      setIsLoading(true);
    }
    setError("");
    
    try {
      const token = await getToken();
      const response = await axios.get(`${backendapi}/notifications`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      
      const newNotifications = response.data.notifications || [];
      
      // Check if there are new notifications
      setNotifications((prevNotifications) => {
        if (silent && newNotifications.length > prevNotifications.length && prevNotifications.length > 0) {
          setHasNewNotifications(true);
          // Auto-hide after 3 seconds
          setTimeout(() => setHasNewNotifications(false), 3000);
        }
        setLastNotificationCount(newNotifications.length);
        return newNotifications;
      });
    } catch (error) {
      console.error("Error fetching notifications:", error);
      if (!silent) {
        setError("Failed to load notifications. Please try again.");
        setNotifications([]);
      }
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, [backendapi, getToken]);

  // Handle accept friend request
  const handleAccept = useCallback(async (notification) => {
    if (processingId) return;
    
    setProcessingId(notification.id);
    
    // Optimistically remove notification from UI immediately
    setNotifications((prev) => {
      if (notification.id) {
        return prev.filter((n) => n.id !== notification.id);
      }
      // Fallback: filter by sender and type if no ID
      return prev.filter((n) => !(n.sender === notification.sender && n.type === 'send_req'));
    });
    
    try {
      const token = await getToken();
      
      // Send response notification (this will create the friendship if accepted)
      await axios.post(
        `${backendapi}/notifications/respond`,
        {
          sender: notification.sender,
          response: "accept",
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Refresh notifications to get updated list (silent - no loading spinner)
      await fetchNotifications(true);
    } catch (error) {
      console.error("Error accepting friend request:", error);
      const errorMessage = error.response?.data?.error || "Failed to accept friend request. Please try again.";
      setError(errorMessage);
      setTimeout(() => setError(""), 5000);
      
      // Restore notification on error
      fetchNotifications(true);
    } finally {
      setProcessingId(null);
    }
  }, [backendapi, getToken, fetchNotifications, processingId]);

  // Handle reject friend request
  const handleReject = useCallback(async (notification) => {
    if (processingId) return;
    
    setProcessingId(notification.id);
    
    // Optimistically remove notification from UI immediately
    setNotifications((prev) => {
      if (notification.id) {
        return prev.filter((n) => n.id !== notification.id);
      }
      // Fallback: filter by sender and type if no ID
      return prev.filter((n) => !(n.sender === notification.sender && n.type === 'send_req'));
    });
    
    try {
      const token = await getToken();
      
      // Send response notification
      await axios.post(
        `${backendapi}/notifications/respond`,
        {
          sender: notification.sender,
          response: "reject",
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Refresh notifications to get updated list (silent - no loading spinner)
      await fetchNotifications(true);
    } catch (error) {
      console.error("Error rejecting friend request:", error);
      setError("Failed to reject friend request. Please try again.");
      setTimeout(() => setError(""), 5000);
      
      // Restore notification on error
      fetchNotifications(true);
    } finally {
      setProcessingId(null);
    }
  }, [backendapi, getToken, fetchNotifications, processingId]);

  // Fetch notifications on mount and periodically
  useEffect(() => {
    fetchNotifications(false); // Initial load with loading state
    
    // Poll for new notifications every 5 seconds (silent background refresh)
    const interval = setInterval(() => {
      fetchNotifications(true); // Silent refresh - no loading spinner
    }, 5000);
    
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Get notification message based on type
  const getNotificationMessage = (notification) => {
    switch (notification.type) {
      case "send_req":
        return "sent you a friend request";
      case "accept":
        return "accepted your friend request";
      case "reject":
        return "rejected your friend request";
      default:
        return "sent you a notification";
    }
  };

  // Get notification icon
  const getNotificationIcon = (type) => {
    switch (type) {
      case "send_req":
        return <UserPlus className="w-5 h-5" />;
      case "accept":
        return <Check className="w-5 h-5" />;
      case "reject":
        return <X className="w-5 h-5" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  // Filter unread notifications (only show send_req for now)
  const unreadNotifications = notifications.filter(n => n.type === "send_req");
  const readNotifications = notifications.filter(n => n.type !== "send_req");

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

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center gap-3 mb-4">
            <Bell className="w-8 h-8 text-white animate-pulse" />
            <h1 className="text-5xl md:text-6xl font-bold">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-300 to-white">
                Notifications
              </span>
            </h1>
          </div>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <p className="text-gray-400 text-lg">
              {unreadNotifications.length > 0 && `${unreadNotifications.length} new notification${unreadNotifications.length > 1 ? 's' : ''}`}
            </p>
            {hasNewNotifications && (
              <span className="px-3 py-1 bg-green-500/20 border border-green-500/50 text-green-400 rounded-full text-sm animate-pulse">
                New notifications!
              </span>
            )}
          </div>
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
                Loading Notifications...
              </h3>
            </div>
          </div>
        )}

        {/* Notifications List */}
        {!isLoading && (
          <div className="space-y-4">
            {/* Unread Notifications */}
            {unreadNotifications.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-white mb-4 px-2">
                  Friend Requests ({unreadNotifications.length})
                </h2>
                <div className="space-y-3">
                  {unreadNotifications.map((notification) => (
                    <div
                      key={notification.id || notification.sender}
                      className="bg-gradient-to-br from-gray-900/50 to-black/50 border border-gray-800 rounded-xl p-4 hover:border-white/50 transition-all duration-300"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center flex-shrink-0 text-blue-400">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1">
                            <p className="text-white font-medium">
                              <div className="flex items-center gap-2">
  {notification.senderInfo?.imageUrl ? (
    <img
      src={notification.senderInfo.imageUrl}
      alt={notification.senderInfo.username}
      className="w-10 h-10 rounded-full border border-gray-700"
    />
  ) : (
    <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white font-semibold">
      {notification.senderInfo?.username?.[0]?.toUpperCase() || "?"}
    </div>
  )}
  <p className="text-white font-medium">
    <span className="text-gray-300">{notification.senderInfo?.username || "Unknown User"}</span>{" "}
    {getNotificationMessage(notification)}
  </p>
</div>
                            </p>
                            {notification.created_at && (
                              <p className="text-gray-500 text-sm mt-1">
                                {new Date(notification.created_at).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAccept(notification)}
                            disabled={processingId === notification.id}
                            className="px-4 py-2 bg-green-900/20 border border-green-800 text-green-400 rounded-lg hover:bg-green-900/30 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {processingId === notification.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                            <span>Accept</span>
                          </button>
                          <button
                            onClick={() => handleReject(notification)}
                            disabled={processingId === notification.id}
                            className="px-4 py-2 bg-red-900/20 border border-red-800 text-red-400 rounded-lg hover:bg-red-900/30 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {processingId === notification.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <X className="w-4 h-4" />
                            )}
                            <span>Reject</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Read Notifications */}
            {readNotifications.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-white mb-4 px-2">
                  Recent Activity ({readNotifications.length})
                </h2>
                <div className="space-y-3">
                  {readNotifications.map((notification) => (
                    <div
                      key={notification.id || notification.sender}
                      className="bg-gradient-to-br from-gray-900/30 to-black/30 border border-gray-800/50 rounded-xl p-4 opacity-75"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center flex-shrink-0 text-gray-400">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1">
                          <p className="text-gray-400 font-medium text-sm">
                            <div className="flex items-center gap-2">
  {notification.senderInfo?.imageUrl ? (
    <img
      src={notification.senderInfo.imageUrl}
      alt={notification.senderInfo.username}
      className="w-8 h-8 rounded-full border border-gray-700"
    />
  ) : (
    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white font-semibold">
      {notification.senderInfo?.username?.[0]?.toUpperCase() || "?"}
    </div>
  )}
  <p className="text-gray-400 font-medium text-sm">
    <span className="text-gray-300">
      {notification.senderInfo?.username || "Unknown User"}
    </span>{" "}
    {getNotificationMessage(notification)}
  </p>
</div>
                          </p>
                          {notification.created_at && (
                            <p className="text-gray-600 text-xs mt-1">
                              {new Date(notification.created_at).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {notifications.length === 0 && (
              <div className="bg-gradient-to-br from-gray-900/50 to-black/50 border border-gray-800 rounded-3xl p-12 text-center">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Bell className="w-10 h-10 text-gray-600" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">
                  No Notifications
                </h3>
                <p className="text-gray-400 leading-relaxed">
                  You're all caught up! New friend requests and updates will appear here.
                </p>
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

export default Notifications;

