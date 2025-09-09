const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// Initialiser Gemini avec la clé API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.genererQCM = async (texte, nombreQuestions = 5) => {
  try {
    // Validation des entrées
    if (!texte || texte.trim().length < 50) {
      throw new Error('Le texte fourni est trop court pour générer des QCM');
    }

    if (nombreQuestions < 1 || nombreQuestions > 10) {
      throw new Error('Le nombre de questions doit être entre 1 et 10');
    }

    // Obtenir le modèle Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
Tu es un assistant pédagogique expert. À partir du texte de cours fourni, génère exactement ${nombreQuestions} questions à choix multiples (QCM) de niveau collège.

CONTRAINTES IMPORTANTES :
- Chaque question doit porter sur des éléments EXPLICITEMENT mentionnés dans le texte
- Évite les questions trop évidentes ou trop difficiles
- Les mauvaises réponses doivent être plausibles mais clairement incorrectes
- Varie les types de questions (définition, compréhension, application)
- Utilise un langage adapté au niveau collège

FORMAT DE RÉPONSE OBLIGATOIRE - RESPECTE EXACTEMENT CE JSON :
{
  "qcm": [
    {
      "question": "Texte de la question ?",
      "reponse_1": "Première option",
      "reponse_2": "Deuxième option", 
      "reponse_3": "Troisième option",
      "reponse_4": "Quatrième option",
      "bonne_reponse": 1
    }
  ]
}

TEXTE DU COURS :
${texte}

Génère maintenant ${nombreQuestions} questions en respectant exactement le format JSON ci-dessus :`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();

    // Nettoyer la réponse pour extraire le JSON
    let jsonResponse;
    try {
      // Chercher le JSON dans la réponse
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Format JSON non trouvé dans la réponse');
      }
      
      jsonResponse = JSON.parse(jsonMatch[0]);
      
      // Valider la structure de la réponse
      if (!jsonResponse.qcm || !Array.isArray(jsonResponse.qcm)) {
        throw new Error('Structure de réponse invalide');
      }

      // Valider chaque question
      for (let i = 0; i < jsonResponse.qcm.length; i++) {
        const q = jsonResponse.qcm[i];
        if (!q.question || !q.reponse_1 || !q.reponse_2 || !q.reponse_3 || !q.reponse_4) {
          throw new Error(`Question ${i + 1}: champs manquants`);
        }
        if (!q.bonne_reponse || q.bonne_reponse < 1 || q.bonne_reponse > 4) {
          throw new Error(`Question ${i + 1}: bonne_reponse doit être entre 1 et 4`);
        }
      }

      return jsonResponse.qcm;

    } catch (parseError) {
      console.error('Erreur parsing JSON:', parseError);
      console.error('Réponse brute de Gemini:', responseText);
      
      // En cas d'erreur de parsing, retourner des questions par défaut
      return generateFallbackQCM(nombreQuestions);
    }

  } catch (error) {
    console.error('Erreur génération QCM avec Gemini:', error);
    
    // En cas d'erreur API, retourner des questions par défaut
    return generateFallbackQCM(nombreQuestions);
  }
};

// Fonction de secours en cas d'erreur
function generateFallbackQCM(nombreQuestions) {
  const fallbackQuestions = [];
  
  for (let i = 1; i <= nombreQuestions; i++) {
    fallbackQuestions.push({
      question: `Question générée automatiquement ${i} (mode secours)`,
      reponse_1: "Réponse A",
      reponse_2: "Réponse B", 
      reponse_3: "Réponse C",
      reponse_4: "Réponse D",
      bonne_reponse: 1
    });
  }
  
  return fallbackQuestions;
}

// Fonction pour extraire le titre du cours depuis le texte
exports.extraireTitreCours = async (texte) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `
À partir du texte de cours suivant, propose un titre court et pertinent (maximum 60 caractères) qui résume le contenu principal.

Le titre doit être :
- Clair et précis
- Adapté au niveau collège
- Sans ponctuation finale
- Représentatif du contenu

TEXTE :
${texte.substring(0, 1000)}...

Réponds uniquement avec le titre proposé, sans guillemets ni commentaires :`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const titre = response.text().trim();
    
    // Nettoyer et valider le titre
    const titreNettoye = titre
      .replace(/["""]/g, '')
      .replace(/^Titre\s*:\s*/i, '')
      .substring(0, 60)
      .trim();
    
    return titreNettoye || "Cours sans titre";
    
  } catch (error) {
    console.error('Erreur extraction titre:', error);
    return "Cours sans titre";
  }
};