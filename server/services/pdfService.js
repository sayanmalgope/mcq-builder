// server/services/pdfService.js
const { GoogleGenAI, createPartFromUri, Type } = require("@google/genai");
const fetch = require("node-fetch");
const fs = require("fs");

// Initialize multiple Gemini instances if keys are provided
const geminiAI1 = process.env.GEMINI_API_KEY_1 
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY_1 })
  : null;

const geminiAI2 = process.env.GEMINI_API_KEY_2
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY_2 })
  : null;

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || null;

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// Track which Gemini key to use (round-robin for rate limiting)
let currentGeminiKey = 1;

/**
 * Get next available Gemini instance (load balancing)
 */
function getNextGemini() {
  if (geminiAI1 && geminiAI2) {
    // Round-robin between two keys
    currentGeminiKey = currentGeminiKey === 1 ? 2 : 1;
    return currentGeminiKey === 1 ? geminiAI1 : geminiAI2;
  } else if (geminiAI1) {
    return geminiAI1;
  } else if (geminiAI2) {
    return geminiAI2;
  }
  throw new Error("No Gemini API key configured");
}

/**
 * Upload and process the PDF file to Gemini
 * Uses Gemini Key 1 for consistency
 */
async function uploadAndProcessFile(filePath, mimeType, displayName) {
  const gemini = geminiAI1 || geminiAI2;
  if (!gemini) throw new Error("Gemini API key not configured");
  
  console.log(`📤 Uploading file to Gemini: ${filePath}`);

  const hasUpload = typeof gemini.files.upload === "function";
  const hasUploadFile = typeof gemini.files.uploadFile === "function";

  const uploadedFile = hasUpload
    ? await gemini.files.upload({
        file: filePath,
        config: { displayName, mimeType: mimeType || "application/pdf" },
      })
    : await gemini.files.uploadFile(filePath, {
        mimeType: mimeType || "application/pdf",
        displayName,
      });

  let getFile = await gemini.files.get({ name: uploadedFile.name || uploadedFile.file?.name });

  while (getFile.state === "PROCESSING") {
    console.log("⏳ File still processing... waiting 5 seconds");
    await delay(5000);
    getFile = await gemini.files.get({ name: uploadedFile.name || uploadedFile.file?.name });
  }

  if (getFile.state === "FAILED") {
    throw new Error("❌ File processing failed on Gemini side");
  }

  console.log("✅ File successfully processed!");
  return getFile;
}

/**
 * TOPIC GENERATION - Using Gemini Flash (Key 1)
 * Model: gemini-2.0-flash-exp (Fast & efficient for extraction)
 */
async function generateTopics(file) {
  const gemini = geminiAI1 || geminiAI2;
  if (!gemini) throw new Error("Gemini API key not configured");
  
  console.log("🔍 Requesting topics from Gemini Flash...");

  const response = await gemini.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      `You are an expert educational content analyzer. Analyze this PDF document COMPREHENSIVELY and extract EVERY single distinct learning topic, concept, subject area, and theme.

CRITICAL INSTRUCTIONS:
- Extract All Main topics subjectwise/Chaperwise . 
- Make sure only cover main topic .
- Dont cover any sub topic. 

For each topic provide:
- A clear, specific title
- A brief 1-2 sentence description

Return as JSON with 'topics' array. BE COMPREHENSIVE - extract EVERYTHING relevant!`,
      createPartFromUri(file.uri, file.mimeType),
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          topics: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
              },
            },
          },
        },
      },
      temperature: 0.4,
      topK: 40,
      topP: 0.95,
    },
  });

  let responseText;
  if (typeof response.text === 'function') {
    responseText = response.text();
  } else if (response.candidates && response.candidates[0] && response.candidates[0].content) {
    responseText = response.candidates[0].content.parts[0].text;
  } else if (response.response && response.response.text) {
    responseText = response.response.text();
  } else {
    throw new Error('Unable to extract text from Gemini response');
  }
  
  const cleanJson = responseText.replace(/```json|```/g, "").trim();
  const parsedResponse = JSON.parse(cleanJson);
  
  const topics = Array.isArray(parsedResponse) ? parsedResponse : parsedResponse.topics || [];
  
  console.log(`✅ Topics generated successfully using Gemini Flash. Found ${topics.length} topics.`);
  return topics;
}

/**
 * QUIZ GENERATION - Using Gemini Pro (Key 2 if available)
 * Model: gemini-2.0-flash-thinking-exp (Better reasoning for questions)
 */
async function generateQuiz(topic, questionCount, file) {
  const gemini = getNextGemini();
  
  console.log(`🎯 Generating ${questionCount} questions for topic: "${topic}" using Gemini Pro...`);

  const response = await gemini.models.generateContent({
    model: "gemini-2.5-pro",
    contents: [
      `Create ${questionCount} challenging multiple choice questions about "${topic}" from this document. 
      
       **Rules:**
      1.  **Strictly Adhere to Document**: All questions, options, and explanations must be based *only* on the information present in the document.
      2.  **Handle Visuals**: If you encounter images, charts, or diagrams, create questions that interpret the visual information. For example, instead of asking "What is in the image?", ask "According to the chart on page 5, which product had the highest sales?". Do not include the image itself in the output.
      3.  **Four Options**: Every question must have exactly four string options.
      4.  **Provide Answer and Explanation**: Include the correct answer as a numeric index (0-3) and a brief "explanation" justifying the answer from the document's content.
      5.  **JSON Output**: The output MUST be a valid JSON object with a single root key "questions", which contains an array of question objects. Do not include any other text or markdown formatting.

      Format as JSON with 'questions' array containing:
      - question: string
      - options: array of 4 strings
      - correctAnswer: number (0-3)
      - explanation: string`,
      createPartFromUri(file.uri, file.mimeType),
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                options: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                correctAnswer: { type: Type.NUMBER },
                explanation: { type: Type.STRING },
              },
            },
          },
        },
      },
      temperature: 0.7,
    },
  });

  let responseText;
  if (typeof response.text === 'function') {
    responseText = response.text();
  } else if (response.candidates && response.candidates[0] && response.candidates[0].content) {
    responseText = response.candidates[0].content.parts[0].text;
  } else if (response.response && response.response.text) {
    responseText = response.response.text();
  } else {
    throw new Error('Unable to extract text from Gemini response');
  }
  
  const cleanJson = responseText.replace(/```json|```/g, "").trim();
  const quiz = JSON.parse(cleanJson);

  quiz.questions = quiz.questions.map((q, i) => ({
    ...q,
    id: `${topic.replace(/\s+/g, "-")}-${Date.now()}-${i}`,
  }));

  console.log(`✅ Generated ${quiz.questions.length} quiz questions using Gemini Pro.`);
  return quiz;
}

/**
 * WEAK AREA ANALYSIS - Using OpenRouter with Claude Sonnet 4.5
 * Model: anthropic/claude-sonnet-4.5 (Best analytical reasoning)
 */
async function analyzeWeakAreas(wrongAnswers) {
  console.log("🔍 Analyzing weak areas from wrong answers...");

  // Prepare the data for analysis
  const analysisData = wrongAnswers.map(wa => ({
    question: wa.question,
    topic: wa.topic,
    userAnswer: wa.userAnswer,
    correctAnswer: wa.correctAnswer,
    explanation: wa.explanation
  }));

  // Try OpenRouter Claude first, fallback to Gemini
  if (OPENROUTER_API_KEY) {
    return await analyzeWithOpenRouter(analysisData);
  } else {
    console.log("⚠️ OpenRouter not configured, using Gemini fallback");
    return await analyzeWithGemini(analysisData);
  }
}

async function analyzeWithOpenRouter(wrongAnswers) {
  console.log("🤖 Using OpenRouter (Claude Sonnet 4.5) for weak area analysis...");

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "anthropic/claude-sonnet-4.5",
        messages: [
          {
            role: "user",
            content: `You are an expert educational analyst. Analyze these wrong answers from a student and identify their weak areas with deep insights.

Wrong Answers Data:
${JSON.stringify(wrongAnswers, null, 2)}

Please provide a comprehensive analysis with:

1. **Summary**: A brief 2-3 sentence overview of the student's main weak areas and learning patterns. Be specific and insightful.

2. **Weak Topics**: Identify the top 3-5 specific topics/concepts the student struggles with most. For each topic:
   - Topic name (be specific)
   - Clear explanation of WHY they're struggling (what type of mistakes, what patterns you see)
   - Count of mistakes in this area
   - Difficulty level (beginner/intermediate/advanced)

3. **Recommendations**: Provide 4-6 specific, actionable recommendations for improvement. Make them practical and personalized.

4. **Learning Style Insights**: Brief note on what their mistakes reveal about their learning style or approach.

Return your analysis in this EXACT JSON format:
{
  "summary": "Your 2-3 sentence analysis here",
  "weakTopics": [
    {
      "topic": "Specific Topic Name",
      "reason": "Detailed explanation of the struggle and patterns",
      "mistakeCount": number,
      "difficultyLevel": "beginner|intermediate|advanced"
    }
  ],
  "recommendations": [
    "Specific, actionable recommendation 1",
    "Specific, actionable recommendation 2"
  ],
  "learningStyleInsights": "Brief insight about their learning approach"
}

Be constructive, specific, and educational. Focus on learning patterns and how to improve effectively.`
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ OpenRouter API error:", errorText);
      throw new Error(`OpenRouter API failed: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract content from OpenRouter response
    const content = data.choices[0].message.content;
    
    // Parse JSON from response (handle markdown code blocks if present)
    const cleanJson = content.replace(/```json\n?|```\n?/g, "").trim();
    const analysis = JSON.parse(cleanJson);

    console.log("✅ Weak area analysis complete with OpenRouter (Claude Sonnet 4.5)");
    console.log(`   Found ${analysis.weakTopics.length} weak areas`);
    return analysis;
    
  } catch (error) {
    console.error("❌ OpenRouter failed, falling back to Gemini:", error.message);
    return await analyzeWithGemini(wrongAnswers);
  }
}
async function getFileByName(fileName) {
  console.log(`Fetching file from Gemini: ${fileName}`);
  const file = await genAI.getFile(fileName);
  return file;
}
async function analyzeWithGemini(wrongAnswers) {
  const gemini = getNextGemini();
  console.log("🤖 Using Gemini for weak area analysis (fallback)...");

  const response = await gemini.models.generateContent({
    model: "gemini-2.0-flash-thinking-exp",
    contents: [
      `Analyze these wrong answers and identify the student's weak areas. Be specific and helpful.

Wrong Answers:
${JSON.stringify(wrongAnswers, null, 2)}

Identify:
1. Brief summary of overall weak areas (2-3 sentences)
2. Top 3-5 topics the student struggles with most, with reasons and mistake counts
3. Specific, actionable recommendations for improvement (4-6 recommendations)
4. Brief learning style insights

Format as JSON with: summary, weakTopics (array with topic, reason, mistakeCount, difficultyLevel), recommendations (array), learningStyleInsights`
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          weakTopics: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                topic: { type: Type.STRING },
                reason: { type: Type.STRING },
                mistakeCount: { type: Type.NUMBER },
                difficultyLevel: { type: Type.STRING },
              },
            },
          },
          recommendations: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          learningStyleInsights: { type: Type.STRING },
        },
      },
      temperature: 0.7,
    },
  });

  let responseText;
  if (typeof response.text === 'function') {
    responseText = response.text();
  } else if (response.candidates && response.candidates[0]) {
    responseText = response.candidates[0].content.parts[0].text;
  }

  const analysis = JSON.parse(responseText.replace(/```json|```/g, "").trim());
  console.log("✅ Weak area analysis complete with Gemini");
  console.log(`   Found ${analysis.weakTopics.length} weak areas`);
  return analysis;
}

module.exports = { 
  uploadAndProcessFile, 
  generateTopics, 
  generateQuiz,
  analyzeWeakAreas, 
  getFileByName
};

