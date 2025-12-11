# 🥭 MangoSocial

A voice-first social discovery platform where users connect through time-limited conversations with matching based on interests, gender preferences, and optional astrological compatibility.

## ✨ Features

- **Time-Limited Conversations**: 1 minute initial (3 min premium), with mutual extension options
- **Smart Matching**: Based on gender, interests, and optional star sign compatibility
- **AI Practice Sessions**: Safe onboarding with AI conversations before human matching
- **Friend Connections**: After 30 seconds, both users can choose to connect
- **Safety First**: Phone verification, report/block system, and moderation tools

## 🛠️ Tech Stack

### Backend
- Node.js + Express.js
- MongoDB (Mongoose)
- Socket.io for real-time features
- JWT Authentication
- mNotify SMS API

### Frontend
- React 18 + TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- React Router

### Coming Soon
- Agora.io for voice calls
- Redis for real-time matching
- AWS S3 for file storage

## 📁 Project Structure

```
MangoSocial/
├── backend/
│   ├── src/
│   │   ├── config/       # Database configuration
│   │   ├── middleware/   # Auth middleware
│   │   ├── models/       # Mongoose models
│   │   ├── routes/       # API routes
│   │   ├── services/     # Business logic (OTP, SMS)
│   │   └── index.ts      # Entry point
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Route pages
│   │   ├── lib/          # Utilities
│   │   └── main.tsx      # Entry point
│   └── package.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- mNotify API key (for SMS)

### Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file:
```env
PORT=3001
MONGO_URI=mongodb://localhost:27017/mangosocial
JWT_SECRET=your_jwt_secret_here
MNOTIFY_API_KEY=your_mnotify_api_key
```

Start the server:
```bash
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173`

## 📱 API Endpoints

### Authentication
- `POST /auth/send-otp` - Send OTP to phone number
- `POST /auth/verify-otp` - Verify OTP and get JWT token

### Coming Soon
- `PUT /auth/profile` - Update user profile
- `GET /users/me` - Get current user
- `POST /match/queue` - Join matching queue
- `POST /friends/connect` - Send friend request

## 🗺️ Development Roadmap

See [PROGRESS.md](./PROGRESS.md) for detailed progress tracking.

### Phase 1: Core MVP (8-10 weeks)
- [x] Phone verification system (partial)
- [ ] User profile setup
- [ ] AI practice sessions
- [ ] Voice infrastructure (Agora.io)
- [ ] Matching algorithm
- [ ] Friend connections

### Phase 2: Enhanced Features (4-6 weeks)
- [ ] Premium features
- [ ] Safety & moderation tools
- [ ] UI/UX polish

### Phase 3: Advanced Features (6-8 weeks)
- [ ] Analytics
- [ ] Group voice sessions
- [ ] Voice notes

## 📄 License

Private - All rights reserved

## 👥 Contributing

This is a private project. Contact the maintainer for access.
