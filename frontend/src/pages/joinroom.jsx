import React, { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Users, Play, Video, Loader2, Youtube, LogOut, Send, MessageCircle } from "lucide-react";
import { useAuth } from "@clerk/clerk-react";

const JoinRoom = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [roomId, setRoomId] = useState(searchParams.get("room") || "");
  const [isConnected, setIsConnected] = useState(false);
  const [currentVideo, setCurrentVideo] = useState("");
  const [currentVideoId, setCurrentVideoId] = useState("");
  const [videoInput, setVideoInput] = useState("");
  const [roomUsers, setRoomUsers] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [searchQuery , setSearchQuery] = useState("");
  const [searchResults , setSearchResults] = useState("");
  const [queue , setQueue] = useState([]);

  const [chatMessage , setChatMessage] = useState("");
  const [messages , setMessages] = useState([]);
  
  const wsRef = useRef(null);
  const playerRef = useRef(null);
  const isSyncingRef = useRef(false);
  const pendingSyncRef = useRef(null);
  const syncIntervalRef = useRef(null);
  const lastSyncTimeRef = useRef(0);
  const chatEndRef = useRef(null);
  const { userId } = useAuth();
  const wsUrl = import.meta.env.VITE_WS_URL || "ws://localhost:8080";
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080"

  const searchSongs = () => {
    if(!searchQuery.trim()) return;
    try {
      const res = await fetch(`${API_URL}/music/get-music-link` , {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songs: searchQuery });
      });
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch {
      setError("Failed to fetch songs");
    }
  }

  // Helper function to extract YouTube video ID from URL
  const extractVideoId = (url) => {
    if (!url) return null;
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) return match[1];
    }
    return null;
  };

  // Convert link to embed format with autoplay and API
  const getEmbedLink = (link, startTime = 0) => {
    const videoId = extractVideoId(link);
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}&start=${Math.floor(startTime)}&autoplay=1`;
    }
    return link;
  };

  // Load YouTube IFrame API
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

      const originalOnReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        console.log("YouTube IFrame API ready");
        if (originalOnReady) originalOnReady();
        // Trigger a re-render if video is already set
        if (currentVideo) {
          setCurrentVideo(currentVideo + '?refresh=' + Date.now());
        }
      };
    }
  }, []);

  // send chat message
  const sendChatMessage = useCallback(() => {
    if(!chatMessage.trim() || !isConnected || !wsRef.current) return;

    wsRef.current.send(JSON.stringify({
      type: "chat",
      chat: chatMessage,
      roomId: roomId
    }));

    setChatMessage("");
  } , [chatMessage , isConnected , roomId]);

  // Connect to WebSocket
  const connectWebSocket = useCallback(() => {
    if (!roomId.trim()) {
      setError("Please enter a room ID");
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    setIsLoading(true);
    setError("");

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("WebSocket connected");
        setIsConnected(true);
        setIsLoading(false);
        
        // Join room
        ws.send(JSON.stringify({
          type: "join_room",
          payload: {
            userId: userId,
            roomId: roomId
          }
        }));
      };

      ws.onmessage = (event) => {
        try {
          // Check if message is a string (like "connected")
          if (typeof event.data === 'string' && !event.data.startsWith('{')) {
            // Handle non-JSON messages (like connection confirmation)
            if (event.data === 'connected') {
              console.log("WebSocket connection confirmed");
            }
            return;
          }

          const message = JSON.parse(event.data);

          if(message.type === "chat") {
            setMessages(prev => [...prev , {
              text: message.chat,
              senderId: message.senderId,
              timestamp: new Date(),
              isOwn: message.senderId === userId
            }]);
          }
          
          if (message.type === "stream") {
            // Received video stream from another user - ALL users should play the same video
            const videoId = message.videoId || extractVideoId(message.video);
            if (!videoId) {
              console.error("Could not extract video ID from:", message.video);
              return;
            }
            
            console.log("📺 Video stream received:", videoId, "Time:", message.currentTime, "Playing:", message.isPlaying);
            
            // Force sync - set the video ID which will trigger player initialization
            isSyncingRef.current = true;
            
            // Store sync info for when player is ready
            pendingSyncRef.current = {
              videoId: videoId,
              currentTime: message.currentTime || 0,
              isPlaying: message.isPlaying !== false
            };
            
            // Update state to trigger player initialization
            setCurrentVideoId(videoId);
            setCurrentVideo(message.video || `https://www.youtube.com/embed/${videoId}`);
            
            // Try to sync immediately if player exists, otherwise wait for player to initialize
            const syncVideo = () => {
              if (playerRef.current && playerRef.current.loadVideoById) {
                try {
                  console.log("🔄 Loading video:", videoId, "at time:", message.currentTime);
                  playerRef.current.loadVideoById({
                    videoId: videoId,
                    startSeconds: message.currentTime || 0
                  });
                  if (message.isPlaying !== false) {
                    setTimeout(() => {
                      if (playerRef.current && playerRef.current.playVideo) {
                        console.log("▶️ Playing video:", videoId);
                        playerRef.current.playVideo();
                      }
                    }, 800);
                  }
                } catch (e) {
                  console.error("Error loading video:", e);
                }
                setTimeout(() => { 
                  isSyncingRef.current = false; 
                  pendingSyncRef.current = null;
                }, 1500);
              } else {
                // Player not ready yet, will sync when ready via useEffect
                console.log("⏳ Player not ready, waiting...");
                setTimeout(syncVideo, 300);
              }
            };
            
            setTimeout(syncVideo, 200);
          }
          
          if (message.type === "sync") {
            // Sync to current room state when joining - play the same video that's already playing
            const videoId = message.videoId || extractVideoId(message.video);
            if (!videoId) {
              console.error("Could not extract video ID from sync message:", message.video);
              return;
            }
            
            console.log("🔄 Synced to room state:", videoId, "Time:", message.currentTime, "Playing:", message.isPlaying);
            
            isSyncingRef.current = true;
            
            // Store sync info
            pendingSyncRef.current = {
              videoId: videoId,
              currentTime: message.currentTime || 0,
              isPlaying: message.isPlaying || false
            };
            
            // Update state to trigger player initialization
            setCurrentVideoId(videoId);
            setCurrentVideo(message.video || `https://www.youtube.com/embed/${videoId}`);
            
            // Try to sync immediately if player exists
            const syncVideo = () => {
              if (playerRef.current && playerRef.current.loadVideoById) {
                try {
                  console.log("🔄 Loading synced video:", videoId, "at time:", message.currentTime);
                  playerRef.current.loadVideoById({
                    videoId: videoId,
                    startSeconds: message.currentTime || 0
                  });
                  if (message.isPlaying) {
                    setTimeout(() => {
                      if (playerRef.current && playerRef.current.playVideo) {
                        console.log("▶️ Playing synced video:", videoId);
                        playerRef.current.playVideo();
                      }
                    }, 800);
                  } else {
                    setTimeout(() => {
                      if (playerRef.current && playerRef.current.pauseVideo) {
                        playerRef.current.pauseVideo();
                      }
                    }, 800);
                  }
                } catch (e) {
                  console.error("Error syncing video:", e);
                }
                setTimeout(() => { 
                  isSyncingRef.current = false; 
                  pendingSyncRef.current = null;
                }, 1500);
              } else {
                // Player not ready yet, will sync when ready via useEffect
                console.log("⏳ Player not ready for sync, waiting...");
                setTimeout(syncVideo, 300);
              }
            };
            
            setTimeout(syncVideo, 200);
          }
          
          if (message.type === "play") {
            // Sync play event - when one user plays, all play
            if (playerRef.current && playerRef.current.getPlayerState) {
              isSyncingRef.current = true;
              try {
                // Sync time first
                playerRef.current.seekTo(message.currentTime || 0, true);
                // Then play
                setTimeout(() => {
                  if (playerRef.current && playerRef.current.playVideo) {
                    playerRef.current.playVideo();
                  }
                }, 100);
              } catch (e) {
                console.error("Error syncing play:", e);
              }
              setTimeout(() => { isSyncingRef.current = false; }, 800);
            }
          }
          
          if (message.type === "pause") {
            // Sync pause event - when one user pauses, all pause
            if (playerRef.current && playerRef.current.getPlayerState) {
              isSyncingRef.current = true;
              try {
                // Sync time first
                playerRef.current.seekTo(message.currentTime || 0, true);
                // Then pause immediately
                setTimeout(() => {
                  if (playerRef.current && playerRef.current.pauseVideo) {
                    playerRef.current.pauseVideo();
                  }
                }, 100);
              } catch (e) {
                console.error("Error syncing pause:", e);
              }
              setTimeout(() => { isSyncingRef.current = false; }, 800);
            }
          }
          
          if (message.type === "seek") {
            // Sync seek event
            if (!isSyncingRef.current && playerRef.current) {
              isSyncingRef.current = true;
              playerRef.current.seekTo(message.currentTime, true);
              lastSyncTimeRef.current = message.currentTime;
              setTimeout(() => { isSyncingRef.current = false; }, 500);
            }
          }
          
          if (message.type === "time_sync") {
            // Server is sending sync time - adjust if drift is too large
            if (!isSyncingRef.current && playerRef.current && playerRef.current.getCurrentTime) {
              try {
                const localTime = playerRef.current.getCurrentTime();
                const serverTime = message.currentTime || 0;
                const drift = Math.abs(localTime - serverTime);
                
                // If drift is more than 0.5 seconds, sync
                if (drift > 0.5) {
                  console.log(`⏱️ Time drift detected: ${drift.toFixed(2)}s, syncing to ${serverTime.toFixed(2)}s`);
                  isSyncingRef.current = true;
                  playerRef.current.seekTo(serverTime, true);
                  lastSyncTimeRef.current = serverTime;
                  setTimeout(() => { isSyncingRef.current = false; }, 300);
                }
              } catch (e) {
                console.error("Error in time sync:", e);
              }
            }
          }
        } catch (error) {
          // Only log if it's not a simple string message
          if (event.data !== 'connected') {
            console.error("Error parsing message:", error, "Data:", event.data);
          }
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setError("Failed to connect to room. Please try again.");
        setIsLoading(false);
        setIsConnected(false);
      };

      ws.onclose = () => {
        console.log("WebSocket disconnected");
        setIsConnected(false);
        setIsLoading(false);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error("Error connecting to WebSocket:", error);
      setError("Failed to connect. Please check if WebSocket server is running.");
      setIsLoading(false);
    }
  }, [roomId, userId, wsUrl]);

  // Stop periodic sync
  const stopPeriodicSync = useCallback(() => {
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }
  }, []);

  // Disconnect from WebSocket
  const disconnectWebSocket = useCallback(() => {
    stopPeriodicSync();
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setCurrentVideo("");
    setCurrentVideoId("");
  }, [stopPeriodicSync]);

  // Stream video to room
  const streamVideo = useCallback(() => {
    if (!videoInput.trim()) {
      setError("Please enter a video URL");
      return;
    }

    if (!isConnected || !wsRef.current) {
      setError("Not connected to room");
      return;
    }

    const videoId = extractVideoId(videoInput);
    if (!videoId) {
      setError("Invalid YouTube URL");
      return;
    }
    
    const videoLink = getEmbedLink(videoInput, 0);
    
    // Send video to room with current time
    wsRef.current.send(JSON.stringify({
      type: "stream",
      video: videoLink,
      roomId: roomId,
      currentTime: 0
    }));

    setCurrentVideoId(videoId);
    setCurrentVideo(videoLink);
    setVideoInput("");
    setError("");
  }, [videoInput, isConnected, roomId]);

  // Handle room ID change
  const handleJoinRoom = () => {
    if (roomId.trim()) {
      disconnectWebSocket();
      setSearchParams({ room: roomId });
      setTimeout(() => {
        connectWebSocket();
      }, 100);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectWebSocket();
    };
  }, [disconnectWebSocket]);

  // Initialize YouTube player when video changes
  useEffect(() => {
    if (!currentVideoId) return;

    // Wait for YouTube API to be ready
    const initPlayer = () => {
      if (window.YT && window.YT.Player) {
        if (playerRef.current) {
          try {
            playerRef.current.destroy();
          } catch (e) {
            console.log("Player already destroyed");
          }
        }

        const syncInfo = pendingSyncRef.current;
        
        playerRef.current = new window.YT.Player('youtube-player', {
        height: '100%',
        width: '100%',
        videoId: currentVideoId,
        playerVars: {
          enablejsapi: 1,
          origin: window.location.origin,
          autoplay: syncInfo?.isPlaying !== false ? 1 : 0,
          controls: 1,
          rel: 0,
          start: syncInfo ? Math.floor(syncInfo.currentTime) : 0
        },
        events: {
          onReady: (event) => {
            console.log("Player ready for video:", currentVideoId);
            
            // Apply pending sync if exists
            if (syncInfo) {
              isSyncingRef.current = true;
              try {
                const targetTime = syncInfo.currentTime || 0;
                event.target.seekTo(targetTime, true);
                lastSyncTimeRef.current = targetTime;
                
                if (syncInfo.isPlaying) {
                  setTimeout(() => {
                    event.target.playVideo();
                    // Start periodic sync
                    startPeriodicSync(event.target);
                  }, 500);
                } else {
                  setTimeout(() => event.target.pauseVideo(), 500);
                }
              } catch (e) {
                console.error("Error applying sync:", e);
              }
              setTimeout(() => {
                isSyncingRef.current = false;
                pendingSyncRef.current = null;
              }, 1000);
            } else {
              // Start periodic sync even if no sync info
              startPeriodicSync(event.target);
            }
          },
          onStateChange: (event) => {
            if (isSyncingRef.current) return;
            
            try {
              const currentTime = event.target.getCurrentTime();
              
              // Send play/pause events to sync with all users
              if (event.data === window.YT.PlayerState.PLAYING) {
                // User started playing - broadcast to all
                if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                  wsRef.current.send(JSON.stringify({
                    type: "play",
                    roomId: roomId,
                    currentTime: currentTime
                  }));
                  console.log("Broadcasting play at:", currentTime);
                }
              } else if (event.data === window.YT.PlayerState.PAUSED) {
                // User paused - broadcast to all (important: all must pause)
                if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                  wsRef.current.send(JSON.stringify({
                    type: "pause",
                    roomId: roomId,
                    currentTime: currentTime
                  }));
                  console.log("Broadcasting pause at:", currentTime);
                }
              }
            } catch (e) {
              console.error("Error in onStateChange:", e);
            }
          },
          onError: (event) => {
            console.error("YouTube player error:", event.data);
          }
        }
      });
      } else {
        // Retry after a short delay if API not ready
        setTimeout(initPlayer, 100);
      }
    };

    initPlayer();

    return () => {
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          console.log("Error destroying player:", e);
        }
        playerRef.current = null;
      }
    };
  }, [currentVideoId, roomId]);

  // Periodic sync function to keep videos aligned
  const startPeriodicSync = useCallback((player) => {
    // Clear existing interval
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
    }
    
    // Sync every 2 seconds to keep videos aligned
    syncIntervalRef.current = setInterval(() => {
      if (!player || !player.getCurrentTime || isSyncingRef.current) return;
      
      try {
        const currentTime = player.getCurrentTime();
        const playerState = player.getPlayerState();
        
        // Send current time to server for sync
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && playerState === window.YT.PlayerState.PLAYING) {
          wsRef.current.send(JSON.stringify({
            type: "time_sync",
            roomId: roomId,
            currentTime: currentTime,
            playerState: playerState
          }));
        }
      } catch (e) {
        console.error("Error in periodic sync:", e);
      }
    }, 2000);
  }, [roomId]);

  // Cleanup sync interval on unmount
  useEffect(() => {
    return () => {
      stopPeriodicSync();
    };
  }, [stopPeriodicSync]);

  // Auto-connect if room ID is in URL
  useEffect(() => {
    if (roomId && !isConnected && !isLoading) {
      connectWebSocket();
    }
  }, []); // Only run once on mount

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
                Watch Together
              </span>
            </h1>
          </div>
          <p className="text-gray-400 text-lg">
            Create or join a room to watch videos with friends
          </p>
        </div>

        {error && (
          <div className="max-w-2xl mx-auto mb-6">
            <div className="bg-red-900/20 border border-red-800 rounded-2xl px-6 py-4 text-center">
              <p className="text-red-400">{error}</p>
            </div>
          </div>
        )}

        {/* Room Connection */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="bg-gradient-to-br from-gray-900/50 to-black/50 border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="Enter Room ID"
                className="flex-1 bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-white/50"
                disabled={isConnected}
              />
              {!isConnected ? (
                <button
                  onClick={handleJoinRoom}
                  disabled={isLoading || !roomId.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-500 hover:to-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <>
                      <Video className="w-5 h-5" />
                      <span>Join Room</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={disconnectWebSocket}
                  className="px-6 py-3 bg-red-900/20 border border-red-800 text-red-400 rounded-lg font-semibold hover:bg-red-900/30 transition-all flex items-center gap-2"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Leave Room</span>
                </button>
              )}
            </div>
            
            {isConnected && (
              <div className="mt-4 flex items-center gap-2 text-green-400">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm">Connected to room: {roomId}</span>
              </div>
            )}
          </div>
        </div>

        {/* Video Stream Section */}
        {isConnected && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Video Player Section */}
            <div className="lg:col-span-2">
              <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-3xl overflow-hidden shadow-2xl">
                <div className="bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 px-6 py-4 border-b border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                        <Play className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-white font-semibold">Room: {roomId}</p>
                        <p className="text-gray-400 text-sm">Synchronized playback</p>
                      </div>
                    </div>
                    <Youtube className="w-6 h-6 text-red-500" />
                  </div>
                </div>

                {currentVideo ? (
                  <div className="relative aspect-video bg-black">
                    <div
                      id="youtube-player"
                      className="w-full h-full"
                    ></div>
                  </div>
                ) : (
                  <div className="relative aspect-video bg-black flex items-center justify-center">
                    <div className="text-center">
                      <Video className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400">No video playing</p>
                      <p className="text-gray-500 text-sm mt-2">Share a video URL below to start</p>
                    </div>
                  </div>
                )}

                <div className="bg-gradient-to-r from-gray-900 via-black to-gray-900 px-6 py-4">
                  <div className="flex items-center gap-4">
                    <input
                      type="text"
                      value={videoInput}
                      onChange={(e) => setVideoInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && streamVideo()}
                      placeholder="Enter YouTube URL to share..."
                      className="flex-1 bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-white/50"
                    />
                    <button
                      onClick={streamVideo}
                      disabled={!videoInput.trim()}
                      className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-500 hover:to-emerald-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <Play className="w-4 h-4" />
                      <span>Stream</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Chat Section */}
            <div className="lg:col-span-1">
              <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-3xl overflow-hidden shadow-2xl h-full flex flex-col">
                <div className="bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 px-6 py-4 border-b border-gray-700">
                  <div className="flex items-center gap-3">
                    <MessageCircle className="w-5 h-5 text-white" />
                    <h3 className="text-white font-semibold">Room Chat</h3>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: "500px" }}>
                  {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-gray-500 text-sm">No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs px-4 py-2 rounded-2xl ${
                            msg.isOwn
                              ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                              : 'bg-gray-800 text-gray-200'
                          }`}
                        >
                          <p className="text-sm break-words">{msg.text}</p>
                          <p className={`text-xs mt-1 ${msg.isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={chatEndRef} />
                </div>

                <div className="bg-gradient-to-r from-gray-900 via-black to-gray-900 px-4 py-4 border-t border-gray-700">
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                      placeholder="Type a message..."
                      className="flex-1 bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-white/50 text-sm"
                    />
                    <button
                      onClick={sendChatMessage}
                      disabled={!chatMessage.trim()}
                      className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-500 hover:to-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}



        {/* Not Connected State */}
        {!isConnected && !isLoading && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-gradient-to-br from-gray-900/50 to-black/50 border border-gray-800 rounded-3xl p-12 text-center">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="w-10 h-10 text-gray-600" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">
                Join a Room
              </h3>
              <p className="text-gray-400 leading-relaxed">
                Enter a room ID above to join and start watching videos together with friends.
              </p>
            </div>
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

export default JoinRoom;

