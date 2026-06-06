import fs from 'fs';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';
import { v4 as uuidv4 } from 'uuid';

const USE_CLOUDINARY = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (USE_CLOUDINARY) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export function isCloudinaryMode() {
  return USE_CLOUDINARY;
}

function mapCloudinaryResource(resource) {
  const ctx = resource.context?.custom || {};
  return {
    id: resource.asset_id,
    publicId: resource.public_id,
    title: ctx.title || 'Sin título',
    description: ctx.description || '',
    year: ctx.year || '',
    medium: ctx.medium || '',
    dimensions: ctx.dimensions || '',
    style: ctx.style || '',
    imageUrl: resource.secure_url,
    createdAt: ctx.createdAt || resource.created_at,
  };
}

export function createLocalStorage(storageDir) {
  const uploadsDir = path.join(storageDir, 'uploads');
  const dataFile = path.join(storageDir, 'artworks.json');

  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });
  if (!fs.existsSync(dataFile)) fs.writeFileSync(dataFile, '[]');

  function readArtworks() {
    return JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
  }

  function writeArtworks(artworks) {
    fs.writeFileSync(dataFile, JSON.stringify(artworks, null, 2));
  }

  return {
    mode: 'local',
    uploadsDir,
    async listArtworks() {
      return readArtworks().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },
    async getArtwork(id) {
      return readArtworks().find((a) => a.id === id) || null;
    },
    async createArtwork(file, meta) {
      const artwork = {
        id: uuidv4(),
        title: meta.title,
        description: meta.description,
        year: meta.year,
        medium: meta.medium,
        dimensions: meta.dimensions,
        style: meta.style,
        imageUrl: `/uploads/${file.filename}`,
        createdAt: new Date().toISOString(),
      };
      const artworks = readArtworks();
      artworks.unshift(artwork);
      writeArtworks(artworks);
      return artwork;
    },
    async updateArtwork(id, meta) {
      const artworks = readArtworks();
      const index = artworks.findIndex((a) => a.id === id);
      if (index === -1) return null;

      artworks[index] = {
        ...artworks[index],
        title: meta.title ?? artworks[index].title,
        description: meta.description ?? artworks[index].description,
        year: meta.year ?? artworks[index].year,
        medium: meta.medium ?? artworks[index].medium,
        dimensions: meta.dimensions ?? artworks[index].dimensions,
        style: meta.style ?? artworks[index].style,
        updatedAt: new Date().toISOString(),
      };
      writeArtworks(artworks);
      return artworks[index];
    },
    async deleteArtwork(id) {
      const artworks = readArtworks();
      const index = artworks.findIndex((a) => a.id === id);
      if (index === -1) return false;

      const [removed] = artworks.splice(index, 1);
      const filePath = path.join(uploadsDir, path.basename(removed.imageUrl));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      writeArtworks(artworks);
      return true;
    },
  };
}

export function createCloudinaryStorage() {
  const FOLDER = 'atelier';

  return {
    mode: 'cloudinary',
    uploadsDir: null,
    async listArtworks() {
      const result = await cloudinary.api.resources({
        type: 'upload',
        prefix: `${FOLDER}/`,
        max_results: 500,
        context: true,
      });
      return result.resources
        .map(mapCloudinaryResource)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },
    async getArtwork(id) {
      const artworks = await this.listArtworks();
      return artworks.find((a) => a.id === id) || null;
    },
    async createArtwork(file, meta) {
      const base64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
      const createdAt = new Date().toISOString();

      const result = await cloudinary.uploader.upload(base64, {
        folder: FOLDER,
        context: {
          title: meta.title,
          description: meta.description || '',
          year: meta.year || '',
          medium: meta.medium || '',
          dimensions: meta.dimensions || '',
          style: meta.style || '',
          createdAt,
        },
      });

      return {
        id: result.asset_id,
        title: meta.title,
        description: meta.description || '',
        year: meta.year || '',
        medium: meta.medium || '',
        dimensions: meta.dimensions || '',
        style: meta.style || '',
        imageUrl: result.secure_url,
        createdAt,
      };
    },
    async updateArtwork(id, meta) {
      const artwork = await this.getArtwork(id);
      if (!artwork) return null;

      await cloudinary.uploader.add_context(
        {
          title: meta.title ?? artwork.title,
          description: meta.description ?? artwork.description,
          year: meta.year ?? artwork.year,
          medium: meta.medium ?? artwork.medium,
          dimensions: meta.dimensions ?? artwork.dimensions,
          style: meta.style ?? artwork.style,
          createdAt: artwork.createdAt,
        },
        [artwork.publicId],
      );

      return {
        ...artwork,
        title: meta.title ?? artwork.title,
        description: meta.description ?? artwork.description,
        year: meta.year ?? artwork.year,
        medium: meta.medium ?? artwork.medium,
        dimensions: meta.dimensions ?? artwork.dimensions,
        style: meta.style ?? artwork.style,
        updatedAt: new Date().toISOString(),
      };
    },
    async deleteArtwork(id) {
      const artwork = await this.getArtwork(id);
      if (!artwork) return false;
      await cloudinary.uploader.destroy(artwork.publicId);
      return true;
    },
  };
}

export function createStorage(storageDir) {
  if (USE_CLOUDINARY) {
    console.log('Almacenamiento: Cloudinary (gratuito en la nube)');
    return createCloudinaryStorage();
  }
  console.log('Almacenamiento: disco local');
  return createLocalStorage(storageDir);
}
