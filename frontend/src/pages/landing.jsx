import React, { useEffect, useRef, useState } from 'react';
import { useUser, useAuth } from "@clerk/clerk-react";

const FuturisticMusicApp = () => {
  const [isVisible, setIsVisible] = useState({});
  const observerRef = useRef(null);
  const { user } = useUser();
  const { getToken } = useAuth();
  const backendurl = import.meta.env.VITE_BACKEND_URL; 
  console.log(user)
  useEffect(() => {
    const syncUser = async () => {
      if (user) {
        const token = await getToken();
        const res = await fetch(`${backendurl}/api/sync`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            id: user.id,
            email: user.primaryEmailAddress?.emailAddress,
            username: user.username || user.firstName || "Unknown user",
          }),
        });

        const data = await res.json();
        console.log(data);
      }
    };

    syncUser();
  }, [user]);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible((prev) => ({
              ...prev,
              [entry.target.id]: true,
            }));
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -100px 0px' }
    );

    document.querySelectorAll('[data-animate]').forEach((el) => {
      if (observerRef.current) observerRef.current.observe(el);
    });

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, []);

  const scrollToSection = (e, id) => {
    e.preventDefault();
    document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const WaveBar = ({ index }) => (
    <div
      className="absolute bottom-0 w-[3px] bg-gradient-to-t from-white/80 to-transparent animate-wave"
      style={{
        left: `${(index / 50) * 100}%`,
        animationDelay: `${index * 0.05}s`,
        animationDuration: `${1 + Math.random()}s`,
      }}
    />
  );

  const FeatureCard = ({ icon, title, description, id }) => (
    <div
      id={id}
      data-animate
      className={`bg-white/[0.03] p-12 rounded-[20px] border border-white/10 backdrop-blur-[10px] transition-all duration-400 cursor-pointer hover:translate-y-[-10px] hover:border-white hover:shadow-[0_0_40px_rgba(255,255,255,0.1)] hover:bg-white/[0.05] ${
        isVisible[id] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-[30px]'
      }`}
    >
      <div className="w-[70px] h-[70px] mb-6 flex items-center justify-center rounded-[15px] bg-white/[0.05] border-2 border-white/10 transition-all duration-400 group-hover:bg-white/10 group-hover:border-white group-hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]">
        {icon}
      </div>
      <h3 className="text-2xl mb-4 font-semibold">{title}</h3>
      <p className="text-gray-400 leading-relaxed">{description}</p>
    </div>
  );

  const ProfileSilhouette = ({ icon, title, subtitle, id }) => (
    <div
      id={id}
      data-animate
      className={`transition-all duration-800 ${
        isVisible[id] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-[30px]'
      }`}
    >
      <div className="w-[120px] h-[120px] mx-auto mb-6 rounded-full bg-gradient-to-br from-white/[0.05] to-white/[0.02] border-2 border-white/10 flex items-center justify-center transition-all duration-400 hover:border-white hover:shadow-[0_0_40px_rgba(255,255,255,0.2)]">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-1">{title}</h3>
      <p className="text-gray-400">{subtitle}</p>
    </div>
  );

  return (
    <div className="bg-black text-white overflow-x-hidden font-['Poppins',sans-serif]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Poppins:wght@300;400;600;700&display=swap');
        
        @keyframes wave {
          0%, 100% { height: 20%; }
          50% { height: 80%; }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        .animate-wave {
          animation: wave 1.5s ease-in-out infinite;
        }
        
        .animate-fadeInUp {
          animation: fadeInUp 1s ease-out;
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        
        .font-orbitron {
          font-family: 'Orbitron', sans-serif;
        }
        
        .text-gradient {
          background: linear-gradient(135deg, #ffffff 0%, #808080 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      `}</style>

      {/* Navigation */}
      {/* <nav className="fixed top-0 w-full z-[1000] bg-black/80 backdrop-blur-[20px] border-b border-white/10">
        <div className="max-w-[1400px] mx-auto px-8 flex justify-between items-center py-6">
          <div className="font-orbitron text-[1.8rem] font-black tracking-[2px] text-gradient drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]">
            SONICWAVE
          </div>
          <ul className="hidden md:flex gap-10 list-none">
            {['features', 'showcase', 'community', 'footer'].map((item) => (
              <li key={item}>
                <a
                  href={`#${item}`}
                  onClick={(e) => scrollToSection(e, `#${item}`)}
                  className="text-gray-400 no-underline font-normal transition-all duration-300 relative hover:text-white after:content-[''] after:absolute after:bottom-[-5px] after:left-0 after:w-0 after:h-[2px] after:bg-white after:transition-all after:duration-300 hover:after:w-full"
                >
                  {item.charAt(0).toUpperCase() + item.slice(1)}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav> */}

      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center relative overflow-hidden pt-20">
        <div className="absolute top-0 left-0 w-full h-full opacity-15 z-0">
          {[...Array(50)].map((_, i) => (
            <WaveBar key={i} index={i} />
          ))}
        </div>
        <div className="max-w-[1400px] mx-auto px-8 relative z-10">
          <div className="text-center animate-fadeInUp">
            <h1 className="font-orbitron text-[clamp(2.5rem,8vw,6rem)] font-black tracking-[3px] mb-6 text-gradient drop-shadow-[0_0_60px_rgba(255,255,255,0.3)] leading-[1.2]">
              FEEL THE FUTURE<br />OF MUSIC
            </h1>
            <p className="text-[clamp(1rem,2vw,1.5rem)] text-gray-400 mb-12 font-light tracking-[2px]">
              Stream. Discover. Connect.
            </p>
            <a
              href="#"
              className="inline-block py-5 px-12 bg-white text-black no-underline font-semibold text-lg rounded-full transition-all duration-400 shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:translate-y-[-3px] hover:shadow-[0_0_60px_rgba(255,255,255,0.5)] relative overflow-hidden group"
            >
              <span className="relative z-10">Get Started</span>
              <span className="absolute top-1/2 left-1/2 w-0 h-0 rounded-full bg-black/20 transition-all duration-600 -translate-x-1/2 -translate-y-1/2 group-hover:w-[300px] group-hover:h-[300px]"></span>
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 bg-[#0a0a0a] relative">
        <div className="max-w-[1400px] mx-auto px-8">
          <h2 className="text-center font-orbitron text-[clamp(2rem,5vw,3.5rem)] mb-16 font-bold tracking-[2px]">
            POWERFUL FEATURES
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mt-16">
            <FeatureCard
              id="feature1"
              icon={
                <svg className="w-[35px] h-[35px] stroke-white" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M12 6v6l4 2"></path>
                </svg>
              }
              title="Smart Discovery"
              description="Advanced algorithms analyze your taste to surface hidden gems and emerging artists you'll love."
            />
            <FeatureCard
              id="feature2"
              icon={
                <svg className="w-[35px] h-[35px] stroke-white" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18V5l12-2v13"></path>
                  <circle cx="6" cy="18" r="3"></circle>
                  <circle cx="18" cy="16" r="3"></circle>
                </svg>
              }
              title="AI Playlists"
              description="Neural networks curate perfect playlists for every mood, moment, and activity automatically."
            />
            <FeatureCard
              id="feature3"
              icon={
                <svg className="w-[35px] h-[35px] stroke-white" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
              }
              title="Offline Sync"
              description="Download unlimited tracks with premium quality and listen anywhere without internet access."
            />
            <FeatureCard
              id="feature4"
              icon={
                <svg className="w-[35px] h-[35px] stroke-white" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              }
              title="Personal Recommendations"
              description="Machine learning adapts to your evolving taste delivering increasingly precise suggestions."
            />
          </div>
        </div>
      </section>

      {/* Showcase Section */}
      <section id="showcase" className="py-32 relative overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-8">
          <div className="flex items-center justify-between gap-16 flex-wrap">
            <div
              id="showcase-text"
              data-animate
              className={`flex-1 min-w-[300px] transition-all duration-800 ${
                isVisible['showcase-text'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-[30px]'
              }`}
            >
              <h2 className="font-orbitron text-[clamp(2rem,4vw,3rem)] mb-6 font-bold">
                EXPERIENCE MUSIC<br />REIMAGINED
              </h2>
              <p className="text-gray-400 text-lg leading-relaxed mb-8">
                Our cutting-edge interface combines intuitive design with powerful features. Navigate millions of tracks effortlessly with gesture controls, voice commands, and adaptive layouts that respond to your listening habits.
              </p>
              <p className="text-gray-400 text-lg leading-relaxed">
                Every detail crafted for an immersive audio journey that puts you in control of your sonic universe.
              </p>
            </div>
            <div
              id="showcase-mockup"
              data-animate
              className={`flex-1 flex justify-center items-center relative min-w-[300px] transition-all duration-800 ${
                isVisible['showcase-mockup'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-[30px]'
              }`}
            >
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#1a1a1a] to-black border-2 border-white/10 opacity-60 absolute top-[10%] left-[-10%] animate-float"></div>
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#1a1a1a] to-black border-2 border-white/10 opacity-60 absolute bottom-[20%] right-[-10%] animate-float" style={{ animationDelay: '1s' }}></div>
              <div className="w-[300px] h-[600px] bg-gradient-to-br from-[#1a1a1a] to-black rounded-[40px] border-[8px] border-[#0a0a0a] shadow-[0_30px_60px_rgba(0,0,0,0.5),0_0_80px_rgba(255,255,255,0.1)] transition-transform duration-600 hover:rotate-y-0 overflow-hidden" style={{ transform: 'perspective(1000px) rotateY(-15deg)' }}>
                <div className="w-full h-full bg-gradient-to-b from-[#0a0a0a] to-[#1a1a1a] flex flex-col items-center justify-center p-8">
                  <svg width="200" height="200" viewBox="0 0 200 200">
                    <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2"/>
                    <circle cx="100" cy="100" r="60" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2"/>
                    <circle cx="100" cy="100" r="40" fill="rgba(255,255,255,0.05)"/>
                    <path d="M 100 40 L 100 100 L 140 100" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Community Section */}
      <section id="community" className="py-32 bg-[#0a0a0a] text-center">
        <div className="max-w-[1400px] mx-auto px-8">
          <h2 className="font-orbitron text-[clamp(2rem,5vw,3.5rem)] mb-6 font-bold tracking-[2px]">
            JOIN THE COMMUNITY
          </h2>
          <p className="max-w-[700px] mx-auto text-gray-400 text-lg leading-relaxed mb-16">
            Connect with millions of music lovers worldwide. Follow your favorite artists, share playlists, and discover what's trending in your musical universe.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 mt-16">
            <ProfileSilhouette
              id="community1"
              icon={
                <svg className="w-[60px] h-[60px] stroke-white opacity-50" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              }
              title="50M+ Users"
              subtitle="Active listeners"
            />
            <ProfileSilhouette
              id="community2"
              icon={
                <svg className="w-[60px] h-[60px] stroke-white opacity-50" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              }
              title="100K+ Artists"
              subtitle="Global creators"
            />
            <ProfileSilhouette
              id="community3"
              icon={
                <svg className="w-[60px] h-[60px] stroke-white opacity-50" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
              }
              title="1B+ Streams"
              subtitle="Monthly plays"
            />
            <ProfileSilhouette
              id="community4"
              icon={
                <svg className="w-[60px] h-[60px] stroke-white opacity-50" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
              }
              title="Real-time Chat"
              subtitle="Connect instantly"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="footer" className="bg-black py-16 border-t border-white/10">
        <div className="max-w-[1400px] mx-auto px-8">
          <div className="flex justify-between items-center flex-wrap gap-8 mb-8">
            <div className="font-orbitron text-[1.8rem] font-black tracking-[2px] text-gradient">
              Musor
            </div>
            <ul className="flex gap-8 list-none">
              {['About', 'Pricing', 'Privacy', 'Terms', 'Support'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-gray-400 no-underline transition-colors duration-300 hover:text-white">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
            <div className="flex gap-6">
              {[
                <path key="fb" d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>,
                <path key="tw" d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path>,
                <>
                  <rect key="ig1" x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path key="ig2" d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line key="ig3" x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </>,
              ].map((icon, idx) => (
                <a
                  key={idx}
                  href="#"
                  className="w-10 h-10 border-2 border-white/10 rounded-full flex items-center justify-center transition-all duration-300 hover:border-white hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                >
                  <svg className="w-5 h-5 stroke-white" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {icon}
                  </svg>
                </a>
              ))}
            </div>
          </div>
          <div className="text-center pt-8 border-t border-white/10 text-gray-400 text-sm">
            <p>&copy; 2025 Musor. All rights reserved. The future of music is here.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default FuturisticMusicApp;