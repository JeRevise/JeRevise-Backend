const express = require("express");
const router = express.Router();
const qcmController = require("../controllers/qcmController");
const { verifyProfToken, verifyEleveToken } = require("../middlewares/authMiddleware");

// Routes professeur
router.post("/traiter-cours", verifyProfToken, qcmController.traiterCours);
router.get("/en-attente", verifyProfToken, qcmController.getQCMEnAttente);
router.put("/:qcm_id/valider", verifyProfToken, qcmController.validerQCM);
router.post("/regenerer", verifyProfToken, qcmController.regenererQCM);
router.get("/dashboard", verifyProfToken, qcmController.getDashboardQCM);

// Routes élève
router.get("/chapitre", verifyEleveToken, qcmController.getQCMValidesParChapitre);

// Suivi des élèves
router.get("/suivi-eleves", verifyProfToken, qcmController.getSuiviEleves);
router.get("/eleve/:eleve_id", verifyProfToken, qcmController.getDetailEleve);
router.get("/analyse-classes", verifyProfToken, qcmController.getAnalyseClasses);

module.exports = router;