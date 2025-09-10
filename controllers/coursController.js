const Cours = require("../models/Cours");
const ProgrammeSpecial = require("../models/ProgrammeSpecial");
const multer = require("multer");
const path = require("path");
const { Op } = require("sequelize");
const { extraireTexte } = require("../utils/ocr");

// Configuration multer pour upload de fichiers
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/cours/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage });

// Créer un cours
exports.creerCours = async (req, res) => {
  try {
    const { titre, matiere, chapitre } = req.body;
    const profId = req.professeur.id;
    
    let fichier_url = null;
    if (req.file) {
      fichier_url = req.file.path;
    }

    const cours = await Cours.create({
      titre,
      matiere,
      chapitre,
      fichier_url,
      id_professeur: profId
    });

    res.status(201).json({ message: "Cours créé", cours });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Récupérer les cours d'un professeur
exports.getCoursProfesseur = async (req, res) => {
  try {
    const profId = req.professeur.id;
    
    const cours = await Cours.findAll({
      where: { id_professeur: profId },
      order: [['created_at', 'DESC']]
    });

    res.json(cours);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Créer un cours avec programme spécial
exports.creerCoursSpecial = async (req, res) => {
    try {
      const { titre, matiere, chapitre, type_programme, niveau_cible } = req.body;
      const profId = req.professeur.id;
      
      let fichier_url = null;
      if (req.file) {
        fichier_url = req.file.path;
      }
  
      // Adapter le chapitre selon le type de programme
      let chapitreFormate = chapitre;
      if (type_programme === 'brevet') {
        chapitreFormate = `BREVET_${chapitre}`;
      } else if (type_programme === 'hors_programme') {
        chapitreFormate = `HP_${niveau_cible}_${chapitre}`;
      }
  
      const cours = await Cours.create({
        titre,
        matiere,
        chapitre: chapitreFormate,
        fichier_url,
        id_professeur: profId
      });
  
      res.status(201).json({ 
        message: "Cours spécial créé", 
        cours,
        type_programme,
        chapitre_genere: chapitreFormate
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Erreur serveur" });
    }
  };
  
  // Récupérer les cours par programme
  exports.getCoursParProgramme = async (req, res) => {
    try {
      const profId = req.professeur.id;
      const { type_programme, niveau } = req.query;
  
      let whereClause = { id_professeur: profId };
      
      if (type_programme === 'brevet') {
        whereClause.chapitre = { [Op.like]: 'BREVET_%' };
      } else if (type_programme === 'hors_programme') {
        whereClause.chapitre = { [Op.like]: `HP_${niveau}_%` };
      } else {
        // Programme normal - exclure les spéciaux
        whereClause.chapitre = { 
          [Op.and]: [
            { [Op.notLike]: 'BREVET_%' },
            { [Op.notLike]: 'HP_%' }
          ]
        };
      }
  
      const cours = await Cours.findAll({
        where: whereClause,
        order: [['created_at', 'DESC']]
      });
  
      res.json({
        type_programme,
        niveau: niveau || 'tous',
        cours: cours.map(c => ({
          ...c.toJSON(),
          chapitre_affiche: formaterChapitreAffichage(c.chapitre)
        }))
      });
  
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Erreur serveur" });
    }
  };
  
  // Helper pour formatter l'affichage des chapitres
  function formaterChapitreAffichage(chapitre) {
    if (chapitre.startsWith('BREVET_')) {
      return chapitre.replace('BREVET_', 'Brevet - ');
    } else if (chapitre.startsWith('HP_')) {
      const parts = chapitre.split('_');
      return `Hors Programme ${parts[1]} - ${parts.slice(2).join('_')}`;
    }
    return chapitre;
  }



// CORRECTION : Exporter toutes les fonctions ET upload
module.exports = {
  upload,
  creerCours: exports.creerCours,
  getCoursProfesseur: exports.getCoursProfesseur,
  creerCoursSpecial: exports.creerCoursSpecial,
  getCoursParProgramme: exports.getCoursParProgramme
};