import React, { useEffect, useState } from "react";
import axios from "axios";
import { Search, Music, Play, Loader2, Youtube, Heart } from "lucide-react";
import { useAuth } from "@clerk/clerk-react";
const MusicPlayer = () => {
  const [link, setLink] = useState("");
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isFav, setisfav] = useState(false);
  const musicapi = import.meta.env.VITE_MUSIC_API;
  const { getToken } = useAuth();
  const backendapi = import.meta.env.VITE_BACKEND_URL;
  const fetchsongid = (input) => {
    if (!input.trim()) {
      setLink("");
      setError("");
      return;
    }

    setIsLoading(true);
    setError("");

    axios
      .post(`${musicapi}/get-music-link`, { song: input })
      .then((response) => {
        setLink(
          "https://www.youtube.com/embed/" +
            response.data.Link.split("v=").pop()
        );
        setIsLoading(false);
        setisfav(false);
        setliked(false);
      })
      .catch((error) => {
        console.log(error);
        setError("Could not find the song. Try a different search.");
        setIsLoading(false);
        setLink("");
      });
  };
  const handleFav = async () => {
    const newFav = !isFav;
    setisfav(newFav);
    setliked(newFav);

    try {
      // Get token inside the async function
      const token = await getToken();
      
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
    } catch (error) {
      console.error("❌ Error updating favorite:", error);
      // Revert both states on error
      setisfav(!newFav);
      setliked(!newFav);
    }
  }; 

  const [liked, setliked] = useState(false);
  
  const checkifliked = async () => {
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
      
      // Set both states based on backend response
      setliked(check.data.liked);
      setisfav(check.data.liked);
    } catch (error) {
      console.error("Error checking if liked:", error);
      setliked(false);
      setisfav(false);
    }
  };
  useEffect(() => {
    const handler = setTimeout(() => {
      if (input) {
        console.log("Input changed:", input);
        fetchsongid(input);
      }
    }, 500);
    return () => clearTimeout(handler);
  }, [input]);

  useEffect(() => {
    checkifliked();
  }, [link]);
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
        </div>

        {/* Video Player Section */}
        {link && !isLoading && (
          <div className="max-w-5xl mx-auto">
            <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-3xl overflow-hidden shadow-2xl">
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
              <div className="relative aspect-video bg-black">
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
                    aria-label={isFav || liked ? "Remove from favorites" : "Add to favorites"}
                  >
                    <Heart
                      className={`w-6 h-6 transition-all duration-300 ${
                        isFav || liked
                          ? "text-red-500 fill-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                          : "text-gray-400 group-hover:text-white"
                      }`}
                    />
                    
                    {/* Tooltip */}
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-black/90 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                      {isFav || liked ? "Remove from favorites" : "Add to favorites"}
                    </span>
                  </button>
                </div>
              </div>
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
      `}</style>
    </div>
  );
};

export default MusicPlayer;
