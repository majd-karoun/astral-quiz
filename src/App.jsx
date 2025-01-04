import React, { useState } from 'react';
import {
  Question,
  Target,
  Lightning,
  Repeat,
  Scissors,
  Trophy,
  X,
  Check,
  CaretRight
} from '@phosphor-icons/react';
import TopicInput from './components/TopicInput';
import './App.css';

function App() {
  const [topic, setTopic] = useState('');
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [points, setPoints] = useState(0);
  const [helpOptions, setHelpOptions] = useState({
    hint: true,
    changeQuestion: true,
    removeOptions: true
  });
  const [removedOptions, setRemovedOptions] = useState([]);
  const [isAlternateQuestion, setIsAlternateQuestion] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [showWinner, setShowWinner] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const generateQuestions = async () => {
    if (!topic.trim()) {
      setError('Bitte gib ein Thema ein');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3001/api/generate-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic })
      });

      if (!response.ok) {
        throw new Error('Failed to generate questions');
      }

      const data = await response.json();
      
      if (data.questions && Array.isArray(data.questions)) {
        const transformedQuestions = data.questions.map((q, index) => ({
          id: index + 1,
          question: q.main_question,
          options: q.answer_options,
          correct: q.correct_answer_index,
          points: getPointsForQuestion(index),
          alternateQuestion: {
            question: q.alternate_question,
            options: q.answer_options,
            correct: q.correct_answer_index
          },
          hint: q.hint || 'Keine Hinweise verfügbar'
        }));

        setQuestions(transformedQuestions);
        setGameStarted(true);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Fehler beim Generieren der Fragen. Bitte versuche es erneut.');
    } finally {
      setIsLoading(false);
    }
  };

  const getPointsForQuestion = (index) => {
    if (index < 2) return 50;      // First two questions
    if (index === 2) return 100;   // Third question
    if (index === 3) return 200;   // Fourth question
    return 500;                    // Fifth question
  };

  const handleAnswer = (optionIndex) => {
    const question = questions[currentQuestion];
    const correctAnswer = isAlternateQuestion 
      ? question.alternateQuestion.correct 
      : question.correct;

    if (optionIndex === correctAnswer) {
      setPoints(prev => prev + question.points);
      setFeedback({
        type: 'success',
        message: `Richtig! +${question.points} Punkte`
      });
      
      setTimeout(() => {
        setFeedback(null);
        if (currentQuestion === questions.length - 1) {
          setShowWinner(true);
        } else {
          setCurrentQuestion(prev => prev + 1);
          setIsAlternateQuestion(false);
          setRemovedOptions([]);
        }
      }, 2000);
    } else {
      setGameOver(true);
    }
  };

  const useHelpOption = (option) => {
    if (!questions[currentQuestion]) return;

    switch (option) {
      case 'hint':
        setFeedback({
          type: 'hint',
          message: questions[currentQuestion].hint
        });
        setHelpOptions(prev => ({ ...prev, hint: false }));
        break;
      case 'changeQuestion':
        setIsAlternateQuestion(true);
        setHelpOptions(prev => ({ ...prev, changeQuestion: false }));
        setRemovedOptions([]);
        setFeedback({
          type: 'info',
          message: 'Frage wurde geändert'
        });
        setTimeout(() => setFeedback(null), 2000);
        break;
      case 'removeOptions':
        const question = questions[currentQuestion];
        const correct = isAlternateQuestion 
          ? question.alternateQuestion.correct 
          : question.correct;
        let newRemovedOptions = [];
        let count = 0;
        while (count < 2) {
          const randomIndex = Math.floor(Math.random() * 4);
          if (randomIndex !== correct && !newRemovedOptions.includes(randomIndex)) {
            newRemovedOptions.push(randomIndex);
            count++;
          }
        }
        setRemovedOptions(newRemovedOptions);
        setHelpOptions(prev => ({ ...prev, removeOptions: false }));
        setFeedback({
          type: 'info',
          message: 'Zwei falsche Optionen wurden entfernt'
        });
        setTimeout(() => setFeedback(null), 2000);
        break;
    }
  };

  const restartGame = () => {
    setGameStarted(false);
    setCurrentQuestion(0);
    setPoints(0);
    setHelpOptions({ hint: true, changeQuestion: true, removeOptions: true });
    setRemovedOptions([]);
    setIsAlternateQuestion(false);
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
            <h2 className="title-large">Gratulation! Du hast gewonnen!</h2>
            <p className="score">Gesamtpunktzahl: {points}</p>
            <button 
              className="button"
              onClick={restartGame}
            >
              <Repeat size={24} />
              Neues Quiz starten
            </button>
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
            <h2 className="title-large">Spiel vorbei!</h2>
            <p className="score">Erreichte Punktzahl: {points}</p>
            <button 
              className="button"
              onClick={restartGame}
            >
              <Repeat size={24} />
              Neues Quiz starten
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        {!gameStarted ? (
          <TopicInput
            topic={topic}
            setTopic={setTopic}
            generateQuestions={generateQuestions}
            isLoading={isLoading}
            error={error}
          />
        ) : (
          <>
            <div className="header">
              <span className="header-item">
                <Question size={24} weight="duotone" />
                Frage {currentQuestion + 1}/5
              </span>
              <span className="header-item">
                <Target size={24} weight="duotone" />
                Punkte: {points}
              </span>
            </div>
            
            {questions[currentQuestion] && (
              <>
                <div className="question">
                  {isAlternateQuestion 
                    ? questions[currentQuestion].alternateQuestion.question 
                    : questions[currentQuestion].question}
                </div>
                
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

                <div className="options-grid">
                  {(isAlternateQuestion 
                    ? questions[currentQuestion].alternateQuestion.options 
                    : questions[currentQuestion].options
                  )?.map((option, index) => (
                    !removedOptions.includes(index) && (
                      <button 
                        key={index}
                        onClick={() => handleAnswer(index)}
                        className="button button-outline"
                      >
                        <CaretRight size={20} />
                        {option}
                      </button>
                    )
                  ))}
                </div>

                <div className="help-options">
                  {helpOptions.hint && (
                    <button 
                      onClick={() => useHelpOption('hint')}
                      className="button button-outline"
                    >
                      <Lightning size={20} weight="duotone" />
                      Tipp
                    </button>
                  )}
                  {helpOptions.changeQuestion && (
                    <button 
                      onClick={() => useHelpOption('changeQuestion')}
                      className="button button-outline"
                    >
                      <Repeat size={20} weight="duotone" />
                      Frage ändern
                    </button>
                  )}
                  {helpOptions.removeOptions && (
                    <button 
                      onClick={() => useHelpOption('removeOptions')}
                      className="button button-outline"
                    >
                      <Scissors size={20} weight="duotone" />
                      2 Optionen entfernen
                    </button>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default App;