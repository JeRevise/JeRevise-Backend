const Score = require("../models/Score");
const QCM = require("../models/QCM");
const Eleve = require("../models/Eleve");
const Classe = require("../models/Classe");
const { Op } = require("sequelize");
const sequelize = require("../config/db");

// Soumettre une réponse à un QCM
exports.soumettreReponse = async (req, res) => {
  try {
    const { qcm_id, reponse, temps_reponse } = req.body;
    const eleveId = req.user.id;

    // Vérifier que le QCM existe et est validé
    const qcm = await QCM.findOne({
      where: { id: qcm_id, valide: true }
    });

    if (!qcm) {
      return res.status(404).json({ message: "QCM non trouvé ou non validé" });
    }

    // Vérifier si l'élève a déjà répondu à ce QCM
    const reponseExistante = await Score.findOne({
      where: { id_eleve: eleveId, id_qcm: qcm_id }
    });

    if (reponseExistante) {
      return res.status(400).json({ 
        message: "Vous avez déjà répondu à cette question" 
      });
    }

    // Vérifier si la réponse est correcte
    const estCorrecte = (reponse === qcm.bonne_reponse);

    // Enregistrer la réponse
    const score = await Score.create({
      id_eleve: eleveId,
      id_qcm: qcm_id,
      reponse,
      correcte: estCorrecte,
      temps_reponse
    });

    res.json({
      message: "Réponse enregistrée",
      correcte: estCorrecte,
      bonne_reponse: qcm.bonne_reponse,
      score_id: score.id
    });

  } catch (error) {
    console.error('Erreur soumission réponse:', error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Récupérer les QCM disponibles pour un élève selon sa classe
exports.getQCMDisponibles = async (req, res) => {
  try {
    const { chapitre, matiere } = req.query;
    const eleveId = req.user.id;

    // Récupérer l'élève avec sa classe
    const eleve = await Eleve.findByPk(eleveId, {
      include: [{ model: Classe }]
    });

    if (!eleve || !eleve.Classe) {
      return res.status(400).json({ 
        message: "Élève non trouvé ou classe non définie" 
      });
    }

    // Récupérer les QCM validés pour ce chapitre
    const qcms = await QCM.findAll({
      where: {
        id_chapitre: chapitre,
        valide: true
      },
      attributes: ['id', 'question', 'reponse_1', 'reponse_2', 'reponse_3', 'reponse_4'],
      include: [{
        model: Score,
        where: { id_eleve: eleveId },
        required: false,
        attributes: ['id', 'correcte', 'created_at']
      }]
    });

    // Marquer les questions déjà répondues
    const qcmsAvecStatut = qcms.map(qcm => ({
      id: qcm.id,
      question: qcm.question,
      reponse_1: qcm.reponse_1,
      reponse_2: qcm.reponse_2,
      reponse_3: qcm.reponse_3,
      reponse_4: qcm.reponse_4,
      deja_repondu: qcm.Scores && qcm.Scores.length > 0,
      derniere_reponse: qcm.Scores && qcm.Scores.length > 0 ? {
        correcte: qcm.Scores[0].correcte,
        date: qcm.Scores[0].created_at
      } : null
    }));

    res.json({
      niveau: eleve.Classe.niveau,
      classe: eleve.Classe.nom,
      chapitre,
      qcms: qcmsAvecStatut
    });

  } catch (error) {
    console.error('Erreur récupération QCM:', error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Dashboard élève - statistiques personnelles
exports.getDashboardEleve = async (req, res) => {
  try {
    const eleveId = req.user.id;

    // Statistiques générales
    const totalReponses = await Score.count({
      where: { id_eleve: eleveId }
    });

    const bonnesReponses = await Score.count({
      where: { id_eleve: eleveId, correcte: true }
    });

    const pourcentageReussite = totalReponses > 0 
      ? Math.round((bonnesReponses / totalReponses) * 100) 
      : 0;

    // Questions avec des erreurs récurrentes (pour révision ciblée)
    const questionsEchouees = await Score.findAll({
      where: { id_eleve: eleveId, correcte: false },
      include: [{
        model: QCM,
        attributes: ['id', 'question', 'id_chapitre']
      }],
      order: [['created_at', 'DESC']],
      limit: 10
    });

    // Progression par chapitre
    const progressionChapitres = await sequelize.query(`
      SELECT 
        q.id_chapitre as chapitre,
        COUNT(*) as total_questions,
        SUM(CASE WHEN s.correcte = 1 THEN 1 ELSE 0 END) as bonnes_reponses,
        ROUND(AVG(CASE WHEN s.correcte = 1 THEN 100 ELSE 0 END), 1) as pourcentage
      FROM scores s
      JOIN qcm q ON s.id_qcm = q.id
      WHERE s.id_eleve = :eleveId
      GROUP BY q.id_chapitre
      ORDER BY chapitre
    `, {
      replacements: { eleveId },
      type: sequelize.QueryTypes.SELECT
    });

    // Activité récente (dernières 10 réponses)
    const activiteRecente = await Score.findAll({
      where: { id_eleve: eleveId },
      include: [{
        model: QCM,
        attributes: ['question', 'id_chapitre']
      }],
      order: [['created_at', 'DESC']],
      limit: 10
    });

    res.json({
      statistiques: {
        total_reponses: totalReponses,
        bonnes_reponses: bonnesReponses,
        pourcentage_reussite: pourcentageReussite,
        niveau: await getNiveauEleve(pourcentageReussite)
      },
      questions_a_revoir: questionsEchouees.map(score => ({
        qcm_id: score.QCM.id,
        question: score.QCM.question,
        chapitre: score.QCM.id_chapitre,
        date_erreur: score.created_at
      })),
      progression_chapitres: progressionChapitres,
      activite_recente: activiteRecente.map(score => ({
        question: score.QCM.question,
        chapitre: score.QCM.id_chapitre,
        correcte: score.correcte,
        date: score.created_at
      }))
    });

  } catch (error) {
    console.error('Erreur dashboard élève:', error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Fonction helper pour déterminer le niveau de l'élève
function getNiveauEleve(pourcentage) {
  if (pourcentage >= 90) return { nom: "Expert", badge: "🏆" };
  if (pourcentage >= 80) return { nom: "Avancé", badge: "⭐" };
  if (pourcentage >= 70) return { nom: "Confirmé", badge: "👍" };
  if (pourcentage >= 60) return { nom: "En progression", badge: "📈" };
  return { nom: "Débutant", badge: "🌱" };
}

// Mode révision - questions mal répondues avec répétition
exports.getModeRevision = async (req, res) => {
  try {
    const eleveId = req.user.id;
    const { chapitre } = req.query;

    let whereClause = { id_eleve: eleveId, correcte: false };
    
    // Filtrer par chapitre si spécifié
    let includeClause = [{
      model: QCM,
      attributes: ['id', 'question', 'reponse_1', 'reponse_2', 'reponse_3', 'reponse_4', 'id_chapitre'],
      where: chapitre ? { id_chapitre: chapitre } : {}
    }];

    // Récupérer les questions mal répondues, triées par fréquence d'erreur
    const questionsRevision = await sequelize.query(`
      SELECT 
        q.id, q.question, q.reponse_1, q.reponse_2, q.reponse_3, q.reponse_4, q.id_chapitre,
        COUNT(s.id) as nb_erreurs,
        MAX(s.created_at) as derniere_erreur
      FROM scores s
      JOIN qcm q ON s.id_qcm = q.id
      WHERE s.id_eleve = :eleveId AND s.correcte = 0
      ${chapitre ? 'AND q.id_chapitre = :chapitre' : ''}
      GROUP BY q.id
      ORDER BY nb_erreurs DESC, derniere_erreur DESC
      LIMIT 20
    `, {
      replacements: { eleveId, chapitre },
      type: sequelize.QueryTypes.SELECT
    });

    res.json({
      message: "Questions à réviser",
      total_questions: questionsRevision.length,
      questions: questionsRevision
    });

  } catch (error) {
    console.error('Erreur mode révision:', error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Récupérer les chapitres disponibles pour un élève
exports.getChapitresDisponibles = async (req, res) => {
  try {
    const eleveId = req.user.id;

    // Récupérer tous les chapitres avec QCM validés
    const chapitres = await sequelize.query(`
      SELECT 
        q.id_chapitre as chapitre,
        COUNT(DISTINCT q.id) as total_qcm,
        COUNT(DISTINCT s.id) as qcm_repondus,
        SUM(CASE WHEN s.correcte = 1 THEN 1 ELSE 0 END) as bonnes_reponses
      FROM qcm q
      LEFT JOIN scores s ON q.id = s.id_qcm AND s.id_eleve = :eleveId
      WHERE q.valide = 1
      GROUP BY q.id_chapitre
      ORDER BY q.id_chapitre
    `, {
      replacements: { eleveId },
      type: sequelize.QueryTypes.SELECT
    });

    const chapitresAvecProgression = chapitres.map(chapitre => ({
      nom: chapitre.chapitre,
      total_qcm: chapitre.total_qcm,
      qcm_repondus: chapitre.qcm_repondus || 0,
      bonnes_reponses: chapitre.bonnes_reponses || 0,
      pourcentage_completion: Math.round(((chapitre.qcm_repondus || 0) / chapitre.total_qcm) * 100),
      pourcentage_reussite: chapitre.qcm_repondus > 0 
        ? Math.round(((chapitre.bonnes_reponses || 0) / chapitre.qcm_repondus) * 100)
        : 0,
      statut: getStatutChapitre(chapitre.qcm_repondus || 0, chapitre.total_qcm, chapitre.bonnes_reponses || 0)
    }));

    res.json(chapitresAvecProgression);

  } catch (error) {
    console.error('Erreur chapitres disponibles:', error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Helper pour déterminer le statut d'un chapitre
function getStatutChapitre(repondus, total, bonnes) {
  if (repondus === 0) return "non_commence";
  if (repondus < total) return "en_cours";
  if (bonnes / repondus >= 0.8) return "maitrise";
  if (bonnes / repondus >= 0.6) return "acquis";
  return "a_revoir";
}