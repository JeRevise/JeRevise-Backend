const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Classe = sequelize.define("Classe", {
  niveau: { type: DataTypes.ENUM("6e", "5e", "4e", "3e"), allowNull: false },
  nom: { type: DataTypes.STRING, allowNull: false }
}, {
  tableName: "classes",
  timestamps: false
});

module.exports = Classe;
