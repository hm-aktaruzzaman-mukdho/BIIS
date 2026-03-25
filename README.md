# BIIS — BUET Institutional Information System

Hall Seat Management System for university students and provosts. Built with **React + Express + PostgreSQL**.

---

## Features

### Student Portal
- 🪑 View seat availability — filter by hall, floor, or room number
- 📝 Apply for seat allocation with reason & supporting documents
- 🔄 Request seat change (for current residents)
- 📋 Track application status and provost feedback
- 💳 Complete dummy payment within 24 hours to confirm seat
- ✖ Cancel pending or unpaid applications

### Provost Dashboard
- 📨 View all applications with **AI-generated summaries** and recommendation badges (Strong / Moderate / Weak)
- ⭐ **Priority Score (1-10)** with factor breakdown: Distance, Financial, Medical, Academic, Documents
- ✅ Approve or ❌ Deny applications with feedback
- 🔄 Manage seat change requests
- 🏠 View all hall residents — room, dining days, absence records


---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vite + React |
| Backend | Node.js + Express |
| Database | PostgreSQL (Neon) |
| Auth | Session-based (express-session + connect-pg-simple) |
| AI | Google Gemini API + rule-based fallback |
| File Uploads | Multer |
| Deployment | Docker + Render |

---
## Prerequisites

- **Node.js** v18+ and **npm**
- **PostgreSQL** database (local or hosted, e.g. [Neon](https://neon.tech))
- **Git**

### Install Node.js on Linux (Ubuntu/Debian)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v && npm -v
```

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/ahtasham67/CSE-326_BIIS.git
cd CSE-326_BIIS
```

### 2. Configure environment variables

```bash
cp server/.env.example server/.env
```

Edit `server/.env` and set your values:

```env
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
SESSION_SECRET=your-random-secret-key
GEMINI_API_KEY=your-google-gemini-api-key
PORT=5001
NODE_ENV=development
```

### 3. Run the setup script

```bash
chmod +x setup.sh start.sh
./setup.sh
```

This will:
- Install all dependencies (root, server, client)
- Run database migrations and seed sample data

### 4. Start the application

```bash
./start.sh
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:5001 |

---

## Project Structure

```
CSE-326_BIIS/
├── server/                     # Express backend
│   ├── src/
│   │   ├── index.js            # Server + expiry cleanup job
│   │   ├── db.js               # PostgreSQL connection pool
│   │   ├── migrate.js          # Schema + seed data
│   │   ├── middleware/auth.js  # Session auth middleware
│   │   ├── routes/
│   │   │   ├── auth.js         # Login, register, logout
│   │   │   ├── seats.js        # Seat availability
│   │   │   ├── applications.js # Apply, pay, cancel, resident-check
│   │   │   ├── seatChanges.js  # Seat change requests
│   │   │   └── residents.js    # Hall residents
│   │   └── services/ai.js     # Gemini AI scoring (5 factors, /10)
│   └── .env.example
├── client/                     # Vite + React frontend
│   └── src/
├── setup.sh / start.sh         # Dev scripts
└── README.md
```

---


## Contributors

- **Ahtashamul Haque** — CSE, BUET
- **H M Aktaruzzaman Mukdho** — CSE, BUET
- **Sheikh Iftikharun Nisa** — CSE, BUET
- **Mishal Rahman** — CSE, BUET
- **Sadia Tasnim** — CSE, BUET
- **Mobasharul Islam Tonmoy** — CSE, BUET

