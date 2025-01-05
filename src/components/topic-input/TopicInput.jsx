import React, { useState } from 'react';
import { Books, CaretRight, Spinner, Eye, EyeSlash } from '@phosphor-icons/react';

const TopicInput = ({ topic, setTopic, generateQuestions, isLoading, error, hasApiKey }) => {
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyError, setApiKeyError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiKeyError('');

    // Only validate API key if we don't have one stored already
    if (!hasApiKey) {
      if (!apiKey.trim()) {
        setApiKeyError('OpenAI API Key ist erforderlich');
        return;
      }

      if (!apiKey.startsWith('sk-')) {
        setApiKeyError('Ungültiger API Key Format');
        return;
      }
    }

    generateQuestions(hasApiKey ? null : apiKey);
  };

  return (
    <div className="topic-screen">
      <Books size={64} weight="duotone" className="topic-icon" />
      <h2>Wähle ein Thema für dein Quiz</h2>
      
      <form onSubmit={handleSubmit} className="input-form">
        <div className="input-group">
          <div className="input-container">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="z.B. JavaScript, Geschichte, Wissenschaft..."
              className="topic-input"
              disabled={isLoading}
            />
          </div>

          {!hasApiKey && (
            <div className="api-key-container">
              <div className="api-key-wrapper">
                <input
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="OpenAI API Key"
                  className="topic-input api-key-input"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="toggle-visibility"
                  disabled={isLoading}
                >
                  {showApiKey ? <EyeSlash size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <span className="api-key-info">
                Beginnt mit 'sk-'. Dein API Key wird nicht gespeichert.
              </span>
              {apiKeyError && (
                <p className="error-message">{apiKeyError}</p>
              )}
            </div>
          )}
        </div>

        <button
          type="submit"
          className="start-button"
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
      </form>
    </div>
  );
};

export default TopicInput;