# VELMORA — Luxury Perfume eCommerce

A production-ready luxury perfume eCommerce website with a pure HTML/CSS/JS frontend
and a Django REST API backend. Inspired by Dior, Chanel, and Tom Ford.

---

## Project Structure

```
velmora/
├── index.html          ← Homepage
├── shop.html           ← Shop with filters
├── product.html        ← Product detail
├── cart.html           ← Shopping cart
├── checkout.html       ← Checkout + Razorpay
├── css/
│   └── style.css       ← All styles (luxury design system)
├── js/
│   ├── data.js         ← Product data store
│   ├── cart.js         ← Cart logic (localStorage)
│   ├── main.js         ← Homepage JS
│   ├── shop.js         ← Filters + render logic
│   ├── product.js      ← Product detail JS
│   ├── cartpage.js     ← Cart page JS
│   └── checkout.js     ← Checkout + Razorpay JS
└── backend/
    ├── manage.py
    ├── requirements.txt
    ├── seed_data.py     ← Seed products + admin user
    ├── velmora_project/
    │   ├── settings.py
    │   ├── urls.py
    │   └── wsgi.py
    └── store/
        ├── models.py    ← Product, Order, OrderItem, UserProfile
        ├── views.py     ← REST API endpoints
        ├── urls.py      ← API URL routing
        └── admin.py     ← Rich admin panel
```

---

## Quick Start — Frontend Only

Just open `index.html` in any browser. No server needed.
All data is in `js/data.js`, cart uses `localStorage`.

---

## Django Backend Setup

```bash
# 1. Navigate to backend
cd velmora/backend

# 2. Create & activate virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run migrations
python manage.py makemigrations store
python manage.py migrate

# 5. Seed sample data + create admin user
python seed_data.py

# 6. Start development server
python manage.py runserver
```

**Admin Panel:** http://127.0.0.1:8000/admin
- Username: `admin`
- Password: `velmora@2024`

---

## API Endpoints

| Method | URL                            | Description               |
|--------|-------------------------------|---------------------------|
| GET    | /api/products/                | List all products         |
| GET    | /api/products/?gender=men     | Filter by gender          |
| GET    | /api/products/?type=woody     | Filter by fragrance type  |
| GET    | /api/products/?search=oud     | Search products           |
| GET    | /api/products/?sort=price-asc | Sort by price             |
| GET    | /api/products/{id}/           | Single product detail     |
| POST   | /api/orders/                  | Place an order            |
| GET    | /api/orders/{order_id}/       | Get order details         |
| POST   | /api/create-razorpay-order/   | Create Razorpay order     |
| POST   | /api/razorpay-webhook/        | Razorpay payment webhook  |

### Example API Calls

```bash
# Get all products
curl http://127.0.0.1:8000/api/products/

# Filter: women's floral under ₹1000
curl "http://127.0.0.1:8000/api/products/?gender=women&type=floral&max_price=1000"

# Place an order
curl -X POST http://127.0.0.1:8000/api/orders/ \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Arjun",
    "lastName": "Mehta",
    "email": "arjun@example.com",
    "phone": "9876543210",
    "address1": "123 Marine Drive",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "payment_method": "cod",
    "items": [{ "id": 1, "name": "Noir Oud", "price": 1299, "size": "50ml", "qty": 1 }]
  }'
```

---

## Razorpay Integration

### Steps to enable live payments:

1. **Sign up** at https://razorpay.com
2. **Get your API keys** from Dashboard → Settings → API Keys
3. Update frontend: in `js/checkout.js`, replace:
   ```js
   key: 'rzp_test_XXXXXXXXXX'
   ```
4. Update backend: in `backend/velmora_project/settings.py`, replace:
   ```python
   RAZORPAY_KEY_ID     = 'rzp_live_XXXXXXXXXX'
   RAZORPAY_KEY_SECRET = 'YOUR_ACTUAL_SECRET'
   ```
5. **Register webhook** in Razorpay Dashboard:
   - URL: `https://yourdomain.com/api/razorpay-webhook/`
   - Event: `payment.captured`

### Payment Flow:
```
User clicks "Place Order"
    → Frontend calls POST /api/create-razorpay-order/
    → Django creates Razorpay order, returns order_id
    → Frontend opens Razorpay checkout modal
    → User pays via UPI / Card
    → Razorpay calls our webhook on success
    → Django verifies signature, marks order as paid
    → Frontend shows confirmation
```

---

## Design System

| Token       | Value                    |
|-------------|--------------------------|
| Black       | `#0a0a0a`                |
| Gold        | `#c9a84c`                |
| Gold Light  | `#e2c47a`                |
| Beige       | `#f5f0e8`                |
| Serif Font  | Cormorant Garamond       |
| Sans Font   | Montserrat               |

---

## Production Deployment

```bash
# Set environment variables
export DEBUG=False
export SECRET_KEY=your-secure-secret-key
export RAZORPAY_KEY_ID=rzp_live_...
export RAZORPAY_KEY_SECRET=...

# Collect static files
python manage.py collectstatic --noinput

# Use Gunicorn
gunicorn velmora_project.wsgi:application --bind 0.0.0.0:8000

# Nginx config: proxy /api/ to gunicorn, serve frontend static files directly
```

---

## Features Implemented

### Frontend
- [x] Homepage with hero, featured products, brand story, categories, bestsellers, testimonials, newsletter
- [x] Shop page with filters (gender, type, price range, badge)
- [x] Product detail with notes, size selector, quantity, add to cart
- [x] Cart page with quantity updates, totals, free shipping threshold
- [x] Checkout with address form + UPI/Card/COD payment options
- [x] Razorpay integration (test mode, ready for live keys)
- [x] Scroll reveal animations, hover effects, marquee strip
- [x] Fully responsive (mobile + desktop)
- [x] Search functionality
- [x] Product badges (Best Seller, New, Premium)
- [x] "You may also like" related products
- [x] Toast notifications

### Backend
- [x] Django project with REST Framework
- [x] Product model with all fields
- [x] Order + OrderItem models with auto-generated order IDs
- [x] UserProfile model
- [x] Full admin panel with rich formatting
- [x] REST API with filtering, sorting, search
- [x] Razorpay order creation endpoint
- [x] Razorpay webhook with HMAC signature verification
- [x] Stock management on order placement
- [x] Seed script with 12 products

---

Built with care. © 2024 Velmora.
