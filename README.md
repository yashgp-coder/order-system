# 🍔 OrderFlow — Real-Time Order Management System

A full-stack food ordering platform built with the MERN stack and Socket.io. Features real-time order tracking, a live admin dashboard, animated queue visualization, and a personalized recommendation engine.

---

## ✨ Features

| Area | What's built |
|---|---|
| **Auth** | JWT login/register, role-based access (user / admin), bcrypt passwords |
| **Menu** | Category filtering, text search, sort by popularity/price/rating |
| **Cart** | Persistent cart drawer, quantity controls, live item count badge |
| **Ordering** | Checkout with delivery address, server-side price validation |
| **Tracking** | Live order status stepper, queue position, estimated time |
| **Real-Time** | Socket.io — status updates push to user instantly, no polling |
| **Notifications** | Rich clickable toasts for every status change |
| **Admin Dashboard** | Order table with inline status controls, stats cards, kitchen queue |
| **Pipeline View** | Animated Kanban board — cards move between columns live |
| **Recommendations** | Co-occurrence engine + personal history + trending fallback |
| **Security** | Helmet, CORS, rate limiting, input sanitization, JWT expiry |

---

## 🛠 Tech Stack

**Backend:** Node.js + Express · MongoDB + Mongoose · Socket.io · JWT + bcryptjs · Helmet + express-rate-limit

**Frontend:** React 18 + Vite · React Router v6 · Axios · Socket.io-client · react-hot-toast

---

## 🚀 Quick Start

### 1. Clone & install

```bash
git clone https://github.com/you/orderflow.git
cd orderflow
npm run install:all
```

### 2. Configure environment

```bash
cd server && cp .env.example .env   # set MONGO_URI and JWT_SECRET
```

### 3. Seed the database

```bash
npm run seed
```

### 4. Start development

```bash
npm run dev   # starts server :5000 + client :5173 concurrently
```

---

## 📁 Project Structure

```
orderflow/
├── server/
│   ├── config/         db.js · socket.js
│   ├── controllers/    auth · menu · order · admin · recommend
│   ├── middleware/     auth · errorHandler · sanitize
│   ├── models/         User · MenuItem · Order
│   ├── routes/         auth · menu · orders · admin · recommendations
│   ├── utils/          seed.js · verifyDB.js
│   └── server.js
└── client/src/
    ├── components/     Navbar · CartDrawer · LiveNotifications · QueueVisualization · RecommendationShelf
    ├── context/        Auth · Cart · Socket
    ├── hooks/          useOrderStatus.js
    ├── pages/          Login · Register · Menu · Cart · Orders · OrderTracking · AdminDashboard
    └── services/       api.js
```

---

## 🔌 API Reference

### Auth
```
POST /api/auth/register   →  Create account
POST /api/auth/login      →  Get JWT token
GET  /api/auth/me         →  Current user (protected)
```

### Menu
```
GET /api/menu                          →  List (filter: ?category= ?search= ?sort=)
GET /api/menu/:id                      →  Single item
```

### Orders
```
POST  /api/orders                      →  Place order
GET   /api/orders/my                   →  My orders
GET   /api/orders/:id                  →  Order detail + live queue position
PATCH /api/orders/:id/cancel           →  Cancel (Placed status only)
```

### Admin
```
GET   /api/admin/stats                 →  Today's orders, revenue, active count
GET   /api/admin/orders                →  All orders (paginated, filterable)
GET   /api/admin/queue                 →  Current preparing orders
PATCH /api/admin/orders/:id/status     →  Advance status (validates transitions)
```

### Recommendations
```
GET /api/recommendations/personal           →  Personalized shelf
GET /api/recommendations/similar?itemIds=   →  Co-occurrence (cart items)
GET /api/recommendations/trending           →  Global popularity
```

---

## 🔴 Socket.io Events

| Direction | Event | Description |
|---|---|---|
| Client→Server | `join:user` | Join personal room for order updates |
| Client→Server | `join:admin` | Join admin room |
| Server→Client | `order:placed` | New order arrived (admin) |
| Server→Client | `order:statusUpdated` | Status changed (user + admin) |
| Server→Client | `queue:updated` | Queue snapshot broadcast (all) |

---

## 🔐 Security Layers

- **Helmet** — 11 security HTTP headers
- **CORS** — allowlist-based origin check
- **Rate limiting** — 100 req/15min global · 20 req/15min on auth
- **Input sanitization** — strips MongoDB `$` operators from all inputs
- **Server-side pricing** — order totals always recalculated server-side
- **JWT** — 7-day expiry, password field `select: false`

---

## 🏗 Deployment

### MongoDB Atlas
1. Create free M0 cluster → add DB user → whitelist `0.0.0.0/0`
2. Copy connection string into server `MONGO_URI`

### Render (recommended free tier)

**Server** (Web Service)
- Root: `server/` · Build: `npm install` · Start: `npm start`
- Env vars: `NODE_ENV=production` · `MONGO_URI` · `JWT_SECRET` · `CLIENT_URL`

**Client** (Static Site)
- Root: `client/` · Build: `npm run build` · Publish: `dist`
- Env var: `VITE_SOCKET_URL=https://your-server.onrender.com`

---

## 🌱 Seed Credentials

| Role | Email | Password |
|---|---|---|
| 🛡️ Admin | admin@orderflow.com | admin123 |
| 👤 User | user@orderflow.com | user123 |
| 👤 User | jane@orderflow.com | user123 |
