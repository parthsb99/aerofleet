# AeroFleet – Docker Containerization & Deployment Guide

This guide provides complete instructions for running the **AeroFleet Vehicle Service Management** platform using Docker and Docker Compose.

---

## 1. Architecture Overview

AeroFleet runs as three orchestrated container services on a private Docker bridge network (`aerofleet-network`):

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Host Browser / Client                            │
└──────────────┬───────────────────────────────────────────────┬──────────────┘
               │ (Port 5173 / 80)                              │ (Port 5001)
               ▼                                               ▼
┌──────────────────────────────┐              ┌──────────────────────────────┐
│  aerofleet-frontend (Nginx)  │              │      aerofleet-backend       │
│  - Vite Production React SPA │              │  - Node.js 20 LTS (Express)  │
│  - SPA Routing (/admin/*)    │──/api/──────▶│  - Socket.IO Real-Time Sync  │
│  - WebSocket Reverse Proxy   │──/socket.io/▶│  - JWT Auth + RBAC           │
└──────────────────────────────┘              └──────────────┬───────────────┘
                                                             │
                                                             ▼
                                              ┌──────────────────────────────┐
                                              │      aerofleet-database      │
                                              │  - MongoDB 7.0 (vsa_db)      │
                                              │  - Named Persistent Volume   │
                                              │    (aerofleet-mongodb-data)  │
                                              └──────────────────────────────┘
```

| Service | Container Name | Image / Base | Internal Port | Host Port | Purpose |
|---|---|---|---|---|---|
| **Frontend** | `aerofleet-frontend` | `nginx:1.27-alpine` (multi-stage) | `80` | `5173`, `80` | Production React SPA, SPA routing, reverse proxy |
| **Backend** | `aerofleet-backend` | `node:20-alpine` | `5001` | `5001` | REST APIs, Socket.IO server, Seed Manager |
| **Database**| `aerofleet-database` | `mongo:7.0` | `27017` | *Internal* | Persistent document storage for vehicles, bookings, users |

---

## 2. Prerequisites

- **Docker Desktop for Mac**: Version 4.x or higher (Docker Engine 24+ and Docker Compose v2/v5+).
- **RAM**: Minimum 4 GB allocated to Docker Desktop (Settings → Resources).
- **Disk Space**: At least 5 GB free for images and the persistent MongoDB volume.

---

## 3. Configuration & Environment Variables

Copy the provided template to create your `.env` file:

```bash
cp .env.example .env
```

### Environment Variables Reference

| Variable | Default Value | Description |
|---|---|---|
| `PORT` | `5001` | Internal backend HTTP & Socket.IO server port |
| `NODE_ENV` | `production` | Node runtime environment |
| `MONGO_URI` | `mongodb://database:27017/vsa_db` | MongoDB connection string (uses container hostname `database`) |
| `JWT_SECRET` | *(Random 64-char string)* | Secret key for signing and verifying customer & admin JWTs |
| `CORS_ORIGIN` | `http://localhost:5173,http://localhost,http://localhost:80` | Allowed origins for REST API and Socket.IO handshakes |
| `VITE_API_URL` | `http://localhost:5001` | Base URL used by browser for API requests |
| `VITE_SOCKET_URL` | `http://localhost:5001` | Base URL used by browser for Socket.IO connection |

> **Security Note:** Never commit `.env` containing production passwords or secret keys to version control.

---

## 4. Quick Start Commands

### 4.1 Build and Start All Services

To build the images and launch the containers in the foreground (with live log output):

```bash
docker compose up --build
```

### 4.2 Run in Detached (Background) Mode

```bash
docker compose up -d --build
```

### 4.3 Check Container Status and Health

```bash
docker compose ps
```

All three containers should report `running` with `(healthy)` status:
- `aerofleet-database` (healthy)
- `aerofleet-backend` (healthy)
- `aerofleet-frontend` (healthy)

### 4.4 View Live Logs

```bash
# All logs:
docker compose logs -f

# Backend logs only:
docker compose logs -f backend

# Frontend Nginx logs only:
docker compose logs -f frontend

# Database logs only:
docker compose logs -f database
```

### 4.5 Stop Containers Safely

```bash
docker compose down
```

> ⚠️ **IMPORTANT DATA WARNING:**
> Running `docker compose down` will safely stop and remove the containers, **preserving your database volume**.
> **NEVER** run `docker compose down -v` unless you intentionally want to delete all vehicles, users, bookings, and expenditure records!

---

## 5. Application Access & Default Credentials

Once the containers are healthy:

| Portal | URL | Description |
|---|---|---|
| **Customer Portal** | [http://localhost:5173](http://localhost:5173) or [http://localhost](http://localhost) | Fleet Overview, Book Service, Service History, Monthly Expenditure |
| **Admin Portal** | [http://localhost:5173/admin](http://localhost:5173/admin) | Operations Queue, Mark as Done, Pricing Settlement, Users, Fleet |
| **Backend Health** | [http://localhost:5001/api/health](http://localhost:5001/api/health) | Real-time healthcheck JSON with database status & uptime |
| **Frontend Health** | [http://localhost:5173/health](http://localhost:5173/health) | Nginx status response |

### Administrator Credentials (Auto-Seeded)
- **Email:** `admin@aerofleet.com`
- **Password:** `Admin@123`
- **Role:** `admin`

---

## 6. How Socket.IO Works Inside Docker

1. **Browser Handshake**: The browser establishes a connection with the backend either through Nginx reverse proxy (`http://localhost:5173/socket.io`) or directly to the exposed backend port (`http://localhost:5001/socket.io`).
2. **WebSocket Upgrades**: Nginx is configured with HTTP/1.1 `Upgrade $http_upgrade` and `Connection "upgrade"` headers to support instant WebSocket protocol switching.
3. **Room Isolation**:
   - `user:{userId}`: Authenticated customer room ensuring private status and expenditure events.
   - `admin:room`: Administrator room for live booking alerts and platform updates.
4. **Resilience**: If a network interruption occurs, the client automatically reconnects and triggers an auto-sync to retrieve missed events.

---

## 7. Data Persistence Verification

Data is stored in the Docker named volume `aerofleet-mongodb-data`:

1. **Seed Data**: On initial start, the backend automatically seeds the admin user and verifies the vehicle catalog (20 brands in `data/catalogue.json`).
2. **Persistence Test**:
   - Create a vehicle and a service booking in the UI.
   - Run `docker compose down`.
   - Run `docker compose up -d`.
   - Refresh the page: all vehicles, bookings, completed services, and expenditure records remain intact.

---

## 8. Troubleshooting

### Port 5173 or 5001 Already in Use
If you previously ran AeroFleet on your local host using `npm run dev`:
```bash
# Check what is using the ports:
lsof -i :5173
lsof -i :5001

# Terminate the host processes before starting Docker:
kill -9 <PID>
```

### Resetting to Clean State
If you intentionally need to reset the database and start fresh:
```bash
docker compose down -v
docker compose up --build
```

### Inspecting Inside a Container
```bash
# Open shell inside backend:
docker compose exec backend sh

# Open MongoDB interactive shell:
docker compose exec database mongosh vsa_db
```
