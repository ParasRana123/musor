import { useAuth, useUser } from "@clerk/clerk-react";
import { User, Mail, Key, LogOut, Sparkles } from "lucide-react";

export default function Profile() {
  const { isLoaded: authLoaded, userId, sessionId, signOut } = useAuth();
  const { isLoaded: userLoaded, user } = useUser();

  if (!authLoaded || !userLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
          <p className="text-white text-lg font-light">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      {/* Animated Background */}
      <div className="fixed inset-0 opacity-20 pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute bg-white rounded-full"
            style={{
              width: Math.random() * 3 + 1 + 'px',
              height: Math.random() * 3 + 1 + 'px',
              left: Math.random() * 100 + '%',
              top: Math.random() * 100 + '%',
              animation: `float ${Math.random() * 10 + 10}s ease-in-out infinite`,
              animationDelay: Math.random() * 5 + 's'
            }}
          />
        ))}
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-4">
            <Sparkles className="w-6 h-6 text-white" />
            <h1 className="text-4xl md:text-5xl font-bold text-white">Your Profile</h1>
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <p className="text-gray-400 text-lg">Manage your account information</p>
        </div>

        {/* Profile Card */}
        <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-3xl shadow-2xl overflow-hidden">
          {/* Banner */}
          <div className="h-32 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 relative">
            <div className="absolute inset-0 bg-white/5 backdrop-blur-sm"></div>
          </div>

          {/* Profile Content */}
          <div className="relative px-8 pb-8">
            {/* Avatar */}
            <div className="flex justify-center -mt-16 mb-6">
              <div className="relative group">
                <div className="absolute inset-0 bg-white rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-all duration-300"></div>
                <img
                  src={user.imageUrl}
                  alt="Profile"
                  className="relative w-32 h-32 rounded-full border-4 border-black object-cover shadow-2xl"
                />
              </div>
            </div>

            {/* User Info */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">
                {user.username || user.firstName || "Music Lover"}
              </h2>
              <p className="text-gray-400">Welcome back to your space</p>
            </div>

            {/* Info Cards Grid */}
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              {/* Email Card */}
              <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700 rounded-2xl p-6 hover:border-white/50 transition-all duration-300 group">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-white/10 rounded-xl group-hover:bg-white/20 transition-all duration-300">
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-400 mb-1">Email Address</p>
                    <p className="text-white font-medium break-all">
                      {user.primaryEmailAddress?.emailAddress || "Not provided"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Username Card */}
              <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700 rounded-2xl p-6 hover:border-white/50 transition-all duration-300 group">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-white/10 rounded-xl group-hover:bg-white/20 transition-all duration-300">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-400 mb-1">Username</p>
                    <p className="text-white font-medium">
                      {user.username || user.firstName || "No username"}
                    </p>
                  </div>
                </div>
              </div>

              {/* User ID Card */}
              <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700 rounded-2xl p-6 hover:border-white/50 transition-all duration-300 group">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-white/10 rounded-xl group-hover:bg-white/20 transition-all duration-300">
                    <Key className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-400 mb-1">User ID</p>
                    <p className="text-white font-mono text-sm break-all">
                      {userId}
                    </p>
                  </div>
                </div>
              </div>

              {/* Session ID Card */}
              <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700 rounded-2xl p-6 hover:border-white/50 transition-all duration-300 group">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-white/10 rounded-xl group-hover:bg-white/20 transition-all duration-300">
                    <Key className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-400 mb-1">Session ID</p>
                    <p className="text-white font-mono text-sm break-all">
                      {sessionId}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Logout Button */}
            <div className="flex justify-center">
              <button
                onClick={() => signOut()}
                className="group relative px-8 py-4 overflow-hidden rounded-full transition-all duration-300 hover:scale-105"
              >
                <div className="absolute inset-0 bg-white transition-all duration-300 group-hover:bg-gray-200"></div>
                <div className="absolute inset-0 bg-white blur-xl opacity-50 group-hover:opacity-75 transition-all duration-300"></div>
                <span className="relative flex items-center gap-3 text-black font-semibold z-10">
                  <LogOut className="w-5 h-5" />
                  Sign Out
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center mt-8">
          <p className="text-gray-500 text-sm">
            Your data is secure and encrypted
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
      `}</style>
    </div>
  );
}