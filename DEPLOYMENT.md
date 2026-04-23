# Deploying SyncDocs

Deploy the backend to Render (free) and the frontend to Vercel (free).
No same-WiFi required — anyone in the world can collaborate.

---

## STEP 1 — MongoDB Atlas (Free Database)

1. Go to https://mongodb.com/atlas and sign up free
2. Create a free **M0** cluster (choose any region)
3. Under **Database Access** → Add a user with username + password
4. Under **Network Access** → Add IP `0.0.0.0/0` (allow all — required for Render)
5. Click **Connect** → **Drivers** → copy the connection string
6. Replace `<password>` in the string with your actual password
7. Change the database name in the string to `syncdocs`:
   ```
   mongodb+srv://user:pass@cluster.mongodb.net/syncdocs?retryWrites=true&w=majority
   ```
8. Save this string — you'll need it in the next step

---

## STEP 2 — Backend on Render

1. Push your project to GitHub (if not already)
2. Go to https://render.com and sign up free
3. Click **New** → **Web Service**
4. Connect your GitHub repo
5. Set **Root Directory** to: `server`
6. Set **Build Command** to: `npm install`
7. Set **Start Command** to: `npm start`
8. Add environment variables:
   - `MONGODB_URI` = your MongoDB Atlas connection string from Step 1
   - `CLIENT_URL` = leave blank for now (update after frontend deploy)
   - `PORT` = `3001`
   - `RENDER_URL` = your Render URL (e.g. `https://syncdocs-backend.onrender.com`) — enables self-ping to prevent spin-down
9. Click **Deploy**
10. Wait for deploy to finish (2-3 minutes)
11. Copy your Render URL — looks like: `https://syncdocs-backend.onrender.com`

---

## STEP 3 — Frontend on Vercel

1. Go to https://vercel.com and sign up free
2. Click **New Project** → import your GitHub repo
3. Set **Root Directory** to: `client`
4. Under **Environment Variables**, add:
   - `VITE_SOCKET_URL` = your Render backend URL from Step 2
     (example: `https://syncdocs-backend.onrender.com`)
5. Click **Deploy**
6. Wait for deploy to finish (1-2 minutes)
7. Copy your Vercel URL — looks like: `https://syncdocs.vercel.app`

---

## STEP 3.5 — Redis on Render (Free, Required for Multi-Instance)

1. Go to https://render.com
2. Click **New** → **Redis**
3. Choose the **free plan**
4. Give it a name like `syncdocs-redis`
5. Click **Create Redis**
6. Copy the **Internal Redis URL** (starts with `redis://`)
7. Go to your `syncdocs-backend` Web Service → **Environment**
8. Add environment variable:
   - `REDIS_URL` = the Internal Redis URL you just copied
9. Render's free Redis and free Web Service on the same internal network = zero latency, zero cost

> Note: If Redis is unavailable, the server still works — it just won't sync across multiple instances. Single-instance deployments work fine without Redis.

---

## STEP 4 — Link Frontend URL to Backend
1. Go back to your Render dashboard
2. Open your `syncdocs-backend` service → **Environment**
3. Update `CLIENT_URL` to your Vercel URL from Step 3
4. Render will auto-redeploy

---

## Testing Deployment

- Open your Vercel URL on your **phone** (mobile data, different network)
- Open the same URL on your **laptop**
- Create a document and share the URL
- Both devices should collaborate in real time — no same WiFi needed

---

## Local Development (no deployment)

```bash
# Terminal 1 — backend
cd server && npm run dev

# Terminal 2 — frontend  
cd client && npm run dev
```

Open http://localhost:5173

For local network access (same WiFi), find your IP with `ipconfig` and open:
`http://YOUR_IP:5173`

---

## Environment Variables Reference

### server/.env
```
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/syncdocs
PORT=3001
CLIENT_URL=http://localhost:5173
```

### client/.env
```
VITE_SOCKET_URL=http://localhost:3001
```

For production, set `VITE_SOCKET_URL` to your Render URL in Vercel's environment settings.
