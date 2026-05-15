# ITS Admin Portal — Full End-to-End Documentation

## Table of Contents
1. [What Is This?](#1-what-is-this)
2. [System Architecture](#2-system-architecture)
3. [Project Structure](#3-project-structure)
4. [Technology Stack](#4-technology-stack)
5. [Backend — How It Works](#5-backend--how-it-works)
6. [Frontend — How It Works](#6-frontend--how-it-works)
7. [Data Flow — Request Lifecycle](#7-data-flow--request-lifecycle)
8. [API Reference](#8-api-reference)
9. [Data Model](#9-data-model)
10. [How to Run Locally](#10-how-to-run-locally)
11. [Infrastructure — Terraform on AWS](#11-infrastructure--terraform-on-aws)
12. [How It Gets Deployed to EC2](#12-how-it-gets-deployed-to-ec2)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. What Is This?

The **ITS Admin Portal** is an internal IT Support Ticketing System. It allows IT staff to:

- Raise support tickets for issues (e.g. "VPN not working", "Laptop slow")
- Track ticket status: **Open → In Progress → Closed**
- Set priority levels: **Low / Medium / High**
- Assign tickets to team members
- Search and filter tickets
- Edit and delete tickets

It is a full-stack web application with a React frontend and a Node.js backend, deployable to AWS EC2 via Terraform.

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────┐
│                    User's Browser                   │
│                                                     │
│         React App  →  http://localhost:3000         │
└──────────────────────┬──────────────────────────────┘
                       │  HTTP fetch() calls
                       │  (GET, POST, PUT, DELETE)
                       ▼
┌─────────────────────────────────────────────────────┐
│              Node.js / Express Backend              │
│                                                     │
│         REST API  →  http://localhost:3001          │
└──────────────────────┬──────────────────────────────┘
                       │  fs.readFileSync / writeFileSync
                       ▼
┌─────────────────────────────────────────────────────┐
│              tickets_db.json  (local file)          │
│              Acts as a lightweight database         │
└─────────────────────────────────────────────────────┘
```

The frontend and backend are two separate processes running on different ports on the same machine (or EC2 instance). They communicate over HTTP.

---

## 3. Project Structure

```
its-admin/
│
├── backend/
│   ├── server.js          # Express app entry point, sets up middleware and routes
│   ├── tickets.js         # All ticket route handlers (GET, POST, PUT, DELETE)
│   ├── tickets_db.json    # Auto-created JSON file that stores all ticket data
│   └── package.json       # Backend dependencies (express, cors)
│
├── frontend/
│   ├── index.html         # HTML shell — contains <div id="root"> where React mounts
│   ├── vite.config.js     # Vite build tool configuration
│   ├── package.json       # Frontend dependencies (react, react-dom, vite)
│   └── src/
│       ├── main.jsx       # React entry point — mounts <App /> into the DOM
│       └── App.jsx        # Entire frontend UI — components, state, API calls
│
└── DOCUMENTATION.md       # This file
```

---

## 4. Technology Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend UI | React 18 | Component-based UI with hooks for state management |
| Frontend Build | Vite 5 | Fast dev server, works with Node 24, replaces Create React App |
| Backend | Node.js + Express | Lightweight REST API server |
| Data Storage | JSON file (`tickets_db.json`) | Simple persistence without needing a database |
| CORS | cors npm package | Allows the frontend (port 3000) to call the backend (port 3001) |
| Infrastructure | Terraform + AWS | Provisions EC2 instance to host the app |

---

## 5. Backend — How It Works

### Entry Point: `server.js`

```js
const express = require("express");
const cors    = require("cors");
const tickets = require("./tickets");

const app = express();

app.use(cors({ exposedHeaders: ["Content-Range"] }));
app.use(express.json());

app.get("/health", (req, res) => res.json({ status: "Backend Running" }));
app.use("/tickets", tickets);

app.listen(3001);
```

When you run `node server.js`:
1. Express creates an HTTP server
2. **CORS middleware** is applied — this tells the browser it's allowed to make requests from a different port (3000 → 3001)
3. **JSON middleware** is applied — automatically parses incoming request bodies as JSON
4. The `/health` route is registered for health checks
5. All `/tickets/*` routes are delegated to `tickets.js`
6. The server starts listening on port **3001**

---

### Route Handler: `tickets.js`

This file handles all ticket operations. Data is stored in `tickets_db.json` on disk.

#### Persistence

```js
function loadTickets() {
  if (!fs.existsSync(DB_FILE)) {
    // First run: create the file with 3 seed tickets
    saveTickets(seedData);
  }
  return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
}

function saveTickets(tickets) {
  fs.writeFileSync(DB_FILE, JSON.stringify(tickets, null, 2));
}
```

Every read loads the JSON file from disk. Every write saves the full array back to disk. This means tickets survive server restarts.

#### Routes

| Route | What it does |
|---|---|
| `GET /tickets` | Reads all tickets from file, supports `?status=` filter and `?_start=&_end=` pagination |
| `GET /tickets/:id` | Finds and returns a single ticket by ID |
| `POST /tickets` | Creates a new ticket, assigns next ID, saves to file |
| `PUT /tickets/:id` | Updates an existing ticket's fields, saves to file |
| `DELETE /tickets/:id` | Removes a ticket from the array, saves to file |

---

## 6. Frontend — How It Works

### Entry Chain

```
index.html
  └── loads src/main.jsx  (via <script type="module">)
        └── mounts <App />  into <div id="root">
              └── App.jsx  contains all UI logic
```

### `main.jsx`

```jsx
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

This is the bootstrap. It finds the `<div id="root">` in `index.html` and hands control to React.

---

### `App.jsx` — The Full UI

The entire frontend lives in one file. It is broken into:

#### State

```js
const [tickets, setTickets] = useState([]);      // All tickets from backend
const [filter, setFilter]   = useState({...});   // Search text + status filter
const [modal, setModal]     = useState(null);    // Controls create/edit modal
const [loading, setLoading] = useState(true);    // Loading spinner
const [error, setError]     = useState("");      // Error message
```

#### Data Loading

```js
const load = () => {
  fetch("http://localhost:3001/tickets")
    .then(r => r.json())
    .then(data => setTickets(data))
    .catch(() => setError("Cannot reach backend on port 3001"));
};

useEffect(() => { load(); }, []); // Runs once when page loads
```

On page load, `useEffect` fires `load()` which calls the backend and stores the result in `tickets` state. React then re-renders the table with the data.

#### Components

| Component | What it renders |
|---|---|
| **Header** | Blue bar with app title and "+ New Ticket" button |
| **Stats bar** | Three coloured cards showing Open / In Progress / Closed counts |
| **Filter bar** | Search input + status dropdown |
| **Ticket table** | Rows for each ticket with ID, title, status badge, priority badge, assignee, date, actions |
| **Modal** | Overlay form for creating or editing a ticket |
| **Badge** | Reusable coloured pill for status and priority values |

#### CRUD Operations

```js
// Create
const createTicket = async (form) => {
  await fetch(`${API}/tickets`, { method: "POST", body: JSON.stringify(form) });
  setModal(null);
  load(); // Refresh the list
};

// Update
const updateTicket = async (form) => {
  await fetch(`${API}/tickets/${form.id}`, { method: "PUT", body: JSON.stringify(form) });
  setModal(null);
  load();
};

// Delete
const deleteTicket = async (id) => {
  await fetch(`${API}/tickets/${id}`, { method: "DELETE" });
  load();
};
```

After every operation, `load()` is called to re-fetch the latest data from the backend and update the UI.

#### Client-side Filtering

```js
const filtered = tickets.filter(t => {
  if (filter.status && t.status !== filter.status) return false;
  if (filter.search && !t.title.toLowerCase().includes(filter.search.toLowerCase())) return false;
  return true;
});
```

Filtering happens in the browser — no extra API calls needed. The full ticket list is fetched once and filtered locally.

---

## 7. Data Flow — Request Lifecycle

### Example: User creates a new ticket

```
1. User clicks "+ New Ticket"
   → setModal("create") — React shows the Modal component

2. User fills in Title="Printer broken", Priority="High", clicks "Create Ticket"
   → createTicket(form) is called

3. Frontend sends:
   POST http://localhost:3001/tickets
   Body: { "title": "Printer broken", "priority": "high", "status": "open", "assignee": "" }

4. Backend receives the request in tickets.js POST handler:
   → Loads current tickets from tickets_db.json
   → Calculates next ID (max existing ID + 1)
   → Creates new ticket object with createdAt timestamp
   → Pushes to array and saves back to tickets_db.json
   → Responds with 201 + the new ticket object

5. Frontend receives the response
   → setModal(null) — closes the modal
   → load() — re-fetches all tickets from backend
   → setTickets(data) — React re-renders the table with the new ticket visible

6. Stats bar automatically updates because counts are derived from the tickets array
```

---

## 8. API Reference

Base URL: `http://localhost:3001`

### GET /health
Returns server status.
```json
{ "status": "Backend Running" }
```

### GET /tickets
Returns all tickets as a JSON array.

Query parameters:
- `?status=open` — filter by status (`open`, `in-progress`, `closed`)
- `?_start=0&_end=10` — pagination

Response headers:
- `Content-Range: tickets 0-10/25` — total count for pagination

```json
[
  {
    "id": 1,
    "title": "VPN not working",
    "status": "open",
    "priority": "high",
    "assignee": "",
    "createdAt": "2026-05-15T08:03:30.436Z"
  }
]
```

### GET /tickets/:id
Returns a single ticket.
```json
{ "id": 1, "title": "VPN not working", "status": "open", ... }
```
Returns `404` if not found.

### POST /tickets
Creates a new ticket.

Request body:
```json
{
  "title": "Printer broken",
  "status": "open",
  "priority": "high",
  "assignee": "Jane"
}
```
Response: `201` + created ticket object.

### PUT /tickets/:id
Updates an existing ticket.

Request body (any fields to update):
```json
{
  "status": "closed",
  "assignee": "John"
}
```
Response: Updated ticket object.
Returns `404` if not found.

### DELETE /tickets/:id
Deletes a ticket.
Response: The deleted ticket object.
Returns `404` if not found.

---

## 9. Data Model

Each ticket stored in `tickets_db.json`:

```json
{
  "id": 1,
  "title": "VPN not working",
  "status": "open",
  "priority": "high",
  "assignee": "John Doe",
  "createdAt": "2026-05-15T08:03:30.436Z"
}
```

| Field | Type | Values |
|---|---|---|
| `id` | number | Auto-incremented integer |
| `title` | string | Free text description of the issue |
| `status` | string | `open`, `in-progress`, `closed` |
| `priority` | string | `low`, `medium`, `high` |
| `assignee` | string | Name of person assigned (can be empty) |
| `createdAt` | string | ISO 8601 timestamp, set on creation |

---

## 10. How to Run Locally

### Prerequisites
- Node.js 18+ installed (`node --version` to check)
- npm installed (`npm --version` to check)

### Step 1 — Start the Backend

```bash
cd its-admin/backend
npm install
npm start
```

You should see:
```
ITS Backend is running on port 3001
```

### Step 2 — Start the Frontend

Open a second terminal:

```bash
cd its-admin/frontend
npm install
npm start
```

Vite will start and print:
```
VITE v5.x  ready in ~500ms
➜  Local: http://localhost:3000/
```

### Step 3 — Open the App

Go to **http://localhost:3000** in your browser.

On first run, `tickets_db.json` is auto-created in the backend folder with 3 seed tickets.

### Development mode (auto-reload on save)

For the backend with auto-reload:
```bash
npm run dev   # uses nodemon
```

---

## 11. Infrastructure — Terraform on AWS

The `ITS-ADMIN/` folder contains Terraform code that provisions AWS infrastructure to host this app.

### Files

| File | Purpose |
|---|---|
| `main.tf` | Defines EC2 instance, security group, AMI lookup |
| `variables.tf` | Input variables (region, instance type, key pair name) |
| `outputs.tf` | Outputs public IP, DNS, frontend URL, backend URL after deploy |
| `userdata.sh` | Startup script that runs automatically when EC2 boots |

### What Terraform Creates

```
AWS (ap-south-1 / Mumbai)
│
├── Security Group: its-portal-sg
│   ├── Inbound port 3000  (Frontend)
│   ├── Inbound port 3001  (Backend)
│   ├── Inbound port 22    (SSH)
│   └── Outbound all
│
└── EC2 Instance: ITS-Admin-Portal
    ├── AMI: Amazon Linux 2 (latest, auto-fetched)
    ├── Type: t2.micro
    ├── Public IP: assigned automatically
    └── User Data: runs userdata.sh on first boot
```

### Variables (`variables.tf`)

| Variable | Default | Description |
|---|---|---|
| `aws_region` | `ap-south-1` | AWS region to deploy in |
| `instance_type` | `t2.micro` | EC2 instance size |
| `key_name` | `mykey-12` | Name of your EC2 key pair for SSH |

### Outputs after `terraform apply`

```
public_ip    = "13.x.x.x"
public_dns   = "ec2-13-x-x-x.ap-south-1.compute.amazonaws.com"
frontend_url = "http://13.x.x.x:3000"
backend_url  = "http://13.x.x.x:3001"
```

### Terraform Commands

```bash
cd ITS-ADMIN/

# Initialise (download AWS provider)
terraform init

# Preview what will be created
terraform plan

# Create the infrastructure
terraform apply

# Destroy everything when done
terraform destroy
```

---

## 12. How It Gets Deployed to EC2

When `terraform apply` runs, it creates the EC2 instance and passes `userdata.sh` as the startup script. AWS runs this script automatically the first time the instance boots.

### `userdata.sh` — What It Does Step by Step

```bash
#!/bin/bash
set -e                              # Stop on any error
exec > /var/log/userdata.log 2>&1   # Log everything to a file

yum update -y                       # Update OS packages
yum install -y git                  # Install Git

# Install Node.js 18
curl -sL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs

npm install -g serve                # Install 'serve' to host built React files

cd /home/ec2-user
git clone https://github.com/Sairupak22/its-admin.git

# Start backend
cd its-admin/backend
npm install
nohup node server.js > /home/ec2-user/backend.log 2>&1 &

# Build and serve frontend (production mode)
cd ../frontend
npm install
npm run build                       # Creates optimised static files in /build
nohup serve -s build -l 3000 > /home/ec2-user/frontend.log 2>&1 &

echo "Startup complete"
```

Key points:
- `nohup ... &` runs the process in the background so the script doesn't block
- The frontend is **built** (`npm run build`) rather than run in dev mode — this is production-safe
- `serve -s build` serves the compiled static files on port 3000
- All logs go to `/var/log/userdata.log` — SSH in and `cat` that file to debug startup issues

### Checking Logs on EC2

```bash
# SSH into the instance
ssh -i mykey-12.pem ec2-user@<public-ip>

# Check startup log
cat /var/log/userdata.log

# Check backend runtime log
cat /home/ec2-user/backend.log

# Check frontend runtime log
cat /home/ec2-user/frontend.log
```

---

## 13. Troubleshooting

### "Cannot reach backend on port 3001"
The backend is not running. Start it:
```bash
cd backend && npm start
```

### Tickets show as empty / 0 counts
The backend started but `tickets_db.json` doesn't exist yet. It gets created automatically on the first request. Refresh the page.

### Port already in use
```bash
# Find what's using port 3001
netstat -ano | findstr :3001

# Kill it (replace PID with the number from above)
taskkill /PID <PID> /F
```

### Vite won't start (Windows)
Make sure you're running from the `frontend/` directory and Node 18+ is installed:
```bash
node --version   # should be v18 or higher
npm start
```

### EC2 app not loading after deploy
1. Wait 2-3 minutes — userdata.sh takes time to run
2. SSH in and check `/var/log/userdata.log`
3. Make sure the security group allows inbound traffic on ports 3000 and 3001
4. Check the EC2 instance has a public IP (`associate_public_ip_address = true` in Terraform)
