import { fetchArtworks } from './api.js';

const loading = document.getElementById('loading');
const empty = document.getElementById('empty');
const filters = document.getElementById('filters');
const galleryContent = document.getElementById('gallery-content');
const lightbox = document.getElementById('lightbox');
const yearEl = document.getElementById('year');

yearEl.textContent = ` — ${new Date().getFullYear()}`;

let allArtworks = [];
let activeStyle = 'all';
let artworkMap = {};

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

function getStyles(artworks) {
  return [...new Set(artworks.map((a) => a.style?.trim()).filter(Boolean))].sort();
}

function cardHtml(artwork, delay = 0) {
  return `
    <article class="card animate-fade-up" style="animation-delay:${delay}s" data-id="${esc(artwork.id)}" tabindex="0" role="button">
      <div class="card__frame">
        <img src="${esc(artwork.imageUrl)}" alt="${esc(artwork.title)}" class="card__image" loading="lazy" />
        <div class="card__overlay">
          <span class="card__view">Ver obra</span>
        </div>
        ${artwork.style ? `<span class="card__style">${esc(artwork.style)}</span>` : ''}
      </div>
      <div class="card__info">
        <h2 class="card__title">${esc(artwork.title)}</h2>
        <div class="card__meta">
          ${artwork.style ? `<span>${esc(artwork.style)}</span>` : ''}
          ${artwork.year ? `<span>${esc(artwork.year)}</span>` : ''}
          ${artwork.medium ? `<span>${esc(artwork.medium)}</span>` : ''}
        </div>
      </div>
    </article>
  `;
}

function bindCards() {
  galleryContent.querySelectorAll('.card').forEach((card) => {
    const open = () => openLightbox(artworkMap[card.dataset.id]);
    card.addEventListener('click', open);
    card.addEventListener('keydown', (e) => e.key === 'Enter' && open());
  });
}

function renderFilters(styles) {
  if (styles.length === 0) {
    filters.hidden = true;
    return;
  }

  filters.hidden = false;
  filters.innerHTML = `
    <button class="filter-btn ${activeStyle === 'all' ? 'filter-btn--active' : ''}" data-style="all">Todos</button>
    ${styles.map((s) => `
      <button class="filter-btn ${activeStyle === s ? 'filter-btn--active' : ''}" data-style="${esc(s)}">${esc(s)}</button>
    `).join('')}
  `;

  filters.querySelectorAll('.filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeStyle = btn.dataset.style;
      renderGallery();
    });
  });
}

function renderGallery() {
  renderFilters(getStyles(allArtworks));

  let html = '';

  if (activeStyle === 'all') {
    const styles = getStyles(allArtworks);
    const withStyle = allArtworks.filter((a) => a.style?.trim());
    const withoutStyle = allArtworks.filter((a) => !a.style?.trim());

    styles.forEach((style, si) => {
      const group = withStyle.filter((a) => a.style.trim() === style);
      html += `
        <section class="style-group animate-fade-up" style="animation-delay:${0.05 + si * 0.05}s">
          <h2 class="style-group__title">${esc(style)}</h2>
          <div class="grid">${group.map((a, i) => cardHtml(a, 0.1 + i * 0.06)).join('')}</div>
        </section>
      `;
    });

    if (withoutStyle.length > 0) {
      html += `
        <section class="style-group animate-fade-up">
          <h2 class="style-group__title">Sin clasificar</h2>
          <div class="grid">${withoutStyle.map((a, i) => cardHtml(a, 0.1 + i * 0.06)).join('')}</div>
        </section>
      `;
    }
  } else {
    const filtered = allArtworks.filter((a) => a.style?.trim() === activeStyle);
    html = `<div class="grid">${filtered.map((a, i) => cardHtml(a, 0.1 + i * 0.06)).join('')}</div>`;
  }

  galleryContent.innerHTML = html;
  galleryContent.hidden = false;
  artworkMap = Object.fromEntries(allArtworks.map((a) => [a.id, a]));
  bindCards();
}

function openLightbox(artwork) {
  document.getElementById('lightbox-img').src = artwork.imageUrl;
  document.getElementById('lightbox-img').alt = artwork.title;
  document.getElementById('lightbox-title').textContent = artwork.title;

  const meta = document.getElementById('lightbox-meta');
  meta.innerHTML = '';
  const fields = [
    ['Estilo', artwork.style],
    ['Año', artwork.year],
    ['Técnica', artwork.medium],
    ['Dimensiones', artwork.dimensions],
  ];
  fields.forEach(([label, value]) => {
    if (!value) return;
    meta.innerHTML += `<dt>${label}</dt><dd>${esc(value)}</dd>`;
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

fetchArtworks()
  .then((artworks) => {
    loading.hidden = true;
    allArtworks = artworks;

    if (artworks.length === 0) {
      empty.hidden = false;
      return;
    }

    renderGallery();
  })
  .catch(() => {
    loading.hidden = true;
    empty.hidden = false;
    empty.querySelector('.collection__empty-title').textContent = 'No se pudo cargar la galería';
    empty.querySelector('.collection__empty-hint').textContent = 'Asegúrate de que el servidor esté en ejecución.';
  });
