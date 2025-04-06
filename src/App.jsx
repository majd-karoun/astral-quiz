import React, { useState, useEffect } from 'react';
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
import LoadingScreen from './components/loading-screen/LoadingScreen';
import './App.css';

const GameCard = ({ children, show }) => (
  <div className={`card-wrapper ${show ? 'card-visible' : 'card-hidden'}`}>
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
  isHintUsed,
  isTransitioning,
  selectedAnswer,
  isShowingAnswers,
  pointsChanged
}) => (
  <>
    <div className="header">
      <span className="header-item">
        <Question size={24} />
        Question {currentQuestion + 1}
      </span>
      <span className="header-item score">
        <Target size={24} />
        <span className={`score-number ${pointsChanged ? 'changed' : ''}`}>{points}</span>
      </span>
    </div>
    <div className={`question-and-options ${isTransitioning ? 'transitioning' : ''}`}>
      <div className="question">{question.question}</div>
      <div className="options-grid">
        {question.options.map((option, index) => {
          const isCorrect = isShowingAnswers && index === question.correct;
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
                : feedback.type === 'error'
                ? 'feedback-error'
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
  </>
);

function App() {
  const [topic, setTopic] = useState('');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('openai_api_key') || '');
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [points, setPoints] = useState(0);
  const [prevPoints, setPrevPoints] = useState(0);
  const [remainingHints, setRemainingHints] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [showWinner, setShowWinner] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [usedHints, setUsedHints] = useState(new Set());
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isLoadingMoreQuestions, setIsLoadingMoreQuestions] = useState(false);
  const [questionBatchSize] = useState(3);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isShowingAnswers, setIsShowingAnswers] = useState(false);
  const [pointsChanged, setPointsChanged] = useState(false);

  const getPointsForQuestion = (questionNumber) => {
    if (questionNumber <= 3) return 50;  // Questions 1-3
    if (questionNumber <= 5) return 100; // Questions 4-5
    if (questionNumber <= 10) return 200; // Questions 6-10
    if (questionNumber <= 13) return 500; // Questions 11-13
    return 1000; // Questions 14-15
  };

  const saveQuizToHistory = () => {
    const history = JSON.parse(localStorage.getItem('quiz_history') || '[]');
    const newQuiz = {
      topic,
      score: points,
      timestamp: Date.now()
    };
    
    // Group entries by topic and keep only the highest score for each
    const groupedHistory = history.reduce((acc, entry) => {
      if (!acc[entry.topic] || entry.score > acc[entry.topic].score) {
        acc[entry.topic] = entry;
      }
      return acc;
    }, {});
    
    // Convert back to array and add new quiz
    const currentHistory = Object.values(groupedHistory);
    const newHistory = [newQuiz, ...currentHistory];
    
    // Sort by score descending, then by timestamp descending
    const sortedHistory = newHistory
      .sort((a, b) => {
        if (a.score !== b.score) return b.score - a.score;
        return b.timestamp - a.timestamp;
      })
      .slice(0, 100);
    
    localStorage.setItem('quiz_history', JSON.stringify(sortedHistory));
  };

  const fetchQuestions = async (providedApiKey = null, startIndex = 0, isInitialLoad = false) => {
    if (!topic.trim()) {
      setError('Please enter a topic');
      return;
    }

    if (providedApiKey) {
      setApiKey(providedApiKey);
      localStorage.setItem('openai_api_key', providedApiKey);
    }

    const keyToUse = providedApiKey || apiKey;
    
    if (isInitialLoad) {
      setLoadingProgress(0);
      setIsLoading(true);
    } else {
      setIsLoadingMoreQuestions(true);
    }
    setError(null);

    try {
      const response = await fetch(`https://astral-quiz.onrender.com/api/generate-questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${keyToUse}`
        },
        body: JSON.stringify({ 
          topic, 
          startIndex, 
          batchSize: questionBatchSize 
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error generating questions');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let receivedFirstQuestion = false;

      console.log("Starting to read stream from server");
      let chunkCount = 0;
      let questionCount = 0;
      
      // Create a function to extract and process individual questions from JSON
      const extractQuestions = (text) => {
        // Look for individual question objects in the buffer
        const regex = /{[^{]*"main_question"[^{]*"correct_answer_index"[^{}]*}/g;
        const matches = text.match(regex);
        
        if (matches && matches.length > 0) {
          for (const match of matches) {
            try {
              // Try to parse the individual question
              const questionObj = JSON.parse(match);
              
              // Validate the question object
              if (questionObj.main_question && 
                  Array.isArray(questionObj.answer_options) && 
                  questionObj.answer_options.length === 4 &&
                  typeof questionObj.correct_answer_index === 'number' &&
                  questionObj.helpful_hint) {
                
                // Transform the question
                const transformedQuestion = {
                  id: questionCount + 1,
                  question: questionObj.main_question,
                  options: questionObj.answer_options,
                  correct: questionObj.correct_answer_index,
                  points: getPointsForQuestion(questionCount + 1),
                  hint: questionObj.helpful_hint
                };
                
                // Add this question to our questions array
                setQuestions(prevQuestions => [...prevQuestions, transformedQuestion]);
                questionCount++;
                
                // Start the game as soon as we have the first question
                if (!receivedFirstQuestion) {
                  console.log("First question received, starting game immediately");
                  setLoadingProgress(100);
                  setTimeout(() => {
                    setGameStarted(true);
                    receivedFirstQuestion = true;
                    setIsLoading(false);
                  setIsLoadingMoreQuestions(false);
                  }, 500);
                }
                
                // Remove the processed question from the buffer to avoid duplicates
                buffer = buffer.replace(match, '');
              }
            } catch (e) {
              // Skip invalid JSON fragments
              console.log("Error parsing question:", e.message);
            }
          }
        }
      };
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          console.log("Stream complete");
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        chunkCount++;
        console.log(`Chunk #${chunkCount} received: ${chunk.length} bytes`);
      // Update loading progress based on chunk count (assuming around 10 chunks for first question)
      setLoadingProgress(Math.min(chunkCount * 10, 90));
        buffer += chunk;
        
        // Try to extract questions from the buffer
        extractQuestions(buffer);
      }
    } catch (err) {
      console.error('Error:', err);
      setError(err.message);
      if (err.message.includes('API key')) {
        localStorage.removeItem('openai_api_key');
        setApiKey('');
      }
      resetGame();
    } finally {
      setIsLoading(false);
      setIsLoadingMoreQuestions(false);
      setLoadingProgress(0);
    }
  };

  // Check if we need to load more questions
  useEffect(() => {
    // If we're approaching the end of our current questions, fetch more
    // Only fetch if we have at least one question and we're not already loading
    if (gameStarted && 
        questions.length > 0 && 
        currentQuestion >= questions.length - 2 && 
        !isLoadingMoreQuestions && 
        !isLoading && 
        !gameOver && 
        !showWinner) {
      fetchQuestions(null, questions.length, false);
    }
  }, [currentQuestion, questions.length, gameStarted]);

  const handleAnswer = async (optionIndex) => {
    const correctAnswer = questions[currentQuestion].correct;
    const questionNumber = currentQuestion + 1; // Convert index to question number
    const questionPoints = getPointsForQuestion(questionNumber);

    setSelectedAnswer(optionIndex);
    setIsShowingAnswers(true);

    if (optionIndex === correctAnswer) {
      setPrevPoints(points);
      setPoints(prev => {
        const newPoints = prev + questionPoints;
        setPointsChanged(true);
        setTimeout(() => setPointsChanged(false), 300);
        return newPoints;
      });
      setFeedback({
        type: 'success',
        message: `Correct! +${questionPoints} points`
      });
      
      setTimeout(() => {
        // In infinite mode, we never reach the "end" of questions
        // We just keep going as long as the player gets answers right
        setIsTransitioning(true);
        setTimeout(() => {
          setCurrentQuestion(prev => prev + 1);
          setFeedback(null);
          setIsTransitioning(false);
          setSelectedAnswer(null);
          setIsShowingAnswers(false);
        }, 500);
      }, 1000);
    } else {
      setFeedback({
        type: 'error',
        message: 'Incorrect answer!'
      });
      
      setTimeout(() => {
        setGameOver(true);
        saveQuizToHistory();
      }, 2000);
    }
  };

  const useHint = () => {
    // Return early if conditions aren't met
    if (!questions[currentQuestion] || 
        usedHints.has(currentQuestion) || 
        remainingHints <= 0) {
      return;
    }
  
    const currentHint = questions[currentQuestion].hint;
    
    // Set the feedback first
    if (!currentHint || currentHint.trim() === '') {
      setFeedback({
        type: 'hint',
        message: 'No hint available for this question'
      });
    } else {
      setFeedback({
        type: 'hint',
        message: currentHint
      });
    }
    
    // Then update the hint states
    setUsedHints(prev => {
      const newSet = new Set(prev);
      newSet.add(currentQuestion);
      return newSet;
    });
    
    setRemainingHints(prev => Math.max(0, prev - 1));
  };
  const resetGame = () => {
    setGameStarted(false);
    setCurrentQuestion(0);
    setPoints(0);
    setRemainingHints(3);
    setGameOver(false);
    setShowWinner(false);
    setFeedback(null);
    setUsedHints(new Set());
    setQuestions([]);
    setSelectedAnswer(null);
    setIsShowingAnswers(false);
    setIsLoadingMoreQuestions(false);
  };

  const retryGame = async () => {
    setIsLoading(true);
    resetGame();
    await fetchQuestions(null, 0, true);
  };

  const startNewGame = () => {
    resetGame();
    setTopic('');
  };

  return (
    <div className="app-wrapper">
      <div className="container">
        <GameCard show={!gameStarted && !isLoading && !gameOver && !showWinner}>
          {!gameStarted && !isLoading && (
            <TopicInput
              topic={topic}
              setTopic={setTopic}
              generateQuestions={() => fetchQuestions(null, 0, true)}
              isLoading={isLoading}
              error={error}
              hasApiKey={!!apiKey}
            />
          )}
        </GameCard>

        {isLoading && <LoadingScreen progress={loadingProgress} />}

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
              isTransitioning={isTransitioning}
              selectedAnswer={selectedAnswer}
              isShowingAnswers={isShowingAnswers}
              pointsChanged={pointsChanged}
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
