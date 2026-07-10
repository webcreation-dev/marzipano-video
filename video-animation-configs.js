/**
 * Configurations prédéfinies pour l'animation vidéo
 * Copiez celle qui vous convient dans votre index.js
 */

// ============================================
// CONFIGURATION 1 : TIKTOK RAPIDE (par défaut)
// ============================================
// Effet dynamique et accrocheur, parfait pour capter l'attention rapidement
var videoAnimationConfigTikTok = {
  duration: 12000,
  yawSpeed: 0.8,
  pitchVariation: 0.08,
  fovVariation: 0.05,
  idleDelay: 4000,
  useEasing: true,
  movementType: 'continuous'
};


// ============================================
// CONFIGURATION 2 : ULTRA RAPIDE
// ============================================
// Mouvement très rapide et énergique, style "Reels Instagram"
var videoAnimationConfigUltraFast = {
  duration: 8000,
  yawSpeed: 1.2,
  pitchVariation: 0.12,
  fovVariation: 0.08,
  idleDelay: 3000,
  useEasing: true,
  movementType: 'continuous'
};


// ============================================
// CONFIGURATION 3 : DOUCE ET ÉLÉGANTE
// ============================================
// Parfait pour appartements de luxe, hôtels haut de gamme
var videoAnimationConfigLuxury = {
  duration: 15000,
  yawSpeed: 0.5,
  pitchVariation: 0.05,
  fovVariation: 0.03,
  idleDelay: 5000,
  useEasing: true,
  movementType: 'continuous'
};


// ============================================
// CONFIGURATION 4 : ROTATION SIMPLE
// ============================================
// Rotation pure sans variation, style "tour produit"
var videoAnimationConfigProduct = {
  duration: 10000,
  yawSpeed: 0.6,
  pitchVariation: 0,
  fovVariation: 0,
  idleDelay: 4000,
  useEasing: true,
  movementType: 'continuous'
};


// ============================================
// CONFIGURATION 5 : MOBILE OPTIMISÉ
// ============================================
// Paramètres adaptés pour l'expérience mobile
var videoAnimationConfigMobile = {
  duration: 10000,
  yawSpeed: 0.9,
  pitchVariation: 0.06,
  fovVariation: 0.04,
  idleDelay: 3000,
  useEasing: true,
  movementType: 'continuous'
};


// ============================================
// CONFIGURATION 6 : CINÉMATIQUE
// ============================================
// Mouvements lents et fluides, style documentaire
var videoAnimationConfigCinematic = {
  duration: 20000,
  yawSpeed: 0.4,
  pitchVariation: 0.04,
  fovVariation: 0.02,
  idleDelay: 6000,
  useEasing: true,
  movementType: 'continuous'
};


// ============================================
// CONFIGURATION 7 : ÉNERGIQUE
// ============================================
// Mouvements prononcés pour créer de l'impact
var videoAnimationConfigEnergetic = {
  duration: 9000,
  yawSpeed: 1.0,
  pitchVariation: 0.15,
  fovVariation: 0.1,
  idleDelay: 3500,
  useEasing: true,
  movementType: 'continuous'
};


// ============================================
// COMMENT UTILISER :
// ============================================
/*

Dans votre index.js, remplacez simplement :

var videoAnimationConfig = { ... };

par une des configurations ci-dessus, par exemple :

var videoAnimationConfig = videoAnimationConfigTikTok;

Ou créez votre propre configuration personnalisée !

*/


// ============================================
// GUIDE DES PARAMÈTRES :
// ============================================
/*

duration:
  - Plus petit = animation plus rapide (ex: 8000 = 8 secondes)
  - Plus grand = animation plus lente (ex: 20000 = 20 secondes)

yawSpeed:
  - Contrôle la vitesse de rotation horizontale
  - 0.5 = lent, 0.8 = moyen, 1.2+ = rapide

pitchVariation:
  - Mouvement vertical (haut/bas)
  - 0 = pas de mouvement vertical
  - 0.05 = subtil, 0.15 = prononcé

fovVariation:
  - Effet de zoom in/out
  - 0 = pas de zoom
  - 0.05 = zoom léger, 0.1+ = zoom visible

idleDelay:
  - Temps en ms avant reprise de l'animation après interaction
  - 3000 = 3 secondes, 5000 = 5 secondes

useEasing:
  - true = mouvements fluides avec accélération/décélération
  - false = mouvements linéaires constants

movementType:
  - 'continuous' = boucle infinie (recommandé)
  - 'sequence' = séquence de keyframes (avancé)

*/
