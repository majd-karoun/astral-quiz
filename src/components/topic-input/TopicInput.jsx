import React, { useState, useRef, useEffect } from 'react';
import { Books, CaretRight } from '@phosphor-icons/react';
import './TopicInput.css';

const TOPIC_SUGGESTIONS = [
  { text: "Spanish Grammar", emoji: "🇪🇸" },
  { text: "Time Management", emoji: "⏰" },
  { text: "Python Coding", emoji: "💻" },
  { text: "UI/UX Design", emoji: "🧩" },
  { text: "Digital Photography", emoji: "📸" },
  { text: "Meditation", emoji: "🧘" },
  { text: "Garden Planning", emoji: "🌱" },
  { text: "Financial Planning", emoji: "💰" },
  { text: "Guitar Basics", emoji: "🎸" },
  { text: "French Vocabulary", emoji: "🇫🇷" },
  { text: "Yoga for Beginners", emoji: "🧘‍♀️" },
  { text: "Public Speaking", emoji: "🎤" },
  { text: "Creative Writing", emoji: "✍️" },
  { text: "Interior Design", emoji: "🎨" },
  { text: "Basic Car Maintenance", emoji: "🚗" },
  { text: "Dog Training", emoji: "🐕" },
  { text: "Italian Cooking", emoji: "🍝" },
  { text: "Watercolor Painting", emoji: "🎨" },
  { text: "Web Development", emoji: "💻" },
  { text: "Mental Health", emoji: "🧠" }
];

const TopicInput = ({ topic, setTopic, generateQuestions, isLoading, error, hasApiKey }) => {
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyError, setApiKeyError] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const carouselRef = useRef(null);

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

          // Reset to beginning when reaching the end
          if (newScrollPosition >= maxScroll) {
            newScrollPosition = 0;
          }

          scrollContainer.scrollLeft = newScrollPosition;
        }
      }, 30); // Adjust speed by changing this value (higher = slower)
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
                placeholder="Choose a topic to practice..."
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
                {/* Duplicate topics for seamless scrolling */}
                {[...TOPIC_SUGGESTIONS, ...TOPIC_SUGGESTIONS].map((suggestion, index) => (
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
                  {showApiKey ? 'Hide' : 'Show'}
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