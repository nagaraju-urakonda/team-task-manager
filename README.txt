TEAM TASK MANAGER - Full Stack Web Application
================================================

A full-stack project management tool with role-based access control (Admin/Member).

TECH STACK
----------
- Frontend: React 18 + Vite + React Router
- Backend: Node.js + Express.js
- Database: PostgreSQL
- Auth: JWT (JSON Web Tokens) + bcrypt
- Deployment: Railway

FEATURES
--------
- Authentication (Signup / Login with JWT)
- Role-based access (Admin / Member)
- Project creation, editing, deletion
- Team member management (add/remove by email)
- Task creation with assignment, due dates, status
- Task status tracking: To Do → In Progress → Done
- Kanban board view per project
- Dashboard with stats (total, overdue, done, in progress)
- Overdue task alerts
- REST API with proper validations

API ENDPOINTS
-------------
POST   /api/auth/register
POST   /api/auth/login

GET    /api/projects
POST   /api/projects
GET    /api/projects/:id
PUT    /api/projects/:id
DELETE /api/projects/:id
POST   /api/projects/:id/members
DELETE /api/projects/:id/members/:userId

GET    /api/tasks/dashboard
GET    /api/tasks/project/:projectId
POST   /api/tasks
PUT    /api/tasks/:id
DELETE /api/tasks/:id

GET    /api/users/me
GET    /api/users (admin only)
GET    /api/users/search?q=email

ROLE-BASED ACCESS CONTROL
--------------------------
Admin:
  - All project CRUD
  - Add/remove members from any project
  - Assign tasks to any member
  - View all users

Member:
  - Create projects (becomes owner)
  - View projects they belong to
  - Create and manage tasks in their projects
  - Update task status

DATABASE SCHEMA
---------------
users (id, name, email, password, role, created_at)
projects (id, name, description, owner_id, created_at)
project_members (id, project_id, user_id)
tasks (id, title, description, project_id, assigned_to, created_by, status, due_date, created_at)

DEPLOYMENT STEPS (Railway)
--------------------------
1. Push code to GitHub
2. Go to railway.app → New Project → Deploy from GitHub
3. Select your repo
4. Add PostgreSQL: New → Database → PostgreSQL
5. Set environment variables:
   - DATABASE_URL (auto-set by Railway when you add PostgreSQL)
   - JWT_SECRET = any_random_secret_string
   - NODE_ENV = production
6. Railway auto-builds and deploys using railway.toml
7. App will be live at <your-app>.railway.app

LOCAL DEVELOPMENT
-----------------
1. Clone repo
2. Copy .env.example to backend/.env and fill in values
3. Run: npm run install-all
4. Run backend: npm run dev-backend (port 5000)
5. Run frontend: npm run dev-frontend (port 5173)
6. Open http://localhost:5173

AUTHOR
------
Built as a full-stack exam assignment: Team Task Manager
