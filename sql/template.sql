-- Création de la base de données
CREATE DATABASE IF NOT EXISTS je_revise;
USE je_revise;

-- Table Professeurs
CREATE TABLE IF NOT EXISTS professeurs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    mot_de_passe VARCHAR(255) NOT NULL,
    matiere VARCHAR(50) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table Élèves
CREATE TABLE IF NOT EXISTS eleves (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    classe VARCHAR(10) NOT NULL,
    photo_url TEXT,
    token_cas TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table Cours
CREATE TABLE IF NOT EXISTS cours (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titre VARCHAR(255) NOT NULL,
    matiere VARCHAR(50) NOT NULL,
    chapitre VARCHAR(100) NOT NULL,
    fichier_url TEXT,
    texte_ocr LONGTEXT,
    id_professeur INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_professeur) REFERENCES professeurs(id) ON DELETE CASCADE
);

-- Table QCM
CREATE TABLE IF NOT EXISTS qcm (
    id INT AUTO_INCREMENT PRIMARY KEY,
    question TEXT NOT NULL,
    reponse_1 TEXT NOT NULL,
    reponse_2 TEXT NOT NULL,
    reponse_3 TEXT NOT NULL,
    reponse_4 TEXT NOT NULL,
    bonne_reponse INT NOT NULL CHECK (bonne_reponse BETWEEN 1 AND 4),
    id_chapitre VARCHAR(100) NOT NULL,
    id_professeur INT,
    valide BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_professeur) REFERENCES professeurs(id) ON DELETE SET NULL
);

-- Table Scores / Progression
CREATE TABLE IF NOT EXISTS scores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_eleve INT NOT NULL,
    id_qcm INT NOT NULL,
    reponse INT NOT NULL CHECK (reponse BETWEEN 1 AND 4),
    correcte BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_eleve) REFERENCES eleves(id) ON DELETE CASCADE,
    FOREIGN KEY (id_qcm) REFERENCES qcm(id) ON DELETE CASCADE
);

-- Table Professeurs ↔ Élèves (relation N:N)
CREATE TABLE IF NOT EXISTS prof_eleve (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_professeur INT NOT NULL,
    id_eleve INT NOT NULL,
    FOREIGN KEY (id_professeur) REFERENCES professeurs(id) ON DELETE CASCADE,
    FOREIGN KEY (id_eleve) REFERENCES eleves(id) ON DELETE CASCADE,
    UNIQUE KEY unique_relation (id_professeur, id_eleve)
);
