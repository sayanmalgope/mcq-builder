import React, { useState, useEffect } from 'react';
import Navbar from './Navbar';

// Re-usable component to show topics where the user struggles
const WeakAreaAnalysis = () => {
  const [weakTopics, setWeakTopics] = React.useState([]);

  React.useEffect(() => {
    const wrongQuestions = JSON.parse(localStorage.getItem('quizmaster_wrong_questions') || '[]');
    if (wrongQuestions.length === 0) return;

    const topicCounts = wrongQuestions.reduce((acc, question) => {
      const topicName = question.topic || 'General';
      acc[topicName] = (acc[topicName] || 0) + 1;
      return acc;
    }, {});

    const sortedTopics = Object.entries(topicCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([topic, count]) => ({ topic, count }));

    setWeakTopics(sortedTopics);
  }, []);

  if (weakTopics.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <i className="fas fa-trophy text-green-500 text-xl"></i>
        </div>
        <h3 className="text-lg font-semibold text-gray-600 mb-2">No Weak Areas Found</h3>
        <p className="text-gray-500">Keep up the great work!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {weakTopics.map(({ topic, count }) => (
        <div key={topic} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
          <span className="font-semibold text-gray-800">{topic}</span>
          <span className="text-sm font-bold text-red-600">{count} incorrect</span>
        </div>
      ))}
    </div>
  );
};

const Settings = () => {
  const [wrongQuestions, setWrongQuestions] = useState([]);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const wrong = JSON.parse(localStorage.getItem('quizmaster_wrong_questions') || '[]');
    setWrongQuestions(wrong);
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const clearWrongQuestions = () => {
    if (window.confirm('Are you sure you want to clear your wrong questions history?')) {
      localStorage.removeItem('quizmaster_wrong_questions');
      showToast('Wrong questions history cleared!', 'success');
      loadData();
    }
  };

  const resetAllData = () => {
    if (window.confirm('DANGER: This will delete all quiz history and stored data. This cannot be undone. Proceed?')) {
      localStorage.clear();
      showToast('All application data has been reset!', 'success');
      loadData();
      // Optional: redirect to home page after a full reset
      // setTimeout(() => window.location.href = '/', 1000);
    }
  };

  return (
    <div className="settings-page">
      <Navbar />
      <main className="main-content">
        <div className="container max-w-4xl">
          <div className="mb-8">
            <h1 className="title mb-2">Settings & Data</h1>
            <p className="text-lg text-gray-600">Manage your quiz history and application data.</p>
          </div>

          <div className="space-y-8">
            {/* Weak Area Analysis Card */}
            <div className="card">
              <div className="card-header">
                <h2 className="text-xl font-semibold text-gray-800">Your Focus Areas</h2>
                <p className="text-gray-600 mt-1">A summary of topics you've struggled with the most.</p>
              </div>
              <div className="card-body">
                <WeakAreaAnalysis />
              </div>
            </div>

            {/* Wrong Questions Review */}
            <div className="card">
              <div className="card-header flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">Review Incorrect Questions</h2>
                  <p className="text-gray-600 mt-1">A detailed list of every question you got wrong.</p>
                </div>
                {wrongQuestions.length > 0 && (
                  <button
                    className="btn btn-outline btn-sm border-red-300 text-red-600 hover:bg-red-50"
                    onClick={clearWrongQuestions}
                  >
                    <i className="fas fa-trash-alt mr-2"></i>
                    Clear History
                  </button>
                )}
              </div>
              <div className="card-body">
                {wrongQuestions.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <i className="fas fa-check-circle text-green-500 text-xl"></i>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">No incorrect answers to review</h3>
                    <p className="text-gray-500">Fantastic! Keep it up.</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                    {wrongQuestions.map((q) => (
                      <div key={q.id} className="border border-gray-200 rounded-lg p-4">
                        <p className="font-semibold text-gray-800 mb-2">{q.question}</p>
                        <p className="text-sm text-red-600"><span className="font-medium">Your answer:</span> {q.options[q.userAnswer]}</p>
                        <p className="text-sm text-green-600"><span className="font-medium">Correct answer:</span> {q.options[q.correctAnswer]}</p>
                        <p className="text-xs text-gray-500 mt-2">Topic: <span className="font-semibold">{q.topic || 'Unknown'}</span></p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Data Management */}
            <div className="card">
              <div className="card-header">
                <h2 className="text-xl font-semibold text-gray-800">Data Management</h2>
                <p className="text-gray-600 mt-1">Permanently clear all application data.</p>
              </div>
              <div className="card-body">
                <button
                  className="btn btn-outline border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
                  onClick={resetAllData}
                >
                  <i className="fas fa-exclamation-triangle mr-2"></i>
                  Reset All Application Data
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}>
            <i className={`fas fa-check-circle toast-icon`}></i>
            <span className="toast-message">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;