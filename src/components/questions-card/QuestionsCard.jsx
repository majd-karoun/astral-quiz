import React from 'react';
import {
  Question,
  Target,
  Lightning,
  Check,
  CaretRight
} from '@phosphor-icons/react';
import './QuestionsCard.css';

// 50/50 icon
const DeleteOptionsIcon = ({ size = 20 }) => (
  <svg width={size * 1.2} height={size} viewBox="0 0 32 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <text x="2" y="8" fontSize="12" fontWeight="bold" fill="currentColor">50</text>
    <line x1="6" y1="16" x2="24" y2="4" stroke="currentColor" strokeWidth="2"/>
    <text x="16" y="18" fontSize="12" fontWeight="bold" fill="currentColor">50</text>
  </svg>
);

const QuestionsCard = ({ 
  currentQuestion,
  points,
  remainingHints,
  remainingDeleteOptions,
  question,
  onAnswer,
  onUseHint,
  onUseDeleteOptions,
  feedback,
  isHintUsed,
  isDeleteOptionsUsed,
  hiddenOptions,
  isTransitioning,
  selectedAnswer,
  isShowingAnswers,
  pointsChanged,
  isExiting,
  isEntering
}) => {
  const [hintDecreasing, setHintDecreasing] = React.useState(false);
  const [deleteDecreasing, setDeleteDecreasing] = React.useState(false);
  const [loadedImages, setLoadedImages] = React.useState({});

  // Reset loaded images when question changes
  React.useEffect(() => {
    setLoadedImages({});
  }, [currentQuestion]);

  const handleImageLoad = (index) => {
    setLoadedImages(prev => ({
      ...prev,
      [index]: true
    }));
  };

  const handleUseHint = () => {
    setHintDecreasing(true);
    onUseHint();
    setTimeout(() => setHintDecreasing(false), 600);
  };

  const handleUseDeleteOptions = () => {
    setDeleteDecreasing(true);
    onUseDeleteOptions();
    setTimeout(() => setDeleteDecreasing(false), 600);
  };

  return (
  <div className={`questions-card ${isExiting ? 'exiting' : ''} ${isEntering ? 'entering' : ''}`}>
    <div className="questions-card-content-wrapper">
      <div className="header">
      <span className="header-item">
        <Question size={24} />
        Question {currentQuestion + 1}
      </span>
      <span className="header-item score">
        <Target size={24} />
        Score: <span className={`score-number ${pointsChanged ? 'changed' : ''}`}>{points}</span>
      </span>
    </div>
    <div className={`question-and-options ${isTransitioning ? 'transitioning' : ''}`}>
      <div className="question">{question.mainQuestion}</div>
      {question.images && question.images.length > 0 && (
        <div className="question-images">
          {question.images.map((image, idx) => (
            <div 
              key={idx} 
              className={`image-wrapper ${loadedImages[idx] ? 'loaded' : 'loading'}`}
            >
              <img 
                src={image.url} 
                alt={image.alt} 
                className="question-image"
                loading="lazy"
                onLoad={() => handleImageLoad(idx)}
                onError={(e) => {
                  console.error('Error loading image:', image.url);
                  // Set a fallback background color if image fails to load
                  e.target.style.background = '#f5f5f5';
                }}
              />
            </div>
          ))}
          <div className="image-hint-disclaimer">
            Note: Image hints may be misleading
          </div>
        </div>
      )}
      <div className="options-grid">
        {question.answerOptions.map((option, index) => {
          const isCorrect = isShowingAnswers && index === question.correctAnswerIndex;
          const isSelected = isShowingAnswers && index === selectedAnswer;
          const isHidden = hiddenOptions.has(`${currentQuestion}_${index}`);

          return (
            <button
              key={index}
              onClick={() => onAnswer(index)}
              className={`button button-outline ${
                isCorrect ? 'correct-answer' : 
                isSelected ? 'wrong-answer' : ''
              } ${isHidden ? 'fifty-fifty-disabled' : ''}`}
              disabled={isShowingAnswers || isHidden}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
    <div className="bottom-container">
      <div className="help-options">
        <button 
          onClick={handleUseHint} 
          className={`button button-outline help-button ${hintDecreasing ? 'decreasing' : ''}`}
          disabled={isHintUsed || remainingHints <= 0 || isShowingAnswers}
          style={{ '--progress': `${(remainingHints / 3) * 100}%` }}
        >
          <Lightning size={20} />
          <span>Hint</span>
        </button>
        <button 
          onClick={handleUseDeleteOptions} 
          className={`button button-outline help-button ${deleteDecreasing ? 'decreasing' : ''}`}
          disabled={isDeleteOptionsUsed || remainingDeleteOptions <= 0 || isShowingAnswers}
          style={{ '--progress': `${(remainingDeleteOptions / 3) * 100}%` }}
        >
          <DeleteOptionsIcon size={20} />
          <span> Options</span>
        </button>
      </div>
      <div className="feedback-container">
        {feedback && (
          <div
            key={`${feedback.type}-${feedback.message}`}
            className={`feedback ${
              feedback.type === 'success'
                ? 'feedback-success'
                : feedback.type === 'hint'
                ? 'feedback-hint'
                : feedback.type === 'error'
                ? 'feedback-error'
                : 'feedback-info'
            }`}
          >
            {feedback.type === 'success' ? (
              <Check size={20} />
            ) : feedback.type === 'hint' ? (
              <Lightning size={24} />
            ) : (
              <CaretRight size={20} />
            )}
            {feedback.message}
          </div>
        )}
      </div>
    </div>
    </div>
  </div>
  );
};

export default QuestionsCard;
