import React, { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import { Music, Play, Loader2, Youtube, Trash2 } from "lucide-react";
import { useAuth } from "@clerk/clerk-react";

const Playlist = () => {
  const [playlist, setPlaylist] = useState([]);
  const [selectedLink, setSelectedLink] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isRemoving, setIsRemoving] = useState(false);
  const playlistRef = useRef([]);
  const selectedLinkRef = useRef("");

  const { getToken } = useAuth();
  const backendapi = import.meta.env.VITE_BACKEND_URL;
  const youtubeApiKey = import.meta.env.VITE_YOUTUBE_API_KEY;

  const playerRef = useRef(null);

  // ✅ Load YouTube Player API only once
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);
    }
  }, []);

  // ✅ Extract video ID from any YouTube link
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
    return url;
  };

  const getThumbnail = (link) => {
    const videoId = extractVideoId(link);
    return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
  };

  const fetchVideoTitles = async (videoIds) => {
    try {
      const response = await axios.get(
        `https://www.googleapis.com/youtube/v3/videos`,
        {
          params: {
            part: "snippet",
            id: videoIds.join(","),
            key: youtubeApiKey,
          },
        }
      );
      const titles = {};
      response.data.items.forEach((item) => {
        titles[item.id] = item.snippet.title;
      });
      return titles;
    } catch (err) {
      console.error("Error fetching video titles:", err);
      return {};
    }
  };

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
      const normalized = data.map((item) => ({
        ...item,
        musicid: extractVideoId(item.musicid),
      }));

      const ids = normalized.map((i) => i.musicid);
      const titles = await fetchVideoTitles(ids);

      const playlistWithTitles = normalized.map((item) => ({
        ...item,
        title: titles[item.musicid] || "Unknown Title",
      }));

      setPlaylist(playlistWithTitles);

      if (playlistWithTitles.length > 0) {
        setSelectedLink(playlistWithTitles[0].musicid);
      }
    } catch (err) {
      console.error("Error fetching playlist:", err);
      setError("Failed to load playlist. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [backendapi, getToken]);

  // ✅ Fetch playlist on mount
  useEffect(() => {
    fetchPlaylist();
  }, [fetchPlaylist]);

  const handleRemoveFromPlaylist = useCallback(
    async (link) => {
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

        setPlaylist((prev) => prev.filter((item) => item.musicid !== videoId));

        setSelectedLink((prev) => {
          if (prev === videoId) {
            const remaining = playlist.filter(
              (item) => item.musicid !== videoId
            );
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
    },
    [backendapi, getToken, playlist, isRemoving]
  );

  // ✅ Keep refs updated
  useEffect(() => {
    playlistRef.current = playlist;
  }, [playlist]);

  useEffect(() => {
    selectedLinkRef.current = selectedLink;
  }, [selectedLink]);

  // ✅ Initialize and control YouTube player
  useEffect(() => {
    if (!selectedLink) return;

    const checkYT = setInterval(() => {
      if (window.YT && window.YT.Player) {
        clearInterval(checkYT);

        if (!playerRef.current) {
          playerRef.current = new window.YT.Player("yt-player", {
            height: "390",
            width: "640",
            videoId: selectedLink,
            playerVars: { autoplay: 1, controls: 1 },
            events: {
              onStateChange: (event) => {
                if (event.data === window.YT.PlayerState.ENDED) {
                  const currentPlaylist = playlistRef.current;
                  const currentLink = selectedLinkRef.current;
                  const currentIndex = currentPlaylist.findIndex(
                    (item) => item.musicid === currentLink
                  );
                  const next = currentPlaylist[currentIndex + 1];
                  if (next) setSelectedLink(next.musicid);
                }
              },
            },
          });
        } else {
          playerRef.current.loadVideoById(selectedLink);
        }
      }
    }, 300);

    return () => clearInterval(checkYT);
  }, [selectedLink]);

  // ✅ Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playerRef.current && playerRef.current.destroy) {
        playerRef.current.destroy();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center gap-3 mb-4">
            <Music className="w-8 h-8 text-white animate-pulse" />
            <h1 className="text-5xl md:text-6xl font-bold text-white">
              My Playlist
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

        {isLoading ? (
          <div className="text-center mt-12">
            <Loader2 className="w-10 h-10 text-white animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Loading your playlist...</p>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* ✅ Left Playlist Section */}
            <div className="lg:w-1/3">
              <h2 className="text-xl font-bold text-white mb-4 px-2">
                Favorites ({playlist.length})
              </h2>

              {playlist.length > 0 ? (
                <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto pr-2 custom-scrollbar">
                  {playlist.map((item, index) => {
                    const isSelected = selectedLink === item.musicid;
                    return (
                      <div
                        key={item.musicid || index}
                        onClick={() => setSelectedLink(item.musicid)}
                        className={`group cursor-pointer bg-gradient-to-br from-gray-900/50 to-black/50 border rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${
                          isSelected
                            ? "border-white/50 bg-white/5"
                            : "border-gray-800 hover:border-white/50"
                        }`}
                      >
                        <div className="flex gap-2">
                          <div className="relative w-24 h-20 flex-shrink-0 bg-gray-900">
                            <img
                              src={getThumbnail(item.musicid)}
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 flex items-center justify-center">
                              <Play className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                          <div className="p-2 flex-1 flex items-center justify-between">
                            <p className="text-white text-xs font-medium line-clamp-2 flex-1">
                              {item.title}
                            </p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveFromPlaylist(item.musicid);
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

            {/* ✅ Right Video Player Section */}
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
                    <div id="yt-player" className="w-full h-full"></div>
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