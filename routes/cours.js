const express = require("express");
const router = express.Router();
const coursController = require("../controllers/coursController");
const { verifyProfToken } = require("../middlewares/authMiddleware");
const { upload } = require("../controllers/coursController");

router.post("/", verifyProfToken, upload.single("fichier"), coursController.creerCours);
router.get("/mes-cours", verifyProfToken, coursController.getCoursProfesseur);

router.post("/special", verifyProfToken, upload.single("fichier"), coursController.creerCoursSpecial);
router.get("/par-programme", verifyProfToken, coursController.getCoursParProgramme);

router.get("/:id", verifyProfToken, coursController.getCours);

module.exports = router;