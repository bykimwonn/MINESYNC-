const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 5000;
const DB_FILE = path.join(__dirname, 'db.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// --- SEED INITIAL DB STATE IF NOT EXISTS (PRISTINE EMPTY FOR LAUNCH) ---
const seedData = {
  // Company configuration defaults
  company: {
    name: "MINESYNC Metallurgical",
    logoUrl: "uploads/1743631617095.png", // Default pre-seeded logo
    supportEmail: "support@minesync.com",
    contactDetails: "+263-78-329-1237",
    plantGuidelines: "Our plant operates a primary Jaw Crusher that feeds Ball Mill 2. If Ball Mill 2 is down, the entire flotation circuit is halted. Boiler makers must clear structural frame cracks within 4 hours, and fitters must resolve pulley outages within 2 hours. Spares must always be kept above 2 units.",
    // SMTP Credentials (can be configured directly inside Admin panel Settings!)
    smtp: {
      host: "",
      port: "587",
      user: "",
      pass: "",
      from: ""
    }
  },
  assets: [
    { id: "AST-101", name: "Ball Mill 2", location: "Milling Area", criticality: "High", serial: "BM-1024" },
    { id: "AST-102", name: "Jaw Crusher 1", location: "Primary Crushing", criticality: "High", serial: "JC-0899" },
    { id: "AST-103", name: "Flotation Cell 5", location: "Concentration Flank", criticality: "Medium", serial: "FC-0453" },
    { id: "AST-104", name: "Thickener Tank 3", location: "Dewatering Section", criticality: "Low", serial: "TK-0221" }
  ],
  inventory: [
    { name: "Mill Liners", quantity: 5, cost: 1200 },
    { name: "Crusher Jaws", quantity: 0, cost: 2500 },
    { name: "Impeller Shafts", quantity: 2, cost: 450 },
    { name: "Electric Contactors", quantity: 15, cost: 85 }
  ],
  users: [], // Pristine empty users list for launch
  admins: [], // Empty initially on clean install so owner must initialize first Admin
  management: [], // Empty initially so managers sign up first time
  workOrders: [],
  suggestions: {
    jobNames: [
      "Ball Mill 2 vibrating heavily",
      "Replace worn liner plates on Ball Mill 2",
      "Calibrate Flotation Cell 5 Level Transmitters",
      "Repair Jaw Crusher 1 conveyor pulley",
      "Electrical contactor replacement in Mill MCC"
    ],
    serialNumbers: ["BM-1024", "JC-0899", "FC-0453", "TK-0221"],
    whatToDos: [
      "Perform vibration analysis, isolate power, inspect main gearbox, check gear backlash, and tighten holding bolts.",
      "Shut down plant feed, vent mill, install crane hooks, lift old liner plates out, place new steel manganese liners, and torque bolts to 450Nm.",
      "Isolate water feed, clean froth build-up on probe sensor, adjust float mechanism, and recalibrate PLC 4-20mA telemetry.",
      "Perform LOTO (Lock-Out Tag-Out), slacken belt, remove worn pulley, install new heavy-duty pulley, align shafts, and tension belt.",
      "Turn off local disconnect, discharge residual capacitance, slide out contactor block, mount new 110V contactor, verify auxiliary contacts."
    ]
  },
  shortages: [],
  chats: [],
  emails: [] // Simulated inbox/outbox logger fallback
};

function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(seedData, null, 2));
    return seedData;
  }
  const raw = fs.readFileSync(DB_FILE);
  return JSON.parse(raw);
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Initialize Database file
readDB();

// Dynamic Transporter Factory using DB values
function createDynamicTransporter(smtp) {
  if (smtp && smtp.host && smtp.user && smtp.pass) {
    return nodemailer.createTransport({
      host: smtp.host,
      port: parseInt(smtp.port) || 587,
      secure: parseInt(smtp.port) === 465, // true for 465, false for 587
      auth: {
        user: smtp.user,
        pass: smtp.pass
      }
    });
  }
  return null;
}

// --- REST API ENDPOINTS ---

app.get('/api/state', (req, res) => {
  const db = readDB();
  res.json(db);
});

// Update Company & SMTP Settings (Admin Settings Action)
app.put('/api/company', (req, res) => {
  const { name, logoUrl, supportEmail, contactDetails, plantGuidelines, smtp } = req.body;
  const db = readDB();

  if (name) db.company.name = name;
  if (logoUrl) db.company.logoUrl = logoUrl;
  if (supportEmail) db.company.supportEmail = supportEmail;
  if (contactDetails) db.company.contactDetails = contactDetails;
  if (plantGuidelines) db.company.plantGuidelines = plantGuidelines;
  if (smtp) {
    db.company.smtp = {
      host: smtp.host || "",
      port: smtp.port || "587",
      user: smtp.user || "",
      pass: smtp.pass || "",
      from: smtp.from || ""
    };
  }

  writeDB(db);
  res.json(db.company);
});

app.post('/api/users', (req, res) => {
  const { name, username, role, trade, email, whatsapp } = req.body;
  const db = readDB();
  
  if (db.users.some(u => u.username === username)) {
    return res.status(400).json({ error: "Username already taken." });
  }

  const newUser = {
    id: `U-${Date.now()}`,
    username,
    name,
    role,
    trade,
    password: "temp123",
    changedPassword: false,
    email,
    whatsapp,
    online: false,
    completedCount: 0,
    assignedCount: 0,
    slaAdherence: 100
  };

  db.users.push(newUser);
  writeDB(db);
  res.status(201).json(newUser);
});

// Delete User from database (Admin command)
app.delete('/api/users/:id', (req, res) => {
  const db = readDB();
  const userId = req.params.id;
  const initialCount = db.users.length;
  db.users = db.users.filter(u => u.id !== userId);

  if (db.users.length === initialCount) {
    return res.status(404).json({ error: "User not found." });
  }

  writeDB(db);
  res.json({ message: "User successfully deleted from roster." });
});

app.patch('/api/users/:id/change-password', (req, res) => {
  const { newPassword } = req.body;
  const db = readDB();
  const user = db.users.find(u => u.id === req.params.id);

  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }

  user.password = newPassword;
  user.changedPassword = true; 
  writeDB(db);
  res.json({ message: `Password changed successfully for user ${user.username}.` });
});

app.post('/api/users/:id/reset-password', (req, res) => {
  const db = readDB();
  const userId = req.params.id;
  const user = db.users.find(u => u.id === userId);
  
  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }

  user.password = "temp123";
  user.changedPassword = false;
  writeDB(db);
  res.json({ message: "Password reset back to temp123 successfully." });
});

app.post('/api/admins', (req, res) => {
  const { name, username, email, password } = req.body;
  const db = readDB();

  if (db.admins.some(a => a.username === username)) {
    return res.status(400).json({ error: "Admin username already taken." });
  }

  const newAdmin = { name, username, email, password };
  db.admins.push(newAdmin);
  writeDB(db);
  res.status(201).json(newAdmin);
});

app.post('/api/management', (req, res) => {
  const { position, name, password } = req.body;
  const db = readDB();

  if (db.management.some(m => m.position === position)) {
    return res.status(400).json({ error: "Management position already registered." });
  }

  const newMgmt = { position, name, password, biometricConfigured: true };
  db.management.push(newMgmt);
  writeDB(db);
  res.status(201).json(newMgmt);
});

app.post('/api/work-orders', (req, res) => {
  const { title, serial, description, assetId, assetName, criticality, priority, assignedToId, assignedToName, durationExpected, peopleCount, partsRequired, partsShortageFlag } = req.body;
  const db = readDB();

  const newWO = {
    id: `WO-${Math.floor(1000 + Math.random() * 9000)}`,
    title,
    serial,
    description,
    assetId,
    assetName,
    criticality,
    priority,
    status: partsShortageFlag ? "Awaiting Spares" : "Pending",
    assignedToId,
    assignedToName,
    durationExpected,
    peopleCount,
    partsRequired,
    partsShortageFlag,
    createdAt: new Date().toLocaleString(),
    completedAt: null,
    progress: 0,
    progressNotes: "",
    artisanNotes: "",
    authorizedBy: "",
    engineeringDirective: ""
  };

  db.workOrders.unshift(newWO);
  
  if (!db.suggestions.jobNames.includes(title)) db.suggestions.jobNames.push(title);
  if (serial && !db.suggestions.serialNumbers.includes(serial)) db.suggestions.serialNumbers.push(serial);
  if (description && !db.suggestions.whatToDos.includes(description)) db.suggestions.whatToDos.push(description);

  const artisan = db.users.find(u => u.id === assignedToId);
  if (artisan) artisan.assignedCount += 1;

  writeDB(db);
  res.status(201).json(newWO);
});

app.patch('/api/work-orders/:id', (req, res) => {
  const { status, progress, progressNotes, artisanNotes } = req.body;
  const db = readDB();
  const wo = db.workOrders.find(w => w.id === req.params.id);

  if (!wo) {
    return res.status(404).json({ error: "Work Order not found." });
  }

  if (status) wo.status = status;
  if (progress !== undefined) wo.progress = progress;
  if (progressNotes) wo.progressNotes = progressNotes;
  if (artisanNotes) {
    wo.artisanNotes = artisanNotes;
    wo.completedAt = new Date().toLocaleString();
    
    if (wo.partsRequired !== "None") {
      const part = db.inventory.find(p => p.name === wo.partsRequired);
      if (part && part.quantity > 0) {
        part.quantity -= 1;
      }
    }

    const artisan = db.users.find(u => u.id === wo.assignedToId);
    if (artisan) {
      artisan.completedCount += 1;
      artisan.slaAdherence = Math.min(100, Math.floor(80 + (Math.random() * 20)));
    }
  }

  writeDB(db);
  res.json(wo);
});

// --- ADMIN PASSWORD RESET BY REGISTERED OPERATIONS ENGINEER BYPASS ---
app.post('/api/auth/ops-recovery-reset', (req, res) => {
  const { opsUsername, opsPassword, newAdminUser, newAdminPass } = req.body;
  const db = readDB();

  // Validate Operations Engineer credentials in management array
  const opsProfile = db.management.find(m => m.position === "Operations Engineer" && m.password === opsPassword);
  
  if (!opsProfile) {
    return res.status(401).json({ error: "Bypass Rejected: Invalid Operations Engineer Password." });
  }

  // Update or set up the Administrator profile
  db.admins = [
    {
      username: newAdminUser,
      password: newAdminPass,
      name: "Shift Admin",
      email: "admin@minesync.com"
    }
  ];

  writeDB(db);
  res.json({ message: "Admin credentials successfully rewritten. Access authorized." });
});

// --- REAL EMAIL DISPATCH SERVICE WITH DYNAMIC SMTP LOADING ---
app.post('/api/send-email', async (req, res) => {
  const { to, subject, text, html } = req.body;
  const db = readDB();

  const fromEmail = db.company.smtp.from || db.company.supportEmail || "support@minesync.com";
  const newEmailLog = {
    id: Date.now(),
    to,
    from: fromEmail,
    subject,
    text,
    timestamp: new Date().toLocaleString()
  };

  db.emails.unshift(newEmailLog);
  writeDB(db);

  // Load Admin's configured SMTP settings dynamically!
  const transporter = createDynamicTransporter(db.company.smtp);

  if (transporter) {
    try {
      await transporter.sendMail({
        from: `"${db.company.name} Notifications" <${fromEmail}>`,
        to,
        subject,
        text,
        html: html || text
      });
      console.log(`[REAL SMTP SUCCESS] Sent email to ${to} for subject "${subject}"`);
      return res.json({ success: true, message: "Real email successfully dispatched to Gmail/Mail App.", email: newEmailLog });
    } catch (e) {
      console.error("[REAL SMTP ERROR] Node.js SMTP failed: " + e.message);
    }
  }

  console.log(`\n------------------------------------------------------`);
  console.log(`[SIMULATED EMAIL SENT] (Configure SMTP inside Admin console for real Gmail delivery!)`);
  console.log(`FROM   : ${fromEmail}`);
  console.log(`TO     : ${to}`);
  console.log(`SUBJECT: ${subject}`);
  console.log(`BODY   : ${text}`);
  console.log(`------------------------------------------------------\n`);

  res.json({ success: true, message: "Simulated mail log captured. Configuration pending.", email: newEmailLog });
});

app.get('/api/emails', (req, res) => {
  const db = readDB();
  res.json(db.emails);
});

// Reset Password via Email Code Validation
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  const db = readDB();

  // Search users and admins
  let targetUser = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  let targetAdmin = db.admins.find(a => a.email.toLowerCase() === email.toLowerCase());

  if (!targetUser && !targetAdmin) {
    return res.status(404).json({ error: "Email address not registered in MINESYNC Roster." });
  }

  const tempCode = Math.floor(100000 + Math.random() * 900000);
  const resetTokenMessage = `Hello, \n\nWe received a password reset request for your MINESYNC account. Use the following security code to access and reset your credentials: \n\n🔒 RECOVERY CODE: ${tempCode} \n\nIf you did not request this, please contact your System Administrator immediately. \n\nSupport: ${db.company.supportEmail}`;

  const fromEmail = db.company.smtp.from || db.company.supportEmail || "support@minesync.com";
  const newEmail = {
    id: Date.now(),
    to: email,
    from: fromEmail,
    subject: "MINESYNC - Password Recovery Code",
    text: resetTokenMessage,
    timestamp: new Date().toLocaleString()
  };
  db.emails.unshift(newEmail);
  writeDB(db);

  // Dynamic dispatch to Gmail if SMTP is configured
  const transporter = createDynamicTransporter(db.company.smtp);
  if (transporter) {
    try {
      await transporter.sendMail({
        from: `"${db.company.name} Security" <${fromEmail}>`,
        to: email,
        subject: "MINESYNC Security - Password Reset Request",
        text: resetTokenMessage,
        html: `<p>We received a password reset request for your MINESYNC account.</p><h2 style="color: #FF6B00; font-family: monospace;">🔒 RECOVERY CODE: ${tempCode}</h2><p>Support: ${db.company.supportEmail}</p>`
      });
      console.log(`[SMTP RECOVERY SUCCESS] Dispatched secure code ${tempCode} to ${email}`);
    } catch (e) {
      console.error("[SMTP RECOVERY ERROR] Failed: " + e.message);
    }
  }

  res.json({ message: "Recovery code generated and dispatched.", recoveryCode: tempCode, email });
});

app.post('/api/auth/reset-password-confirm', (req, res) => {
  const { email, newPassword } = req.body;
  const db = readDB();

  let targetUser = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  let targetAdmin = db.admins.find(a => a.email.toLowerCase() === email.toLowerCase());

  if (targetUser) {
    targetUser.password = newPassword;
    targetUser.changedPassword = true;
  } else if (targetAdmin) {
    targetAdmin.password = newPassword;
  } else {
    return res.status(404).json({ error: "Account reference lost." });
  }

  writeDB(db);
  res.json({ message: "Credentials successfully updated. Access restored." });
});

// Chats
app.post('/api/chats', (req, res) => {
  const { sender, receiver, text } = req.body;
  const db = readDB();
  const newChat = {
    id: Date.now(),
    sender,
    receiver,
    text,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };
  db.chats.push(newChat);
  writeDB(db);
  res.json(newChat);
});

app.get('/api/chats', (req, res) => {
  const db = readDB();
  res.json(db.chats);
});

// --- BACKUP & RESTORE ENDPOINTS ---
app.get('/api/backup/download', (req, res) => {
  const db = readDB();
  res.json(db);
});

app.post('/api/backup/restore', (req, res) => {
  const backupData = req.body;
  if (!backupData || !backupData.company || !Array.isArray(backupData.assets) || !Array.isArray(backupData.users)) {
    return res.status(400).json({ error: "Invalid backup database payload structure." });
  }
  writeDB(backupData);
  res.json({ message: "Database successfully configured and restored.", company: backupData.company });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`  MINESYNC SYSTEM ACTIVE ON PORT ${PORT}`);
  console.log(`  LAUNCH DIRECTLY: http://localhost:${PORT}`);
  console.log(`======================================================\n`);
});
