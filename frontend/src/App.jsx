import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
} from "@clerk/clerk-react";
import SyncUser from "./pages/login";
import Profile from "./pages/profile";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import StaggeredMenu from "../components/StaggeredMenu";
import "./App.css";
import Landing from "./pages/landing";
import logo from "/public/image.png";
import NoMatch from "../components/TextPressure";
import Music from "./pages/music";
import AddFriend from "./pages/addfriend";
import Playlist from "./pages/playlist";
import Notifications from "./pages/notifications";
import Friends from "./pages/friends";
import JoinRoom from "./pages/joinroom";
export default function App() {
  return (
    <Router>
      <div className="w-screen min-h-screen">
        <SignedOut>
          <SignInButton />
        </SignedOut>

        <SignedIn>
          <StaggeredMenu
            position="left"
            items={[
              { label: "Home", href: "/" },
              { label: "Profile", href: "/profile" },
              { label: "Music", href: "/music" },
              { label: "Friends", href: "/friends" }, 
              { label: "Add", href: "/addfriend" }, 
              {label : "Playlist" , href: "/playlist" },
              {label : "Notif" , href: "/notifications" },
              {label : "Room" , href: "/joinroom" },
            ]}
            // socialItems={[
            //   { label: "Github", href: "https://github.com/AdityaKurani" },
            //   {
            //     label: "LinkedIn",
            //     href: "https://linkedin.com/in/aditya-kurani",
            //   },
            //   { label: "Twitter", href: "https://twitter.com/AdityaKurani" },
            // ]}
            displayItemNumbering={true}
            className="fixed top-0 left-0 z-50 bg-black" 
            logoUrl={logo}
          />

          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/sync" element={<SyncUser />} />
            <Route path="/profile" element={<Profile />} />  
            <Route path="/music" element={<Music />} /> 
            <Route path="/addfriend" element={<AddFriend />} />
            <Route path="/friends" element={<Friends />} />
            <Route path="/playlist" element={<Playlist />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/joinroom" element={<JoinRoom />} />
            <Route path="*" element={<NoMatch text="Oops" />} />
          </Routes>
        </SignedIn>
      </div>
    </Router>
  );
}
