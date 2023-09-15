// routes/defaultNodeRoutes.js
const express = require("express");
const router = express.Router();
const defaultNodeController = require("../controllers/defaultNodeController");

// Define the route for adding a default node
router.post("/add", defaultNodeController.addDefaultNode);

module.exports = router;
