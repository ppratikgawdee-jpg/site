/* =====================================================
   VELMORA — Product Detail JS
   Fetches product from /api/products/<id>/
   Falls back to local data.js if API unavailable
   ===================================================== */

let currentQty  = 1;
let selectedSize = '50ml';
let currentProduct = null;

document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const id = parseInt(params.get('id'));

  if (!id) {
    showError('No product ID specified.');
    return;
  }

  // Try API first
  let product = await fetchProductFromAPI(id);

  // Fallback to local data
  if (!product && typeof VELMORA_PRODUCTS !== 'undefined') {
    const local = VELMORA_PRODUCTS.find(p => p.id === id);
    if (local) product = local;
  }

  if (!product) {
    showError('Product not found.');
    return;
  }

  currentProduct = product;
  document.title = `${product.name} — Velmora`;
  document.getElementById('breadcrumbName').textContent = product.name;

  renderProduct(product);
  // Build thumbnails after DOM is updated
  const galleryImages = [
    { label: 'FRONT', url: product.image_front || product.image || null },
    { label: 'SIDE',  url: product.image_side  || null },
    { label: 'CAP',   url: product.image_cap   || null },
    { label: 'BOX',   url: product.image_box   || null },
  ];
  buildThumbnails(galleryImages);
  loadRelated(product);
});

/* ----- Fetch single product from API ----- */
async function fetchProductFromAPI(id) {
  try {
    const res = await fetch(`/api/products/${id}/`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const p = await res.json();
    return normalizeProduct(p);
  } catch (err) {
    console.warn('API product fetch failed, trying local data:', err.message);
    return null;
  }
}

/* ----- Normalize API product shape ----- */
function normalizeProduct(p) {
  return {
    id:          p.id,
    name:        p.name,
    tagline:     p.tagline || '',
    gender:      p.gender,
    type:        p.type || p.category || '',
    price:       p.price,
    discounted_price: p.discounted_price || null,
    discount_pct:     p.discount_percentage || null,
    size:        p.size || '50ml',
    badge:       p.badge || null,
    badgeType:   p.badge === 'Best Seller' ? 'bestseller' : 'new',
    image:       p.image_front || p.image || null,
    image_front: p.image_front || p.image || null,
    image_side:  p.image_side  || null,
    image_cap:   p.image_cap   || null,
    image_box:   p.image_box   || null,
    in_stock:    p.in_stock !== false,
    topNotes:    p.top_notes    || p.topNotes    || '',
    middleNotes: p.middle_notes || p.middleNotes || '',
    baseNotes:   p.base_notes   || p.baseNotes   || '',
    description: p.description  || '',
    related:     p.related      || [],
  };
}

/* ----- Render full product detail ----- */
function renderProduct(p) {
  const hasDiscount = p.discounted_price && p.discounted_price < p.price;
  
  const badgeHTML = hasDiscount
    ? `<div class="product-detail-badge" style="background:var(--gold);color:var(--black);">-${Math.round(p.discount_pct)}%</div>`
    : (p.badge ? `<div class="product-detail-badge">${p.badge}</div>` : '');

  const priceHTML = hasDiscount
    ? `<span style="color:var(--gold);margin-right:0.6rem">${formatPrice(p.discounted_price)}</span>
       <span style="color:var(--text-dim);text-decoration:line-through;font-size:0.9rem">${formatPrice(p.price)}</span>`
    : `<span>${formatPrice(p.price)}</span>`;

  // Collect available images in order: front, side, cap, box
  const galleryImages = [
    { label: 'FRONT', url: p.image_front || p.image || null },
    { label: 'SIDE',  url: p.image_side  || null },
    { label: 'CAP',   url: p.image_cap   || null },
    { label: 'BOX',   url: p.image_box   || null },
  ];

  const firstImg = galleryImages.find(g => g.url);
  const imgContent = firstImg
    ? `<img id="mainImgEl" src="${firstImg.url}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;" />`
    : `<span style="font-family:var(--font-serif);font-size:1.5rem;letter-spacing:0.3em;color:var(--gold);opacity:0.6;">${p.name.toUpperCase()}</span>`;

  document.getElementById('productPageGrid').innerHTML = `
    <!-- GALLERY -->
    <div class="product-gallery">
      <div class="product-main-img" id="mainImg">${imgContent}</div>
      <div class="product-thumbnails" id="thumbsRow"></div>
    </div>

    <!-- DETAIL -->
    <div class="product-detail">
      ${badgeHTML}
      <h1 class="product-detail-name">${p.name}</h1>
      <p class="product-detail-gender">${capitalize(p.gender)} · ${p.tagline}</p>
      <div class="product-detail-price">${priceHTML}</div>

      ${p.description ? `<p class="product-detail-desc">${p.description}</p>` : ''}

      <!-- FRAGRANCE NOTES -->
      ${(p.topNotes || p.middleNotes || p.baseNotes) ? `
      <div class="notes-grid">
        <div class="note-card">
          <h5>Top Notes</h5>
          <p>${p.topNotes || '—'}</p>
        </div>
        <div class="note-card">
          <h5>Heart Notes</h5>
          <p>${p.middleNotes || '—'}</p>
        </div>
        <div class="note-card">
          <h5>Base Notes</h5>
          <p>${p.baseNotes || '—'}</p>
        </div>
      </div>` : ''}

      <!-- SIZE SELECTOR -->
      <div class="size-selector">
        <h5>Size</h5>
        <div class="size-options">
          <button class="size-btn active" onclick="selectSize(this, '30ml')">30ml</button>
          <button class="size-btn"        onclick="selectSize(this, '50ml')">50ml</button>
          <button class="size-btn"        onclick="selectSize(this, '100ml')">100ml</button>
        </div>
      </div>

      <!-- STOCK STATUS -->
      ${!p.in_stock ? `
        <div style="padding:0.75rem 1rem;border:1px solid #e24b4a;color:#e24b4a;font-size:0.75rem;letter-spacing:0.1em;margin-bottom:1.5rem;">
          OUT OF STOCK
        </div>` : ''}

      <!-- ADD TO CART -->
      <div class="add-to-cart-row">
        <div class="qty-selector">
          <button class="qty-btn" onclick="changeQty(-1)">−</button>
          <div class="qty-display" id="qtyDisplay">1</div>
          <button class="qty-btn" onclick="changeQty(1)">+</button>
        </div>
        <button class="btn btn--gold add-to-cart-btn" onclick="addToCartFromPage()" ${!p.in_stock ? 'disabled style="opacity:0.5;cursor:not-allowed"' : ''}>
          Add to Cart
        </button>
        <button class="btn btn--outline" onclick="buyNow()" ${!p.in_stock ? 'disabled style="opacity:0.5;cursor:not-allowed"' : ''}>
          Buy Now
        </button>
      </div>

      <!-- META -->
      <div style="margin-top:2rem;padding-top:2rem;border-top:1px solid var(--border);display:flex;gap:2rem;flex-wrap:wrap;">
        ${p.type ? `
        <div>
          <p style="font-size:0.58rem;letter-spacing:0.15em;text-transform:uppercase;color:var(--text-dim);margin-bottom:0.3rem">Category</p>
          <p style="font-size:0.8rem;color:var(--text-muted);text-transform:capitalize">${p.type}</p>
        </div>` : ''}
        <div>
          <p style="font-size:0.58rem;letter-spacing:0.15em;text-transform:uppercase;color:var(--text-dim);margin-bottom:0.3rem">Gender</p>
          <p style="font-size:0.8rem;color:var(--text-muted);text-transform:capitalize">${p.gender}</p>
        </div>
        <div>
          <p style="font-size:0.58rem;letter-spacing:0.15em;text-transform:uppercase;color:var(--text-dim);margin-bottom:0.3rem">Shipping</p>
          <p style="font-size:0.8rem;color:var(--text-muted)">Free above ₹999</p>
        </div>
      </div>
    </div>
  `;
}

/* ----- Load related products ----- */
async function loadRelated(p) {
  const grid = document.getElementById('relatedGrid');
  if (!grid) return;

  // Fetch same gender/type from API, exclude current product
  try {
    const res = await fetch(`/api/products/?gender=${p.gender}&type=${p.type}`);
    if (!res.ok) throw new Error();
    const data = await res.json();
    const related = (data.products || [])
      .filter(r => r.id !== p.id)
      .slice(0, 4)
      .map(normalizeProduct);

    if (related.length > 0) {
      grid.innerHTML = related.map(createProductCard).join('');
      return;
    }
  } catch (e) { /* fallback below */ }

  // Fallback: use local related IDs
  if (p.related && p.related.length && typeof VELMORA_PRODUCTS !== 'undefined') {
    const related = p.related.map(id => VELMORA_PRODUCTS.find(r => r.id === id)).filter(Boolean);
    grid.innerHTML = related.map(createProductCard).join('');
  }
}

/* ----- Controls ----- */
function changeQty(delta) {
  currentQty = Math.max(1, Math.min(10, currentQty + delta));
  const el = document.getElementById('qtyDisplay');
  if (el) el.textContent = currentQty;
}

function selectSize(btn, size) {
  selectedSize = size;
  document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function selectThumb(el) {
  document.querySelectorAll('.product-thumb').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
}

function addToCartFromPage() {
  if (!currentProduct) return;
  const hasDiscount = currentProduct.discounted_price && currentProduct.discounted_price < currentProduct.price;
  Cart.add({
    id:      currentProduct.id,
    name:    currentProduct.name,
    price:   hasDiscount ? currentProduct.discounted_price : currentProduct.price,
    size:    selectedSize,
    tagline: currentProduct.tagline || '',
  }, selectedSize, currentQty);
}

function buyNow() {
  if (!currentProduct) return;
  const hasDiscount = currentProduct.discounted_price && currentProduct.discounted_price < currentProduct.price;
  Cart.add({
    id:      currentProduct.id,
    name:    currentProduct.name,
    price:   hasDiscount ? currentProduct.discounted_price : currentProduct.price,
    size:    selectedSize,
    tagline: currentProduct.tagline || '',
  }, selectedSize, currentQty);
  window.location.href = '/cart/';
}

/* ----- Helpers ----- */
function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

function formatPrice(price) {
  return '₹' + Number(price).toLocaleString('en-IN');
}

function showError(msg) {
  const grid = document.getElementById('productPageGrid');
  if (grid) grid.innerHTML = `
    <div style="grid-column:1/-1;text-align:center;padding:5rem;">
      <p style="font-family:var(--font-serif);font-size:1.5rem;color:var(--text-muted);margin-bottom:1.5rem">${msg}</p>
      <a href="/shop/" class="btn btn--gold">Browse Shop</a>
    </div>`;
}

/* ----- Build thumbnail row after render ----- */
function buildThumbnails(galleryImages) {
  const row = document.getElementById('thumbsRow');
  if (!row) return;

  const available = galleryImages.filter(g => g.url);
  if (available.length === 0) return;

  row.innerHTML = available.map((g, i) => `
    <div class="product-thumb ${i === 0 ? 'active' : ''}"
      onclick="switchMainImage('${g.url}', this)"
      style="overflow:hidden;position:relative;">
      <img src="${g.url}" alt="${g.label}"
        style="width:100%;height:100%;object-fit:cover;" />
      <div style="position:absolute;bottom:0;left:0;right:0;
        background:rgba(0,0,0,0.55);font-size:0.48rem;
        letter-spacing:0.12em;color:var(--gold);
        text-align:center;padding:3px 0;">${g.label}</div>
    </div>
  `).join('');
}

/* ----- Switch main image on thumb click ----- */
function switchMainImage(url, thumbEl) {
  const mainImg = document.getElementById('mainImgEl');
  if (mainImg) {
    mainImg.style.opacity = '0';
    mainImg.style.transition = 'opacity 0.25s ease';
    setTimeout(() => {
      mainImg.src = url;
      mainImg.style.opacity = '1';
    }, 200);
  }
  document.querySelectorAll('.product-thumb').forEach(t => t.classList.remove('active'));
  thumbEl.classList.add('active');
}
