import React, { useState, useRef, useEffect } from 'react';
import { Books, CaretRight, Trophy, X, Clock } from '@phosphor-icons/react';
import './TopicInput.css';

const LeaderboardModal = ({ isOpen, onClose }) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [isClosing, setIsClosing] = useState(false);
  const modalRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      const history = JSON.parse(localStorage.getItem('quiz_history') || '[]');
      const sortedHistory = history.sort((a, b) => b.score - a.score);
      setLeaderboard(sortedHistory);
      setIsClosing(false);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 300);
  };

  const handleOverlayClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className={`modal-overlay ${!isClosing ? 'open' : ''}`} 
      onClick={handleOverlayClick}
    >
      <div className="modal-content" ref={modalRef}>
        <div className="modal-header">
          <div className="modal-title">
            <Trophy size={24} className="leaderboard-icon" />
            <h2>Leaderboard</h2>
          </div>
          <button className="modal-close" onClick={handleClose}>
            <X size={24} />
          </button>
        </div>
        <div className="leaderboard-list">
          {leaderboard.length > 0 ? (
            leaderboard.map((entry, index) => (
              <div key={entry.timestamp} className="leaderboard-item">
                <div className="leaderboard-rank">#{index + 1}</div>
                <div className="leaderboard-info">
                  <span className="leaderboard-topic">{entry.topic}</span>
                  <span className="leaderboard-date">
                    {new Date(entry.timestamp).toLocaleDateString()}
                  </span>
                </div>
                <div className="leaderboard-score">
                  <Trophy size={16} />
                  <span>{entry.score}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="leaderboard-empty">
              You have records yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const RecentTopics = ({ onSelectTopic }) => {
  const [recentTopics, setRecentTopics] = useState([]);

  useEffect(() => {
    // Get unique topics from quiz history
    const history = JSON.parse(localStorage.getItem('quiz_history') || '[]');
    const uniqueTopics = [...new Set(history.map(item => item.topic))].slice(0, 5);
    setRecentTopics(uniqueTopics);
  }, []);

  if (recentTopics.length === 0) return null;

  return (
    <div className="recent-topics">
      <div className="recent-topics-header">
        <Clock size={16} />
        <span>Recent Topics</span>
      </div>
      <div className="recent-topics-list">
        {recentTopics.map((topic, index) => (
          <button
            key={index}
            className="topic-chip"
            onClick={() => onSelectTopic(topic)}
          >
            {topic}
          </button>
        ))}
      </div>
    </div>
  );
};

const TopicInput = ({ 
  topic, 
  setTopic, 
  generateQuestions, 
  isLoading, 
  error, 
  hasApiKey 
}) => {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('openai_api_key') || '');
  const [apiKeyError, setApiKeyError] = useState('');
  const [placeholder, setPlaceholder] = useState('');
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const typewriterText = "Enter a quiz topic (e.g., Python Programming, or Fun Facts)...";
  const inputRef = useRef(null);

  // Typewriter effect function
  const typeWriter = (text, currentIndex = 0) => {
    if (currentIndex < text.length) {
      setPlaceholder(text.substring(0, currentIndex + 1));
      setTimeout(() => typeWriter(text, currentIndex + 1), 50);
    }
  };

  useEffect(() => {
    setPlaceholder('');
    typeWriter(typewriterText);
  }, []);

  const handleApiKeyChange = (e) => {
    const newApiKey = e.target.value;
    setApiKey(newApiKey);
    localStorage.setItem('openai_api_key', newApiKey);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiKeyError('');

    if (!topic.trim()) {
      return;
    }

    if (!hasApiKey) {
      if (!apiKey.trim()) {
        setApiKeyError('OpenAI API Key is required');
        return;
      }
      if (!apiKey.startsWith('sk-')) {
        setApiKeyError('Invalid API Key format');
        return;
      }
    }
    
    generateQuestions(hasApiKey ? null : apiKey);
  };

  return (
    <div className="topic-screen">
      <div className="topic-header">
        <Books className="topic-icon" />
        <h1>Astral Quiz</h1>
        <button 
          className="leaderboard-button"
          onClick={() => setIsLeaderboardOpen(true)}
        >
          <Trophy size={20} />
          Leaderboard
        </button>
      </div>

      <form onSubmit={handleSubmit} className="input-form">
        <div className="input-sections">
          <div className="input-section">
            <label htmlFor="topic">Quiz Topic</label>
            <div className="input-container">
              <input
                ref={inputRef}
                id="topic"
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={placeholder}
                className="topic-input"
                disabled={isLoading}
              />
            </div>
          </div>

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
                type="password"
                value={apiKey}
                onChange={handleApiKeyChange}
                placeholder="sk-..."
                className="topic-input"
                disabled={isLoading}
              />
            </div>
            {apiKeyError && (
              <p className="error-message">{apiKeyError}</p>
            )}
          </div>
        </div>

        <RecentTopics onSelectTopic={setTopic} />

        <button
          type="submit"
          className={`start-button ${(!topic.trim() || !apiKey.trim()) ? 'disabled' : ''}`}
          disabled={isLoading || !topic.trim() || !apiKey.trim()}
        >
          <CaretRight className="button-icon" />
          <span>Start Quiz</span>
        </button>

        {error && (
          <p className="error-message">{error}</p>
        )}
      </form>

      <LeaderboardModal 
        isOpen={isLeaderboardOpen} 
        onClose={() => setIsLeaderboardOpen(false)} 
      />
    </div>
  );
};

export default TopicInput;
