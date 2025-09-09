const Tesseract = require('tesseract.js');
const fs = require('fs');

exports.extraireTexteImage = async (cheminFichier) => {
  try {
    const { data: { text } } = await Tesseract.recognize(cheminFichier, 'fra');
    return text.trim();
  } catch (error) {
    console.error('Erreur OCR:', error);
    throw error;
  }
};

exports.extraireTextePDF = async (cheminFichier) => {
  // À implémenter avec pdf-parse ou pdf2pic + OCR
  // Pour l'instant, retourne une chaîne vide
  return "";
};