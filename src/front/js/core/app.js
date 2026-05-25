const THEME_KEY = 'pedala_theme';
const TOKEN_KEY = 'pedala_token';
const USER_KEY = 'pedala_user';
const host = window.location.hostname || 'localhost';
const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
const API_BASE = `${protocol}//${host}:8080/api`;

window.PEDALA_API_BASE = API_BASE;

function readStoredJson(key, fallback = {}) {
  const rawValue = localStorage.getItem(key);
  if (!rawValue) return fallback;

  try {
    const parsedValue = JSON.parse(rawValue);
    return parsedValue && typeof parsedValue === 'object' ? parsedValue : fallback;
  } catch (error) {
    localStorage.removeItem(key);
    return fallback;
  }
}

function normalizeUserRole(role) {
  return String(role || '').trim().toLowerCase();
}

function getUserPanelPath(role) {
  const normalizedRole = normalizeUserRole(role);
  if (normalizedRole === 'admin') return 'admin';
  if (normalizedRole === 'funcionario') return 'employee';
  return 'dashboard';
}

function isNestedPage() {
  return window.location.pathname.includes('/pages/');
}

function resolvePagePath(name) {
  return isNestedPage() ? `${name}.html` : `pages/${name}.html`;
}

function resolveHomePath() {
  return isNestedPage() ? '../index.html' : 'index.html';
}

function normalizeImagePath(path) {
  const assetBase = isNestedPage() ? '../' : '';
  if (!path) return `${assetBase}assets/images/hero-bike.png`;
  if (/^https?:\/\//.test(path)) return path;
  return `${assetBase}${path.replace(/^\//, '')}`;
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(value) || 0);
}

async function apiJson(path, options = {}) {
  const { method = 'GET', headers = {}, body, auth = false } = options;
  const token = localStorage.getItem(TOKEN_KEY);
  const reqHeaders = { ...headers };

  if (auth && token) reqHeaders.Authorization = `Bearer ${token}`;
  if (body !== undefined && !reqHeaders['Content-Type']) reqHeaders['Content-Type'] = 'application/json';

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: reqHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  let data = {};
  try {
    data = await response.json();
  } catch (error) {
    data = {};
  }

  if ((response.status === 401 || response.status === 403) && auth) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  return { ok: response.ok, status: response.status, data };
}

window.apiJson = apiJson;
window.normalizeImagePath = normalizeImagePath;
window.formatCurrency = formatCurrency;

(function initTheme() {
  const theme = localStorage.getItem(THEME_KEY) || 'dark';
  document.documentElement.setAttribute('data-theme', theme);
})();

function iconSun() {
  return '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
}

function iconMoon() {
  return '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path d="M21 12.79A9 9 0 0 1 11.21 3a7 7 0 1 0 9.79 9.79Z"/></svg>';
}

function syncThemeButtons() {
  const theme = document.documentElement.getAttribute('data-theme') || 'dark';
  document.querySelectorAll('.theme-toggle').forEach(button => {
    button.innerHTML = theme === 'dark' ? iconMoon() : iconSun();
    button.setAttribute('title', theme === 'dark' ? 'Modo escuro' : 'Modo claro');
  });
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem(THEME_KEY, next);
  syncThemeButtons();
}

function showToast(message, type = 'success', options = {}) {
  const containerId = 'toast-container';
  let container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('role', 'status');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toastType = {
    success: 'toast-success',
    error: 'toast-error',
    warning: 'toast-warning',
    info: 'toast-info'
  };

  const toast = document.createElement('div');
  toast.className = `toast ${toastType[type] || 'toast-info'}`;
  toast.setAttribute('role', 'alert');

  const content = document.createElement('div');
  content.className = 'toast-content';
  if (options.html) content.innerHTML = message;
  else content.textContent = message;

  const closeBtn = document.createElement('button');
  closeBtn.className = 'toast-close';
  closeBtn.type = 'button';
  closeBtn.innerText = '×';
  closeBtn.addEventListener('click', () => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 250);
  });

  toast.appendChild(content);
  toast.appendChild(closeBtn);
  container.appendChild(toast);

  // trigger show with small delay for CSS transitions
  requestAnimationFrame(() => toast.classList.add('show'));

  const timeout = options.timeout || 4000;
  const timer = setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 250);
  }, timeout);

  // preserve reference so it can be cleared externally if needed
  toast._timer = timer;
  return toast;
}

function updateNavbarAuth() {
  const navActions = document.getElementById('navActions');
  if (!navActions) return;

  const token = localStorage.getItem(TOKEN_KEY);
  const user = readStoredJson(USER_KEY);
  if (!token || !user.nome) return;

  const name = user.nome.split(' ')[0];
  const page = getUserPanelPath(user.role);
  navActions.innerHTML = `
    <button class="theme-toggle" title="Mudar tema"></button>
    <div class="nav-user-info">
      <div class="nav-avatar">${name[0].toUpperCase()}</div>
      <span class="nav-username">${name}</span>
    </div>
    <a href="${resolvePagePath(page)}" class="btn btn-primary btn-sm">Meu painel</a>
    <button class="btn btn-secondary btn-sm" onclick="logoutNav()">Sair</button>
  `;
  bindThemeButtons();
}

function bindThemeButtons() {
  document.querySelectorAll('.theme-toggle').forEach(button => {
    if (!button.dataset.boundTheme) {
      button.addEventListener('click', toggleTheme);
      button.dataset.boundTheme = '1';
    }
  });
  syncThemeButtons();
}

function bindFaq() {
  document.querySelectorAll('.faq-q').forEach(button => {
    if (button.dataset.boundFaq) return;
    button.addEventListener('click', () => {
      const item = button.closest('.faq-item');
      if (!item) return;
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item').forEach(entry => entry.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
    button.dataset.boundFaq = '1';
  });
}

function logoutNav() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.location.href = resolveHomePath();
}

function solicitarLocacao(bikeId) {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    window.location.href = resolvePagePath('login');
    return;
  }

  window.location.href = `${resolvePagePath('dashboard')}?bike=${bikeId}`;
}

window.showToast = showToast;
window.logoutNav = logoutNav;
window.solicitarLocacao = solicitarLocacao;
window.readStoredJson = readStoredJson;
window.normalizeUserRole = normalizeUserRole;
window.getUserPanelPath = getUserPanelPath;

document.addEventListener('DOMContentLoaded', () => {
  bindThemeButtons();
  bindFaq();
  updateNavbarAuth();

  const scrollTop = document.getElementById('scrollTop');
  if (scrollTop) {
    scrollTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
});

window.addEventListener('scroll', () => {
  const scrollTop = document.getElementById('scrollTop');
  if (scrollTop) scrollTop.classList.toggle('visible', window.scrollY > 360);
});
