import React, { useState } from 'react';
import { Button } from '@canva/app-ui-kit';
import { useSelection } from '../utils/use_selection_hook';
import { getTemporaryUrl } from '@canva/asset';
import styles from '../styles/components.css';

export function App() {
  const currentSelection = useSelection('video');
  const isElementSelected = currentSelection && currentSelection.count > 0;
  const [subtitleContent, setSubtitleContent] = useState<string | null>(null);

  async function handleClick() {
    if (!isElementSelected || !currentSelection) {
      return;
    }

    const draft = await currentSelection.read();

    for (const content of draft.contents) {
      const { url } = await getTemporaryUrl({
        type: 'VIDEO',
        ref: content.ref,
      });
      console.log(url);

      await uploadVideo(url);
    }
  }

  async function uploadVideo(url: string) {
    const response = await fetch(url);
    const blob = await response.blob();
    const formData = new FormData();
    formData.append('video', blob, 'video.mp4');

    fetch('http://localhost:3000/upload-video', {
      method: 'POST',
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        console.log('Video uploaded successfully:', data);
        fetchSubtitleContent(`http://localhost:3000/uploads/${data.subtitleFile}`);
      })
      .catch((error) => {
        console.error('Error uploading video:', error);
      });
  }

  async function fetchSubtitleContent(url: string) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        const text = await response.text();
        setSubtitleContent(text);
        integrateSubtitleIntoCanvas(text);
      } else {
        console.error('Error fetching subtitle content:', response.statusText);
        setSubtitleContent(null);
      }
    } catch (error) {
      console.error('Error fetching subtitle content:', error);
      setSubtitleContent(null);
    }
  }

  function integrateSubtitleIntoCanvas(subtitleText: string) {
    console.log('Integrating subtitle into canvas:', subtitleText);
  }

  return (
    <div className={styles.scrollContainer}>
      <Button
        variant="primary"
        disabled={!isElementSelected}
        onClick={handleClick}
      >
        Read selected video content
      </Button>
      {subtitleContent && (
        <div>
          <h2>Subtitle Content:</h2>
          <pre>{subtitleContent}</pre>
        </div>
      )}
    </div>
  );
}
