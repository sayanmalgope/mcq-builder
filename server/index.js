// index.js
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
dotenv.config();

if (!process.env.GEMINI_API_KEY_1 || !process.env.GEMINI_API_KEY_2||!process.env.OPENROUTER_API_KEY) {
  console.error("❌ FATAL ERROR: API_KEY not found in .env");
  process.exit(1);
}


const {
  uploadAndProcessFile,
  generateTopics,
  generateQuiz,
  getFileByName, // <-- Import the new function
} = require("./services/pdfService.js");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// increase timeouts for long Gemini processing
app.use((req, res, next) => {
  req.setTimeout(10 * 60 * 1000);
  res.setTimeout(10 * 60 * 1000);
  next();
});

// Multer configuration for file uploads
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

/**
 * Step 1: Upload PDF and generate topics
 */
app.post("/api/upload-and-analyze", upload.single("pdf"), async (req, res) => {
  if (!req.file)
    return res.status(400).json({ success: false, error: "No PDF uploaded." });

  const filePath = req.file.path;
  try {
    const processedFile = await uploadAndProcessFile(
      filePath,
      req.file.mimetype,
      req.file.originalname
    );
    const topics = await generateTopics(processedFile);
    res.json({
      success: true,
      topics,
      geminiFileName: processedFile.name,
    });
  } catch (error) {
    console.error("❌ Error in /api/upload-and-analyze:", error.message);
    res.status(500).json({
      success: false,
      error: "Failed to process PDF with Gemini AI.",
      details: error.message,
    });
  } finally {
    fs.unlink(filePath, () => {}); // clean up temp file
  }
});

/**
 * Step 2: Generate quiz for selected topic
 */
app.post("/api/generate-quiz", async (req, res) => {
  const { topic, questionCount, geminiFileName } = req.body;
  if (!topic || !questionCount || !geminiFileName)
    return res
      .status(400)
      .json({ success: false, error: "Missing required parameters." });

  try {
    // Fetch file from Gemini storage
    const { GoogleGenAI } = require("@google/genai");
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const file = await ai.files.get({ name: geminiFileName });

    const quiz = await generateQuiz(topic, questionCount, file);
    res.json({ success: true, quiz });
  } catch (error) {
    console.error("❌ Error in /api/generate-quiz:", error.message);
    res.status(500).json({
      success: false,
      error: "Failed to generate quiz from Gemini AI.",
      details: error.message,
    });
  }
});

/**
 * Step 3: Save wrong answers for review
 */
app.post("/api/save-wrong-answer", async (req, res) => {
  const { question, userAnswer, correctAnswer, topic, explanation } = req.body;
  
  try {
    const wrongAnswersFile = path.join(__dirname, "wrong-answers.json");
    let wrongAnswers = [];
    
    // Read existing wrong answers
    if (fs.existsSync(wrongAnswersFile)) {
      const data = fs.readFileSync(wrongAnswersFile, 'utf8');
      wrongAnswers = JSON.parse(data);
    }
    
    // Add new wrong answer
    const wrongAnswer = {
      id: Date.now().toString(),
      question,
      userAnswer,
      correctAnswer,
      topic,
      explanation,
      timestamp: new Date().toISOString(),
      reviewCount: 0
    };
    
    wrongAnswers.push(wrongAnswer);
    
    // Save back to file
    fs.writeFileSync(wrongAnswersFile, JSON.stringify(wrongAnswers, null, 2));
    
    res.json({ success: true, message: "Wrong answer saved" });
  } catch (error) {
    console.error("❌ Error saving wrong answer:", error.message);
    res.status(500).json({
      success: false,
      error: "Failed to save wrong answer",
      details: error.message,
    });
  }
});

app.post("/api/generate-quiz", async (req, res) => {
  const { topic, questionCount, geminiFileName } = req.body;
  if (!topic || !questionCount || !geminiFileName)
    return res
      .status(400)
      .json({ success: false, error: "Missing required parameters." });

  try {
    // --- SIMPLIFIED LOGIC ---
    // Fetch file from Gemini storage using our service
    const file = await getFileByName(geminiFileName);

    const quiz = await generateQuiz(topic, questionCount, file);
    res.json({ success: true, quiz });
  } catch (error) {
    console.error("❌ Error in /api/generate-quiz:", error.message);
    res.status(500).json({
      success: false,
      error: "Failed to generate quiz from Gemini AI.",
      details: error.message,
    });
  }
});

/**
 * Step 4: Get wrong answers for review
 */
app.get("/api/wrong-answers", async (req, res) => {
  try {
    const wrongAnswersFile = path.join(__dirname, "wrong-answers.json");
    
    if (!fs.existsSync(wrongAnswersFile)) {
      return res.json({ success: true, wrongAnswers: [] });
    }
    
    const data = fs.readFileSync(wrongAnswersFile, 'utf8');
    const wrongAnswers = JSON.parse(data);
    
    res.json({ success: true, wrongAnswers });
  } catch (error) {
    console.error("❌ Error getting wrong answers:", error.message);
    res.status(500).json({
      success: false,
      error: "Failed to get wrong answers",
      details: error.message,
    });
  }
});

// Start the server
app.listen(PORT, () =>
  console.log(`🚀 Server running at http://localhost:${PORT}`)
);
