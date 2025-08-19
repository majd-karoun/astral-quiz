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
    <h2 className="title-large">Congratulations! You won!</h2>
    <p className="score">Score: {points}</p>
    <div className="button-group">
      <button className="button" onClick={onRetry}>
        <Repeat size={24} />
        Try again
      </button>
      <button className="button button-outline" onClick={onNewGame}>
        <CaretRight size={24} />
        New Topic
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
        Try again
      </button>
      <button className="button button-outline" onClick={onNewGame}>
        <CaretRight size={24} />
        New Topic
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
  const [apiKey, setApiKey] = useState(() => {
    // First check localStorage, then sessionStorage
    return localStorage.getItem('openai_api_key') || sessionStorage.getItem('openai_api_key') || '';
  });
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
  const [questionBatchSize] = useState(15);
  const [veryHardQuestionBatchSize] = useState(5);
  const [loadedVeryHardQuestions, setLoadedVeryHardQuestions] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isShowingAnswers, setIsShowingAnswers] = useState(false);
  const [pointsChanged, setPointsChanged] = useState(false);
  const [abortController, setAbortController] = useState(null);
  
  // Create audio elements for sound effects
  const scoreUpSound = new Audio('/sounds/score-up.mp3');
  const gameOverSound = new Audio('/sounds/game-over.mp3');

  const getPointsForQuestion = (questionNumber) => {
    if (questionNumber <= 3) return 50;  // Questions 1-3
    if (questionNumber <= 5) return 100; // Questions 4-5
    if (questionNumber <= 10) return 200; // Questions 6-10
    if (questionNumber <= 13) return 500; // Questions 11-13
    return 1000; // Questions 14+ (including all very hard questions)
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
    
    // Convert back to an array and add the new quiz
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

  const fetchQuestions = async (providedApiKey = null, startIndex = 0, isInitialLoad = false, isVeryHardMode = false, model = 'gpt-4o-mini') => {
    console.log('Fetching questions with model:', model);
    if (!topic.trim()) {
      setError('Please enter a topic');
      return;
    }

    // First check if there's an API key in the input field
    const apiKeyFromInput = document.getElementById('apiKey')?.value;
    if (apiKeyFromInput) {
      setApiKey(apiKeyFromInput);
      // Always save to localStorage for persistence
      localStorage.setItem('openai_api_key', apiKeyFromInput);
      // Also save to sessionStorage for the current session
      sessionStorage.setItem('openai_api_key', apiKeyFromInput);
      const keyToUse = apiKeyFromInput;
      
      if (isInitialLoad) {
        setLoadingProgress(0);
        setIsLoading(true);
      } else {
        setIsLoadingMoreQuestions(true);
      }
      setError(null);

      // Create a new AbortController instance
      const controller = new AbortController();
      setAbortController(controller);

      try {
        const batchSize = isVeryHardMode ? veryHardQuestionBatchSize : questionBatchSize;

        const response = await fetch(`https://server-cold-hill-2617.fly.dev/api/generate-questions`, {
          method: 'POST',
          mode: 'cors',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${keyToUse}`
          },
          body: JSON.stringify({ 
            topic, 
            startIndex, 
            batchSize,
            isVeryHardMode,
            model
          }),
          signal: controller.signal
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error generating questions');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        let buffer = '';
        let chunkCount = 0;
        let receivedFirstQuestion = false;
        let questionCount = 0;
        
        // For the initial load, we set a higher target (15 questions)
        const targetQuestionCount = isVeryHardMode ? veryHardQuestionBatchSize : (isInitialLoad ? questionBatchSize : 3);
        
        // Create a separate counter just for this batch
        let batchQuestionCount = 0;
        
        const processStreamChunk = async () => {
          while (true) {
            const { value, done } = await reader.read();
            if (done) {
              break;
            }
            
            const chunk = decoder.decode(value, { stream: true });
            chunkCount++;
            
            // Update loading progress based on chunks for the first question
            if (isInitialLoad && !receivedFirstQuestion) {
              // For the initial load, we scale based on chunks until we receive the first question
              const progressValue = Math.min(chunkCount * 10, 90);
              setLoadingProgress(progressValue);
            }
            
            buffer += chunk;
            
            // Try to extract complete questions
            try {
              if (buffer.includes('"mainQuestion"') && buffer.includes('"correctAnswerIndex"')) {
                const questionMatches = buffer.match(/{[^{]*"mainQuestion"[^{]*"correctAnswerIndex"[^{}]*}/g);
                
                if (questionMatches && questionMatches.length > 0) {
                  for (const match of questionMatches) {
                    try {
                      const questionObj = JSON.parse(match);
                      
                      // Validate the question object structure
                      if (questionObj.mainQuestion && 
                          Array.isArray(questionObj.answerOptions) && 
                          questionObj.answerOptions.length === 4 &&
                          typeof questionObj.correctAnswerIndex === 'number' &&
                          questionObj.helpfulHint) {
                        
                        // Transform and add the question to our state
                        const transformedQuestion = {
                          mainQuestion: questionObj.mainQuestion,
                          answerOptions: questionObj.answerOptions,
                          correctAnswerIndex: questionObj.correctAnswerIndex,
                          helpfulHint: questionObj.helpfulHint
                        };
                        
                        // Log the received question
                        console.log(`Question ${startIndex + questionCount + 1} received:`, questionObj.mainQuestion);
                        
                        // Add this question to our questions array
                        setQuestions(prevQuestions => {
                          // If this is a very hard question batch (startIndex > 0), make sure we have enough space
                          if (isVeryHardMode && startIndex > 0) {
                            // Make sure we have enough space for this question
                            const newQuestions = [...prevQuestions];
                            // If we need to add at an index beyond the current length, fill with placeholders
                            while (newQuestions.length <= startIndex + questionCount) {
                              newQuestions.push(null);
                            }
                            // Place the question at the exact position
                            newQuestions[startIndex + questionCount] = transformedQuestion;
                            return newQuestions;
                          }
                          // Otherwise, just add
                          return [...prevQuestions, transformedQuestion];
                        });
                        
                        questionCount++;
                        batchQuestionCount++;
                        
                        // Start the game as soon as we have the first question
                        if (isInitialLoad && !receivedFirstQuestion) {
                          setLoadingProgress(100);
                          setTimeout(() => {
                            setGameStarted(true);
                            receivedFirstQuestion = true;
                            setIsLoading(false);
                            setIsLoadingMoreQuestions(false);
                          }, 500);
                        } else if (isVeryHardMode && batchQuestionCount >= veryHardQuestionBatchSize) {
                          // For very hard mode, we are done after receiving all requested questions
                          setIsLoadingMoreQuestions(false);
                        } else if (!isInitialLoad && !isVeryHardMode && !receivedFirstQuestion) {
                          // For other question batches
                          setIsLoadingMoreQuestions(false);
                          receivedFirstQuestion = true;
                        }
                        
                        // Remove the processed question from the buffer
                        buffer = buffer.replace(match, '');
                      }
                    } catch (e) {
                      // Skip invalid JSON fragments
                    }
                  }
                }
              }
            } catch (e) {
              // Skip parsing errors
            }
          }
        };
        
        await processStreamChunk();
      } catch (err) {
        console.error('Error:', err);
        
        // Don't reset the game if this is an AbortError (when the user answered incorrectly)
        if (err.name === 'AbortError') {
          setIsLoading(false);
          setIsLoadingMoreQuestions(false);
          return;
        }
        
        setError(err.message);
        if (err.message.includes('API key')) {
          sessionStorage.removeItem('openai_api_key');
          localStorage.removeItem('openai_api_key');
          setApiKey('');
        }
        resetGame();
      } finally {
        setIsLoading(false);
        setIsLoadingMoreQuestions(false);
        setLoadingProgress(0);
      }
    } else {
      // If no key in input, fall back to storage
      const keyToUse = providedApiKey || apiKey;
      
      if (isInitialLoad) {
        setLoadingProgress(0);
        setIsLoading(true);
      } else {
        setIsLoadingMoreQuestions(true);
      }
      setError(null);

      // Create a new AbortController instance
      const controller = new AbortController();
      setAbortController(controller);

      try {
        const batchSize = isVeryHardMode ? veryHardQuestionBatchSize : questionBatchSize;
        const response = await fetch(`https://server-cold-hill-2617.fly.dev/api/generate-questions`, {
          method: 'POST',
          mode: 'cors',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${keyToUse}`
          },
          body: JSON.stringify({ 
            topic, 
            startIndex, 
            batchSize,
            isVeryHardMode,
            model
          }),
          signal: controller.signal
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error generating questions');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        let buffer = '';
        let chunkCount = 0;
        let receivedFirstQuestion = false;
        let questionCount = 0;
        
        // For the initial load, we set a higher target (15 questions)
        const targetQuestionCount = isVeryHardMode ? veryHardQuestionBatchSize : (isInitialLoad ? questionBatchSize : 3);
        
        // Create a separate counter just for this batch
        let batchQuestionCount = 0;
        
        const processStreamChunk = async () => {
          while (true) {
            const { value, done } = await reader.read();
            if (done) {
              break;
            }
            
            const chunk = decoder.decode(value, { stream: true });
            chunkCount++;
            
            // Update loading progress based on chunks for the first question
            if (isInitialLoad && !receivedFirstQuestion) {
              // For the initial load, we scale based on chunks until we receive the first question
              const progressValue = Math.min(chunkCount * 10, 90);
              setLoadingProgress(progressValue);
            }
            
            buffer += chunk;
            
            // Try to extract complete questions
            try {
              if (buffer.includes('"mainQuestion"') && buffer.includes('"correctAnswerIndex"')) {
                const questionMatches = buffer.match(/{[^{]*"mainQuestion"[^{]*"correctAnswerIndex"[^{}]*}/g);
                
                if (questionMatches && questionMatches.length > 0) {
                  for (const match of questionMatches) {
                    try {
                      const questionObj = JSON.parse(match);
                      
                      // Validate the question object structure
                      if (questionObj.mainQuestion && 
                          Array.isArray(questionObj.answerOptions) && 
                          questionObj.answerOptions.length === 4 &&
                          typeof questionObj.correctAnswerIndex === 'number' &&
                          questionObj.helpfulHint) {
                        
                        // Transform and add the question to our state
                        const transformedQuestion = {
                          mainQuestion: questionObj.mainQuestion,
                          answerOptions: questionObj.answerOptions,
                          correctAnswerIndex: questionObj.correctAnswerIndex,
                          helpfulHint: questionObj.helpfulHint
                        };
                        
                        // Log the received question
                        console.log(`Question ${startIndex + questionCount + 1} received:`, questionObj.mainQuestion);
                        
                        // Add this question to our questions array
                        setQuestions(prevQuestions => {
                          // If this is a very hard question batch (startIndex > 0), make sure we have enough space
                          if (isVeryHardMode && startIndex > 0) {
                            // Make sure we have enough space for this question
                            const newQuestions = [...prevQuestions];
                            // If we need to add at an index beyond the current length, fill with placeholders
                            while (newQuestions.length <= startIndex + questionCount) {
                              newQuestions.push(null);
                            }
                            // Place the question at the exact position
                            newQuestions[startIndex + questionCount] = transformedQuestion;
                            return newQuestions;
                          }
                          // Otherwise, just add
                          return [...prevQuestions, transformedQuestion];
                        });
                        
                        questionCount++;
                        batchQuestionCount++;
                        
                        // Start the game as soon as we have the first question
                        if (isInitialLoad && !receivedFirstQuestion) {
                          setLoadingProgress(100);
                          setTimeout(() => {
                            setGameStarted(true);
                            receivedFirstQuestion = true;
                            setIsLoading(false);
                            setIsLoadingMoreQuestions(false);
                          }, 500);
                        } else if (isVeryHardMode && batchQuestionCount >= veryHardQuestionBatchSize) {
                          // For very hard mode, we are done after receiving all requested questions
                          setIsLoadingMoreQuestions(false);
                        } else if (!isInitialLoad && !isVeryHardMode && !receivedFirstQuestion) {
                          // For other question batches
                          setIsLoadingMoreQuestions(false);
                          receivedFirstQuestion = true;
                        }
                        
                        // Remove the processed question from the buffer
                        buffer = buffer.replace(match, '');
                      }
                    } catch (e) {
                      // Skip invalid JSON fragments
                    }
                  }
                }
              }
            } catch (e) {
              // Skip parsing errors
            }
          }
        };
        
        await processStreamChunk();
      } catch (err) {
        console.error('Error:', err);
        
        // Don't reset the game if this is an AbortError (when the user answered incorrectly)
        if (err.name === 'AbortError') {
          setIsLoading(false);
          setIsLoadingMoreQuestions(false);
          return;
        }
        
        setError(err.message);
        if (err.message.includes('API key')) {
          sessionStorage.removeItem('openai_api_key');
          localStorage.removeItem('openai_api_key');
          setApiKey('');
        }
        resetGame();
      } finally {
        setIsLoading(false);
        setIsLoadingMoreQuestions(false);
        setLoadingProgress(0);
      }
    }
  };

  // Check if we need to load more questions
  useEffect(() => {
    // Load very hard questions when the player reaches question 10
    if (gameStarted && 
        currentQuestion === 9 && // Just answered question 10
        !isLoadingMoreQuestions && 
        !isLoading && 
        !loadedVeryHardQuestions && 
        !gameOver && 
        !showWinner) {
      setLoadedVeryHardQuestions(true);
      // Generate questions 16-20 (very hard)
      fetchQuestions(null, 15, false, true);
    }
    
    // If the player reaches question 15, load 5 more very hard questions
    if (gameStarted && 
        currentQuestion === 14 && // Just answered question 15
        !isLoadingMoreQuestions && 
        !isLoading && 
        !gameOver && 
        !showWinner) {
      // Generate questions 21-25 (very hard)
      fetchQuestions(null, 20, false, true);
    }
    
    // Load more very hard question batches every 5 questions after question 15
    if (gameStarted &&
        currentQuestion >= 15 &&
        (currentQuestion - 15) % 5 === 4 &&  // Questions 19, 24, 29, etc. (to prepare for 20, 25, 30)
        !isLoadingMoreQuestions &&
        !isLoading &&
        !gameOver &&
        !showWinner) {
      const nextStart = Math.floor((currentQuestion + 1) / 5) * 5 + 15;
      fetchQuestions(null, nextStart, false, true);
    }
  }, [currentQuestion, gameStarted, isLoading, isLoadingMoreQuestions, gameOver, showWinner, loadedVeryHardQuestions]);

  const handleAnswer = async (optionIndex) => {
    const correctAnswer = questions[currentQuestion].correctAnswerIndex;
    const questionNumber = currentQuestion + 1; // Convert index to question number
    const questionPoints = getPointsForQuestion(questionNumber);

    setSelectedAnswer(optionIndex);
    setIsShowingAnswers(true);

    if (optionIndex === correctAnswer) {
      // Play the sound effect for the correct answer
      scoreUpSound.play();
      
      setPrevPoints(points);
      setPoints(prev => {
        const newPoints = prev + questionPoints;
        setPointsChanged(true);
        setTimeout(() => setPointsChanged(false), 300);
        return newPoints;
      });
      setFeedback({
        type: 'success',
        message: 'Correct answer! You received ' + questionPoints + ' points!'
      });
            
      setTimeout(() => {
        // In endless mode, we never reach the "end" of the questions
        // We just keep going as long as the player answers correctly
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
      // Play the sound effect for the incorrect answer
      gameOverSound.play();
      
      // Cancel any ongoing requests
      if (abortController) {
        try {
          abortController.abort();
        } catch (e) {
          console.error("Error canceling request:", e);
        }
        setAbortController(null);
      }
      
      // Make sure the loading states are reset
      setIsLoading(false);
      setIsLoadingMoreQuestions(false);
      
      setFeedback({
        type: 'error',
        message: 'Wrong answer!'
      });
      
      setTimeout(() => {
        setGameOver(true);
        saveQuizToHistory();
      }, 2000);
    }
  };

  const useHint = () => {
    // Return if conditions are not met
    if (!questions[currentQuestion] || 
        usedHints.has(currentQuestion) || 
        remainingHints <= 0) {
      return;
    }
  
    const currentHint = questions[currentQuestion].helpfulHint;
    
    // Set feedback first
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
    
    // Then, update hint states
    setUsedHints(prev => {
      const newSet = new Set(prev);
      newSet.add(currentQuestion);
      return newSet;
    });
    
    setRemainingHints(prev => Math.max(0, prev - 1));
  };
  const resetGame = () => {
    // Cancel any ongoing requests
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
    
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
    const currentTopic = topic; // Save the current topic
    setIsLoading(true);
    resetGame();
    setTopic(currentTopic); // Restore the topic before fetching
    await fetchQuestions(null, 0, true);
  };

  const startNewGame = () => {
    resetGame();
    setTopic('');
  };

  const handleApiKeyChange = (e) => {
    const newKey = e.target.value;
    setApiKey(newKey);
    // Save to both storages when changed
    localStorage.setItem('openai_api_key', newKey);
    sessionStorage.setItem('openai_api_key', newKey);
  };

  useEffect(() => {
    // If the current question is null or a placeholder, try to move to the next one
    if (gameStarted && 
        questions.length > currentQuestion && 
        (!questions[currentQuestion] || questions[currentQuestion].isPlaceholder)) {
      // Try to move to the next question
      setCurrentQuestion(prev => prev + 1);
    }
  }, [currentQuestion, questions, gameStarted]);

  return (
    <div className="app-wrapper">
      <div className="container">
        <GameCard show={!gameStarted && !isLoading && !gameOver && !showWinner}>
          {!gameStarted && !isLoading && (
            <TopicInput
              topic={topic}
              setTopic={setTopic}
              generateQuestions={(apiKey, model) => fetchQuestions(apiKey, 0, true, false, model)}
              isLoading={isLoading}
              error={error}
              hasApiKey={!!apiKey}
            />
          )}
        </GameCard>

        {isLoading && <LoadingScreen progress={loadingProgress} />}

        <GameCard show={gameStarted && !isLoading && !gameOver && !showWinner}>
          {gameStarted && !isLoading && questions[currentQuestion] && !questions[currentQuestion].isPlaceholder && (
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
