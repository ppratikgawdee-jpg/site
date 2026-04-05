/* =====================================================
   VELMORA — Cart Manager
   Cart.add() now accepts product data directly so it
   works with both API products and local data.js products.
   ===================================================== */

const Cart = {

  /* Get cart from localStorage */
  get() {
    try {
      return JSON.parse(localStorage.getItem('velmora_cart') || '[]');
    } catch { return []; }
  },

  /* Save cart to localStorage */
  save(items) {
    localStorage.setItem('velmora_cart', JSON.stringify(items));
    this.updateCount();
  },

  /*
   * Add item to cart.
   *
   * Usage (product card — pass full product object):
   *   Cart.add({ id, name, price, size, tagline })
   *
   * Usage (legacy — pass id only, falls back to VELMORA_PRODUCTS lookup):
   *   Cart.add(1, '50ml', 1)
   */
  add(productOrId, size = '50ml', qty = 1) {
    let product;

    // If a full product object was passed, use it directly
    if (typeof productOrId === 'object' && productOrId !== null) {
      product = productOrId;
      size = productOrId.size || size;
    } else {
      // Legacy: integer id — try local data first, then localStorage cache
      const id = parseInt(productOrId);
      product = this._findById(id);
      if (!product) {
        showToast('Could not find product. Please refresh and try again.');
        return;
      }
    }

    const cart = this.get();
    const key  = `${product.id}-${size}`;
    const existing = cart.find(i => i.key === key);

    if (existing) {
      existing.qty = Math.min(existing.qty + qty, 10);
    } else {
      cart.push({
        key,
        id:      product.id,
        name:    product.name,
        price:   Number(product.price),
        size:    size,
        qty:     qty,
        tagline: product.tagline || '',
      });
    }

    this.save(cart);
    showToast(`${product.name} added to cart ✦`);
  },

  /* Look up a product by id — tries local data.js, then API cache */
  _findById(id) {
    // 1. Try VELMORA_PRODUCTS (local data.js)
    if (typeof VELMORA_PRODUCTS !== 'undefined') {
      const found = VELMORA_PRODUCTS.find(p => p.id === id);
      if (found) return found;
    }
    // 2. Try the in-memory API cache populated by product pages
    if (window._velmoraProductCache && window._velmoraProductCache[id]) {
      return window._velmoraProductCache[id];
    }
    return null;
  },

  /* Remove item by key */
  remove(key) {
    this.save(this.get().filter(i => i.key !== key));
  },

  /* Update quantity by delta (+1 / -1) */
  updateQty(key, delta) {
    const cart = this.get();
    const item = cart.find(i => i.key === key);
    if (!item) return;
    item.qty = Math.max(1, Math.min(10, item.qty + delta));
    this.save(cart);
  },

  /* Total item count (for badge) */
  count() {
    return this.get().reduce((sum, i) => sum + i.qty, 0);
  },

  /* Subtotal in rupees */
  subtotal() {
    return this.get().reduce((sum, i) => sum + i.price * i.qty, 0);
  },

  /* Update cart badge in navbar */
  updateCount() {
    const el = document.getElementById('cartCount');
    if (el) {
      const c = this.count();
      el.textContent = c;
      el.style.display = c > 0 ? 'flex' : 'none';
    }
  },

  /* Clear cart */
  clear() {
    this.save([]);
  }
};

/* =====================================================
   Product cache — populated by main.js / shop.js / product.js
   so Cart._findById() can find API products by id
   ===================================================== */
window._velmoraProductCache = window._velmoraProductCache || {};

function cacheProduct(p) {
  if (p && p.id) window._velmoraProductCache[p.id] = p;
}

/* =====================================================
   Toast notification
   ===================================================== */
function showToast(msg) {
  let toast = document.getElementById('velmoraToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'velmoraToast';
    toast.className = 'toast';
    toast.innerHTML = `<span class="toast-icon">✦</span><span id="toastMsg"></span>`;
    document.body.appendChild(toast);
  }
  document.getElementById('toastMsg').textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}

/* Init on every page load */
document.addEventListener('DOMContentLoaded', () => {
  Cart.updateCount();
});