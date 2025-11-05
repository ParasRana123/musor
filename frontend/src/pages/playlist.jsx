import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { Music, Play, Loader2, Youtube, Heart, Trash2 } from "lucide-react";
import { useAuth } from "@clerk/clerk-react";

const Playlist = () => {
  const [playlist, setPlaylist] = useState([]);
  const [selectedLink, setSelectedLink] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isRemoving, setIsRemoving] = useState(false);
  
  const { getToken } = useAuth();
  const backendapi = import.meta.env.VITE_BACKEND_URL;

  // Helper function to extract YouTube video ID from URL
  const extractVideoId = (url) => {
    if (!url) return null;
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
      /youtube\.com\/embed\/([^&\n?#]+)/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) return match[1];
    }
    return null;
  };

  // Convert link to embed format
  const getEmbedLink = (link) => {
    const videoId = extractVideoId(link);
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}`;
    }
    return link;
  };

  // Fetch playlist from backend
  const fetchPlaylist = useCallback(async () => {
    setIsLoading(true);
    setError("");
    
    try {
      const token = await getToken();
      const response = await axios.get(`${backendapi}/playlist`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      
      setPlaylist(response.data.playlist || []);
      
      // Auto-select first video if available
      if (response.data.playlist && response.data.playlist.length > 0) {
        setSelectedLink(response.data.playlist[0].musicid);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching playlist:", error);
      setError("Failed to load playlist. Please try again.");
      setIsLoading(false);
    }
  }, [backendapi, getToken]);

  // Remove from playlist
  const handleRemoveFromPlaylist = useCallback(async (link) => {
    if (isRemoving) return;
    
    setIsRemoving(true);
    try {
      const token = await getToken();
      
      // Remove from favorites by setting fav to false
      await axios.post(
        `${backendapi}/music`,
        {
          link,
          fav: false,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      // Remove from local state
      setPlaylist((prev) => prev.filter((item) => item.musicid !== link));
      
      // If the removed video was selected, select another one or clear
      if (selectedLink === link) {
        const remaining = playlist.filter((item) => item.musicid !== link);
        if (remaining.length > 0) {
          setSelectedLink(remaining[0].musicid);
        } else {
          setSelectedLink("");
        }
      }
    } catch (error) {
      console.error("Error removing from playlist:", error);
      setError("Failed to remove from playlist. Please try again.");
    } finally {
      setIsRemoving(false);
    }
  }, [backendapi, getToken, selectedLink, playlist]);

  // Handle video selection
  const handleVideoSelect = useCallback((link) => {
    setSelectedLink(link);
  }, []);

  // Fetch playlist on mount
  useEffect(() => {
    fetchPlaylist();
  }, [fetchPlaylist]);

  // Get video thumbnail from link
  const getThumbnail = (link) => {
    const videoId = extractVideoId(link);
    if (videoId) {
      return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
    }
    return "";
  };

  // Get video title from link (fallback)
  const getVideoTitle = (link) => {
    // Since we don't store titles, we'll use a generic title
    const videoId = extractVideoId(link);
    return videoId ? `Video ${videoId}` : "Unknown Video";
  };

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

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center gap-3 mb-4">
            <Music className="w-8 h-8 text-white animate-pulse" />
            <h1 className="text-5xl md:text-6xl font-bold">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-300 to-white">
                My Playlist
              </span>
            </h1>
          </div>
          <p className="text-gray-400 text-lg">
            Your favorite songs and videos
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
                Loading Playlist...
              </h3>
              <p className="text-gray-400">
                Please wait while we fetch your favorites
              </p>
            </div>
          </div>
        )}

        {/* Main Content: Playlist on Left, Player on Right */}
        {!isLoading && (
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Left Side: Playlist */}
              {playlist.length > 0 ? (
                <div className="lg:w-1/3 flex-shrink-0">
                  <h2 className="text-xl font-bold text-white mb-4 px-2">
                    Favorites ({playlist.length})
                  </h2>
                  <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto pr-2 custom-scrollbar">
                    {playlist.map((item, index) => {
                      const embedLink = getEmbedLink(item.musicid);
                      const isSelected = selectedLink === item.musicid;
                      
                      return (
                        <div
                          key={item.musicid || index}
                          onClick={() => handleVideoSelect(item.musicid)}
                          className={`group cursor-pointer bg-gradient-to-br from-gray-900/50 to-black/50 border rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${
                            isSelected
                              ? "border-white/50 bg-white/5"
                              : "border-gray-800 hover:border-white/50"
                          }`}
                        >
                          <div className="flex gap-2">
                            {/* Thumbnail */}
                            <div className="relative w-24 h-20 flex-shrink-0 bg-gray-900">
                              <img
                                src={getThumbnail(item.musicid)}
                                alt={getVideoTitle(item.musicid)}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                onError={(e) => {
                                  e.target.src = "https://via.placeholder.com/160x90?text=Video";
                                }}
                              />
                              {/* Play overlay */}
                              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
                                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                  <Play className="w-4 h-4 text-white fill-white" />
                                </div>
                              </div>
                              {/* Video number badge */}
                              <div className="absolute top-1 left-1 bg-black/70 text-white text-xs px-1 py-0.5 rounded">
                                #{index + 1}
                              </div>
                            </div>
                            {/* Title and Remove Button */}
                            <div className="p-2 flex-1 flex items-center justify-between gap-2">
                              <p className="text-white text-xs font-medium line-clamp-2 group-hover:text-gray-200 transition-colors flex-1">
                                {getVideoTitle(item.musicid)}
                              </p>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveFromPlaylist(item.musicid);
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-red-900/20 text-red-400 hover:text-red-300"
                                title="Remove from playlist"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="lg:w-1/3 flex-shrink-0">
                  <div className="bg-gradient-to-br from-gray-900/50 to-black/50 border border-gray-800 rounded-xl p-8 text-center">
                    <Music className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No favorites yet</p>
                    <p className="text-gray-500 text-sm mt-2">
                      Add songs to your playlist from the Music page
                    </p>
                  </div>
                </div>
              )}

              {/* Right Side: Video Player */}
              {selectedLink && (
                <div className={`${playlist.length > 0 ? 'lg:w-2/3' : 'w-full'} flex-shrink-0`} data-video-player>
                  <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-3xl overflow-hidden shadow-2xl sticky top-4">
                    {/* Player Header */}
                    <div className="bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 px-6 py-4 border-b border-gray-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                            <Play className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="text-white font-semibold">Now Playing</p>
                            <p className="text-gray-400 text-sm">From Your Playlist</p>
                          </div>
                        </div>
                        <Youtube className="w-6 h-6 text-red-500" />
                      </div>
                    </div>

                    {/* Video Embed */}
                    <div className="relative aspect-video bg-black group">
                      <iframe
                        className="w-full h-full"
                        src={getEmbedLink(selectedLink)}
                        title="YouTube video player"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                      ></iframe>
                    </div>

                    {/* Player Footer */}
                    <div className="bg-gradient-to-r from-gray-900 via-black to-gray-900 px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-gray-500 text-sm">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span>Playing from YouTube</span>
                        </div>
                        
                        <button
                          onClick={() => handleRemoveFromPlaylist(selectedLink)}
                          className="group relative p-3 rounded-full bg-white/5 border border-white/10 hover:bg-red-900/20 hover:border-red-500/50 transition-all duration-300 hover:scale-110 active:scale-95"
                          aria-label="Remove from playlist"
                        >
                          <Trash2 className="w-6 h-6 text-gray-400 group-hover:text-red-400 transition-colors" />
                          
                          {/* Tooltip */}
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-black/90 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                            Remove from playlist
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Empty Player State */}
              {!selectedLink && playlist.length > 0 && (
                <div className="lg:w-2/3 flex-shrink-0">
                  <div className="bg-gradient-to-br from-gray-900/50 to-black/50 border border-gray-800 rounded-3xl p-12 text-center">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Play className="w-10 h-10 text-gray-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3">
                      Select a Video
                    </h3>
                    <p className="text-gray-400 leading-relaxed">
                      Click on any video from your playlist to start playing
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty State - No Playlist */}
        {!isLoading && playlist.length === 0 && !selectedLink && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-gradient-to-br from-gray-900/50 to-black/50 border border-gray-800 rounded-3xl p-12 text-center">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                <Music className="w-10 h-10 text-gray-600" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">
                Your Playlist is Empty
              </h3>
              <p className="text-gray-400 leading-relaxed">
                Start adding songs to your playlist! Go to the Music page and
                favorite songs you love.
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

export default Playlist;

