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

function App() {
  const [topic, setTopic] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [points, setPoints] = useState(0);
  const [remainingHints, setRemainingHints] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [showWinner, setShowWinner] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const getPointsForQuestion = (index) => {
    if (index < 2) return 50; // First two questions
    if (index === 2) return 100; // Third question
    if (index === 3) return 200; // Fourth question
    return 500; // Fifth question
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
        hint: q.hint || `Hint ${index + 1}: Consider the relationships between answer options.`
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
    if (remainingHints > 0 && questions[currentQuestion]) {
      const currentHint = questions[currentQuestion].hint;
      if (currentHint && currentHint !== 'No hints available') {
        setFeedback({
          type: 'hint',
          message: currentHint
        });
        setRemainingHints(prev => prev - 1);
      } else {
        setFeedback({
          type: 'hint',
          message: 'Consider how the answer options relate to each other.'
        });
        setRemainingHints(prev => prev - 1);
      }
    }
  };

  const retryGame = async () => {
    setIsLoading(true);
    setCurrentQuestion(0);
    setPoints(0);
    setRemainingHints(3);
    setGameOver(false);
    setShowWinner(false);
    setFeedback(null);
    await generateQuestions();
  };

  const startNewGame = () => {
    setGameStarted(false);
    setCurrentQuestion(0);
    setPoints(0);
    setRemainingHints(3);
    setGameOver(false);
    setShowWinner(false);
    setFeedback(null);
    setTopic('');
    setQuestions([]);
  };

  if (showWinner) {
    return (
      <div className="container">
        <div className="card">
          <div className="result-screen">
            <Trophy size={64} weight="fill" className="result-icon winner" />
            <h2 className="title-large">Congratulations! You Won!</h2>
            <p className="score">Score: {points}</p>
            <div className="button-group">
              <button
                className="button"
                onClick={retryGame}
              >
                <Repeat size={24} />
                Retry
              </button>
              <button
                className="button button-outline"
                onClick={startNewGame}
              >
                <CaretRight size={24} />
                Choose a different topic
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (gameOver) {
    return (
      <div className="container">
        <div className="card">
          <div className="result-screen">
            <X size={64} weight="fill" className="result-icon game-over" />
            <h2 className="title-large">Game Over!</h2>
            <p className="score">Score: {points}</p>
            <div className="button-group">
              <button
                className="button"
                onClick={retryGame}
              >
                <Repeat size={24} />
                Retry
              </button>
              <button
                className="button button-outline"
                onClick={startNewGame}
              >
                <CaretRight size={24} />
                Choose a different topic
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        {isLoading ? (
          <LoadingScreen />
        ) : !gameStarted ? (
          <TopicInput
            topic={topic}
            setTopic={setTopic}
            generateQuestions={generateQuestions}
            isLoading={isLoading}
            error={error}
            hasApiKey={!!apiKey}
          />
        ) : (
          <>
            <div className="header">
              <span className="header-item">
                <Question size={24} weight="duotone" />
                Question {currentQuestion + 1}/5
              </span>
              <span className="header-item">
                <Target size={24} weight="duotone" />
                Score: {points}
              </span>
              <span className="header-item">
                <Lightning size={24} weight="duotone" />
                Hints: {remainingHints}
              </span>
            </div>
            {questions[currentQuestion] && (
              <>
                <div className="question-and-options">
                  <div className="question">
                    {questions[currentQuestion].question}
                  </div>
                  <div className="options-grid">
                    {questions[currentQuestion].options.map((option, index) => (
                      <button
                        key={index}
                        onClick={() => handleAnswer(index)}
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
                        onClick={useHint}
                        className="button button-outline"
                      >
                        <Lightning size={20} weight="duotone" />
                        Use Hint ({remainingHints})
                      </button>
                    </div>
                    <div className="feedback-container">
                      {feedback && (
                        <div className={`feedback ${
                          feedback.type === 'success' ? 'feedback-success' :
                          feedback.type === 'hint' ? 'feedback-hint' :
                          'feedback-info'
                        }`}>
                          {feedback.type === 'success' ? <Check size={20} /> :
                          feedback.type === 'hint' ? <Lightning size={20} /> :
                          <CaretRight size={20} />}
                          {feedback.message}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default App;