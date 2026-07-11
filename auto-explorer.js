/**
 * AutoExplorer Module for Marzipano Panoramas
 * Provides automatic scene exploration with intelligent pathfinding and backtracking
 * Version: 1.0.0
 *
 * Easily reusable across multiple Marzipano projects
 */

(function(window) {
  'use strict';

  /**
   * Configuration par défaut
   */
  var defaultConfig = {
    // Seuils de rotation
    rotationThreshold: 450,        // degrés de rotation avant changement de scène
    hotspotTolerance: 69,          // degrés de tolérance pour détecter un hotspot proche

    // Paramètres de timing
    timeout: 15000,                // ms - timeout de sécurité pour forcer changement
    checkInterval: 100,            // ms - fréquence de vérification
    logInterval: 500,              // ms - fréquence des logs de progression

    // Point de départ
    startingSceneId: null,         // ID de la scène de départ (null = scène actuelle)
    startingSceneIndex: null,      // Alternative: index de la scène (0-based)

    // Mode d'exploration
    explorationMode: 'backtracking', // 'backtracking' | 'sequential' | 'random'
    prioritizeStartScene: true,    // Backtrack vers la scène de départ en priorité
    resetOnComplete: true,         // Redémarrer après exploration complète

    // Intégration VideoAnimation
    videoAnimation: null,          // Instance VideoAnimation (requis)
    pauseOnSwitch: false,          // Mettre en pause l'animation pendant le changement

    // Logging & Debug
    enableLogging: true,           // Activer les logs console
    logPrefix: '[AutoExplorer]',   // Préfixe pour les logs

    // Callbacks
    onSceneSwitch: null,           // function(fromSceneId, toSceneId)
    onPathExplored: null,          // function(fromSceneId, toSceneId, totalExplored)
    onExplorationComplete: null,   // function(totalPaths, totalScenes)
    onTimeout: null,               // function(sceneId, elapsedTime)
    onBacktrack: null,             // function(fromSceneId, toSceneId)
    onRotationProgress: null       // function(degrees, seconds, sceneId)
  };

  /**
   * Constructeur AutoExplorer
   * @param {Object} viewer - Instance Marzipano.Viewer
   * @param {Array} scenes - Tableau des scènes [{data, scene, view}, ...]
   * @param {Object} config - Configuration (voir defaultConfig)
   */
  function AutoExplorer(viewer, scenes, config) {
    // Validation des paramètres
    if (!viewer || typeof viewer.view !== 'function') {
      throw new Error('AutoExplorer: Invalid viewer instance');
    }
    if (!Array.isArray(scenes) || scenes.length === 0) {
      throw new Error('AutoExplorer: Scenes array is empty or invalid');
    }

    // Fusionner config avec defaults
    this.config = this._mergeConfig(defaultConfig, config || {});

    // Avertissement si videoAnimation manquante
    if (!this.config.videoAnimation) {
      console.warn('AutoExplorer: videoAnimation not provided, some features may not work');
    }

    // Références
    this.viewer = viewer;
    this.scenes = scenes;
    this.videoAnimation = this.config.videoAnimation;

    // État de l'explorateur
    this.isRunning = false;
    this.isPaused = false;
    this.currentSceneIndex = 0;
    this.currentSceneId = null;

    // Tracking de rotation
    this.lastYaw = null;
    this.rotationAccumulated = 0;
    this.autoSwitchStartTime = 0;
    this.lastHotspotCheck = 0;

    // Historique d'exploration
    this.visitedScenes = [];
    this.exploredPaths = [];

    // RAF loop
    this.animationFrameId = null;

    // Bind methods
    this._checkAutoSwitch = this._checkAutoSwitch.bind(this);

    this._log('AutoExplorer initialized with ' + scenes.length + ' scenes', 'info');
  }

  /**
   * ===== API PUBLIQUE =====
   */

  /**
   * Démarre l'exploration automatique
   */
  AutoExplorer.prototype.start = function() {
    if (this.isRunning) {
      this._log('Already running', 'warn');
      return false;
    }

    this.isRunning = true;
    this.isPaused = false;

    // Initialiser les compteurs
    this.rotationAccumulated = 0;
    this.lastYaw = null;
    this.lastHotspotCheck = 0;
    this.autoSwitchStartTime = Date.now();

    // Ajouter la scène de départ à l'historique si c'est le premier démarrage
    if (this.visitedScenes.length === 0) {
      var startSceneId = this._determineStartingScene();
      this.currentSceneId = startSceneId;
      this.visitedScenes.push(startSceneId);
      this._log('Starting from: ' + startSceneId, 'info');
    }

    // Démarrer la boucle RAF
    this.animationFrameId = requestAnimationFrame(this._checkAutoSwitch);

    this._log('Exploration started', 'info');
    return true;
  };

  /**
   * Arrête complètement l'exploration
   */
  AutoExplorer.prototype.stop = function() {
    if (!this.isRunning) {
      return false;
    }

    this.isRunning = false;
    this.isPaused = false;

    // Annuler RAF
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Réinitialiser compteurs
    this.rotationAccumulated = 0;
    this.lastYaw = null;
    this.autoSwitchStartTime = 0;

    this._log('Exploration stopped', 'info');
    return true;
  };

  /**
   * Met en pause l'exploration
   */
  AutoExplorer.prototype.pause = function() {
    if (!this.isRunning || this.isPaused) {
      return false;
    }

    this.isPaused = true;

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this._log('Exploration paused', 'info');
    return true;
  };

  /**
   * Reprend l'exploration
   */
  AutoExplorer.prototype.resume = function() {
    if (!this.isRunning || !this.isPaused) {
      return false;
    }

    this.isPaused = false;
    this.autoSwitchStartTime = Date.now();
    this.animationFrameId = requestAnimationFrame(this._checkAutoSwitch);

    this._log('Exploration resumed', 'info');
    return true;
  };

  /**
   * Réinitialise complètement l'état d'exploration
   */
  AutoExplorer.prototype.reset = function() {
    this.visitedScenes = [];
    this.exploredPaths = [];
    this.rotationAccumulated = 0;
    this.lastYaw = null;
    this.autoSwitchStartTime = 0;

    this._log('Exploration state reset', 'info');
  };

  /**
   * Réinitialise uniquement les chemins explorés
   */
  AutoExplorer.prototype.resetPaths = function() {
    this.exploredPaths = [];
    this._log('Explored paths reset', 'info');
  };

  /**
   * Retourne les statistiques d'exploration
   */
  AutoExplorer.prototype.getStatistics = function() {
    var totalPaths = this._countTotalPaths();
    var timeInScene = this.autoSwitchStartTime > 0 ? Date.now() - this.autoSwitchStartTime : 0;

    return {
      visitedScenes: this.visitedScenes.length,
      totalScenes: this.scenes.length,
      exploredPaths: this.exploredPaths.length,
      totalPaths: totalPaths,
      completionPercentage: totalPaths > 0 ? Math.round((this.exploredPaths.length / totalPaths) * 100) : 0,
      currentRotation: Math.round(this.rotationAccumulated * 180 / Math.PI),
      timeInCurrentScene: timeInScene,
      currentSceneId: this.currentSceneId
    };
  };

  /**
   * Retourne l'état actuel
   */
  AutoExplorer.prototype.getCurrentState = function() {
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      currentSceneId: this.currentSceneId,
      currentSceneIndex: this.currentSceneIndex
    };
  };

  /**
   * Retourne la scène actuelle
   */
  AutoExplorer.prototype.getCurrentScene = function() {
    return this.scenes[this.currentSceneIndex];
  };

  /**
   * Retourne la liste des scènes visitées
   */
  AutoExplorer.prototype.getVisitedScenes = function() {
    return this.visitedScenes.slice(); // Copie
  };

  /**
   * Retourne la liste des chemins explorés
   */
  AutoExplorer.prototype.getExploredPaths = function() {
    return this.exploredPaths.slice(); // Copie
  };

  /**
   * Met à jour la configuration
   */
  AutoExplorer.prototype.updateConfig = function(newConfig) {
    this.config = this._mergeConfig(this.config, newConfig);
    this._log('Configuration updated', 'info');
  };

  /**
   * Change de scène manuellement
   */
  AutoExplorer.prototype.switchToScene = function(targetId) {
    // Trouver l'index de la scène cible
    for (var i = 0; i < this.scenes.length; i++) {
      if (this.scenes[i].data.id === targetId) {
        this.currentSceneIndex = i;
        this.currentSceneId = targetId;
        break;
      }
    }

    // Ajouter à l'historique des pièces visitées
    if (this.visitedScenes.indexOf(targetId) === -1) {
      this.visitedScenes.push(targetId);
    }

    // Redémarrer le tracking de rotation
    this.rotationAccumulated = 0;
    this.lastYaw = null;
    this.autoSwitchStartTime = Date.now();

    this._log('Switched to scene: ' + targetId + ' (' + this.visitedScenes.length + '/' + this.scenes.length + ')', 'info');
  };

  /**
   * ===== MÉTHODES PRIVÉES - UTILITAIRES D'ANGLE =====
   */

  /**
   * Vérifie si la position actuelle est proche d'un hotspot
   */
  AutoExplorer.prototype._isNearHotspot = function(currentYaw, hotspotYaw, threshold) {
    var diff = Math.abs(currentYaw - hotspotYaw);
    if (diff > Math.PI) {
      diff = 2 * Math.PI - diff;
    }
    return diff < threshold;
  };

  /**
   * Normalise un angle entre -PI et PI
   */
  AutoExplorer.prototype._normalizeAngle = function(angle) {
    while (angle > Math.PI) {
      angle -= 2 * Math.PI;
    }
    while (angle < -Math.PI) {
      angle += 2 * Math.PI;
    }
    return angle;
  };

  /**
   * Calcule la différence entre deux angles
   */
  AutoExplorer.prototype._calculateAngleDifference = function(angle1, angle2) {
    var diff = Math.abs(angle1 - angle2);
    if (diff > Math.PI) {
      diff = 2 * Math.PI - diff;
    }
    return diff;
  };

  /**
   * ===== MÉTHODES PRIVÉES - TRACKING DE CHEMINS =====
   */

  /**
   * Vérifie si un chemin a déjà été exploré
   */
  AutoExplorer.prototype._hasExploredPath = function(fromId, toId) {
    for (var i = 0; i < this.exploredPaths.length; i++) {
      if (this.exploredPaths[i].from === fromId && this.exploredPaths[i].to === toId) {
        return true;
      }
    }
    return false;
  };

  /**
   * Marque un chemin comme exploré
   */
  AutoExplorer.prototype._markPathExplored = function(fromId, toId) {
    if (!this._hasExploredPath(fromId, toId)) {
      this.exploredPaths.push({from: fromId, to: toId});
      this._log('Path explored: ' + fromId + ' → ' + toId, 'debug');

      // Callback
      if (this.config.onPathExplored) {
        this.config.onPathExplored(fromId, toId, this.exploredPaths.length);
      }
    }
  };

  /**
   * Vérifie si une scène a des flèches non explorées
   */
  AutoExplorer.prototype._hasUnexploredArrows = function(sceneId) {
    var scene = this._getSceneById(sceneId);
    if (!scene) return false;

    var hotspots = scene.data.linkHotspots;
    for (var i = 0; i < hotspots.length; i++) {
      if (!this._hasExploredPath(sceneId, hotspots[i].target)) {
        return true;
      }
    }
    return false;
  };

  /**
   * Trouve une pièce avec des flèches non explorées (pour backtracking)
   */
  AutoExplorer.prototype._findRoomWithUnexploredArrows = function() {
    // Stratégie 1 : Priorité à la scène de départ si configuré
    if (this.config.prioritizeStartScene) {
      var startingId = this._determineStartingScene();
      if (startingId && this._hasUnexploredArrows(startingId)) {
        return startingId;
      }
    }

    // Stratégie 2 : Chercher dans l'ordre de visite des pièces
    for (var i = 0; i < this.visitedScenes.length; i++) {
      if (this._hasUnexploredArrows(this.visitedScenes[i])) {
        return this.visitedScenes[i];
      }
    }

    // Stratégie 3 : Chercher dans toutes les pièces
    for (var j = 0; j < this.scenes.length; j++) {
      var sceneId = this.scenes[j].data.id;
      if (this._hasUnexploredArrows(sceneId)) {
        return sceneId;
      }
    }

    return null; // Tous les chemins explorés
  };

  /**
   * ===== MÉTHODES PRIVÉES - GESTION DE SCÈNES =====
   */

  /**
   * Trouve une scène par ID
   */
  AutoExplorer.prototype._getSceneById = function(sceneId) {
    for (var i = 0; i < this.scenes.length; i++) {
      if (this.scenes[i].data.id === sceneId) {
        return this.scenes[i];
      }
    }
    return null;
  };

  /**
   * Compte le nombre total de chemins possibles
   */
  AutoExplorer.prototype._countTotalPaths = function() {
    var totalPaths = 0;
    for (var i = 0; i < this.scenes.length; i++) {
      totalPaths += this.scenes[i].data.linkHotspots.length;
    }
    return totalPaths;
  };

  /**
   * Détermine la scène de départ
   */
  AutoExplorer.prototype._determineStartingScene = function() {
    if (this.config.startingSceneId) {
      return this.config.startingSceneId;
    }
    if (this.config.startingSceneIndex !== null) {
      return this.scenes[this.config.startingSceneIndex].data.id;
    }
    // Par défaut: première scène
    return this.scenes[0].data.id;
  };

  /**
   * Réinitialise l'exploration si cycle complet
   */
  AutoExplorer.prototype._resetExplorationIfComplete = function() {
    var totalPaths = this._countTotalPaths();

    if (this.exploredPaths.length >= totalPaths) {
      this._log('All paths explored (' + this.exploredPaths.length + '/' + totalPaths + ') - RESET', 'info');

      // Callback
      if (this.config.onExplorationComplete) {
        this.config.onExplorationComplete(totalPaths, this.visitedScenes.length);
      }

      // Reset si configuré
      if (this.config.resetOnComplete) {
        this.exploredPaths = [];
        this.visitedScenes = [];

        // Retour à la scène de départ
        var startingId = this._determineStartingScene();
        this.switchToScene(startingId);
      }
    }
  };

  /**
   * ===== MÉTHODES PRIVÉES - LOGIQUE D'EXPLORATION =====
   */

  /**
   * Choisit intelligemment le meilleur hotspot avec support backtracking
   */
  AutoExplorer.prototype._chooseBestHotspotWithBacktracking = function(currentScene, currentYaw, threshold) {
    var hotspots = currentScene.data.linkHotspots;
    var currentSceneId = currentScene.data.id;
    var nearbyHotspots = [];

    // Étape 1 : Trouver les flèches proches (dans la vue actuelle)
    for (var i = 0; i < hotspots.length; i++) {
      var hotspot = hotspots[i];
      if (this._isNearHotspot(currentYaw, hotspot.yaw, threshold)) {
        nearbyHotspots.push(hotspot);
      }
    }

    // Étape 2 : Parmi les flèches proches, choisir une flèche NON explorée
    for (var j = 0; j < nearbyHotspots.length; j++) {
      var hotspot2 = nearbyHotspots[j];
      if (!this._hasExploredPath(currentSceneId, hotspot2.target)) {
        return {hotspot: hotspot2, needsBacktrack: false};
      }
    }

    // Étape 3 : Aucune flèche proche → vérifier si besoin de backtrack
    // Si toutes les flèches de cette pièce sont explorées → BACKTRACK
    var allExplored = true;
    for (var k = 0; k < hotspots.length; k++) {
      if (!this._hasExploredPath(currentSceneId, hotspots[k].target)) {
        allExplored = false;
        break;
      }
    }

    if (allExplored) {
      // BACKTRACK : trouver une pièce avec flèches non explorées
      var backtrackTarget = this._findRoomWithUnexploredArrows();
      if (backtrackTarget) {
        this._log('BACKTRACK needed to: ' + backtrackTarget, 'info');

        // Callback
        if (this.config.onBacktrack) {
          this.config.onBacktrack(currentSceneId, backtrackTarget);
        }

        return {
          hotspot: null,
          needsBacktrack: true,
          backtrackTarget: backtrackTarget
        };
      }
    }

    return null; // Pas de changement nécessaire
  };

  /**
   * Boucle principale RAF - Détecte les rotations et change de pièce sur hotspot
   */
  AutoExplorer.prototype._checkAutoSwitch = function() {
    if (!this.isRunning || this.isPaused) {
      return;
    }

    // Vérifier l'état de videoAnimation
    if (this.videoAnimation && (this.videoAnimation.userInteracted || !this.videoAnimation.isPlaying)) {
      this.animationFrameId = requestAnimationFrame(this._checkAutoSwitch);
      return;
    }

    var currentView = this.viewer.view();
    if (!currentView) {
      this.animationFrameId = requestAnimationFrame(this._checkAutoSwitch);
      return;
    }

    var currentYaw = currentView.yaw();
    var now = Date.now();

    // Accumuler la rotation (en gérant correctement le passage -PI/+PI)
    if (this.lastYaw !== null) {
      var yawDiff = currentYaw - this.lastYaw;
      if (Math.abs(yawDiff) > Math.PI) {
        yawDiff = yawDiff > 0 ? yawDiff - 2*Math.PI : yawDiff + 2*Math.PI;
      }
      this.rotationAccumulated += Math.abs(yawDiff);
    }
    this.lastYaw = currentYaw;

    // Vérifier toutes les checkInterval ms
    if (now - this.lastHotspotCheck < this.config.checkInterval) {
      this.animationFrameId = requestAnimationFrame(this._checkAutoSwitch);
      return;
    }
    this.lastHotspotCheck = now;

    // Log de progression toutes les logInterval ms
    if (this.config.enableLogging && now - this.autoSwitchStartTime > this.config.logInterval &&
        (now - this.autoSwitchStartTime) % this.config.logInterval < this.config.checkInterval) {
      var degrees = Math.round(this.rotationAccumulated * 180 / Math.PI);
      var seconds = ((now - this.autoSwitchStartTime) / 1000).toFixed(1);
      var currentScene = this.getCurrentScene();
      this._log('[' + currentScene.data.name + '] Rotation: ' + degrees + '° | Time: ' + seconds + 's', 'debug');

      // Callback
      if (this.config.onRotationProgress) {
        this.config.onRotationProgress(degrees, parseFloat(seconds), currentScene.data.id);
      }
    }

    // Sécurité : forcer changement après timeout
    if (now - this.autoSwitchStartTime > this.config.timeout) {
      this._log('Timeout reached (' + this.config.timeout + 'ms), forcing scene switch', 'warn');

      var scene = this.getCurrentScene();
      var hotspots = scene.data.linkHotspots;

      if (hotspots.length > 0) {
        this.switchToScene(hotspots[0].target);
        this._markPathExplored(scene.data.id, hotspots[0].target);

        // Callback
        if (this.config.onTimeout) {
          this.config.onTimeout(scene.data.id, this.config.timeout);
        }
        if (this.config.onSceneSwitch) {
          this.config.onSceneSwitch(scene.data.id, hotspots[0].target);
        }
      }

      this.animationFrameId = requestAnimationFrame(this._checkAutoSwitch);
      return;
    }

    // Après rotationThreshold degrés de rotation : chercher une flèche
    var rotationThresholdRadians = this.config.rotationThreshold * Math.PI / 180;
    if (this.rotationAccumulated >= rotationThresholdRadians) {
      var currentScene = this.getCurrentScene();
      var hotspotToleranceRadians = this.config.hotspotTolerance * Math.PI / 180;

      var result = this._chooseBestHotspotWithBacktracking(currentScene, currentYaw, hotspotToleranceRadians);

      if (result) {
        if (result.needsBacktrack) {
          // BACKTRACK : téléportation vers une pièce avec flèches non explorées
          this._log('TELEPORT to: ' + result.backtrackTarget, 'info');
          this.switchToScene(result.backtrackTarget);
          // NE PAS marquer comme exploré (on ne suit pas une flèche)

          // Vérifier si tous les chemins sont explorés
          this._resetExplorationIfComplete();
        } else if (result.hotspot) {
          // Navigation normale via une flèche
          var targetId = result.hotspot.target;
          this._log('Scene switch: ' + currentScene.data.name + ' → ' + targetId, 'info');

          // Callback avant changement
          if (this.config.onSceneSwitch) {
            this.config.onSceneSwitch(currentScene.data.id, targetId);
          }

          this.switchToScene(targetId);
          this._markPathExplored(currentScene.data.id, targetId);

          // Vérifier si tous les chemins sont explorés
          this._resetExplorationIfComplete();
        }
      }
    }

    this.animationFrameId = requestAnimationFrame(this._checkAutoSwitch);
  };

  /**
   * ===== MÉTHODES UTILITAIRES =====
   */

  /**
   * Fusionne deux objets de configuration
   */
  AutoExplorer.prototype._mergeConfig = function(defaults, custom) {
    var merged = {};
    for (var key in defaults) {
      if (defaults.hasOwnProperty(key)) {
        merged[key] = defaults[key];
      }
    }
    for (var customKey in custom) {
      if (custom.hasOwnProperty(customKey)) {
        merged[customKey] = custom[customKey];
      }
    }
    return merged;
  };

  /**
   * Log avec préfixe
   */
  AutoExplorer.prototype._log = function(message, type) {
    if (!this.config.enableLogging) return;

    var prefix = this.config.logPrefix;
    var fullMessage = prefix + ' ' + message;

    switch(type) {
      case 'error':
        console.error(fullMessage);
        break;
      case 'warn':
        console.warn(fullMessage);
        break;
      case 'debug':
        console.log(fullMessage);
        break;
      case 'info':
      default:
        console.log(fullMessage);
        break;
    }
  };

  /**
   * ===== EXPORT GLOBAL =====
   */
  window.AutoExplorer = AutoExplorer;

})(window);
