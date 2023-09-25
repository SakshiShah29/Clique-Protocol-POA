// routes/defaultNodeRoutes.js
const express = require("express");
const router = express.Router();
const defaultNodeController = require("../controllers/defaultNodeController");

// Define the route for adding a default node
router.post("/addNode", defaultNodeController.addNodesforDiffLevels);
router.post("/addlevel3Node", defaultNodeController.addNodesAtlevle3);
module.exports = router;
