const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const ProgrammeSpecial = sequelize.define("ProgrammeSpecial", {
  nom: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  accessible_niveaux: { type: DataTypes.JSON },
  actif: { type: DataTypes.BOOLEAN, defaultValue: true }
}, {
  tableName: "programmes_speciaux",
  timestamps: false
});

module.exports = ProgrammeSpecial;