/* =====================================================
   VELMORA — Shop JS
   Fetches from Django API with filter/sort params.
   Falls back to local data.js if API is unavailable.
   ===================================================== */

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const gender = params.get('gender');
  const search = params.get('search');

  if (gender) {
    const cb = document.querySelector(`input[name="gender"][value="${gender}"]`);
    if (cb) cb.checked = true;
  }
  if (search) {
    const input = document.getElementById('searchInput');
    if (input) input.value = search;
  }

  applyFilters();
});

/* ----- Build query string from current filter state ----- */
function buildQueryString() {
  const genders  = [...document.querySelectorAll('input[name="gender"]:checked')].map(el => el.value);
  const types    = [...document.querySelectorAll('input[name="type"]:checked')].map(el => el.value);
  const badges   = [...document.querySelectorAll('input[name="badge"]:checked')].map(el => el.value);
  const minPrice = document.getElementById('minPrice')?.value || 400;
  const maxPrice = document.getElementById('maxPrice')?.value || 1500;
  const sort     = document.getElementById('sortSelect')?.value || 'default';
  const search   = document.getElementById('searchInput')?.value?.trim() || '';

  const p = new URLSearchParams();
  genders.forEach(g => p.append('gender', g));
  types.forEach(t   => p.append('type', t));
  badges.forEach(b  => p.append('badge', b));
  p.set('min_price', minPrice);
  p.set('max_price', maxPrice);
  if (sort !== 'default') p.set('sort', sort);
  if (search) p.set('search', search);
  return p.toString();
}

/* ----- Apply filters: fetch from API then render ----- */
async function applyFilters() {
  const grid    = document.getElementById('shopGrid');
  const countEl = document.getElementById('shopCount');
  if (!grid) return;

  grid.innerHTML = skeletonCards(8);

  const qs = buildQueryString();
  let products = [];

  try {
    const res = await fetch('/api/products/?' + qs);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    products = (data.products || []).map(normalizeProduct);
  } catch (err) {
    console.warn('API unavailable, using local data fallback:', err.message);
    products = localFilterFallback();
  }

  countEl && (countEl.textContent = 'Showing ' + products.length + ' fragrance' + (products.length !== 1 ? 's' : ''));

  if (products.length === 0) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:4rem 0;"><p style="font-family:var(--font-serif);font-size:1.5rem;color:var(--text-muted);">No fragrances found.</p><button class="btn btn--outline" style="margin-top:1.5rem" onclick="resetFilters()">Clear Filters</button></div>';
    return;
  }

  grid.innerHTML = products.map(p => createProductCard(p)).join('');

  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); }
    });
  }, { threshold: 0.05 });
  grid.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

/* ----- Local fallback filtering ----- */
function localFilterFallback() {
  if (typeof VELMORA_PRODUCTS === 'undefined') return [];
  const genders  = [...document.querySelectorAll('input[name="gender"]:checked')].map(el => el.value);
  const types    = [...document.querySelectorAll('input[name="type"]:checked')].map(el => el.value);
  const badges   = [...document.querySelectorAll('input[name="badge"]:checked')].map(el => el.value);
  const minPrice = parseInt(document.getElementById('minPrice')?.value || 400);
  const maxPrice = parseInt(document.getElementById('maxPrice')?.value || 1500);
  const sort     = document.getElementById('sortSelect')?.value || 'default';
  const search   = (document.getElementById('searchInput')?.value || '').toLowerCase();

  let products = VELMORA_PRODUCTS.filter(p => {
    if (genders.length && !genders.includes(p.gender)) return false;
    if (types.length   && !types.includes(p.type))     return false;
    if (badges.length  && !badges.some(b => p.badge && p.badge.includes(b))) return false;
    if (p.price < minPrice || p.price > maxPrice) return false;
    if (search && !p.name.toLowerCase().includes(search) && !p.tagline.toLowerCase().includes(search)) return false;
    return true;
  });

  if (sort === 'price-asc')  products.sort((a, b) => a.price - b.price);
  if (sort === 'price-desc') products.sort((a, b) => b.price - a.price);
  if (sort === 'name-asc')   products.sort((a, b) => a.name.localeCompare(b.name));
  return products;
}

/* ----- Reset all filters ----- */
function resetFilters() {
  document.querySelectorAll('.filter-option input').forEach(el => el.checked = false);
  const minP = document.getElementById('minPrice'); if (minP) minP.value = 400;
  const maxP = document.getElementById('maxPrice'); if (maxP) maxP.value = 1500;
  const sortEl = document.getElementById('sortSelect'); if (sortEl) sortEl.value = 'default';
  const searchEl = document.getElementById('searchInput'); if (searchEl) searchEl.value = '';
  applyFilters();
}

function performSearch() { applyFilters(); }

/* ----- Skeleton cards ----- */
function skeletonCards(count) {
  return Array(count).fill('<div class="product-card" style="pointer-events:none"><div class="product-img-wrap"><div class="product-img-placeholder" style="animation:shimmer 1.5s infinite;"></div></div><div class="product-info"><div style="height:10px;width:40%;background:#222;margin-bottom:0.5rem;border-radius:2px"></div><div style="height:16px;width:70%;background:#222;margin-bottom:0.5rem;border-radius:2px"></div><div style="height:10px;width:55%;background:#222;margin-bottom:0.75rem;border-radius:2px"></div><div style="height:20px;width:30%;background:#222;border-radius:2px"></div></div></div>').join('');
}

/* ----- Normalize API product ----- */
function normalizeProduct(p) {
  return {
    id:               p.id,
    name:             p.name,
    tagline:          p.tagline || '',
    gender:           p.gender,
    type:             p.type || '',
    price:            p.price,
    discounted_price: p.discounted_price || null,
    discount_pct:     p.discount_percentage || null,
    size:             p.size || '50ml',
    badge:            p.badge || null,
    badgeType:        p.badge === 'Best Seller' ? 'bestseller' : p.badge === 'New' ? 'new' : 'bestseller',
    image:            p.image || null,
    in_stock:         p.in_stock !== false,
  };
}

/* ----- Render product card ----- */
function createProductCard(product) {
  cacheProduct(product);

  const hasDiscount  = product.discounted_price && product.discounted_price < product.price;
  const displayPrice = hasDiscount ? product.discounted_price : product.price;
  const cartPrice    = displayPrice;

  const badgeHTML = hasDiscount
    ? '<div class="product-badge product-badge--sale">-' + Math.round(product.discount_pct) + '%</div>'
    : (product.badge
        ? '<div class="product-badge product-badge--' + (product.badgeType || 'bestseller') + '">' + product.badge + '</div>'
        : '');

  const imgContent = product.image
    ? '<img src="' + product.image + '" alt="' + product.name + '" style="width:100%;height:100%;object-fit:cover;" />'
    : '<span style="font-size:0.75rem;letter-spacing:0.3em;">' + product.name.toUpperCase() + '</span>';

  const priceHTML = hasDiscount
    ? '<span class="product-price">' + formatPrice(product.discounted_price) + '</span>' +
      '<span class="product-price-original">' + formatPrice(product.price) + '</span>'
    : '<span class="product-price">' + formatPrice(product.price) + '</span>';

  return '<div class="product-card reveal" onclick="window.location.href=\'/product/?id=' + product.id + '\'' + '">' +
    '<div class="product-img-wrap">' +
      '<div class="product-img-placeholder">' + imgContent + '</div>' +
      badgeHTML +
      '<div class="product-card-actions">' +
        '<button class="btn btn--gold"' +
          ' data-cartid="' + product.id + '"' +
          ' data-cartname="' + product.name.replace(/"/g, '&quot;') + '"' +
          ' data-cartprice="' + cartPrice + '"' +
          ' data-cartsize="' + (product.size || '50ml') + '"' +
          ' data-carttagline="' + (product.tagline || '').replace(/"/g, '&quot;') + '"' +
          ' onclick="event.stopPropagation(); addToCartFromCard(this)">Add to Cart</button>' +
        '<button class="btn btn--outline" onclick="event.stopPropagation(); window.location.href=\'/product/?id=' + product.id + '\'">View</button>' +
      '</div>' +
    '</div>' +
    '<div class="product-info">' +
      '<p class="product-gender">' + product.gender + '</p>' +
      '<h3 class="product-name">' + product.name + '</h3>' +
      '<p class="product-note">' + product.tagline + '</p>' +
      '<div class="product-price-row">' +
        priceHTML +
        '<span class="product-size">' + product.size + '</span>' +
      '</div>' +
    '</div>' +
  '</div>';
}

/* ----- Add to cart handler for card buttons ----- */
function addToCartFromCard(btn) {
  Cart.add({
    id:      parseInt(btn.dataset.cartid),
    name:    btn.dataset.cartname,
    price:   parseFloat(btn.dataset.cartprice),
    size:    btn.dataset.cartsize,
    tagline: btn.dataset.carttagline,
  });
}

function formatPrice(price) {
  return '\u20b9' + Number(price).toLocaleString('en-IN');
}
