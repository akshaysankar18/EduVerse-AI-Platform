/**
 * Google Gemini AI Configuration
 * ================================
 * Initialises the Gemini Generative AI client and exports
 * a configured model instance ready for use across services.
 */

const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const logger = require('../utils/logger');

let geminiClient;
let geminiModel;

const initGemini = () => {
  if (geminiClient) return { geminiClient, geminiModel };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    logger.warn('⚠️  GEMINI_API_KEY not set — AI features will be unavailable');
    return { geminiClient: null, geminiModel: null };
  }

  try {
    geminiClient = new GoogleGenerativeAI(apiKey);

    // Default safety settings
    const safetySettings = [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT,        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,       threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ];

    // Default generation config
    const generationConfig = {
      temperature     : 0.9,
      topK            : 1,
      topP            : 1,
      maxOutputTokens : 8192,
    };

    const modelName = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
    geminiModel = geminiClient.getGenerativeModel({
      model          : modelName,
      safetySettings,
      generationConfig,
    });

    logger.info(`✅ Gemini AI initialised with model: ${modelName}`);
  } catch (error) {
    logger.error('❌ Gemini AI initialisation failed:', error.message);
  }

  return { geminiClient, geminiModel };
};

// Initialise on first require
const { geminiClient: client, geminiModel: model } = initGemini();

module.exports = {
  geminiClient : client,
  geminiModel  : model,
  getVisionModel: () => {
    if (!client) return null;
    return client.getGenerativeModel({ model: 'gemini-3.1-flash-lite' });
  },
};
