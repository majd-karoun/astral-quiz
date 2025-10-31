# Astral Quiz
An interactive quiz application that generates personalized questions on any topic using OpenAI's GPT models. This application creates exciting, progressively difficult quiz questions with an automatic hint and scoring system.



[Live Demo](https://astral-quiz.app) 🚀




## 🎮 How to Play:

1. Choose a topic.
2. Enter your OpenAI API key.
3. Answer questions with increasing difficulty.
   (The quiz continues indefinitely as long as you answer correctly.)
4. Use helpers strategically:
   - **Hints**: Get a helpful clue (6 per game)
   - **50/50 Options**: Eliminate 2 incorrect answers (3 per game)
5. Try to achieve the highest score.


## 🔑 API Key:

- You need your own OpenAI API key to generate questions.
- Your OpenAI account must have available credits.
- Questions are generated using the GPT-4o-mini or GPT-5-mini model.  


## 💻 Tech Stack:
### Frontend
- **React.js**: Frontend framework
- **Vite**: Build tool and development server
- **@phosphor-icons/react**: Icon library
- **CSS**: Custom responsive design

### Backend:
- **Node.js**: Runtime environment
- **Express.js**: Web application framework
- **OpenAI API**: For generating quiz questions
- **CORS**: Cross-Origin Resource Sharing support

### Deployment:
- **Frontend**: Hosted on Netlify
- **Backend**: Hosted on Fly.io


## 🚀 Getting Started:

1. Clone the repository
```bash
git clone https://github.com/majd-karoun/astral-quiz.git
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

3. Set up environment variables:

Frontend (.env):
```bash
VITE_API_URL=http://localhost:3001/api
```

Backend (.env):
```bash
PORT=3001
NODE_ENV=development
```

4. Start the development servers:
```bash
# Start the backend server
cd server
node server.js

# Start the frontend server in a new terminal
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
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
