const express = require("express");
const cors    = require("cors");
const tickets = require("./tickets");

const app = express();

app.use(cors({
  exposedHeaders: ["Content-Range"]  // Required for react-admin pagination
}));
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "Backend Running" });
});

// Tickets routes
app.use("/tickets", tickets);

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`ITS Backend is running on port ${PORT}`);
});
