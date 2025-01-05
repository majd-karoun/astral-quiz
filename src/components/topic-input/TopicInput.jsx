import React, { useState, useRef, useEffect } from 'react';
import { Books, CaretRight } from '@phosphor-icons/react';
import './TopicInput.css';

const TOPIC_SUGGESTIONS = [
  // Original topics
  { text: "Spanish Vocabulary", emoji: "🇪🇸" },
  { text: "Time Management", emoji: "⏰" },
  { text: "Python Coding", emoji: "💻" },
  { text: "Ui/UX Design", emoji: "🧩" },
  { text: "Creative Writing", emoji: "✍️" },
  { text: "Prompt Engineering", emoji: "🦾" },
  { text: "Cybersecurity Fundamentals", emoji: "🔒" },
  { text: "Environmental Science", emoji: "🌍" },
  { text: "Digital Marketing", emoji: "🛒" },
  { text: "Cloud Computing and AWS Basics", emoji: "☁️" },
  { text: "Public Speaking", emoji: "🎤" },
  { text: "Interior Design", emoji: "🎨" },
  { text: "E-Commerce Development", emoji: "🛒" },
  { text: "Blockchain Technology", emoji: "🔗" },
  { text: "Italian Cooking", emoji: "🍝" },
  { text: "Web Development", emoji: "💻" },
  { text: "Introduction to Psychology", emoji: "🧠" },
  { text: "Japanese Culture", emoji: "🎌" },
  { text: "Data Science Basics", emoji: "📊" },
  { text: "Photography Tips", emoji: "📸" },
  { text: "Mindfullness", emoji: "🧘" },
  { text: "Music Theory", emoji: "🎵" },
  { text: "World History", emoji: "📚" },
  { text: "Astronomy Basics", emoji: "🌌" },
  { text: "French Language", emoji: "🇫🇷" },
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
  const carouselRef = useRef(null);
  const [shuffledTopics] = useState(() => shuffleArray(TOPIC_SUGGESTIONS));

  // Handle API key changes
  const handleApiKeyChange = (e) => {
    const newApiKey = e.target.value;
    setApiKey(newApiKey);
    localStorage.setItem('openai_api_key', newApiKey);
  };

  // Auto-scroll functionality
  useEffect(() => {
    if (!carouselRef.current) return;

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
  }, [isPaused]);

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
      </div>

      <form onSubmit={handleSubmit} className="input-form">
        <div className="input-sections">
          {/* Topic Input Section */}
          <div className="input-section">
            <label htmlFor="topic">Quiz Topic</label>
            <div className="input-container">
              <input
                id="topic"
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Choose a topic to..."
                className="topic-input"
                disabled={isLoading}
              />
            </div>
            
            {/* Auto-scrolling Topic Suggestions */}
            <div 
              className="topics-carousel-container"
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
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
                    onClick={() => setTopic(suggestion.text)}
                    disabled={isLoading}
                  >
                    <span className="topic-emoji">{suggestion.emoji}</span>
                    {suggestion.text}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* API Key Section */}
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
    </div>
  );
};

export default TopicInput;