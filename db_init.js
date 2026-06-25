/**
 * db_init.js - Initialisation de la base de données SQLite en mémoire (via AlaSQL)
 * Contient les données factices MGEN avec des anomalies de qualité délibérées.
 */

// Structure des données de base
const MOCK_ADHERENTS = [
    { id_adherent: 1001, nom: "Martin", prenom: "Sophie", email: "sophie.martin@mgen.fr", date_naissance: "1985-04-12", code_postal: "75015", date_inscription: "2020-01-15" },
    { id_adherent: 1002, nom: "Dupont", prenom: "Jean", email: "jean.dupont@gmail.com", date_naissance: "1972-11-23", code_postal: "92120", date_inscription: "2019-05-20" },
    { id_adherent: 1003, nom: "Lefebvre", prenom: "Marie", email: "marie.lefebvre@yahoo", date_naissance: "1990-08-30", code_postal: "59000", date_inscription: "2021-03-10" }, // Email invalide
    { id_adherent: 1004, nom: "Dubois", prenom: "Pierre", email: null, date_naissance: "1965-02-14", code_postal: "69002", date_inscription: "2018-11-01" }, // Email NULL (Golden Data AI : Critique !)
    { id_adherent: 1005, nom: "Moreau", prenom: "Thomas", email: "tmoreau@mgen.fr", date_naissance: "2030-05-12", code_postal: "44000", date_inscription: "2022-09-18" }, // Date naissance dans le futur (Anomalie)
    { id_adherent: 1006, nom: "Petit", prenom: "Lucas", email: "lucas.petit@gmail.com", date_naissance: "1998-12-05", code_postal: "1300", date_inscription: "2023-01-10" }, // Code postal incomplet (4 chiffres)
    { id_adherent: 1007, nom: "Rousseau", prenom: "Chloé", email: "chloe.rousseau@mgen.fr", date_naissance: "1992-07-22", code_postal: "33000", date_inscription: "2021-06-25" },
    { id_adherent: 1007, nom: "Rousseau", prenom: "Chloé", email: "chloe.rousseau@mgen.fr", date_naissance: "1992-07-22", code_postal: "33000", date_inscription: "2021-06-25" }, // Doublon parfait d'identifiant (Violation PK)
    { id_adherent: 1008, nom: "Bernard", prenom: "Michel", email: "michel.bernard@orange.fr", date_naissance: "1950-10-10", code_postal: "99999", date_inscription: "2015-04-12" } // Code postal inexistant mais 5 chiffres
];

const MOCK_REMBOURSEMENTS = [
    { id_remboursement: 50001, id_adherent: 1001, type_acte: "Consultation", montant_total: 25.00, montant_rembourse: 25.00, statut_traitement: "Traite", date_remboursement: "2026-06-01" },
    { id_remboursement: 50002, id_adherent: 1002, type_acte: "Optique", montant_total: 350.00, montant_rembourse: 280.00, statut_traitement: "Traite", date_remboursement: "2026-06-02" },
    { id_remboursement: 50003, id_adherent: 1003, type_acte: "Dentaire", montant_total: 120.00, montant_rembourse: 150.00, statut_traitement: "Traite", date_remboursement: "2026-06-03" }, // Remboursement > Total (Anomalie de cohérence)
    { id_remboursement: 50004, id_adherent: 1004, type_acte: "Pharmacie", montant_total: 45.50, montant_rembourse: -10.00, statut_traitement: "Traite", date_remboursement: "2026-06-04" }, // Montant négatif (Anomalie)
    { id_remboursement: 50005, id_adherent: 9999, type_acte: "Consultation", montant_total: 60.00, montant_rembourse: 42.00, statut_traitement: "Traite", date_remboursement: "2026-06-05" }, // id_adherent inexistant (Violation clé étrangère)
    { id_remboursement: 50006, id_adherent: 1006, type_acte: "Optique", montant_total: 200.00, montant_rembourse: 140.00, statut_traitement: "Traite", date_remboursement: "2026-06-06" },
    { id_remboursement: 50007, id_adherent: 1007, type_acte: "Dentaire", montant_total: 450.00, montant_rembourse: null, statut_traitement: "En attente", date_remboursement: null } // Remboursement en attente (normal d'avoir null)
];

const MOCK_PREDICTIONS_IA = [
    { id_prediction: 90001, id_remboursement: 50001, score_anomalie: 0.02, decision_ia: "Valide", confiance_modele: 0.98, date_prediction: "2026-06-01" },
    { id_prediction: 90002, id_remboursement: 50002, score_anomalie: 0.15, decision_ia: "Valide", confiance_modele: 0.85, date_prediction: "2026-06-02" },
    { id_prediction: 90003, id_remboursement: 50003, score_anomalie: 0.94, decision_ia: "Alerte", confiance_modele: 0.94, date_prediction: "2026-06-03" }, // Détecté correctement (car remboursement > total)
    { id_prediction: 90004, id_remboursement: 50004, score_anomalie: 1.50, decision_ia: "Alerte", confiance_modele: 1.20, date_prediction: "2026-06-04" }, // Score > 1 et Confiance > 1 (Anomalie de sortie IA / Bug modèle)
    { id_prediction: 90005, id_remboursement: 50005, score_anomalie: -0.10, decision_ia: "Valide", confiance_modele: 0.70, date_prediction: "2026-06-05" }, // Score négatif (Anomalie sortie IA)
    { id_prediction: 90006, id_remboursement: 50006, score_anomalie: null, decision_ia: "Inconnu", confiance_modele: null, date_prediction: "2026-06-06" } // Sortie NULL alors que l'acte est traité (Anomalie de complétude IA)
];

// Requêtes SQL prédéfinies de contrôle qualité
const SQL_QUALITY_CHECKS = [
    {
        id: "check_pk_adherents",
        titre: "1. Doublons de clés primaires (Adhérents)",
        description: "Identifie si des adhérents partagent le même identifiant (id_adherent). Une violation de clé primaire corrompt le lignage.",
        sql: "SELECT id_adherent, COUNT(*) as nb_doublons \nFROM adherents \nGROUP BY id_adherent \nHAVING COUNT(*) > 1;",
        impact: "CRITIQUE : Empêche les jointures fiables et fausse le comptage des adhérents uniques pour l'entraînement de l'IA.",
        attendu: "0 ligne retournée."
    },
    {
        id: "check_fk_remboursements",
        titre: "2. Orphelins / Clés étrangères (Remboursements)",
        description: "Recherche les remboursements liés à un identifiant adhérent inexistant dans la table de référence.",
        sql: "SELECT r.id_remboursement, r.id_adherent, r.type_acte, r.montant_total \nFROM remboursements r \nLEFT JOIN adherents a ON r.id_adherent = a.id_adherent \nWHERE a.id_adherent IS NULL;",
        impact: "CRITIQUE (Golden Data) : Ces transactions ne peuvent pas être rattachées à un profil d'adhérent. Le modèle d'IA d'analyse de comportement échouera sur ces données.",
        attendu: "0 ligne retournée."
    },
    {
        id: "check_valid_emails",
        titre: "3. Format et présence des adresses e-mail",
        description: "Recherche les adresses e-mail manquantes (NULL) ou ne respectant pas un format standard (sans '@').",
        sql: "SELECT id_adherent, nom, prenom, email \nFROM adherents \nWHERE email IS NULL OR email NOT LIKE '%@%';",
        impact: "MOYEN : Impacte les campagnes de communication et la création de clés de réconciliation de données (matching).",
        attendu: "0 ligne retournée."
    },
    {
        id: "check_coherent_amounts",
        titre: "4. Cohérence des montants de remboursement",
        description: "Détecte les anomalies de cohérence financière : remboursements négatifs ou supérieurs au montant total facturé.",
        sql: "SELECT id_remboursement, id_adherent, type_acte, montant_total, montant_rembourse \nFROM remboursements \nWHERE montant_rembourse < 0 OR montant_rembourse > montant_total;",
        impact: "CRITIQUE : Fraudes potentielles ou anomalies majeures dans les flux transactionnels alimentant l'IA.",
        attendu: "0 ligne retournée."
    },
    {
        id: "check_postal_codes",
        titre: "5. Format des codes postaux français",
        description: "Vérifie si les codes postaux font exactement 5 caractères (requis pour la segmentation géographique IA).",
        sql: "SELECT id_adherent, nom, prenom, code_postal \nFROM adherents \nWHERE LENGTH(code_postal) != 5 OR code_postal NOT LIKE '[0-9][0-9][0-9][0-9][0-9]';", // Note: AlaSQL supporte LIKE standard ou REGEXP
        alternativeSql: "SELECT id_adherent, nom, prenom, code_postal \nFROM adherents \nWHERE LENGTH(code_postal) != 5;",
        impact: "FAIBLE à MOYEN : Empêche la géolocalisation correcte de l'adhérent dans les modèles prédictifs régionaux.",
        attendu: "0 ligne retournée."
    },
    {
        id: "check_ai_outputs",
        titre: "6. Qualité des sorties de l'IA (Scores hors limites)",
        description: "Identifie si le modèle d'IA produit des scores de probabilité aberrants (hors de l'intervalle [0, 1]) ou des valeurs nulles.",
        sql: "SELECT id_prediction, id_remboursement, score_anomalie, decision_ia \nFROM predictions_ia \nWHERE score_anomalie < 0 OR score_anomalie > 1 OR score_anomalie IS NULL;",
        impact: "HAUT : Indique un dysfonctionnement du modèle prédictif ou un bug d'exportation vers la base analytique.",
        attendu: "0 ligne retournée."
    }
];

// Fonction d'initialisation de la base de données
function initDatabase() {
    try {
        // Supprime les tables si elles existent
        try { alasql('DROP TABLE IF EXISTS adherents'); } catch(e){}
        try { alasql('DROP TABLE IF EXISTS remboursements'); } catch(e){}
        try { alasql('DROP TABLE IF EXISTS predictions_ia'); } catch(e){}

        // Création des tables
        alasql('CREATE TABLE adherents (id_adherent INT, nom STRING, prenom STRING, email STRING, date_naissance STRING, code_postal STRING, date_inscription STRING)');
        alasql('CREATE TABLE remboursements (id_remboursement INT, id_adherent INT, type_acte STRING, montant_total DOUBLE, montant_rembourse DOUBLE, statut_traitement STRING, date_remboursement STRING)');
        alasql('CREATE TABLE predictions_ia (id_prediction INT, id_remboursement INT, score_anomalie DOUBLE, decision_ia STRING, confiance_modele DOUBLE, date_prediction STRING)');

        // Insertion des données
        MOCK_ADHERENTS.forEach(row => {
            alasql('INSERT INTO adherents VALUES (?,?,?,?,?,?,?)', [row.id_adherent, row.nom, row.prenom, row.email, row.date_naissance, row.code_postal, row.date_inscription]);
        });

        MOCK_REMBOURSEMENTS.forEach(row => {
            alasql('INSERT INTO remboursements VALUES (?,?,?,?,?,?,?)', [row.id_remboursement, row.id_adherent, row.type_acte, row.montant_total, row.montant_rembourse, row.statut_traitement, row.date_remboursement]);
        });

        MOCK_PREDICTIONS_IA.forEach(row => {
            alasql('INSERT INTO predictions_ia VALUES (?,?,?,?,?,?)', [row.id_prediction, row.id_remboursement, row.score_anomalie, row.decision_ia, row.confiance_modele, row.date_prediction]);
        });

        console.log("Base de données AlaSQL initialisée avec succès !");
        return true;
    } catch (error) {
        console.error("Erreur lors de l'initialisation de la base de données :", error);
        return false;
    }
}
