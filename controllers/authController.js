const Professeur = require("../models/Professeur");
const Eleve = require("../models/Eleve");
const Classe = require("../models/Classe");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

exports.loginProfesseur = async (req, res) => {
  try {
    const { email, mot_de_passe } = req.body;

    // Vérifier si le prof existe
    const prof = await Professeur.findOne({ where: { email } });
    if (!prof) return res.status(404).json({ message: "Professeur non trouvé" });

    // Vérifier le mot de passe
    const validPassword = await bcrypt.compare(mot_de_passe, prof.mot_de_passe);
    if (!validPassword) return res.status(401).json({ message: "Mot de passe incorrect" });

    // Générer token JWT
    const token = jwt.sign(
      { id: prof.id, email: prof.email },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({ token, nom: prof.nom, matiere: prof.matiere });
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