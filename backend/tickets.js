const express = require("express");
const router = express.Router();

// In-memory ticket list (no DB yet)
let tickets = [
  { id: 1, title: "VPN not working", status: "open" },
  { id: 2, title: "Laptop slow", status: "open" }
];

// GET /tickets  → list all tickets
router.get("/", (req, res) => {
  res.json(tickets);
});

// POST /tickets  → create new ticket
router.post("/", (req, res) => {
  const ticket = {
    id: tickets.length + 1,
    title: req.body.title,
    status: "open"
  };
  tickets.push(ticket);
  res.json(ticket);
});

module.exports = router;