import React, { useState } from 'react';
import { Books, CaretRight } from '@phosphor-icons/react';
import './TopicInput.css';

const TopicInput = ({ topic, setTopic, generateQuestions, isLoading, error, hasApiKey }) => {
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyError, setApiKeyError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiKeyError('');

    if (!topic.trim()) {
      return;
    }

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
      <div className="topic-header">
        <Books className="topic-icon" />
        <h2>Wähle ein Thema für dein Quiz</h2>
      </div>

      <form onSubmit={handleSubmit} className="input-form">
        <div className="input-sections">
          {/* Topic Input Section */}
          <div className="input-section">
            <label htmlFor="topic">Quiz Thema</label>
            <div className="input-container">
              <input
                id="topic"
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="z.B. JavaScript, Geschichte, Wissenschaft..."
                className="topic-input"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* API Key Section */}
          {!hasApiKey && (
            <div className="input-section">
              <label htmlFor="apiKey">
                OpenAI API Key
                <a 
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="api-key-link"
                >
                  Get your API key here
                </a>
              </label>
              <div className="input-container">
                <input
                  id="apiKey"
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="topic-input"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="visibility-toggle"
                >
                  {showApiKey ? (
                    <span>Hide</span>
                  ) : (
                    <span>Show</span>
                  )}
                </button>
              </div>
              {apiKeyError && (
                <p className="error-message">{apiKeyError}</p>
              )}
            </div>
          )}
        </div>

        <button
          type="submit"
          className={`start-button ${(!topic.trim() || (!hasApiKey && !apiKey.trim())) ? 'disabled' : ''}`}
          disabled={isLoading || !topic.trim() || (!hasApiKey && !apiKey.trim())}
        >
          {isLoading ? (
            <>
              <div className="spinner" />
              <span>Generiere Fragen...</span>
            </>
          ) : (
            <>
              <CaretRight className="button-icon" />
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