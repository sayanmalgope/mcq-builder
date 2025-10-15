import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import axios from 'axios';

const Quiz = ({ currentQuiz, setQuizResults }) => {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showAnswer, setShowAnswer] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!currentQuiz?.questions?.length) {
      navigate('/');
    }
  }, [currentQuiz, navigate]);

  const handleAnswerSelect = async (questionId, selectedOptionIndex) => {
    if (showAnswer || isSubmitting) return;
    
    setSelectedAnswer(selectedOptionIndex);
    setAnswers(prev => ({ ...prev, [questionId]: selectedOptionIndex }));
    setShowAnswer(true);
    
    // Save wrong answer if incorrect
    const question = currentQuiz.questions.find(q => q.id === questionId);
    if (selectedOptionIndex !== question.correctAnswer) {
      try {
        await axios.post('/api/save-wrong-answer', {
          question: question.question,
          userAnswer: selectedOptionIndex,
          correctAnswer: question.correctAnswer,
          topic: currentQuiz.topic,
          explanation: question.explanation
        });
      } catch (error) {
        console.error('Failed to save wrong answer:', error);
      }
    }
  };

  const handleNext = () => {
    if (currentIndex < currentQuiz.questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setShowAnswer(false);
      setSelectedAnswer(null);
    } else {
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      const prevQuestion = currentQuiz.questions[currentIndex - 1];
      setShowAnswer(!!answers[prevQuestion.id]);
      setSelectedAnswer(answers[prevQuestion.id]);
    }
  };
  
  const handleSubmit = () => {
    const timeTaken = Math.floor((Date.now() - startTime) / 1000); // in seconds
    const results = {
      ...currentQuiz,
      questions: currentQuiz.questions.map(q => ({
        ...q,
        userAnswer: answers[q.id] ?? null,
        isCorrect: answers[q.id] === q.correctAnswer,
      })),
      timeTaken: timeTaken
    };
    setQuizResults(results);
    navigate('/results');
  };

  if (!currentQuiz?.questions?.length) return null;
  const question = currentQuiz.questions[currentIndex];
  const userAnswer = answers[question.id];

  const progress = ((currentIndex + 1) / currentQuiz.questions.length) * 100;
  const answeredQuestions = Object.keys(answers).length;

  return (
    <div className="quiz-page">
      <Navbar />
      <main className="main-content">
        <div className="container">
          {/* Quiz Header */}
          <div className="quiz-header">
            <div className="quiz-info">
              <h1 className="quiz-title">{currentQuiz.topic}</h1>
              <p className="quiz-subtitle">Question {currentIndex + 1} of {currentQuiz.questions.length}</p>
            </div>
            <div className="quiz-stats">
              <div className="stat-item">
                <span className="stat-number">{answeredQuestions}</span>
                <span className="stat-label">Answered</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{Math.floor((Date.now() - startTime) / 1000)}s</span>
                <span className="stat-label">Time</span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="quiz-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <span className="progress-text">{Math.round(progress)}% Complete</span>
          </div>

          {/* Question Card */}
          <div className="question-card">
            <div className="question-header">
              <div className="question-number">Q{currentIndex + 1}</div>
              <div className="question-timer">
                <i className="fas fa-clock"></i>
                <span>{Math.floor((Date.now() - startTime) / 1000)}s</span>
              </div>
            </div>
            
            <div className="question-content">
              <h2 className="question-text">{question.question}</h2>
            </div>

            <div className="options-container">
              {question.options.map((option, index) => {
                let optionClass = 'option-item';
                let optionIcon = '';
                
                if (showAnswer) {
                  if (index === question.correctAnswer) {
                    optionClass += ' correct';
                    optionIcon = 'fas fa-check-circle';
                  } else if (index === userAnswer && index !== question.correctAnswer) {
                    optionClass += ' incorrect';
                    optionIcon = 'fas fa-times-circle';
                  } else {
                    optionClass += ' disabled';
                  }
                } else if (selectedAnswer === index) {
                  optionClass += ' selected';
                }

                return (
                  <div 
                    key={index} 
                    className={optionClass}
                    onClick={() => handleAnswerSelect(question.id, index)}
                  >
                    <div className="option-content">
                      <div className="option-letter">
                        {String.fromCharCode(65 + index)}
                      </div>
                      <div className="option-text">{option}</div>
                      {optionIcon && <i className={`option-icon ${optionIcon}`}></i>}
                    </div>
                  </div>
                );
              })}
            </div>

            {showAnswer && (
              <div className="explanation-card">
                <div className="explanation-header">
                  <i className="fas fa-lightbulb"></i>
                  <h3>Explanation</h3>
                </div>
                <p className="explanation-text">{question.explanation}</p>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="quiz-navigation">
            <button 
              className="nav-btn prev-btn" 
              onClick={handlePrevious} 
              disabled={currentIndex === 0}
            >
              <i className="fas fa-arrow-left"></i>
              Previous
            </button>
            
            <div className="question-indicators">
              {currentQuiz.questions.map((_, index) => (
                <div 
                  key={index}
                  className={`indicator ${index === currentIndex ? 'current' : ''} ${answers[currentQuiz.questions[index].id] !== undefined ? 'answered' : ''}`}
                  onClick={() => {
                    if (index !== currentIndex) {
                      setCurrentIndex(index);
                      setShowAnswer(!!answers[currentQuiz.questions[index].id]);
                      setSelectedAnswer(answers[currentQuiz.questions[index].id]);
                    }
                  }}
                >
                  {index + 1}
                </div>
              ))}
            </div>

            {showAnswer && (
              <button 
                className="nav-btn next-btn" 
                onClick={handleNext}
                disabled={isSubmitting}
              >
                {currentIndex === currentQuiz.questions.length - 1 ? (
                  <>
                    <i className="fas fa-flag-checkered"></i>
                    Finish Quiz
                  </>
                ) : (
                  <>
                    Next
                    <i className="fas fa-arrow-right"></i>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Quiz;