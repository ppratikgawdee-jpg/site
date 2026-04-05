/* =====================================================
   VELMORA — Checkout JS + Razorpay Integration
   ===================================================== */

let selectedPayment = 'upi';

document.addEventListener('DOMContentLoaded', () => {
  Cart.updateCount();
  renderCheckoutSummary();
});

function renderCheckoutSummary() {
  const items    = Cart.get();
  const itemsEl  = document.getElementById('checkoutItems');
  const totalsEl = document.getElementById('checkoutTotals');

  if (!itemsEl || !totalsEl) return;

  if (items.length === 0) {
    itemsEl.innerHTML = `<p style="color:var(--text-muted);font-size:0.85rem">Your cart is empty.</p>`;
    return;
  }

  const appliedPromo   = JSON.parse(sessionStorage.getItem('velmora_promo') || 'null');
  const subtotal       = Cart.subtotal();
  const shipping       = subtotal >= 999 ? 0 : 99;
  const cod_fee        = selectedPayment === 'cod' ? 30 : 0;
  const discountAmount = appliedPromo ? appliedPromo.discount_amount : 0;
  const total          = subtotal + shipping + cod_fee - discountAmount;

  itemsEl.innerHTML = items.map(item => `
    <div style="display:flex;justify-content:space-between;margin-bottom:1rem;align-items:flex-start;gap:1rem;">
      <div>
        <p style="font-size:0.82rem;color:var(--white)">${item.name} × ${item.qty}</p>
        <p style="font-size:0.68rem;color:var(--text-dim)">${item.size}</p>
      </div>
      <span style="font-size:0.9rem;color:var(--gold);font-family:var(--font-serif);flex-shrink:0">${formatPrice(item.price * item.qty)}</span>
    </div>
  `).join('');

  totalsEl.innerHTML = `
    <div style="border-top:1px solid var(--border);margin-top:1rem;padding-top:1rem;">
      <div class="summary-row"><span>Subtotal</span><span>${formatPrice(subtotal)}</span></div>
      <div class="summary-row"><span>Shipping</span><span>${shipping===0?'<span style="color:var(--gold)">Free</span>':formatPrice(shipping)}</span></div>
      ${cod_fee ? `<div class="summary-row"><span>COD Fee</span><span>${formatPrice(cod_fee)}</span></div>` : ''}
      ${appliedPromo ? `
        <div class="summary-row" style="color:#10b981;">
          <span>☆ Promo (${appliedPromo.code})</span>
          <span>- ${formatPrice(appliedPromo.discount_amount)}</span>
        </div>` : ''}
      <div class="summary-row total" style="margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border);">
        <span>Total</span>
        <span>${formatPrice(Math.max(0, total))}</span>
      </div>
    </div>
  `;
}

function selectPayment(method) {
  selectedPayment = method;
  document.querySelectorAll('.payment-option').forEach(el => el.classList.remove('selected'));
  document.getElementById(`pay-${method}`)?.classList.add('selected');

  // Show/hide fields
  document.getElementById('cardFields').style.display = method === 'card' ? 'block' : 'none';
  document.getElementById('upiField').style.display   = method === 'upi'  ? 'block' : 'none';

  renderCheckoutSummary();
}

function formatCard(input) {
  let v = input.value.replace(/\D/g, '').substring(0, 16);
  input.value = v.replace(/(.{4})/g, '$1 ').trim();
}

function selectUpiApp(app) {
  const upiId = document.getElementById('upiId');
  const apps = { gpay: 'paisa@okicici', phonepe: 'paisa@ybl', paytm: 'paisa@paytm' };
  if (upiId) upiId.placeholder = apps[app] || '';
}

function validateForm() {
  const required = ['firstName','lastName','email','phone','address1','city','state','pincode'];
  for (const id of required) {
    const el = document.getElementById(id);
    if (!el || !el.value.trim()) {
      el?.focus();
      showToast('Please fill in all required fields');
      return false;
    }
  }
  const cart = Cart.get();
  if (cart.length === 0) {
    showToast('Your cart is empty');
    return false;
  }
  return true;
}

function placeOrder() {
  if (!validateForm()) return;

  if (selectedPayment === 'upi' || selectedPayment === 'card') {
    initRazorpay();
  } else {
    // COD - submit directly
    confirmOrder('COD');
  }
}

/* =====================================================
   RAZORPAY INTEGRATION
   
   To enable live payments:
   1. Sign up at https://razorpay.com
   2. Get your Key ID from Dashboard → Settings → API Keys
   3. Replace 'rzp_test_XXXXXX' with your actual key
   4. Set up a Django endpoint to create Razorpay order (see backend)
   5. Verify payment server-side using Razorpay webhook
   ===================================================== */
function initRazorpay() {
  const appliedPromo   = JSON.parse(sessionStorage.getItem('velmora_promo') || 'null');
  const discountAmount = appliedPromo ? appliedPromo.discount_amount : 0;
  const sub            = Cart.subtotal();
  const ship           = sub >= 999 ? 0 : 99;
  const total          = sub + ship - discountAmount;

  // In production: first call your Django API to create a Razorpay order
  // const res = await fetch('/api/create-order/', { method:'POST', body: JSON.stringify({ amount: total }) });
  // const data = await res.json();
  // razorpay_order_id = data.order_id

  const options = {
    key: 'rzp_test_XXXXXXXXXX',          // Replace with your Razorpay Key ID
    amount: total * 100,                   // Amount in paise
    currency: 'INR',
    name: 'Velmora',
    description: 'Luxury Fragrance Order',
    // order_id: razorpay_order_id,        // Uncomment after backend integration
    image: '',                             // Your logo URL
    prefill: {
      name: `${document.getElementById('firstName')?.value} ${document.getElementById('lastName')?.value}`,
      email: document.getElementById('email')?.value,
      contact: document.getElementById('phone')?.value,
    },
    theme: { color: '#c9a84c' },
    handler: function(response) {
      // Payment success — verify on server
      // verifyPayment(response.razorpay_payment_id, response.razorpay_order_id, response.razorpay_signature)
      confirmOrder(selectedPayment.toUpperCase(), response.razorpay_payment_id);
    },
    modal: {
      ondismiss: function() {
        showToast('Payment cancelled');
      }
    }
  };

  // Load Razorpay script dynamically
  if (typeof Razorpay === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => {
      const rzp = new Razorpay(options);
      rzp.open();
    };
    script.onerror = () => {
      // Fallback for demo: simulate payment
      showToast('Razorpay unavailable — simulating payment for demo');
      setTimeout(() => confirmOrder('SIMULATED'), 1000);
    };
    document.head.appendChild(script);
  } else {
    const rzp = new Razorpay(options);
    rzp.open();
  }
}

async function confirmOrder(method, paymentId) {
  const appliedPromo = JSON.parse(sessionStorage.getItem('velmora_promo') || 'null');
  const items        = Cart.get();

  const payload = {
    firstName:           document.getElementById('firstName')?.value || '',
    lastName:            document.getElementById('lastName')?.value  || '',
    email:               document.getElementById('email')?.value     || '',
    phone:               document.getElementById('phone')?.value     || '',
    address1:            document.getElementById('address1')?.value  || '',
    address2:            document.getElementById('address2')?.value  || '',
    city:                document.getElementById('city')?.value      || '',
    state:               document.getElementById('state')?.value     || '',
    pincode:             document.getElementById('pincode')?.value   || '',
    payment_method:      selectedPayment,
    razorpay_payment_id: paymentId || '',
    razorpay_order_id:   '',
    razorpay_signature:  '',
    promo_code:          appliedPromo ? appliedPromo.code : '',
    items: items.map(i => ({
      id:    i.id,
      name:  i.name,
      price: i.price,
      size:  i.size,
      qty:   i.qty,
    })),
  };

  try {
    const res  = await fetch('/api/orders/', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      showToast(data.error || 'Order could not be placed. Please try again.');
      return;
    }

    // Success — show modal with real order ID from backend
    document.getElementById('orderId').textContent =
      data.order_id || ('#VLM-' + Math.floor(100000 + Math.random() * 900000));
    const modal = document.getElementById('successModal');
    if (modal) modal.style.display = 'flex';

    Cart.clear();
    sessionStorage.removeItem('velmora_promo');

  } catch (err) {
    // Network error / API unavailable — fall back to local confirmation
    console.warn('Order API unavailable, using local fallback:', err.message);
    const orderId = '#VLM-' + Math.floor(100000 + Math.random() * 900000);
    document.getElementById('orderId').textContent = orderId;
    const modal = document.getElementById('successModal');
    if (modal) modal.style.display = 'flex';
    Cart.clear();
    sessionStorage.removeItem('velmora_promo');
  }
}

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
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function formatPrice(n) {
  return '₹' + n.toLocaleString('en-IN');
}
