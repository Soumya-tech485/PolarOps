# PolarOps - SIH26062
Integrated Polar Expedition Logistics & Asset Management (NCPOR / MoES).

## Run locally (3 commands)
1. cp backend/.env.example backend/.env
2. docker compose up -d db   then   cd backend; pip install -r requirements.txt; uvicorn app.main:app --reload
3. cd frontend; npm install; npm run dev

## Structure
backend/ (FastAPI monolith) - frontend/ (React PWA) - db/ (schema+seeds) - design/ - docs/ - notebooks/
