import { fetchArtworks } from './api.js';

const grid = document.getElementById('grid');
const loading = document.getElementById('loading');
const empty = document.getElementById('empty');
const lightbox = document.getElementById('lightbox');
const yearEl = document.getElementById('year');

yearEl.textContent = ` — ${new Date().getFullYear()}`;

function openLightbox(artwork) {
  document.getElementById('lightbox-img').src = artwork.imageUrl;
  document.getElementById('lightbox-img').alt = artwork.title;
  document.getElementById('lightbox-title').textContent = artwork.title;

  const meta = document.getElementById('lightbox-meta');
  meta.innerHTML = '';
  const fields = [
    ['Año', artwork.year],
    ['Técnica', artwork.medium],
    ['Dimensiones', artwork.dimensions],
  ];
  fields.forEach(([label, value]) => {
    if (!value) return;
    meta.innerHTML += `<dt>${label}</dt><dd>${value}</dd>`;
  });

  const desc = document.getElementById('lightbox-desc');
  if (artwork.description) {
    desc.textContent = artwork.description;
    desc.hidden = false;
  } else {
    desc.hidden = true;
  }

  lightbox.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightbox.hidden = true;
  document.body.style.overflow = '';
}

lightbox.querySelector('.lightbox__close').addEventListener('click', closeLightbox);
lightbox.querySelector('.lightbox__backdrop').addEventListener('click', closeLightbox);
lightbox.addEventListener('click', (e) => {
  if (e.target === lightbox) closeLightbox();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !lightbox.hidden) closeLightbox();
});

function renderArtworks(artworks) {
  loading.hidden = true;

  if (artworks.length === 0) {
    empty.hidden = false;
    return;
  }

  grid.hidden = false;
  grid.innerHTML = artworks.map((artwork, i) => `
    <article class="card animate-fade-up" style="animation-delay:${0.1 + i * 0.08}s" data-id="${artwork.id}" tabindex="0" role="button">
      <div class="card__frame">
        <img src="${artwork.imageUrl}" alt="${artwork.title}" class="card__image" loading="lazy" />
        <div class="card__overlay">
          <span class="card__view">Ver obra</span>
        </div>
      </div>
      <div class="card__info">
        <h2 class="card__title">${artwork.title}</h2>
        <div class="card__meta">
          ${artwork.year ? `<span>${artwork.year}</span>` : ''}
          ${artwork.medium ? `<span>${artwork.medium}</span>` : ''}
        </div>
      </div>
    </article>
  `).join('');

  const artworkMap = Object.fromEntries(artworks.map((a) => [a.id, a]));

  grid.querySelectorAll('.card').forEach((card) => {
    const open = () => openLightbox(artworkMap[card.dataset.id]);
    card.addEventListener('click', open);
    card.addEventListener('keydown', (e) => e.key === 'Enter' && open());
  });
}

fetchArtworks()
  .then(renderArtworks)
  .catch(() => {
    loading.hidden = true;
    empty.hidden = false;
    empty.querySelector('.collection__empty-title').textContent = 'No se pudo cargar la galería';
    empty.querySelector('.collection__empty-hint').textContent = 'Asegúrate de que el servidor esté en ejecución.';
  });
