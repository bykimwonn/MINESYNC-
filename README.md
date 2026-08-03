# Metallurgical Plant - Mining Work Order Management System
**Steel and Orange Modern Industrial Theme // Mobile-Responsive // Full-Stack Ready**

This Web Application is built specifically for a metallurgical plant to manage maintenance work orders. It divides plant operations into realistic hierarchical sectors matching a real-world mining hierarchy (Owner, Admin, Plant Section - consisting of Management, Foreman, and Artisans), with integrated automatic shortage logs, email/WhatsApp notifications simulation, and an expert rules engine.

---

## 🚀 Quick Start (Instant Interactive Simulation)

To view the fully responsive, fully functional browser demo with complete local state persistence (`localStorage` sync), you don't even need to start any servers.
Just open `/home/user/index.html` directly in your workspace browser or viewer.

The frontend is complete with:
- **Interactive Biometric Scanners** for Engineers.
- **Dynamic Autocomplete Suggestion Dropdowns** that learn from previous foreman entries.
- **Awaiting Spares stock triggers** in bright warning red.
- **WhatsApp/Email notification simulations** via top-right slide-in alerts.
- **Bar charts** plotting completions vs outages per plant sector.
- **Plant Quality Verdict Engine** analyzing average Mean Time to Repair (MTTR).

---

## 🛠️ Running the Full-Stack Node.js & Express App

The backend is pre-configured to use a file-based storage database (`db.json`) ensuring robust persistence and zero setup friction.

1. **Install Node.js dependencies**:
   ```bash
   npm install
   ```

2. **Start the Express backend**:
   ```bash
   npm start
   ```

3. **Access the portal**:
   Open your browser and navigate to:
   ```
   http://localhost:5000
   ```

The server will automatically seed initial assets, materials stock levels, and accounts into `db.json` on startup.

---

## 🔑 Operational Credentials & Hierarchy Matrix

### 1. ⚙️ OWNER SECTION (VIP Software Handover)
*   **Username**: `BT_COMPANY`
*   **Password**: `bonganibykimwonn0783291237`
*   **Duties**: Hands over the software. First to sign in. Registers the first Administrator in the database.

### 2. 🛡️ ADMIN SECTION (Staff Directory Registrar)
*   **Username**: `admin` (or any admin created by Owner)
*   **Password**: `admin123`
*   **Permissions**: Can manage employee rosters (Artisans/Foremen). Resets forgotten passwords back to default `temp123`. Monitors active online sessions in the system.
*   **Safety Isolation**: Cannot view private management dashboards, and cannot see passwords changed by employees.

### 3. 🏭 PLANT SECTION (Hierarchical Workforce)

#### A. 📐 Management (Section Engineer / Plant Manager)
*   **Username (Position)**: Select `Section Engineer` (Eng. Ronald Sibanda) or `Plant Manager` (Eng. Chipo Moyo).
*   **Initial Password**: `seceng123` / `manager123`
*   **New Sign-Up**: Can sign up for new titles on first login.
*   **Sign-On Options**: Can enter a standard password, OR use the high-tech **Biometric Fingerprint Scan** component for instant, secure authentication.
*   **Features**:
    - High-level KPIs: live **Mean Time to Repair (MTTR)** and **Top 3 Failing Assets**.
    - Expert **AI-powered Quality Engine Verdicts** assessing maintenance quality.
    - **Shortage Advisory Board**: Displays materials flagged as low-stock/complained about on site, allowing management to trigger 1-click replenishments.
    - **Dynamic Bar Graphs** detailing outstanding vs resolved work orders by area.

#### B. 👷‍♂️ Foreman (Work Breakdown Assigners)
*   **Username**: `foreman_tau`
*   **Password**: `foreman123`
*   **Features**:
    - **No Pre-existing Jobs**: Start with a clean slate to register repairs.
    - **Dispatch Order Card**: Type the name of the job, asset, and duration.
    - **Smart Predictive Autocomplete**: Autocompletes fields like descriptions, instructions, or serials based on previous logs to reduce manual labor in dusty on-site conditions.
    - **Out-of-Stock Alert Triggers**: If a job requires "Crusher Jaws" (stock: 0), the status instantly flags to `Awaiting Spares` in Warning Red.

#### C. 🔧 Artisans (Field Engineering Technicians)
*   **Username**: `artisan_bongani` or `artisan_john`
*   **Password**: `temp123` (Triggers first-time profile change requesting phone and email).
*   **Features**:
    - View active work cards.
    - Click **Approve / Acknowledge** to begin working.
    - Update progress sliders.
    - Log shortage complains of materials (feeds directly into the Foreman's shortage alert board).
    - Close work orders with finalized compliance notes.

---

## 📈 System Features in Action

- **Feedback Loops**: When an artisan reports a shortage of "Welding Rods", it's learned by the system and shown to the Foreman and Management. Once the manager clicks "Replenish", stock increases and the warning disappears.
- **Auto-SMS Dispatching**: When a foreman assigns a job, a beautiful notification pops up showing the mock SMS/Email dispatched directly to the technician's WhatsApp number.
- **Mean Time to Repair Engine**: Recalculates dynamically every time an artisan marks an assigned task as completed.

Enjoy managing your metallurgical operations!
Developed by **BT_COMPANY**.
