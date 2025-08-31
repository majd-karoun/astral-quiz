import { apiKeyEncryption } from './encryption';

// Get bullet points sheet for a topic
export const getBulletPointsSheet = (topic) => {
  try {
    const sheets = JSON.parse(localStorage.getItem('bullet_points_sheets') || '{}');
    return sheets[topic.toLowerCase()] || null;
  } catch (error) {
    console.error('Error loading bullet points sheet:', error);
    return null;
  }
};

// Save bullet points sheet
export const saveBulletPointsSheet = (topic, sheet) => {
  try {
    const sheets = JSON.parse(localStorage.getItem('bullet_points_sheets') || '{}');
    sheets[topic.toLowerCase()] = {
      ...sheet,
      topic,
      lastUpdated: Date.now()
    };
    localStorage.setItem('bullet_points_sheets', JSON.stringify(sheets));
    return true;
  } catch (error) {
    console.error('Error saving bullet points sheet:', error);
    return false;
  }
};

// Create a test sheet for demonstration (remove this in production)
export const createTestSheet = () => {
  const testSheet = {
    topic: 'AI',
    bulletPoints: `# Artificial Intelligence Fundamentals

## Machine Learning
• Machine learning is a subset of AI that enables computers to learn without explicit programming
• Supervised learning uses labeled data to train models
• Unsupervised learning finds patterns in data without labels
• Neural networks are inspired by the human brain structure

## AI Applications
• Natural language processing enables computers to understand human language
• Computer vision allows machines to interpret visual information
• Robotics combines AI with physical systems for automation
• Expert systems use knowledge bases to make decisions

## Key Concepts
• Algorithms are step-by-step instructions for solving problems
• Big data provides the fuel for modern AI systems
• Deep learning uses multi-layered neural networks for complex pattern recognition`,
    questionsCount: 5,
    lastUpdated: Date.now(),
    version: 1
  };
  
  saveBulletPointsSheet('AI', testSheet);
  return testSheet;
};

// Generate or update bullet points sheet using OpenAI API
export const generateOrUpdateBulletPointsSheet = async (topic, correctQuestionAnswerPairs, apiKey) => {
  try {
    if (!apiKey) {
      // Try to get API key from storage
      const encryptedKey = localStorage.getItem('openai_api_key') || sessionStorage.getItem('openai_api_key');
      if (encryptedKey) {
        apiKey = await apiKeyEncryption.decrypt(encryptedKey);
      } else {
        throw new Error('No API key available');
      }
    }

    // Get existing sheet if it exists
    const existingSheet = getBulletPointsSheet(topic);
    
    // Prepare the prompt
    let prompt = `Topic: "${topic}"\n\n`;
    
    if (existingSheet && existingSheet.bulletPoints) {
      prompt += `EXISTING BULLET POINTS SHEET:\n${existingSheet.bulletPoints}\n\n`;
    }
    
    prompt += `NEW QUESTIONS AND CORRECT ANSWERS FROM THIS QUIZ SESSION:\n`;
    correctQuestionAnswerPairs.forEach((pair, index) => {
      prompt += `${index + 1}. Q: ${pair.question}\n   A: ${pair.correctAnswer}\n\n`;
    });
    
    if (existingSheet && existingSheet.bulletPoints) {
      prompt += `Please update the existing cheat sheet by:
1. Converting each new question-answer pair into a concise bullet point
2. Adding new bullet points to appropriate categories and mixing them in, or creating new ones
3. Removing any duplicate information
4. Keeping the sheet well-organized and comprehensive
5. Maintaining the same formatting style
6. if the existing sheet is longer than 3 pages, remove less relevant or repetitive info, so the final result is not too long.


Return the complete updated cheat sheet. Do NOT include a title at the beginning - just start with the content.`;

    } else {
      prompt += `Please create a new cheat sheet by:
1. Converting each question-answer pair into a concise, informative bullet point
2. Adding new bullet points to appropriate categories.
3. Removing any duplicate information
4. Keeping it comprehensive but concise.

Format as clean cheat sheet with clear category headings. Do NOT include a title at the beginning - just start with the content.`;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful study assistant that creates and updates comprehensive bullet point study sheets. Always return clean, well-formatted bullet points organized by categories.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const bulletPoints = data.choices[0].message.content;

    const updatedSheet = {
      topic,
      bulletPoints,
      questionsCount: (existingSheet?.questionsCount || 0) + correctQuestionAnswerPairs.length,
      lastUpdated: Date.now(),
      version: (existingSheet?.version || 0) + 1
    };

    // Save the updated sheet
    saveBulletPointsSheet(topic, updatedSheet);
    
    return updatedSheet;

  } catch (error) {
    console.error('Error generating/updating bullet points sheet:', error);
    throw error;
  }
};
