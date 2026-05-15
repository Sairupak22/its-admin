const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();
const DB_FILE = path.join(__dirname, "tickets_db.json");

// --- Persistence helpers ---
function loadTickets() {
  if (!fs.existsSync(DB_FILE)) {
    const seed = [
      { id: 1, title: "VPN not working",  status: "open",        priority: "high",   assignee: "",         createdAt: new Date().toISOString() },
      { id: 2, title: "Laptop slow",       status: "open",        priority: "medium", assignee: "",         createdAt: new Date().toISOString() },
      { id: 3, title: "Email not syncing", status: "in-progress", priority: "low",    assignee: "John Doe", createdAt: new Date().toISOString() }
    ];
    saveTickets(seed);
    return seed;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
}

function saveTickets(tickets) {
  fs.writeFileSync(DB_FILE, JSON.stringify(tickets, null, 2));
}

// --- GET /tickets ---
// react-admin simpleRestProvider needs:
//   - Content-Range header  →  tickets 0-2/3
//   - Array body
router.get("/", (req, res) => {
  const tickets = loadTickets();

  // Optional filter by status
  const { status } = req.query;
  const filtered = status ? tickets.filter(t => t.status === status) : tickets;

  // Pagination (react-admin sends _start / _end)
  const start = parseInt(req.query._start) || 0;
  const end   = parseInt(req.query._end)   || filtered.length;
  const page  = filtered.slice(start, end);

  res.set("Content-Range", `tickets ${start}-${end}/${filtered.length}`);
  res.set("Access-Control-Expose-Headers", "Content-Range");
  res.json(page);
});

// --- GET /tickets/:id ---
router.get("/:id", (req, res) => {
  const tickets = loadTickets();
  const ticket  = tickets.find(t => t.id === parseInt(req.params.id));
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });
  res.json(ticket);
});

// --- POST /tickets ---
router.post("/", (req, res) => {
  const tickets = loadTickets();
  const maxId   = tickets.length > 0 ? Math.max(...tickets.map(t => t.id)) : 0;
  const ticket  = {
    id:        maxId + 1,
    title:     req.body.title     || "Untitled",
    status:    req.body.status    || "open",
    priority:  req.body.priority  || "medium",
    assignee:  req.body.assignee  || "",
    createdAt: new Date().toISOString()
  };
  tickets.push(ticket);
  saveTickets(tickets);
  res.status(201).json(ticket);
});

// --- PUT /tickets/:id ---
router.put("/:id", (req, res) => {
  const tickets = loadTickets();
  const index   = tickets.findIndex(t => t.id === parseInt(req.params.id));
  if (index === -1) return res.status(404).json({ error: "Ticket not found" });

  tickets[index] = {
    ...tickets[index],
    title:    req.body.title    ?? tickets[index].title,
    status:   req.body.status   ?? tickets[index].status,
    priority: req.body.priority ?? tickets[index].priority,
    assignee: req.body.assignee ?? tickets[index].assignee
  };
  saveTickets(tickets);
  res.json(tickets[index]);
});

// --- DELETE /tickets/:id ---
router.delete("/:id", (req, res) => {
  let tickets = loadTickets();
  const index = tickets.findIndex(t => t.id === parseInt(req.params.id));
  if (index === -1) return res.status(404).json({ error: "Ticket not found" });

  const deleted = tickets[index];
  tickets = tickets.filter(t => t.id !== parseInt(req.params.id));
  saveTickets(tickets);
  res.json(deleted);
});

module.exports = router;
