# LandPapa Project Context & Workflow

## Core Architecture
This is a full-stack real estate platform (LandPapa) consisting of:
- **Backend**: FastAPI (Python) located in `/backend`. Uses PostgreSQL with PostGIS.
- **Frontend**: Next.js (Website) located in `/kaliningrad-land`.
- **Admin**: Next.js (Management Panel) located in `/admin`.

## Local Development Workflow (Linux/WSL)
- **Primary Setup**: Always refer to `README.md` for overall logic, but use `dev.sh` for executions in this Linux environment.
- **Service Management**: Use `./dev.sh` in the root directory to start the entire stack (Database via Docker, Backend, Frontend, and Admin).
- **Environment Variables**: Local configuration is stored in `.env` in the root and respective subdirectories.
- **Backend**: Python virtual environment is located at `backend/venv/bin/python`.
- **Database**: PostgreSQL (PostGIS) is running in Docker on port 5432.

## Important Note for Agent
Before proposing any changes to the architecture or start-up scripts, always check the existing `dev.sh` logic. When assisting with development, ensure that Python commands use the virtual environment path and Node commands are executed in the correct subdirectories.
