const Tesseract = require('tesseract.js');
const pdf = require('pdf-parse');
const fs = require('fs');
const path = require('path');

// Extraction de texte depuis une image
exports.extraireTexteImage = async (cheminFichier) => {
  try {
    // Vérifier que le fichier existe
    if (!fs.existsSync(cheminFichier)) {
      throw new Error(`Fichier non trouvé: ${cheminFichier}`);
    }

    console.log(`Début OCR pour: ${cheminFichier}`);
    
    const { data: { text, confidence } } = await Tesseract.recognize(cheminFichier, 'fra', {
      logger: m => {
        if (m.status === 'recognizing text') {
          console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      }
    });

    console.log(`OCR terminé. Confiance: ${Math.round(confidence)}%`);
    
    // Si la confiance est trop faible, on avertit
    if (confidence < 60) {
      console.warn(`Attention: confiance OCR faible (${Math.round(confidence)}%). Le texte peut contenir des erreurs.`);
    }

    // Nettoyer et formater le texte extrait
    const texteNettoye = nettoyerTexteOCR(text);
    
    return texteNettoye;
  } catch (error) {
    console.error('Erreur OCR image:', error);
    throw new Error(`Impossible d'extraire le texte de l'image: ${error.message}`);
  }
};

// Extraction de texte depuis un PDF
exports.extraireTextePDF = async (cheminFichier) => {
  try {
    // Vérifier que le fichier existe
    if (!fs.existsSync(cheminFichier)) {
      throw new Error(`Fichier PDF non trouvé: ${cheminFichier}`);
    }

    console.log(`Début extraction PDF: ${cheminFichier}`);
    
    // Lire le fichier PDF
    const dataBuffer = fs.readFileSync(cheminFichier);
    
    // Extraire le texte avec pdf-parse
    const pdfData = await pdf(dataBuffer, {
      // Options pour améliorer l'extraction
      max: 0, // Pas de limite de pages
      version: 'v1.10.100' // Version stable
    });

    let texteExtrait = pdfData.text;
    
    // Si le PDF contient peu de texte, il peut s'agir d'un PDF scanné
    if (!texteExtrait || texteExtrait.trim().length < 50) {
      console.log('PDF contient peu de texte, tentative de conversion en images + OCR...');
      
      // Fallback: convertir PDF en images puis OCR
      texteExtrait = await extraireTextePDFAvecOCR(cheminFichier);
    }

    console.log(`PDF traité. Texte extrait: ${texteExtrait.length} caractères`);
    
    // Nettoyer le texte extrait
    const texteNettoye = nettoyerTextePDF(texteExtrait);
    
    return texteNettoye;
    
  } catch (error) {
    console.error('Erreur extraction PDF:', error);
    throw new Error(`Impossible d'extraire le texte du PDF: ${error.message}`);
  }
};

// Fonction helper pour traiter les PDFs scannés avec OCR
async function extraireTextePDFAvecOCR(cheminFichier) {
  try {
    // Note: Cette fonction nécessiterait pdf2pic pour convertir PDF en images
    // Pour une implémentation plus simple, on retourne un message d'erreur explicite
    throw new Error('PDF scanné détecté. Pour traiter les PDFs scannés, veuillez d\'abord les convertir en images JPG/PNG.');
    
    /* Implémentation complète avec pdf2pic (optionnelle):
    const pdf2pic = require("pdf2pic");
    
    const convert = pdf2pic.fromPath(cheminFichier, {
      density: 300,           // DPI élevé pour meilleure qualité OCR
      saveFilename: "page",
      savePath: "./temp/",
      format: "png",
      width: 2480,           // Largeur élevée pour meilleure qualité
      height: 3508
    });

    const results = await convert.bulk(-1); // Convertir toutes les pages
    let texteComplet = "";

    for (const result of results) {
      const texteImage = await exports.extraireTexteImage(result.path);
      texteComplet += texteImage + "\n\n";
      
      // Supprimer le fichier temporaire
      fs.unlinkSync(result.path);
    }

    return texteComplet;
    */
    
  } catch (error) {
    console.error('Erreur OCR PDF scanné:', error);
    return ""; // Retourner chaîne vide plutôt que de faire échouer
  }
}

// Fonction pour nettoyer le texte extrait par OCR
function nettoyerTexteOCR(texte) {
  if (!texte) return "";
  
  return texte
    // Supprimer les caractères de contrôle
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Corriger les espaces multiples
    .replace(/\s+/g, ' ')
    // Corriger les sauts de ligne multiples
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    // Supprimer les espaces en début/fin
    .trim()
    // Corriger quelques erreurs OCR communes
    .replace(/([a-z])([A-Z])/g, '$1 $2') // Mots collés
    .replace(/(\d)([A-Za-z])/g, '$1 $2') // Chiffres collés aux lettres
    .replace(/([A-Za-z])(\d)/g, '$1 $2') // Lettres collées aux chiffres
    // Corriger la ponctuation
    .replace(/\s+([,.!?;:])/g, '$1')
    .replace(/([,.!?;:])\s*([a-zA-Z])/g, '$1 $2');
}

// Fonction pour nettoyer le texte extrait depuis PDF
function nettoyerTextePDF(texte) {
  if (!texte) return "";
  
  return texte
    // Supprimer les caractères Unicode problématiques
    .replace(/[\uFFFD\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    // Corriger les sauts de ligne dans les paragraphes
    .replace(/([a-z])\n([a-z])/g, '$1 $2')
    // Nettoyer les espaces multiples
    .replace(/\s+/g, ' ')
    // Corriger les sauts de ligne multiples
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    // Supprimer les en-têtes/pieds de page répétitifs (basique)
    .replace(/Page \d+.*?\n/g, '')
    .replace(/\d+\s*\n/g, '\n')
    // Trim final
    .trim();
}

// Fonction utilitaire pour valider un fichier avant traitement
exports.validerFichier = (cheminFichier) => {
  try {
    if (!fs.existsSync(cheminFichier)) {
      return { valide: false, erreur: "Fichier non trouvé" };
    }

    const extension = path.extname(cheminFichier).toLowerCase();
    const extensionsValides = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.pdf'];
    
    if (!extensionsValides.includes(extension)) {
      return { 
        valide: false, 
        erreur: `Extension non supportée: ${extension}. Extensions autorisées: ${extensionsValides.join(', ')}` 
      };
    }

    const stats = fs.statSync(cheminFichier);
    const tailleMo = stats.size / (1024 * 1024);
    
    if (tailleMo > 500) { // Limite de 50 Mo
      return { 
        valide: false, 
        erreur: `Fichier trop volumineux: ${tailleMo.toFixed(2)} Mo. Limite: 500 Mo` 
      };
    }

    return { valide: true };
    
  } catch (error) {
    return { valide: false, erreur: `Erreur validation: ${error.message}` };
  }
};

// Fonction principale qui détermine le type et traite le fichier
exports.extraireTexte = async (cheminFichier) => {
  try {
    // Valider le fichier
    const validation = exports.validerFichier(cheminFichier);
    if (!validation.valide) {
      throw new Error(validation.erreur);
    }

    const extension = path.extname(cheminFichier).toLowerCase();
    
    if (extension === '.pdf') {
      return await exports.extraireTextePDF(cheminFichier);
    } else {
      return await exports.extraireTexteImage(cheminFichier);
    }
    
  } catch (error) {
    console.error('Erreur extraction texte:', error);
    throw error;
  }
};