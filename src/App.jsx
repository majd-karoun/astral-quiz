import React, { useState, useEffect } from 'react';
import { Repeat, CaretRight } from '@phosphor-icons/react';
import TopicInput from './components/topic-input/TopicInput';
import LoadingScreen from './components/loading-screen/LoadingScreen';
import QuestionsCard from './components/questions-card/QuestionsCard';
import GameOverCard from './components/game-over-card/GameOverCard';
import './App.css';


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
  const [isTopicInputExiting, setIsTopicInputExiting] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [points, setPoints] = useState(0);
  const [prevPoints, setPrevPoints] = useState(0);
  const [remainingHints, setRemainingHints] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [usedHints, setUsedHints] = useState(new Set());
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isQuestionsCardExiting, setIsQuestionsCardExiting] = useState(false);
  const [isQuestionsCardEntering, setIsQuestionsCardEntering] = useState(false);
  const [isLoadingMoreQuestions, setIsLoadingMoreQuestions] = useState(false);
  const [questionBatchSize] = useState(15);
  const [veryHardQuestionBatchSize] = useState(5);
  const [loadedVeryHardQuestions, setLoadedVeryHardQuestions] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isShowingAnswers, setIsShowingAnswers] = useState(false);
  const [pointsChanged, setPointsChanged] = useState(false);
  const [abortController, setAbortController] = useState(null);
  const [isGameOverExiting, setIsGameOverExiting] = useState(false);
  
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
                          // Always just append questions sequentially
                          return [...prevQuestions, transformedQuestion];
                        });
                        
                        questionCount++;
                        batchQuestionCount++;
                        
                        // Start the game as soon as we have the first question
                        if (isInitialLoad && !receivedFirstQuestion) {
                          setLoadingProgress(100);
                          setTimeout(() => {
                            setGameStarted(true);
                            setIsQuestionsCardEntering(true);
                            receivedFirstQuestion = true;
                            setIsLoading(false);
                            setIsLoadingMoreQuestions(false);
                            // Remove entering state after animation completes
                            setTimeout(() => setIsQuestionsCardEntering(false), 350);
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
//https://server-cold-hill-2617.fly.dev
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
                          // Always just append questions sequentially
                          return [...prevQuestions, transformedQuestion];
                        });
                        
                        questionCount++;
                        batchQuestionCount++;
                        
                        // Start the game as soon as we have the first question
                        if (isInitialLoad && !receivedFirstQuestion) {
                          setLoadingProgress(100);
                          setTimeout(() => {
                            setGameStarted(true);
                            setIsQuestionsCardEntering(true);
                            receivedFirstQuestion = true;
                            setIsLoading(false);
                            setIsLoadingMoreQuestions(false);
                            // Remove entering state after animation completes
                            setTimeout(() => setIsQuestionsCardEntering(false), 350);
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
        currentQuestion === 9 &&  // Load very hard questions when game starts
        !isLoading && 
        !loadedVeryHardQuestions && 
        !gameOver) {
      setLoadedVeryHardQuestions(true);
      // Generate questions 16-20 (very hard)
      fetchQuestions(null, 15, false, true);
    }

    // Load more very hard questions when needed
    if (gameStarted && 
        currentQuestion >= 15 && 
        !isLoadingMoreQuestions && 
        !isLoading && 
        !gameOver) {
      // Generate questions 21-25 (very hard)
      fetchQuestions(null, 20, false, true);
    }
  }, [gameStarted, isLoading, currentQuestion, gameOver, loadedVeryHardQuestions]);

  // Check if we need to load more questions (when we're 5 questions away from the end)
  useEffect(() => {
    if (gameStarted && 
        currentQuestion + 5 >= questions.length && 
        !isLoadingMoreQuestions && 
        !isLoading && 
        !gameOver) {
      const nextStart = Math.floor((currentQuestion + 1) / 5) * 5 + 15;
      fetchQuestions(null, nextStart, false, true);
    }
  }, [currentQuestion, gameStarted, isLoading, isLoadingMoreQuestions, gameOver, loadedVeryHardQuestions]);

  const handleAnswer = async (selectedOption) => {
    if (isTransitioning || isShowingAnswers) return;
    
    const correctAnswer = questions[currentQuestion].correctAnswerIndex;
    const questionPoints = getPointsForQuestion(currentQuestion + 1);
    
    setSelectedAnswer(selectedOption);
    setIsShowingAnswers(true);

    if (selectedOption === correctAnswer) {
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
        const moveToNextQuestion = async () => {
          setIsTransitioning(true);
          
          // Wait for exit animation to complete (400ms transition + buffer)
          setTimeout(() => {
            setCurrentQuestion(prev => prev + 1);
            setFeedback(null);
            setSelectedAnswer(null);
            setIsShowingAnswers(false);
            
            // Reset transition state after content changes
            setTimeout(() => {
              setIsTransitioning(false);
            }, 50);
          }, 450);
        };
        moveToNextQuestion();
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
    setIsLoadingMoreQuestions(false);
  };

  // Check if we need to load more questions
  useEffect(() => {
    // Load very hard questions when the player reaches question 10
    if (gameStarted && 
        currentQuestion === 9 &&  // Load very hard questions when game starts
        !isLoading && 
        !loadedVeryHardQuestions && 
        !gameOver) {
      setLoadedVeryHardQuestions(true);
      // Generate questions 16-20 (very hard)
      fetchQuestions(null, 15, false, true);
    }
  }, [currentQuestion, gameStarted, isLoading, loadedVeryHardQuestions, gameOver]);

  const startNewGame = async () => {
    setIsGameOverExiting(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setCurrentQuestion(0);
    setPoints(0);
    setPrevPoints(0);
    setRemainingHints(3);
    setUsedHints(new Set());
    setGameOver(false);
    setGameStarted(false);
    setQuestions([]);
    setFeedback(null);
    setLoadedVeryHardQuestions(false);
    setSelectedAnswer(null);
    setIsShowingAnswers(false);
    setPointsChanged(false);
    setIsTopicInputExiting(false);
    setIsGameOverExiting(false);
  };

    // Retry the current game with new questions
    const retryGame = async () => {
    setIsGameOverExiting(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setCurrentQuestion(0);
    setPoints(0);
    setPrevPoints(0);
    setRemainingHints(3);
    setUsedHints(new Set());
    setGameOver(false);
    setQuestions([]);
    setFeedback(null);
    setLoadedVeryHardQuestions(false);
    setSelectedAnswer(null);
    setIsShowingAnswers(false);
    setPointsChanged(false);
    setIsGameOverExiting(false);
    
    // Generate new questions for the same topic with the selected model
    const selectedModel = sessionStorage.getItem('selected_model') || 'gpt-4o-mini';
    await fetchQuestions(null, 0, true, false, selectedModel);
  };

  const handleApiKeyChange = (e) => {
    const newKey = e.target.value;
    setApiKey(newKey);
    // Save to both storages when changed
    localStorage.setItem('openai_api_key', newKey);
    sessionStorage.setItem('openai_api_key', newKey);
  };


  const generateQuestions = async (apiKey, model) => {
    // Set exiting state and wait for animation to complete
    setIsTopicInputExiting(true);
    await new Promise(resolve => setTimeout(resolve, 350)); // Match this with CSS animation duration
    
    // Reset state and fetch questions
    setIsTopicInputExiting(false);
    await fetchQuestions(apiKey, 0, true, false, model);
  };

  return (
    <div className="app-wrapper">
      <div className="container">
        {!gameStarted && !isLoading && !gameOver && !isTopicInputExiting && !isGameOverExiting && (
          <TopicInput
            topic={topic}
            setTopic={setTopic}
            generateQuestions={generateQuestions}
            isLoading={isLoading}
            error={error}
            hasApiKey={!!apiKey}
          />
        )}

        {isLoading && !isGameOverExiting && <LoadingScreen progress={loadingProgress} />}

        {gameStarted && !isLoading && !gameOver && questions[currentQuestion] && !questions[currentQuestion].isPlaceholder && (
          <QuestionsCard
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
            isExiting={isQuestionsCardExiting}
            isEntering={isQuestionsCardEntering}
          />
        )}

        {gameOver && (
          <div className="game-over-container">
            <GameOverCard
              points={points}
              onRetry={retryGame}
              onNewGame={startNewGame}
              isExiting={isGameOverExiting}
            />
          </div>
        )}

      </div>
    </div>
  );
}

export default App;
