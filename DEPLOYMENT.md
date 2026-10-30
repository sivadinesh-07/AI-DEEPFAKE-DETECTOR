# Deployment Guide

This project consists of two parts:
1. **Frontend**: React + Vite + Tailwind CSS Single-Page Application (SPA).
2. **Backend**: Python FastAPI service with PyTorch, MediaPipe, OpenCV, and deep learning forensic pipelines.

---

## Part 1: Deploying Frontend to Vercel

Vercel is optimized for React / Vite SPAs.

### Steps on Vercel Dashboard:
1. Push your repository to **GitHub** (or GitLab/Bitbucket).
2. Go to [vercel.com](https://vercel.com) and click **"Add New..."** -> **"Project"**.
3. Select your repository.
4. In the **Configure Project** screen:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click *Edit* and select `frontend` (⚠️ **Important**)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `dist` (default)
   - **Install Command**: `npm install` (default)
5. **Environment Variables**:
   - Add:
     - **Name**: `VITE_API_BASE_URL`
     - **Value**: Your deployed backend URL (e.g., `https://your-backend.onrender.com` or `https://your-app.railway.app`)
     *(If testing without a remote backend yet, you can leave it blank or update it later).*
6. Click **Deploy**.

> **Note:** The `frontend/vercel.json` file ensures that refreshing client-side routes like `/results` and `/history` does not cause 404 errors.

---

## Part 2: Deploying the Python ML Backend

Because the backend uses **PyTorch, OpenCV, Transformers, and MediaPipe** (~3–5 GB dependencies with heavy frame-by-frame inference), it cannot run directly inside Vercel's serverless functions (which have a strict 250 MB size limit). It should be hosted on a platform built for Python/Docker workloads.

### Option A: Render (Easiest & Free/Low Cost)
1. Go to [render.com](https://render.com) and create an account.
2. Click **New +** -> **Web Service**.
3. Connect your GitHub repository.
4. Select **Docker** as the environment (Render will automatically detect the root `Dockerfile`).
5. Choose an instance type (Standard or higher recommended for PyTorch inference).
6. Click **Create Web Service**.
7. Once deployed, copy your service URL (e.g. `https://temporal-backend.onrender.com`) and paste it into the `VITE_API_BASE_URL` variable in your Vercel project settings.

### Option B: Railway (Fastest 1-Click Docker)
1. Go to [railway.app](https://railway.app).
2. Click **New Project** -> **Deploy from GitHub repo**.
3. Railway automatically uses the `Dockerfile`.
4. Under Settings -> Networking, click **Generate Domain**.
5. Copy that domain into Vercel's `VITE_API_BASE_URL`.

### Option C: Hugging Face Spaces (Free CPU / GPU ML Hosting)
1. Create a new Space on [huggingface.co/spaces](https://huggingface.co/spaces).
2. Choose **Docker** as the SDK.
3. Push the repository to the Space remote.
4. Use the Direct Space URL as `VITE_API_BASE_URL`.
