/**
 * QuizMaster - Main Application
 * Interactive Quiz Platform with PDF Upload and AI-Generated Questions
 */

import { generateQuizFromText } from './services/gemini.js';
import { storageService } from './services/storage.js';
import { pdfHandler } from './services/pdfHandler.js';

class QuizMasterApp {
    constructor() {
        this.currentQuiz = null;
        this.currentQuestionIndex = 0;
        this.userAnswers = {};
        this.quizResults = {
            correct: 0,
            incorrect: 0,
            pending: 0,
            total: 0
        };
        
        this.init();
    }

    /**
     * Initialize the application
     */
    init() {
        this.setupEventListeners();
        this.loadExistingSession();
        this.updateUI();
        this.setupToastSystem();
        
        console.log('QuizMaster App initialized successfully');
    }

    /**
     * Set up all event listeners
     */
    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.currentTarget.dataset.page;
                this.navigateToPage(page);
            });
        });

        // Mobile navigation
        const hamburger = document.querySelector('.hamburger');
        const navMenu = document.querySelector('.nav-menu');
        
        if (hamburger && navMenu) {
            hamburger.addEventListener('click', () => {
                hamburger.classList.toggle('active');
                navMenu.classList.toggle('active');
            });
        }

        // PDF Upload
        const uploadBtn = document.getElementById('upload-pdf-btn');
        const pdfInput = document.getElementById('pdf-input');
        
        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => {
                pdfInput.click();
            });
        }

        if (pdfInput) {
            pdfInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.handlePDFUpload(e.target.files[0]);
                }
            });
        }

        // Start Quiz
        const startQuizBtn = document.getElementById('start-quiz-btn');
        if (startQuizBtn) {
            startQuizBtn.addEventListener('click', () => {
                this.startQuiz();
            });
        }

        // Quiz Navigation
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                this.goToPreviousQuestion();
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.goToNextQuestion();
            });
        }

        // Results Actions
        const retryWrongBtn = document.getElementById('retry-wrong-btn');
        const newQuizBtn = document.getElementById('new-quiz-btn');
        
        if (retryWrongBtn) {
            retryWrongBtn.addEventListener('click', () => {
                this.retryWrongQuestions();
            });
        }

        if (newQuizBtn) {
            newQuizBtn.addEventListener('click', () => {
                this.startNewQuiz();
            });
        }

        // Settings Actions
        const clearSessionBtn = document.getElementById('clear-session-btn');
        const resetAllBtn = document.getElementById('reset-all-btn');
        
        if (clearSessionBtn) {
            clearSessionBtn.addEventListener('click', () => {
                this.clearCurrentSession();
            });
        }

        if (resetAllBtn) {
            resetAllBtn.addEventListener('click', () => {
                this.resetAllData();
            });
        }
    }

    /**
     * Navigate to a specific page
     * @param {string} pageName - Name of the page to navigate to
     */
    navigateToPage(pageName) {
        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        const activeLink = document.querySelector(`[data-page="${pageName}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        // Update page visibility
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        const targetPage = document.getElementById(`${pageName}-page`);
        if (targetPage) {
            targetPage.classList.add('active');
        }

        // Update page-specific content
        this.updatePageContent(pageName);
    }

    /**
     * Update content for specific pages
     * @param {string} pageName - Name of the page
     */
    updatePageContent(pageName) {
        switch (pageName) {
            case 'home':
                this.updateHomePage();
                break;
            case 'quiz':
                this.updateQuizPage();
                break;
            case 'results':
                this.updateResultsPage();
                break;
            case 'settings':
                this.updateSettingsPage();
                break;
        }
    }

    /**
     * Update home page content
     */
    updateHomePage() {
        const startQuizBtn = document.getElementById('start-quiz-btn');
        const currentQuiz = storageService.getCurrentQuiz();
        
        if (startQuizBtn) {
            if (currentQuiz && currentQuiz.questions && currentQuiz.questions.length > 0) {
                startQuizBtn.disabled = false;
                startQuizBtn.innerHTML = '<i class="fas fa-play"></i><span>Start Quiz</span>';
            } else {
                startQuizBtn.disabled = true;
                startQuizBtn.innerHTML = '<i class="fas fa-upload"></i><span>Upload PDF First</span>';
            }
        }
    }

    /**
     * Update quiz page content
     */
    updateQuizPage() {
        const currentQuiz = storageService.getCurrentQuiz();
        
        if (!currentQuiz || !currentQuiz.questions || currentQuiz.questions.length === 0) {
            this.showToast('No quiz available. Please upload a PDF first.', 'warning');
            this.navigateToPage('home');
            return;
        }

        this.currentQuiz = currentQuiz;
        this.loadQuizSession();
        this.displayCurrentQuestion();
    }

    /**
     * Update results page content
     */
    updateResultsPage() {
        const currentQuiz = storageService.getCurrentQuiz();
        
        if (!currentQuiz) {
            this.showToast('No quiz results available.', 'warning');
            this.navigateToPage('home');
            return;
        }

        this.calculateResults();
        this.displayResults();
    }

    /**
     * Update settings page content
     */
    updateSettingsPage() {
        this.displayUploadHistory();
        this.displayWrongQuestions();
    }

    /**
     * Handle PDF upload
     * @param {File} file - PDF file to upload
     */
    async handlePDFUpload(file) {
        if (!file || file.type !== 'application/pdf') {
            this.showToast('Please select a valid PDF file.', 'error');
            return;
        }

        try {
            this.showLoadingOverlay(true);
            this.showToast('Processing PDF...', 'success');

            // Load PDF
            const pdfInfo = await pdfHandler.loadPDF(file);
            
            // Extract text content
            const textContent = await pdfHandler.extractText();
            
            // Generate quiz using Gemini API
            this.showToast('Generating quiz questions...', 'success');
            const questions = await generateQuizFromText(textContent);
            
            // Create quiz object
            const quizData = {
                id: Date.now().toString(),
                fileName: file.name,
                fileSize: file.size,
                uploadTime: Date.now(),
                questions: questions,
                totalQuestions: questions.length,
                currentQuestionIndex: 0,
                userAnswers: {},
                completed: false
            };

            // Save quiz data
            storageService.saveCurrentQuiz(quizData);
            storageService.addToUploadHistory({
                fileName: file.name,
                fileSize: file.size,
                questionCount: questions.length
            });

            this.currentQuiz = quizData;
            this.currentQuestionIndex = 0;
            this.userAnswers = {};

            this.showToast(`Quiz generated successfully! ${questions.length} questions ready.`, 'success');
            this.updateHomePage();

        } catch (error) {
            console.error('Error processing PDF:', error);
            this.showToast(`Error processing PDF: ${error.message}`, 'error');
        } finally {
            this.showLoadingOverlay(false);
        }
    }

    /**
     * Start the quiz
     */
    startQuiz() {
        const currentQuiz = storageService.getCurrentQuiz();
        
        if (!currentQuiz || !currentQuiz.questions || currentQuiz.questions.length === 0) {
            this.showToast('No quiz available. Please upload a PDF first.', 'warning');
            return;
        }

        this.currentQuiz = currentQuiz;
        this.currentQuestionIndex = 0;
        this.userAnswers = {};
        
        // Save session data
        this.saveQuizSession();
        
        // Navigate to quiz page
        this.navigateToPage('quiz');
    }

    /**
     * Load existing quiz session
     */
    loadExistingSession() {
        const sessionData = storageService.getSessionData();
        const currentQuiz = storageService.getCurrentQuiz();
        
        if (sessionData && currentQuiz) {
            this.currentQuiz = currentQuiz;
            this.currentQuestionIndex = sessionData.currentQuestionIndex || 0;
            this.userAnswers = sessionData.userAnswers || {};
        }
    }

    /**
     * Save quiz session data
     */
    saveQuizSession() {
        const sessionData = {
            currentQuestionIndex: this.currentQuestionIndex,
            userAnswers: this.userAnswers,
            timestamp: Date.now()
        };
        
        storageService.saveSessionData(sessionData);
    }

    /**
     * Display current question
     */
    displayCurrentQuestion() {
        if (!this.currentQuiz || !this.currentQuiz.questions) {
            return;
        }

        const question = this.currentQuiz.questions[this.currentQuestionIndex];
        const totalQuestions = this.currentQuiz.questions.length;

        // Update progress
        this.updateProgress(this.currentQuestionIndex + 1, totalQuestions);

        // Update question text
        const questionTextEl = document.getElementById('question-text');
        if (questionTextEl) {
            questionTextEl.textContent = question.questionText;
        }

        // Update question image (if available)
        const questionImageEl = document.getElementById('question-image');
        const questionImgEl = document.getElementById('question-img');
        
        if (question.image && question.image.dataUrl) {
            questionImgEl.src = question.image.dataUrl;
            questionImgEl.alt = `Question ${this.currentQuestionIndex + 1} Image`;
            questionImageEl.style.display = 'block';
        } else {
            questionImageEl.style.display = 'none';
        }

        // Update options
        this.displayOptions(question);

        // Update navigation buttons
        this.updateNavigationButtons();
    }

    /**
     * Display question options
     * @param {Object} question - Question object
     */
    displayOptions(question) {
        const optionsContainer = document.getElementById('options-container');
        if (!optionsContainer) return;

        optionsContainer.innerHTML = '';

        question.options.forEach((option, index) => {
            const optionEl = document.createElement('div');
            optionEl.className = 'option';
            
            // Check if this option was previously selected
            const isSelected = this.userAnswers[this.currentQuestionIndex] === index;
            if (isSelected) {
                optionEl.classList.add('selected');
            }

            optionEl.innerHTML = `
                <input type="radio" name="answer" value="${index}" id="option-${index}" ${isSelected ? 'checked' : ''}>
                <label for="option-${index}" class="option-label">${option}</label>
            `;

            // Add click event
            optionEl.addEventListener('click', () => {
                this.selectAnswer(index);
            });

            optionsContainer.appendChild(optionEl);
        });
    }

    /**
     * Select an answer
     * @param {number} answerIndex - Index of the selected answer
     */
    selectAnswer(answerIndex) {
        // Update user answers
        this.userAnswers[this.currentQuestionIndex] = answerIndex;
        
        // Update UI
        document.querySelectorAll('.option').forEach(option => {
            option.classList.remove('selected');
        });
        
        const selectedOption = document.querySelector(`input[value="${answerIndex}"]`).closest('.option');
        if (selectedOption) {
            selectedOption.classList.add('selected');
        }

        // Enable next button
        const nextBtn = document.getElementById('next-btn');
        if (nextBtn) {
            nextBtn.disabled = false;
        }

        // Save session
        this.saveQuizSession();
    }

    /**
     * Go to previous question
     */
    goToPreviousQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.displayCurrentQuestion();
        }
    }

    /**
     * Go to next question
     */
    goToNextQuestion() {
        const totalQuestions = this.currentQuiz.questions.length;
        
        if (this.currentQuestionIndex < totalQuestions - 1) {
            this.currentQuestionIndex++;
            this.displayCurrentQuestion();
        } else {
            // Quiz completed
            this.completeQuiz();
        }
    }

    /**
     * Complete the quiz
     */
    completeQuiz() {
        this.calculateResults();
        
        // Mark quiz as completed
        this.currentQuiz.completed = true;
        storageService.saveCurrentQuiz(this.currentQuiz);
        
        // Clear session data
        storageService.clearSessionData();
        
        // Navigate to results
        this.navigateToPage('results');
    }

    /**
     * Calculate quiz results
     */
    calculateResults() {
        if (!this.currentQuiz || !this.currentQuiz.questions) {
            return;
        }

        this.quizResults = {
            correct: 0,
            incorrect: 0,
            pending: 0,
            total: this.currentQuiz.questions.length
        };

        this.currentQuiz.questions.forEach((question, index) => {
            const userAnswer = this.userAnswers[index];
            
            if (userAnswer === undefined) {
                this.quizResults.pending++;
            } else if (userAnswer === question.correctAnswer) {
                this.quizResults.correct++;
            } else {
                this.quizResults.incorrect++;
                
                // Save wrong question
                storageService.saveWrongQuestion(question, userAnswer);
            }
        });
    }

    /**
     * Display quiz results
     */
    displayResults() {
        // Update counts
        document.getElementById('correct-count').textContent = this.quizResults.correct;
        document.getElementById('incorrect-count').textContent = this.quizResults.incorrect;
        document.getElementById('pending-count').textContent = this.quizResults.pending;

        // Update progress circle
        const percentage = Math.round((this.quizResults.correct / this.quizResults.total) * 100);
        document.getElementById('progress-percentage').textContent = `${percentage}%`;

        // Update progress ring
        const radius = 90;
        const circumference = 2 * Math.PI * radius;
        const progressRing = document.querySelector('.progress-ring-fill');
        if (progressRing) {
            progressRing.style.strokeDasharray = `${circumference}`;
            progressRing.style.strokeDashoffset = circumference - (percentage / 100) * circumference;
        }

        // Show retry button if there are wrong questions
        const retryBtn = document.getElementById('retry-wrong-btn');
        if (retryBtn) {
            retryBtn.style.display = this.quizResults.incorrect > 0 ? 'flex' : 'none';
        }
    }

    /**
     * Update progress bar
     * @param {number} current - Current question number
     * @param {number} total - Total questions
     */
    updateProgress(current, total) {
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        
        if (progressFill) {
            progressFill.style.width = `${(current / total) * 100}%`;
        }
        
        if (progressText) {
            progressText.textContent = `Question ${current} of ${total}`;
        }
    }

    /**
     * Update navigation buttons
     */
    updateNavigationButtons() {
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        
        if (prevBtn) {
            prevBtn.disabled = this.currentQuestionIndex === 0;
        }
        
        if (nextBtn) {
            const hasAnswer = this.userAnswers[this.currentQuestionIndex] !== undefined;
            const isLastQuestion = this.currentQuestionIndex === this.currentQuiz.questions.length - 1;
            
            nextBtn.disabled = !hasAnswer;
            nextBtn.textContent = isLastQuestion ? 'Complete Quiz' : 'Next';
        }
    }

    /**
     * Retry wrong questions
     */
    retryWrongQuestions() {
        const wrongQuestions = storageService.getWrongQuestions();
        
        if (wrongQuestions.length === 0) {
            this.showToast('No wrong questions to retry!', 'success');
            return;
        }

        // Create new quiz with wrong questions
        const retryQuiz = {
            id: `retry-${Date.now()}`,
            fileName: 'Retry Wrong Questions',
            fileSize: 0,
            uploadTime: Date.now(),
            questions: wrongQuestions.map(wq => ({
                id: wq.questionId,
                questionText: wq.questionText,
                options: wq.options,
                correctAnswer: wq.correctAnswer
            })),
            totalQuestions: wrongQuestions.length,
            currentQuestionIndex: 0,
            userAnswers: {},
            completed: false,
            isRetry: true
        };

        this.currentQuiz = retryQuiz;
        this.currentQuestionIndex = 0;
        this.userAnswers = {};

        storageService.saveCurrentQuiz(retryQuiz);
        this.saveQuizSession();

        this.navigateToPage('quiz');
        this.showToast('Retrying wrong questions...', 'success');
    }

    /**
     * Start new quiz
     */
    startNewQuiz() {
        storageService.clearCurrentSession();
        this.currentQuiz = null;
        this.currentQuestionIndex = 0;
        this.userAnswers = {};
        this.quizResults = { correct: 0, incorrect: 0, pending: 0, total: 0 };
        
        this.navigateToPage('home');
        this.showToast('Ready for a new quiz!', 'success');
    }

    /**
     * Clear current session
     */
    clearCurrentSession() {
        storageService.clearCurrentSession();
        this.currentQuiz = null;
        this.currentQuestionIndex = 0;
        this.userAnswers = {};
        
        this.updateSettingsPage();
        this.navigateToPage('home');
    }

    /**
     * Reset all data
     */
    resetAllData() {
        if (confirm('Are you sure you want to reset all data? This action cannot be undone.')) {
            storageService.clearAllData();
            this.currentQuiz = null;
            this.currentQuestionIndex = 0;
            this.userAnswers = {};
            this.quizResults = { correct: 0, incorrect: 0, pending: 0, total: 0 };
            
            this.updateSettingsPage();
            this.navigateToPage('home');
        }
    }

    /**
     * Display upload history
     */
    displayUploadHistory() {
        const historyContainer = document.getElementById('upload-history');
        const history = storageService.getUploadHistory();
        
        if (!historyContainer) return;

        if (history.length === 0) {
            historyContainer.innerHTML = `
                <div class="no-history">
                    <i class="fas fa-history"></i>
                    <p>No upload history found</p>
                </div>
            `;
            return;
        }

        historyContainer.innerHTML = history.map(upload => `
            <div class="upload-item">
                <div class="upload-info">
                    <h4>${upload.fileName}</h4>
                    <p>${new Date(upload.uploadTime).toLocaleString()} • ${this.formatFileSize(upload.fileSize)} • ${upload.questionCount} questions</p>
                </div>
            </div>
        `).join('');
    }

    /**
     * Display wrong questions
     */
    displayWrongQuestions() {
        const wrongContainer = document.getElementById('wrong-questions-list');
        const wrongQuestions = storageService.getWrongQuestions();
        
        if (!wrongContainer) return;

        if (wrongQuestions.length === 0) {
            wrongContainer.innerHTML = `
                <div class="no-wrong-questions">
                    <i class="fas fa-check-circle"></i>
                    <p>No wrong questions to review</p>
                </div>
            `;
            return;
        }

        wrongContainer.innerHTML = wrongQuestions.map(wq => `
            <div class="wrong-question-item">
                <div class="question-info">
                    <h4>${wq.questionText.substring(0, 100)}${wq.questionText.length > 100 ? '...' : ''}</h4>
                    <p>Your answer: ${wq.options[wq.userAnswer]} | Correct: ${wq.options[wq.correctAnswer]}</p>
                </div>
            </div>
        `).join('');
    }

    /**
     * Show/hide loading overlay
     * @param {boolean} show - Whether to show the overlay
     */
    showLoadingOverlay(show) {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.toggle('active', show);
        }
    }

    /**
     * Setup toast notification system
     */
    setupToastSystem() {
        window.showToast = (message, type = 'success') => {
            this.showToast(message, type);
        };
    }

    /**
     * Show toast notification
     * @param {string} message - Message to display
     * @param {string} type - Type of toast (success, error, warning)
     */
    showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = type === 'success' ? 'check-circle' : 
                    type === 'error' ? 'exclamation-circle' : 
                    type === 'warning' ? 'exclamation-triangle' : 'info-circle';

        toast.innerHTML = `
            <i class="fas fa-${icon} toast-icon"></i>
            <span class="toast-message">${message}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        container.appendChild(toast);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);
    }

    /**
     * Update UI elements
     */
    updateUI() {
        this.updateHomePage();
    }

    /**
     * Format file size
     * @param {number} bytes - File size in bytes
     * @returns {string} Formatted file size
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.quizMasterApp = new QuizMasterApp();
});

// Export for potential external use
export default QuizMasterApp;
