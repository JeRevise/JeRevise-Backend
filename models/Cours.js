const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Cours = sequelize.define("Cours", {
  titre: { type: DataTypes.STRING, allowNull: false },
  matiere: { type: DataTypes.STRING, allowNull: false },
  chapitre: { type: DataTypes.STRING, allowNull: false },
  fichier_url: { type: DataTypes.TEXT },
  texte_ocr: { type: DataTypes.TEXT },
  id_professeur: { type: DataTypes.INTEGER, allowNull: false }
}, {
  tableName: "cours",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at"
});

module.exports = Cours;