const express = require("express");
const router = express.Router();
const eleveController = require("../controllers/eleveController");
const { verifyEleveToken } = require("../middlewares/authMiddleware");

// Toutes les routes nécessitent l'authentification élève
router.use(verifyEleveToken);

// QCM et réponses
router.post("/reponse", eleveController.soumettreReponse);
router.get("/qcm", eleveController.getQCMDisponibles);
router.get("/chapitres", eleveController.getChapitresDisponibles);

// Dashboard et suivi
router.get("/dashboard", eleveController.getDashboardEleve);
router.get("/revision", eleveController.getModeRevision);

module.exports = router;