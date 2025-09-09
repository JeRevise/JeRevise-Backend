const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Score = sequelize.define("Score", {
  id_eleve: { type: DataTypes.INTEGER, allowNull: false },
  id_qcm: { type: DataTypes.INTEGER, allowNull: false },
  reponse: { 
    type: DataTypes.INTEGER, 
    allowNull: false,
    validate: { min: 1, max: 4 }
  },
  correcte: { type: DataTypes.BOOLEAN, defaultValue: false },
  temps_reponse: { type: DataTypes.INTEGER, defaultValue: null } // en secondes
}, {
  tableName: "scores",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: false
});

module.exports = Score;