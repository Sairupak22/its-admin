const express = require("express");
const cors = require("cors");
const tickets = require("./tickets");

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "Backend Running" });
});

// Tickets routes
app.use("/tickets", tickets);

// Start server
app.listen(3001, () => {
  console.log("ITS Backend is running on port 3001");
});