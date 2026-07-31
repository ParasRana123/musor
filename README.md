# Collaborative Music Platform

A real-time synchronized listening platform where friends can join a shared room, listen to music together in sync, chat live, and discover songs through each other's playlists — no manual coordination needed.

## Links

- **Live App:** [https://musor-ten.vercel.app/](https://musor-ten.vercel.app/)
- **Demo Video:**

[![Watch the demo](https://img.youtube.com/vi/IgH-u_4bGFc/maxresdefault.jpg)](https://www.youtube.com/watch?v=IgH-u_4bGFc&feature=youtu.be)

*(Click the thumbnail above to watch the full demo on YouTube)*

---

## Features

- **Real-Time Synchronized Listening** — Join a room with friends and listen to the same song at the same time, in sync, across all devices.
- **Shared Song Queue** — Add songs to a collective queue that everyone in the room can see and contribute to.
- **Live Group Chat** — Chat with everyone in the room in real time while listening together.
- **Collaborative Playlist Recommendations** — Get playlist suggestions based on what the group is listening to and enjoying.
- **Multi-User Rooms** — Supports 10–15 concurrent users per listening session without lag or desync.
- **Profile-Based Social Discovery** — Browse your friends' saved songs and playlists directly from their profiles.
- **Secure Authentication** — JWT-based login and session handling to keep accounts and rooms secure.
- **Fast, Responsive Experience** — Low-latency real-time updates for song sync, chat messages, and queue changes.

---

## Running Locally

> ⚠️ Adjust folder names/paths below (`client` / `server`) if your local repo structure differs.

### Prerequisites

Make sure you have the following installed and running:
- Node.js (v16+)
- PostgreSQL
- Redis

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>
```

### 2. Set up the backend

```bash
cd backend
npm install
```

Create a `.env` file inside the `backend` folder with the following variables:

```env
PORT=5000 
DBURI=''
SECRET_KEY=
CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
YT_API_KEY=""
```

Run database migrations (if applicable):

```bash
npm run migrate
```

Start the backend server:

```bash
cd backend
npm run dev
```

### 3. Set up the frontend

Open a new terminal window:

```bash
cd frontend
npm install
```

Create a `.env` file inside the `forntend` folder:

```env
VITE_CLERK_PUBLISHABLE_KEY=
VITE_BACKEND_URL=http://localhost:5000
VITE_MUSIC_API=http://localhost:3001
VITE_WS_URL=ws://localhost:8080
VITE_YOUTUBE_API_KEY=""
```

Start the frontend:

```bash
cd frontend
npm run dev
```

### 4. Open the app

Visit `http://localhost:5173` (or the port shown in your terminal) in your browser.

---

## Notes

- Make sure the PostgreSQL is running `locally` on `Docker` before starting the backend or you can also use 3rd party providers like `neondb`.
- Authentication is handled using `Clerk`. Create a clerk application, obtain the `CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` then add it in the frontend and backend `env`.
- Get the `YOUTUBE_API_KEY` from `Google Cloud Console` by enabling the YouTube Data API v3 and add it to both frontend and backend.
- Run the backend and frontend in separate terminal windows/tabs simultaneously for full functionality.