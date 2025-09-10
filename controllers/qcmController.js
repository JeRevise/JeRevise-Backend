const QCM = require("../models/QCM");
const Cours = require("../models/Cours");
const { genererQCM, extraireTitreCours } = require("../utils/ia");
const { extraireTexteImage, extraireTextePDF } = require("../utils/ocr");
const path = require("path");

// Traiter un cours et générer les QCM
exports.traiterCours = async (req, res) => {
  try {
    const { cours_id, nombre_questions = 5 } = req.body;
    const profId = req.professeur.id;

    // Récupérer le cours
    const cours = await Cours.findOne({
      where: { id: cours_id, id_professeur: profId }
    });

    if (!cours) {
      return res.status(404).json({ message: "Cours non trouvé" });
    }

    let texteExtrait = "";

    // Extraire le texte selon le type de fichier
    if (cours.fichier_url) {
        texteExtrait = await extraireTexte(cours.fichier_url);
    }

    // Si pas de texte extrait ou texte trop court, utiliser le texte déjà en base
    if (!texteExtrait || texteExtrait.length < 100) {
      texteExtrait = cours.texte_ocr || "";
    }

    if (!texteExtrait || texteExtrait.length < 50) {
      return res.status(400).json({ 
        message: "Impossible d'extraire suffisamment de texte pour générer des QCM" 
      });
    }

    // Mettre à jour le cours avec le texte extrait
    if (!cours.texte_ocr) {
      await Cours.update(
        { texte_ocr: texteExtrait },
        { where: { id: cours_id } }
      );
    }

    // Extraire un titre si nécessaire
    let titreGenere = cours.titre;
    if (!cours.titre || cours.titre === "Cours sans titre") {
      titreGenere = await extraireTitreCours(texteExtrait);
      await Cours.update(
        { titre: titreGenere },
        { where: { id: cours_id } }
      );
    }

    // Générer les QCM avec l'IA
    const qcmsGeneres = await genererQCM(texteExtrait, nombre_questions);

    // Sauvegarder les QCM en base (non validés par défaut)
    const qcmsCrees = [];
    for (const qcm of qcmsGeneres) {
      const nouveauQCM = await QCM.create({
        question: qcm.question,
        reponse_1: qcm.reponse_1,
        reponse_2: qcm.reponse_2,
        reponse_3: qcm.reponse_3,
        reponse_4: qcm.reponse_4,
        bonne_reponse: qcm.bonne_reponse,
        id_chapitre: cours.chapitre,
        id_professeur: profId,
        valide: false
      });
      qcmsCrees.push(nouveauQCM);
    }

    res.json({
      message: "QCM générés avec succès",
      titre_genere: titreGenere,
      texte_extrait_length: texteExtrait.length,
      qcms: qcmsCrees
    });

  } catch (error) {
    console.error('Erreur traitement cours:', error);
    res.status(500).json({ 
      message: "Erreur lors du traitement du cours",
      error: error.message 
    });
  }
};

// Récupérer les QCM en attente de validation d'un professeur
exports.getQCMEnAttente = async (req, res) => {
  try {
    const profId = req.professeur.id;

    const qcms = await QCM.findAll({
      where: { 
        id_professeur: profId,
        valide: false 
      },
      order: [['created_at', 'DESC']]
    });

    res.json(qcms);
  } catch (error) {
    console.error('Erreur récupération QCM:', error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Valider/rejeter un QCM
exports.validerQCM = async (req, res) => {
  try {
    const { qcm_id } = req.params;
    const { action, modifications } = req.body; // action: 'valider', 'modifier', 'supprimer'
    const profId = req.professeur.id;

    const qcm = await QCM.findOne({
      where: { id: qcm_id, id_professeur: profId }
    });

    if (!qcm) {
      return res.status(404).json({ message: "QCM non trouvé" });
    }

    switch (action) {
      case 'valider':
        await QCM.update(
          { valide: true },
          { where: { id: qcm_id } }
        );
        res.json({ message: "QCM validé avec succès" });
        break;

      case 'modifier':
        if (!modifications) {
          return res.status(400).json({ message: "Modifications manquantes" });
        }
        
        await QCM.update(
          { ...modifications, valide: true },
          { where: { id: qcm_id } }
        );
        res.json({ message: "QCM modifié et validé avec succès" });
        break;

      case 'supprimer':
        await QCM.destroy({ where: { id: qcm_id } });
        res.json({ message: "QCM supprimé avec succès" });
        break;

      default:
        res.status(400).json({ message: "Action non reconnue" });
    }

  } catch (error) {
    console.error('Erreur validation QCM:', error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Régénérer les QCM pour un chapitre
exports.regenererQCM = async (req, res) => {
  try {
    const { cours_id, nombre_questions = 5 } = req.body;
    const profId = req.professeur.id;

    // Supprimer les anciens QCM non validés pour ce cours
    const cours = await Cours.findOne({
      where: { id: cours_id, id_professeur: profId }
    });

    if (!cours) {
      return res.status(404).json({ message: "Cours non trouvé" });
    }

    await QCM.destroy({
      where: {
        id_chapitre: cours.chapitre,
        id_professeur: profId,
        valide: false
      }
    });

    // Regénérer de nouveaux QCM
    return await exports.traiterCours(req, res);

  } catch (error) {
    console.error('Erreur régénération QCM:', error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Récupérer les QCM validés par chapitre (pour les élèves)
exports.getQCMValidesParChapitre = async (req, res) => {
  try {
    const { chapitre, matiere } = req.query;

    const qcms = await QCM.findAll({
      where: {
        id_chapitre: chapitre,
        valide: true
      },
      attributes: ['id', 'question', 'reponse_1', 'reponse_2', 'reponse_3', 'reponse_4']
      // Note: on n'inclut pas 'bonne_reponse' pour les élèves
    });

    res.json(qcms);
  } catch (error) {
    console.error('Erreur récupération QCM validés:', error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Dashboard professeur - statistiques QCM
exports.getDashboardQCM = async (req, res) => {
  try {
    const profId = req.professeur.id;

    const stats = await QCM.findAndCountAll({
      where: { id_professeur: profId },
      attributes: ['valide'],
      group: ['valide']
    });

    const totalQCM = await QCM.count({
      where: { id_professeur: profId }
    });

    const qcmValides = await QCM.count({
      where: { id_professeur: profId, valide: true }
    });

    const qcmEnAttente = totalQCM - qcmValides;

    res.json({
      total_qcm: totalQCM,
      qcm_valides: qcmValides,
      qcm_en_attente: qcmEnAttente,
      taux_validation: totalQCM > 0 ? (qcmValides / totalQCM * 100).toFixed(1) : 0
    });

  } catch (error) {
    console.error('Erreur dashboard QCM:', error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Dashboard professeur - suivi des élèves
exports.getSuiviEleves = async (req, res) => {
    try {
      const profId = req.professeur.id;
      const { chapitre, classe_id } = req.query;
  
      // Récupérer tous les élèves avec leurs scores
      let queryBase = `
        SELECT 
          e.id, e.prenom, e.nom, c.niveau, c.nom as classe_nom,
          COUNT(DISTINCT s.id) as total_reponses,
          SUM(CASE WHEN s.correcte = 1 THEN 1 ELSE 0 END) as bonnes_reponses,
          ROUND(AVG(CASE WHEN s.correcte = 1 THEN 100 ELSE 0 END), 1) as pourcentage_reussite,
          MAX(s.created_at) as derniere_activite
        FROM eleves e
        LEFT JOIN classes c ON e.classe_id = c.id
        LEFT JOIN scores s ON e.id = s.id_eleve
        LEFT JOIN qcm q ON s.id_qcm = q.id AND q.id_professeur = :profId
      `;
  
      let whereConditions = [];
      let replacements = { profId };
  
      if (chapitre) {
        whereConditions.push("q.id_chapitre = :chapitre");
        replacements.chapitre = chapitre;
      }
  
      if (classe_id) {
        whereConditions.push("e.classe_id = :classe_id");
        replacements.classe_id = classe_id;
      }
  
      if (whereConditions.length > 0) {
        queryBase += " WHERE " + whereConditions.join(" AND ");
      }
  
      queryBase += `
        GROUP BY e.id, e.prenom, e.nom, c.niveau, c.nom
        ORDER BY pourcentage_reussite ASC, total_reponses DESC
      `;
  
      const elevesStats = await sequelize.query(queryBase, {
        replacements,
        type: sequelize.QueryTypes.SELECT
      });
  
      // Identifier les élèves en difficulté
      const elevesEnDifficulte = elevesStats.filter(eleve => 
        eleve.total_reponses > 5 && eleve.pourcentage_reussite < 60
      );
  
      // Élèves inactifs (pas de réponse depuis 7 jours)
      const dateLimit = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const elevesInactifs = elevesStats.filter(eleve => 
        !eleve.derniere_activite || new Date(eleve.derniere_activite) < dateLimit
      );
  
      res.json({
        total_eleves: elevesStats.length,
        eleves: elevesStats,
        alertes: {
          eleves_en_difficulte: elevesEnDifficulte.length,
          eleves_inactifs: elevesInactifs.length
        },
        details_alertes: {
          difficulte: elevesEnDifficulte,
          inactifs: elevesInactifs
        }
      });
  
    } catch (error) {
      console.error('Erreur suivi élèves:', error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  };
  
  // Détail d'un élève spécifique
  exports.getDetailEleve = async (req, res) => {
    try {
      const { eleve_id } = req.params;
      const profId = req.professeur.id;
  
      // Vérifier que l'élève existe
      const eleve = await Eleve.findByPk(eleve_id, {
        include: [{ model: Classe }]
      });
  
      if (!eleve) {
        return res.status(404).json({ message: "Élève non trouvé" });
      }
  
      // Statistiques générales de l'élève pour ce professeur
      const statsGenerales = await sequelize.query(`
        SELECT 
          COUNT(s.id) as total_reponses,
          SUM(CASE WHEN s.correcte = 1 THEN 1 ELSE 0 END) as bonnes_reponses,
          ROUND(AVG(CASE WHEN s.correcte = 1 THEN 100 ELSE 0 END), 1) as pourcentage_reussite,
          AVG(s.temps_reponse) as temps_moyen_reponse
        FROM scores s
        JOIN qcm q ON s.id_qcm = q.id
        WHERE s.id_eleve = :eleve_id AND q.id_professeur = :profId
      `, {
        replacements: { eleve_id, profId },
        type: sequelize.QueryTypes.SELECT
      });
  
      // Progression par chapitre
      const progressionChapitres = await sequelize.query(`
        SELECT 
          q.id_chapitre as chapitre,
          COUNT(s.id) as total_reponses,
          SUM(CASE WHEN s.correcte = 1 THEN 1 ELSE 0 END) as bonnes_reponses,
          ROUND(AVG(CASE WHEN s.correcte = 1 THEN 100 ELSE 0 END), 1) as pourcentage,
          MAX(s.created_at) as derniere_activite
        FROM scores s
        JOIN qcm q ON s.id_qcm = q.id
        WHERE s.id_eleve = :eleve_id AND q.id_professeur = :profId
        GROUP BY q.id_chapitre
        ORDER BY q.id_chapitre
      `, {
        replacements: { eleve_id, profId },
        type: sequelize.QueryTypes.SELECT
      });
  
      // Questions les plus problématiques
      const questionsProblematiques = await sequelize.query(`
        SELECT 
          q.question,
          q.id_chapitre as chapitre,
          COUNT(s.id) as nb_tentatives,
          SUM(CASE WHEN s.correcte = 0 THEN 1 ELSE 0 END) as nb_erreurs
        FROM scores s
        JOIN qcm q ON s.id_qcm = q.id
        WHERE s.id_eleve = :eleve_id AND q.id_professeur = :profId AND s.correcte = 0
        GROUP BY q.id, q.question, q.id_chapitre
        ORDER BY nb_erreurs DESC
        LIMIT 10
      `, {
        replacements: { eleve_id, profId },
        type: sequelize.QueryTypes.SELECT
      });
  
      // Évolution dans le temps (derniers 30 jours)
      const evolution = await sequelize.query(`
        SELECT 
          DATE(s.created_at) as date,
          COUNT(s.id) as total_reponses,
          SUM(CASE WHEN s.correcte = 1 THEN 1 ELSE 0 END) as bonnes_reponses,
          ROUND(AVG(CASE WHEN s.correcte = 1 THEN 100 ELSE 0 END), 1) as pourcentage
        FROM scores s
        JOIN qcm q ON s.id_qcm = q.id
        WHERE s.id_eleve = :eleve_id AND q.id_professeur = :profId
          AND s.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY DATE(s.created_at)
        ORDER BY date DESC
      `, {
        replacements: { eleve_id, profId },
        type: sequelize.QueryTypes.SELECT
      });
  
      res.json({
        eleve: {
          id: eleve.id,
          nom: eleve.nom,
          prenom: eleve.prenom,
          classe: eleve.Classe ? `${eleve.Classe.niveau}${eleve.Classe.nom}` : null
        },
        statistiques: statsGenerales[0],
        progression_chapitres: progressionChapitres,
        questions_problematiques: questionsProblematiques,
        evolution_30_jours: evolution,
        recommendations: genererRecommandations(statsGenerales[0], progressionChapitres, questionsProblematiques)
      });
  
    } catch (error) {
      console.error('Erreur détail élève:', error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  };
  
  // Fonction helper pour générer des recommandations
  function genererRecommandations(stats, progression, problemes) {
    const recommendations = [];
  
    if (stats.pourcentage_reussite < 50) {
      recommendations.push({
        type: "urgent",
        message: "Élève en grande difficulté, entretien individuel recommandé"
      });
    } else if (stats.pourcentage_reussite < 70) {
      recommendations.push({
        type: "attention",
        message: "Élève en difficulté, accompagnement renforcé conseillé"
      });
    }
  
    if (stats.temps_moyen_reponse > 60) {
      recommendations.push({
        type: "info",
        message: "Temps de réponse élevé, vérifier la compréhension des consignes"
      });
    }
  
    const chapitresFaibles = progression.filter(p => p.pourcentage < 60);
    if (chapitresFaibles.length > 0) {
      recommendations.push({
        type: "pedagogique",
        message: `Chapitres à retravailler : ${chapitresFaibles.map(c => c.chapitre).join(', ')}`
      });
    }
  
    if (problemes.length > 5) {
      recommendations.push({
        type: "revision",
        message: "Nombreuses difficultés récurrentes, séance de révision ciblée nécessaire"
      });
    }
  
    return recommendations;
  }
  
  // Analyse comparative des classes
  exports.getAnalyseClasses = async (req, res) => {
    try {
      const profId = req.professeur.id;
  
      const analyseClasses = await sequelize.query(`
        SELECT 
          c.niveau,
          c.nom as classe_nom,
          COUNT(DISTINCT e.id) as nb_eleves,
          COUNT(s.id) as total_reponses,
          SUM(CASE WHEN s.correcte = 1 THEN 1 ELSE 0 END) as bonnes_reponses,
          ROUND(AVG(CASE WHEN s.correcte = 1 THEN 100 ELSE 0 END), 1) as pourcentage_moyen,
          COUNT(DISTINCT CASE WHEN s.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN e.id END) as eleves_actifs_7j
        FROM classes c
        LEFT JOIN eleves e ON c.id = e.classe_id
        LEFT JOIN scores s ON e.id = s.id_eleve
        LEFT JOIN qcm q ON s.id_qcm = q.id AND q.id_professeur = :profId
        GROUP BY c.id, c.niveau, c.nom
        HAVING nb_eleves > 0
        ORDER BY c.niveau DESC, c.nom
      `, {
        replacements: { profId },
        type: sequelize.QueryTypes.SELECT
      });
  
      // Analyse des tendances par chapitre
      const tendancesChapitres = await sequelize.query(`
        SELECT 
          q.id_chapitre as chapitre,
          COUNT(DISTINCT s.id_eleve) as nb_eleves_participants,
          COUNT(s.id) as total_reponses,
          ROUND(AVG(CASE WHEN s.correcte = 1 THEN 100 ELSE 0 END), 1) as taux_reussite_moyen,
          MIN(CASE WHEN s.correcte = 1 THEN 100 ELSE 0 END) as taux_min,
          MAX(CASE WHEN s.correcte = 1 THEN 100 ELSE 0 END) as taux_max
        FROM scores s
        JOIN qcm q ON s.id_qcm = q.id
        WHERE q.id_professeur = :profId
        GROUP BY q.id_chapitre
        ORDER BY taux_reussite_moyen ASC
      `, {
        replacements: { profId },
        type: sequelize.QueryTypes.SELECT
      });
  
      res.json({
        analyse_classes: analyseClasses,
        tendances_chapitres: tendancesChapitres,
        resume: {
          classe_la_plus_performante: analyseClasses.reduce((prev, current) => 
            (prev.pourcentage_moyen > current.pourcentage_moyen) ? prev : current
          ),
          chapitre_le_plus_difficile: tendancesChapitres[0] // Premier car trié par taux croissant
        }
      });
  
    } catch (error) {
      console.error('Erreur analyse classes:', error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  };