# Futures First AI Assistant

Full-stack application with a Python/FastAPI backend and React/Vite frontend.

## Quick Start

### Backend
1. Open a terminal and navigate to the `backend` directory.
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Set up environment variables:
   Copy `.env.example` to `.env` and add your Anthropic API key.
4. Start the server:
   ```bash
   uvicorn main:app --reload
   ```

### Frontend
1. Open a second terminal and navigate to the `frontend` directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```