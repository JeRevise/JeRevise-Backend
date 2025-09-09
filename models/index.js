const Score = require('./Score');
const QCM = require('./QCM');
const Eleve = require('./Eleve');

// Relations
Score.belongsTo(QCM, { foreignKey: 'id_qcm' });
Score.belongsTo(Eleve, { foreignKey: 'id_eleve' });
QCM.hasMany(Score, { foreignKey: 'id_qcm' });
Eleve.hasMany(Score, { foreignKey: 'id_eleve' });

module.exports = { Score, QCM, Eleve };