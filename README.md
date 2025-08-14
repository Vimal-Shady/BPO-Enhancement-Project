# BPO Automation Client

A FASTAPI application for BPO (Business Process Outsourcing) Chatbot with AI-powered chat, sentiment analysis, and callback scheduling.  
Built for the **EY Techathon Event**.

![BPO Automation](https://placeholder.svg?height=300&width=600)

## Features

- 💬 AI-powered chat interface
- 🎙️ Audio transcription and processing
- 📊 Sentiment analysis
- 📅 Callback scheduling and management
- ❓ FAQ management system
- 🌓 Dark/Light mode support
- 🔒 Simple authentication system

## Prerequisites

- Node.js 18.x or higher
- npm or yarn
- Python 3.10 or higher
- A FastAPI backend service (see `API_URL` environment variable)

## Installation

1. **Clone the repository**:
```bash
git clone https://github.com/Vimal-Shady/BPO-Enhancement-Project.git
cd bpo-automation-client
```

2. **Create a virtual environment for the backend**:
```bash
python -m venv env
# Windows
env\Scripts\activate
# macOS/Linux
source env/bin/activate
```

3. **Install backend dependencies**:
```bash
pip install -r requirements.txt
```

4. **Install frontend dependencies**:
```bash
npm install
# or
yarn install
```

5. **Set up environment variables**:  
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Then open `.env` and fill in the required values as given.


## Running the application

1. **Start the FastAPI backend**:
```bash
# Windows
env\Scripts\activate
python app.py
# Or if using uvicorn
# uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

2. **Start the Next.js frontend**:
```bash
npm run dev
```

3. **Open the app in your browser**:  
Go to [http://localhost:3000](http://localhost:3000)
