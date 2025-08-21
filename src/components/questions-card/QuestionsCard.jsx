import React from 'react';
import {
  Question,
  Target,
  Lightning,
  Check,
  CaretRight
} from '@phosphor-icons/react';
import './QuestionsCard.css';

const QuestionsCard = ({ 
  currentQuestion,
  points,
  remainingHints,
  question,
  onAnswer,
  onUseHint,
  feedback,
  isHintUsed,
  isTransitioning,
  selectedAnswer,
  isShowingAnswers,
  pointsChanged,
  isExiting,
  isEntering
}) => (
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
      <div className="options-grid">
        {question.answerOptions.map((option, index) => {
          const isCorrect = isShowingAnswers && index === question.correctAnswerIndex;
          const isSelected = isShowingAnswers && index === selectedAnswer;
          
          return (
            <button
              key={index}
              onClick={() => onAnswer(index)}
              className={`button button-outline ${
                isCorrect ? 'correct-answer' : 
                isSelected ? 'wrong-answer' : ''
              }`}
              disabled={isShowingAnswers}
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
          onClick={onUseHint} 
          className="button button-outline"
          disabled={isHintUsed || remainingHints <= 0 || isShowingAnswers}
        >
          <Lightning size={20} />
          Hint ({remainingHints})
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

export default QuestionsCard;
