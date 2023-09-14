// routes/sealerRoutes.js
const express = require('express');
const router = express.Router();
const sealerController = require('../controllers/sealerController');

// Define a route for proposing a sealer
router.post('/propose', sealerController.proposeAndStoreApprovedSealer);

module.exports = router;
