const jwt = require("jsonwebtoken");
require("dotenv").config();

exports.verifyProfToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ message: "Token manquant" });

  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Token invalide" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "professeur") return res.status(403).json({ message: "Accès interdit" });
    req.professeur = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ message: "Token expiré ou invalide" });
  }
};

exports.verifyEleveToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ message: "Token manquant" });

  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Token invalide" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "eleve") return res.status(403).json({ message: "Accès interdit" });
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ message: "Token expiré ou invalide" });
  }
};
