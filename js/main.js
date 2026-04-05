/* =====================================================
   VELMORA — Main JS
   Fetches products from Django API at /api/products/
   Falls back to VELMORA_PRODUCTS (data.js) if API unavailable
   ===================================================== */

const API_BASE = '/api';

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initMobileMenu();
  initSearch();
  loadFeaturedProducts();
  loadBestsellers();
  initRevealObserver();
});

/* ----- API fetch helper ----- */
async function apiFetch(endpoint) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`API unavailable (${endpoint}), using local data fallback:`, err.message);
    return null;
  }
}

/* ----- Normalize API product to match local data.js shape ----- */
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
    topNotes:         p.top_notes || '',
    middleNotes:      p.middle_notes || '',
    baseNotes:        p.base_notes || '',
    description:      p.description || '',
  };
}

/* ----- Load Featured Products (homepage) ----- */
async function loadFeaturedProducts() {
  const grid = document.getElementById('featuredGrid');
  if (!grid) return;

  grid.innerHTML = skeletonCards(4);

  const data = await apiFetch('/products/');

  let products;
  if (data && data.products && data.products.length > 0) {
    products = data.products.slice(0, 4).map(normalizeProduct);
  } else {
    // Fallback to local data.js
    products = (typeof VELMORA_PRODUCTS !== 'undefined') ? VELMORA_PRODUCTS.slice(0, 4) : [];
  }

  grid.innerHTML = products.length
    ? products.map(createProductCard).join('')
    : '<p style="color:var(--text-muted);padding:2rem;grid-column:1/-1">No products found. Add products via the admin panel.</p>';

  triggerReveal();
}

/* ----- Load Bestsellers (homepage) ----- */
async function loadBestsellers() {
  const slider = document.getElementById('bestsellersSlider');
  if (!slider) return;

  slider.innerHTML = skeletonCards(4);

  const data = await apiFetch('/products/?badge=Best+Seller');

  let products;
  if (data && data.products && data.products.length > 0) {
    products = data.products.map(normalizeProduct);
  } else {
    products = (typeof VELMORA_PRODUCTS !== 'undefined')
      ? VELMORA_PRODUCTS.filter(p => p.badge === 'Best Seller')
      : [];
  }

  slider.innerHTML = products.length
    ? products.map(createProductCard).join('')
    : '<p style="color:var(--text-muted);padding:2rem">No bestsellers yet.</p>';

  triggerReveal();
}

/* ----- Skeleton loader cards ----- */
function skeletonCards(count) {
  return Array(count).fill(`
    <div class="product-card" style="pointer-events:none">
      <div class="product-img-wrap">
        <div class="product-img-placeholder" style="animation:shimmer 1.5s infinite;"></div>
      </div>
      <div class="product-info">
        <div style="height:10px;width:40%;background:#222;margin-bottom:0.5rem;border-radius:2px"></div>
        <div style="height:16px;width:70%;background:#222;margin-bottom:0.5rem;border-radius:2px"></div>
        <div style="height:10px;width:55%;background:#222;margin-bottom:0.75rem;border-radius:2px"></div>
        <div style="height:20px;width:30%;background:#222;border-radius:2px"></div>
      </div>
    </div>
  `).join('');
}

/* ----- Render product card HTML ----- */
function createProductCard(product) {
  cacheProduct(product);

  const hasDiscount   = product.discounted_price && product.discounted_price < product.price;
  const displayPrice  = hasDiscount ? product.discounted_price : product.price;
  const cartPrice     = displayPrice; // cart always uses payable price

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

  return '<div class="product-card reveal" onclick="window.location.href=\'/product/?id=' + product.id + '\''  + '">' +
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


/* ----- Navbar scroll effect ----- */
function initNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;
  const onScroll = () => navbar.classList.toggle('scrolled', window.scrollY > 60);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ----- Mobile menu ----- */
function initMobileMenu() {
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  if (!hamburger || !mobileMenu) return;
  hamburger.addEventListener('click', () => {
    const open = mobileMenu.classList.toggle('open');
    hamburger.classList.toggle('open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });
  mobileMenu.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      mobileMenu.classList.remove('open');
      hamburger.classList.remove('open');
      document.body.style.overflow = '';
    });
  });
}

/* ----- Search ----- */
function initSearch() {
  const searchToggle = document.getElementById('searchToggle');
  const searchBar    = document.getElementById('searchBar');
  if (!searchToggle || !searchBar) return;
  searchToggle.addEventListener('click', () => {
    searchBar.classList.toggle('open');
    if (searchBar.classList.contains('open')) document.getElementById('searchInput')?.focus();
  });
}

function performSearch() {
  const query = document.getElementById('searchInput')?.value.trim();
  if (query) window.location.href = `/shop/?search=${encodeURIComponent(query)}`;
}

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && document.getElementById('searchBar')?.classList.contains('open')) performSearch();
  if (e.key === 'Escape') {
    document.getElementById('searchBar')?.classList.remove('open');
    document.getElementById('mobileMenu')?.classList.remove('open');
    document.getElementById('hamburger')?.classList.remove('open');
    document.body.style.overflow = '';
  }
});

/* ----- Scroll reveal ----- */
function initRevealObserver() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

function triggerReveal() {
  setTimeout(() => {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
      });
    }, { threshold: 0.08 });
    document.querySelectorAll('.reveal:not(.visible)').forEach(el => obs.observe(el));
  }, 100);
}

/* ----- Newsletter ----- */
function subscribeNewsletter(e) {
  e.preventDefault();
  showToast('Welcome to the inner circle ✦');
  e.target.reset();
}

/* ----- formatPrice (shared across all pages) ----- */
function formatPrice(price) {
  return '₹' + Number(price).toLocaleString('en-IN');
}
