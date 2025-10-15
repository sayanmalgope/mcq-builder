import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import Quiz from './components/Quiz';
import Results from './components/Results';
import Settings from './components/Settings';
import TopicSelection from './components/TopicSelection';
import './App.css';

function App() {
  const [currentQuiz, setCurrentQuiz] = useState(null);
  const [pdfAnalysis, setPdfAnalysis] = useState(null);
  const [quizResults, setQuizResults] = useState(null);

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route 
            path="/" 
            element={
              <Home 
                setPdfAnalysis={setPdfAnalysis}
                pdfAnalysis={pdfAnalysis}
              />
            } 
          />
          <Route 
            path="/topics" 
            element={
              <TopicSelection 
                pdfAnalysis={pdfAnalysis}
                setCurrentQuiz={setCurrentQuiz}
              />
            } 
          />
          <Route 
            path="/quiz" 
            element={
              <Quiz 
                currentQuiz={currentQuiz}
                setQuizResults={setQuizResults}
              />
            } 
          />
          <Route 
            path="/results" 
            element={
              <Results 
                quizResults={quizResults}
                currentQuiz={currentQuiz}
              />
            } 
          />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
