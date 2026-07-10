# Guide d'intégration - Animation Vidéo pour Marzipano

Ce guide explique comment répliquer l'animation vidéo dans d'autres projets Marzipano.

## 📦 Fichiers nécessaires

Un seul fichier à copier :
- `video-animation.js` - Le module d'animation

## 🚀 Intégration en 3 étapes

### Étape 1 : Copier le module

Copiez le fichier `video-animation.js` dans votre nouveau projet Marzipano.

### Étape 2 : Inclure le script dans index.html

Ajoutez cette ligne dans votre `index.html`, **AVANT** le fichier `index.js` :

```html
<script src="video-animation.js"></script>
<script src="index.js"></script>
```

### Étape 3 : Modifier index.js

#### A. Remplacer la configuration autorotate

Cherchez cette section dans votre `index.js` :
```javascript
var autorotate = Marzipano.autorotate({
  yawSpeed: 0.03,
  targetPitch: 0,
  targetFov: Math.PI/2
});
```

Remplacez-la par :
```javascript
// Configuration de l'animation vidéo
var videoAnimationConfig = {
  duration: 12000,        // Durée d'un cycle complet (12 secondes)
  yawSpeed: 0.8,          // Rotation rapide pour effet "vidéo"
  pitchVariation: 0.08,   // Légère variation verticale
  fovVariation: 0.05,     // Léger zoom in/out
  idleDelay: 4000,        // Reprise après 4 secondes d'inactivité
  useEasing: true,
  movementType: 'continuous'
};

// Créer l'instance d'animation vidéo
var videoAnimation = new VideoAnimation(viewer, videoAnimationConfig);
```

#### B. Modifier les fonctions startAutorotate et stopAutorotate

Cherchez ces fonctions et remplacez leur contenu :

```javascript
function startAutorotate() {
  if (!autorotateToggleElement.classList.contains('enabled')) {
    return;
  }
  // Utiliser l'animation vidéo au lieu de l'autorotation basique
  if (videoAnimation) {
    videoAnimation.start();
  }
}

function stopAutorotate() {
  // Arrêter l'animation vidéo
  if (videoAnimation) {
    videoAnimation.stop();
  }
}
```

#### C. Mettre à jour la fonction switchScene (optionnel mais recommandé)

Dans la fonction `switchScene`, ajoutez ce code après `scene.scene.switchTo();` :

```javascript
// Réinitialiser la vue initiale pour la nouvelle scène
if (videoAnimation) {
  videoAnimation.initialView = {
    yaw: scene.data.initialViewParameters.yaw,
    pitch: scene.data.initialViewParameters.pitch,
    fov: scene.data.initialViewParameters.fov
  };
}
```

## ⚙️ Configuration personnalisée

Vous pouvez ajuster les paramètres dans `videoAnimationConfig` :

| Paramètre | Description | Valeur par défaut | Exemples |
|-----------|-------------|-------------------|----------|
| `duration` | Durée d'un cycle complet (ms) | 12000 | 8000 (plus rapide), 15000 (plus lent) |
| `yawSpeed` | Vitesse de rotation horizontale | 0.8 | 0.5 (lent), 1.2 (rapide) |
| `pitchVariation` | Variation verticale (haut/bas) | 0.08 | 0.05 (subtil), 0.15 (prononcé) |
| `fovVariation` | Variation du zoom | 0.05 | 0 (pas de zoom), 0.1 (zoom visible) |
| `idleDelay` | Délai avant reprise après interaction (ms) | 4000 | 2000, 5000 |
| `useEasing` | Mouvements fluides | true | true/false |

### Exemples de configurations

**Configuration "TikTok Rapide"** (très dynamique) :
```javascript
var videoAnimationConfig = {
  duration: 8000,
  yawSpeed: 1.2,
  pitchVariation: 0.12,
  fovVariation: 0.08,
  idleDelay: 3000,
  useEasing: true,
  movementType: 'continuous'
};
```

**Configuration "Douce et Subtile"** (pour appartements de luxe) :
```javascript
var videoAnimationConfig = {
  duration: 15000,
  yawSpeed: 0.5,
  pitchVariation: 0.05,
  fovVariation: 0.03,
  idleDelay: 5000,
  useEasing: true,
  movementType: 'continuous'
};
```

**Configuration "Showcase Produit"** (rotation simple sans variation) :
```javascript
var videoAnimationConfig = {
  duration: 10000,
  yawSpeed: 0.6,
  pitchVariation: 0,
  fovVariation: 0,
  idleDelay: 4000,
  useEasing: true,
  movementType: 'continuous'
};
```

## 🎬 Comment ça marche

1. **Démarrage automatique** : L'animation démarre automatiquement si `autorotateEnabled: true` dans `data.js`

2. **Prise de contrôle par l'utilisateur** :
   - Dès que l'utilisateur touche l'écran ou clique, l'animation s'arrête
   - L'utilisateur peut explorer librement le panorama

3. **Reprise automatique** :
   - Après X secondes d'inactivité (défini par `idleDelay`)
   - L'animation reprend depuis la position actuelle de la caméra

4. **Bouton Play/Pause** :
   - Le bouton autorotate existant active/désactive l'animation

## 🔧 Dépannage

### L'animation ne démarre pas
- Vérifiez que `autorotateEnabled: true` dans votre `data.js`
- Vérifiez que le script est bien inclus avant `index.js`
- Ouvrez la console du navigateur pour voir les erreurs

### L'animation est trop rapide/lente
- Ajustez `duration` (augmentez pour ralentir)
- Ajustez `yawSpeed` (diminuez pour ralentir)

### L'utilisateur ne peut pas reprendre le contrôle
- Vérifiez que vous n'avez pas d'autres écouteurs d'événements qui bloquent
- Le module écoute `touchstart`, `mousedown`, et `wheel`

## 📱 Optimisation mobile

Le module détecte automatiquement les interactions tactiles. Pour une expérience optimale sur mobile :

```javascript
var videoAnimationConfig = {
  duration: 10000,      // Un peu plus court sur mobile
  yawSpeed: 0.9,        // Plus rapide pour capter l'attention
  pitchVariation: 0.06, // Réduit pour éviter le mal de mer
  fovVariation: 0.04,
  idleDelay: 3000,      // Reprise plus rapide
  useEasing: true,
  movementType: 'continuous'
};
```

## ✅ Checklist de réplication

- [ ] Copier `video-animation.js` dans le nouveau projet
- [ ] Ajouter `<script src="video-animation.js"></script>` dans `index.html`
- [ ] Remplacer la configuration autorotate dans `index.js`
- [ ] Modifier `startAutorotate()` et `stopAutorotate()`
- [ ] (Optionnel) Mettre à jour `switchScene()`
- [ ] Tester sur navigateur desktop
- [ ] Tester sur mobile/tablette
- [ ] Ajuster les paramètres selon vos préférences

---

**C'est tout !** 🎉 Votre panorama devrait maintenant avoir une animation vidéo naturelle et immersive.
