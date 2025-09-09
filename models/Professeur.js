const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Professeur = sequelize.define("Professeur", {
  nom: { type: DataTypes.STRING, allowNull: false },
  prenom: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, unique: true, allowNull: false },
  mot_de_passe: { type: DataTypes.STRING, allowNull: false },
  code_activation: { type: DataTypes.STRING(20), allowNull: false },
  premiere_connexion: { type: DataTypes.BOOLEAN, defaultValue: true }
}, {
  tableName: "professeurs",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at"
});

module.exports = Professeur;