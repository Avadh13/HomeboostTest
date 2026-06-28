# Local Development While Vercel Limit Is Reached

Use this workflow when the Vercel account is on a deployment limit. All code can still be developed, tested locally, committed, and pushed to GitHub. When the Vercel limit resets, redeploy the latest GitHub version.

## 1. Pull latest GitHub code

```bash
cd C:\Users\mrava\Documents\GitHub\HomeboostTest\26s-cst8319-330-group-08
git pull origin main
```

If your local folder is different, open the project folder that contains `frontend` and `backend`.

## 2. Backend local setup

Go to backend:

```bash
cd backend
npm install
```

Create or update `backend/.env`:

```env
NODE_ENV=development
PORT=5000

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=YOUR_LOCAL_MYSQL_PASSWORD
DB_NAME=railway

JWT_SECRET=local_homeboost_secret_change_me
JWT_EXPIRES_IN=1d

FRONTEND_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

Start backend:

```bash
npm run dev
```

Test backend:

```text
http://localhost:5000/api/health
http://localhost:5000/api/test-db
```

## 3. Frontend local setup

Open a second terminal:

```bash
cd frontend
npm install
```

Create or update `frontend/.env.local`:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

Start frontend:

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

## 4. Local testing checklist

Test these pages locally before pushing:

```text
/
/login
/employee-portal
/employee/appointments
/employee/messages
/hbt/dashboard
/hbt/resources
/hbt/appointments
/hbt/messages
/admin
/notifications
```

## 5. Commit and push changes to GitHub

After local testing:

```bash
git status
git add .
git commit -m "Update HomeBoost feature locally"
git push origin main
```

## 6. When Vercel limit resets

Do not change code again just for deploy. The latest code is already on GitHub.

Redeploy from Vercel dashboard:

```text
Vercel → Project → Deployments → Redeploy latest GitHub deployment
```

Backend changes still need Railway redeploy.

## 7. Important notes

- Frontend local API should point to `http://localhost:5000/api`.
- Backend local CORS should allow `http://localhost:5173`.
- If local frontend shows a backend error, check backend terminal first.
- If backend says database connection failed, check MySQL password, DB name, and whether MySQL service is running.
- Use `npm install` locally if `npm ci` fails because package-lock is out of sync.
