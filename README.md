![JeRevise - Plateforme de révision pour les collèges](https://raw.githubusercontent.com/JeRevise/JeRevise/refs/heads/main/svgviewer-png-output.png)

# JeRevise Backend

Ce dépôt contient le **backend Node.js** de la plateforme open source **JeRevise**, une plateforme de révision pour les collèges.

Le backend gère toute la logique serveur, les bases de données, l’authentification et l’API pour le front-end.

---

## 🏗 Fonctionnalités principales

- **Gestion des professeurs et élèves** :  
  - Création, mise à jour et suppression de comptes.  
  - Gestion des matières et des chapitres associés.  

- **Authentification** :  
  - CAS Mon ENT Occitanie pour les élèves.  
  - Accès sécurisé pour les professeurs via mot de passe unique (configurable).  

- **Cours et QCM** :  
  - Import de fichiers PDF ou images.  
  - OCR pour extraction automatique du texte.  
  - Génération automatique de QCM via IA avec validation par le professeur.  

- **Suivi et statistiques** :  
  - Dashboard des professeurs pour suivre les chapitres et les performances des élèves.  
  - Suivi des scores et lacunes des élèves pour révision ciblée.  

- **API REST** :  
  - Routes pour le front-end Node.js.  
  - Intégration multi-académies possible grâce à des instances locales.  

---

## 🚀 Installation

1. Cloner le dépôt :
```code
git clone https://github.com/JeRevise/JeRevise-Backend.git
```
2. Installer les dépendances :
```code
npm install
```
3. Configurer les variables d’environnement :  
- Base de données (MySQL/PostgreSQL)  
- Mot de passe professeur générique  
- Clés pour OCR et IA  
4. Lancer le serveur :
```code
npm start
```

---

## 📄 Organisation du code

- **models/** : Modèles de données pour la base (élèves, profs, cours, QCM, scores).  
- **routes/** : Routes API pour front-end et intégrations externes (CAS, Pronote).  
- **controllers/** : Logique métier pour gérer les actions et traitements.  
- **utils/** : Scripts utilitaires pour OCR, IA et autres traitements.  

---

## 🔒 Sécurité

- Les tokens CAS et les mots de passe professeurs sont chiffrés.  
- Les données restent sur les serveurs locaux pour respecter le RGPD.  
- Les questions générées par IA doivent être validées par le professeur avant publication.

---

## 💡 Contribution

Le projet est **open source**. Toute contribution est bienvenue :  
- Ajout de fonctionnalités  
- Amélioration de l’OCR ou de l’IA  
- Optimisation du code backend et des performances  
- Correction de bugs  

Merci de lire le guide de contribution dans le dépôt [Docs](https://github.com/JeRevise/Docs) avant de proposer vos modifications.

---

## 📄 Licence

MIT License. Vous pouvez utiliser, modifier et distribuer le projet en conservant la mention des auteurs et de la licence.
