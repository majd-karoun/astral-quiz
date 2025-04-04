import React from 'react';
import { CircleNotch } from '@phosphor-icons/react';
import './LoadingScreen.css';

const LoadingScreen = () => {
  return (
    <div className="card">
      <div className="loading-screen">
        <CircleNotch size={80} className="loading-spinner" weight="bold" />
        <h2 className="title-large">Generating Quiz...</h2>
       
      </div>
    </div>
  );
};

export default LoadingScreen;
