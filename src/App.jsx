import React, { useState } from 'react';
import {
  Question,
  Target,
  Lightning,
  Repeat,
  X,
  Check,
  CaretRight,
  Trophy
} from '@phosphor-icons/react';
import TopicInput from './components/topic-input/TopicInput';
import LoadingScreen from './components/LoadingScreen';
import './App.css';

const GameCard = ({ children, show }) => (
  <div className={`card-wrapper ${show ? 'card-visible' : ''}`}>
    <div className="card">
      {children}
    </div>
  </div>
);

const WinnerCard = ({ points, onRetry, onNewGame }) => (
  <div className="result-screen">
    <Trophy size={64} className="result-icon winner" />
    <h2 className="title-large">Congratulations! You Won!</h2>
    <p className="score">Score: {points}</p>
    <div className="button-group">
      <button className="button" onClick={onRetry}>
        <Repeat size={24} />
        Retry
      </button>
      <button className="button button-outline" onClick={onNewGame}>
        <CaretRight size={24} />
        Choose a different topic
      </button>
    </div>
  </div>
);

const GameOverCard = ({ points, onRetry, onNewGame }) => (
  <div className="result-screen">
    <X size={64} className="result-icon game-over" />
    <h2 className="title-large">Game Over!</h2>
    <p className="score">Score: {points}</p>
    <div className="button-group">
      <button className="button" onClick={onRetry}>
        <Repeat size={24} />
        Retry
      </button>
      <button className="button button-outline" onClick={onNewGame}>
        <CaretRight size={24} />
        Choose a different topic
      </button>
    </div>
  </div>
);

const QuestionCard = ({ 
  currentQuestion,
  points,
  remainingHints,
  question,
  onAnswer,
  onUseHint,
  feedback,
  isHintUsed
}) => (
  <>
    <div className="header">
      <span className="header-item">
        <Question size={24} />
        Question {currentQuestion + 1}/15
      </span>
      <span className="header-item">
        <Target size={24} />
        Score: {points}
      </span>
      <span className="header-item">
        <Lightning size={24} />
        Hints: {remainingHints}
      </span>
    </div>
    <div className="question-and-options">
      <div className="question">{question.question}</div>
      <div className="options-grid">
        {question.options.map((option, index) => (
          <button
            key={index}
            onClick={() => onAnswer(index)}
            className="button button-outline"
          >
            {option}
          </button>
        ))}
      </div>
    </div>
    {remainingHints > 0 && (
      <div className="bottom-container">
        <div className="help-options">
          <button 
            onClick={onUseHint} 
            className="button button-outline"
            disabled={isHintUsed}
          >
            <Lightning size={20} />
            Use Hint ({remainingHints})
          </button>
        </div>
        <div className="feedback-container">
          {feedback && (
            <div
              className={`feedback ${
                feedback.type === 'success'
                  ? 'feedback-success'
                  : feedback.type === 'hint'
                  ? 'feedback-hint'
                  : 'feedback-info'
              }`}
            >
              {feedback.type === 'success' ? (
                <Check size={20} />
              ) : feedback.type === 'hint' ? (
                <Lightning size={20} />
              ) : (
                <CaretRight size={20} />
              )}
              {feedback.message}
            </div>
          )}
        </div>
      </div>
    )}
  </>
);

function App() {
  const [topic, setTopic] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [points, setPoints] = useState(0);
  const [remainingHints, setRemainingHints] = useState(5);
  const [gameOver, setGameOver] = useState(false);
  const [showWinner, setShowWinner] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [usedHints, setUsedHints] = useState(new Set());

  const getPointsForQuestion = (index) => {
    if (index < 3) return 50;  // Questions 1-3
    if (index < 5) return 100; // Questions 4-5
    if (index < 10) return 200; // Questions 6-10
    if (index < 13) return 500; // Questions 11-13
    return 1000; // Questions 14-15
  };

  const generateQuestions = async (providedApiKey = null) => {
    if (!topic.trim()) {
      setError('Please enter a topic');
      return;
    }

    if (providedApiKey) {
      setApiKey(providedApiKey);
    }

    const keyToUse = providedApiKey || apiKey;
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3001/api/generate-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${keyToUse}`
        },
        body: JSON.stringify({ topic })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error generating questions');
      }

      if (!data.questions || !Array.isArray(data.questions)) {
        throw new Error('Invalid response format from server');
      }

      const transformedQuestions = data.questions.map((q, index) => ({
        id: index + 1,
        question: q.main_question,
        options: q.answer_options,
        correct: q.correct_answer_index,
        points: getPointsForQuestion(index),
        hint: q.hint
      }));

      setQuestions(transformedQuestions);
      setGameStarted(true);
    } catch (err) {
      console.error('Error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswer = (optionIndex) => {
    const question = questions[currentQuestion];
    const correctAnswer = question.correct;

    if (optionIndex === correctAnswer) {
      setPoints(prev => prev + question.points);
      setFeedback({
        type: 'success',
        message: `Correct! +${question.points} points`
      });
      setTimeout(() => {
        setFeedback(null);
        if (currentQuestion === questions.length - 1) {
          setShowWinner(true);
        } else {
          setCurrentQuestion(prev => prev + 1);
        }
      }, 2000);
    } else {
      setGameOver(true);
    }
  };

  const useHint = () => {
    if (remainingHints > 0 && questions[currentQuestion] && !usedHints.has(currentQuestion)) {
      const currentHint = questions[currentQuestion].hint;
      setFeedback({
        type: 'hint',
        message: currentHint
      });
      setRemainingHints(prev => prev - 1);
      setUsedHints(prev => new Set(prev).add(currentQuestion));
    }
  };

  const retryGame = async () => {
    setIsLoading(true);
    setCurrentQuestion(0);
    setPoints(0);
    setRemainingHints(5);
    setGameOver(false);
    setShowWinner(false);
    setFeedback(null);
    setUsedHints(new Set());
    await generateQuestions();
  };

  const startNewGame = () => {
    setGameStarted(false);
    setCurrentQuestion(0);
    setPoints(0);
    setRemainingHints(5);
    setGameOver(false);
    setShowWinner(false);
    setFeedback(null);
    setUsedHints(new Set());
    setTopic('');
    setQuestions([]);
  };

  return (
    <div className="app-wrapper">
      <div className="container">
        <GameCard show={!gameStarted && !isLoading && !gameOver && !showWinner}>
          {!gameStarted && !isLoading && (
            <TopicInput
              topic={topic}
              setTopic={setTopic}
              generateQuestions={generateQuestions}
              isLoading={isLoading}
              error={error}
              hasApiKey={!!apiKey}
            />
          )}
        </GameCard>

        <GameCard show={isLoading}>
          {isLoading && <LoadingScreen />}
        </GameCard>

        <GameCard show={gameStarted && !isLoading && !gameOver && !showWinner}>
          {gameStarted && !isLoading && questions[currentQuestion] && (
            <QuestionCard
              currentQuestion={currentQuestion}
              points={points}
              remainingHints={remainingHints}
              question={questions[currentQuestion]}
              onAnswer={handleAnswer}
              onUseHint={useHint}
              feedback={feedback}
              isHintUsed={usedHints.has(currentQuestion)}
            />
          )}
        </GameCard>

        <GameCard show={gameOver}>
          {gameOver && (
            <GameOverCard
              points={points}
              onRetry={retryGame}
              onNewGame={startNewGame}
            />
          )}
        </GameCard>

        <GameCard show={showWinner}>
          {showWinner && (
            <WinnerCard
              points={points}
              onRetry={retryGame}
              onNewGame={startNewGame}
            />
          )}
        </GameCard>
      </div>
    </div>
  );
}

export default App;