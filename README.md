# Collaborative Music Platform

A real-time synchronized listening platform where friends can join a shared room, listen to music together in sync, chat live, and discover songs through each other's playlists — no manual coordination needed.

- **Live App:** [https://musor-ten.vercel.app/](https://musor-ten.vercel.app/)
- **Demo Video (Cloudinary):** [Watch Video](https://res.cloudinary.com/d3ukbssg/video/upload/v1787560313/musor_record.mp4)


## Features

- **Real-Time Synchronized Listening** — Join a room with friends and listen to the same song at the same time, in sync, across all devices.
- **Shared Song Queue** — Add songs to a collective queue that everyone in the room can see and contribute to.
- **Live Group Chat** — Chat with everyone in the room in real time while listening together.
- **Collaborative Playlist Recommendations** — Get playlist suggestions based on what the group is listening to and enjoying.
- **Multi-User Rooms** — Supports 10–15 concurrent users per listening session without lag or desync.
- **Profile-Based Social Discovery** — Browse your friends' saved songs and playlists directly from their profiles.
- **Secure Authentication** — Clerk-based authentication and secure session management to keep accounts and rooms safe.
- **Fast, Responsive Experience** — Low-latency real-time updates for song sync, chat messages, and queue changes.

---

## Running Locally

### Prerequisites

Make sure you have the following installed and running:
- Node.js (v18+)
- PostgreSQL (Local instance or cloud provider like Neon)

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>
```

### 2. Set up the backend

**A. Express API Server (`backend`):**

```bash
cd backend
npm install
```

Create a `.env` file inside the `backend` folder with the following variables:

```env
PORT=5000
DBURI="your_postgresql_connection_string"
CLERK_PUBLISHABLE_KEY="your_clerk_publishable_key"
CLERK_SECRET_KEY="your_clerk_secret_key"
YT_API_KEY="your_youtube_data_api_v3_key"
```

Initialize your PostgreSQL database tables by running the SQL queries in `backend/db/all_sql_queries.sql`.

Start the backend API server:

```bash
npm run dev
```

**B. WebSocket Server (`ws-backend`):**

In a separate terminal window:

```bash
cd ws-backend
npm install
```

Create a `.env` file inside the `ws-backend` folder (optional, defaults to port 8080):

```env
PORT=8080
DBURI="your_postgresql_connection_string"
```

Start the WebSocket server:

```bash
npm start
```

### 3. Set up the frontend

In a separate terminal window:

```bash
cd frontend
npm install
```

Create a `.env` file inside the `frontend` folder:

```env
VITE_CLERK_PUBLISHABLE_KEY="your_clerk_publishable_key"
VITE_BACKEND_URL="http://localhost:5000"
VITE_WS_URL="ws://localhost:8080"
VITE_YOUTUBE_API_KEY="your_youtube_data_api_v3_key"
```

Start the frontend:

```bash
npm run dev
```

### 4. Open the app

Visit `http://localhost:5173` (or the port shown in your terminal) in your browser.

---

## Notes

- **Database:** Make sure PostgreSQL is running locally (e.g., via Docker) or use a cloud database provider like [Neon](https://neon.tech). Run the table creation scripts from `backend/db/all_sql_queries.sql`.
- **Authentication:** Authentication is handled using [Clerk](https://clerk.com). Create a Clerk application, obtain your API keys, and add `CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` to `backend/.env`, and `VITE_CLERK_PUBLISHABLE_KEY` to `frontend/.env`.
- **YouTube Data API:** Obtain a YouTube Data API v3 key from the [Google Cloud Console](https://console.cloud.google.com/) and set it as `YT_API_KEY` in `backend/.env` and `VITE_YOUTUBE_API_KEY` in `frontend/.env`.
- **Concurrent Processes:** For full functionality, run the Express backend (`backend`), WebSocket server (`ws-backend`), and Vite frontend (`frontend`) in separate terminal windows simultaneously.