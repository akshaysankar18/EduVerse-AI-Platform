/**
 * Career Hub Controller
 * ======================
 * Resume review and interview preparation via Gemini AI.
 */

const { v4: uuidv4 } = require('uuid');
const geminiService  = require('../services/gemini.service');
const storageService = require('../services/storage.service');
const { createDoc, queryDocs } = require('../services/firebase.service');
const { sendSuccess, sendError } = require('../utils/response');
const logger = require('../utils/logger');

const CAREER_COLLECTION = 'careerActivity';

// ── POST /api/career/resume/review ────────────────────────────
const reviewResume = async (req, res, next) => {
  try {
    const uid = req.user.uid;
    let resumeText = req.body.resumeText || '';
    let fileURL    = '';
    let fileName   = '';

    // If a file is attached, extract and analyse it
    if (req.file) {
      try {
        const upload = await storageService.uploadFile(
          req.file.buffer,
          req.file.originalname,
          req.file.mimetype,
          `career/${uid}/resumes`,
        );
        fileURL  = upload.url;
        fileName = upload.fileName;
      } catch (storageErr) {
        logger.warn(`[Career] Storage upload failed, using fallback: ${storageErr.message}`);
        fileURL  = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64').slice(0, 100)}...`;
        fileName = req.file.originalname;
      }

      // Use Gemini to extract text from PDF/image before reviewing
      const extraction = await geminiService.analyseFile(
        req.file.buffer,
        req.file.mimetype,
        'Extract all text content from this resume document.',
      );
      resumeText = extraction.text;
    }

    if (!resumeText.trim()) {
      return sendError(res, { statusCode: 400, message: 'Resume text or file is required' });
    }

    const { targetRole = '' } = req.body;
    const result = await geminiService.reviewResume(resumeText, targetRole);

    // Save the review
    const id  = uuidv4();
    const doc = {
      id,
      userId    : uid,
      type      : 'resume_review',
      targetRole,
      fileURL,
      fileName,
      feedback  : result.text,
      tokens    : result.tokens,
      createdAt : new Date().toISOString(),
    };
    await createDoc(CAREER_COLLECTION, id, doc);

    logger.info(`[Career] Resume review for user ${uid}`);
    return sendSuccess(res, { message: 'Resume reviewed', data: { feedback: result.text, id } });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/career/interview/start ──────────────────────────
const startInterview = async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const { role, level = 'mid', type = 'technical' } = req.body;

    if (!role) return sendError(res, { statusCode: 400, message: 'role is required' });

    let questionsList = [];
    try {
      const result = await geminiService.generateInterviewQuestions(role, level, type);

      // Extract questions list robustly
      if (result) {
        if (Array.isArray(result)) {
          questionsList = result;
        } else if (result.questions && Array.isArray(result.questions)) {
          questionsList = result.questions;
        } else if (result.Questions && Array.isArray(result.Questions)) {
          questionsList = result.Questions;
        }
      }
    } catch (geminiErr) {
      logger.warn(`[Career] Gemini question generation failed: ${geminiErr.message}. Using fallback.`);
    }

    if (questionsList.length === 0) {
      logger.info(`[Career] Generating fallback interview questions for role: ${role}`);
      questionsList = [
        {
          id: 1,
          question: `What are your core technical strengths as a ${role}?`,
          category: "General",
          difficulty: "easy",
          hint: "Focus on languages, frameworks, and architecture patterns relevant to this role."
        },
        {
          id: 2,
          question: "Describe a challenging technical problem you solved recently and how you approached it.",
          category: "Problem Solving",
          difficulty: "medium",
          hint: "Use the STAR method: Situation, Task, Action, Result."
        },
        {
          id: 3,
          question: "How do you ensure code quality, testing, and performance in your production applications?",
          category: "Engineering Practices",
          difficulty: "medium",
          hint: "Mention unit testing, integration tests, CI/CD, and profiling tools."
        },
        {
          id: 4,
          question: "How do you handle conflict or differing technical opinions within a development team?",
          category: "Soft Skills",
          difficulty: "easy",
          hint: "Emphasize collaboration, objective assessment of tradeoffs, and constructive discussion."
        },
        {
          id: 5,
          question: "Where do you see the future of this domain heading in the next 3-5 years, and how do you stay updated?",
          category: "Industry trends",
          difficulty: "easy",
          hint: "Mention blogs, newsletters, open source contributions, or learning new tools."
        }
      ];
    }

    // Persist session
    const sessionId = uuidv4();
    const session   = {
      id       : sessionId,
      userId   : uid,
      type     : 'interview_session',
      role,
      level,
      interviewType: type,
      questions: questionsList,
      createdAt: new Date().toISOString(),
    };
    await createDoc(CAREER_COLLECTION, sessionId, session);

    logger.info(`[Career] Interview session ${sessionId} for user ${uid}`);
    return sendSuccess(res, {
      statusCode: 201,
      message   : 'Interview questions generated',
      data      : { sessionId, questions: questionsList },
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/career/history ───────────────────────────────────
const getCareerHistory = async (req, res, next) => {
  try {
    const history = await queryDocs(
      CAREER_COLLECTION,
      [['userId', '==', req.user.uid]],
      'createdAt',
      'desc',
      20,
    );
    return sendSuccess(res, { data: history });
  } catch (error) {
    next(error);
  }
};

module.exports = { reviewResume, startInterview, getCareerHistory };
