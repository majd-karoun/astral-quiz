import React from 'react';
import { CircleNotch } from '@phosphor-icons/react';
import './LoadingScreen.css';

const LoadingScreen = () => {
  return (
    <div className="card">
      <div className="loading-screen">
        <CircleNotch size={80} className="loading-spinner" weight="bold" />
        <h2 className="title-large">Generating Quiz...</h2>
        <p className="loading-message">The quiz will start as soon as the first question is ready</p>
      </div>
    </div>
  );
};

export default LoadingScreen;
