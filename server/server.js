const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const app = express();

// Enable CORS with specific configuration
const corsOptions = {
  origin: ['http://localhost:5174', 'http://localhost:5173', 'https://astral-quiz.netlify.app', 'https://*.netlify.app','http://192.168.2.101:5173'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Connection'],
  credentials: true
}

app.use(cors(corsOptions));
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

const constructPrompt = (topic, batchSize = 3) => {
  return `Create ${batchSize} quiz questions about ${topic} with increasing difficulty based on the question number:
 - Questions 1-3: Very Easy
 - Questions 4-5: Easy
 - Questions 6-10: Medium
 - Questions 11-13: Hard
 - Questions 14-15: Very Hard

For each question, provide:
1. Main question
2. Four answer options (a, b, c, d)
3. Correct answer number (0-3)
4. A helpful hint that gives a tip without revealing the answer directly
5. Use an emoji at the end of each question sentence (after question mark).

Make sure the 15 questions aren't random trivia like, but usefull, releated to each other and represent a cheatsheet about the chosen topic.

Format the output as a JSON object with this structure:
{
  "questions": [
    {
      "mainQuestion": "string",
      "answerOptions": ["string", "string", "string", "string"],
      "correctAnswerIndex": number,
      "helpfulHint": "string"
    }
  ]
}`;
};

const constructVeryHardPrompt = (topic, batchSize = 5) => {
  return `Create ${batchSize} VERY HARD quiz questions about ${topic}. These should be extremely difficult questions (1000 points per question) for experts who have already answered 15 progressively difficult questions.

For each question, provide:
1. Main question
2. Four answer options (a, b, c, d)
3. Correct answer number (0-3)
4. A helpful hint that gives a tip without revealing the answer directly
5. Use an emoji at the end of each question sentence (after question mark).

Make sure the questions aren't random trivia like, but usefull, releated to each other and represent a cheatsheet about the chosen topic.


Format the output as a JSON object with this structure:
{
  "questions": [
    {
      "mainQuestion": "string",
      "answerOptions": ["string", "string", "string", "string"],
      "correctAnswerIndex": number,
      "helpfulHint": "string"
    }
  ]
}`;
};

// Main question generation endpoint
app.post('/api/generate-questions', async (req, res) => {
  try {
    const { topic, startIndex = 0, batchSize = 3, isVeryHardMode = false, model = 'gpt-4o-mini' } = req.body;
    console.log('Using model:', model);
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

    const openai = new OpenAI({ 
      apiKey,
      timeout: 30000,
      maxRetries: 1
    });

    try {
      // Create a completion with streaming enabled and optimized settings
      const stream = await openai.chat.completions.create({
        messages: [{ 
          role: "user", 
          content: isVeryHardMode ? constructVeryHardPrompt(topic, batchSize) : constructPrompt(topic, batchSize)
        }],
        model: model,
        stream: true,
        response_format: { type: "json_object" }
      });

      // Set headers for streaming with optimizations
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Transfer-Encoding', 'chunked');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    
    // Initialize variables to track the state
    let buffer = '';
    let questionCount = 0;
    
    // Process the stream
    for await (const chunk of stream) {
      const content = chunk.choices?.[0]?.delta?.content;
      if (content) {
        buffer += content;
        
        // Try to extract complete questions
        try {
          if (buffer.includes('"mainQuestion"') && buffer.includes('"correctAnswerIndex"')) {
            const questionMatches = buffer.match(/{[^{]*"mainQuestion"[^{]*"correctAnswerIndex"[^{}]*}/g);
            
            if (questionMatches && questionMatches.length > 0) {
              for (const match of questionMatches) {
                try {
                  const questionObj = JSON.parse(match);
                  
                  // Validate the question object
                  if (questionObj.mainQuestion && 
                      Array.isArray(questionObj.answerOptions) && 
                      questionObj.answerOptions.length === 4 &&
                      typeof questionObj.correctAnswerIndex === 'number' &&
                      questionObj.helpfulHint) {
                    
                    // Send the question to the client
                    const questionJson = JSON.stringify(questionObj);
                    console.log(`Question ${questionCount + 1} sent:`, questionObj.mainQuestion);
                    
                    // Send question directly as individual JSON object
                    res.write(questionJson);
                    if (res.flush) res.flush();
                    
                    questionCount++;
                    
                    // Remove the processed question from the buffer
                    buffer = buffer.replace(match, '');
                  }
                } catch (e) {
                  // Skip invalid JSON fragments
                }
              }
            }
          }
        } catch (e) {
          // Skip parsing errors
        }
      }
    }
    
      // End the response
      res.end();
    } catch (streamError) {
      // Handle streaming errors
      console.error('OpenAI Streaming Error:', streamError);
      res.status(500).json({
        error: 'Failed to generate questions',
        details: streamError.message
      });
    }
  } catch (error) {
    console.error('OpenAI API Error:', error);
    
    if (error.status === 401 || error.code === 'invalid_api_key') {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    
    if (error.status === 429) {
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
const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {  
  console.log(`Server running on port ${PORT}`);
});
