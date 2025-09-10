const Professeur = require("../models/Professeur");
const Eleve = require("../models/Eleve");
const Classe = require("../models/Classe");
const Matiere = require("../models/Matiere");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const sequelize = require("../config/db");
const ProgrammeSpecial = require("../models/ProgrammeSpecial");
require("dotenv").config();

// Inscription professeur avec code d'activation
exports.registerProfesseur = async (req, res) => {
  try {
    const { nom, prenom, email, mot_de_passe, code_activation } = req.body;

    // Vérifier que le code d'activation est valide (à définir selon vos règles)
    // Par exemple, vérifier qu'il correspond à un format attendu
    
    const hashedPassword = await bcrypt.hash(mot_de_passe, 10);

    const prof = await Professeur.create({
      nom,
      prenom,
      email,
      mot_de_passe: hashedPassword,
      code_activation
    });

    res.status(201).json({ 
      message: "Professeur créé", 
      id: prof.id,
      premiere_connexion: true 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Login professeur modifié
exports.loginProfesseur = async (req, res) => {
  try {
    const { email, mot_de_passe } = req.body;

    const prof = await Professeur.findOne({ where: { email } });
    if (!prof) return res.status(404).json({ message: "Professeur non trouvé" });

    const validPassword = await bcrypt.compare(mot_de_passe, prof.mot_de_passe);
    if (!validPassword) return res.status(401).json({ message: "Mot de passe incorrect" });

    const token = jwt.sign(
      { id: prof.id, email: prof.email, role: "professeur" },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({ 
      token, 
      nom: prof.nom, 
      prenom: prof.prenom,
      premiere_connexion: prof.premiere_connexion 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Configuration initiale du professeur (matières + classes)
exports.configurerProfesseur = async (req, res) => {
  try {
    const { matieres_ids, classes_ids } = req.body;
    const profId = req.professeur.id;

    // Associer les matières
    for (const matiereId of matieres_ids) {
      await sequelize.query(
        'INSERT INTO professeurs_matieres (id_professeur, id_matiere) VALUES (?, ?)',
        { replacements: [profId, matiereId] }
      );
    }

    // Associer les classes
    for (const classeId of classes_ids) {
      await sequelize.query(
        'INSERT INTO professeurs_classes (id_professeur, id_classe) VALUES (?, ?)',
        { replacements: [profId, classeId] }
      );
    }

    // Marquer la première connexion comme terminée
    await Professeur.update(
      { premiere_connexion: false },
      { where: { id: profId } }
    );

    res.json({ message: "Configuration terminée avec succès" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Récupérer les matières disponibles
exports.getMatieres = async (req, res) => {
  try {
    const matieres = await Matiere.findAll();
    res.json(matieres);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Récupérer les classes disponibles
exports.getClasses = async (req, res) => {
  try {
    const classes = await Classe.findAll({
      order: [['niveau', 'DESC'], ['nom', 'ASC']]
    });
    res.json(classes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Inscription élève
exports.registerEleve = async (req, res) => {
  try {
    const { prenom, nom, identifiant, mot_de_passe } = req.body;

    const hashedPassword = await bcrypt.hash(mot_de_passe, 10);

    const eleve = await Eleve.create({
      prenom,
      nom,
      identifiant,
      mot_de_passe: hashedPassword
    });

    res.status(201).json({ message: "Élève créé", id: eleve.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Login élève
exports.loginEleve = async (req, res) => {
  try {
    const { identifiant, mot_de_passe } = req.body;

    const eleve = await Eleve.findOne({ where: { identifiant } });
    if (!eleve) return res.status(404).json({ message: "Élève non trouvé" });

    const validPassword = await bcrypt.compare(mot_de_passe, eleve.mot_de_passe);
    if (!validPassword) return res.status(401).json({ message: "Mot de passe incorrect" });

    const token = jwt.sign(
      { id: eleve.id, identifiant: eleve.identifiant, role: "eleve" },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({
      token,
      first_login: eleve.first_login,
      classe_id: eleve.classe_id
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Choisir une classe (première connexion)
exports.setClasseEleve = async (req, res) => {
  try {
    const { classe_id } = req.body;
    const eleveId = req.user.id; // récupéré depuis middleware auth

    const classe = await Classe.findByPk(classe_id);
    if (!classe) return res.status(404).json({ message: "Classe non trouvée" });

    await Eleve.update(
      { classe_id, first_login: false },
      { where: { id: eleveId } }
    );

    res.json({ message: "Classe attribuée avec succès" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Récupérer les programmes disponibles selon les classes gérées
exports.getProgrammesDisponibles = async (req, res) => {
  try {
    const profId = req.professeur.id;

    // Récupérer les classes gérées par le professeur
    const classesGerees = await sequelize.query(`
      SELECT DISTINCT c.niveau 
      FROM professeurs_classes pc
      JOIN classes c ON pc.id_classe = c.id
      WHERE pc.id_professeur = :profId
    `, {
      replacements: { profId },
      type: sequelize.QueryTypes.SELECT
    });

    const niveaux = classesGerees.map(c => c.niveau);

    // Programmes spéciaux accessibles
    const programmesSpeciaux = await ProgrammeSpecial.findAll({
      where: { actif: true }
    });

    const programmesAccessibles = programmesSpeciaux.filter(prog => 
      prog.accessible_niveaux.some(niveau => niveaux.includes(niveau))
    );

    res.json({
      niveaux_geres: niveaux,
      peut_gerer_brevet: niveaux.includes('3e'),
      programmes_speciaux: programmesAccessibles,
      types_cours: [
        { id: 'normal', nom: 'Programme normal', description: 'Cours selon le programme officiel' },
        { id: 'hors_programme', nom: 'Hors programme', description: 'Contenus complémentaires' },
        ...(niveaux.includes('3e') ? [{ id: 'brevet', nom: 'Spécial Brevet', description: 'Sujets et préparation brevet' }] : [])
      ]
    });

  } catch (error) {
    console.error('Erreur programmes disponibles:', error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};