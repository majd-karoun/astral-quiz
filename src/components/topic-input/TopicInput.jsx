import React, { useState, useRef, useEffect } from 'react';
import { Howl } from 'howler';
import { CaretRight, Trophy, X, Clock, Key, Gear, Lock, Info } from '@phosphor-icons/react';
import { apiKeyEncryption } from '../../utils/encryption';
import BookIcon from '../BookIcon';
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
        .slice(0, 100); // Limit to top 100 entries.
      
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

  const handleTopicClick = (topic) => {
    onSelectTopic(topic);
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
        <div className="leaderboard-list animate-modal-list">
          {leaderboard.length > 0 ? (
            leaderboard.map((entry, index) => {
              return (
                <div key={entry.timestamp} className="leaderboard-item animate-leaderboard-item" style={{'--item-index': index}} onClick={() => handleTopicClick(entry.topic)}>
                  <div className="leaderboard-rank">#{index + 1}</div>
                  <div className="leaderboard-info">
                    <span className="leaderboard-topic">{entry.topic}</span>
                    <span className="leaderboard-date">
                      {new Date(entry.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="leaderboard-actions">
                    <div className="leaderboard-score">
                      <Trophy size={16} />
                      <span>{entry.score}</span>
                    </div>
                  </div>
                </div>
              );
            })
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
  const [apiKey, setApiKey] = useState('');
  const [isLoadingApiKey, setIsLoadingApiKey] = useState(true);
  const [apiKeyError, setApiKeyError] = useState('');
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [placeholder, setPlaceholder] = useState('');
  const [selectedModel, setSelectedModel] = useState(() => {
    // Use sessionStorage to persist model selection during session but not across refreshes
    const storedModel = sessionStorage.getItem('selected_model');
    const validModels = ['gpt-4o-mini', 'gpt-5-mini'];
    
    // If stored model is invalid or old (like 'gpt-4'), reset to default
    if (!storedModel || !validModels.includes(storedModel)) {
      sessionStorage.setItem('selected_model', 'gpt-4o-mini');
      return 'gpt-4o-mini';
    }
    
    return storedModel;
  });
  const [imageSearch, setImageSearch] = useState(() => {
    const stored = sessionStorage.getItem('image_search');
    return stored === null ? true : stored === 'true';
  });
  const [language, setLanguage] = useState(() => {
    return sessionStorage.getItem('language') || 'English';
  });
  const [showSettings, setShowSettings] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSettingsClosing, setIsSettingsClosing] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [mainColor, setMainColor] = useState(localStorage.getItem('mainColor') || '#5050AA');
  const [isApiKeyExpanded, setIsApiKeyExpanded] = useState(false);
  const [cardAnimationComplete, setCardAnimationComplete] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [isApiKeyAnimating, setIsApiKeyAnimating] = useState(false);
  const [hasApiKeyError, setHasApiKeyError] = useState(false);
  const inputRef = useRef(null);
  const formRef = useRef(null);
  const cardRef = useRef(null);
  const apiKeyRef = useRef(null);
  const autoCloseTimeoutRef = useRef(null);

  // Set main color on component mount
  useEffect(() => {
    document.documentElement.style.setProperty('--main-color', mainColor);
  }, []);

  // Load and decrypt API key on component mount
  useEffect(() => {
    const loadApiKey = async () => {
      try {
        const encryptedKey = localStorage.getItem('openai_api_key') || sessionStorage.getItem('openai_api_key') || '';
        if (encryptedKey) {
          const decryptedKey = await apiKeyEncryption.decrypt(encryptedKey);
          setApiKey(decryptedKey);
        }
      } catch (error) {
        console.error('Failed to decrypt API key:', error);
        // Clear potentially corrupted key
        localStorage.removeItem('openai_api_key');
        sessionStorage.removeItem('openai_api_key');
      } finally {
        setIsLoadingApiKey(false);
      }
    };
    loadApiKey();
  }, []);

  useEffect(() => {
    const placeholderText = 'Enter a quiz topic here...(e.g., AI or fun facts)';
    let letterIndex = 0;
    let currentText = '';

    const typeWriter = () => {
      if (letterIndex < placeholderText.length) {
        currentText += placeholderText.charAt(letterIndex);
        setPlaceholder(currentText);
        letterIndex++;
        setTimeout(typeWriter, 50);
      }
      // No else block means it won't loop
    };

    // Start the animation just once
    typeWriter();
    
    // Cleanup function
    return () => {
      clearTimeout();
    };
  }, []);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
    
    // Mark card animation as complete after the scaleIn animation duration (0.8s)
    const cardAnimationTimer = setTimeout(() => {
      setCardAnimationComplete(true);
    }, 800);
    
    return () => clearTimeout(cardAnimationTimer);
  }, []);

  // Separate useEffect to handle API key expansion after loading is complete
  useEffect(() => {
    if (cardAnimationComplete && !isLoadingApiKey && (!apiKey || apiKey.trim() === '')) {
      setIsApiKeyExpanded(true);
      setHasUserInteracted(true);
    }
  }, [cardAnimationComplete, isLoadingApiKey, apiKey]);

  // Auto-expand API key section when there's an "Incorrect API Key" error
  useEffect(() => {
    if (error && error.includes('Incorrect API Key')) {
      setIsApiKeyExpanded(true);
      setHasUserInteracted(true);
      setHasApiKeyError(true);
      // Focus the API key input after a short delay
      setTimeout(() => {
        if (apiKeyRef.current) {
          apiKeyRef.current.focus();
        }
      }, 100);
    }
  }, [error]);

  const handleApiKeyChange = (e) => {
    const newKey = e.target.value;
    setApiKey(newKey);
    
    // Reset API key error state when user changes the key
    if (hasApiKeyError) {
      setHasApiKeyError(false);
    }
    
    // Encrypt and save to both storages when changed
    if (newKey.trim()) {
      apiKeyEncryption.encrypt(newKey).then(encryptedKey => {
        localStorage.setItem('openai_api_key', encryptedKey);
        sessionStorage.setItem('openai_api_key', encryptedKey);
      }).catch(error => {
        console.error('Failed to encrypt API key:', error);
        // Fallback to plain storage if encryption fails
        localStorage.setItem('openai_api_key', newKey);
        sessionStorage.setItem('openai_api_key', newKey);
      });
    } else {
      // Clear storage if key is empty
      localStorage.removeItem('openai_api_key');
      sessionStorage.removeItem('openai_api_key');
    }
    
    setApiKeyError('');
    setHasUserInteracted(true);
    
    // Reset auto-close timer when typing/deleting
    clearTimeout(autoCloseTimeoutRef.current);
    
    // Only start auto-close timer if input is not focused and there's no API key error
    if (newKey.trim() && document.activeElement !== apiKeyRef.current && !hasApiKeyError) {
      startAutoCloseTimer();
    }
    
    // Don't auto-collapse while user is typing or deleting
    // We'll let the blur handler handle the auto-close
  };

  const startAutoCloseTimer = () => {
    // Don't start auto-close timer during initial card animation (first 1 second)
    const cardAnimationDelay = 1000;
    
    autoCloseTimeoutRef.current = setTimeout(() => {
      setIsApiKeyExpanded(false);
    }, 3000 + cardAnimationDelay);
  };

  const clearAutoCloseTimer = () => {
    clearTimeout(autoCloseTimeoutRef.current);
  };

  const handleApiKeyFocus = () => {
    clearAutoCloseTimer();
  };

  const handleApiKeyBlur = () => {
    // Only start auto-close timer if input has content and there's no API key error
    if (apiKey.trim() && !hasApiKeyError) {
      startAutoCloseTimer();
    }
  };

  const toggleApiKeySection = (fromClick = false) => {
    if (fromClick || !isApiKeyExpanded) {
      setHasUserInteracted(true);
      setIsApiKeyExpanded(!isApiKeyExpanded);
      if (!isApiKeyExpanded) {
        // Focus the input when expanding
        setTimeout(() => {
          if (apiKeyRef.current) {
            apiKeyRef.current.focus();
          }
        }, 100);
      }
    }
  };

  // Color options - seven colors
  const colorOptions = [
    '#5050AA', // Purple (standard)
    '#b40d0d', // red
    '#F97316', // Orange
    '#3B82F6', // Blue
    '#10B981', // Green
    '#EC4899', // Pink
    '#000000'  // Black
  ];

  // Color change handler
  const handleColorChange = (color) => {
    setMainColor(color);
    localStorage.setItem('mainColor', color);
    document.documentElement.style.setProperty('--main-color', color);
    
  };

  const toggleSettingsMenu = () => {
    if (isSettingsOpen) {
      // Start closing animation
      setIsSettingsClosing(true);
      setTimeout(() => {
        setIsSettingsOpen(false);
        setIsSettingsClosing(false);
      }, 200); // Match animation duration
    } else {
      setIsSettingsOpen(true);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!topic.trim()) {
      return;
    }

    if (!hasApiKey && apiKey.trim()) {
      if (!apiKey.startsWith('sk-')) {
        setApiKeyError('Invalid API key format');
        return;
      }
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
    const currentApiKey = document.getElementById('apiKey')?.value || apiKey;
    generateQuestions(currentApiKey, selectedModel);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (!isLoading && topic.trim()) {
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
        {!isApiKeyExpanded && !isLoadingApiKey && apiKey.trim() && (
          <div className="api-key-icon animate-api-key-icon" onClick={() => toggleApiKeySection(true)}>
            <Key size={20} weight="duotone" />
          </div>
        )}
        <div className="topic-header">
          <BookIcon className="topic-icon animate-books" weight="duotone" />
          <h1 className="animate-title">Astral Quiz</h1>
          <button 
            className="leaderboard-button"
            onClick={() => setIsLeaderboardOpen(true)}
          >
            <Trophy size={20} />
            Leaderboard
          </button>
        </div>

        <form onSubmit={handleSubmit} className="input-form animate-rest" ref={formRef}>
          {error && (
            <div className="error-message-top">
              {error.includes('add credit here') ? (
                <span>
                  Not enough API credit,{' '}
                  <a href="https://platform.openai.com/settings/organization/billing/overview" target="_blank" rel="noopener noreferrer">
                    add credit here
                  </a>
                </span>
              ) : (
                error
              )}
            </div>
          )}
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

                <button
                  type="button"
                  className={`settings-icon-button ${isSettingsOpen ? 'open' : ''}`}
                  onClick={toggleSettingsMenu}
                  disabled={isLoading}
                >
                  <Gear size={20} weight="fill" />
                </button>
              </div>

              {/* Collapsible Settings Menu */}
              {isSettingsOpen && (
                <div className={`settings-dropdown ${isSettingsClosing ? 'closing' : ''}`}>
                {/* Model Selection */}
                <div className="menu-row">
                  <label className="menu-label">model :</label>
                  <div className="model-buttons-inline">
                    <button
                      type="button"
                      className={`model-button-small ${selectedModel === 'gpt-4o-mini' ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedModel('gpt-4o-mini');
                        sessionStorage.setItem('selected_model', 'gpt-4o-mini');
                      }}
                      disabled={isLoading}
                    >
                      gpt 4 <span className="model-speed">(faster)</span>
                    </button>
                    <button
                      type="button"
                      className={`model-button-small ${selectedModel === 'gpt-5-mini' ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedModel('gpt-5-mini');
                        sessionStorage.setItem('selected_model', 'gpt-5-mini');
                      }}
                      disabled={isLoading}
                    >
                      gpt 5 <span className="model-speed">(smarter)</span>
                    </button>
                  </div>
                </div>

                {/* Language Selection */}
                <div className="menu-row">
                  <label className="menu-label">language :</label>
                  <select
                    value={language}
                    onChange={(e) => {
                      setLanguage(e.target.value);
                      sessionStorage.setItem('language', e.target.value);
                    }}
                    className="language-select"
                    disabled={isLoading}
                  >
                    <option value="English">English (English)</option>


<option value="中文">中文 (Chinese)</option>
<option value="हिन्दी">हिन्दी (Hindi)</option>
<option value="Español">Español (Spanish)</option>
<option value="العربية" dir="rtl">العربية (Arabic) </option>
<option value="Français">Français (French)</option>
<option value="বাংলা">বাংলা (Bengali)</option>
<option value="Português">Português (Portuguese)</option>
<option value="Русский">Русский (Russian)</option>
<option value="اردو" dir="rtl">اردو (Urdu)</option>
<option value="Bahasa Indonesia">Bahasa Indonesia (Indonesian)</option>
<option value="Deutsch">Deutsch (German)</option>
<option value="日本語">日本語 (Japanese)</option>
<option value="Nigerian Pidgin">Nigerian Pidgin (English Creole)</option>
<option value="ਪੰਜਾਬੀ">ਪੰਜਾਬੀ (Punjabi)</option>
<option value="한국어">한국어 (Korean)</option>
<option value="Basa Jawa">ꦧꦱꦗꦮ (Javanese)</option>
<option value="తెలుగు">తెలుగు (Telugu)</option>
<option value="Kiswahili">Kiswahili (Swahili)</option>
<option value="தமிழ்">தமிழ் (Tamil)</option>
<option value="فارسی" dir="rtl">فارسی (Persian / Farsi)</option>
<option value="मराठी">मराठी (Marathi)</option>
<option value="Türkçe">Türkçe (Turkish)</option>
<option value="Tiếng Việt">Tiếng Việt (Vietnamese)</option>
<option value="Tagalog">Tagalog (Filipino)</option>
<option value="Italiano">Italiano (Italian)</option>
<option value="ไทย">ไทย (Thai)</option>
<option value="ગુજરાતી">ગુજરાતી (Gujarati)</option>
<option value="Polski">Polski (Polish)</option>
<option value="Bahasa Melayu">Bahasa Melayu (Malay)</option>
<option value="Yorùbá">Yorùbá (Yoruba)</option>
<option value="Українська">Українська (Ukrainian)</option>
<option value="മലയാളം">മലയാളം (Malayalam)</option>
<option value="Oʻzbekcha">Oʻzbekcha (Uzbek)</option>
<option value="Română">Română (Romanian)</option>
<option value="Қазақ тілі">Қазақ тілі (Kazakh)</option>
<option value="Nederlands">Nederlands (Dutch)</option>
<option value="Ελληνικά">Ελληνικά (Greek)</option>
<option value="Català">Català (Catalan)</option>
<option value="Svenska">Svenska (Swedish)</option>
<option value="Čeština">Čeština (Czech)</option>
<option value="Magyar">Magyar (Hungarian)</option>
<option value="Български">Български (Bulgarian)</option>
<option value="עברית" dir="rtl">עברית (Hebrew)</option>
<option value="Suomi">Suomi (Finnish)</option>
<option value="Dansk">Dansk (Danish)</option>
<option value="Norsk">Norsk (Norwegian)</option>


                  </select>
                </div>

                {/* Image Search Toggle */}
                <div className="menu-row">
                  <label className="menu-label">images search:</label>
                  <div className="toggle-buttons">
                    <button
                      type="button"
                      className={`toggle-button ${imageSearch ? 'active' : ''}`}
                      onClick={() => {
                        setImageSearch(true);
                        sessionStorage.setItem('image_search', 'true');
                      }}
                      disabled={isLoading}
                    >
                      on
                    </button>
                    <button
                      type="button"
                      className={`toggle-button ${!imageSearch ? 'active' : ''}`}
                      onClick={() => {
                        setImageSearch(false);
                        sessionStorage.setItem('image_search', 'false');
                      }}
                      disabled={isLoading}
                    >
                      off
                    </button>
                  </div>
                </div>

                {/* Color Swatches */}
                <div className="menu-row">
                  <label className="menu-label">app color:</label>
                  <div className="color-swatch-container">
                    <div className="color-swatches">
                      {colorOptions.map((color) => (
                        <button
                          key={color}
                          className={`color-swatch ${mainColor === color ? 'active' : ''}`}
                          style={{ backgroundColor: color }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleColorChange(color);
                          }}
                          disabled={isLoading}
                          aria-label={`Select ${color} theme`}
                          title={color.toUpperCase()}
                        >
                          {mainColor === color && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M20 6L9 17L4 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              )}
            </div>

            {(isApiKeyExpanded || (!apiKey.trim() && cardAnimationComplete)) && (
              <div className={`input-section ${!isApiKeyExpanded ? 'api-key-hidden' : (isApiKeyExpanded && cardAnimationComplete && (hasUserInteracted || apiKey.trim()) ? 'api-key-visible' : '')}`}>
                <label htmlFor="apiKey">
                  OpenAI API Key
                  <a 
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="api-key-link"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Get API Key
                  </a>
                </label>
                <div className="input-container">
                  <input
                    ref={apiKeyRef}
                    id="apiKey"
                    type="password"
                    autoComplete="new-password"
                    value={apiKey}
                    onChange={handleApiKeyChange}
                    onFocus={handleApiKeyFocus}
                    onBlur={handleApiKeyBlur}
                    placeholder="sk-..."
                    className="topic-input"
                    disabled={isLoading}
                  />
                </div>
                {apiKeyError ? (
                  <p className="error-message">{apiKeyError}</p>
                ) : (
                  <div className="encrypted-sign">
                    <Lock size={12} weight="fill" />
                    <span>API Keys are encrypted</span>
                    <div className="info-tooltip">
                      <Info size={12} weight="fill" />
                      <span className="tooltip-text">Your API key is securely stored in your browser in an encoded format, which cannot be read or copied by other websites. and only used for generating quiz questions.</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <RecentTopics onSelectTopic={setTopic} />

          <button
            type="submit"
            className={`start-button ${!topic.trim() ? 'disabled' : ''}`}
            disabled={isLoading || !topic.trim()}
          >
            <CaretRight className="button-icon" />
            <span>Start Quiz</span>
          </button>

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
