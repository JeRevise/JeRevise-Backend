const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Professeur = sequelize.define("Professeur", {
  nom: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, unique: true, allowNull: false },
  mot_de_passe: { type: DataTypes.STRING, allowNull: false },
  matiere: { type: DataTypes.STRING, allowNull: false }
}, {
  freezeTableName: true, // utilise exactement le nom de la table
  timestamps: false      // désactive createdAt / updatedAt automatiques
});

module.exports = Professeur;
