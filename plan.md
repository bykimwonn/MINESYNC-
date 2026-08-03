# Implementation Plan: Mining Work Order Management System
**Tailored for Metallurgical Plants (Steel & Orange Theme, Mobile-Responsive)**

This document details the architecture, design, and step-by-step implementation stages for the Web Application. We have optimized and corrected some of the requested stages (especially the login/signup and role management flows) to make the application highly secure, professional, and easy to use.

---

## 1. System Architecture & Role Hierarchy

```
                               ┌───────────────────────────┐
                               │       Landing Page        │
                               │  Choose Owner/Admin/Plant │
                               └─────────────┬─────────────┘
                                             │
               ┌─────────────────────────────┼─────────────────────────────┐
               ▼                             ▼                             ▼
       [ OWNER SECTION ]             [ ADMIN SECTION ]             [ PLANT SECTION ]
       • BT_COMPANY Login            • Manage Artisan Credentials  • Management (Eng/Sec Eng)
       • Creates First Admin         • Password Resets             • Foreman (Creates Jobs)
       • High-Level Handover         • Monitor Online Users        • Artisan (Completes Jobs)
```

### Roles and Permissions Matrix
| Role | Can Create Users? | Password Reset Authority | Can View Management Dashboard? | Can Create Work Orders? | Work Order Actions | WhatsApp/Email Notifications? |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Owner** | Yes (Admins) | Full (For Admins) | Yes (All system views) | No | View Only | No |
| **Admin** | Yes (Artisans/Foremen) | Resets passwords to default | No (VIP Restricted) | No | View Sessions Only | No |
| **Management** | No | Self-Service | Yes (Full plant metrics) | No | Monitor & Analyze | No |
| **Foreman** | No | Self-Service | Yes (Foreman view) | Yes | Assign, Flag Spares | No (Sends them) |
| **Artisan** | No | Self-Service | No | No | Approve, Update, Complete | Yes (Receives) |

---

## 2. Refined Login & Signup Flow (Improvements)

The user requested specific login mechanisms:
1. **Owner Entrance**: Logs in with username `BT_COMPANY` and password `bonganibykimwonn0783291237`. The owner sets up the first Admin account.
2. **Admin Entrance**: Admin sees the Artisan section but *cannot* see the Management section. Admin adds users and sets their initial passwords.
3. **Plant Section**:
   - **Management (Section Engineer / Engineer)**: Signs up first time with their position as username, sets a password. On subsequent logins, they can use their password or use a **Biometric Mock Authentication** (such as a modern fingerprint scanner component that simulates instant secure login, which is extremely cool and fits industrial tablets perfectly).
   - **Foremen and Artisans**: Admin creates their accounts first with a temporary password. On first login, they are prompted to change their password. Once changed, Admin cannot see the password (only default recovery/reset capability is available to Admin).

### *Correction of Potential Friction Points:*
*   **The Position Username Issue**: Having management log in using their position (e.g. "Section Engineer") as their username is highly practical. We will pre-populate a list of official positions in a dropdown so that signup/login is clean, avoiding spelling mistakes.
*   **Artisan Account Creation**: Since Artisans must enter their WhatsApp and email, we will prompt them to enter this profile information immediately on their first login (along with their password change), ensuring the notification system works right away.

---

## 3. Core Features & "Smart" Mechanisms

### A. AI-Powered Autocomplete Engine (Adaptive Learning)
The system keeps a local dictionary of previously inputted:
- Job Names (e.g., "Ball Mill 2 Liner Replacement", "Flotation Cell Impeller Repair")
- Serial Numbers
- Descriptions / "What to Do"
When a Foreman is adding a job, typing in these fields will show "Smart Suggestions" based on previous successful work orders. This reduces typing time for operators in dusty plant environments.

### B. Intelligent Shortage Warning & Feedback Loop
- **Stock Warning**: If a Work Order requires a part, the system checks stock. If `Quantity in Stock < Required`, it automatically flags the Work Order as `Awaiting Spares` (Red highlight).
- **Shortage Learning**: The system tracks which spare parts are requested most frequently or have persistent shortages. It compiles a "Critical Shortage Advisory" for the Management and Foreman dashboards.
- **Auto-Clear**: As soon as stock is replenished (or the job is marked complete/parts acquired), the warning is dynamically removed.

### C. Maintenance Quality Evaluation Engine
To evaluate if maintenance is "a good thing or not" and "handled as they should", we implement an **Expert Rule Engine** that assesses:
- **MTTR (Mean Time to Repair)**: Is it decreasing?
- **Artisan Response Time**: Time from assignment to "Approve/Acknowledge".
- **SLA Adherence**: Did the job finish within the "expected days"?
- **Completion Rate**: Ratio of completed to open jobs.
Based on this, it renders an interactive **Plant Health Radar** displaying verdicts like:
- 🟢 **Optimal (SLA > 90%)**: "Excellent response times. Preventive maintenance is working."
- 🟡 **Cautionary**: "Awaiting Spares bottleneck detected. MTTR is increasing."
- 🔴 **Critical**: "Overdue critical crusher/mill orders. Maintenance backlog exceeds threshold."

---

## 4. UI/UX: Modern Industrial Dark-Mode Theme

- **Palette**: Deep Charcoal/Steel (`#0B0F19`), Slate Grey (`#1E293B`), Safety Orange (`#FF6B00`), Amber Warning (`#F59E0B`), and success Emerald (`#10B981`).
- **Responsive**: Fully responsive flexbox/grid layout optimized for phones, rugged tablets, and desktop control screens.
- **Search & Filter**: Prominent search bar at the top of active panels allowing quick search by Asset ID, Serial Number, or Asset Name.

---

## 5. Directory Structure for the Delivery

We will build this app using an integrated dual-delivery method:
1. **`index.html` (Standalone Rich UI)**: A beautifully styled, fully-functional, single-file web application containing all React, Tailwind CSS, Lucide icons, and Chart.js code. It uses `localStorage` for complete persistence. **This can be opened and tested instantly in the browser viewer using `present_file`!**
2. **Full-Stack Node.js Project**:
   - `server.js`: Express.js server connected to an SQLite database.
   - `package.json`: Dependencies.
   - `public/`: Assets and styles.
   - `database.db`: SQLite database.
   - Detailed README on how to run it.

Let's begin implementation!
