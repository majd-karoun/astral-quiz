import React from 'react';
import { CircleNotch } from '@phosphor-icons/react';

const LoadingScreen = () => {
  return (
    <div className="container">
      <div className="card">
        <div className="loading-screen">
          <CircleNotch size={64} className="spinner" weight="bold" />
          <h2 className="title-large">Generiere dein Quiz...</h2>
          <p className="loading-text">Das kann einen Moment dauern</p>
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

.loading-text {
  color: #6b7280;
  font-size: 16px;
  margin: 0;
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