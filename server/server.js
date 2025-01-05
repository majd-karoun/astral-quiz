const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/generate-questions', async (req, res) => {
  try {
    const { topic } = req.body;
    const apiKey = req.headers.authorization?.split('Bearer ')?.[1];

    if (!apiKey) {
      return res.status(401).json({ error: 'API key is required' });
    }

    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    const openai = new OpenAI({
      apiKey: apiKey
    });

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
      Format as a JSON object with a 'questions' array containing the question objects.`;

    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-4-0125-preview",
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const responseData = completion.choices[0].message.content;

    let parsedData;
    try {
      parsedData = JSON.parse(responseData);
      if (!parsedData.questions || !Array.isArray(parsedData.questions)) {
        throw new Error('Invalid response format from OpenAI');
      }
    } catch (parseError) {
      console.error('Parse error:', parseError);
      console.error('Raw response:', responseData);
      return res.status(500).json({ error: 'Invalid response format from OpenAI' });
    }

    res.json(parsedData);
  } catch (error) {
    console.error('OpenAI API Error:', error);
    res.status(500).json({
      error: 'Failed to generate questions',
      details: error.message
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api/generate-questions`);
});