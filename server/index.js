import express from 'express';
import cors from 'cors';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createStorage, isCloudinaryMode } from './storage.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const STORAGE_DIR = process.env.STORAGE_DIR || path.join(ROOT, 'data');

const JWT_SECRET = process.env.JWT_SECRET || 'atelier-secret-cambiar-en-produccion';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

if (IS_PRODUCTION && JWT_SECRET === 'atelier-secret-cambiar-en-produccion') {
  console.warn('ADVERTENCIA: Define JWT_SECRET en las variables de entorno de producción.');
}

const storage = createStorage(STORAGE_DIR);

const app = express();
app.use(cors());
app.use(express.json());

if (!isCloudinaryMode() && storage.uploadsDir) {
  app.use('/uploads', express.static(storage.uploadsDir));
}

app.use(express.static(path.join(ROOT, 'public')));

const upload = multer({
  storage: isCloudinaryMode() ? multer.memoryStorage() : multer.diskStorage({
    destination: storage.uploadsDir,
    filename: (_, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

app.post('/api/auth/login', async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Contraseña requerida' });

  const valid = password === ADMIN_PASSWORD || await bcrypt.compare(password, await getHashedPassword());
  if (!valid) return res.status(401).json({ error: 'Contraseña incorrecta' });

  const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token });
});

async function getHashedPassword() {
  const hashFile = path.join(STORAGE_DIR, '.admin-hash');
  if (!fs.existsSync(path.dirname(hashFile))) fs.mkdirSync(path.dirname(hashFile), { recursive: true });
  if (!fs.existsSync(hashFile)) {
    const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    fs.writeFileSync(hashFile, hash);
    return hash;
  }
  return fs.readFileSync(hashFile, 'utf-8');
}

app.get('/api/artworks', async (req, res) => {
  try {
    let artworks = await storage.listArtworks();
    const style = req.query.style?.trim();
    if (style) {
      artworks = artworks.filter((a) => (a.style || '').toLowerCase() === style.toLowerCase());
    }
    res.json(artworks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al cargar obras' });
  }
});

app.get('/api/styles', async (_, res) => {
  try {
    const artworks = await storage.listArtworks();
    const styles = [...new Set(artworks.map((a) => a.style?.trim()).filter(Boolean))].sort();
    res.json(styles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al cargar estilos' });
  }
});

app.get('/api/artworks/:id', async (req, res) => {
  try {
    const artwork = await storage.getArtwork(req.params.id);
    if (!artwork) return res.status(404).json({ error: 'Obra no encontrada' });
    res.json(artwork);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al cargar obra' });
  }
});

app.post('/api/artworks', authMiddleware, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Imagen requerida' });

  const { title, description, year, medium, dimensions, style } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Título requerido' });

  try {
    const artwork = await storage.createArtwork(req.file, {
      title: title.trim(),
      description: description?.trim() || '',
      year: year?.trim() || '',
      medium: medium?.trim() || '',
      dimensions: dimensions?.trim() || '',
      style: style?.trim() || '',
    });
    res.status(201).json(artwork);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al subir obra' });
  }
});

app.put('/api/artworks/:id', authMiddleware, async (req, res) => {
  const { title, description, year, medium, dimensions, style } = req.body;
  try {
    const artwork = await storage.updateArtwork(req.params.id, {
      title: title?.trim(),
      description: description?.trim(),
      year: year?.trim(),
      medium: medium?.trim(),
      dimensions: dimensions?.trim(),
      style: style?.trim(),
    });
    if (!artwork) return res.status(404).json({ error: 'Obra no encontrada' });
    res.json(artwork);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar obra' });
  }
});

app.delete('/api/artworks/:id', authMiddleware, async (req, res) => {
  try {
    const deleted = await storage.deleteArtwork(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Obra no encontrada' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar obra' });
  }
});

app.get('/api/health', (_, res) => {
  res.json({ status: 'ok', storage: storage.mode });
});

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`Servidor en http://${HOST}:${PORT}`);
});
