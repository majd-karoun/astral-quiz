# Astral Quiz
An interactive quiz application that generates personalized questions based on any topic using OpenAI's GPT models. This application creates engaging, difficulty-progressive quizzes with automated hints and scoring system.

## 🌐 Live Demo
Visit [Astral Quiz](https://astral-quiz.netlify.app)

![Astral Quiz Interface](./screenshot.png)

## 🎮 How to Play

1. Enter a topic of your choice or select from suggested topics
2. Provide your OpenAI API key
3. Answer 15 questions of increasing difficulty
4. Use hints strategically (5 available per game)
5. Try to achieve the highest score possible
   

## ⚠️ Important Notes

- You'll need your own OpenAI API key to generate questions
- Your OpenAI account needs to have available credit
- The backend includes rate limiting to prevent abuse
- Questions are generated using GPT 4o-mini modal for optimal cost



## 💻 Tech Stack
### Frontend
- **React.js**: Frontend framework
- **Vite**: Build tool and development server
- **@phosphor-icons/react**: Icon library
- **CSS**: Custom styling with responsive design

### Backend
- **Node.js**: Runtime environment
- **Express.js**: Web application framework
- **OpenAI API**: For generating quiz questions
- **CORS**: Cross-Origin Resource Sharing support

### Deployment
- **Frontend**: Hosted on Netlify
- **Backend**: Hosted on Render.com

## 🚀 Getting Started

1. Clone the repository
```bash
git clone https://github.com/your-username/astral-quiz.git
cd astral-quiz
```

2. Install dependencies
```bash
# Install frontend dependencies
cd client
npm install

# Install backend dependencies
cd ../server
npm install
```

3. Set up environment variables

Frontend (.env):
```bash
VITE_API_URL=http://localhost:3001/api
```

Backend (.env):
```bash
PORT=3001
NODE_ENV=development
```

4. Run the development servers
```bash
# Run backend
cd server
node server.js

# Run frontend in a new terminal
cd client
npm run dev
```



## 🛠️ Application Structure

### Frontend
```
client/
├── src/
│   ├── components/
│   │   ├── TopicInput/
│   │   └── LoadingScreen/
│   ├── App.jsx
│   ├── App.css
│   └── main.jsx
```

### Backend
```
server/
├── server.js
└── package.json
```





## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
