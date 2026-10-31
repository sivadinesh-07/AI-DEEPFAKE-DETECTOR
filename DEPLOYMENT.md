# Deployment Guide

This project consists of two distinct architectures:
1. **Frontend**: React 19 + Vite 6 + Tailwind CSS SPA (Hosted on **Vercel**).
2. **Backend**: Python FastAPI service with PyTorch, MediaPipe, OpenCV, Wav2Vec 2.0, and deep learning forensic pipelines (Hosted via **Docker** on Render, Railway, Hugging Face Spaces, or a Cloud VPS).

---

## Why Backend Hosting is Separate from Vercel

Vercel functions operate as **serverless microservices** with strict constraints:
- Maximum package size: **250 MB** uncompressed (50 MB zipped).
- Maximum execution duration: **15–60 seconds**.
- No persistent background thread queues for long-running batch video tasks.

The Media Forensics backend requires **PyTorch, OpenCV, Hugging Face Transformers, MediaPipe, and FFmpeg** (~3–4 GB of libraries) and preloads neural weights into memory on startup. Therefore, the backend must run on a **containerized environment (Docker)**.

---

## Part 1: Hosting the Python ML Backend

Choose any of the options below to host your backend.

### Option A: Render (Recommended & Easiest)

Render provides native Docker web service hosting with automatic HTTPS.

1. Create a free account at [render.com](https://render.com).
2. Click **New +** &rarr; **Web Service**.
3. Connect your GitHub repository (`Temporal-Spectral`).
4. Render will automatically detect the root `Dockerfile` and `render.yaml`.
5. Configuration:
   - **Environment**: `Docker`
   - **Region**: Choose the closest region to you (e.g., Oregon, Ohio, Frankfurt, Singapore).
   - **Branch**: `main`
   - **Instance Type**: **Standard** (2 GB RAM / 1 vCPU) or higher is recommended so PyTorch and MediaPipe run smoothly without OOM kills.
   - **Health Check Path**: `/api/v1/health`
6. Click **Create Web Service**.
7. Once deployment finishes, Render gives you a public URL:
   `https://neural-forensics-backend.onrender.com`
8. Verify it by visiting `https://your-service.onrender.com/api/v1/health` in your browser. It should return:
   ```json
   {"status":"online","service":"Neural Facial Media Forensics Backend","version":"1.0.0"}
   ```

---

### Option B: Railway (Fastest 1-Click Setup)

Railway provides straightforward Docker deployments with high memory allocation.

1. Sign up at [railway.app](https://railway.app).
2. Click **New Project** &rarr; **Deploy from GitHub repo**.
3. Select your repository.
4. Railway will automatically detect the root [`Dockerfile`](file:///d:/Temporal-Spectral/Dockerfile) and [`railway.json`](file:///d:/Temporal-Spectral/railway.json).
5. Go to your service &rarr; **Settings** &rarr; **Networking** &rarr; click **Generate Domain**.
6. Railway assigns a public URL like `https://temporal-spectral-production.up.railway.app`.

---

### Option C: Hugging Face Spaces (Free 16 GB RAM Tier)

Hugging Face Spaces offers a generous free tier (2 vCPU / 16 GB RAM) suitable for deep learning models.

1. Sign up at [huggingface.co](https://huggingface.co) and go to [huggingface.co/spaces](https://huggingface.co/spaces).
2. Click **Create new Space**.
3. Set:
   - **Space SDK**: `Docker`
   - **Space Hardware**: Free CPU (2 vCPU • 16 GB RAM)
4. Clone the Space repo or push your code to the HF Space git remote:
   ```bash
   git remote add space https://huggingface.co/spaces/YOUR_USERNAME/YOUR_SPACE_NAME
   git push space main
   ```
5. In your Space **Settings**, ensure the container port is set to `7860` (our `Dockerfile` dynamically adapts to port 7860 automatically via `${PORT:-8000}`).
6. Use the Direct Space URL (available under **Embed Space** &rarr; **Direct URL**) as your backend URL.

---

### Option D: Self-Hosted Cloud VPS (DigitalOcean / AWS / Hetzner / Linode)

If you have a Linux server (Ubuntu/Debian) with Docker installed:

1. Clone your repo onto the server:
   ```bash
   git clone https://github.com/YOUR_USERNAME/Temporal-Spectral.git
   cd Temporal-Spectral
   ```
2. Start the container with Docker Compose:
   ```bash
   docker compose up -d --build
   ```
3. Check container logs:
   ```bash
   docker compose logs -f
   ```
4. Configure Nginx with SSL (Certbot) to proxy requests from port 443 to `http://127.0.0.1:8000`.

---

## Part 2: Connecting Backend to Your Vercel Frontend

Once your backend is deployed and running:

1. Go to your project on the [Vercel Dashboard](https://vercel.com/dashboard).
2. Navigate to **Settings** &rarr; **Environment Variables**.
3. Add or update:
   - **Key**: `VITE_API_BASE_URL`
   - **Value**: Your backend URL without trailing slash (e.g. `https://neural-forensics-backend.onrender.com`)
   - **Target**: Production, Preview, Development (check all).
4. Go to **Deployments** &rarr; click the three dots `...` on the latest deployment &rarr; click **Redeploy**.

---

## Verification Checklist

1. **Backend Health Check**:
   Open `https://<YOUR-BACKEND-URL>/api/v1/health` in your browser. You should receive `{"status": "online", ...}`.
2. **Frontend Handshake Indicator**:
   Open your Vercel frontend URL. The top navbar should display a green **System Online** indicator with the round-trip ping latency.
3. **Run a Test Audit**:
   Go to `/analyze`, upload a short test video, and verify that the forensic pipeline extracts frames, runs models, displays Grad-CAM heatmaps, and generates PDF dossiers.
