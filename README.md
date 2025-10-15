# QuizMaster - Interactive Quiz Platform

A colorful and friendly web application for creating interactive quizzes from PDF documents using AI-generated questions.

## Features

### 🏠 Home Page
- Clean, welcoming design with gradient backgrounds
- Prominent "Upload PDF" button with file icon
- "Start Quiz" button (enabled after PDF upload)
- Modern navigation bar with Home, Quiz, Results, and Settings
- Friendly mascot animation
- Feature showcase cards

### 🧾 Quiz Page
- Clear question display with text and images
- 4 MCQ options with radio buttons and hover animations
- Smooth "Next" and "Previous" navigation
- Progress bar showing completion status
- Color feedback for answers (green = correct, red = wrong)
- Responsive design for desktop and mobile

### 📊 Results Page
- Comprehensive statistics display
- Correct, Wrong, and Pending question counts
- Circular progress chart with percentage score
- "Retry Wrong Questions" functionality
- Success animations and friendly illustrations

### ⚙️ Settings/History Page
- Session management (clear current session, reset all data)
- Upload history with file details
- Wrong questions review and retry
- Data export/import capabilities

## Technical Features

### PDF + Image Handling
- ✅ PDF upload and text extraction using PDF.js
- ✅ Image extraction and display with questions
- ✅ Robust error handling for PDF processing

### PDF Reuse
- ✅ Once uploaded, PDF remains active for the entire session
- ✅ No re-upload required after every set of 5 questions
- ✅ Manual option to upload new PDF when needed

### Question Progress Tracking
- ✅ Wrong questions stored in localStorage as JSON
- ✅ Correct answers remove questions from wrong list
- ✅ Automatic cleanup when session completes
- ✅ Retry functionality for incorrect questions

### Backend Logic
- ✅ Gemini API integration for quiz generation
- ✅ Robust prompt engineering for consistent results
- ✅ Error handling and fallback mechanisms

## Setup Instructions

### 1. Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Local web server (for ES6 modules)

### 2. API Key Setup
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Replace `YOUR_GEMINI_API_KEY` in `services/gemini.js` with your actual key

### 3. Local Server Setup

#### Option 1: Python (Recommended)
```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

#### Option 2: Node.js
```bash
# Install http-server globally
npm install -g http-server

# Run server
http-server
```

#### Option 3: Live Server (VS Code Extension)
- Install "Live Server" extension in VS Code
- Right-click on `index.html` and select "Open with Live Server"

### 4. Access the Application
Open your browser and navigate to:
- `http://localhost:8000` (Python/Node.js)
- Or use the Live Server URL (VS Code extension)

## Usage Guide

### 1. Upload PDF
- Click the "Upload PDF" button on the home page
- Select a PDF file containing questions with images
- Wait for processing (text extraction and AI quiz generation)

### 2. Start Quiz
- Click "Start Quiz" button (enabled after successful upload)
- Navigate through questions using Previous/Next buttons
- Select your answers using radio buttons
- View associated images below each question

### 3. Review Results
- See your score and statistics on the Results page
- Review correct, incorrect, and pending questions
- Use "Retry Wrong Questions" to practice missed questions

### 4. Manage Settings
- View upload history in Settings page
- Review wrong questions for study
- Clear session data or reset all data as needed

## File Structure

```
quizmaster/
├── index.html              # Main HTML file
├── styles.css              # Complete CSS styling
├── app.js                  # Main application logic
├── services/
│   ├── gemini.js           # Gemini API integration
│   ├── storage.js          # Local storage management
│   └── pdfHandler.js       # PDF processing
└── README.md               # This file
```

## Color Palette

- **Primary Purple**: #8B5CF6
- **Primary Pink**: #EC4899
- **Primary Blue**: #3B82F6
- **Primary Teal**: #14B8A6
- **Success**: #10B981
- **Error**: #EF4444
- **Warning**: #F59E0B

## Browser Compatibility

- ✅ Chrome 80+
- ✅ Firefox 75+
- ✅ Safari 13+
- ✅ Edge 80+

## Responsive Design

- ✅ Desktop (1200px+)
- ✅ Tablet (768px - 1199px)
- ✅ Mobile (320px - 767px)
- ✅ Touch-friendly interface
- ✅ Mobile navigation menu

## Performance Features

- ✅ Lazy loading of images
- ✅ Efficient PDF processing
- ✅ Optimized animations
- ✅ Minimal bundle size
- ✅ Fast loading times

## Security Notes

- API key is client-side (consider server-side implementation for production)
- All data stored locally in browser
- No external data transmission except to Gemini API

## Troubleshooting

### Common Issues

1. **PDF Upload Fails**
   - Ensure file is a valid PDF
   - Check file size (recommended < 10MB)
   - Verify PDF.js library is loaded

2. **Quiz Generation Fails**
   - Check API key in `services/gemini.js`
   - Verify internet connection
   - Check browser console for errors

3. **Images Not Displaying**
   - Ensure PDF contains embedded images
   - Check browser compatibility
   - Verify PDF.js image extraction

4. **Local Storage Issues**
   - Clear browser cache and localStorage
   - Check if localStorage is enabled
   - Try incognito/private browsing mode

### Error Messages

- "API Error": Check Gemini API key and network connection
- "PDF Error": Invalid or corrupted PDF file
- "Storage Error": Browser localStorage issues

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the MIT License.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review browser console for errors
3. Ensure all setup steps are completed
4. Verify API key configuration

---

**QuizMaster** - Transform your PDFs into interactive learning experiences! 🎓✨
"# mcq-builder" 
"# mcq-builder" 
