// src/VideoUpload.tsx
import React, { useState, ChangeEvent, FormEvent } from 'react';
import axios from 'axios';

const isError = (error: unknown): error is Error => {
  return (error as Error).message !== undefined;
};

const VideoUpload: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFile) {
      alert('Please select a video file.');
      return;
    }

    const formData = new FormData();
    formData.append('video', selectedFile);

    try {
      const response = await axios.post('http://localhost:3000/upload-video', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      alert('Video uploaded successfully.');
      console.log(response.data);
    } catch (error) {
      if (isError(error)) {
        alert('Error uploading video: ' + error.message);
        console.error('Error uploading video:', error);
      } else {
        alert('An unknown error occurred.');
        console.error('Unknown error:', error);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="file" onChange={handleFileChange} accept="video/*" />
      <button type="submit">Upload Video</button>
    </form>
  );
};

export default VideoUpload;

