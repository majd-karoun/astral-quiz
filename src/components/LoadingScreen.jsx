import React from 'react';
import { CircleNotch } from '@phosphor-icons/react';

const LoadingScreen = () => {
  return (
    <div className="container">
      <div className="card">
        <div className="loading-screen">
          <CircleNotch size={80} className="spinner" weight="bold" />
          <h2 className="title-large">Generating Quiz...</h2>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;

// Add these styles to your CSS:
const styles = `
.loading-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  padding: 48px 24px;
  text-align: center;
}



@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.spinner {
  animation: spin 1s linear infinite;
  color: #3b82f6;
}
`;