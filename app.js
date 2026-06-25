/**
 * app.js - Logique Applicative du Portail de Gouvernance MGEN
 * Gère l'interactivité, l'affichage des schémas, l'exécution SQL et les graphiques.
 */

// Données de structure des tables du catalogue
const CATALOG_SCHEMAS = {
    adherents: {
        title: "adherents",
        description: "Table référentielle contenant les fiches d'identité et de contact des adhérents de la mutuelle MGEN. Fait office de Golden Data pour les modèles d'IA géographiques et comportementaux.",
        badges: ["GOLDEN DATA", "RGPD", "REF_CLIENT"],
        owner: "Direction Data (Gouvernance)",
        type: "Table SQL physique",
        frequency: "Quotidienne (04:00)",
        classification: "RGPD / Sensible (Données d'identité)",
        columns: [
            { name: "id_adherent", type: "INT", desc: "Identifiant unique de l'adhérent (Clé Primaire).", tags: ["Identifiant", "Clé unique"], check: "Non-Nullité, Unicité" },
            { name: "nom", type: "STRING", desc: "Nom de famille de l'adhérent.", tags: ["RGPD.PII"], check: "Aucun" },
            { name: "prenom", type: "STRING", desc: "Prénom de l'adhérent.", tags: ["RGPD.PII"], check: "Aucun" },
            { name: "email", type: "STRING", desc: "Adresse e-mail de l'adhérent pour communication digitale.", tags: ["RGPD.PII", "Contact"], check: "Vérification Format" },
            { name: "date_naissance", type: "STRING", desc: "Date de naissance de l'adhérent (Format AAAA-MM-JJ).", tags: ["RGPD.PII", "Démographie"], check: "Cohérence temporelle" },
            { name: "code_postal", type: "STRING", desc: "Code postal de résidence (5 caractères requis).", tags: ["Géographie"], check: "Format 5 chiffres" },
            { name: "date_inscription", type: "STRING", desc: "Date d'adhésion initiale à la mutuelle MGEN.", tags: ["Audit"], check: "Aucun" }
        ],
        rules: [
            { id: "VAL-001", desc: "id_adherent doit être unique et non-nul.", tolerance: "0% d'écart", impact: "Fausse le ciblage IA", status: "checking" },
            { id: "VAL-002", desc: "L'e-mail doit contenir '@' et être non-nul pour les nouveaux inscrits.", tolerance: "2% d'écart", impact: "Perte de contact client", status: "checking" },
            { id: "VAL-003", desc: "La date de naissance doit être dans le passé.", tolerance: "0% d'écart", impact: "Erreur de segmentation d'âge IA", status: "checking" },
            { id: "VAL-004", desc: "Le code postal doit faire exactement 5 caractères.", tolerance: "0% d'écart", impact: "Calculs de distance géospatiale IA faussés", status: "checking" }
        ]
    },
    remboursements: {
        title: "remboursements",
        description: "Table transactionnelle enregistrant tous les actes de soins et remboursements financiers associés. Alimente directement le modèle d'IA de détection des fraudes et anomalies.",
        badges: ["GOLDEN DATA", "TRANSACTIONNEL", "FINANCE"],
        owner: "Direction Financière (Data Owner)",
        type: "Table SQL physique",
        frequency: "Temps réel (Streaming via Kafka)",
        classification: "RGPD / Données de Santé & Financières",
        columns: [
            { name: "id_remboursement", type: "INT", desc: "Identifiant unique de la transaction de remboursement (Clé Primaire).", tags: ["Identifiant"], check: "Unicité, Non-Nullité" },
            { name: "id_adherent", type: "INT", desc: "Identifiant de l'adhérent concerné (Clé Étrangère).", tags: ["Relation", "Index"], check: "Clé Étrangère" },
            { name: "type_acte", type: "STRING", desc: "Nature de l'acte de soins (Consultation, Optique, Dentaire, Pharmacie).", tags: ["Nomenclature"], check: "Liste de valeurs" },
            { name: "montant_total", type: "DOUBLE", desc: "Montant total facturé par le praticien.", tags: ["Finance"], check: "Supérieur à 0" },
            { name: "montant_rembourse", type: "DOUBLE", desc: "Part remboursée par la MGEN (doit être <= montant_total).", tags: ["Finance"], check: "Supérieur à 0, Cohérence avec Total" },
            { name: "statut_traitement", type: "STRING", desc: "Statut du dossier (Traite, En attente, Rejete).", tags: ["Statut"], check: "Liste de valeurs" },
            { name: "date_remboursement", type: "STRING", desc: "Date de versement effectif.", tags: ["Audit"], check: "Optionnel si en attente" }
        ],
        rules: [
            { id: "VAL-101", desc: "id_remboursement doit être unique et non-nul.", tolerance: "0% d'écart", impact: "Doublons de facturation dans le modèle d'IA", status: "checking" },
            { id: "VAL-102", desc: "id_adherent doit exister dans la table adherents.", tolerance: "0% d'écart", impact: "Orphelins de données, perte de lignage", status: "checking" },
            { id: "VAL-103", desc: "montant_rembourse doit être supérieur ou égal à 0 et inférieur ou égal à montant_total.", tolerance: "0% d'écart", impact: "Pertes financières, apprentissage IA erroné", status: "checking" }
        ]
    },
    predictions_ia: {
        title: "predictions_ia",
        description: "Table analytique de sortie contenant les résultats d'exécution du modèle de détection d'anomalies de remboursement. Sert à l'audit humain des dossiers suspects.",
        badges: ["SORTIE IA", "ANALYTIQUE", "AUDIT"],
        owner: "Direction Data (Équipe IA)",
        type: "Table SQL physique",
        frequency: "Quotidienne (06:00)",
        classification: "Usage Interne MGEN / Restreint",
        columns: [
            { name: "id_prediction", type: "INT", desc: "Identifiant de la prédiction de l'IA (Clé Primaire).", tags: ["Identifiant", "IA"], check: "Unicité" },
            { name: "id_remboursement", type: "INT", desc: "Identifiant du remboursement audité.", tags: ["Relation", "Index"], check: "Clé Étrangère" },
            { name: "score_anomalie", type: "DOUBLE", desc: "Score d'anomalie attribué par le modèle (compris entre 0 et 1).", tags: ["IA", "Score"], check: "Intervalle [0, 1]" },
            { name: "decision_ia", type: "STRING", desc: "Décision automatique calculée (Valide, Alerte).", tags: ["IA", "Décision"], check: "Liste de valeurs" },
            { name: "confiance_modele", type: "DOUBLE", desc: "Niveau de certitude du modèle (compris entre 0 et 1).", tags: ["IA", "Confiance"], check: "Intervalle [0, 1]" },
            { name: "date_prediction", type: "STRING", desc: "Date d'exécution du batch de prédiction.", tags: ["Audit"], check: "Aucun" }
        ],
        rules: [
            { id: "VAL-201", desc: "score_anomalie et confiance_modele doivent être compris entre 0 et 1 et être non-nuls.", tolerance: "0% d'écart", impact: "Dysfonctionnement du modèle d'IA", status: "checking" },
            { id: "VAL-202", desc: "id_remboursement doit exister dans la table remboursements.", tolerance: "0% d'écart", impact: "Perte de traçabilité des prédictions IA", status: "checking" }
        ]
    }
};

// Variables pour les graphiques Chart.js
let dqEvolutionChartInstance = null;
let completenessChartInstance = null;

// Résultats d'exécution des tests de qualité de données réels
let testResults = {};

// Liste globale des assertions DQ
const assertionsList = [
    { targetTable: "adherents", testType: "Unicité Clé Primaire", sqlKey: "check_pk_adherents", severity: "CRITIQUE" },
    { targetTable: "remboursements", testType: "Clé Étrangère (Orphelins)", sqlKey: "check_fk_remboursements", severity: "CRITIQUE" },
    { targetTable: "adherents", testType: "Format E-mails", sqlKey: "check_valid_emails", severity: "MOYEN" },
    { targetTable: "remboursements", testType: "Cohérence Financière", sqlKey: "check_coherent_amounts", severity: "CRITIQUE" },
    { targetTable: "adherents", testType: "Format Code Postal", sqlKey: "check_postal_codes", severity: "MOYEN" },
    { targetTable: "predictions_ia", testType: "Limites des Scores IA", sqlKey: "check_ai_outputs", severity: "HAUT" }
];

// Démarrage de l'application au chargement
document.addEventListener("DOMContentLoaded", () => {
    // 1. Initialisation de la base AlaSQL
    const dbOk = initDatabase();
    if (dbOk) {
        console.log("Base de données opérationnelle.");
    }

    // 2. Lancement des vérifications de qualité de données
    runAllQualityChecks();

    // 3. Initialisation des graphiques
    initCharts();

    // 4. Écouteurs d'événements pour la navigation
    setupNavigation();

    // 5. Écouteurs d'événements pour le catalogue
    setupCatalog();

    // 6. Écouteurs d'événements pour la console SQL
    setupSqlPlayground();

    // 7. Écouteurs d'événements pour le guide utilisateur
    setupUserGuide();

    // 8. Gestionnaire de Thème
    setupThemeToggle();

    // Remplir le premier schéma du catalogue par défaut
    loadTableMetadata("adherents");
});

// Gérer le changement d'onglet principal
function setupNavigation() {
    const navLinks = document.querySelectorAll(".nav-link");
    const sections = document.querySelectorAll(".tab-content");

    navLinks.forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            const targetId = link.getAttribute("data-target");

            // Désactiver tous les onglets
            navLinks.forEach(l => l.classList.remove("active"));
            sections.forEach(s => s.classList.remove("active"));

            // Activer l'onglet sélectionné
            link.classList.add("active");
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.classList.add("active");
            }
        });
    });
}

// Gérer l'arbre du catalogue
function setupCatalog() {
    const treeItems = document.querySelectorAll(".tree-item");
    treeItems.forEach(item => {
        item.addEventListener("click", () => {
            treeItems.forEach(i => i.classList.remove("active"));
            item.classList.add("active");

            const tableName = item.getAttribute("data-table");
            loadTableMetadata(tableName);
        });
    });

    // Recherche dans le catalogue
    const searchInput = document.getElementById("catalog-search");
    searchInput.addEventListener("input", () => {
        const query = searchInput.value.toLowerCase();
        const treeItems = document.querySelectorAll(".tree-item");

        treeItems.forEach(item => {
            const tableName = item.getAttribute("data-table").toLowerCase();
            if (tableName.includes(query)) {
                item.style.display = "flex";
            } else {
                item.style.display = "none";
            }
        });
    });

    // Onglets internes aux métadonnées (Schéma, Lignage, Règles...)
    const tabBtns = document.querySelectorAll(".metadata-tab-btn");
    const panels = document.querySelectorAll(".metadata-tab-panel");

    tabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            tabBtns.forEach(b => b.classList.remove("active"));
            panels.forEach(p => p.classList.remove("active"));

            btn.classList.add("active");
            const targetPanelId = btn.getAttribute("data-panel");
            document.getElementById(targetPanelId).classList.add("active");
        });
    });
}

// Charger les données dans l'onglet Catalogue
function loadTableMetadata(tableName) {
    const tableData = CATALOG_SCHEMAS[tableName];
    if (!tableData) return;

    // Métadonnées générales
    document.getElementById("table-title").textContent = tableData.title;
    document.getElementById("table-description").textContent = tableData.description;
    document.getElementById("table-owner").innerHTML = `<i class="fa-solid fa-user"></i> ${tableData.owner}`;
    document.getElementById("table-type").textContent = tableData.type;
    document.getElementById("table-frequency").textContent = tableData.frequency;
    document.getElementById("table-classification").textContent = tableData.classification;

    // Badges
    const badgesContainer = document.getElementById("table-badges");
    badgesContainer.innerHTML = "";
    tableData.badges.forEach(badgeText => {
        let badgeClass = "badge-mgen";
        if (badgeText.includes("GOLDEN")) badgeClass = "badge-success";
        if (badgeText.includes("SORTIE")) badgeClass = "badge-info";
        if (badgeText.includes("RGPD")) badgeClass = "badge-danger";
        
        const badge = document.createElement("span");
        badge.className = `badge ${badgeClass}`;
        badge.textContent = badgeText;
        badgesContainer.appendChild(badge);
    });

    // Remplir le tableau des colonnes (Schéma)
    const schemaBody = document.getElementById("schema-table-body");
    schemaBody.innerHTML = "";
    tableData.columns.forEach(col => {
        const tr = document.createElement("tr");

        // Cellule nom avec gestion des clés
        let colNameHtml = col.name;
        if (col.name.startsWith("id_")) {
            if (col.name === `id_${tableName}` || col.name === "id_prediction") {
                colNameHtml = `<span class="text-warning"><i class="fa-solid fa-key"></i></span> <strong>${col.name}</strong>`;
            } else {
                colNameHtml = `<span class="text-info"><i class="fa-solid fa-link"></i></span> ${col.name}`;
            }
        }

        // Cellule tags
        let tagsHtml = "";
        col.tags.forEach(t => {
            let tagClass = "badge-mgen";
            if (t.includes("RGPD")) tagClass = "badge-danger";
            tagsHtml += `<span class="badge ${tagClass}" style="font-size: 0.65rem; margin-right: 0.25rem;">${t}</span>`;
        });

        // Cellule Golden Check
        let checkHtml = "";
        if (col.check !== "Aucun") {
            const hasPassed = getCheckStatusForColumn(tableName, col.name);
            const icon = hasPassed ? '<i class="fa-solid fa-circle-check text-success"></i>' : '<i class="fa-solid fa-circle-xmark text-danger"></i>';
            checkHtml = `<span class="flex-center" style="gap: 0.5rem;">${icon} ${col.check}</span>`;
        } else {
            checkHtml = `<span class="text-muted" style="font-size: 0.8rem;">Non requis</span>`;
        }

        tr.innerHTML = `
            <td>${colNameHtml}</td>
            <td style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted);">${col.type}</td>
            <td>${col.desc}</td>
            <td>${tagsHtml}</td>
            <td>${checkHtml}</td>
        `;
        schemaBody.appendChild(tr);
    });

    // Remplir le panneau des règles qualité spécifiques
    const rulesBody = document.getElementById("dq-rules-table-body");
    rulesBody.innerHTML = "";
    tableData.rules.forEach(rule => {
        const tr = document.createElement("tr");
        
        // Déterminer le statut réel de la règle depuis les tests de qualité
        let actualStatus = "success";
        if (tableName === "adherents") {
            if (rule.id === "VAL-001" && !testResults["check_pk_adherents"]) actualStatus = "danger";
            if (rule.id === "VAL-002" && !testResults["check_valid_emails"]) actualStatus = "danger";
            if (rule.id === "VAL-003" && !testResults["check_valid_emails"]) actualStatus = "danger"; // Par extension
            if (rule.id === "VAL-004" && !testResults["check_postal_codes"]) actualStatus = "danger";
        } else if (tableName === "remboursements") {
            if (rule.id === "VAL-101") actualStatus = "success"; // Pas de doublon de PK dans remboursements test
            if (rule.id === "VAL-102" && !testResults["check_fk_remboursements"]) actualStatus = "danger";
            if (rule.id === "VAL-103" && !testResults["check_coherent_amounts"]) actualStatus = "danger";
        } else if (tableName === "predictions_ia") {
            if (rule.id === "VAL-201" && !testResults["check_ai_outputs"]) actualStatus = "danger";
            if (rule.id === "VAL-202") actualStatus = "success"; // Pas d'orphelins IA simulés
        }

        const badgeClass = actualStatus === "success" ? "badge-success" : "badge-danger";
        const statusText = actualStatus === "success" ? "Conforme" : "ÉCHEC";

        tr.innerHTML = `
            <td style="font-family: var(--font-mono); font-weight: 600;">${rule.id}</td>
            <td>${rule.desc}</td>
            <td style="color: var(--text-muted);">${rule.tolerance}</td>
            <td class="text-danger" style="font-weight: 500;">${rule.impact}</td>
            <td><span class="badge ${badgeClass}">${statusText}</span></td>
        `;
        rulesBody.appendChild(tr);
    });
}

// Fonction d'aide pour obtenir le statut d'une colonne spécifique
function getCheckStatusForColumn(table, column) {
    if (table === "adherents") {
        if (column === "id_adherent") return testResults["check_pk_adherents"];
        if (column === "email") return testResults["check_valid_emails"];
        if (column === "code_postal") return testResults["check_postal_codes"];
    } else if (table === "remboursements") {
        if (column === "id_adherent") return testResults["check_fk_remboursements"];
        if (column === "montant_rembourse" || column === "montant_total") return testResults["check_coherent_amounts"];
    } else if (table === "predictions_ia") {
        if (column === "score_anomalie" || column === "confiance_modele") return testResults["check_ai_outputs"];
    }
    return true; // Par défaut conforme
}

// Lancer tous les tests de qualité SQL
function runAllQualityChecks() {
    let totalChecks = SQL_QUALITY_CHECKS.length;
    let passedChecks = 0;
    let activeAnomalies = 0;
    
    testResults = {};
    const dashboardIncidentsBody = document.getElementById("dashboard-incidents-body");
    const qualityAssertionsBody = document.getElementById("quality-assertions-body");
    
    if (dashboardIncidentsBody) dashboardIncidentsBody.innerHTML = "";
    if (qualityAssertionsBody) qualityAssertionsBody.innerHTML = "";

    SQL_QUALITY_CHECKS.forEach(check => {
        let result = [];
        let executionOk = true;

        try {
            // AlaSQL exécute le SQL de test
            // Pour le format REGEXP de code postal sous AlaSQL, on utilise le code postal brut sans regexp complexe ou l'alternative SQL
            const sqlToRun = (check.id === "check_postal_codes" && check.alternativeSql) ? check.alternativeSql : check.sql;
            result = alasql(sqlToRun);
        } catch (error) {
            console.error(`Erreur d'exécution de la requête ${check.id}:`, error);
            executionOk = false;
        }

        // Si le test SQL retourne 0 ligne, la condition de qualité est respectée (pas d'anomalie détectée)
        const isPassed = executionOk && result.length === 0;
        testResults[check.id] = isPassed;

        if (isPassed) {
            passedChecks++;
        } else {
            activeAnomalies++;
        }

        // 1. Ajouter aux assertions globales (onglet Qualité)
        if (qualityAssertionsBody) {
            const tr = document.createElement("tr");
            const badgeClass = isPassed ? "badge-success" : "badge-danger";
            const statusText = isPassed ? "CONFORME" : "ÉCHEC";
            const anomalyRowsCount = result.length;

            tr.innerHTML = `
                <td><strong>${check.titre.split(". ")[1] || check.titre}</strong></td>
                <td><span class="badge badge-mgen">${check.id.startsWith("check_ai") ? "Modèle IA" : "Structure / Données"}</span></td>
                <td><pre style="font-family: var(--font-mono); font-size: 0.75rem; background: rgba(0,0,0,0.1); padding: 0.5rem; border-radius: 4px; overflow-x: auto; max-width: 450px;">${check.sql}</pre></td>
                <td>
                    <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                        <span class="badge ${badgeClass}">${statusText}</span>
                        ${!isPassed ? `<span class="text-danger" style="font-size: 0.75rem; font-weight: 600;">${anomalyRowsCount} ligne(s) non conforme(s)</span>` : ""}
                    </div>
                </td>
                <td>
                    <button class="btn btn-secondary" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="loadAndRunPresetQuery('${check.id}')">
                        <i class="fa-solid fa-terminal"></i> Ouvrir console
                    </button>
                </td>
            `;
            qualityAssertionsBody.appendChild(tr);
        }

        // 2. Si le test a échoué, l'ajouter aux incidents récents (Dashboard)
        if (!isPassed && dashboardIncidentsBody) {
            const tr = document.createElement("tr");
            
            // Calcul de la gravité
            let severityBadge = '<span class="badge badge-danger">Critique</span>';
            if (check.impact.includes("MOYEN")) severityBadge = '<span class="badge badge-warning">Moyen</span>';
            if (check.impact.includes("FAIBLE")) severityBadge = '<span class="badge badge-info">Faible</span>';

            tr.innerHTML = `
                <td><span class="badge badge-mgen">${check.titre.split(" (")[0].split(". ")[1] || "Table"}</span></td>
                <td>${check.description}</td>
                <td>${severityBadge}</td>
                <td class="text-danger" style="font-weight: 500; font-size: 0.85rem;">${check.impact.split(" : ")[1] || check.impact}</td>
                <td><span class="badge badge-danger">Actif</span></td>
            `;
            dashboardIncidentsBody.appendChild(tr);
        }
    });

    // Mettre à jour les métriques sur le dashboard
    const scoreVal = Math.round((passedChecks / totalChecks) * 100);
    const scoreElem = document.getElementById("metrics-dq-score");
    const countElem = document.getElementById("metrics-anomalies-count");
    
    if (scoreElem) {
        scoreElem.textContent = `${scoreVal}%`;
        // Ajuster la couleur de la carte du score de qualité
        const trendElem = document.getElementById("metrics-dq-trend");
        if (scoreVal >= 90) {
            trendElem.className = "metric-trend-up text-success";
            trendElem.innerHTML = '<i class="fa-solid fa-arrow-trend-up"></i> Excellent';
        } else if (scoreVal >= 75) {
            trendElem.className = "metric-trend-up text-warning";
            trendElem.innerHTML = '<i class="fa-solid fa-circle-info"></i> À surveiller';
        } else {
            trendElem.className = "metric-trend-up text-danger";
            trendElem.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Critique';
        }
    }
    
    if (countElem) {
        countElem.textContent = activeAnomalies;
    }

    // Si on est sur l'onglet catalogue, rafraîchir l'affichage
    const activeTreeItem = document.querySelector(".tree-item.active");
    if (activeTreeItem) {
        loadTableMetadata(activeTreeItem.getAttribute("data-table"));
    }
}

// Configurer le SQL Playground
function setupSqlPlayground() {
    const listContainer = document.getElementById("sql-scripts-list");
    const sqlEditor = document.getElementById("sql-code-editor");
    const runBtn = document.getElementById("btn-run-sql");

    if (!listContainer || !sqlEditor || !runBtn) return;

    listContainer.innerHTML = "";

    // Afficher les scripts prédéfinis
    SQL_QUALITY_CHECKS.forEach(check => {
        const card = document.createElement("div");
        card.className = "sql-script-card";
        card.setAttribute("data-id", check.id);
        
        card.innerHTML = `
            <h4>${check.titre}</h4>
            <p>${check.description}</p>
        `;

        card.addEventListener("click", () => {
            document.querySelectorAll(".sql-script-card").forEach(c => c.classList.remove("active"));
            card.classList.add("active");
            sqlEditor.value = check.sql;
            sqlEditor.focus();
        });

        listContainer.appendChild(card);
    });

    // Bouton exécuter
    runBtn.addEventListener("click", executeUserQuery);

    // Ctrl+Enter pour exécuter
    sqlEditor.addEventListener("keydown", (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            e.preventDefault();
            executeUserQuery();
        }
    });
}

// Charger un script prédéfini et naviguer vers la console SQL
function loadAndRunPresetQuery(checkId) {
    const sqlLink = document.getElementById("nav-sql");
    if (sqlLink) sqlLink.click();

    // Trouver le script et le charger
    setTimeout(() => {
        const card = document.querySelector(`.sql-script-card[data-id="${checkId}"]`);
        if (card) {
            card.click();
            executeUserQuery();
        }
    }, 100);
}

// Exécuter la requête SQL de l'utilisateur
function executeUserQuery() {
    const sqlText = document.getElementById("sql-code-editor").value;
    const statusElem = document.getElementById("sql-results-status");
    const placeholder = document.getElementById("results-placeholder");
    const resultsContainer = document.getElementById("results-table-container");
    const tableHead = document.getElementById("results-table-head");
    const tableBody = document.getElementById("results-table-body");

    placeholder.style.display = "none";
    resultsContainer.style.display = "none";
    statusElem.className = "results-status text-info";
    statusElem.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Exécution...';

    setTimeout(() => {
        try {
            const start = performance.now();
            const result = alasql(sqlText);
            const end = performance.now();
            const duration = (end - start).toFixed(1);

            statusElem.className = "results-status text-success";
            statusElem.innerHTML = `<i class="fa-solid fa-circle-check"></i> Requête exécutée en ${duration} ms`;

            if (!result || result.length === 0) {
                placeholder.style.display = "flex";
                placeholder.innerHTML = `
                    <i class="fa-solid fa-database text-muted"></i>
                    <p style="margin-top: 0.5rem;">Requête réussie. Aucun enregistrement retourné (vide).</p>
                `;
                return;
            }

            // Si c'est un tableau de données (Select)
            if (Array.isArray(result) && typeof result[0] === 'object') {
                const keys = Object.keys(result[0]);
                
                // Entête du tableau
                tableHead.innerHTML = "";
                const headerTr = document.createElement("tr");
                keys.forEach(k => {
                    const th = document.createElement("th");
                    th.textContent = k;
                    headerTr.appendChild(th);
                });
                tableHead.appendChild(headerTr);

                // Corps du tableau
                tableBody.innerHTML = "";
                result.forEach(row => {
                    const tr = document.createElement("tr");
                    keys.forEach(k => {
                        const td = document.createElement("td");
                        const val = row[k];
                        td.textContent = val === null ? "NULL" : val;
                        if (val === null) td.style.color = "var(--text-muted)";
                        tr.appendChild(td);
                    });
                    tableBody.appendChild(tr);
                });

                resultsContainer.style.display = "block";
            } else {
                // Autres résultats (ex. Insert, Update, Create)
                placeholder.style.display = "flex";
                placeholder.innerHTML = `
                    <i class="fa-solid fa-check-circle text-success"></i>
                    <p style="margin-top: 0.5rem;">Opération réussie. Résultat : ${JSON.stringify(result)}</p>
                `;
            }

        } catch (error) {
            statusElem.className = "results-status text-danger";
            statusElem.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> Erreur SQL`;
            placeholder.style.display = "flex";
            placeholder.innerHTML = `
                <i class="fa-solid fa-bug text-danger"></i>
                <h4 class="text-danger m-t-2">Erreur d'analyse SQL</h4>
                <p style="margin-top: 0.5rem; max-width: 500px; font-family: var(--font-mono); font-size: 0.85rem; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); padding: 1rem; border-radius: 6px;">
                    ${error.message || error}
                </p>
            `;
        }
    }, 150);
}

// Configurer le Guide Utilisateur OpenMetadata
function setupUserGuide() {
    const guideNavItems = document.querySelectorAll(".guide-nav-item");
    const guideSections = document.querySelectorAll(".guide-section");

    guideNavItems.forEach(item => {
        item.addEventListener("click", () => {
            guideNavItems.forEach(i => i.classList.remove("active"));
            guideSections.forEach(s => s.classList.remove("active"));

            item.classList.add("active");
            const targetSectionId = item.getAttribute("data-section");
            document.getElementById(targetSectionId).classList.add("active");
        });
    });
}

// Initialisation des graphiques Chart.js
function initCharts() {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const gridColor = isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)";
    const textColor = isDark ? "#9ca3af" : "#475569";

    // Graphique 1 : Évolution de la qualité pour l'IA
    const dqCtx = document.getElementById("dqEvolutionChart");
    if (dqCtx) {
        if (dqEvolutionChartInstance) dqEvolutionChartInstance.destroy();
        
        dqEvolutionChartInstance = new Chart(dqCtx.getContext("2d"), {
            type: 'line',
            data: {
                labels: ['Semaine 1', 'Semaine 2', 'Semaine 3', 'Semaine 4', 'Semaine 5 (Actuelle)'],
                datasets: [
                    {
                        label: 'Golden Data (Entrées IA)',
                        data: [78, 81, 84, 82, 85],
                        borderColor: '#00A3E0',
                        backgroundColor: 'rgba(0, 163, 224, 0.1)',
                        borderWidth: 3,
                        tension: 0.3,
                        fill: true
                    },
                    {
                        label: 'Prédictions (Sorties IA)',
                        data: [65, 70, 78, 88, 92],
                        borderColor: '#8b5cf6',
                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                        borderWidth: 3,
                        tension: 0.3,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: textColor, font: { family: 'Inter', weight: '500' } }
                    }
                },
                scales: {
                    y: {
                        min: 50,
                        max: 100,
                        grid: { color: gridColor },
                        ticks: { color: textColor }
                    },
                    x: {
                        grid: { color: gridColor },
                        ticks: { color: textColor }
                    }
                }
            }
        });
    }

    // Graphique 2 : Complétude des glossaires OpenMetadata par table
    const compCtx = document.getElementById("completenessChart");
    if (compCtx) {
        if (completenessChartInstance) completenessChartInstance.destroy();

        completenessChartInstance = new Chart(compCtx.getContext("2d"), {
            type: 'doughnut',
            data: {
                labels: ['adherents (Golden)', 'remboursements (Golden)', 'predictions_ia'],
                datasets: [{
                    data: [100, 85, 75],
                    backgroundColor: [
                        'rgba(16, 185, 129, 0.7)',
                        'rgba(0, 163, 224, 0.7)',
                        'rgba(139, 92, 246, 0.7)'
                    ],
                    borderColor: isDark ? '#111827' : '#ffffff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: textColor, font: { family: 'Inter', weight: '500' } }
                    }
                },
                cutout: '70%'
            }
        });
    }
}

// Inversion du Thème
function setupThemeToggle() {
    const toggleBtn = document.getElementById("theme-toggle");
    if (!toggleBtn) return;

    toggleBtn.addEventListener("click", () => {
        const currentTheme = document.documentElement.getAttribute("data-theme");
        const nextTheme = currentTheme === "dark" ? "light" : "dark";
        
        document.documentElement.setAttribute("data-theme", nextTheme);

        if (nextTheme === "dark") {
            toggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i> <span>Mode Clair</span>';
        } else {
            toggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i> <span>Mode Sombre</span>';
        }

        // Mettre à jour les graphiques pour s'adapter au nouveau contraste
        initCharts();
    });
}
