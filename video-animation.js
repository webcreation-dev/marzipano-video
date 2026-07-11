/**
 * Module d'animation vidéo pour Marzipano
 * Permet de créer des mouvements automatiques naturels qui simulent une vidéo
 * Facilement réutilisable dans d'autres projets
 */

(function(window) {
  'use strict';

  /**
   * Configuration par défaut de l'animation
   */
  var defaultConfig = {
    // Durée d'une animation complète en millisecondes
    duration: 8000,

    // Vitesse de rotation horizontale (yaw)
    yawSpeed: 0.5, // radians par animation

    // Variation du pitch (haut/bas) pour simuler un mouvement humain
    pitchVariation: 0.15, // radians

    // Variation du zoom (fov)
    fovVariation: 0.1, // radians

    // Délai avant reprise de l'animation après interaction (ms)
    idleDelay: 3000,

    // Activer l'effet d'accélération/décélération (easing)
    useEasing: true,

    // Type de mouvement : 'continuous' (boucle infinie) ou 'sequence' (séquence de keyframes)
    movementType: 'continuous',

    // Keyframes personnalisés (si movementType = 'sequence')
    // Format: [{ duration: ms, yaw: rad, pitch: rad, fov: rad }, ...]
    customKeyframes: null,

    // Mode TikTok : mouvements ultra rapides et brusques
    tiktokMode: false,

    // Changement automatique de scène
    autoSwitchDelay: 0  // 0 = désactivé
  };

  /**
   * Fonction d'easing pour des mouvements naturels
   */
  function easeInOutSine(t) {
    return -(Math.cos(Math.PI * t) - 1) / 2;
  }

  function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  /**
   * Créateur d'animation vidéo
   */
  function VideoAnimation(viewer, config) {
    this.viewer = viewer;
    this.config = Object.assign({}, defaultConfig, config);
    this.isPlaying = false;
    this.userInteracted = false;
    this.animationId = null;
    this.idleTimeout = null;
    this.startTime = null;
    this.currentKeyframe = 0;

    // Stocker la vue initiale
    this.initialView = null;

    // Bind methods
    this.update = this.update.bind(this);
    this.handleInteractionStart = this.handleInteractionStart.bind(this);
    this.handleInteractionEnd = this.handleInteractionEnd.bind(this);
    this.resetIdleTimer = this.resetIdleTimer.bind(this);
  }

  /**
   * Démarre l'animation
   */
  VideoAnimation.prototype.start = function() {
    if (this.isPlaying) return;

    this.isPlaying = true;
    this.startTime = Date.now();

    // Capturer la vue initiale si pas déjà fait
    if (!this.initialView) {
      var currentView = this.viewer.view();
      if (currentView) {
        this.initialView = {
          yaw: currentView.yaw(),
          pitch: currentView.pitch(),
          fov: currentView.fov()
        };
      }
    }

    // Écouter les interactions utilisateur
    this.attachInteractionListeners();

    // Démarrer l'animation
    this.animationId = requestAnimationFrame(this.update);
  };

  /**
   * Arrête l'animation
   */
  VideoAnimation.prototype.stop = function() {
    this.isPlaying = false;

    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    this.clearIdleTimer();
    this.detachInteractionListeners();
  };

  /**
   * Met en pause l'animation (arrête temporairement)
   */
  VideoAnimation.prototype.pause = function() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  };

  /**
   * Reprend l'animation
   */
  VideoAnimation.prototype.resume = function() {
    if (this.isPlaying && !this.animationId) {
      this.startTime = Date.now();
      this.animationId = requestAnimationFrame(this.update);
    }
  };

  /**
   * Boucle d'animation principale
   */
  VideoAnimation.prototype.update = function() {
    if (!this.isPlaying || this.userInteracted) {
      return;
    }

    var currentView = this.viewer.view();
    if (!currentView) {
      this.animationId = requestAnimationFrame(this.update);
      return;
    }

    var elapsed = Date.now() - this.startTime;
    var progress = (elapsed % this.config.duration) / this.config.duration;

    // Appliquer l'easing si activé
    var easedProgress = this.config.useEasing ? easeInOutSine(progress) : progress;

    // Calculer les nouvelles valeurs
    var newParams = this.calculateViewParameters(easedProgress, elapsed);

    // Appliquer les paramètres
    currentView.setParameters(newParams);

    // Continuer l'animation
    this.animationId = requestAnimationFrame(this.update);
  };

  /**
   * Calcule les paramètres de vue basés sur le temps écoulé
   */
  VideoAnimation.prototype.calculateViewParameters = function(progress, elapsed) {
    if (!this.initialView) {
      return {};
    }

    var params = {};

    if (this.config.movementType === 'sequence' && this.config.customKeyframes) {
      // Animation par keyframes personnalisés
      params = this.calculateKeyframeAnimation(progress);
    } else {
      // Animation continue par défaut
      params = this.calculateContinuousAnimation(progress, elapsed);
    }

    return params;
  };

  /**
   * Animation continue (mouvement infini)
   */
  VideoAnimation.prototype.calculateContinuousAnimation = function(progress, elapsed) {
    var config = this.config;
    var initial = this.initialView;

    // Mode TikTok : mouvements ultra rapides et brusques
    if (config.tiktokMode || config.yawSpeed > 1.0) {
      return this.calculateTikTokAnimation(progress, elapsed);
    }

    // Rotation principale (yaw) - mouvement de gauche à droite
    var yaw = initial.yaw + (progress * config.yawSpeed * 2 * Math.PI);

    // Variation verticale (pitch) - simuler un mouvement de tête
    // Utilise une sinusoïde pour un mouvement fluide de haut en bas
    var pitchOffset = Math.sin(progress * Math.PI * 4) * config.pitchVariation;
    var pitch = initial.pitch + pitchOffset;

    // Variation du zoom (fov) - simuler un léger zoom in/out
    var fovOffset = Math.sin(progress * Math.PI * 2) * config.fovVariation;
    var fov = initial.fov + fovOffset;

    // Limiter les valeurs
    pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
    fov = Math.max(0.5, Math.min(Math.PI * 0.8, fov));

    return { yaw: yaw, pitch: pitch, fov: fov };
  };

  /**
   * Animation TikTok : ultra rapide, dynamique et imprévisible
   */
  VideoAnimation.prototype.calculateTikTokAnimation = function(progress, elapsed) {
    var config = this.config;
    var initial = this.initialView;

    // Temps en secondes pour les calculs
    var timeInSeconds = elapsed / 1000;

    // ROTATION RAPIDE ET CONTINUE
    // Vitesse ULTRA rapide pour sensation vidéo TikTok
    var baseYawSpeed = config.yawSpeed * 0.8; // radians par seconde (augmenté de 0.3 à 0.8)
    var yaw = initial.yaw + (timeInSeconds * baseYawSpeed);

    // MOUVEMENTS BRUSQUES VERTICAUX (comme si quelqu'un bouge son téléphone)
    // Combinaison de plusieurs fréquences pour un mouvement imprévisible
    var fastShake = Math.sin(progress * Math.PI * 12) * 0.03 * (config.pitchVariation > 0 ? 1 : 0); // Petits tremblements rapides
    var mediumMove = Math.sin(progress * Math.PI * 6) * config.pitchVariation * 0.4; // Mouvements moyens
    var slowSweep = Math.sin(progress * Math.PI * 2) * config.pitchVariation * 0.6; // Balayage lent

    var pitchOffset = fastShake + mediumMove + slowSweep;
    var pitch = initial.pitch + pitchOffset;

    // ZOOM DYNAMIQUE (effet de proximité/éloignement)
    // Zoom avec variations rapides pour dynamisme
    var zoomPulse = Math.sin(progress * Math.PI * 8) * config.fovVariation * 0.3; // Pulsations rapides
    var zoomSweep = Math.sin(progress * Math.PI * 3) * config.fovVariation * 0.7; // Zoom général

    var fovOffset = zoomPulse + zoomSweep;
    var fov = initial.fov + fovOffset;

    // Limiter les valeurs
    pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
    fov = Math.max(0.5, Math.min(Math.PI * 0.8, fov));

    return { yaw: yaw, pitch: pitch, fov: fov };
  };

  /**
   * Animation par keyframes (séquence prédéfinie)
   */
  VideoAnimation.prototype.calculateKeyframeAnimation = function(progress) {
    var keyframes = this.config.customKeyframes;
    if (!keyframes || keyframes.length === 0) {
      return {};
    }

    // Trouver les keyframes entre lesquels on se trouve
    var totalDuration = keyframes.reduce(function(sum, kf) { return sum + kf.duration; }, 0);
    var currentTime = progress * totalDuration;

    var accumulatedTime = 0;
    var startKeyframe = keyframes[0];
    var endKeyframe = keyframes[0];
    var segmentProgress = 0;

    for (var i = 0; i < keyframes.length; i++) {
      if (currentTime >= accumulatedTime && currentTime < accumulatedTime + keyframes[i].duration) {
        startKeyframe = keyframes[i];
        endKeyframe = keyframes[(i + 1) % keyframes.length];
        segmentProgress = (currentTime - accumulatedTime) / keyframes[i].duration;
        break;
      }
      accumulatedTime += keyframes[i].duration;
    }

    // Interpoler entre les keyframes
    var easedSegmentProgress = this.config.useEasing ? easeInOutQuad(segmentProgress) : segmentProgress;

    return {
      yaw: startKeyframe.yaw + (endKeyframe.yaw - startKeyframe.yaw) * easedSegmentProgress,
      pitch: startKeyframe.pitch + (endKeyframe.pitch - startKeyframe.pitch) * easedSegmentProgress,
      fov: startKeyframe.fov + (endKeyframe.fov - startKeyframe.fov) * easedSegmentProgress
    };
  };

  /**
   * Attache les écouteurs d'événements pour détecter l'interaction
   */
  VideoAnimation.prototype.attachInteractionListeners = function() {
    var panoElement = this.viewer.domElement();

    // Événements tactiles (mobile)
    panoElement.addEventListener('touchstart', this.handleInteractionStart, false);
    panoElement.addEventListener('touchend', this.handleInteractionEnd, false);

    // Événements souris (desktop)
    panoElement.addEventListener('mousedown', this.handleInteractionStart, false);
    panoElement.addEventListener('mouseup', this.handleInteractionEnd, false);

    // Événement de molette
    panoElement.addEventListener('wheel', this.resetIdleTimer, false);
  };

  /**
   * Détache les écouteurs d'événements
   */
  VideoAnimation.prototype.detachInteractionListeners = function() {
    var panoElement = this.viewer.domElement();

    panoElement.removeEventListener('touchstart', this.handleInteractionStart, false);
    panoElement.removeEventListener('touchend', this.handleInteractionEnd, false);
    panoElement.removeEventListener('mousedown', this.handleInteractionStart, false);
    panoElement.removeEventListener('mouseup', this.handleInteractionEnd, false);
    panoElement.removeEventListener('wheel', this.resetIdleTimer, false);
  };

  /**
   * Gère le début d'une interaction (l'utilisateur prend la main)
   */
  VideoAnimation.prototype.handleInteractionStart = function(event) {
    this.userInteracted = true;
    this.pause();
    this.clearIdleTimer();
  };

  /**
   * Gère la fin d'une interaction
   */
  VideoAnimation.prototype.handleInteractionEnd = function(event) {
    this.resetIdleTimer();
  };

  /**
   * Réinitialise le timer d'inactivité
   */
  VideoAnimation.prototype.resetIdleTimer = function() {
    var self = this;

    this.clearIdleTimer();

    this.idleTimeout = setTimeout(function() {
      self.userInteracted = false;

      // Capturer la nouvelle position comme point de départ
      var currentView = self.viewer.view();
      if (currentView) {
        self.initialView = {
          yaw: currentView.yaw(),
          pitch: currentView.pitch(),
          fov: currentView.fov()
        };
      }

      self.resume();
    }, this.config.idleDelay);
  };

  /**
   * Efface le timer d'inactivité
   */
  VideoAnimation.prototype.clearIdleTimer = function() {
    if (this.idleTimeout) {
      clearTimeout(this.idleTimeout);
      this.idleTimeout = null;
    }
  };

  /**
   * Met à jour la configuration
   */
  VideoAnimation.prototype.updateConfig = function(newConfig) {
    this.config = Object.assign(this.config, newConfig);
  };

  /**
   * Réinitialise la vue à sa position initiale
   */
  VideoAnimation.prototype.resetView = function() {
    if (this.initialView) {
      var currentView = this.viewer.view();
      if (currentView) {
        currentView.setParameters(this.initialView);
      }
    }
  };

  // Exposer le constructeur globalement
  window.VideoAnimation = VideoAnimation;

})(window);
