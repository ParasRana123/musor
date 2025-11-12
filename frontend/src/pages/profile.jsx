import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth, useUser } from "@clerk/clerk-react";
import axios from "axios";
import {
  User,
  Mail,
  Key,
  LogOut,
  Sparkles,
  Music,
  Loader2
} from "lucide-react";

export default function Profile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isLoaded: authLoaded, userId, sessionId, signOut, getToken } = useAuth();
  const { isLoaded: userLoaded, user } = useUser();

  const [profileUser, setProfileUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const backendapi = import.meta.env.VITE_BACKEND_URL;

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        if (!id) {
          // Viewing own profile
          setProfileUser(user);
          setIsLoading(false);
          return;
        }

        const token = await getToken();
        const response = await axios.get(`${backendapi}/user/${id}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        setProfileUser(response.data.user);
      } catch (err) {
        console.error("Error fetching user:", err);
        setError("Could not load user profile.");
      } finally {
        setIsLoading(false);
      }
    };

    if (authLoaded && userLoaded) fetchProfile();
  }, [id, authLoaded, userLoaded, getToken, backendapi, user]);

  if (isLoading)
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-white animate-spin" />
          <p className="text-white text-lg font-light">Loading profile...</p>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center text-red-400 text-xl">
        {error}
      </div>
    );

  if (!profileUser)
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        User not found.
      </div>
    );

  const isOwnProfile = !id || id === userId;
  const username = profileUser.username || profileUser.firstName || "Music Lover";
  const email =
    profileUser.primaryEmailAddress?.emailAddress ||
    profileUser.email ||
    "Not provided";
  const imageUrl = profileUser.imageUrl || "/default-avatar.png";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      {/* Animated Background */}
      <div className="fixed inset-0 opacity-20 pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute bg-white rounded-full"
            style={{
              width: Math.random() * 3 + 1 + "px",
              height: Math.random() * 3 + 1 + "px",
              left: Math.random() * 100 + "%",
              top: Math.random() * 100 + "%",
              animation: `float ${Math.random() * 10 + 10}s ease-in-out infinite`,
              animationDelay: Math.random() * 5 + "s",
            }}
          />
        ))}
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-4">
            <Sparkles className="w-6 h-6 text-white" />
            <h1 className="text-4xl md:text-5xl font-bold text-white">
              {isOwnProfile ? "Your Profile" : `${username}'s Profile`}
            </h1>
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <p className="text-gray-400 text-lg">
            {isOwnProfile
              ? "Manage your account information"
              : "View this user’s profile"}
          </p>
        </div>

        {/* Profile Card */}
        <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-3xl shadow-2xl overflow-hidden">
          <div className="h-32 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 relative">
            <div className="absolute inset-0 bg-white/5 backdrop-blur-sm"></div>
          </div>

          <div className="relative px-8 pb-8">
            {/* Avatar */}
            <div className="flex justify-center -mt-16 mb-6">
              <div className="relative group">
                <div className="absolute inset-0 bg-white rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-all duration-300"></div>
                <img
                  src={imageUrl}
                  alt="Profile"
                  className="relative w-32 h-32 rounded-full border-4 border-black object-cover shadow-2xl"
                />
              </div>
            </div>

            {/* User Info */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">
                {username}
              </h2>
              <p className="text-gray-400">Welcome to {isOwnProfile ? "your" : `${username}'s`} space</p>
            </div>

            {/* Info Cards */}
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              <InfoCard icon={<Mail />} label="Email Address" value={email} />
              <InfoCard icon={<User />} label="Username" value={username} />
              <InfoCard icon={<Key />} label="User ID" value={id || userId} />
              {isOwnProfile && (
                <InfoCard icon={<Key />} label="Session ID" value={sessionId} />
              )}
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              {isOwnProfile ? (
                <>
                  <ActionButton
                    onClick={() => navigate("/playlist")}
                    label="See Playlist"
                    icon={<Music />}
                    color="gray"
                  />
                  <ActionButton
                    onClick={() => signOut()}
                    label="Sign Out"
                    icon={<LogOut />}
                    color="white"
                  />
                </>
              ) : (
                <ActionButton
                  onClick={() => navigate("/friends")}
                  label="Back to Friends"
                  icon={<User />}
                  color="gray"
                />
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
      `}</style>
    </div>
  );
}

/* Reusable UI Components */
const InfoCard = ({ icon, label, value }) => (
  <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700 rounded-2xl p-6 hover:border-white/50 transition-all duration-300 group">
    <div className="flex items-start gap-4">
      <div className="p-3 bg-white/10 rounded-xl group-hover:bg-white/20 transition-all duration-300">
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-sm text-gray-400 mb-1">{label}</p>
        <p className="text-white font-medium break-all">{value}</p>
      </div>
    </div>
  </div>
);

const ActionButton = ({ onClick, label, icon, color }) => (
  <button
    onClick={onClick}
    className={`group relative px-8 py-4 overflow-hidden rounded-full transition-all duration-300 hover:scale-105 cursor-pointer ${
      color === "white"
        ? "bg-white text-black hover:bg-gray-200"
        : "bg-gradient-to-r from-gray-700 to-gray-800 text-white"
    }`}
  >
    <span className="relative flex items-center gap-3 font-semibold z-10">
      {icon}
      {label}
    </span>
  </button>
);