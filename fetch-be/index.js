import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

async function getYTMusicLink(songName) {
  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(songName)}`;
    const { data } = await axios.get(searchUrl, {
      headers: {
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    // console.log("Data: " , data);
    const videoMatch = data.match(/"videoId":"(.*?)"/);
    if(videoMatch && videoMatch[1]) {
      const videoId = videoMatch[1];
      console.log("Id: " , videoId);
      return `https://www.youtube.com/watch?v=${videoId}`;
    } else {
      console.log("Not found");
      return null;
    }
  } catch (e) {
    console.error("Error fetching video:", e.message);
    return null;
  }
}

app.get("/" , (req , res) => {
    res.json({message: "hello"});
})

app.post("/get-music-link", async (req, res) => {
  const { song } = req.body;
  if(!song) {
    return res.status(400).json({ error: "Provide song" });
  }
  const link = await getYTMusicLink(song);
  if(link) {
    res.json({ songName: song , Link: link });
  } else {
    res.status(404).json({ error: "Cannot find yt music link" });
  }
});

app.listen(3001, () => {
  console.log(`On Port: `, 3001);
});