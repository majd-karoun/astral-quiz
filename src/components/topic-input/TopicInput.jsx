import React, { useState, useRef, useEffect } from 'react';
import { Howl } from 'howler';
import { Books, CaretRight, Trophy, X, Clock } from '@phosphor-icons/react';
import './TopicInput.css';

const LeaderboardModal = ({ isOpen, onClose, onSelectTopic }) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [isClosing, setIsClosing] = useState(false);
  const modalRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      const history = JSON.parse(localStorage.getItem('quiz_history') || '[]');
      
      // Group by topic and keep only the highest score for each topic
      const topicBestScores = {};
      history.forEach(entry => {
        if (!topicBestScores[entry.topic] || entry.score > topicBestScores[entry.topic].score) {
          topicBestScores[entry.topic] = entry;
        }
      });
      
      // Convert back to array and sort by score (highest first)
      const uniqueTopicHistory = Object.values(topicBestScores);
      const sortedHistory = uniqueTopicHistory
        .sort((a, b) => {
          // First sort by score (highest first)
          if (b.score !== a.score) {
            return b.score - a.score;
          }
          // If scores are equal, sort by timestamp (newest first)
          return b.timestamp - a.timestamp;
        })
        .slice(0, 100); // Limit to top 100 entries
      
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

  const handleTopicClick = async (topic) => {
    onSelectTopic(topic);
    // Wait for React to update the DOM
    await new Promise(resolve => setTimeout(resolve, 10));
    handleClose();
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
              <div key={entry.timestamp} className="leaderboard-item" onClick={() => handleTopicClick(entry.topic)}>
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
              You have no records yet
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
    // Get quiz history and sort by timestamp (most recent first)
    const history = JSON.parse(localStorage.getItem('quiz_history') || '[]');
    
    // Create a map to track the latest timestamp for each topic
    const topicTimestamps = {};
    history.forEach(item => {
      if (!topicTimestamps[item.topic] || item.timestamp > topicTimestamps[item.topic]) {
        topicTimestamps[item.topic] = item.timestamp;
      }
    });
    
    // Get unique topics ordered by their latest timestamp
    const topicsWithTimestamps = Object.keys(topicTimestamps).map(topic => ({
      topic,
      timestamp: topicTimestamps[topic]
    }));
    
    // Sort by timestamp (most recent first) and take the first 20
    const sortedTopics = topicsWithTimestamps
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 20)
      .map(item => item.topic);
    
    setRecentTopics(sortedTopics);
  }, []);

  if (recentTopics.length === 0) return null;

  return (
    <div className="recent-topics">
      <div className="recent-topics-header">
        <Clock size={16} />
        <span>Recent Topics</span>
      </div>
      <div className="topics-grid">
        {recentTopics.map(topic => (
          <button 
            key={topic} 
            className="topic-chip"
            onClick={async () => {
              onSelectTopic(topic);
              // Wait for React to update the DOM
              await new Promise(resolve => setTimeout(resolve, 10));
            }}
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
  const [apiKey, setApiKey] = useState(() => {
    // First check localStorage, then sessionStorage
    return localStorage.getItem('openai_api_key') || sessionStorage.getItem('openai_api_key') || '';
  });
  const [apiKeyError, setApiKeyError] = useState('');
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [placeholder, setPlaceholder] = useState('');
  const [selectedModel, setSelectedModel] = useState(() => {
    // Use sessionStorage to persist model selection during session but not across refreshes
    return sessionStorage.getItem('selected_model') || 'gpt-4o-mini';
  });
  const [isExiting, setIsExiting] = useState(false);
  const inputRef = useRef(null);
  const formRef = useRef(null);
  const cardRef = useRef(null);

  useEffect(() => {
    const placeholders = [
      'History of the Roman Empire',
      'Quantum Physics for Beginners',
      'The Works of Leonardo da Vinci',
      'Deep Sea Marine Biology',
      'Ancient Egyptian Mythology',
      'The French Revolution',
      'Solar System Formation',
      'The Science of Dreams', 
      'The Human Brain',
    ];
    let currentIndex = 0;
    let letterIndex = 0;
    let currentPlaceholder = '';

    const typeWriter = () => {
      if (letterIndex < placeholders[currentIndex].length) {
        currentPlaceholder += placeholders[currentIndex].charAt(letterIndex);
        setPlaceholder(currentPlaceholder);
        letterIndex++;
        setTimeout(typeWriter, 50);
      } else {
        setTimeout(() => {
          letterIndex = 0;
          currentPlaceholder = '';
          currentIndex = (currentIndex + 1) % placeholders.length;
          typeWriter();
        }, 3000);
      }
    };

    typeWriter();
  }, []);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Ensure input field value is synchronized with topic state
  useEffect(() => {
    if (inputRef.current && inputRef.current.value !== topic) {
      inputRef.current.value = topic;
    }
  }, [topic]);

  const handleApiKeyChange = (e) => {
    const newKey = e.target.value;
    setApiKey(newKey);
    // Save to both storages when changed
    localStorage.setItem('openai_api_key', newKey);
    sessionStorage.setItem('openai_api_key', newKey);
    setApiKeyError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const clickSound = new Howl({
      src: ['/sounds/click.mp3'],
      volume: 0.4
    });
    clickSound.play();

    // Get the current topic from the input field to ensure we have the latest value
    const currentTopic = inputRef.current?.value || topic;
    
    if (!currentTopic.trim()) {
      return;
    }

    if (!hasApiKey) {
      if (!apiKey.trim()) {
        setApiKeyError('API key is required');
        return;
      }
      if (!apiKey.startsWith('sk-')) {
        setApiKeyError('Invalid API key format');
        return;
      }
    }
    
    // Ensure the topic state is synchronized with the input field
    if (currentTopic !== topic) {
      setTopic(currentTopic);
    }
    
    // Start exit animation
    setIsExiting(true);
    
    // Wait for animation to complete before generating questions
    await new Promise(resolve => {
      if (cardRef.current) {
        const onAnimationEnd = () => {
          cardRef.current.removeEventListener('animationend', onAnimationEnd);
          resolve();
        };
        cardRef.current.addEventListener('animationend', onAnimationEnd, { once: true });
      } else {
        setTimeout(resolve, 700); // Fallback if ref isn't available
      }
    });
    
    // Generate questions after animation completes
    generateQuestions(hasApiKey ? null : apiKey, selectedModel);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (!isLoading && topic.trim() && apiKey.trim()) {
        e.preventDefault();
        handleSubmit(e);
      } else {
         e.preventDefault();
      }
    }
  };

  return (
    <div 
      ref={cardRef}
      className={`topic-card ${isExiting ? 'exiting' : ''}`}
      style={{
        '--ios-tap-highlight': 'rgba(0, 122, 255, 0.1)'
      }}
    >
      <div className="topic-content">
        <div className="topic-header">
          <Books className="topic-icon" weight="duotone" />
          <h1>Astral Quiz</h1>
          <button 
            className="leaderboard-button"
            onClick={() => setIsLeaderboardOpen(true)}
          >
            <Trophy size={20} />
            Leaderboard
          </button>
        </div>

        <form onSubmit={handleSubmit} className="input-form" ref={formRef}>
          <div className="input-sections">
            <div className="input-section">
              <label htmlFor="topic">Quiz Topic</label>
              <div className="input-container">
                <input
                  ref={inputRef}
                  id="topic"
                  name="quiz-topic"
                  type="text"
                  autoComplete="off"
                  value={topic}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.length <= 100) {
                      const words = value.split(' ');
                      const hasLongWord = words.some(word => word.length > 40);
                      if (hasLongWord) {
                        const truncatedWords = words.map(word => {
                          if (word.length > 40) {
                            return word.slice(0, 40);
                          }
                          return word;
                        });
                        setTopic(truncatedWords.join(' '));
                      } else {
                        setTopic(value);
                      }
                    }
                  }}
                  placeholder={placeholder}
                  className="topic-input"
                  disabled={isLoading}
                  onKeyDown={handleKeyDown}
                />
                <select
                  value={selectedModel}
                  onChange={(e) => {
                    const newModel = e.target.value;
                    setSelectedModel(newModel);
                    sessionStorage.setItem('selected_model', newModel);
                  }}
                  className="model-select"
                  disabled={isLoading}
                >
                  <option value="gpt-4o-mini">GPT-4 (faster)</option>
                  <option value="gpt-5-mini">GPT-5 (smarter)</option>
                </select>
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
                  Get API Key
                </a>
              </label>
              <div className="input-container">
                <input
                  id="apiKey"
                  type="password"
                  autoComplete="new-password"
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
          onSelectTopic={setTopic}
        />
      </div>
    </div>
  );
};

export default TopicInput;
