# FinPilot AI

FinPilot AI is a modern personal finance platform designed to help users manage money with clarity and confidence. It combines a React-based frontend, an Express backend, and a Python AI service to deliver transaction tracking, goal planning, insights, and smart forecasting in one experience.

## Overview

FinPilot AI focuses on practical financial productivity rather than clutter. The product includes:

- transaction creation and management
- recurring reminders and budget awareness
- goal tracking with progress visibility
- AI-assisted forecasting and recommendations
- spreadsheet import for bulk transaction entry

## Key Features

- Smart dashboard with income, expense, and net income summaries
- Goal tracking with milestone-based progress and pace insights
- AI assistant for forecast summaries, risks, and next-step recommendations
- Recurring reminders for regular bills and commitments
- Import transactions from Excel or CSV files
- Secure authentication with JWT and password hashing

## Tech Stack

- Frontend: React, Vite, React Router, Axios, Recharts
- Backend: Node.js, Express.js, MongoDB, Mongoose
- AI Service: Python, FastAPI, scikit-learn
- Authentication: JWT, bcryptjs

## Project Structure

```text
FinPilot AI/
├── ai-service/            # Python FastAPI microservice for forecasting
├── client/                # React frontend
│   └── src/
│       ├── api/
│       ├── components/
│       ├── context/
│       ├── pages/
│       └── utils/
├── server/                # Express backend
│   └── src/
│       ├── controllers/
│       ├── middleware/
│       ├── models/
│       ├── routes/
│       ├── services/
│       └── utils/
├── postman/               # API collection
└── README.md
```

## Prerequisites

- Node.js 18+
- Python 3.10+
- MongoDB instance

## Getting Started

### 1. Backend Setup

```bash
cd server
npm install
```

Create a `.env` file and configure values such as:

- `MONGODB_URI`
- `JWT_SECRET`
- `PORT`
- `CLIENT_URL`
- `AI_SERVICE_URL`
- `AI_SERVICE_TIMEOUT_MS`

Run the backend:

```bash
npm run dev
```

### 2. AI Service Setup

```bash
cd ai-service
python -m venv .venv
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### 3. Frontend Setup

```bash
cd client
npm install
npm run dev
```

Open the app at `http://localhost:5173`.

## API Highlights

The backend exposes REST endpoints under `/api` for:

- authentication
- transactions
- analytics
- goals
- insights
- AI reports

## Development Notes

- The frontend uses Vite for fast local development.
- The backend is organized into controllers, services, models, and routes for maintainability.
- The AI assistant can provide fallback guidance even when the Python service is temporarily unavailable.

## License

This project is currently distributed under the MIT license.
