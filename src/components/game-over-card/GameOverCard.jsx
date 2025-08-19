import React from 'react';
import { X, Repeat, CaretRight } from '@phosphor-icons/react';
import './GameOverCard.css';

const GameOverCard = ({ points, onRetry, onNewGame, isExiting }) => (
  <div className={`game-over-card ${isExiting ? 'exiting' : ''}`}>
    <div className="game-over-content">
      <X size={64} className="game-over-icon" />
      <h2 className="game-over-title">Game Over!</h2>
      <p className="game-over-score">Score: {points}</p>
      <div className="game-over-buttons">
        <button className="game-over-button" onClick={onRetry}>
          <Repeat size={24} />
          Try again
        </button>
        <button className="game-over-button outline" onClick={onNewGame}>
          <CaretRight size={24} />
          New Topic
        </button>
      </div>
    </div>
  </div>
);

export default GameOverCard;
