import React from 'react';
import { Books, CaretRight, Spinner } from '@phosphor-icons/react';
import './TopicInput.css';

function TopicInput({ topic, setTopic, generateQuestions, isLoading, error }) {
  return (
    <div className="topic-screen">
      <Books size={64} weight="duotone" className="topic-icon" />
      <h2>Wähle ein Thema für dein Quiz</h2>
      
      <input
        type="text"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="z.B. JavaScript, Geschichte, Wissenschaft..."
        className="topic-input"
        disabled={isLoading}
      />
      
      <button
        className="start-button"
        onClick={generateQuestions}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Spinner size={24} className="spinner" />
            <span>Generiere Fragen...</span>
          </>
        ) : (
          <>
            <CaretRight size={24} />
            <span>Quiz starten</span>
          </>
        )}
      </button>
      
      {error && (
        <p className="error-message">{error}</p>
      )}
    </div>
  );
}

export default TopicInput;