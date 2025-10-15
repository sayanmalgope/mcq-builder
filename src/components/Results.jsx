import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import axios from 'axios';

// Enhanced Weak Area Analysis Component
const WeakAreaAnalysis = ({ currentTopic }) => {
  const [weakTopics, setWeakTopics] = useState([]);
  const [serverWrongAnswers, setServerWrongAnswers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWrongAnswers = async () => {
      try {
        const response = await axios.get('/api/wrong-answers');
        setServerWrongAnswers(response.data.wrongAnswers || []);
      } catch (error) {
        console.error('Failed to fetch wrong answers:', error);
      }
      setLoading(false);
    };

    fetchWrongAnswers();
  }, []);

  useEffect(() => {
    if (loading) return;

    // Combine localStorage and server data
    const localWrongQuestions = JSON.parse(localStorage.getItem('quizmaster_wrong_questions') || '[]');
    const allWrongAnswers = [...localWrongQuestions, ...serverWrongAnswers];

    if (allWrongAnswers.length === 0) return;

    // Count incorrect answers per topic
    const topicCounts = allWrongAnswers.reduce((acc, question) => {
      const topicName = question.topic || 'General';
      acc[topicName] = (acc[topicName] || 0) + 1;
      return acc;
    }, {});

    // Sort topics by the number of incorrect answers, descending
    const sortedTopics = Object.entries(topicCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([topic, count]) => ({ 
        topic, 
        count,
        isCurrentTopic: topic === currentTopic,
        percentage: Math.round((count / allWrongAnswers.length) * 100)
      }));

    setWeakTopics(sortedTopics);
  }, [loading, serverWrongAnswers, currentTopic]);

  if (loading) {
    return (
      <div className="analysis-card">
        <div className="analysis-header">
          <i className="fas fa-chart-line"></i>
          <h3>Analyzing Your Performance</h3>
        </div>
        <div className="loading-analysis">
          <div className="analysis-spinner"></div>
          <p>Calculating weak areas...</p>
        </div>
      </div>
    );
  }

  if (weakTopics.length === 0) {
    return (
      <div className="analysis-card success">
        <div className="analysis-header">
          <i className="fas fa-trophy"></i>
          <h3>Excellent Performance!</h3>
        </div>
        <p>No weak areas detected. Keep up the great work!</p>
      </div>
    );
  }

  return (
    <div className="analysis-card">
      <div className="analysis-header">
        <i className="fas fa-chart-line"></i>
        <h3>Performance Analysis</h3>
        <p>Areas that need more attention</p>
      </div>
      
      <div className="weak-areas-list">
        {weakTopics.slice(0, 5).map(({ topic, count, isCurrentTopic, percentage }, index) => (
          <div 
            key={topic} 
            className={`weak-area-item ${isCurrentTopic ? 'current-topic' : ''} ${index === 0 ? 'most-weak' : ''}`}
          >
            <div className="weak-area-header">
              <div className="weak-area-rank">
                <span className="rank-number">#{index + 1}</span>
                {index === 0 && <i className="fas fa-exclamation-triangle"></i>}
              </div>
              <div className="weak-area-info">
                <h4 className="weak-area-topic">
                  {topic}
                  {isCurrentTopic && <span className="current-badge">Current Quiz</span>}
                </h4>
                <p className="weak-area-stats">
                  {count} wrong answers • {percentage}% of total mistakes
                </p>
              </div>
            </div>
            <div className="weak-area-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${Math.min(percentage * 2, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {weakTopics.length > 5 && (
        <div className="more-areas">
          <p>+{weakTopics.length - 5} more areas to review</p>
        </div>
      )}
    </div>
  );
};

const Results = ({ quizResults }) => {
  const navigate = useNavigate();

  const { correct, incorrect, percentage, topic, total, questions } = useMemo(() => {
    if (!quizResults) return {};
    const correct = quizResults.questions.filter(q => q.isCorrect).length;
    const incorrect = quizResults.questions.length - correct;
    const percentage = Math.round((correct / quizResults.questions.length) * 100);
    return { ...quizResults, correct, incorrect, percentage, total: quizResults.questions.length };
  }, [quizResults]);

  useEffect(() => {
    if (!quizResults || !questions || !topic) return;
    
    const newWrongQuestions = questions
      .filter(q => !q.isCorrect && q.userAnswer !== null)
      .map(q => ({ ...q, topic: topic })); // <-- KEY CHANGE: Add the topic here
    
    const correctlyAnsweredIds = questions.filter(q => q.isCorrect).map(q => q.id);
    
    let existingWrong = JSON.parse(localStorage.getItem('quizmaster_wrong_questions') || '[]');
    
    // Remove questions that were answered correctly this time
    existingWrong = existingWrong.filter(wq => !correctlyAnsweredIds.includes(wq.id));
    
    // Add new wrong questions, avoiding duplicates
    newWrongQuestions.forEach(newQ => {
      if (!existingWrong.some(ewq => ewq.id === newQ.id)) {
        existingWrong.push(newQ);
      }
    });

    localStorage.setItem('quizmaster_wrong_questions', JSON.stringify(existingWrong));

  }, [quizResults, questions, topic]); // <-- KEY CHANGE: Added 'topic' to the dependency array

  if (!quizResults) {
    useEffect(() => { navigate('/'); }, [navigate]);
    return null;
  }

  return (
    <div className="results-page">
      <Navbar />
      <main className="main-content">
        <div className="container">
          <div className="results-header">
            <h1 className="results-title">Quiz Results</h1>
            <p className="results-subtitle">Topic: {topic}</p>
          </div>

          <div className="results-grid">
            {/* Score Card */}
            <div className="score-card">
              <div className="score-circle">
                <div className="score-percentage" style={{ 
                  color: percentage >= 70 ? '#10B981' : percentage >= 50 ? '#F59E0B' : '#EF4444' 
                }}>
                  {percentage}%
                </div>
                <div className="score-label">Score</div>
              </div>
              <div className="score-details">
                <div className="score-stat correct">
                  <i className="fas fa-check-circle"></i>
                  <span className="stat-number">{correct}</span>
                  <span className="stat-label">Correct</span>
                </div>
                <div className="score-stat incorrect">
                  <i className="fas fa-times-circle"></i>
                  <span className="stat-number">{incorrect}</span>
                  <span className="stat-label">Incorrect</span>
                </div>
                <div className="score-stat total">
                  <i className="fas fa-list"></i>
                  <span className="stat-number">{total}</span>
                  <span className="stat-label">Total</span>
                </div>
              </div>
            </div>

            {/* Performance Message */}
            <div className="performance-message">
              {percentage >= 90 && (
                <>
                  <i className="fas fa-trophy"></i>
                  <h3>Outstanding!</h3>
                  <p>You've mastered this topic exceptionally well!</p>
                </>
              )}
              {percentage >= 70 && percentage < 90 && (
                <>
                  <i className="fas fa-medal"></i>
                  <h3>Great Job!</h3>
                  <p>You have a solid understanding of this topic.</p>
                </>
              )}
              {percentage >= 50 && percentage < 70 && (
                <>
                  <i className="fas fa-chart-line"></i>
                  <h3>Good Progress!</h3>
                  <p>You're on the right track. Keep practicing!</p>
                </>
              )}
              {percentage < 50 && (
                <>
                  <i className="fas fa-lightbulb"></i>
                  <h3>Keep Learning!</h3>
                  <p>Review the material and try again. You've got this!</p>
                </>
              )}
            </div>
          </div>
          
          {/* Weak Area Analysis */}
          <WeakAreaAnalysis currentTopic={topic} />

          {/* Action Buttons */}
          <div className="results-actions">
            <button 
              onClick={() => navigate('/')} 
              className="action-btn primary"
            >
              <i className="fas fa-plus"></i>
              Start New Quiz
            </button>
            <button 
              onClick={() => navigate('/topics')} 
              className="action-btn secondary"
            >
              <i className="fas fa-redo"></i>
              Retry This Topic
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Results;