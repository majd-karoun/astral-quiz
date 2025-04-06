import { createContext, useContext, useReducer, useEffect } from 'react';
import { useSound } from '../hooks/useSound';
import { FaFire } from 'react-icons/fa';

const GameContext = createContext();

const gameReducer = (state, action) => {
  switch (action.type) {
    case 'INCREMENT_STREAK':
      const newStreak = state.currentStreak + 1;
      return {
        ...state,
        currentStreak: newStreak,
        highestStreak: Math.max(state.highestStreak, newStreak)
      };
    case 'RESET_STREAK':
      return { ...state, currentStreak: 0 };
    default:
      return state;
  }
};

export const GameProvider = ({ children }) => {
  const [playCorrect] = useSound('/sounds/correct.mp3');
  const [playWin] = useSound('/sounds/win.mp3');
  const [state, dispatch] = useReducer(gameReducer, {
    currentStreak: 0,
    highestStreak: 0
  });

  useEffect(() => {
    if (state.currentStreak > 0) {
      playCorrect();
      if (state.currentStreak >= 5) {
        playWin();
      }
    }
  }, [state.currentStreak, playCorrect, playWin]);

  return (
    <GameContext.Provider value={{ ...state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
