# Pathway — Job & Internship Portal

Pathway is a full-stack web application that connects students with job and internship opportunities. It provides role-based experiences for students, recruiters, and administrators, with job listings, applications, and moderation workflows.

## Features

- **Authentication and access control:** Registration and login with hashed passwords, JWT authentication, and role-based authorization.
- **Student dashboard:** View available opportunities, apply for jobs and internships, and track application status.
- **Recruiter dashboard:** Create job or internship listings, manage listings, and update candidate application statuses.
- **Admin dashboard:** Review pending listings and approve or reject them with a moderation note.
- **Public job listings:** Browse approved, active listings and filter results by supported search criteria.
- **Responsive frontend:** React interface with animated components and dedicated authentication, contact, and dashboard pages.
- **MySQL persistence:** Stores users, role-specific profiles, job listings, and applications.

## Technology stack

| Layer | Technologies |
|---|---|
| Frontend | React, Vite, React Router, Axios, Motion, Lucide React |
| Backend | Node.js, Express 5 |
| Database | MySQL 8, `mysql2` |
| Authentication | JSON Web Tokens (JWT), `bcryptjs` |
| Validation and middleware | `express-validator`, CORS, dotenv |
| Testing | Node.js test runner |

## User roles

- **Student:** Browse approved listings, submit applications, and view application progress.
- **Recruiter:** Create listings and review applications for their own listings.
- **Administrator:** Moderate submitted listings before they appear publicly.

Public registration supports student and recruiter accounts. Administrator accounts should be provisioned securely by the project owner, not through public registration.

## Repository structure

```text
Portal_Backend/
├── .env.example
├── package.json
├── scripts/
│   ├── createAdmin.js
│   └── resetAdminPassword.js
├── src/
│   ├── app.js
│   ├── server.js
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   └── validators/
├── tests/
└── frontend/
    ├── .env.example
    ├── package.json
    ├── index.html
    └── src/
```

## Prerequisites

Install the following before running Pathway locally:

- Node.js and npm
- MySQL Server 8.x
- Git (optional, for version control)

## Run locally

### 1. Clone the repository

```bash
git clone https://github.com/utsadeepkundu/pathway-job-portal.git
cd pathway-job-portal
```

### 2. Configure MySQL

Create a MySQL database for the application. The default example configuration uses `job_portal_db`:

```sql
CREATE DATABASE job_portal_db;
```

Create/configure a MySQL user with access to this database, then make sure the required application tables exist: `users`, `student_profiles`, `recruiter_profiles`, `jobs`, and `applications`.

> **Database setup note:** This repository currently does not include a dedicated schema or migration file. A fresh database needs the table definitions matching the application's controllers before the application can operate. Do not point the app at a database containing important data unless you understand the schema and permissions.

### 3. Configure the backend

From the repository root, create a local environment file from the example:

**PowerShell (Windows):**

```powershell
Copy-Item .env.example .env
```

Open `.env` and set the values for your own MySQL setup. For example:

```dotenv
PORT=5000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=job_portal_db
DB_USER=your_mysql_username
DB_PASSWORD=your_mysql_password
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=1d
```

Use a long, unpredictable JWT secret. Never commit `.env` or put real secrets in `.env.example`.

Install backend dependencies and start the API:

```powershell
npm install
npm run dev
```

The API should be available at `http://localhost:5000`. The health endpoint is `http://localhost:5000/api/health`.

### 4. Configure and run the frontend

Open a **second terminal** at the repository root and run:

```powershell
Copy-Item frontend/.env.example frontend/.env
cd frontend
npm install
npm run dev
```

The Vite development server will print the local frontend URL, usually `http://localhost:5173`.

The frontend environment variable should point to the backend API:

```dotenv
VITE_API_BASE_URL=http://localhost:5000/api
```

### 5. Build the frontend

From the `frontend` directory:

```powershell
npm run build
```

Vite writes the production build to `frontend/dist/`. The build output is generated and should not be committed.

## API overview

The API is prefixed with `/api`.

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `POST` | `/auth/register` | Public | Register a student or recruiter |
| `POST` | `/auth/login` | Public | Authenticate and receive a JWT |
| `GET` | `/auth/me` | Authenticated | Get the current user's profile |
| `GET` | `/jobs` | Public | Browse approved listings |
| `GET` | `/jobs/mine` | Recruiter | List the recruiter's own listings |
| `POST` | `/jobs` | Recruiter | Create a job or internship listing |
| `GET` | `/jobs/moderation/pending` | Administrator | List pending submissions |
| `PATCH` | `/jobs/:id/moderation` | Administrator | Approve or reject a listing |
| `POST` | `/jobs/:id/apply` | Student | Apply to a listing |
| `GET` | `/applications` | Authenticated | View applications permitted for the user's role |
| `PATCH` | `/applications/:id/status` | Recruiter / Administrator | Update an application's status, subject to authorization rules |

Protected endpoints require a bearer token in the `Authorization` header:

```http
Authorization: Bearer <your_jwt>
```

## Configuration reference

### Backend (`.env`)

| Variable | Description |
|---|---|
| `PORT` | API server port (example: `5000`) |
| `DB_HOST` | MySQL host |
| `DB_PORT` | MySQL port (example: `3306`) |
| `DB_NAME` | Application database name |
| `DB_USER` | MySQL username |
| `DB_PASSWORD` | MySQL password |
| `JWT_SECRET` | Secret used to sign JWTs |
| `JWT_EXPIRES_IN` | JWT lifetime (example: `1d`) |

### Frontend (`frontend/.env`)

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Base URL for the backend API, including `/api` |

Only non-secret values intended for browser use should use the `VITE_` prefix. Never place database credentials or JWT signing secrets in frontend environment variables.

## Security notes

- Keep `.env` files and all production credentials out of version control.
- Use a unique, strong `JWT_SECRET` in every deployed environment.
- Use HTTPS in production and restrict CORS to the deployed frontend origin.
- Configure a least-privilege database user rather than using MySQL's root account.
- Do not expose administrator provisioning or password-reset credentials in public documentation or source control.
- Review environment variables and deployment settings before making the repository public.

## Current status

Pathway's core local workflows include authentication, role-specific dashboards, job listing creation and moderation, applications, and application-status updates. Production deployment requires configuring a hosted backend, a reachable production database, and the deployed frontend's `VITE_API_BASE_URL`.

## License

No license has been specified yet. Unless a license is added to this repository, standard copyright restrictions apply to reuse of the source code.
