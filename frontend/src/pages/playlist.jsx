import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { Music, Play, Loader2, Youtube, Trash2 } from "lucide-react";
import { useAuth } from "@clerk/clerk-react";

const Playlist = () => {
  const [playlist, setPlaylist] = useState([]);
  const [selectedLink, setSelectedLink] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isRemoving, setIsRemoving] = useState(false);
  
  const { getToken } = useAuth();
  const backendapi = import.meta.env.VITE_BACKEND_URL;

  // ✅ Extract only the videoId from any YouTube URL
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
    return url; // If it's already an ID
  };

  // ✅ Always form embed link using videoId
  const getEmbedLink = (link) => `https://www.youtube.com/embed/${extractVideoId(link)}`;

  // ✅ Fetch playlist from backend
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

      const data = response.data.playlist || [];

      // Normalize all to videoId form
      const normalized = data.map(item => ({
        ...item,
        musicid: extractVideoId(item.musicid)
      }));

      setPlaylist(normalized);
      if (normalized.length > 0) {
        setSelectedLink(normalized[0].musicid);
      }
    } catch (err) {
      console.error("Error fetching playlist:", err);
      setError("Failed to load playlist. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [backendapi, getToken]);

  // ✅ Remove song from playlist
  const handleRemoveFromPlaylist = useCallback(async (link) => {
    if (isRemoving) return;
    
    setIsRemoving(true);
    try {
      const token = await getToken();
      const videoId = extractVideoId(link);

      await axios.post(
        `${backendapi}/music`,
        { link: videoId, fav: false },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Remove from local playlist
      setPlaylist((prev) => prev.filter((item) => item.musicid !== videoId));

      // Update selected video
      setSelectedLink((prev) => {
        if (prev === videoId) {
          const remaining = playlist.filter((item) => item.musicid !== videoId);
          return remaining.length > 0 ? remaining[0].musicid : "";
        }
        return prev;
      });
    } catch (err) {
      console.error("Error removing from playlist:", err);
      setError("Failed to remove from playlist. Please try again.");
    } finally {
      setIsRemoving(false);
    }
  }, [backendapi, getToken, playlist]);

  useEffect(() => {
    fetchPlaylist();
  }, [fetchPlaylist]);

  const getThumbnail = (link) => {
    const videoId = extractVideoId(link);
    return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
  };

  const getVideoTitle = (link) => {
    const id = extractVideoId(link);
    return id ? `Video ${id}` : "Unknown Video";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center gap-3 mb-4">
            <Music className="w-8 h-8 text-white animate-pulse" />
            <h1 className="text-5xl md:text-6xl font-bold text-white">
              My Playlist
            </h1>
          </div>
          <p className="text-gray-400 text-lg">Your favorite songs and videos</p>
        </div>

        {error && (
          <div className="max-w-2xl mx-auto mb-6">
            <div className="bg-red-900/20 border border-red-800 rounded-2xl px-6 py-4 text-center">
              <p className="text-red-400">{error}</p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="text-center mt-12">
            <Loader2 className="w-10 h-10 text-white animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Loading your playlist...</p>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left Playlist */}
            <div className="lg:w-1/3">
              <h2 className="text-xl font-bold text-white mb-4 px-2">
                Favorites ({playlist.length})
              </h2>
              {playlist.length > 0 ? (
                <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto pr-2 custom-scrollbar">
                  {playlist.map((item, index) => {
                    const videoId = extractVideoId(item.musicid);
                    const isSelected = selectedLink === videoId;
                    return (
                      <div
                        key={videoId || index}
                        onClick={() => setSelectedLink(videoId)}
                        className={`group cursor-pointer bg-gradient-to-br from-gray-900/50 to-black/50 border rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${
                          isSelected
                            ? "border-white/50 bg-white/5"
                            : "border-gray-800 hover:border-white/50"
                        }`}
                      >
                        <div className="flex gap-2">
                          <div className="relative w-24 h-20 flex-shrink-0 bg-gray-900">
                            <img
                              src={getThumbnail(videoId)}
                              alt={getVideoTitle(videoId)}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 flex items-center justify-center">
                              <Play className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                          <div className="p-2 flex-1 flex items-center justify-between">
                            <p className="text-white text-xs font-medium line-clamp-2 flex-1">
                              {getVideoTitle(videoId)}
                            </p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveFromPlaylist(videoId);
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-red-900/20 text-red-400 hover:text-red-300"
                              title="Remove"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 text-center">
                  <Music className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No favorites yet</p>
                  <p className="text-gray-500 text-sm mt-2">
                    Add songs to your playlist from the Music page.
                  </p>
                </div>
              )}
            </div>

            {/* Right Player */}
            {selectedLink && (
              <div className="lg:w-2/3">
                <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-3xl overflow-hidden shadow-2xl sticky top-4">
                  <div className="bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 px-6 py-4 border-b border-gray-700 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <Play className="w-5 h-5 text-white" />
                      <p className="text-white font-semibold">Now Playing</p>
                    </div>
                    <Youtube className="w-6 h-6 text-red-500" />
                  </div>
                  <div className="relative aspect-video bg-black">
                    <iframe
                      className="w-full h-full"
                      src={getEmbedLink(selectedLink)}
                      title="YouTube video player"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>
                  <div className="flex justify-end p-4">
                    <button
                      onClick={() => handleRemoveFromPlaylist(selectedLink)}
                      className="p-2 bg-red-900/20 hover:bg-red-900/40 text-red-400 rounded-lg transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

export default Playlist;
