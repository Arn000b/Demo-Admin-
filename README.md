# 🌿 Anonna Mart — Luxury E-Commerce Admin Control Center

A modern, comprehensive, and pixel-perfect Admin Dashboard UI tailored for **Anonna Mart**, built with **React**, **Vite**, and **Tailwind CSS**.

![Brand Palette](https://img.shields.io/badge/Theme-Forest%20Green%20%26%20Gold-0F3821?style=for-the-badge&logoColor=D4AF37)
![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)

---

## ✨ Features & Modules

### 1. 📊 Executive Dashboard & Analytics
* **4 Key Metric Cards**: Gross Revenue (`৳523,900`, `+18.4%`), Total Orders, Customer Counts, and Conversion Rates with sparklines.
* **Interactive Revenue Trend Graph**: Smooth Bezier curve SVG chart with period switcher (*7 Days* / *30 Days*) and point tooltips.
* **Category Sales Donut Chart**: Interactive volume split across Bed Sheets, Women's Fashion, Organic Food, and Home Decor.
* **Recent Orders Stream**: Real-time status chips and quick invoice access.
* **Low Stock Alerts Widget**: Automated inventory warning alerts with instant `+20 Quick Restock` triggers.
* **Top Selling Products**: Ranked list with unit sales and gross revenue calculation.

### 2. 🛍️ Product Management (Catalog)
* **Product Catalog View**: Responsive table and visual grid view toggles.
* **Multi-Filter Toolbar**: Category pills (*Bed Sheets*, *Women's Fashion*, *Organic Food*, *Home Decor*), stock indicators, and price sorting.
* **Add / Edit Product Multi-Step Modal**:
  * Step 1: Basic details, category, tags, and featured status.
  * Step 2: Retail price, offer price, cost price, and **Live Profit Margin Calculation**.
  * Step 3: SKU auto-generator, stock limits, and dimensions.
  * Step 4: Lifestyle image presets, URL upload, and **Live Storefront Card Preview**.

### 3. 📦 Order Management & Logistics
* **Filterable Orders Table**: Tabbed status views (*Pending*, *Processing*, *Shipped*, *Delivered*, *Cancelled*) and payment filters.
* **Detailed Order Modal**: 5-step status stepper, customer details, and itemized receipts.
* **Printable Commercial Tax Invoice**: Ready-to-print branded invoice layout with BIN/VAT details and `window.print()` support.

### 4. 👥 Customer & Vendor Management
* **Customer Directory**: Customer profiles, contact details, Lifetime Value (LTV), and VIP tier badges.
* **Verified Artisan Vendors**: Supplier fulfillment rates, ratings, and contact shortcuts.

### 5. 🏷️ Marketing & Promotional Center
* **Hero Banner Management**: Live preview of the **"Up to 30% OFF — Autumn Festive Extravaganza"** banner with CTR and impression analytics.
* **Discount Coupon Creator**: Code generator, usage progress bars, expiry countdowns, and clipboard copy triggers.

### 6. 📈 Commercial Analytics & Reports
* 5-Stage E-Commerce Conversion Funnel (Visitors → Views → Cart → Checkout → Paid Orders).
* Payment Gateway distribution stats (bKash 54%, Cards 24%, Nagad 14%, COD 8%).

### 7. ⚙️ Store Settings
* Regional shipping rates (*Inside Dhaka: ৳80*, *Outside Dhaka: ৳150*, *Free Shipping: ৳5,000*).
* Gateway API toggles (*bKash, Nagad, SSLCommerz, Cash on Delivery*).

---

## 🎨 Design Palette

| Token | Hex Code | Purpose |
| :--- | :--- | :--- |
| **Primary Forest Green** | `#0F3821` | Sidebar, primary buttons, brand identity |
| **Deep Emerald Accent** | `#1A4D2E` | Secondary buttons, progress bars, cards |
| **Warm Gold / Champagne** | `#D4AF37` | Crown emblem, key highlights, CTA badges |
| **Soft Mint Surface** | `#F0F9F4` | Badge backgrounds, active hover states |
| **Light Canvas** | `#F4F7F5` | Main dashboard background |

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/Arn000b/Demo-Admin-.git
cd Demo-Admin-
```

### 2. Install dependencies
```bash
npm install
```

### 3. Start local development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for production
```bash
npm run build
```

---

## ⌨️ Global Shortcuts

* `Ctrl + K` or `Cmd + K`: Open Global Command Search Palette.
