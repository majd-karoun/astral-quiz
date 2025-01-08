import React, { useState, useRef, useEffect } from 'react';
import { Books, CaretRight, Trophy, X } from '@phosphor-icons/react';
import './TopicInput.css';

const TOPIC_SUGGESTIONS = [
  { text: "Spanish Basics", emoji: "🇪🇸" },
  { text: "Time Management", emoji: "⏰" },
  { text: "Python Coding", emoji: "💻" },
  { text: "Ui/UX Design", emoji: "🧩" },
  { text: "Creative Writing", emoji: "✍️" },
  { text: "Prompt Engineering", emoji: "🦾" },
  { text: "Cybersecurity Fundamentals", emoji: "🔒" },
  { text: "Environmental Science", emoji: "🌍" },
  { text: "Digital Marketing", emoji: "🛒" },
  { text: "Cloud Computing", emoji: "☁️" },
  { text: "Interior Design", emoji: "🎨" },
  { text: "Introduction to Psychology", emoji: "🧠" },
  { text: "Japanese Culture", emoji: "🎌" },
  { text: "Data Science Basics", emoji: "📊" },
  { text: "Photography Tips", emoji: "📸" },
  { text: "Mindfullness", emoji: "🧘" },
  { text: "Music Theory", emoji: "🎵" },
  { text: "World History", emoji: "📚" },
  { text: "Astronomy Basics", emoji: "🌌" },
  { text: "Artificial Intelligence", emoji: "🤖" },
  { text: "Nutrition Science", emoji: "🥗" },
  { text: "Game Development", emoji: "🎮" },
  { text: "Marine Biology", emoji: "🐋" },
  { text: "Content Creation", emoji: "🎥" },
  { text: "Human Anatomy", emoji: "🫀" },
  { text: "Business Strategy", emoji: "📈" },
  { text: "Graphic Design", emoji: "🎯" },
  { text: "Film Making", emoji: "🎬" },
  { text: "Machine Learning", emoji: "🧮" },
  { text: "Ancient Civilizations", emoji: "🏛️" }
];

// Fisher-Yates shuffle algorithm
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

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
              No quiz records yet. Take a quiz to appear on the leaderboard!
            </div>
          )}
        </div>
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
  const [isPaused, setIsPaused] = useState(false);
  const [placeholder, setPlaceholder] = useState('');
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const carouselRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);
  const [shuffledTopics] = useState(() => shuffleArray(TOPIC_SUGGESTIONS));
  const typewriterText = "Enter a quiz topic...";
  const inputRef = useRef(null);

  // Typewriter effect function
  const typeWriter = (text, currentIndex = 0) => {
    if (currentIndex < text.length) {
      setPlaceholder(text.substring(0, currentIndex + 1));
      setTimeout(() => typeWriter(text, currentIndex + 1), 100);
    }
  };

  useEffect(() => {
    setPlaceholder('');
    typeWriter(typewriterText);
  }, []);

  // Check for mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 480);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-scroll functionality
  useEffect(() => {
    if (!carouselRef.current || isMobile) return;

    const scrollContainer = carouselRef.current;
    let scrollInterval;

    const startScrolling = () => {
      scrollInterval = setInterval(() => {
        if (!isPaused && scrollContainer) {
          const maxScroll = scrollContainer.scrollWidth - scrollContainer.clientWidth;
          let newScrollPosition = scrollContainer.scrollLeft + 1;

          if (newScrollPosition >= maxScroll) {
            newScrollPosition = 0;
          }

          scrollContainer.scrollLeft = newScrollPosition;
        }
      }, 30);
    };

    startScrolling();

    return () => {
      if (scrollInterval) {
        clearInterval(scrollInterval);
      }
    };
  }, [isPaused, isMobile]);

  const handleApiKeyChange = (e) => {
    const newApiKey = e.target.value;
    setApiKey(newApiKey);
    localStorage.setItem('openai_api_key', newApiKey);
  };

  const handleTopicClick = (selectedTopic) => {
    setTopic(selectedTopic);
    setPlaceholder('');
    typeWriter(typewriterText);
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
            
            <div 
              className="topics-carousel-container"
              onMouseEnter={() => !isMobile && setIsPaused(true)}
              onMouseLeave={() => !isMobile && setIsPaused(false)}
            >
              <div 
                className="topics-carousel" 
                ref={carouselRef}
              >
                {[...shuffledTopics, ...shuffledTopics].map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    className="topic-suggestion-button"
                    onClick={() => handleTopicClick(suggestion.text)}
                    disabled={isLoading}
                  >
                    <span className="topic-emoji">{suggestion.emoji}</span>
                    {suggestion.text}
                  </button>
                ))}
              </div>
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