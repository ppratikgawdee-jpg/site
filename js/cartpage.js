/* =====================================================
   VELMORA — Cart Page JS
   ===================================================== */

document.addEventListener('DOMContentLoaded', renderCartPage);

/* ── Applied promo state ─────────────────────────────── */
let appliedPromo = JSON.parse(sessionStorage.getItem('velmora_promo') || 'null');

function savePromo(promoData) {
  appliedPromo = promoData;
  sessionStorage.setItem('velmora_promo', JSON.stringify(promoData));
}

function clearPromo() {
  appliedPromo = null;
  sessionStorage.removeItem('velmora_promo');
}

/* ── Main render ─────────────────────────────────────── */
function renderCartPage() {
  const container = document.getElementById('cartContainer');
  const items = Cart.get();

  if (items.length === 0) {
    clearPromo();
    container.innerHTML = `
      <div class="empty-cart" style="grid-column:1/-1">
        <p style="font-family:var(--font-serif);font-size:1.8rem;color:var(--text-muted);margin-bottom:0.5rem">Your cart is empty</p>
        <p style="font-size:0.82rem;color:var(--text-dim);margin-bottom:2rem">Discover our luxury fragrances</p>
        <a href="/shop/" class="btn btn--gold">Shop Now</a>
      </div>`;
    return;
  }

  const subtotal       = Cart.subtotal();
  const shipping       = subtotal >= 999 ? 0 : 99;
  const discountAmount = appliedPromo ? appliedPromo.discount_amount : 0;
  const total          = subtotal + shipping - discountAmount;

  container.innerHTML = `
    <!-- ITEMS -->
    <div class="cart-items">
      ${items.map(item => `
        <div class="cart-item" id="item-${item.key.replace(/[^a-z0-9]/gi,'')}">
          <div class="cart-item-img">${item.name.substring(0,2).toUpperCase()}</div>
          <div class="cart-item-info">
            <h4>${item.name}</h4>
            <p>${item.tagline} · ${item.size}</p>
            <div class="cart-item-qty">
              <button onclick="updateItem('${item.key}', -1)">−</button>
              <span>${item.qty}</span>
              <button onclick="updateItem('${item.key}', 1)">+</button>
            </div>
          </div>
          <div class="cart-item-right">
            <div class="cart-item-price">${formatPrice(item.price * item.qty)}</div>
            <button class="cart-remove-btn" onclick="removeItem('${item.key}')">Remove</button>
          </div>
        </div>
      `).join('')}
    </div>

    <!-- SUMMARY -->
    <div class="cart-summary">
      <h3>Order Summary</h3>

      <div class="summary-row">
        <span>Subtotal (${items.reduce((s,i)=>s+i.qty,0)} items)</span>
        <span>${formatPrice(subtotal)}</span>
      </div>

      <div class="summary-row">
        <span>Shipping</span>
        <span>${shipping === 0 ? '<span style="color:var(--gold)">Free</span>' : formatPrice(shipping)}</span>
      </div>

      ${subtotal < 999 ? `
        <div style="font-size:0.72rem;color:var(--text-dim);background:var(--black-mid);padding:0.75rem;border-left:2px solid var(--gold);margin:0.5rem 0;">
          Add ${formatPrice(999 - subtotal)} more for free shipping
        </div>` : ''}

      <!-- PROMO CODE SECTION -->
      <div class="promo-section" style="margin:1.25rem 0;padding:1.25rem;background:var(--black-mid);border:1px solid var(--border);">
        <p style="font-size:0.65rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--text-dim);margin-bottom:0.75rem;">Have a Promo Code?</p>

        ${appliedPromo ? `
          <!-- Applied state -->
          <div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem;">
            <div style="display:flex;align-items:center;gap:0.6rem;">
              <span style="font-size:0.9rem;color:var(--gold);">✦</span>
              <div>
                <span style="font-size:0.78rem;color:var(--gold);font-weight:600;letter-spacing:0.08em;">${appliedPromo.code}</span>
                <p style="font-size:0.68rem;color:#10b981;margin:0;">${appliedPromo.message}</p>
              </div>
            </div>
            <button onclick="removePromo()"
              style="font-size:0.65rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-dim);background:none;border:none;cursor:pointer;padding:0.25rem 0.5rem;border:1px solid var(--border);">
              Remove
            </button>
          </div>
        ` : `
          <!-- Input state -->
          <div style="display:flex;gap:0.5rem;align-items:stretch;">
            <input
              id="promoInput"
              type="text"
              placeholder="Enter code (e.g. SAVE10)"
              style="flex:1;background:var(--black-soft);border:1px solid var(--border);color:var(--white);padding:0.6rem 0.85rem;font-size:0.75rem;letter-spacing:0.05em;font-family:var(--font-body);outline:none;text-transform:uppercase;"
              onkeydown="if(event.key==='Enter') applyPromo()"
            />
            <button
              id="promoApplyBtn"
              onclick="applyPromo()"
              class="btn btn--outline"
              style="padding:0.6rem 1rem;font-size:0.68rem;letter-spacing:0.1em;white-space:nowrap;">
              Apply
            </button>
          </div>
          <p id="promoError" style="font-size:0.68rem;color:#ef4444;margin-top:0.4rem;display:none;"></p>
        `}
      </div>

      ${appliedPromo ? `
        <div class="summary-row" style="color:#10b981;">
          <span>Promo (${appliedPromo.code})</span>
          <span>− ${formatPrice(appliedPromo.discount_amount)}</span>
        </div>` : ''}

      <div class="summary-row total">
        <span>Total</span>
        <span>${formatPrice(Math.max(0, total))}</span>
      </div>

      <a href="/checkout/" class="btn btn--gold checkout-btn">Proceed to Checkout</a>
      <a href="/shop/" class="btn btn--outline" style="width:100%;margin-top:0.75rem;text-align:center">Continue Shopping</a>
    </div>
  `;
}

/* ── Promo code apply / remove ───────────────────────── */
async function applyPromo() {
  const input = document.getElementById('promoInput');
  const errorEl = document.getElementById('promoError');
  const btn = document.getElementById('promoApplyBtn');
  if (!input) return;

  const code     = input.value.trim().toUpperCase();
  const subtotal = Cart.subtotal();

  if (!code) {
    showPromoError('Please enter a promo code.');
    return;
  }

  btn.textContent = 'Applying…';
  btn.disabled = true;

  try {
    const res = await fetch(`/api/validate-promo/?code=${encodeURIComponent(code)}&subtotal=${subtotal}`);
    const data = await res.json();

    if (!res.ok) {
      showPromoError(data.error || 'Invalid promo code.');
      btn.textContent = 'Apply';
      btn.disabled = false;
      return;
    }

    savePromo(data);
    renderCartPage();

  } catch (err) {
    // Fallback: API unavailable — show a neutral message
    showPromoError('Could not validate code right now. Please try again.');
    btn.textContent = 'Apply';
    btn.disabled = false;
  }
}

function removePromo() {
  clearPromo();
  renderCartPage();
}

function showPromoError(msg) {
  const el = document.getElementById('promoError');
  if (el) {
    el.textContent = msg;
    el.style.display = 'block';
  }
}

/* ── Cart helpers ────────────────────────────────────── */
function updateItem(key, delta) {
  Cart.updateQty(key, delta);
  // Revalidate promo against updated subtotal if one is applied
  if (appliedPromo) {
    const subtotal = Cart.subtotal();
    fetch(`/api/validate-promo/?code=${encodeURIComponent(appliedPromo.code)}&subtotal=${subtotal}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) savePromo(data);
        else clearPromo();
        renderCartPage();
      })
      .catch(() => renderCartPage());
  } else {
    renderCartPage();
  }
}

function removeItem(key) {
  Cart.remove(key);
  if (Cart.get().length === 0) clearPromo();
  renderCartPage();
}

function formatPrice(n) {
  return '₹' + Math.max(0, n).toLocaleString('en-IN');
}
