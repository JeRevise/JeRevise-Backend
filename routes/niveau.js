const express = require("express");
const router = express.Router();
const niveauController = require("../controllers/niveauController");
const { verifyProfToken, verifyEleveToken } = require("../middlewares/authMiddleware");

// Routes élève
router.get("/qcm", verifyEleveToken, niveauController.getQCMParNiveau);

// Routes professeur
router.get("/statistiques", verifyProfToken, niveauController.getStatistiquesNiveau);

module.exports = router;