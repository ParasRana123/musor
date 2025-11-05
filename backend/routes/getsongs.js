import express from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();

const YT_API_KEY = process.env.YT_API_KEY;

async function getTopYTResults(songName) {
  try {
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=10&q=${encodeURIComponent(
      songName
    )}&key=${YT_API_KEY}`;

    const { data } = await axios.get(searchUrl);

    if (!data.items || data.items.length === 0) {
      console.log("No videos found");
      return null;
    }

    const topVideos = data.items.map((item) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
      videoLink: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      embedLink: `https://www.youtube.com/embed/${item.id.videoId}`,
    }));

    return topVideos;
  } catch (e) {
    console.error("Error fetching videos:", e.message);
    return null;
  }
}

router.get("/", (req, res) => {
  res.json({ message: "Hello from YouTube Data API Server" });
});

router.post("/get-music-link", async (req, res) => {
  const { song } = req.body;
  if (!song) {
    return res.status(400).json({ error: "Please provide a song name" });
  }

  const links = await getTopYTResults(song);
  console.log(links)
  if (links) {
    res.json({ songName: song, Link: links[0].videoLink , results: links });
  } else {
    res.status(404).json({ error: "No YouTube links found" });
  }
});
export default router;