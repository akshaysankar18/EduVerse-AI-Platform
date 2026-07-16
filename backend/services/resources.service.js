/**
 * Learning Resources Service
 * ===========================
 * Generates structured learning resource lists using Google Gemini.
 */

const { geminiModel } = require('../config/gemini');
const logger = require('../utils/logger');

/** Strip markdown code fences that Gemini sometimes wraps JSON in. */
const stripFences = (raw) =>
  raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

/**
 * Generate structured learning resources list based on a topic, subject, and difficulty level.
 * @param {string} topic
 * @param {string} subject
 * @param {string} level
 * @returns {Promise<object>}
 */
const generateResources = async (topic, subject, level = 'intermediate') => {
  if (!geminiModel) {
    throw new Error('Gemini API is not configured.');
  }

  const prompt = `Generate a structured list of highly recommended study and practice resources for:
Topic: ${topic}
Subject: ${subject}
Level: ${level}

Return valid JSON ONLY (no extra text, no markdown block formatting). The JSON must have this exact structure:
{
  "youtube": [
    {
      "title": "A specific high-quality YouTube video title or playlist",
      "channel": "Name of the YouTube channel",
      "url": "https://www.youtube.com/results?search_query=<url_encoded_search_query_containing_channel_and_title>",
      "description": "Brief description of what this video/playlist covers and why it is useful"
    }
  ],
  "documentation": [
    {
      "title": "Official documentation page or specification guide",
      "url": "https://www.google.com/search?q=<url_encoded_search_query_containing_official_documentation_for_topic>",
      "description": "Why this official resource is indispensable"
    }
  ],
  "websites": [
    {
      "title": "Name of a major authoritative website or tutorial article",
      "url": "https://www.google.com/search?q=<url_encoded_search_query_containing_subject_topic_and_title>",
      "description": "Short explanation of the website contents and how it helps"
    }
  ],
  "tutorials": [
    {
      "title": "A step-by-step beginner guide or crash course link",
      "url": "https://www.google.com/search?q=<url_encoded_search_query_containing_beginner_guide_or_crash_course_for_topic>",
      "description": "How this tutorial eases the learning curve"
    }
  ],
  "practice": [
    {
      "title": "Interactive practice, lab, or quiz platform name",
      "url": "https://www.google.com/search?q=<url_encoded_search_query_containing_practice_platform_name_and_topic_practice>",
      "description": "Explanation of what kind of practice questions/tasks this platform offers"
    }
  ],
  "github": [
    {
      "title": "Relevant GitHub repository or open source project",
      "url": "https://www.google.com/search?q=<url_encoded_search_query_containing_github_repository_for_topic>",
      "description": "What code, templates, or resources are inside this repo"
    }
  ],
  "pdfNotes": [
    {
      "title": "Authoritative PDF guide, cheat sheet, or lecture slides",
      "url": "https://www.google.com/search?q=<url_encoded_search_query_containing_pdf_cheat_sheet_or_lecture_notes_for_topic>",
      "description": "What summary topics or concepts this PDF cheat sheet is useful for"
    }
  ],
  "researchPapers": [
    {
      "title": "Academic paper or foundational research publication",
      "url": "https://www.google.com/search?q=<url_encoded_search_query_containing_scientific_research_paper_or_academic_publication_for_topic>",
      "description": "Key contribution or thesis of this research paper"
    }
  ],
  "tips": [
    "Practical study tip 1",
    "Practical study tip 2",
    "Practical study tip 3"
  ]
}

Provide exactly 2-3 items for each of the eight array categories. To guarantee the URLs work, they MUST be structured as the Google Search or YouTube search query links defined above.`;

  logger.info(`[Resources Service] Querying Gemini for ${subject} - ${topic} (${level})`);
  const result = await geminiModel.generateContent(prompt);
  const rawText = result.response.text();
  
  try {
    const jsonStr = stripFences(rawText);
    const parsedData = JSON.parse(jsonStr);
    return parsedData;
  } catch (parseErr) {
    logger.error('[Resources Service] Failed to parse Gemini response as JSON. Raw text length:', rawText.length);
    logger.debug('[Resources Service] Raw response:', rawText);
    throw new Error('Gemini response was not in valid JSON format. Please try again.');
  }
};

module.exports = {
  generateResources,
};
