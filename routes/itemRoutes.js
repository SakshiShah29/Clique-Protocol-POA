// routes/itemRoutes.js
const express = require("express");
const router = express.Router();
const itemController = require("../controllers/itemController");

// Define a route for adding items
router.post("/add", itemController.addItems);

router.get("/:itemId", itemController.readItemById);

module.exports = router;
