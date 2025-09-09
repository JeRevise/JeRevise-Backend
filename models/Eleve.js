const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Classe = require("./Classe");

const Eleve = sequelize.define("Eleve", {
  prenom: { type: DataTypes.STRING, allowNull: false },
  nom: { type: DataTypes.STRING, allowNull: false },
  identifiant: { type: DataTypes.STRING, unique: true, allowNull: false },
  mot_de_passe: { type: DataTypes.STRING, allowNull: false },
  first_login: { type: DataTypes.BOOLEAN, defaultValue: true }
}, {
  tableName: "eleves",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at"
});

// Relation élève → classe
Eleve.belongsTo(Classe, { foreignKey: "classe_id" });

module.exports = Eleve;
