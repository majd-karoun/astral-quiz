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

const constructPrompt = (topic, batchSize = 3) => {
  return `Create ${batchSize} quiz questions about ${topic} with increasing difficulty levels based on the question number:
 - Questions 1-3: Very Easy (50 points each) 
 - Questions 4-5: Easy (100 points each)
 - Questions 6-10: Medium (200 points each)
 - Questions 11-13: Hard (500 points each)
 - Questions 14+: Very Hard (1000 points each)
 
 
For each question, provide:
1. Main question
2. Four answer options (a, b, c, d)
3. Correct answer index (0-3)
4. A helpful hint that gives a clue without revealing the answer directly
5. use emojis with questions and answers.

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
    const { topic, startIndex = 0, batchSize = 3 } = req.body;
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

    try {
      // Create a completion with streaming enabled
      const stream = await openai.chat.completions.create({
        messages: [{ 
          role: "user", 
          content: constructPrompt(topic, batchSize)
        }],
        model: "gpt-4o-mini",
        temperature: 0.7,
        stream: true,
        response_format: { type: "json_object" }
      });

      // Set headers for streaming
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Transfer-Encoding', 'chunked');
    
    // Initialize variables to track the state
    let buffer = '';
    let questionCount = 0;
    
    // Start the response with the opening structure
    res.write('{"questions":[');
    console.log("Started streaming response to client");
    
    // Process the stream
    for await (const chunk of stream) {
      const content = chunk.choices?.[0]?.delta?.content;
      if (content) {
        console.log(`Chunk received: ${content.length} characters`);
        buffer += content;
        
        // Try to extract complete questions as they come in
        try {
          // Check if we have a complete JSON object with a question
          if (buffer.includes('"main_question"') && buffer.includes('"correct_answer_index"')) {
            // Extract question objects from the buffer using a more robust regex
            const matches = buffer.match(/{[^{]*"main_question"[^{]*"correct_answer_index"[^{}]*}/g);
            
            if (matches && matches.length > 0) {
              for (const match of matches) {
                try {
                  // Try to parse the question object
                  const questionObj = JSON.parse(match);
                  
                  // Validate the question object
                  if (questionObj.main_question && 
                      Array.isArray(questionObj.answer_options) && 
                      questionObj.answer_options.length === 4 &&
                      typeof questionObj.correct_answer_index === 'number' &&
                      questionObj.helpful_hint) {
                    
                    // Send the question to the client
                    if (questionCount > 0) {
                      res.write(',');
                    }
                    
                    // Format and send the question
                    const formattedQuestion = {
                      main_question: questionObj.main_question,
                      answer_options: questionObj.answer_options,
                      correct_answer_index: questionObj.correct_answer_index,
                      helpful_hint: questionObj.helpful_hint
                    };
                    
                    const questionJson = JSON.stringify(formattedQuestion);
                    console.log(`Sending question ${questionCount + 1} to client (${questionJson.length} bytes)`);
                    
                    // Flush the response immediately to ensure the client receives it
                    res.write(questionJson);
                    res.flush && res.flush();
                    
                    questionCount++;
                    
                    // Remove the processed question from the buffer
                    buffer = buffer.replace(match, '');
                  }
                } catch (e) {
                  // Skip invalid JSON fragments
                  console.log("Error parsing question:", e.message);
                  continue;
                }
              }
            }
          }
        } catch (e) {
          // Continue collecting more data
          console.log("Parsing error:", e);
        }
      }
    }
    
      // Close the JSON structure
      res.write(']}');
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
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {  
  console.log(`Server running on port ${PORT}`);
});
