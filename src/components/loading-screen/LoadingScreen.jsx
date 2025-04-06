import React, { useEffect } from 'react';
import { Howl } from 'howler';
import './LoadingScreen.css';

const LoadingScreen = ({ progress = 0 }) => {
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

  return (
    <div className="simple-loading-screen">
      <h2 className="title-large">Crafting Your Quiz...</h2>
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${progress}%` }} 
        />
      </div>
    </div>
  );
};

export default LoadingScreen;
