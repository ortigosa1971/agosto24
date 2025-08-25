# Login + Estación Meteorológica (SQLite + Sesión Única + Redis en producción)

## Local
```bash
npm install
node initdb.js   # crea/actualiza db.sqlite desde schema.sql
npm start        # http://localhost:3000/iniciar-sesion
```

Usuarios demo: `ana`, `pedro`, `maria`.

## Producción (Railway/Heroku)
- No se versiona `db.sqlite`. Se crea en el deploy vía `postinstall` (initdb.js) o en arranque (fallback de app.js).
- **Sesiones**: usa **Redis** si `NODE_ENV=production` y `REDIS_URL` está definida.

### Variables de entorno
- `NODE_ENV=production`
- `SESSION_SECRET=<clave_larga_segura>`
- `REDIS_URL=redis://default:<PASSWORD>@<HOST>:<PORT>`

### Notas Cookies
- En producción se fuerza `cookie.secure=true` y `sameSite=none` (requiere HTTPS).

## Comandos Git (machacar repo remoto)
```bash
git init
git lfs install
git lfs track "*.sqlite" "*.db"
git add .gitattributes
git add .
git commit -m "Login + Estación con Redis (prod) y fix DB auto-recreable"
git branch -M main
git remote add origin https://github.com/ortigosa1971/agosto24.git
git push -f origin main
```

## Estructura
- `app.js` → servidor Express. Recrea DB si es inválida y usa Redis en prod.
- `schema.sql` → esquema idempotente (usuarios demo).
- `initdb.js` → crea/actualiza DB en postinstall.
- `public/login.html` → login.
- `public/estacion.html` → estación meteorológica.
