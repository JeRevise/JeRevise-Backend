const Eleve = require("../models/Eleve");
const Classe = require("../models/Classe");
const QCM = require("../models/QCM");
const ProgrammeSpecial = require("../models/ProgrammeSpecial");
const { Op } = require("sequelize");

// Récupérer les QCM selon le niveau de l'élève
exports.getQCMParNiveau = async (req, res) => {
  try {
    const eleveId = req.user.id;
    const { type_programme } = req.query;

    // Récupérer l'élève avec sa classe
    const eleve = await Eleve.findByPk(eleveId, {
      include: [{ model: Classe }]
    });

    if (!eleve || !eleve.Classe) {
      return res.status(400).json({ message: "Élève ou classe non trouvé" });
    }

    const niveau = eleve.Classe.niveau;
    let whereClause = { valide: true };

    if (type_programme === 'normal') {
      // Programme normal de la classe
      whereClause.id_chapitre = { 
        [Op.and]: [
          { [Op.notLike]: 'BREVET_%' },
          { [Op.notLike]: 'HP_%' }
        ]
      };
    } else if (type_programme === 'brevet' && niveau === '3e') {
      // Sujets brevet accessible seulement aux 3e
      whereClause.id_chapitre = { [Op.like]: 'BREVET_%' };
    } else if (type_programme === 'hors_programme') {
      // Hors programme selon le niveau
      whereClause.id_chapitre = { [Op.like]: `HP_${niveau}_%` };
    } else {
      return res.status(400).json({ message: "Programme non accessible" });
    }

    const qcms = await QCM.findAll({
      where: whereClause,
      attributes: ['id', 'question', 'reponse_1', 'reponse_2', 'reponse_3', 'reponse_4', 'id_chapitre']
    });

    // Grouper par chapitre
    const qcmsParChapitre = qcms.reduce((acc, qcm) => {
      const chapitre = qcm.id_chapitre;
      if (!acc[chapitre]) {
        acc[chapitre] = {
          nom: formaterChapitreAffichage(chapitre),
          questions: []
        };
      }
      acc[chapitre].questions.push(qcm);
      return acc;
    }, {});

    res.json({
      niveau: niveau,
      type_programme,
      accessible: type_programme !== 'brevet' || niveau === '3e',
      chapitres: qcmsParChapitre
    });

  } catch (error) {
    console.error('Erreur QCM par niveau:', error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Statistiques par niveau pour les professeurs
exports.getStatistiquesNiveau = async (req, res) => {
  try {
    const profId = req.professeur.id;

    const stats = await sequelize.query(`
      SELECT 
        c.niveau,
        COUNT(DISTINCT e.id) as nb_eleves,
        COUNT(DISTINCT s.id) as total_reponses,
        ROUND(AVG(CASE WHEN s.correcte = 1 THEN 100 ELSE 0 END), 1) as taux_reussite_moyen,
        COUNT(DISTINCT CASE WHEN s.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN e.id END) as eleves_actifs_7j
      FROM classes c
      LEFT JOIN eleves e ON c.id = e.classe_id
      LEFT JOIN scores s ON e.id = s.id_eleve
      LEFT JOIN qcm q ON s.id_qcm = q.id AND q.id_professeur = :profId
      WHERE c.niveau IN ('6e', '5e', '4e', '3e')
      GROUP BY c.niveau
      ORDER BY 
        CASE c.niveau 
          WHEN '6e' THEN 1 
          WHEN '5e' THEN 2 
          WHEN '4e' THEN 3 
          WHEN '3e' THEN 4 
        END
    `, {
      replacements: { profId },
      type: sequelize.QueryTypes.SELECT
    });

    // Statistiques spéciales brevet (3e uniquement)
    const statsBrevet = await sequelize.query(`
      SELECT 
        COUNT(DISTINCT s.id) as reponses_brevet,
        ROUND(AVG(CASE WHEN s.correcte = 1 THEN 100 ELSE 0 END), 1) as taux_reussite_brevet
      FROM scores s
      JOIN qcm q ON s.id_qcm = q.id
      JOIN eleves e ON s.id_eleve = e.id
      JOIN classes c ON e.classe_id = c.id
      WHERE q.id_professeur = :profId 
        AND q.id_chapitre LIKE 'BREVET_%'
        AND c.niveau = '3e'
    `, {
      replacements: { profId },
      type: sequelize.QueryTypes.SELECT
    });

    res.json({
      stats_par_niveau: stats,
      stats_brevet: statsBrevet[0],
      analyse: genererAnalyseNiveau(stats)
    });

  } catch (error) {
    console.error('Erreur statistiques niveau:', error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

function genererAnalyseNiveau(stats) {
  const analyse = {
    niveau_le_plus_actif: null,
    niveau_en_difficulte: [],
    progression_globale: "stable"
  };

  if (stats.length > 0) {
    // Niveau le plus actif
    analyse.niveau_le_plus_actif = stats.reduce((prev, current) => 
      (prev.eleves_actifs_7j > current.eleves_actifs_7j) ? prev : current
    );

    // Niveaux en difficulté
    analyse.niveau_en_difficulte = stats.filter(stat => 
      stat.taux_reussite_moyen < 60 && stat.total_reponses > 20
    );

    // Progression globale (simplifiée)
    const moyenneGlobale = stats.reduce((sum, stat) => sum + parseFloat(stat.taux_reussite_moyen || 0), 0) / stats.length;
    if (moyenneGlobale > 75) analyse.progression_globale = "excellente";
    else if (moyenneGlobale > 65) analyse.progression_globale = "bonne";
    else if (moyenneGlobale < 50) analyse.progression_globale = "préoccupante";
  }

  return analyse;
}