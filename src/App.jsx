import React, { useState, useEffect } from 'react';
import { Repeat, CaretRight } from '@phosphor-icons/react';
import TopicInput from './components/topic-input/TopicInput';
import LoadingScreen from './components/loading-screen/LoadingScreen';
import QuestionsCard from './components/questions-card/QuestionsCard';
import GameOverCard from './components/game-over-card/GameOverCard';
import { apiKeyEncryption } from './utils/encryption';
import './App.css';


function App() {
  const [topic, setTopic] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isLoadingApiKey, setIsLoadingApiKey] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [isTopicInputExiting, setIsTopicInputExiting] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [points, setPoints] = useState(0);
  const [prevPoints, setPrevPoints] = useState(0);
  const [remainingHints, setRemainingHints] = useState(6);
  const [remainingDeleteOptions, setRemainingDeleteOptions] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [usedHints, setUsedHints] = useState(new Set());
  const [usedDeleteOptions, setUsedDeleteOptions] = useState(new Set());
  const [hiddenOptions, setHiddenOptions] = useState(new Set());
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
  const [correctAnswers, setCorrectAnswers] = useState([]);
  
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


  //https://server-cold-hill-2617.fly.dev

  const fetchImagesForQuestion = async (question) => {
    try {
      const response = await fetch('https://server-cold-hill-2617.fly.dev/api/search-images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          questionTitle: question.questionTitle
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch images');
      }

      const data = await response.json();
      return { ...question, images: data.images || [] };
    } catch (error) {
      console.error('Error fetching images for question:', error);
      return { ...question, images: [] };
    }
  };

  const saveQuizToHistory = async () => {
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
    
    // Get the current topic from the input field to ensure we have the latest value
    const topicFromInput = document.getElementById('topic')?.value || topic;
    if (!topicFromInput.trim()) {
      setError('Please enter a topic');
      return;
    }

    // Determine which API key to use
    const apiKeyFromInput = document.getElementById('apiKey')?.value;
    let keyToUse;
    
    if (apiKeyFromInput && apiKeyFromInput.trim()) {
      setApiKey(apiKeyFromInput);
      // Encrypt and store the API key
      apiKeyEncryption.encrypt(apiKeyFromInput).then(encryptedKey => {
        localStorage.setItem('openai_api_key', encryptedKey);
        sessionStorage.setItem('openai_api_key', encryptedKey);
      }).catch(error => {
        console.error('Failed to encrypt API key:', error);
        // Fallback to plain storage if encryption fails
        localStorage.setItem('openai_api_key', apiKeyFromInput);
        sessionStorage.setItem('openai_api_key', apiKeyFromInput);
      });
      keyToUse = apiKeyFromInput.trim();
    } else {
      keyToUse = providedApiKey || apiKey;
    }
    
    // Validate that we have an API key
    if (!keyToUse || !keyToUse.trim()) {
      setError('API key is required. Please enter your OpenAI API key.');
      setIsLoading(false);
      setIsLoadingMoreQuestions(false);
      return;
    }
    
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
    // https://server-cold-hill-2617.fly.dev
    // http://localhost:8080
    try {
      const batchSize = isVeryHardMode ? veryHardQuestionBatchSize : questionBatchSize;
      const selectedLanguage = sessionStorage.getItem('language') || 'English';
      
      const response = await fetch(`https://server-cold-hill-2617.fly.dev/api/generate-questions`, {
        method: 'POST',
        mode: 'cors',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${keyToUse}`,
          'Connection': 'keep-alive',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({ 
          topic: topicFromInput, 
          startIndex, 
          batchSize,
          isVeryHardMode,
          model,
          language: selectedLanguage
        }),
        signal: controller.signal,
        keepalive: true
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
      let connectionEstablished = false;
      
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
          
          // Mark connection as established on first chunk
          if (!connectionEstablished) {
            connectionEstablished = true;
            console.log('Connection established, first chunk received');
          }
          
          // Update loading progress based on chunks for the first question
          if (isInitialLoad && !receivedFirstQuestion) {
            const progressValue = Math.min(chunkCount * 15, 90);
            setLoadingProgress(progressValue);
          }
          
          buffer += chunk;
          
          // Only try to parse when we have substantial content
          if (buffer.length < 30) continue;
          
          // Look for complete question objects - server now sends individual JSON objects
          let searchStart = 0;
          while (true) {
            const questionStart = buffer.indexOf('"mainQuestion"', searchStart);
            if (questionStart === -1) break;
            
            // Find the opening brace before mainQuestion
            let braceStart = questionStart;
            while (braceStart > 0 && buffer[braceStart] !== '{') {
              braceStart--;
            }
            
            // Find the matching closing brace
            let braceEnd = braceStart;
            let braceCount = 0;
            let inString = false;
            let escapeNext = false;
            
            for (let i = braceStart; i < buffer.length; i++) {
              const char = buffer[i];
              
              if (escapeNext) {
                escapeNext = false;
                continue;
              }
              
              if (char === '\\') {
                escapeNext = true;
                continue;
              }
              
              if (char === '"') {
                inString = !inString;
                continue;
              }
              
              if (!inString) {
                if (char === '{') braceCount++;
                else if (char === '}') {
                  braceCount--;
                  if (braceCount === 0) {
                    braceEnd = i + 1;
                    break;
                  }
                }
              }
            }
            
            if (braceCount === 0 && braceEnd > braceStart + 1) {
              const questionJson = buffer.substring(braceStart, braceEnd);
              
              try {
                const questionObj = JSON.parse(questionJson);
                
                // Validate and process immediately
                if (questionObj.mainQuestion && 
                    Array.isArray(questionObj.answerOptions) && 
                    questionObj.answerOptions.length === 4 &&
                    typeof questionObj.correctAnswerIndex === 'number' &&
                    questionObj.helpfulHint &&
                    questionObj.questionTitle) {
                  
                  console.log(`Question ${startIndex + questionCount + 1} received:`, questionObj.mainQuestion);
                  
                  // Check if image search is enabled
                  const imageSearchEnabled = sessionStorage.getItem('image_search');
                  const shouldFetchImages = imageSearchEnabled === null || imageSearchEnabled === 'true';
                  
                  // Fetch images for the question only if enabled
                  if (shouldFetchImages) {
                    fetchImagesForQuestion(questionObj).then(questionWithImages => {
                      // Add question with images immediately
                      setQuestions(prevQuestions => [...prevQuestions, questionWithImages]);
                    }).catch(err => {
                      console.error('Error fetching images:', err);
                      // Add question without images if fetch fails
                      setQuestions(prevQuestions => [...prevQuestions, { ...questionObj, images: [] }]);
                    });
                  } else {
                    // Add question without images when image search is disabled
                    setQuestions(prevQuestions => [...prevQuestions, { ...questionObj, images: [] }]);
                  }
                  
                  questionCount++;
                  batchQuestionCount++;
                  
                  // Start game immediately on first question
                  if (isInitialLoad && !receivedFirstQuestion) {
                    setLoadingProgress(100);
                    setTimeout(() => {
                      setGameStarted(true);
                      setIsQuestionsCardEntering(true);
                      receivedFirstQuestion = true;
                      setIsLoading(false);
                      setIsLoadingMoreQuestions(false);
                      setTimeout(() => setIsQuestionsCardEntering(false), 800);
                    }, 100); // Even faster start
                  } else if (isVeryHardMode && batchQuestionCount >= veryHardQuestionBatchSize) {
                    setIsLoadingMoreQuestions(false);
                  } else if (!isInitialLoad && !isVeryHardMode && !receivedFirstQuestion) {
                    setIsLoadingMoreQuestions(false);
                    receivedFirstQuestion = true;
                  }
                  
                  // Remove processed question from buffer
                  buffer = buffer.substring(0, braceStart) + buffer.substring(braceEnd);
                  searchStart = braceStart;
                } else {
                  searchStart = questionStart + 1;
                }
              } catch (e) {
                searchStart = questionStart + 1;
              }
            } else {
              break; // Wait for more data
            }
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
  };

  // Check if we need to load more questions (when we're 5 questions away from the end)
  useEffect(() => {
    if (gameStarted && 
        questions.length >= 15 && // Only start loading more after initial 15 questions are loaded
        currentQuestion + 5 >= questions.length && 
        !isLoadingMoreQuestions && 
        !isLoading && 
        !gameOver) {
      const nextStart = questions.length;
      fetchQuestions(null, nextStart, false, true);
    }
  }, [currentQuestion, gameStarted, isLoading, isLoadingMoreQuestions, gameOver, questions.length]);

  const handleAnswer = async (selectedOption) => {
    if (isTransitioning || isShowingAnswers) return;
    
    const correctAnswer = questions[currentQuestion].correctAnswerIndex;
    const questionPoints = getPointsForQuestion(currentQuestion + 1);
    
    setSelectedAnswer(selectedOption);
    setIsShowingAnswers(true);

    if (selectedOption === correctAnswer) {
      // Play the sound effect for the correct answer
      scoreUpSound.play();
      
      // Record the correct answer
      const correctAnswerData = {
        question: questions[currentQuestion].mainQuestion,
        correctAnswer: questions[currentQuestion].answerOptions[correctAnswer]
      };
      setCorrectAnswers(prev => [...prev, correctAnswerData]);
      
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
      
      setTimeout(async () => {
        setGameOver(true);
        await saveQuizToHistory();
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

  const useDeleteOptions = () => {
    // Return if conditions are not met
    if (!questions[currentQuestion] || 
        usedDeleteOptions.has(currentQuestion) || 
        remainingDeleteOptions <= 0 ||
        isShowingAnswers) {
      return;
    }

    const correctAnswerIndex = questions[currentQuestion].correctAnswerIndex;
    const wrongOptions = [];
    
    // Find all wrong answer indices
    for (let i = 0; i < 4; i++) {
      if (i !== correctAnswerIndex) {
        wrongOptions.push(i);
      }
    }

    // Randomly select 2 wrong options to hide
    const shuffled = wrongOptions.sort(() => 0.5 - Math.random());
    const optionsToHide = shuffled.slice(0, 2);

    // Create unique keys for hidden options (questionIndex_optionIndex)
    const hiddenKeys = optionsToHide.map(optionIndex => `${currentQuestion}_${optionIndex}`);
    
    setHiddenOptions(prev => {
      const newSet = new Set(prev);
      hiddenKeys.forEach(key => newSet.add(key));
      return newSet;
    });

    setUsedDeleteOptions(prev => {
      const newSet = new Set(prev);
      newSet.add(currentQuestion);
      return newSet;
    });

    setRemainingDeleteOptions(prev => Math.max(0, prev - 1));

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
    setRemainingHints(6);
    setRemainingDeleteOptions(3);
    setUsedHints(new Set());
    setUsedDeleteOptions(new Set());
    setHiddenOptions(new Set());
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
    setCorrectAnswers([]);
  };

    // Retry the current game with new questions
    const retryGame = async () => {
    setIsGameOverExiting(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setCurrentQuestion(0);
    setPoints(0);
    setPrevPoints(0);
    setRemainingHints(6);
    setRemainingDeleteOptions(3);
    setUsedHints(new Set());
    setUsedDeleteOptions(new Set());
    setHiddenOptions(new Set());
    setGameOver(false);
    setQuestions([]);
    setFeedback(null);
    setLoadedVeryHardQuestions(false);
    setSelectedAnswer(null);
    setIsShowingAnswers(false);
    setPointsChanged(false);
    setIsGameOverExiting(false);
    setCorrectAnswers([]);
    
    // Load API key from storage if not in state
    let keyToUse = apiKey;
    if (!keyToUse || !keyToUse.trim()) {
      try {
        const encryptedKey = localStorage.getItem('openai_api_key') || sessionStorage.getItem('openai_api_key');
        if (encryptedKey) {
          keyToUse = await apiKeyEncryption.decrypt(encryptedKey);
          setApiKey(keyToUse);
        }
      } catch (error) {
        console.error('Failed to load API key:', error);
        setError('API key not found. Please start a new game and enter your API key.');
        return;
      }
    }
    
    // Generate new questions for the same topic with the selected model
    const selectedModel = sessionStorage.getItem('selected_model') || 'gpt-4o-mini';
    await fetchQuestions(keyToUse, 0, true, false, selectedModel);
  };

  const handleApiKeyChange = (e) => {
    const newKey = e.target.value;
    setApiKey(newKey);
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
  };


  const generateQuestions = async (apiKey, model) => {
    // Set exiting state and wait for animation to complete
    setIsTopicInputExiting(true);
    await new Promise(resolve => setTimeout(resolve, 700)); // Match this with CSS animation duration
    
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
            remainingDeleteOptions={remainingDeleteOptions}
            question={questions[currentQuestion]}
            onAnswer={handleAnswer}
            onUseHint={useHint}
            onUseDeleteOptions={useDeleteOptions}
            feedback={feedback}
            isHintUsed={usedHints.has(currentQuestion)}
            isDeleteOptionsUsed={usedDeleteOptions.has(currentQuestion)}
            hiddenOptions={hiddenOptions}
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
