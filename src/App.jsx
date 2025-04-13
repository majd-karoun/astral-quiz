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
    <h2 className="title-large">Glückwunsch! Du hast gewonnen!</h2>
    <p className="score">Punktzahl: {points}</p>
    <div className="button-group">
      <button className="button" onClick={onRetry}>
        <Repeat size={24} />
        Nochmal versuchen
      </button>
      <button className="button button-outline" onClick={onNewGame}>
        <CaretRight size={24} />
        Ein anderes Thema wählen
      </button>
    </div>
  </div>
);

const GameOverCard = ({ points, onRetry, onNewGame }) => (
  <div className="result-screen">
    <X size={64} className="result-icon game-over" />
    <h2 className="title-large">Spiel vorbei!</h2>
    <p className="score">Punktzahl: {points}</p>
    <div className="button-group">
      <button className="button" onClick={onRetry}>
        <Repeat size={24} />
        Nochmal versuchen
      </button>
      <button className="button button-outline" onClick={onNewGame}>
        <CaretRight size={24} />
        Ein anderes Thema wählen
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
        Frage {currentQuestion + 1}
      </span>
      <span className="header-item score">
        <Target size={24} />
        <span className={`score-number ${pointsChanged ? 'changed' : ''}`}>{points}</span>
      </span>
    </div>
    <div className={`question-and-options ${isTransitioning ? 'transitioning' : ''}`}>
      <div className="question">{question.hauptfrage}</div>
      <div className="options-grid">
        {question.antwortoptionen.map((option, index) => {
          const isCorrect = isShowingAnswers && index === question.richtige_antwortnummer;
          const isSelected = isShowingAnswers && index === selectedAnswer;
          const isCorrectAnswer = index === question.richtige_antwortnummer;
          
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
          Hinweis ({remainingHints})
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
  const [apiKey, setApiKey] = useState(() => sessionStorage.getItem('openai_api_key') || localStorage.getItem('openai_api_key') || '');
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
    if (questionNumber <= 3) return 50;  // Fragen 1-3
    if (questionNumber <= 5) return 100; // Fragen 4-5
    if (questionNumber <= 10) return 200; // Fragen 6-10
    if (questionNumber <= 13) return 500; // Fragen 11-13
    return 1000; // Fragen 14+ (einschließlich aller sehr schweren Fragen)
  };

  const saveQuizToHistory = () => {
    const history = JSON.parse(localStorage.getItem('quiz_history') || '[]');
    const newQuiz = {
      topic,
      score: points,
      timestamp: Date.now()
    };
    
    // Gruppieren Sie Einträge nach Thema und behalten Sie nur die höchste Punktzahl für jedes
    const groupedHistory = history.reduce((acc, entry) => {
      if (!acc[entry.topic] || entry.score > acc[entry.topic].score) {
        acc[entry.topic] = entry;
      }
      return acc;
    }, {});
    
    // Konvertieren Sie zurück in ein Array und fügen Sie den neuen Quiz hinzu
    const currentHistory = Object.values(groupedHistory);
    const newHistory = [newQuiz, ...currentHistory];
    
    // Sortieren Sie nach Punktzahl absteigend, dann nach Zeitstempel absteigend
    const sortedHistory = newHistory
      .sort((a, b) => {
        if (a.score !== b.score) return b.score - a.score;
        return b.timestamp - a.timestamp;
      })
      .slice(0, 100);
    
    localStorage.setItem('quiz_history', JSON.stringify(sortedHistory));
  };

  const fetchQuestions = async (providedApiKey = null, startIndex = 0, isInitialLoad = false, isVeryHardMode = false) => {
    if (!topic.trim()) {
      setError('Bitte gib ein Thema ein');
      return;
    }

    // First check if there's an API key in the input field
    const apiKeyFromInput = document.getElementById('apiKey')?.value;
    if (apiKeyFromInput) {
      setApiKey(apiKeyFromInput);
      sessionStorage.setItem('openai_api_key', apiKeyFromInput);
      localStorage.setItem('openai_api_key', apiKeyFromInput);
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
        
        const response = await fetch(`http://localhost:8080/api/generate-questions`, {
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
            isVeryHardMode
          }),
          signal: controller.signal
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Fehler beim Generieren von Fragen');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        let buffer = '';
        let chunkCount = 0;
        let receivedFirstQuestion = false;
        let questionCount = 0;
        
        // Für den initialen Ladevorgang setzen wir ein höheres Ziel (15 Fragen)
        const targetQuestionCount = isVeryHardMode ? veryHardQuestionBatchSize : (isInitialLoad ? questionBatchSize : 3);
        
        // Erstellen Sie einen separaten Zähler nur für diesen Stapel
        let batchQuestionCount = 0;
        
        const processStreamChunk = async () => {
          while (true) {
            const { value, done } = await reader.read();
            if (done) {
              break;
            }
            
            const chunk = decoder.decode(value, { stream: true });
            chunkCount++;
            
            // Aktualisieren Sie den Ladevorgang basierend auf Chunks für die erste Frage
            if (isInitialLoad && !receivedFirstQuestion) {
              // Für den initialen Ladevorgang skalieren wir basierend auf Chunks, bis wir die erste Frage erhalten
              const progressValue = Math.min(chunkCount * 10, 90);
              setLoadingProgress(progressValue);
            }
            
            buffer += chunk;
            
            // Versuchen Sie, vollständige Fragen zu extrahieren
            try {
              if (buffer.includes('"hauptfrage"') && buffer.includes('"richtige_antwortnummer"')) {
                const questionMatches = buffer.match(/{[^{]*"hauptfrage"[^{]*"richtige_antwortnummer"[^{}]*}/g);
                
                if (questionMatches && questionMatches.length > 0) {
                  for (const match of questionMatches) {
                    try {
                      const questionObj = JSON.parse(match);
                      
                      // Validieren Sie die Frageobjektstruktur
                      if (questionObj.hauptfrage && 
                          Array.isArray(questionObj.antwortoptionen) && 
                          questionObj.antwortoptionen.length === 4 &&
                          typeof questionObj.richtige_antwortnummer === 'number' &&
                          questionObj.hilfreicher_hinweis) {
                        
                        // Transformieren und fügen Sie die Frage unserem Zustand hinzu
                        const transformedQuestion = {
                          hauptfrage: questionObj.hauptfrage,
                          antwortoptionen: questionObj.antwortoptionen,
                          richtige_antwortnummer: questionObj.richtige_antwortnummer,
                          hilfreicher_hinweis: questionObj.hilfreicher_hinweis
                        };
                        
                        // Protokollieren Sie die empfangene Frage
                        console.log(`Frage ${startIndex + questionCount + 1} erhalten:`, questionObj.hauptfrage);
                        
                        // Fügen Sie diese Frage unserem Fragenarray hinzu
                        setQuestions(prevQuestions => {
                          // Wenn dies ein sehr schwerer Fragenstapel ist (startIndex > 0), stellen Sie sicher, dass wir genügend Platz haben
                          if (isVeryHardMode && startIndex > 0) {
                            // Stellen Sie sicher, dass wir genügend Platz für diese Frage haben
                            const newQuestions = [...prevQuestions];
                            // Wenn wir an einem Index hinzufügen müssen, der über die aktuelle Länge hinausgeht, füllen Sie mit Platzhaltern
                            while (newQuestions.length <= startIndex + questionCount) {
                              newQuestions.push(null);
                            }
                            // Platzieren Sie die Frage an der genauen Position
                            newQuestions[startIndex + questionCount] = transformedQuestion;
                            return newQuestions;
                          }
                          // Andernfalls fügen Sie einfach hinzu
                          return [...prevQuestions, transformedQuestion];
                        });
                        
                        questionCount++;
                        batchQuestionCount++;
                        
                        // Starten Sie das Spiel, sobald wir die erste Frage haben
                        if (isInitialLoad && !receivedFirstQuestion) {
                          setLoadingProgress(100);
                          setTimeout(() => {
                            setGameStarted(true);
                            receivedFirstQuestion = true;
                            setIsLoading(false);
                            setIsLoadingMoreQuestions(false);
                          }, 500);
                        } else if (isVeryHardMode && batchQuestionCount >= veryHardQuestionBatchSize) {
                          // Für den sehr schweren Modus sind wir fertig, nachdem wir alle angeforderten Fragen erhalten haben
                          setIsLoadingMoreQuestions(false);
                        } else if (!isInitialLoad && !isVeryHardMode && !receivedFirstQuestion) {
                          // Für andere Fragenstapel
                          setIsLoadingMoreQuestions(false);
                          receivedFirstQuestion = true;
                        }
                        
                        // Entfernen Sie die verarbeitete Frage aus dem Puffer
                        buffer = buffer.replace(match, '');
                      }
                    } catch (e) {
                      // Überspringen Sie ungültige JSON-Fragmente
                    }
                  }
                }
              }
            } catch (e) {
              // Überspringen Sie Parsenfehler
            }
          }
        };
        
        await processStreamChunk();
      } catch (err) {
        console.error('Fehler:', err);
        
        // Setzen Sie das Spiel nicht zurück, wenn dies ein AbortError ist (wenn der Benutzer falsch geantwortet hat)
        if (err.name === 'AbortError') {
          setIsLoading(false);
          setIsLoadingMoreQuestions(false);
          return;
        }
        
        setError(err.message);
        if (err.message.includes('API-Schlüssel')) {
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
            isVeryHardMode
          }),
          signal: controller.signal
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Fehler beim Generieren von Fragen');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        let buffer = '';
        let chunkCount = 0;
        let receivedFirstQuestion = false;
        let questionCount = 0;
        
        // Für den initialen Ladevorgang setzen wir ein höheres Ziel (15 Fragen)
        const targetQuestionCount = isVeryHardMode ? veryHardQuestionBatchSize : (isInitialLoad ? questionBatchSize : 3);
        
        // Erstellen Sie einen separaten Zähler nur für diesen Stapel
        let batchQuestionCount = 0;
        
        const processStreamChunk = async () => {
          while (true) {
            const { value, done } = await reader.read();
            if (done) {
              break;
            }
            
            const chunk = decoder.decode(value, { stream: true });
            chunkCount++;
            
            // Aktualisieren Sie den Ladevorgang basierend auf Chunks für die erste Frage
            if (isInitialLoad && !receivedFirstQuestion) {
              // Für den initialen Ladevorgang skalieren wir basierend auf Chunks, bis wir die erste Frage erhalten
              const progressValue = Math.min(chunkCount * 10, 90);
              setLoadingProgress(progressValue);
            }
            
            buffer += chunk;
            
            // Versuchen Sie, vollständige Fragen zu extrahieren
            try {
              if (buffer.includes('"hauptfrage"') && buffer.includes('"richtige_antwortnummer"')) {
                const questionMatches = buffer.match(/{[^{]*"hauptfrage"[^{]*"richtige_antwortnummer"[^{}]*}/g);
                
                if (questionMatches && questionMatches.length > 0) {
                  for (const match of questionMatches) {
                    try {
                      const questionObj = JSON.parse(match);
                      
                      // Validieren Sie die Frageobjektstruktur
                      if (questionObj.hauptfrage && 
                          Array.isArray(questionObj.antwortoptionen) && 
                          questionObj.antwortoptionen.length === 4 &&
                          typeof questionObj.richtige_antwortnummer === 'number' &&
                          questionObj.hilfreicher_hinweis) {
                        
                        // Transformieren und fügen Sie die Frage unserem Zustand hinzu
                        const transformedQuestion = {
                          hauptfrage: questionObj.hauptfrage,
                          antwortoptionen: questionObj.antwortoptionen,
                          richtige_antwortnummer: questionObj.richtige_antwortnummer,
                          hilfreicher_hinweis: questionObj.hilfreicher_hinweis
                        };
                        
                        // Protokollieren Sie die empfangene Frage
                        console.log(`Frage ${startIndex + questionCount + 1} erhalten:`, questionObj.hauptfrage);
                        
                        // Fügen Sie diese Frage unserem Fragenarray hinzu
                        setQuestions(prevQuestions => {
                          // Wenn dies ein sehr schwerer Fragenstapel ist (startIndex > 0), stellen Sie sicher, dass wir genügend Platz haben
                          if (isVeryHardMode && startIndex > 0) {
                            // Stellen Sie sicher, dass wir genügend Platz für diese Frage haben
                            const newQuestions = [...prevQuestions];
                            // Wenn wir an einem Index hinzufügen müssen, der über die aktuelle Länge hinausgeht, füllen Sie mit Platzhaltern
                            while (newQuestions.length <= startIndex + questionCount) {
                              newQuestions.push(null);
                            }
                            // Platzieren Sie die Frage an der genauen Position
                            newQuestions[startIndex + questionCount] = transformedQuestion;
                            return newQuestions;
                          }
                          // Andernfalls fügen Sie einfach hinzu
                          return [...prevQuestions, transformedQuestion];
                        });
                        
                        questionCount++;
                        batchQuestionCount++;
                        
                        // Starten Sie das Spiel, sobald wir die erste Frage haben
                        if (isInitialLoad && !receivedFirstQuestion) {
                          setLoadingProgress(100);
                          setTimeout(() => {
                            setGameStarted(true);
                            receivedFirstQuestion = true;
                            setIsLoading(false);
                            setIsLoadingMoreQuestions(false);
                          }, 500);
                        } else if (isVeryHardMode && batchQuestionCount >= veryHardQuestionBatchSize) {
                          // Für den sehr schweren Modus sind wir fertig, nachdem wir alle angeforderten Fragen erhalten haben
                          setIsLoadingMoreQuestions(false);
                        } else if (!isInitialLoad && !isVeryHardMode && !receivedFirstQuestion) {
                          // Für andere Fragenstapel
                          setIsLoadingMoreQuestions(false);
                          receivedFirstQuestion = true;
                        }
                        
                        // Entfernen Sie die verarbeitete Frage aus dem Puffer
                        buffer = buffer.replace(match, '');
                      }
                    } catch (e) {
                      // Überspringen Sie ungültige JSON-Fragmente
                    }
                  }
                }
              }
            } catch (e) {
              // Überspringen Sie Parsenfehler
            }
          }
        };
        
        await processStreamChunk();
      } catch (err) {
        console.error('Fehler:', err);
        
        // Setzen Sie das Spiel nicht zurück, wenn dies ein AbortError ist (wenn der Benutzer falsch geantwortet hat)
        if (err.name === 'AbortError') {
          setIsLoading(false);
          setIsLoadingMoreQuestions(false);
          return;
        }
        
        setError(err.message);
        if (err.message.includes('API-Schlüssel')) {
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

  // Überprüfen Sie, ob wir weitere Fragen laden müssen
  useEffect(() => {
    // Laden Sie sehr schwere Fragen, wenn der Spieler Frage 10 erreicht
    if (gameStarted && 
        currentQuestion === 9 && // Hat gerade Frage 10 beantwortet
        !isLoadingMoreQuestions && 
        !isLoading && 
        !loadedVeryHardQuestions && 
        !gameOver && 
        !showWinner) {
      setLoadedVeryHardQuestions(true);
      // Generieren Sie Fragen 16-20 (sehr schwer)
      fetchQuestions(null, 15, false, true);
    }
    
    // Wenn der Spieler Frage 15 erreicht, laden Sie 5 weitere sehr schwere Fragen
    if (gameStarted && 
        currentQuestion === 14 && // Hat gerade Frage 15 beantwortet
        !isLoadingMoreQuestions && 
        !isLoading && 
        !gameOver && 
        !showWinner) {
      // Generieren Sie Fragen 21-25 (sehr schwer)
      fetchQuestions(null, 20, false, true);
    }
    
    // Laden Sie weitere sehr schwere Fragenstapel alle 5 Fragen nach Frage 15
    if (gameStarted &&
        currentQuestion >= 15 &&
        (currentQuestion - 15) % 5 === 4 &&  // Fragen 19, 24, 29 usw. (um sich auf 20, 25, 30 vorzubereiten)
        !isLoadingMoreQuestions &&
        !isLoading &&
        !gameOver &&
        !showWinner) {
      const nextStart = Math.floor((currentQuestion + 1) / 5) * 5 + 15;
      fetchQuestions(null, nextStart, false, true);
    }
  }, [currentQuestion, gameStarted, isLoading, isLoadingMoreQuestions, gameOver, showWinner, loadedVeryHardQuestions]);

  const handleAnswer = async (optionIndex) => {
    const correctAnswer = questions[currentQuestion].richtige_antwortnummer;
    const questionNumber = currentQuestion + 1; // Konvertieren Sie den Index in eine Fragezahl
    const questionPoints = getPointsForQuestion(questionNumber);

    setSelectedAnswer(optionIndex);
    setIsShowingAnswers(true);

    if (optionIndex === correctAnswer) {
      // Spielen Sie den Soundeffekt für die richtige Antwort ab
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
        message: `Richtig! +${questionPoints} Punkte`
      });
      
      setTimeout(() => {
        // Im Endlosmodus erreichen wir nie das "Ende" der Fragen
        // Wir machen einfach weiter, solange der Spieler richtig antwortet
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
      // Spielen Sie den Soundeffekt für die falsche Antwort ab
      gameOverSound.play();
      
      // Stornieren Sie alle laufenden Anforderungen
      if (abortController) {
        try {
          abortController.abort();
        } catch (e) {
          console.error("Fehler beim Abbrechen der Anforderung:", e);
        }
        setAbortController(null);
      }
      
      // Stellen Sie sicher, dass die Ladezustände zurückgesetzt werden
      setIsLoading(false);
      setIsLoadingMoreQuestions(false);
      
      setFeedback({
        type: 'error',
        message: 'Falsche Antwort!'
      });
      
      setTimeout(() => {
        setGameOver(true);
        saveQuizToHistory();
      }, 2000);
    }
  };

  const useHint = () => {
    // Gehen Sie zurück, wenn die Bedingungen nicht erfüllt sind
    if (!questions[currentQuestion] || 
        usedHints.has(currentQuestion) || 
        remainingHints <= 0) {
      return;
    }
  
    const currentHint = questions[currentQuestion].hilfreicher_hinweis;
    
    // Setzen Sie das Feedback zuerst
    if (!currentHint || currentHint.trim() === '') {
      setFeedback({
        type: 'hint',
        message: 'Kein Hinweis verfügbar für diese Frage'
      });
    } else {
      setFeedback({
        type: 'hint',
        message: currentHint
      });
    }
    
    // Aktualisieren Sie dann die Hinweiszustände
    setUsedHints(prev => {
      const newSet = new Set(prev);
      newSet.add(currentQuestion);
      return newSet;
    });
    
    setRemainingHints(prev => Math.max(0, prev - 1));
  };
  const resetGame = () => {
    // Stornieren Sie alle laufenden Anforderungen
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
    setIsLoading(true);
    resetGame();
    await fetchQuestions(null, 0, true);
  };

  const startNewGame = () => {
    resetGame();
    setTopic('');
  };

  useEffect(() => {
    // Wenn die aktuelle Frage null oder ein Platzhalter ist, versuchen Sie, zur nächsten zu wechseln
    if (gameStarted && 
        questions.length > currentQuestion && 
        (!questions[currentQuestion] || questions[currentQuestion].isPlaceholder)) {
      // Versuchen Sie, zur nächsten Frage zu wechseln
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
              generateQuestions={() => fetchQuestions(null, 0, true, false)}
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
