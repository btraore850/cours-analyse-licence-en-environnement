# Ajouter une vidéo dans la rubrique Application

Le catalogue utilisé par la page est [videos.json](videos.json). Les vidéos sont hébergées sur OneDrive, YouTube ou un autre service : **ne téléversez pas les fichiers MP4 volumineux sur GitHub**.

## Méthode simple

1. Ouvrir [applications/videos.json](https://github.com/btraore850/cours-analyse-licence-en-environnement/blob/main/applications/videos.json).
2. Cliquer sur l'icône crayon **Edit this file**.
3. Dans le tableau `"videos"`, ajouter une entrée en respectant les virgules, puis utiliser **Commit changes** pour enregistrer.
4. Consulter la [rubrique Application](https://btraore850.github.io/cours-analyse-licence-en-environnement/applications/) et actualiser la page. Le chapitre affiche automatiquement son nombre de vidéos.

### Exemple — chapitre 3 : Calcul intégral

**N'utiliser cet exemple qu'après avoir remplacé l'URL par le vrai lien de la nouvelle vidéo.**

```json
{
  "id": "video-002",
  "chapitre": 3,
  "section": "",
  "titre": "Application du calcul intégral aux domaines de spécialité",
  "url": "https://EXEMPLE-A-REMPLACER",
  "plateforme": "OneDrive"
}
```

**Important :** si une vidéo existe déjà juste avant l'entrée ajoutée, mettre une **virgule après son accolade fermante**. Ne pas mettre de virgule après la dernière vidéo du tableau.

Exemple de structure correcte :

```json
"videos": [
  { "id": "video-001", "chapitre": 2, "section": "", "titre": "Vidéo du chapitre 2", "url": "https://exemple.com/video2", "plateforme": "OneDrive" },
  { "id": "video-002", "chapitre": 3, "section": "", "titre": "Vidéo du chapitre 3", "url": "https://exemple.com/video3", "plateforme": "OneDrive" }
]
```

Les liens ci-dessus sont **fictifs** et servent seulement à illustrer la syntaxe.

### Contrôles avant enregistrement

- Choisir le bon numéro de chapitre (1 à 8), et un identifiant unique (par exemple `video-002`).
- Utiliser un lien HTTPS de partage accessible aux étudiants.
- Ne pas reprendre accidentellement le lien de la vidéo du chapitre 2.
- Garder les guillemets, accolades et crochets. Chaque entrée doit être séparée par une virgule.
- Si une vidéo ne doit pas encore être classée, utiliser `"chapitre": null`.

Si vous ne souhaitez pas modifier le JSON, transmettez simplement **le chapitre et le lien** et demandez son insertion dans le catalogue.
