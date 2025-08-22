import React, { useEffect, useState } from 'react';
import { Howl } from 'howler';
import './LoadingScreen.css';

const LoadingScreen = ({ progress = 0 }) => {
  const [fakeProgress, setFakeProgress] = useState(0);
  
  // Check if using GPT-5 model
  const selectedModel = sessionStorage.getItem('selected_model') || 'gpt-4o-mini';
  const isGpt5 = selectedModel.includes('gpt-5');

  useEffect(() => {
    const sound = new Howl({
      src: ['/sounds/loading.mp3'],
      volume: 0.3,
      loop: true
    });
    sound.play();
    
    return () => {
      sound.stop();
    };
  }, []);

  useEffect(() => {
    // Start loading animation that stops around 50% (80% for GPT-5)
    const maxProgress = isGpt5 ? 80 : 50;
    const interval = setInterval(() => {
      setFakeProgress(prev => {
        if (prev >= maxProgress) {
          clearInterval(interval);
          return prev;
        }
        // Random increment between 1-5% (smaller for GPT-5)
        const baseIncrement = Math.random() * 4 + 1;
        const increment = isGpt5 ? baseIncrement / 3 : baseIncrement;
        return Math.min(prev + increment, maxProgress);
      });
    }, isGpt5 ? 200 + Math.random() * 300 : 100 + Math.random() * 200); // 3x slower for GPT-5

    return () => clearInterval(interval);
  }, [isGpt5]);

  // Use real progress if available, otherwise use fake progress
  const displayProgress = progress > 0 ? progress : fakeProgress;

  return (
    <div className="simple-loading-screen">
      <h2 className="title-large">Creating quiz...</h2>
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${displayProgress}%` }} 
        />
      </div>
    </div>
  );
};

export default LoadingScreen;
