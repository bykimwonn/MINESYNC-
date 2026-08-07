const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 5000;
const DB_FILE = path.join(__dirname, 'db.json');
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// --- SEED INITIAL DB STATE IF NOT EXISTS (PRISTINE EMPTY FOR LAUNCH) ---
const seedData = {
  company: {
    name: "",
    logoUrl: "",
    supportEmail: "",
    contactDetails: "",
    plantGuidelines: "",
    groqApiKey: "",
    smtp: {
      host: "",
      port: "587",
      user: "",
      pass: "",
      from: ""
    }
  },
  assets: [],
  inventory: [],
  users: [], 
  admins: [], 
  management: [], 
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
  emails: []
};

// --- MULTI-TENANT DB CONTROLLERS ---
function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    const initialDB = {
      companies: {} // Start completely empty! No preloaded default companies!
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDB, null, 2));
    return initialDB;
  }
  const raw = fs.readFileSync(DB_FILE);
  let parsed = JSON.parse(raw);

  // RESILIENT LEGACY SCHEMA MIGRATOR
  if (!parsed.companies) {
    console.log("[LEGACY UPGRADER] Upgrading legacy database schema to multi-tenant...");
    const upgradedDB = {
      companies: {}
    };
    writeDB(upgradedDB);
    return upgradedDB;
  }
  return parsed;
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Helper to get company's partitioned sandbox from DB
function getCompanyData(req, res, db) {
  const companyName = req.headers['x-company-name'] || req.query.company;
  if (!companyName || !db.companies[companyName]) {
    res.status(404).json({ error: `No such company "${companyName || 'unspecified'}" exists in the system database.` });
    return null;
  }
  return db.companies[companyName];
}

// Initialize database
readDB();

// Dynamic Transporter Factory
function createDynamicTransporter(smtp) {
  if (smtp && smtp.host && smtp.user && smtp.pass) {
    return nodemailer.createTransport({
      host: smtp.host,
      port: parseInt(smtp.port) || 587,
      secure: parseInt(smtp.port) === 465,
      auth: {
        user: smtp.user,
        pass: smtp.pass
      }
    });
  }
  // --- GLOBAL SYSTEM SMTP FALLBACK (Zero-Setup for other companies!) ---
  if (process.env.GLOBAL_SMTP_HOST && process.env.GLOBAL_SMTP_USER && process.env.GLOBAL_SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.GLOBAL_SMTP_HOST,
      port: parseInt(process.env.GLOBAL_SMTP_PORT) || 587,
      secure: parseInt(process.env.GLOBAL_SMTP_PORT) === 465,
      auth: {
        user: process.env.GLOBAL_SMTP_USER,
        pass: process.env.GLOBAL_SMTP_PASS
      }
    });
  }
  return null;
}

// Helper to call Groq AI Endpoint
async function callGroqAI(apiKey, systemPrompt, userPrompt) {
  const key = apiKey || process.env.GROQ_API_KEY;
  if (!key) {
    throw new Error("No Groq API Key configured in Environment or Admin settings.");
  }

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: "llama3-8b-8192", 
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.2,
      max_tokens: 1000
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq API Error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// --- SYSTEM-WIDE REST ENDPOINTS ---

// Get List of All Registered Companies
app.get('/api/companies', (req, res) => {
  const db = readDB();
  const list = Object.keys(db.companies).map(key => ({
    name: key,
    logoUrl: db.companies[key].company.logoUrl,
    supportEmail: db.companies[key].company.supportEmail,
    contactDetails: db.companies[key].company.contactDetails
  }));
  res.json(list);
});

// Create/Register a New Company Node
app.post('/api/companies', (req, res) => {
  const { name, logoUrl, supportEmail, contactDetails, plantGuidelines } = req.body;
  const db = readDB();

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Company Name is mandatory." });
  }

  const cleanName = name.trim();
  if (db.companies[cleanName]) {
    return res.status(400).json({ error: "Company name is already registered." });
  }

  db.companies[cleanName] = {
    company: {
      name: cleanName,
      logoUrl: logoUrl || "",
      supportEmail: supportEmail || "",
      contactDetails: contactDetails || "",
      plantGuidelines: plantGuidelines || "",
      groqApiKey: "",
      smtp: { host: "", port: "587", user: "", pass: "", from: "" }
    },
    assets: [], // Pristine assets - empty on registration!
    inventory: [], // Pristine inventory - empty on registration!
    users: [],
    admins: [],
    management: [],
    workOrders: [],
    suggestions: { ...seedData.suggestions },
    shortages: [],
    chats: [],
    emails: []
  };

  writeDB(db);
  res.status(201).json(db.companies[cleanName].company);
});

// Fetch complete state for a company
app.get('/api/state', (req, res) => {
  const db = readDB();
  const compData = getCompanyData(req, res, db);
  if (!compData) return;
  res.json(compData);
});

// Update Company, SMTP & Groq AI Key Configurations
app.put('/api/company', (req, res) => {
  const { name, logoUrl, supportEmail, contactDetails, plantGuidelines, groqApiKey, smtp } = req.body;
  const db = readDB();
  const compData = getCompanyData(req, res, db);
  if (!compData) return;

  if (logoUrl) compData.company.logoUrl = logoUrl;
  if (supportEmail) compData.company.supportEmail = supportEmail;
  if (contactDetails) compData.company.contactDetails = contactDetails;
  if (plantGuidelines) compData.company.plantGuidelines = plantGuidelines;
  if (groqApiKey !== undefined) compData.company.groqApiKey = groqApiKey;
  if (smtp) {
    compData.company.smtp = {
      host: smtp.host || "",
      port: smtp.port || "587",
      user: smtp.user || "",
      pass: smtp.pass || "",
      from: smtp.from || ""
    };
  }

  writeDB(db);
  res.json(compData.company);
});

// Create Employee/User (Admin)
app.post('/api/users', (req, res) => {
  const { name, username, role, trade, email, whatsapp } = req.body;
  const db = readDB();
  const compData = getCompanyData(req, res, db);
  if (!compData) return;

  if (compData.users.some(u => u.username === username)) {
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
    slaAdherence: 100,
    dob: "",
    address: "",
    emergencyName: "",
    emergencyPhone: "",
    profileImg: ""
  };

  compData.users.push(newUser);
  writeDB(db);
  res.status(201).json(newUser);
});

// Update User Profile Details
app.put('/api/users/:id', (req, res) => {
  const { dob, address, whatsapp, emergencyName, emergencyPhone, profileImg } = req.body;
  const db = readDB();
  const compData = getCompanyData(req, res, db);
  if (!compData) return;

  const user = compData.users.find(u => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }

  if (dob !== undefined) user.dob = dob;
  if (address !== undefined) user.address = address;
  if (whatsapp !== undefined) user.whatsapp = whatsapp;
  if (emergencyName !== undefined) user.emergencyName = emergencyName;
  if (emergencyPhone !== undefined) user.emergencyPhone = emergencyPhone;
  if (profileImg !== undefined) user.profileImg = profileImg;

  writeDB(db);
  res.json(user);
});

// Reset password back to temp123 (Admin)
app.post('/api/users/:id/reset-password', (req, res) => {
  const db = readDB();
  const compData = getCompanyData(req, res, db);
  if (!compData) return;

  const user = compData.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: "User not found." });

  user.password = "temp123";
  user.changedPassword = false;
  writeDB(db);
  res.json({ message: "Password reset back to temp123 successfully." });
});

// Force password override
app.patch('/api/users/:id/change-password', (req, res) => {
  const { newPassword } = req.body;
  const db = readDB();
  const compData = getCompanyData(req, res, db);
  if (!compData) return;

  const user = compData.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: "User not found." });

  user.password = newPassword;
  user.changedPassword = true;
  writeDB(db);
  res.json({ message: "Credentials successfully updated." });
});

// Delete user
app.delete('/api/users/:id', (req, res) => {
  const db = readDB();
  const compData = getCompanyData(req, res, db);
  if (!compData) return;

  const initialCount = compData.users.length;
  compData.users = compData.users.filter(u => u.id !== req.params.id);

  if (compData.users.length === initialCount) {
    return res.status(404).json({ error: "User not found." });
  }

  writeDB(db);
  res.json({ message: "User successfully deleted from roster." });
});

// Register Administrator Profile
app.post('/api/admins', (req, res) => {
  const { name, username, email, password } = req.body;
  const db = readDB();
  const compData = getCompanyData(req, res, db);
  if (!compData) return;

  if (compData.admins.some(a => a.username === username)) {
    return res.status(400).json({ error: "Admin username taken." });
  }

  const newAdmin = { name, username, email, password };
  compData.admins.push(newAdmin);
  writeDB(db);
  res.status(201).json(newAdmin);
});

// Register Management Profile
app.post('/api/management', (req, res) => {
  const { position, name, password } = req.body;
  const db = readDB();
  const compData = getCompanyData(req, res, db);
  if (!compData) return;

  if (compData.management.some(m => m.position === position)) {
    return res.status(400).json({ error: "Position already registered." });
  }

  const newMgmt = { position, name, password, biometricConfigured: true };
  compData.management.push(newMgmt);
  writeDB(db);
  res.status(201).json(newMgmt);
});

// Dispatch/Create Work Order
app.post('/api/work-orders', (req, res) => {
  const { title, serial, description, assetId, assetName, criticality, priority, assignedToId, assignedToName, durationExpected, peopleCount, partsRequired, partsShortageFlag } = req.body;
  const db = readDB();
  const compData = getCompanyData(req, res, db);
  if (!compData) return;

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

  compData.workOrders.unshift(newWO);

  if (!compData.suggestions.jobNames.includes(title)) compData.suggestions.jobNames.push(title);
  if (serial && !compData.suggestions.serialNumbers.includes(serial)) compData.suggestions.serialNumbers.push(serial);
  if (description && !compData.suggestions.whatToDos.includes(description)) compData.suggestions.whatToDos.push(description);

  const artisan = compData.users.find(u => u.id === assignedToId);
  if (artisan) artisan.assignedCount += 1;

  writeDB(db);
  res.status(201).json(newWO);
});

// Update Work Order progress/status
app.patch('/api/work-orders/:id', (req, res) => {
  const { status, progress, progressNotes, artisanNotes, engineeringDirective, authorizedBy } = req.body;
  const db = readDB();
  const compData = getCompanyData(req, res, db);
  if (!compData) return;

  const wo = compData.workOrders.find(w => w.id === req.params.id);
  if (!wo) return res.status(404).json({ error: "Work Order not found." });

  if (status) wo.status = status;
  if (progress !== undefined) wo.progress = progress;
  if (progressNotes) wo.progressNotes = progressNotes;
  if (engineeringDirective) wo.engineeringDirective = engineeringDirective;
  if (authorizedBy) wo.authorizedBy = authorizedBy;

  if (artisanNotes) {
    wo.artisanNotes = artisanNotes;
    wo.completedAt = new Date().toLocaleString();

    if (wo.partsRequired !== "None") {
      const part = compData.inventory.find(p => p.name === wo.partsRequired);
      if (part && part.quantity > 0) {
        part.quantity -= 1;
      }
    }

    const artisan = compData.users.find(u => u.id === wo.assignedToId);
    if (artisan) {
      artisan.completedCount += 1;
      artisan.slaAdherence = Math.min(100, Math.floor(80 + (Math.random() * 20)));
    }
  }

  writeDB(db);
  res.json(wo);
});

// Operations Engineer Admin Bypass credentials rewrite
app.post('/api/auth/ops-recovery-reset', (req, res) => {
  const { opsUsername, opsPassword, newAdminUser, newAdminPass } = req.body;
  const db = readDB();
  const compData = getCompanyData(req, res, db);
  if (!compData) return;

  const opsProfile = compData.management.find(m => m.position === "Operations Engineer" && m.password === opsPassword);
  if (!opsProfile) {
    return res.status(401).json({ error: "Bypass Rejected: Invalid Operations Engineer Password." });
  }

  compData.admins = [
    {
      username: newAdminUser,
      password: newAdminPass,
      name: "Shift Admin",
      email: "admin@minesync.com"
    }
  ];

  writeDB(db);
  res.json({ message: "Admin credentials successfully rewritten." });
});

// --- BT AI (GROQ LLM) INTEGRATION ROUTE ---
app.post('/api/ai/analyze', async (req, res) => {
  const { prompt, contextType, jobContext } = req.body;
  const db = readDB();
  const compData = getCompanyData(req, res, db);
  if (!compData) return;

  const apiKey = compData.company.groqApiKey || process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(400).json({ error: "BT AI is currently on standby: Please save your Groq API Key in the Admin console Settings to activate." });
  }

  let systemPrompt = "You are BT AI, an expert, senior metallurgical plant operations manager and safety inspector at our metallurgical plant. ";
  systemPrompt += "Provide professional, highly detailed, precise industrial recommendations. Structure your responses with clean formatting and bold subtitles.";

  let userPrompt = "";

  if (contextType === "safety_directives") {
    userPrompt = `Please generate expert engineering safety directives, Lock-Out Tag-Out (LOTO) requirements, and troubleshooting steps for the following work card:\n\n`;
    userPrompt += `Asset Item: ${jobContext.assetName} (criticality level: ${jobContext.criticality})\n`;
    userPrompt += `Serial Code: ${jobContext.serial}\n`;
    userPrompt += `Reported Issue: ${jobContext.title}\n`;
    userPrompt += `Description Details: ${jobContext.description}\n\n`;
    userPrompt += `Provide 3 specific safety/LOTO precautions and 2 clear maintenance diagnostic guidelines. Keep your total response under 150 words.`;
  } else if (contextType === "ai_analyst_report") {
    userPrompt = `Perform a high-level metallurgical plant diagnostic synthesis and compliance analysis. We are operating under the following guidelines:\n\n`;
    userPrompt += `Plant Guidelines: "${compData.company.plantGuidelines}"\n\n`;
    userPrompt += `Current Plant Outages & Stats:\n`;
    userPrompt += `- Active Outages/Cards pending: ${jobContext.activeCount}\n`;
    userPrompt += `- Completed Repairs: ${jobContext.completedCount}\n`;
    userPrompt += `- Out-of-Stock Stores Shortages: ${jobContext.sparesCount}\n`;
    userPrompt += `- Mean Time To Repair (MTTR): ${jobContext.mttr}\n\n`;
    userPrompt += `Provide a concise metallurgical assessment (under 250 words) comparing these statistics directly against our guidelines (e.g. highlight structural crack LOTO delays, flotation circuit starve risk on Ball Mill outages, or stockpiles shortages). Output recommendations clearly.`;
  } else if (contextType === "radio_chat") {
    userPrompt = `A field technician is calling you over the direct radio transceiver channel. Please answer their technical question concisely:\n\n`;
    userPrompt += `Technician Query: "${prompt}"\n\n`;
    userPrompt += `Provide a highly precise engineering answer under 90 words.`;
  } else {
    userPrompt = prompt;
  }

  try {
    const aiResponse = await callGroqAI(apiKey, systemPrompt, userPrompt);
    res.json({ text: aiResponse });
  } catch (err) {
    console.error("[BT AI ERROR]", err.message);
    res.status(500).json({ error: `BT AI Synthesis Error: ${err.message}` });
  }
});

// SMTP Mail dispatcher
app.post('/api/send-email', async (req, res) => {
  const { to, subject, text, html } = req.body;
  const db = readDB();
  const compData = getCompanyData(req, res, db);
  if (!compData) return;

  const fromEmail = compData.company.smtp.from || compData.company.supportEmail || "support@minesync.com";
  const newEmailLog = {
    id: Date.now(),
    to,
    from: fromEmail,
    subject,
    text,
    timestamp: new Date().toLocaleString()
  };

  compData.emails.unshift(newEmailLog);
  writeDB(db);

  const transporter = createDynamicTransporter(compData.company.smtp);
  if (transporter) {
    try {
      await transporter.sendMail({
        from: `"${compData.company.name} Notifications" <${fromEmail}>`,
        to,
        subject,
        text,
        html: html || text
      });
      return res.json({ success: true, message: "Real email successfully dispatched to Gmail.", email: newEmailLog });
    } catch (e) {
      console.error("[SMTP ERROR] " + e.message);
    }
  }

  res.json({ success: true, message: "Simulated mail logged in fallbacks.", email: newEmailLog });
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  const db = readDB();
  const compData = getCompanyData(req, res, db);
  if (!compData) return;

  let targetUser = compData.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  let targetAdmin = compData.admins.find(a => a.email.toLowerCase() === email.toLowerCase());

  if (!targetUser && !targetAdmin) {
    return res.status(404).json({ error: "Email address not registered in roster." });
  }

  const tempCode = Math.floor(100000 + Math.random() * 900000);
  const message = `🔒 RECOVERY CODE: ${tempCode}`;

  const fromEmail = compData.company.smtp.from || compData.company.supportEmail || "support@minesync.com";
  const newEmail = {
    id: Date.now(),
    to: email,
    from: fromEmail,
    subject: "MINESYNC - Password Recovery",
    text: message,
    timestamp: new Date().toLocaleString()
  };
  compData.emails.unshift(newEmail);
  writeDB(db);

  const transporter = createDynamicTransporter(compData.company.smtp);
  if (transporter) {
    try {
      await transporter.sendMail({
        from: `"${compData.company.name} Security" <${fromEmail}>`,
        to: email,
        subject: "Password Reset Request",
        text: message
      });
    } catch (e) {
      console.error(e);
    }
  }

  res.json({ message: "Recovery code generated.", recoveryCode: tempCode, email });
});

app.post('/api/auth/reset-password-confirm', (req, res) => {
  const { email, newPassword } = req.body;
  const db = readDB();
  const compData = getCompanyData(req, res, db);
  if (!compData) return;

  let targetUser = compData.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  let targetAdmin = compData.admins.find(a => a.email.toLowerCase() === email.toLowerCase());

  if (targetUser) {
    targetUser.password = newPassword;
    targetUser.changedPassword = true;
  } else if (targetAdmin) {
    targetAdmin.password = newPassword;
  } else {
    return res.status(404).json({ error: "Account reference lost." });
  }

  writeDB(db);
  res.json({ message: "Credentials successfully updated." });
});

// Chats
app.post('/api/chats', (req, res) => {
  const { sender, receiver, text } = req.body;
  const db = readDB();
  const compData = getCompanyData(req, res, db);
  if (!compData) return;

  const newChat = {
    id: Date.now(),
    sender,
    receiver,
    text,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };
  compData.chats.push(newChat);
  writeDB(db);
  res.json(newChat);
});

// --- BACKUP & RESTORE PAYLOAD HANDLERS ---
app.get('/api/backup/download', (req, res) => {
  const db = readDB();
  const compData = getCompanyData(req, res, db);
  if (!compData) return;
  res.json(compData);
});

app.post('/api/backup/restore', (req, res) => {
  const backupData = req.body;
  if (!backupData || !backupData.company || !Array.isArray(backupData.assets) || !Array.isArray(backupData.users)) {
    return res.status(400).json({ error: "Invalid backup database payload structure." });
  }
  const db = readDB();
  const companyName = backupData.company.name;
  db.companies[companyName] = backupData;
  writeDB(db);
  res.json({ message: "Database successfully configured and restored.", company: backupData.company });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`  MINESYNC MULTI-TENANT BACKEND ACTIVE ON PORT ${PORT}`);
  console.log(`======================================================\n`);
});
