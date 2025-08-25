CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario TEXT UNIQUE NOT NULL,
  session_version TEXT
);
INSERT OR IGNORE INTO usuarios (usuario, session_version) VALUES ('ana',   hex(randomblob(16)));
INSERT OR IGNORE INTO usuarios (usuario, session_version) VALUES ('pedro', hex(randomblob(16)));
INSERT OR IGNORE INTO usuarios (usuario, session_version) VALUES ('maria', hex(randomblob(16)));
