const bcrypt = require("bcrypt");
const Professeur = require("./models/Professeur");

(async () => {
  const hash = await bcrypt.hash("StEx2526", 10); // mot de passe générique
  await Professeur.create({
    nom: "Jean Dupont",
    email: "jean.dupont@college.fr",
    mot_de_passe: hash,
    matiere: "Mathématiques"
  });
  console.log("Professeur créé !");
})();
