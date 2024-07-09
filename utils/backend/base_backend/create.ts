const express = require('express');
const cors = require('cors');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const { SpeechClient } = require('@google-cloud/speech');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable all CORS requests
app.use(cors());

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Serve static files from the uploads directory
app.use('/uploads', express.static(uploadDir));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage: storage });

// Initialize SpeechClient with credentials
const speechClient = new SpeechClient();

// Function to extract audio
function extractAudio(videoPath, audioPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .output(audioPath)
      .noVideo()
      .audioCodec('pcm_s16le') // Ensure audio codec matches required format
      .on('end', () => {
        resolve('Audio extracted successfully');
      })
      .on('error', (err) => {
        reject(err);
      })
      .run();
  });
}

// Function to get sample rate from audio file
function getAudioSampleRate(audioPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(audioPath, (err, metadata) => {
      if (err) {
        reject(err);
      } else {
        const sampleRate = metadata.streams[0].sample_rate;
        resolve(sampleRate);
      }
    });
  });
}

// Function to transcribe audio
async function transcribeAudio(audioPath) {
  // Get sample rate from audio file
  const sampleRate = await getAudioSampleRate(audioPath);

  const audio = {
    content: fs.readFileSync(audioPath).toString('base64'),
  };
  const config = {
    encoding: 'LINEAR16',
    sampleRateHertz: sampleRate, // Use actual sample rate from audio file
    languageCode: 'en-US',
  };
  const request = {
    audio: audio,
    config: config,
  };

  const [response] = await speechClient.recognize(request);
  const transcription = response.results
    .map(result => result.alternatives[0].transcript)
    .join('\n');
  return transcription;
}

// Function to convert transcription to SRT
function convertToSrt(transcription) {
  const lines = transcription.split('\n');
  let srt = '';
  let counter = 1;
  let startTime = 0;

  lines.forEach(line => {
    const endTime = startTime + 2000; // Example duration of 2 seconds per line
    const start = new Date(startTime).toISOString().substr(11, 8) + ',000';
    const end = new Date(endTime).toISOString().substr(11, 8) + ',000';

    srt += `${counter}\n${start} --> ${end}\n${line}\n\n`;
    counter++;
    startTime = endTime;
  });

  return srt;
}

// POST endpoint for uploading video
app.post('/upload-video', upload.single('video'), async (req, res) => {
  const videoFile = req.file;
  const videoPath = videoFile.path;
  const audioFileName = path.basename(videoFile.originalname, path.extname(videoFile.originalname)) + '.wav';
  const audioPath = path.join(uploadDir, audioFileName);
  const subtitleFileName = path.basename(videoFile.originalname, path.extname(videoFile.originalname)) + '.srt';
  const subtitlePath = path.join(uploadDir, subtitleFileName);

  console.log('Uploaded video:', videoFile);

  try {
    await extractAudio(videoPath, audioPath);
    const transcription = await transcribeAudio(audioPath);
    const srtContent = convertToSrt(transcription);
    fs.writeFileSync(subtitlePath, srtContent);
    res.json({ message: 'Subtitles generated successfully', subtitleFile: subtitleFileName });
  } catch (error) {
    console.error('Error generating subtitles:', error);
    res.status(500).json({ error: 'Failed to generate subtitles' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
