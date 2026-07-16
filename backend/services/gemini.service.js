/**
 * Gemini AI Service
 * ==================
 * Wraps Gemini API calls for all AI features across EduVerse.
 * Falls back gracefully when the API key is not configured.
 */

const { geminiModel, getVisionModel } = require('../config/gemini');
const logger = require('../utils/logger');

// ── Helper ────────────────────────────────────────────────────

const notConfigured = (feature) => ({
  text   : `[${feature}] Gemini API not configured. Please set GEMINI_API_KEY.`,
  tokens : 0,
});

/** Strip markdown code fences that Gemini sometimes wraps JSON in. */
const stripFences = (raw) =>
  raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

// ── AI Mentor ─────────────────────────────────────────────────

/**
 * Send a chat message to the AI mentor.
 * @param {string}   message        - User's latest message
 * @param {Array}    history         - Prior { role, text } pairs
 * @param {string}   systemContext   - Optional persona / context
 */
const runAI = async (fn, fallbackMessage = 'Our AI study assistant is currently experiencing high load. Please try again in a few moments.') => {
  try {
    return await fn();
  } catch (error) {
    logger.error('[Gemini Service Error]:', error);
    throw new Error(fallbackMessage);
  }
};

// ── AI Mentor ─────────────────────────────────────────────────

/**
 * Send a chat message to the AI mentor.
 * @param {string}   message        - User's latest message
 * @param {Array}    history         - Prior { role, text } pairs
 * @param {string}   systemContext   - Optional persona / context
 */
const mentorChat = async (message, history = [], systemContext = '') => {
  if (!geminiModel) return notConfigured('AI Mentor');

  return runAI(async () => {
    const systemPrompt = systemContext || `You are EduBot, an expert AI study mentor for EduVerse AI.
You help students understand complex concepts, answer questions clearly, and motivate them.

RULES:
1. If the user asks for study materials, learning resources, websites, YouTube videos, or books, provide them inline. To ensure the links are 100% valid, ALWAYS construct them as search URLs:
   - YouTube search: https://www.youtube.com/results?search_query=<url_encoded_terms>
   - Google search: https://www.google.com/search?q=<url_encoded_terms>
   Example: [MDN JavaScript Guide](https://www.google.com/search?q=MDN+JavaScript+Guide)
2. If the user comes from a quiz elaboration prompt (e.g. asking to elaborate on a question/explanation), first explain the concept clearly and normally. DO NOT dump list links initially. Explain the concept step-by-step.
3. If the user indicates they still do not understand, are confused, or explicitly ask for resources after your explanation, THEN recommend relevant YouTube and Google search links using the URL pattern from Rule 1.
4. Keep answers concise, helpful, friendly, and encouraging.`;

    const formattedHistory = history.map(h => ({
      role : h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.text }],
    }));

    const chat = geminiModel.startChat({
      history: [
        { role: 'user',  parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: 'Understood! I am EduBot, your personal AI mentor. How can I help you today?' }] },
        ...formattedHistory,
      ],
    });

    const result = await chat.sendMessage(message);
    const text   = result.response.text();
    logger.debug(`[Gemini] Mentor chat — ${text.length} chars`);
    return { text, tokens: result.response.usageMetadata?.totalTokenCount || 0 };
  }, 'The AI Mentor is currently offline or busy. Please try asking again.');
};

// ── PDF / Image Analysis ──────────────────────────────────────

/**
 * Analyse a PDF or image buffer.
 * @param {Buffer} fileBuffer
 * @param {string} mimeType    - e.g. 'application/pdf', 'image/jpeg'
 * @param {string} prompt
 */
const analyseFile = async (fileBuffer, mimeType, prompt) => {
  const model = getVisionModel();
  if (!model) return notConfigured('File Analysis');

  return runAI(async () => {
    let result;
    if (mimeType === 'text/plain') {
      const fileContent = fileBuffer.toString('utf-8');
      const fullPrompt = `${prompt}\n\nHere is the document content:\n${fileContent}`;
      result = await model.generateContent(fullPrompt);
    } else {
      const inlineData = {
        data     : fileBuffer.toString('base64'),
        mimeType,
      };
      result = await model.generateContent([prompt, { inlineData }]);
    }

    const text   = result.response.text();
    logger.debug(`[Gemini] File analysis — ${text.length} chars`);
    return { text, tokens: result.response.usageMetadata?.totalTokenCount || 0 };
  }, 'Failed to analyze the document. Please ensure it is a valid file and try again.');
};

// ── Notes Generation ─────────────────────────────────────────

/**
 * Generate structured study notes from a topic.
 */
const generateNotes = async (topic, subject, level = 'intermediate') => {
  if (!geminiModel) return notConfigured('Notes Generator');

  return runAI(async () => {
    const prompt = `Create comprehensive, well-structured study notes for the following:
Topic: ${topic}
Subject: ${subject}
Level: ${level}

Format the notes in Markdown with:
- A clear introduction
- Key concepts with explanations
- Important formulas or rules (if applicable)
- Real-world examples
- A quick-revision summary at the end
- Practice questions (3–5)

Keep the language clear and student-friendly.`;

    const result = await geminiModel.generateContent(prompt);
    return { text: result.response.text(), tokens: result.response.usageMetadata?.totalTokenCount || 0 };
  }, 'Failed to generate study notes. Please check the topic and try again.');
};

// ── Quiz Generation ──────────────────────────────────────────

/**
 * Generate multiple-choice quiz questions from a topic (used by Quiz Center).
 * @returns {Promise<{ questions: Array }>}
 */
const generateQuiz = async (topic, subject, difficulty = 'medium', numQuestions = 10) => {
  if (!geminiModel) return { questions: [] };

  return runAI(async () => {
    const prompt = `Generate ${numQuestions} multiple-choice questions about "${topic}" in ${subject}.
Difficulty: ${difficulty}

Return a valid JSON array ONLY (no markdown, no explanation) with this exact structure:
[
  {
    "question": "...",
    "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
    "correctIndex": 0,
    "explanation": "..."
  }
]`;

    const result    = await geminiModel.generateContent(prompt);
    const questions = JSON.parse(stripFences(result.response.text()));
    return { questions };
  }, 'Failed to generate quiz questions. Please try again.');
};

// ── Learning Roadmap ─────────────────────────────────────────

/**
 * Generate a structured learning roadmap.
 */
const generateRoadmap = async (goal, subject, level = 'beginner', weeks = 4) => {
  if (!geminiModel) return notConfigured('Roadmap Generator');

  return runAI(async () => {
    const prompt = `Create a ${weeks}-week learning roadmap for:
Goal: ${goal}
Subject: ${subject}
Level: ${level}

Return valid JSON ONLY with this structure:
{
  "title": "...",
  "modules": [
    {
      "id": "m1",
      "title": "Week 1: ...",
      "steps": [
        {
          "id": "s1",
          "title": "...",
          "description": "...",
          "type": "article|video|exercise|project",
          "estimatedHours": 2,
          "completed": false
        }
      ]
    }
  ]
}`;

    const result  = await geminiModel.generateContent(prompt);
    return JSON.parse(stripFences(result.response.text()));
  }, 'Failed to create your learning roadmap. Please check the goal and try again.');
};

// ── Resume Review ────────────────────────────────────────────

/**
 * Review a resume / CV text.
 */
const reviewResume = async (resumeText, targetRole = '') => {
  if (!geminiModel) return notConfigured('Resume Review');

  return runAI(async () => {
    const prompt = `You are a professional career coach. Review the following resume${targetRole ? ` for the role of ${targetRole}` : ''}.

Provide structured feedback in Markdown:
- **Overall Score** (out of 10)
- **Strengths**
- **Areas for Improvement**
- **ATS Optimisation Tips**
- **Suggested Additions**
- **Revised Summary / Objective** (rewritten example)

Resume:
${resumeText}`;

    const result = await geminiModel.generateContent(prompt);
    return { text: result.response.text(), tokens: result.response.usageMetadata?.totalTokenCount || 0 };
  }, 'Failed to review the resume. Please check the text and try again.');
};

// ── Interview Prep ───────────────────────────────────────────

/**
 * Generate interview questions for a role.
 */
const generateInterviewQuestions = async (role, level = 'mid', type = 'technical') => {
  if (!geminiModel) return notConfigured('Interview Prep');

  return runAI(async () => {
    const prompt = `Generate 10 realistic ${type} interview questions for a ${level}-level ${role} position.

Return valid JSON ONLY:
{
  "questions": [
    {
      "id": 1,
      "question": "...",
      "category": "...",
      "difficulty": "easy|medium|hard",
      "hint": "..."
    }
  ]
}`;

    const result = await geminiModel.generateContent(prompt);
    return JSON.parse(stripFences(result.response.text()));
  }, 'Failed to generate interview questions. Please try again.');
};

// ── Notes Assistant — Content Generation ─────────────────────

/**
 * Generate study flashcards from note content.
 * @param {string} content - Full note text
 * @returns {Promise<Array<{ question: string, answer: string }>>}
 */
const generateFlashcardsFromContent = async (content) => {
  if (!geminiModel) return [];

  return runAI(async () => {
    const prompt = `Based on the following study notes, generate between 6 and 10 high-quality flashcards.
Each flashcard must have a "question" (the front) and an "answer" (the back).
Return a valid JSON array ONLY — no markdown fences, no explanation, no extra text.

[
  { "question": "...", "answer": "..." }
]

Study Notes:
${content}`;

    const result  = await geminiModel.generateContent(prompt);
    const parsed  = JSON.parse(stripFences(result.response.text()));
    logger.debug(`[Gemini] Generated ${parsed.length} flashcards`);
    return parsed;
  }, 'Failed to generate flashcards from this note.');
};

/**
 * Generate MCQ quiz questions from note content.
 * @param {string} content
 * @param {string} topic
 * @param {string} subject
 * @param {string} difficulty
 * @param {number} numQuestions
 * @returns {Promise<{ questions: Array }>}
 */
const generateQuizFromContent = async (
  content,
  topic,
  subject,
  difficulty = 'medium',
  numQuestions = 5,
) => {
  if (!geminiModel) return { questions: [] };

  return runAI(async () => {
    const prompt = `Based on the following study notes, generate ${numQuestions} multiple-choice quiz questions.
Topic: ${topic}
Subject: ${subject}
Difficulty: ${difficulty}

Return a valid JSON array ONLY — no markdown fences, no explanation, no extra text.

[
  {
    "question": "...",
    "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
    "correctIndex": 0,
    "explanation": "..."
  }
]

Study Notes:
${content}`;

    const result    = await geminiModel.generateContent(prompt);
    const questions = JSON.parse(stripFences(result.response.text()));
    logger.debug(`[Gemini] Generated ${questions.length} quiz questions from note`);
    return { questions };
  }, 'Failed to generate quiz questions from this note.');
};

/**
 * Generate a structured mind-map / concept tree from note content.
 * @param {string} content
 * @returns {Promise<{ name: string, children: Array }>}
 */
const generateMindmapFromContent = async (content) => {
  if (!geminiModel) return { name: 'Root Concept', children: [] };

  return runAI(async () => {
    const prompt = `Based on the following study notes, generate a hierarchical mind map.
The root should be the main topic; each child should be a key sub-concept with its own children.
Return a valid JSON object ONLY — no markdown fences, no explanation, no extra text.

{
  "name": "Root Concept Name",
  "children": [
    {
      "name": "Sub-concept 1",
      "children": [
        { "name": "Detail 1.1", "children": [] },
        { "name": "Detail 1.2", "children": [] }
      ]
    }
  ]
}

Study Notes:
${content}`;

    const result = await geminiModel.generateContent(prompt);
    const tree   = JSON.parse(stripFences(result.response.text()));
    logger.debug(`[Gemini] Generated mind map with ${tree.children?.length ?? 0} top-level nodes`);
    return tree;
  }, 'Failed to generate mind map from this note.');
};

/**
 * Answer a follow-up question about a note using its content as context.
 * @param {string} question  - User's question
 * @param {string} content   - Note content used as context
 * @returns {Promise<{ answer: string }>}
 */
const answerNoteQuestion = async (question, content) => {
  if (!geminiModel) return { answer: 'Gemini API not configured.' };

  return runAI(async () => {
    const prompt = `You are a knowledgeable study assistant. Answer the following question using ONLY the study notes provided below. Be concise and accurate.

Question: ${question}

Study Notes:
${content}`;

    const result = await geminiModel.generateContent(prompt);
    const answer = result.response.text().trim();
    logger.debug(`[Gemini] Answered note question (${answer.length} chars)`);
    return { answer };
  }, 'Failed to answer the question based on these notes.');
};

// ── Exports ───────────────────────────────────────────────────

module.exports = {
  mentorChat,
  analyseFile,
  generateNotes,
  generateQuiz,
  generateRoadmap,
  reviewResume,
  generateInterviewQuestions,
  // Notes Assistant helpers
  generateFlashcardsFromContent,
  generateQuizFromContent,
  generateMindmapFromContent,
  answerNoteQuestion,
};
