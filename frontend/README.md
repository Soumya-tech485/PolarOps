# PolarOps

Integrated Polar Expedition Logistics and Asset Management System prototype for SIH26062.

## Problem
Polar stations depend on complex resupply missions. Delayed ships or aircraft can create critical shortages of fuel, food, medical supplies, and spare parts.

## Solution
PolarOps tracks station inventory, assets, consumption, and shipments. It predicts stockout risk and recommends cargo priorities when resupply is delayed.

## Core Features
- Login
- Station dashboard
- Inventory tracking
- Asset tracking
- Consumption logging
- Forecast-based risk detection
- What-if resupply delay simulation
- Cargo prioritization
- Alerts
- Demo data reset

## Tech Stack
FastAPI, SQLite, React, Vite

## Demo Users
Admin: admin@polarops.demo / admin123
Station Manager: station@polarops.demo / station123
Logistics Officer: logistics@polarops.demo / logistics123

## Run Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload