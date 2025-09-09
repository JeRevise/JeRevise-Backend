const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { verifyProfToken } = require("../middlewares/authMiddleware");

// Auth prof
router.post("/login-prof", authController.loginProfesseur);
// Auth élève
router.post("/register-eleve", authController.registerEleve);
router.post("/login-eleve", authController.loginEleve);
router.put("/set-classe", verifyEleveToken, authController.setClasseEleve);



// Exemple route protégée
router.get("/protected", verifyProfToken, (req, res) => {
  res.json({ message: `Salut ${req.professeur.email}, tu es authentifié !` });
});

module.exports = router;
