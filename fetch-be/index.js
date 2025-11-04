import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());

async function getTopYTResults(songName) {
  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(songName)}`;
    const { data } = await axios.get(searchUrl, {
      headers: {
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    const videoMatches = [...data.matchAll(/"videoId":"(.*?)"/g)];
    const videoIds = [...new Set(videoMatches.map(match => match[1]))];
    const topVideos = videoIds.slice(0, 10).map(id => ({
      videoId: id,
      videoLink: `https://www.youtube.com/watch?v=${id}`,
      embedLink: `https://www.youtube.com/embed/${id}`,
    }));

    if (topVideos.length === 0) {
      console.log("No videos found");
      return null;
    }

    return topVideos;
  } catch (e) {
    console.error("Error fetching videos:", e.message);
    return null;
  }
}

app.get("/", (req, res) => {
  res.json({ message: "Hello from YouTube Scraper" });
});

app.post("/get-music-links", async (req, res) => {
  const { song } = req.body;
  if (!song) {
    return res.status(400).json({ error: "Please provide a song name" });
  }

  const links = await getTopYTResults(song);

  if (links) {
    res.json({ songName: song, results: links });
  } else {
    res.status(404).json({ error: "No YouTube links found" });
  }
});

app.listen(3001, () => {
  console.log("Server running on port 3001");
});