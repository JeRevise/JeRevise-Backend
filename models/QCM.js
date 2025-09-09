const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const QCM = sequelize.define("QCM", {
  question: { type: DataTypes.TEXT, allowNull: false },
  reponse_1: { type: DataTypes.TEXT, allowNull: false },
  reponse_2: { type: DataTypes.TEXT, allowNull: false },
  reponse_3: { type: DataTypes.TEXT, allowNull: false },
  reponse_4: { type: DataTypes.TEXT, allowNull: false },
  bonne_reponse: { 
    type: DataTypes.INTEGER, 
    allowNull: false,
    validate: { min: 1, max: 4 }
  },
  id_chapitre: { type: DataTypes.STRING, allowNull: false },
  id_professeur: { type: DataTypes.INTEGER, allowNull: true },
  valide: { type: DataTypes.BOOLEAN, defaultValue: false }
}, {
  tableName: "qcm",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at"
});

module.exports = QCM;