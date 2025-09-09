const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const { verifyProfToken } = require("../middlewares/authMiddleware");

router.get("/professeur", verifyProfToken, dashboardController.getDashboardProfesseur);

module.exports = router;