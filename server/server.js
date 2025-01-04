// server/server.js
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.post('/api/generate-questions', async (req, res) => {
  try {
    const { topic } = req.body;

    const prompt = `Create 5 quiz questions about ${topic} with increasing difficulty:
    - Questions 1-2: Easy (50 points each)
    - Question 3: Medium (100 points)
    - Question 4: Hard (200 points)
    - Question 5: Very Hard (500 points)

    For each question, provide:
    1. Main question
    2. Four answer options (a, b, c, d)
    3. Correct answer index (0-3)
    4. An alternate version of the question
    5. A helpful hint

    Format as a JSON array of objects.`;

    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-3.5-turbo",
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const questions = JSON.parse(completion.choices[0].message.content);
    res.json(questions);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to generate questions' });
  }
});

// Function to find an available port
const findAvailablePort = (startPort) => {
  return new Promise((resolve, reject) => {
    const server = require('net').createServer();
    
    server.listen(startPort, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        // Port is in use, try the next one
        resolve(findAvailablePort(startPort + 1));
      } else {
        reject(err);
      }
    });
  });
};

// Start server with dynamic port
const startServer = async () => {
  try {
    const port = await findAvailablePort(3001); // Start trying from port 3001
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
      console.log(`API available at http://localhost:${port}/api/generate-questions`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

startServer();