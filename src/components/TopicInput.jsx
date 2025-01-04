import React from 'react';
import { Books, CaretRight, Spinner } from '@phosphor-icons/react';

function TopicInput({ 
  topic, 
  setTopic, 
  generateQuestions, 
  isLoading, 
  error 
}) {
  return (
    <div className="topic-screen">
      <Books size={64} weight="duotone" className="topic-icon" />
      <h2 className="text-2xl font-semibold mb-6">Wähle ein Thema für dein Quiz</h2>
      
      <div className="flex flex-col gap-4">
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="z.B. JavaScript, Geschichte, Wissenschaft..."
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base transition-all focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50 disabled:cursor-not-allowed"
          disabled={isLoading}
        />
        
        <button 
          className="w-full px-5 py-3 bg-blue-500 text-white rounded-xl font-medium transition-all hover:bg-blue-600 hover:-translate-y-0.5 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
          onClick={generateQuestions}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Spinner size={24} className="spinner" />
              <span>Generiere Fragen...</span>
            </>
          ) : (
            <>
              <CaretRight size={24} />
              <span>Quiz starten</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <p className="mt-4 text-red-500">{error}</p>
      )}
    </div>
  );
}

export default TopicInput;