import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { Search, Music, Play, Loader2, Youtube, Heart } from "lucide-react";
import { useAuth } from "@clerk/clerk-react";

const MusicPlayer = () => {
  // State declarations - all at the top
  const [link, setLink] = useState("");
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isFav, setIsFav] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  
  // Constants
  const musicapi = import.meta.env.VITE_MUSIC_API;
  const { getToken } = useAuth();
  const backendapi = import.meta.env.VITE_BACKEND_URL;

  // Helper function to extract YouTube video ID from URL
  const extractVideoId = (url) => {
    if (!url) return null;
    // Handle various YouTube URL formats
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

  // Memoized fetch function
  const fetchsongid = useCallback(async (input) => {
    if (!input.trim()) {
      setLink("");
      setError("");
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    setError("");

    axios
      .post(`${backendapi}/getsongs/get-music-link`, { song: input })
      .then((response) => { 
        console.log(response.data);
        
        // Store search results
        if (response.data.results && response.data.results.length > 0) {
          setSearchResults(response.data.results);
        } else {
          setSearchResults([]);
        }
        
        // Set the first video as default
        const videoId = extractVideoId(response.data.Link);
        if (videoId) {
          setLink(`https://www.youtube.com/embed/${videoId}`);
          setIsLoading(false);
          setIsFav(false);
        } else {
          setError("Invalid YouTube link received. Try a different search.");
          setIsLoading(false);
          setLink("");
        }
      })
      .catch((error) => {
        console.error("Error fetching song:", error);
        setError("Could not find the song. Try a different search.");
        setIsLoading(false);
        setLink("");
        setSearchResults([]);
      });
  }, [musicapi]);

  // Memoized check if liked function
  const checkifliked = useCallback(async () => {
    if (!link) {
      return;
    }
    
    try {
      const token = await getToken();
      const check = await axios.get(
        `${backendapi}/music/checkifliked?link=${link}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      // Set state based on backend response
      setIsFav(check.data.liked);
    } catch (error) {
      console.error("Error checking if liked:", error);
      setIsFav(false);
    }
  }, [link, backendapi, getToken]);

  // Handle video selection from search results
  const handleVideoSelect = useCallback((video) => {
    setLink(video.embedLink);
    setIsFav(false);
    // Check if this video is already favorited (will be triggered by useEffect when link changes)
  }, []);

  // Handle favorite toggle
  const handleFav = useCallback(async () => {
    // Validate that we have a link before attempting to favorite
    if (!link) {
      console.error("Cannot favorite: No link available");
      setError("Please search for a song first before adding to favorites.");
      return;
    }

    const newFav = !isFav;
    setIsFav(newFav); // Optimistic update

    try {
      const token = await getToken();
      
      if (!token) {
        throw new Error("Authentication token not available");
      }

      console.log("Sending favorite request:", { link, fav: newFav });
      
      const response = await axios.post(
        `${backendapi}/music`,
        {
          link,
          fav: newFav,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("✅ Response:", response.data);
      
      // Show success message
      setSuccessMessage(newFav ? "Added to favorites!" : "Removed from favorites!");
      setTimeout(() => setSuccessMessage(""), 3000); // Clear after 3 seconds
      
      // Clear any previous errors
      setError("");
    } catch (error) {
      console.error("❌ Error updating favorite:", error);
      
      // Show detailed error message
      if (error.response) {
        // Server responded with error status
        const errorMessage = error.response.data?.error || error.response.statusText;
        console.error("Server error:", errorMessage, error.response.status);
        if (error.response.status === 400) {
          setError("Invalid request. Please try refreshing the page.");
        } else if (error.response.status === 404) {
          setError("User not found. Please log in again.");
        }
      } else if (error.request) {
        // Request was made but no response received
        console.error("No response received:", error.request);
        setError("Network error. Please check your connection.");
      } else {
        // Something else happened
        console.error("Error:", error.message);
        setError("An error occurred. Please try again.");
      }
      
      // Revert state on error
      setIsFav(!newFav);
    }
  }, [link, isFav, backendapi, getToken]);

  // Debounced search effect
  useEffect(() => {
    const handler = setTimeout(() => {
      if (input) {
        console.log("Input changed:", input);
        fetchsongid(input);
      }
    }, 500);
    return () => clearTimeout(handler);
  }, [input, fetchsongid]);

  // Check if liked when link changes
  useEffect(() => {
    checkifliked();
  }, [checkifliked]);

  // Keyboard shortcut to toggle favorite (press 'F' key)
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Only trigger if not typing in an input field and video is loaded
      if (e.target.tagName !== 'INPUT' && link) {
        if (e.key === 'f' || e.key === 'F') {
          e.preventDefault();
          handleFav();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [link, handleFav]);
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
            <Music className="w-8 h-8 text-white animate-pulse" />
            <h1 className="text-5xl md:text-6xl font-bold">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-300 to-white">
                Music Player
              </span>
            </h1>
          </div>
          <p className="text-gray-400 text-lg">
            Search and play your favorite songs
          </p>
        </div>

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
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Search for a song or artist..."
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

          {error && (
            <div className="max-w-2xl mx-auto mt-4">
              <div className="bg-red-900/20 border border-red-800 rounded-2xl px-6 py-4 text-center">
                <p className="text-red-400">{error}</p>
              </div>
            </div>
          )}
          
          {successMessage && (
            <div className="max-w-2xl mx-auto mt-4">
              <div className="bg-green-900/20 border border-green-800 rounded-2xl px-6 py-4 text-center">
                <p className="text-green-400">{successMessage}</p>
              </div>
            </div>
          )}
        </div>

        {/* Main Content: Videos on Left, Player on Right */}
        {(searchResults.length > 0 || link) && !isLoading && (
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Left Side: Search Results */}
              {searchResults.length > 0 && (
                <div className="lg:w-1/3 flex-shrink-0">
                  <h2 className="text-xl font-bold text-white mb-4 px-2">
                    Results ({searchResults.length})
                  </h2>
                  <div className="space-y-2 max-h-[calc(100vh-100px)] overflow-y-auto pr-2 custom-scrollbar">
                    {searchResults.map((video, index) => (
                      <div
                        key={video.videoId}
                        onClick={() => handleVideoSelect(video)}
                        className="group cursor-pointer bg-gradient-to-br from-gray-900/50 to-black/50 border border-gray-800 rounded-xl overflow-hidden hover:border-white/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
                      >
                        <div className="flex gap-2">
                          {/* Thumbnail */}
                          <div className="relative w-24 h-20 flex-shrink-0 bg-gray-900">
                            <img
                              src={video.thumbnail}
                              alt={video.title}
                              className="w-full h-full object-cover"
                              loading="lazy"
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
                          {/* Title */}
                          <div className="p-2 flex-1 flex items-center">
                            <p className="text-white text-xs font-medium line-clamp-2 group-hover:text-gray-200 transition-colors">
                              {video.title}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Right Side: Video Player */}
              {link && (
                <div className={`${searchResults.length > 0 ? 'lg:w-2/3' : 'w-full'} flex-shrink-0`} data-video-player>
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
                            <p className="text-gray-400 text-sm">{input}</p>
                          </div>
                        </div>
                        <Youtube className="w-6 h-6 text-red-500" />
                      </div>
                    </div>

                    {/* Video Embed */}
                    <div className="relative aspect-video bg-black group">
                      <iframe
                        className="w-full h-full"
                        src={link}
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
                        
                        {/* Enhanced Favorite Button */}
                        <button
                          onClick={handleFav}
                          className="group relative p-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:scale-110 active:scale-95"
                          aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
                        >
                          <Heart
                            className={`w-6 h-6 transition-all duration-300 ${
                              isFav
                                ? "text-red-500 fill-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                                : "text-gray-400 group-hover:text-white"
                            }`}
                          />
                          
                          {/* Tooltip */}
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-black/90 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                            {isFav ? "Remove from favorites" : "Add to favorites"}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!link && !isLoading && !error && input === "" && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-gradient-to-br from-gray-900/50 to-black/50 border border-gray-800 rounded-3xl p-12 text-center">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                <Music className="w-10 h-10 text-gray-600" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">
                Start Your Musical Journey
              </h3>
              <p className="text-gray-400 leading-relaxed">
                Search for any song or artist above to start playing music. Your
                search will automatically find and play the video.
              </p>
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
                Finding Your Song...
              </h3>
              <p className="text-gray-400">
                Please wait while we search for "{input}"
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

export default MusicPlayer;
