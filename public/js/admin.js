import {
  fetchArtworks,
  login,
  uploadArtwork,
  deleteArtwork,
  getToken,
  setToken,
  clearToken,
} from './api.js';

const loginView = document.getElementById('login-view');
const adminView = document.getElementById('admin-view');
const loginForm = document.getElementById('login-form');
const uploadForm = document.getElementById('upload-form');
const previewArea = document.getElementById('preview-area');
const adminList = document.getElementById('admin-list');
const adminEmpty = document.getElementById('admin-empty');
const artworkCount = document.getElementById('artwork-count');

document.getElementById('year').textContent = ` — ${new Date().getFullYear()}`;

let previewUrl = null;
let selectedFile = null;

function resetPreview() {
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = null;
  selectedFile = null;

  const input = document.getElementById('image-input');
  if (input) input.value = '';

  const img = previewArea.querySelector('.preview-img');
  if (img) img.remove();

  const placeholder = previewArea.querySelector('.upload-form__placeholder');
  if (placeholder) placeholder.style.display = '';
}

document.getElementById('image-input').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  selectedFile = file;
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = URL.createObjectURL(file);

  const placeholder = previewArea.querySelector('.upload-form__placeholder');
  if (placeholder) placeholder.style.display = 'none';

  let img = previewArea.querySelector('.preview-img');
  if (!img) {
    img = document.createElement('img');
    img.className = 'preview-img';
    img.alt = 'Vista previa';
    previewArea.appendChild(img);
  }
  img.src = previewUrl;
});

function showAdmin() {
  loginView.hidden = true;
  adminView.hidden = false;
  loadArtworks();
}

function showLogin() {
  loginView.hidden = false;
  adminView.hidden = true;
}

if (getToken()) showAdmin();

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('login-btn');
  const errorEl = document.getElementById('login-error');
  const password = document.getElementById('password').value;

  btn.disabled = true;
  btn.textContent = 'Verificando...';
  errorEl.hidden = true;

  try {
    const { token } = await login(password);
    setToken(token);
    showAdmin();
    document.getElementById('password').value = '';
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.hidden = false;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Entrar';
  }
});

document.getElementById('logout-btn').addEventListener('click', () => {
  clearToken();
  showLogin();
});

uploadForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('upload-btn');
  const errorEl = document.getElementById('upload-error');
  const successEl = document.getElementById('upload-success');
  if (!selectedFile) {
    errorEl.textContent = 'Selecciona una imagen';
    errorEl.hidden = false;
    return;
  }

  const formData = new FormData();
  ['title', 'style', 'year', 'medium', 'dimensions', 'description'].forEach((field) => {
    formData.append(field, document.getElementById(field).value);
  });
  formData.append('image', selectedFile);

  btn.disabled = true;
  btn.textContent = 'Subiendo...';
  errorEl.hidden = true;
  successEl.hidden = true;

  try {
    await uploadArtwork(formData, getToken());
    uploadForm.reset();
    resetPreview();
    successEl.hidden = false;
    loadArtworks();
    setTimeout(() => { successEl.hidden = true; }, 3000);
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.hidden = false;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Publicar obra';
  }
});

async function loadArtworks() {
  try {
    const artworks = await fetchArtworks();
    artworkCount.textContent = artworks.length;

    if (artworks.length === 0) {
      adminEmpty.hidden = false;
      adminList.hidden = true;
      return;
    }

    adminEmpty.hidden = true;
    adminList.hidden = false;
    adminList.innerHTML = artworks.map((a) => `
      <li class="admin-artwork" data-id="${a.id}">
        <img src="${a.imageUrl}" alt="${a.title}" class="admin-artwork__thumb" />
        <div class="admin-artwork__info">
          <h3>${a.title}</h3>
          <p>${[a.style, a.year, a.medium].filter(Boolean).join(' · ')}</p>
        </div>
        <button class="admin-artwork__delete" aria-label="Eliminar ${a.title}">×</button>
      </li>
    `).join('');

    adminList.querySelectorAll('.admin-artwork__delete').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.closest('.admin-artwork').dataset.id;
        if (!confirm('¿Eliminar esta obra?')) return;
        try {
          await deleteArtwork(id, getToken());
          loadArtworks();
        } catch {
          alert('Error al eliminar la obra');
        }
      });
    });
  } catch {
    adminEmpty.textContent = 'Error al cargar obras';
    adminEmpty.hidden = false;
    adminList.hidden = true;
  }
}
