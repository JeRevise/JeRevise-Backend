const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Matiere = sequelize.define("Matiere", {
  nom: { type: DataTypes.STRING, allowNull: false }
}, {
  tableName: "matieres",
  timestamps: false
});

module.exports = Matiere;