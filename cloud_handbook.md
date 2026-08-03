# MINESYNC - Free Cloud Deployment & Data Storing Guide
**Pristine launch options for BONGANI TSHUMA operations**

To deploy **MINESYNC** on the cloud for free with reliable database storage and zero setup costs, you can utilize modern, developer-friendly cloud platforms. Below is the ultimate step-by-step action plan to host both your web application and its database for free.

---

## 🚀 1. The Best Free Cloud Databases (Data Storing)

To save your work orders, technician rosters, company SMTP settings, and chat rooms, you need a secure, cloud-hosted database. Here are the top three free-tier cloud options:

### Option A: Supabase (PostgreSQL) — *RECOMMENDED (Free Forever)*
Supabase is the absolute gold-standard for free cloud databases. It provides a real, dedicated PostgreSQL database.
*   **Free Tier Benefit**: 2 active projects, 500MB of storage (enough to store over **100,000+ work orders** and rosters), and up to 50,000 monthly active users.
*   **Why it's great**: It is free forever, has built-in security, and can easily connect to your Node.js backend.
*   **Website**: [https://supabase.com](https://supabase.com)

### Option B: Render Persistent Disk (SQLite / JSON) — *EASIEST TO DEPLOY*
If you want to keep the current fast file-based database (`db.json` or `database.db`) without writing any SQL code:
*   **Free Tier Benefit**: When you host your backend server on **Render**, you can attach a **Persistent Disk** (up to 1GB for free) to your web service.
*   **Why it's great**: The server will read and write to `db.json` exactly as it does now in this workspace, and the file will be preserved securely in the cloud even if the server restarts!
*   **Website**: [https://render.com](https://render.com)

### Option C: MongoDB Atlas (NoSQL)
If you prefer a document database where data is stored as JSON objects.
*   **Free Tier Benefit**: 512MB shared cluster, free forever.
*   **Website**: [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)

---

## 🛠️ 2. The Best Free Application Hosting (Back-end & Front-end)

To host your React pages and Express API server together for free:

### 1. Render (render.com) — *The Best All-in-One Full-Stack Host*
Render lets you deploy Node.js web services directly from your GitHub repository.
*   **Free Tier**: Web Services are free (they spin down to save energy when idle, and wake up automatically on the first request).
*   **Website**: [https://render.com](https://render.com)

### 2. Koyeb (koyeb.com)
An ultra-fast cloud service that supports Node.js web services and PostgreSQL databases.
*   **Free Tier**: Generous free tier covering small instances, great for running backends.
*   **Website**: [https://koyeb.com](https://koyeb.com)

---

## 📈 3. Step-by-Step Blueprint to Deploy MINESYNC on Render for Free

Here is the exact blueprint to deploy MINESYNC using **Render** with a **Persistent Disk** (preserving your `db.json` database files for free):

### Step 1: Upload MINESYNC to GitHub
1. Create a free account on [GitHub](https://github.com).
2. Create a new private repository named `minesync`.
3. Push your files (`server.js`, `index.html`, `package.json`, and `uploads/`) to your GitHub repository.

### Step 2: Configure Render
1. Create a free account on [Render](https://render.com).
2. Click **New +** &rarr; Select **Web Service**.
3. Link your GitHub account and select your `minesync` repository.
4. Fill in the deployment details:
   *   **Runtime**: `Node`
   *   **Build Command**: `npm install`
   *   **Start Command**: `node server.js`
   *   **Plan**: `Free`

### Step 3: Configure the Free Persistent Disk (Database Storage)
To make sure your `db.json` file is never deleted when Render restarts:
1. In your Render Dashboard, click on your `minesync` Web Service.
2. Go to **Disks** in the left menu &rarr; Click **Add Disk**.
3. Name it: `db-storage`
4. **Mount Path**: `/opt/render/project/src/data` (This creates a secure, permanent directory).
5. Size: `1 GB` (Free tier).

### Step 4: Small Code Link (Point server to Disk)
To tell the server to read `db.json` from the persistent disk, you only change the database directory path in `server.js`.
Instead of:
```javascript
const DB_FILE = path.join(__dirname, 'db.json');
```
You change it to:
```javascript
// Render places persistent files in '/opt/render/project/src/data'
const DB_DIR = process.env.DISK_PATH || __dirname; 
const DB_FILE = path.join(DB_DIR, 'db.json');
```
This is fully supported, takes 2 seconds to set up, and preserves your databases completely for free!

---

## 🛡️ 4. Connecting Gmail App Passwords (SMTP) for standard emails

Once deployed, you can log into your Admin settings panel and plug in your **Gmail SMTP** server details to send real emails to your team's devices:

*   **SMTP Host**: `smtp.gmail.com`
*   **SMTP Port**: `587`
*   **SMTP Username**: `your-company-email@gmail.com`
*   **SMTP Password**: *Your 16-digit Gmail App Password* (Generated inside your Google Account settings &rarr; Security &rarr; App Passwords. Do not use your standard login password!).
*   **From Support Email**: `your-company-email@gmail.com`

This enables legitimate email dispatches immediately to all workers!
