const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const app = express();

// Enable CORS with specific configuration
const corsOptions = {
  origin: ['http://localhost:5173', 'https://astral-quiz.netlify.app'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
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
  return `Erstelle ${batchSize} Quizfragen über ${topic} mit steigendem Schwierigkeitsgrad basierend auf der Fragennummer:
 - Fragen 1-3: Sehr einfach 
 - Fragen 4-5: Einfach 
 - Fragen 6-10: Mittel 
 - Fragen 11-13: Schwer 
 - Fragen 14-15: Sehr schwer 
 
 
Für jede Frage gibst du:
1. Hauptfrage
2. Vier Antwortmöglichkeiten (a, b, c, d)
3. Korrekte Antwortnummer (0-3)
4. Einen hilfreichen Hinweis, der einen Tipp gibt, ohne die Antwort direkt zu verraten
5. Verwenden Sie Emojis in Fragen und Antworten.

Formatiere die Ausgabe als JSON-Objekt mit dieser Struktur:
{
  "fragen": [
    {
      "hauptfrage": "string",
      "antwortoptionen": ["string", "string", "string", "string"],
      "richtige_antwortnummer": number,
      "hilfreicher_hinweis": "string"
    }
  ]
}`;
};

const constructVeryHardPrompt = (topic, batchSize = 5) => {
  return `Erstelle ${batchSize} SEHR SCHWERE Quizfragen über ${topic}. Diese sollten extrem schwierige Fragen (1000 Punkte pro Frage) für Experten sein, die bereits 15 progressiv schwierige Fragen beantwortet haben.

Für jede Frage gibst du:
1. Hauptfrage
2. Vier Antwortmöglichkeiten (a, b, c, d)
3. Korrekte Antwortnummer (0-3)
4. Einen hilfreichen Hinweis, der einen Tipp gibt, ohne die Antwort direkt zu verraten
5. Verwenden Sie Emojis in Fragen und Antworten.

Formatiere die Ausgabe als JSON-Objekt mit dieser Struktur:
{
  "fragen": [
    {
      "hauptfrage": "string",
      "antwortoptionen": ["string", "string", "string", "string"],
      "richtige_antwortnummer": number,
      "hilfreicher_hinweis": "string"
    }
  ]
}`;
};

// Main question generation endpoint
app.post('/api/generate-questions', async (req, res) => {
  try {
    const { topic, startIndex = 0, batchSize = 3, isVeryHardMode = false } = req.body;
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
     
      apiKey });

    try {
      // Create a completion with streaming enabled
      const stream = await openai.chat.completions.create({
        messages: [{ 
          role: "user", 
          content: isVeryHardMode ? constructVeryHardPrompt(topic, batchSize) : constructPrompt(topic, batchSize)
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
    res.write('{"fragen":[');
    
    // Process the stream
    for await (const chunk of stream) {
      const content = chunk.choices?.[0]?.delta?.content;
      if (content) {
        buffer += content;
        
        // Try to extract complete questions as they come in
        try {
          // Check if we have a complete JSON object with a question
          if (buffer.includes('"hauptfrage"') && buffer.includes('"richtige_antwortnummer"')) {
            // Extract question objects from the buffer using a more robust regex
            const matches = buffer.match(/{[^{]*"hauptfrage"[^{]*"richtige_antwortnummer"[^{}]*}/g);
            
            if (matches && matches.length > 0) {
              for (const match of matches) {
                try {
                  // Try to parse the question object
                  const questionObj = JSON.parse(match);
                  
                  // Validate the question object
                  if (questionObj.hauptfrage && 
                      Array.isArray(questionObj.antwortoptionen) && 
                      questionObj.antwortoptionen.length === 4 &&
                      typeof questionObj.richtige_antwortnummer === 'number' &&
                      questionObj.hilfreicher_hinweis) {
                    
                    // Send the question to the client
                    if (questionCount > 0) {
                      res.write(',');
                    }
                    
                    // Format and send the question
                    const formattedQuestion = {
                      hauptfrage: questionObj.hauptfrage,
                      antwortoptionen: questionObj.antwortoptionen,
                      richtige_antwortnummer: questionObj.richtige_antwortnummer,
                      hilfreicher_hinweis: questionObj.hilfreicher_hinweis
                    };
                    
                    const questionJson = JSON.stringify(formattedQuestion);
                    // Only log the question content
                    console.log(`Question content: ${questionObj.hauptfrage}`);
                    
                    // Flush the response immediately to ensure the client receives it
                    res.write(questionJson);
                    res.flush && res.flush();
                    
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
          // Continue collecting more data
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
const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {  
  console.log(`Server running on port ${PORT}`);
});
