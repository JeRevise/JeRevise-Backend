const sequelize = require("../config/db");
const { Op } = require("sequelize");
const QCM = require("../models/QCM");
const Cours = require("../models/Cours");
const Score = require("../models/Score");

exports.getDashboardProfesseur = async (req, res) => {
  try {
    const profId = req.professeur.id;

    // Statistiques générales
    const statsGenerales = await Promise.all([
      // Nombre de cours créés
      Cours.count({ where: { id_professeur: profId } }),
      
      // Nombre de QCM générés
      QCM.count({ where: { id_professeur: profId } }),
      
      // Nombre de QCM validés
      QCM.count({ where: { id_professeur: profId, valide: true } }),
      
      // Nombre total de réponses des élèves
      sequelize.query(`
        SELECT COUNT(*) as total
        FROM scores s
        JOIN qcm q ON s.id_qcm = q.id
        WHERE q.id_professeur = :profId
      `, {
        replacements: { profId },
        type: sequelize.QueryTypes.SELECT
      })
    ]);

    // Activité récente (derniers 7 jours)
    const activiteRecente = await sequelize.query(`
      SELECT 
        DATE(s.created_at) as date,
        COUNT(s.id) as nb_reponses,
        COUNT(DISTINCT s.id_eleve) as nb_eleves_actifs
      FROM scores s
      JOIN qcm q ON s.id_qcm = q.id
      WHERE q.id_professeur = :profId
        AND s.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY DATE(s.created_at)
      ORDER BY date DESC
    `, {
      replacements: { profId },
      type: sequelize.QueryTypes.SELECT
    });

    // Top 5 des chapitres les plus actifs
    const chapitresActifs = await sequelize.query(`
      SELECT 
        q.id_chapitre as chapitre,
        COUNT(s.id) as nb_reponses,
        COUNT(DISTINCT s.id_eleve) as nb_eleves,
        ROUND(AVG(CASE WHEN s.correcte = 1 THEN 100 ELSE 0 END), 1) as taux_reussite
      FROM scores s
      JOIN qcm q ON s.id_qcm = q.id
      WHERE q.id_professeur = :profId
      GROUP BY q.id_chapitre
      ORDER BY nb_reponses DESC
      LIMIT 5
    `, {
      replacements: { profId },
      type: sequelize.QueryTypes.SELECT
    });

    // Alertes et notifications
    const alertes = await genererAlertes(profId);

    res.json({
      statistiques: {
        cours_crees: statsGenerales[0],
        qcm_generes: statsGenerales[1],
        qcm_valides: statsGenerales[2],
        total_reponses_eleves: statsGenerales[3][0].total,
        taux_validation_qcm: statsGenerales[1] > 0 ? 
          Math.round((statsGenerales[2] / statsGenerales[1]) * 100) : 0
      },
      activite_7_jours: activiteRecente,
      chapitres_populaires: chapitresActifs,
      alertes: alertes,
      actions_rapides: [
        {
          titre: "QCM en attente de validation",
          count: statsGenerales[1] - statsGenerales[2],
          action: "/api/qcm/en-attente"
        },
        {
          titre: "Cours sans QCM",
          count: await compterCoursSansQCM(profId),
          action: "/api/cours/mes-cours"
        }
      ]
    });

  } catch (error) {
    console.error('Erreur dashboard professeur:', error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Fonction helper pour générer les alertes
async function genererAlertes(profId) {
  const alertes = [];

  // Élèves en difficulté
  const elevesEnDifficulte = await sequelize.query(`
    SELECT COUNT(DISTINCT s.id_eleve) as count
    FROM scores s
    JOIN qcm q ON s.id_qcm = q.id
    WHERE q.id_professeur = :profId
    GROUP BY s.id_eleve
    HAVING AVG(CASE WHEN s.correcte = 1 THEN 100 ELSE 0 END) < 50
      AND COUNT(s.id) > 5
  `, {
    replacements: { profId },
    type: sequelize.QueryTypes.SELECT
  });

  if (elevesEnDifficulte.length > 0) {
    alertes.push({
      type: "warning",
      message: `${elevesEnDifficulte.length} élève(s) en difficulté majeure`,
      action: "/api/qcm/suivi-eleves"
    });
  }

  // QCM non validés depuis plus de 3 jours
  const qcmAnciens = await QCM.count({
    where: {
      id_professeur: profId,
      valide: false,
      created_at: {
        [Op.lt]: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      }
    }
  });

  if (qcmAnciens > 0) {
    alertes.push({
      type: "info",
      message: `${qcmAnciens} QCM en attente depuis plus de 3 jours`,
      action: "/api/qcm/en-attente"
    });
  }

  return alertes;
}

// Compter les cours sans QCM associés
async function compterCoursSansQCM(profId) {
  const cours = await Cours.findAll({
    where: { id_professeur: profId },
    attributes: ['chapitre']
  });

  const chapitresAvecQCM = await QCM.findAll({
    where: { id_professeur: profId },
    attributes: ['id_chapitre'],
    group: ['id_chapitre']
  });

  const chapitresUniques = [...new Set(cours.map(c => c.chapitre))];
  const chapitresAvecQCMUniques = [...new Set(chapitresAvecQCM.map(q => q.id_chapitre))];

  return chapitresUniques.filter(chapitre => 
    !chapitresAvecQCMUniques.includes(chapitre)
  ).length;
}