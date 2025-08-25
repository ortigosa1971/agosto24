import express from "express";
import session from "express-session";
import Database from "better-sqlite3";
import crypto from "node:crypto";
import path from "node:path";
import fs from "fs";
import { fileURLToPath } from "node:url";
import RedisStoreInit from "connect-redis";
import { Redis } from "ioredis";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, "db.sqlite");
const SCHEMA_PATH = path.join(__dirname, "schema.sql");

// Verificar header SQLite y recrear si es inválido
function isValidSQLite(filePath) {
  try {
    const buf = fs.readFileSync(filePath);
    if (buf.length < 16) return false;
    const header = buf.slice(0, 16).toString("utf8");
    return header === "SQLite format 3\u0000";
  } catch {
    return false;
  }
}

if (!isValidSQLite(DB_PATH)) {
  try {
    if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
    const tmpDb = new Database(DB_PATH);
    const schema = fs.readFileSync(SCHEMA_PATH, "utf8");
    tmpDb.exec(schema);
    tmpDb.close();
    console.log("🛠️ db.sqlite recreada desde schema.sql (archivo inválido o ausente).");
  } catch (e) {
    console.error("❌ Error creando DB desde schema:", e);
  }
}

// Abrir DB válida y asegurar tabla
const db = new Database(DB_PATH);
try {
  db.prepare("SELECT 1 FROM usuarios LIMIT 1").get();
} catch {
  const schema = fs.readFileSync(SCHEMA_PATH, "utf8");
  db.exec(schema);
  console.log("🛠️ DB inicializada al vuelo desde schema.sql");
}

const getUser = db.prepare("SELECT id, usuario, session_version FROM usuarios WHERE lower(usuario)=?");
const setSessionVersion = db.prepare("UPDATE usuarios SET session_version=? WHERE id=?");

function newSessionVersion() {
  return crypto.randomBytes(16).toString("hex");
}

const app = express();

// ---- Sesiones: Redis en producción, MemoryStore en dev ----
const PROD = process.env.NODE_ENV === "production";
const REDIS_URL = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL; // soporta Upstash

let store;
if (PROD && REDIS_URL) {
  const redis = new Redis(REDIS_URL);
  const RedisStore = RedisStoreInit(session);
  store = new RedisStore({ client: redis, prefix: "sess:" });
  app.set("trust proxy", 1); // detrás de proxy en Railway/Heroku
}

app.use(express.urlencoded({ extended: true }));
app.use(session({
  store, // undefined en dev => MemoryStore
  secret: process.env.SESSION_SECRET || "dev_secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: PROD ? "none" : "lax",
    secure: PROD,              // requiere HTTPS en prod
    maxAge: 1000 * 60 * 60 * 8 // 8 horas
  }
}));

app.use(express.static(path.join(__dirname, "public")));

// Auth + single session
function requiereAuth(req, res, next) {
  const nombre = req.session?.usuario;
  const version = req.session?.sessionVersion;
  if (!nombre || !version) return res.redirect("/iniciar-sesion");
  const row = getUser.get(nombre.trim().toLowerCase());
  if (!row) return res.redirect("/iniciar-sesion");
  if (row.session_version !== version) {
    req.session.destroy(() => res.redirect("/iniciar-sesion?error=sesion"));
    return;
  }
  next();
}

// Login
app.get("/iniciar-sesion", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.post("/iniciar-sesion", (req, res) => {
  const { usuario } = req.body;
  if (!usuario) return res.redirect("/iniciar-sesion?error=1");
  const row = getUser.get(usuario.trim().toLowerCase());
  if (!row) return res.redirect("/iniciar-sesion?error=1");
  const version = newSessionVersion();
  setSessionVersion.run(version, row.id);
  req.session.usuario = row.usuario.toLowerCase();
  req.session.sessionVersion = version;
  return res.redirect("/inicio");
});

app.get("/inicio", requiereAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "estacion.html"));
});

app.get("/verificar-sesion", (req, res) => {
  if (!req.session?.usuario) return res.status(401).json({ error: "Sesión expirada" });
  res.json({ ok: true });
});

app.post("/logout", requiereAuth, (req, res) => {
  req.session.destroy(() => res.redirect("/iniciar-sesion"));
});

app.get("/login", (req, res) => res.redirect("/iniciar-sesion"));
app.get("/iniciar sesión", (req, res) => res.redirect("/iniciar-sesion"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor en http://localhost:${PORT}`);
});
