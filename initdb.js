// Crea/actualiza la DB desde schema.sql (para postinstall y uso local)
import Database from "better-sqlite3";
import fs from "fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(path.join(__dirname, "db.sqlite"));
const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
db.exec(schema);
console.log("✅ DB creada/actualizada con schema.sql");
