const landingState = {
  bikes: [],
  activeCategory: ''
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function bikeTraits(bike) {
  const category = String(bike.categoria || '').toLowerCase();
  if (category.includes('speed')) return ['Aero e leve', 'Alta performance', 'Uso esportivo'];
  if (category.includes('mountain')) return ['Suspensao dianteira', 'Terreno misto', 'Mais controle'];
  if (category.includes('eletrica')) return ['Assistencia eletrica', 'Longos percursos', 'Menos esforco'];
  if (category.includes('dobravel')) return ['Compacta', 'Transporte facil', 'Uso multimodal'];
  if (category.includes('infantil')) return ['Altura reduzida', 'Mais seguranca', 'Uso recreativo'];
  return ['Conforto urbano', 'Uso diario', 'Entrega rapida'];
}

function badgeLabel(bike) {
  if (bike.bloqueada) return { text: 'Indisponível', class: '' };
  if (bike.quantidadeDisponivel <= 0) return { text: 'Esgotado', class: '' };
  if (bike.quantidadeDisponivel <= 2) return { text: 'Últimas unidades', class: 'ultimas' };
  return { text: 'Disponível', class: 'disponivel' };
}

function renderHeroBike(bike) {
  if (!bike) return;
  const heroImage = document.getElementById('heroBikeImage');
  const heroBadge = document.getElementById('heroBikeBadge');
  const heroName = document.getElementById('heroBikeName');
  const heroDescription = document.getElementById('heroBikeDescription');
  const heroPrice = document.getElementById('heroBikePrice');
  const heroAvailability = document.getElementById('heroBikeAvailability');
  const heroRange = document.getElementById('heroBikeRange');
  const heroCategory = document.getElementById('heroBikeCategory');

  const status = badgeLabel(bike);
  if (heroImage) heroImage.src = normalizeImagePath(bike.imagem);
  if (heroBadge) {
    heroBadge.textContent = status.text;
    heroBadge.className = `hero-floating-badge ${status.class}`;
  }
  if (heroName) heroName.textContent = bike.nome;
  if (heroDescription) heroDescription.textContent = bike.descricao || 'Bicicleta pronta para uso urbano com entrega agendada.';
  if (heroPrice) heroPrice.textContent = formatCurrency(bike.precos?.semanal);
  if (heroAvailability) heroAvailability.textContent = bike.quantidadeDisponivel > 0 ? `${bike.quantidadeDisponivel} unidades` : 'Indisponível';
  if (heroRange) heroRange.textContent = `A partir de ${formatCurrency(bike.precos?.mensal)}/mês`;
  if (heroCategory) heroCategory.textContent = bike.categoria;
}

function renderHeroMetrics(bikes) {
  const categories = new Set(bikes.map(bike => bike.categoria)).size;
  const availableUnits = bikes.reduce((total, bike) => total + (bike.quantidadeDisponivel || 0), 0);
  const fleetCount = document.getElementById('heroFleetCount');
  const categoryCount = document.getElementById('heroCategoryCount');
  const delivered = document.getElementById('heroDelivered');

  if (fleetCount) fleetCount.textContent = String(bikes.length);
  if (categoryCount) categoryCount.textContent = String(categories);
  if (delivered) delivered.textContent = `${availableUnits}+`;
}

function renderFilters() {
  const container = document.getElementById('filterBtns');
  if (!container) return;
  const categories = [...new Set(landingState.bikes.map(bike => bike.categoria))];
  const buttons = [
    { label: 'Todas', value: '' },
    ...categories.map(category => ({ label: category, value: category }))
  ];

  container.innerHTML = buttons
    .map(
      button => `<button class="filter-btn ${button.value === landingState.activeCategory ? 'active' : ''}" type="button" data-cat="${escapeHtml(button.value)}">${escapeHtml(button.label)}</button>`
    )
    .join('');
}

function renderCatalog() {
  const grid = document.getElementById('bikeGrid');
  const summary = document.getElementById('catalogSummary');
  if (!grid) return;

  const visibleBikes = landingState.activeCategory
    ? landingState.bikes.filter(bike => bike.categoria === landingState.activeCategory)
    : landingState.bikes;

  const units = visibleBikes.reduce((total, bike) => total + (bike.quantidadeDisponivel || 0), 0);
  if (summary) {
    summary.textContent = `${visibleBikes.length} modelos visiveis e ${units} unidades com disponibilidade atual.`;
  }

  if (!visibleBikes.length) {
    grid.innerHTML = `
      <div class="empty-state">
        <strong>Nenhuma bike encontrada</strong>
        <span>Tente outra categoria para explorar o restante do catalogo.</span>
      </div>
    `;
    return;
  }

  grid.innerHTML = visibleBikes
    .map(bike => {
      const available = bike.quantidadeDisponivel > 0 && !bike.bloqueada;
      const traits = bikeTraits(bike)
        .map(trait => `<span class="bike-spec">${escapeHtml(trait)}</span>`)
        .join('');
      const image = normalizeImagePath(bike.imagem);
      const activeStatus = badgeLabel(bike);

      return `
        <article class="bike-card" data-cat="${escapeHtml(bike.categoria)}">
          <div class="bike-img">
            <span class="bike-badge ${activeStatus.class}">${escapeHtml(activeStatus.text)}</span>
            <img src="${escapeHtml(image)}" alt="${escapeHtml(bike.nome)}" loading="lazy" onerror="this.outerHTML='<span class=&quot;bike-photo-label&quot;>Imagem indisponível</span>'">
          </div>
          <div class="bike-body">
            <div class="bike-cat">${escapeHtml(bike.categoria)}</div>
            <h3 class="bike-name">${escapeHtml(bike.nome)}</h3>
            <p class="bike-desc" style="font-size: 0.9rem; color: var(--color-text-muted); height: 3.2em; overflow: hidden;">${escapeHtml(bike.descricao || 'Ideal para o dia a dia urbano.')}</p>
            <div class="bike-footer">
              <div class="bike-price">${escapeHtml(formatCurrency(bike.precos?.semanal))}<span>/semana</span></div>
              <button class="btn btn-primary btn-sm" type="button" data-bike-action="rent" data-bike-id="${bike.id}" ${available ? '' : 'disabled'}>
                ${available ? 'Assinar' : 'Esgotado'}
              </button>
            </div>
          </div>
        </article>
      `;
    })
    .join('');
}

function bindLandingEvents() {
  const filterContainer = document.getElementById('filterBtns');
  const grid = document.getElementById('bikeGrid');

  filterContainer?.addEventListener('click', event => {
    const button = event.target.closest('[data-cat]');
    if (!button) return;
    landingState.activeCategory = button.dataset.cat || '';
    renderFilters();
    renderCatalog();
  });

  grid?.addEventListener('click', event => {
    const button = event.target.closest('[data-bike-action="rent"]');
    if (!button) return;
    solicitarLocacao(Number(button.dataset.bikeId));
  });
}

async function loadLandingBikes() {
  const grid = document.getElementById('bikeGrid');
  if (!grid) return;

  try {
    const { ok, data } = await apiJson('/bikes');
    if (!ok) throw new Error(data.error || 'Erro ao carregar bikes.');

    const bikes = (data.bikes || []).filter(bike => !bike.removida);
    landingState.bikes = bikes;
    landingState.activeCategory = '';

    if (!bikes.length) {
      grid.innerHTML = `
        <div class="empty-state">
          <strong>Catalogo vazio</strong>
          <span>Cadastre novas bikes no painel administrativo para popular a vitrine.</span>
        </div>
      `;
      const summary = document.getElementById('catalogSummary');
      if (summary) summary.textContent = 'Nenhuma bicicleta ativa no momento.';
      return;
    }

    const featured = [...bikes].sort((a, b) => (b.precos?.semanal || 0) - (a.precos?.semanal || 0))[0];
    renderHeroBike(featured);
    renderHeroMetrics(bikes);
    renderFilters();
    renderCatalog();
  } catch (error) {
    grid.innerHTML = `
      <div class="empty-state">
        <strong>Falha ao carregar o catalogo</strong>
        <span>Verifique se o backend esta rodando em http://localhost:8080.</span>
      </div>
    `;
    const summary = document.getElementById('catalogSummary');
    if (summary) summary.textContent = 'Nao foi possivel buscar as bicicletas agora.';
  }
}

bindLandingEvents();
loadLandingBikes();
