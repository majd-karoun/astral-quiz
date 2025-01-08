const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const app = express();

// Enable CORS for all origins
app.use(cors());
app.use(express.json());

// Rate limiting setup
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS = 50;
const requestCounts = new Map();

// Rate limiting middleware
const rateLimiter = (req, res, next) => {
  const apiKey = req.headers.authorization?.split('Bearer ')?.[1];
  if (!apiKey) return next();

  const now = Date.now();
  const userRequests = requestCounts.get(apiKey) || [];
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

// Helper functions
const validateApiKey = (apiKey) => {
  return typeof apiKey === 'string' && apiKey.startsWith('sk-') && apiKey.length > 20;
};

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
}`;
};

// Main question generation endpoint
app.post('/api/generate-questions', async (req, res) => {
  console.log('Received question generation request');
  
  try {
    const { topic } = req.body;
    const apiKey = req.headers.authorization?.split('Bearer ')?.[1];

    if (!apiKey) {
      return res.status(401).json({ error: 'API key is required' });
    }

    if (!validateApiKey(apiKey)) {
      return res.status(401).json({ error: 'Invalid API key format' });
    }

    if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
      return res.status(400).json({ error: 'Valid topic is required' });
    }

    const openai = new OpenAI({ apiKey });

    const completion = await openai.chat.completions.create({
      messages: [{ 
        role: "user", 
        content: constructPrompt(topic)
      }],
      model: "gpt-4o-mini",
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    let parsedData;
    try {
      parsedData = JSON.parse(completion.choices[0].message.content);
      
      if (!parsedData.questions || !Array.isArray(parsedData.questions)) {
        throw new Error('Invalid response format: missing questions array');
      }

      parsedData.questions = parsedData.questions.map((q, index) => ({
        main_question: q.main_question || `Question ${index + 1}`,
        answer_options: Array.isArray(q.answer_options) && q.answer_options.length === 4 
          ? q.answer_options 
          : ['Option A', 'Option B', 'Option C', 'Option D'],
        correct_answer_index: typeof q.correct_answer_index === 'number' && 
                            q.correct_answer_index >= 0 && 
                            q.correct_answer_index <= 3
          ? q.correct_answer_index
          : 0,
        helpful_hint: q.helpful_hint || `Hint ${index + 1}: Think about the related concepts.`
      }));

      parsedData.questions = parsedData.questions.slice(0, 15);
      
    } catch (parseError) {
      console.error('Parse error:', parseError);
      return res.status(500).json({ 
        error: 'Failed to parse OpenAI response',
        details: parseError.message
      });
    }

    res.json(parsedData);

  } catch (error) {
    console.error('OpenAI API Error:', error);
    
    if (error.response?.status === 401) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    
    if (error.response?.status === 429) {
      return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }

    res.status(500).json({
      error: 'Failed to generate questions',
      details: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString()
  });
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