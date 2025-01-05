const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting constants
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS = 50;
const requestCounts = new Map();

// Rate limiting middleware
const rateLimiter = (req, res, next) => {
  const apiKey = req.headers.authorization?.split('Bearer ')?.[1];
  if (!apiKey) return next();

  const now = Date.now();
  const userRequests = requestCounts.get(apiKey) || [];
  
  // Remove requests outside the current window
  const validRequests = userRequests.filter(time => time > now - RATE_LIMIT_WINDOW);
  
  if (validRequests.length >= MAX_REQUESTS) {
    return res.status(429).json({
      error: 'Rate limit exceeded. Please try again later.',
      resetTime: new Date(validRequests[0] + RATE_LIMIT_WINDOW)
    });
  }
  
  validRequests.push(now);
  requestCounts.set(apiKey, validRequests);
  next();
};

app.use(rateLimiter);

// Helper function to validate OpenAI API key
const validateApiKey = (apiKey) => {
  return typeof apiKey === 'string' && apiKey.startsWith('sk-') && apiKey.length > 20;
};

// Helper function to construct the quiz generation prompt
const constructPrompt = (topic) => {
  return `Create 15 quiz questions about ${topic} with increasing difficulty levels:
 - Questions 1-3: Very Easy (50 points each)
 - Questions 4-5: Easy (100 points each)
 - Questions 6-10: Medium (200 points each)
 - Questions 11-13: Hard (500 points each)
 - Questions 14-15: Very Hard (1000 points each)
 
For each question, provide:
1. Main question
2. Four answer options (a, b, c, d)
3. Correct answer index (0-3)
4. A helpful hint that gives a clue without revealing the answer directly

Requirements for questions:
- Make questions clear and unambiguous
- Ensure all answer options are plausible
- Avoid overly technical language unless appropriate for the topic
- Include relevant context when necessary

Requirements for hints:
- Hints should guide thinking without revealing the answer
- Make hints specific to the question content
- Include relevant background information or problem-solving strategies
- For calculation questions, suggest solution approaches
- For knowledge questions, point to related concepts

Format as a JSON object with this structure:
{
  "questions": [
    {
      "main_question": "string",
      "answer_options": ["string", "string", "string", "string"],
      "correct_answer_index": number,
      "helpful_hint": "string"
    }
  ]
}

Example hint formats:
- History: "This event occurred during the same period as the Industrial Revolution"
- Science: "This concept is closely related to Newton's Third Law"
- Math: "Try solving this step-by-step, starting with the basic formula"
- Geography: "This location is known for its unique climate conditions"
- Literature: "This author was part of the Romantic movement"

Make sure each hint provides meaningful guidance without giving away the answer.`;
};

// Main question generation endpoint
app.post('/api/generate-questions', async (req, res) => {
  try {
    const { topic } = req.body;
    const apiKey = req.headers.authorization?.split('Bearer ')?.[1];

    // Validate inputs
    if (!apiKey) {
      return res.status(401).json({ error: 'API key is required' });
    }

    if (!validateApiKey(apiKey)) {
      return res.status(401).json({ error: 'Invalid API key format' });
    }

    if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
      return res.status(400).json({ error: 'Valid topic is required' });
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: apiKey
    });

    // Generate questions
    const completion = await openai.chat.completions.create({
      messages: [{ 
        role: "user", 
        content: constructPrompt(topic)
      }],
      model: "gpt-4o-mini",
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const responseData = completion.choices[0].message.content;

    // Parse and validate response
    let parsedData;
    try {
      parsedData = JSON.parse(responseData);
      
      // Validate structure
      if (!parsedData.questions || !Array.isArray(parsedData.questions)) {
        throw new Error('Invalid response format: missing questions array');
      }

      // Validate each question
      parsedData.questions = parsedData.questions.map((q, index) => {
        // Validate question structure
        if (!q.main_question || !Array.isArray(q.answer_options) || 
            q.correct_answer_index === undefined || !q.hint) {
          throw new Error(`Invalid question format at index ${index}`);
        }

        // Validate answer options
        if (q.answer_options.length !== 4) {
          throw new Error(`Invalid number of answer options at index ${index}`);
        }

        // Validate correct answer index
        if (q.correct_answer_index < 0 || q.correct_answer_index > 3) {
          throw new Error(`Invalid correct answer index at index ${index}`);
        }

        // Ensure hint exists and is meaningful
        if (!q.hint || q.hint.trim() === '') {
          q.hint = `Tipp ${index + 1}: Analysiere die Beziehungen zwischen den Antwortmöglichkeiten und denke an verwandte Konzepte.`;
        }

        return q;
      });

      // Ensure we have exactly 15 questions
      if (parsedData.questions.length !== 15) {
        throw new Error('Invalid number of questions generated');
      }

    } catch (parseError) {
      console.error('Parse error:', parseError);
      console.error('Raw response:', responseData);
      return res.status(500).json({ 
        error: 'Failed to parse OpenAI response',
        details: parseError.message
      });
    }

    // Send successful response
    res.json(parsedData);

  } catch (error) {
    console.error('OpenAI API Error:', error);
    
    // Handle specific OpenAI errors
    if (error.response?.status === 401) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    
    if (error.response?.status === 429) {
      return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }

    // Handle general errors
    res.status(500).json({
      error: 'Failed to generate questions',
      details: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {  
  console.log(`Server running on port ${PORT}`);
});