# Kanterslaan

A React + Django REST Framework application for managing addresses and residents on an interactive map. Users can view who lives at each address, create invite links for new residents, and manage their profile. Staff users can import addresses from the Dutch Kadaster BAG API and manage users.

## Overview

**Kanterslaan** helps residents and administrators visualize and manage address-based communities:

- **Map view** – Leaflet map showing all addresses with PostGIS polygon geometry. Click a house to see residents and pending invites.
- **Invites** – Residents create invite links (with optional QR codes) for their address. New users sign up via these links and are automatically associated with that address.
- **Profile** – Users edit first name, last name, date of birth, photo, and (for staff) address assignment.
- **Admin map** – Staff can draw a bounding box to fetch addresses from the Dutch BAG API and add them to the system.
- **i18n** – Dutch and English with react-i18next; light/dark theme toggle.

### Tech Stack

| Layer | Stack |
|-------|-------|
| Frontend | React 19, Vite, TypeScript, MUI, Emotion, Leaflet, react-i18next |
| Backend | Django 6, Django REST Framework, dj-rest-auth, django-allauth |
| Database | PostgreSQL with PostGIS |
| Auth | Email/password + social OAuth (Google, GitHub, Facebook, Twitter) |

---

## How It Works

### User Flow

1. **Sign up** – New users can only register via an invite link (`/invite/:code`). The invite ties them to a specific address.
2. **Map** – After login, users see a map of all addresses. Clicking a house opens a drawer with residents and pending invites.
3. **Invites** – Residents create invites for their address, optionally adding name/DOB/photo for the future resident. Share the link or QR code.
4. **Profile** – Users update their profile; staff can also change a user’s address.

### Staff Flow

- **Admin map** – Draw a rectangle on the map to fetch BAG addresses in that area and bulk-create them.
- **Invites** – Staff can create invites for any address (not just their own).

### Architecture

- **Frontend** – SPA at `http://localhost:5173`. Proxies `/api`, `/dj-rest-auth`, `/media`, `/admin` to the backend.
- **Backend** – Django at `http://localhost:8000`. REST API for users, addresses, invites; BAG integration for address import.
- **Database** – PostgreSQL with PostGIS for address polygons. Addresses have `street_name`, `house_number`, and `geometry` (polygon).

---

## Development Environment Setup

### Prerequisites

- Docker and Docker Compose (recommended), or
- Python 3.10+, Node.js 18+, PostgreSQL with PostGIS

### Option 1: Docker (recommended)

Backend and PostgreSQL with PostGIS run in Docker:

```bash
docker compose up --build
```

- **Backend**: http://localhost:8000
- **Database**: PostgreSQL on port 5432 (user `postgres`, database `kanterslaan`)

Then start the frontend:

```bash
cd client
npm install
npm run dev
```

- **Frontend**: http://localhost:5173

The Vite dev server proxies `/api`, `/dj-rest-auth`, `/media`, and `/admin` to the backend.

### Option 2: Local setup (without Docker)

1. **PostgreSQL with PostGIS**

   Create the database and extension:

   ```sql
   CREATE DATABASE kanterslaan;
   \c kanterslaan
   CREATE EXTENSION postgis;
   ```

2. **Environment variables**

   Set these (or rely on defaults: user `postgres`, database `kanterslaan`, host `localhost`, port `5432`):

   ```bash
   export DB_NAME=kanterslaan
   export DB_USER=postgres
   export DB_PASSWORD=yourpassword
   export DB_HOST=localhost
   export DB_PORT=5432
   ```

3. **Backend**

   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate   # Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   python manage.py migrate
   python manage.py seed_data
   python manage.py runserver
   ```

4. **Frontend**

   ```bash
   cd client
   npm install
   npm run dev
   ```

### Test User

- **Email**: `test@example.com`
- **Password**: `testpass123`

### Optional: MapTiler API key

For dark-mode map tiles, add a MapTiler key in `client/.env`:

```
VITE_MAPTILER_KEY=your_key
```

Get a free key at https://cloud.maptiler.com/account/keys/. Without it, dark mode uses CartoDB Dark Matter tiles.

---

## API Overview

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/dj-rest-auth/login/` | POST | Login (`email`, `password`) |
| `/dj-rest-auth/user/` | GET | Current user |
| `/dj-rest-auth/oauth/<provider>/url/` | GET | OAuth URL for social login |
| `/dj-rest-auth/google/` | POST | Google login (`{ "code": "..." }`) |
| `/api/addresses/` | GET | List addresses with users and invites |
| `/api/addresses/:id/` | GET | Address detail |
| `/api/users/` | GET | List users (staff only) |
| `/api/users/:id/` | GET, PATCH | User detail / update profile |
| `/api/invites/` | GET, POST | List/create invites |
| `/api/invites/:id/` | GET, PATCH, DELETE | Invite detail / update / delete |
| `/api/invites/:code/validate/` | GET | Validate invite code |
| `/api/invites/:code/register/` | POST | Register via invite |
| `/api/bag/buildings/` | GET | BAG buildings in bbox (staff) |

---

## Social Login (Google, GitHub, Facebook, Twitter)

1. Add a Social Application in Django admin: `/admin/socialaccount/socialapp/`
2. For Google: create an OAuth client in [Google Cloud Console](https://console.cloud.google.com/), add redirect URI `http://localhost:5173/auth/callback/google`
3. Add the same redirect URI in the Social Application settings

---

## Project Structure

```
kanterslaan/
├── backend/           # Django app
│   ├── backend/      # Settings, URLs
│   ├── kanterslaan/  # Models, views, serializers, BAG API
│   └── manage.py
├── client/           # React + Vite
│   └── src/
│       ├── api/      # API client, React Query hooks
│       ├── components/
│       ├── contexts/
│       ├── locales/  # i18n (en, nl)
│       ├── pages/
│       └── theme.ts
├── docker/
│   └── init-db.sql   # PostGIS extension
└── docker-compose.yml
```
