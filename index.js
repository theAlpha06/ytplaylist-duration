import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const app = express();

function fetchPlaylistItems(id, pageToken = null) {
  let apiUrl = `https://www.googleapis.com/youtube/v3/playlistItems?playlistId=${id}&key=AIzaSyAig4yXX4gNV5OKSxZZURYDyxsZ9GRfKZw&part=contentDetails`;

  if (pageToken) {
    apiUrl += `&pageToken=${pageToken}`;
  }

  return axios.get(apiUrl)
    .then(response => {
      const nextPageToken = response.data.nextPageToken;
      const playlistItems = response.data.items;
      if (nextPageToken) {
        return fetchPlaylistItems(id, nextPageToken)
          .then(nextPageItems => playlistItems.concat(nextPageItems));
      }
      return playlistItems;
    });
}

function parseISO8601Duration(duration) {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);

  const hours = parseInt(match[1]) || 0;
  const minutes = parseInt(match[2]) || 0;
  const seconds = parseInt(match[3]) || 0;

  return hours * 3600 + minutes * 60 + seconds;
}

function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  return `${hours}h:${minutes.toString().padStart(2, '0')}m:${remainingSeconds.toString().padStart(2, '0')}s`;
}

async function fetchVideoDuration(videoId) {
  const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoId}&fields=items(contentDetails(duration))&key=AIzaSyAig4yXX4gNV5OKSxZZURYDyxsZ9GRfKZw`;
  return axios.get(apiUrl)
    .then(response => {
      const videoDuration = response.data.items[0].contentDetails.duration;
      const durationInSeconds = parseISO8601Duration(videoDuration);
      return durationInSeconds;
    });
}

app.get('/duration/:id', (req, res) => {

  fetchPlaylistItems(req.params.id)
    .then(async playlistItems => {
      let totalDuration = 0;
      const durationPromises = playlistItems.map(item => fetchVideoDuration(item.contentDetails.videoId));
      const durations = await Promise.all(durationPromises);
      durations.forEach(duration => {
        totalDuration += duration;
      });
      const formattedTotalDuration = formatDuration(totalDuration);
      res.send(formattedTotalDuration);
    })
    .catch(error => {
      console.log(error);
    });
});

app.listen(process.env.PORT, () => {
  console.log('Server started on port 4000');
});