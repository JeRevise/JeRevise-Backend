const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { verifyProfToken, verifyEleveToken } = require("../middlewares/authMiddleware");

// Auth professeur
router.post("/register-prof", authController.registerProfesseur);
router.post("/login-prof", authController.loginProfesseur);
router.put("/configurer-prof", verifyProfToken, authController.configurerProfesseur);

// Auth élève
router.post("/register-eleve", authController.registerEleve);
router.post("/login-eleve", authController.loginEleve);
router.put("/set-classe", verifyEleveToken, authController.setClasseEleve);

// Données de référence
router.get("/matieres", authController.getMatieres);
router.get("/classes", authController.getClasses);



// Exemple route protégée
router.get("/protected", verifyProfToken, (req, res) => {
  res.json({ message: `Salut ${req.professeur.email}, tu es authentifié !` });
});

module.exports = router;
