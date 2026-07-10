/*
 * Copyright 2016 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

(function() {
  var Marzipano = window.Marzipano;
  var bowser = window.bowser;
  var screenfull = window.screenfull;
  var data = window.APP_DATA;

  // Grab elements from DOM.
  var panoElement = document.querySelector('#pano');
  var sceneNameElement = document.querySelector('#titleBar .sceneName');
  var sceneListElement = document.querySelector('#sceneList');
  var sceneElements = document.querySelectorAll('#sceneList .scene');
  var sceneListToggleElement = document.querySelector('#sceneListToggle');
  var autorotateToggleElement = document.querySelector('#autorotateToggle');
  var fullscreenToggleElement = document.querySelector('#fullscreenToggle');

  // Detect desktop or mobile mode.
  if (window.matchMedia) {
    var setMode = function() {
      if (mql.matches) {
        document.body.classList.remove('desktop');
        document.body.classList.add('mobile');
      } else {
        document.body.classList.remove('mobile');
        document.body.classList.add('desktop');
      }
    };
    var mql = matchMedia("(max-width: 500px), (max-height: 500px)");
    setMode();
    mql.addListener(setMode);
  } else {
    document.body.classList.add('desktop');
  }

  // Detect whether we are on a touch device.
  document.body.classList.add('no-touch');
  window.addEventListener('touchstart', function() {
    document.body.classList.remove('no-touch');
    document.body.classList.add('touch');
  });

  // Use tooltip fallback mode on IE < 11.
  if (bowser.msie && parseFloat(bowser.version) < 11) {
    document.body.classList.add('tooltip-fallback');
  }

  // Viewer options.
  var viewerOpts = {
    controls: {
      mouseViewMode: data.settings.mouseViewMode
    }
  };

  // Initialize viewer.
  var viewer = new Marzipano.Viewer(panoElement, viewerOpts);

  // Create scenes.
  var scenes = data.scenes.map(function(data) {
    var urlPrefix = "tiles";
    var source = Marzipano.ImageUrlSource.fromString(
      urlPrefix + "/" + data.id + "/{z}/{f}/{y}/{x}.jpg",
      { cubeMapPreviewUrl: urlPrefix + "/" + data.id + "/preview.jpg" });
    var geometry = new Marzipano.CubeGeometry(data.levels);

    var limiter = Marzipano.RectilinearView.limit.traditional(data.faceSize, 100*Math.PI/180, 120*Math.PI/180);
    var view = new Marzipano.RectilinearView(data.initialViewParameters, limiter);

    var scene = viewer.createScene({
      source: source,
      geometry: geometry,
      view: view,
      pinFirstLevel: true
    });

    // Create link hotspots.
    data.linkHotspots.forEach(function(hotspot) {
      var element = createLinkHotspotElement(hotspot);
      scene.hotspotContainer().createHotspot(element, { yaw: hotspot.yaw, pitch: hotspot.pitch });
    });

    // Create info hotspots.
    data.infoHotspots.forEach(function(hotspot) {
      var element = createInfoHotspotElement(hotspot);
      scene.hotspotContainer().createHotspot(element, { yaw: hotspot.yaw, pitch: hotspot.pitch });
    });

    return {
      data: data,
      scene: scene,
      view: view
    };
  });

  // Configuration de l'animation vidéo (Mode TikTok - Ralenti)
  var videoAnimationConfig = {
    duration: 5000,         // Cycle de 5 secondes
    yawSpeed: 1.5,          // ROTATION plus douce (1.2 rad/sec = ~70°/sec)
    pitchVariation: 0.12,   // Mouvements verticaux modérés
    fovVariation: 0.08,     // Zoom subtil
    idleDelay: 2000,        // Reprise rapide après 2 secondes
    useEasing: false,       // Pas d'easing = mouvements plus brusques
    movementType: 'continuous',
    tiktokMode: true,       // Active le mode TikTok (mouvements brusques)
    autoSwitchDelay: 6000   // Changer de pièce toutes les 6 secondes (effet FEED)
  };

  // Créer l'instance d'animation vidéo
  var videoAnimation = new VideoAnimation(viewer, videoAnimationConfig);

  // Démarrer automatiquement si activé dans les paramètres
  if (data.settings.autorotateEnabled) {
    autorotateToggleElement.classList.add('enabled');
  }

  // Set handler for autorotate toggle.
  autorotateToggleElement.addEventListener('click', toggleAutorotate);

  // Set up fullscreen mode, if supported.
  if (screenfull.enabled && data.settings.fullscreenButton) {
    document.body.classList.add('fullscreen-enabled');
    fullscreenToggleElement.addEventListener('click', function() {
      screenfull.toggle();
    });
    screenfull.on('change', function() {
      if (screenfull.isFullscreen) {
        fullscreenToggleElement.classList.add('enabled');
      } else {
        fullscreenToggleElement.classList.remove('enabled');
      }
    });
  } else {
    document.body.classList.add('fullscreen-disabled');
  }

  // Set handler for scene list toggle.
  sceneListToggleElement.addEventListener('click', toggleSceneList);

  // Start with the scene list open on desktop.
  if (!document.body.classList.contains('mobile')) {
    showSceneList();
  }

  // Set handler for scene switch.
  scenes.forEach(function(scene) {
    var el = document.querySelector('#sceneList .scene[data-id="' + scene.data.id + '"]');
    el.addEventListener('click', function() {
      switchScene(scene);
      // On mobile, hide scene list after selecting a scene.
      if (document.body.classList.contains('mobile')) {
        hideSceneList();
      }
    });
  });

  // DOM elements for view controls.
  var viewUpElement = document.querySelector('#viewUp');
  var viewDownElement = document.querySelector('#viewDown');
  var viewLeftElement = document.querySelector('#viewLeft');
  var viewRightElement = document.querySelector('#viewRight');
  var viewInElement = document.querySelector('#viewIn');
  var viewOutElement = document.querySelector('#viewOut');

  // Dynamic parameters for controls.
  var velocity = 0.7;
  var friction = 3;

  // Associate view controls with elements.
  var controls = viewer.controls();
  controls.registerMethod('upElement',    new Marzipano.ElementPressControlMethod(viewUpElement,     'y', -velocity, friction), true);
  controls.registerMethod('downElement',  new Marzipano.ElementPressControlMethod(viewDownElement,   'y',  velocity, friction), true);
  controls.registerMethod('leftElement',  new Marzipano.ElementPressControlMethod(viewLeftElement,   'x', -velocity, friction), true);
  controls.registerMethod('rightElement', new Marzipano.ElementPressControlMethod(viewRightElement,  'x',  velocity, friction), true);
  controls.registerMethod('inElement',    new Marzipano.ElementPressControlMethod(viewInElement,  'zoom', -velocity, friction), true);
  controls.registerMethod('outElement',   new Marzipano.ElementPressControlMethod(viewOutElement, 'zoom',  velocity, friction), true);

  function sanitize(s) {
    return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;');
  }

  var currentSceneIndex = 0; // Ajout pour suivre la pièce courante

  function switchScene(scene) {
    currentSceneIndex = scenes.indexOf(scene); // Met à jour l'index
    stopAutorotate();
    scene.view.setParameters(scene.data.initialViewParameters);
    scene.scene.switchTo();

    // Réinitialiser la vue initiale pour la nouvelle scène
    if (videoAnimation) {
      videoAnimation.initialView = {
        yaw: scene.data.initialViewParameters.yaw,
        pitch: scene.data.initialViewParameters.pitch,
        fov: scene.data.initialViewParameters.fov
      };
    }

    startAutorotate();
    updateSceneName(scene);
    updateSceneList(scene);
  }

  function updateSceneName(scene) {
    sceneNameElement.innerHTML = sanitize(scene.data.name);
  }

  function updateSceneList(scene) {
    for (var i = 0; i < sceneElements.length; i++) {
      var el = sceneElements[i];
      if (el.getAttribute('data-id') === scene.data.id) {
        el.classList.add('current');
      } else {
        el.classList.remove('current');
      }
    }
  }

  function showSceneList() {
    sceneListElement.classList.add('enabled');
    sceneListToggleElement.classList.add('enabled');
  }

  function hideSceneList() {
    sceneListElement.classList.remove('enabled');
    sceneListToggleElement.classList.remove('enabled');
  }

  function toggleSceneList() {
    sceneListElement.classList.toggle('enabled');
    sceneListToggleElement.classList.toggle('enabled');
  }

  var autoSwitchTimer = null;
  var lastYaw = null;              // Dernière position yaw
  var rotationAccumulated = 0;     // Distance totale parcourue en radians
  var visitedScenes = [];          // Historique des pièces visitées
  var exploredPaths = [];          // Chemins explorés : [{from: "id", to: "id"}, ...]
  var lastHotspotCheck = 0;        // Timestamp du dernier check
  var autoSwitchStartTime = 0;     // Timestamp de début dans la scène actuelle

  // Fonction pour vérifier si on est proche d'un hotspot
  function isNearHotspot(currentYaw, hotspotYaw, threshold) {
    // Normaliser les angles entre -PI et PI
    var diff = Math.abs(currentYaw - hotspotYaw);
    if (diff > Math.PI) {
      diff = 2 * Math.PI - diff;
    }
    return diff < threshold;
  }

  // Fonction pour vérifier si un chemin a déjà été exploré
  function hasExploredPath(fromId, toId) {
    for (var i = 0; i < exploredPaths.length; i++) {
      if (exploredPaths[i].from === fromId && exploredPaths[i].to === toId) {
        return true;
      }
    }
    return false;
  }

  // Fonction pour marquer un chemin comme exploré
  function markPathExplored(fromId, toId) {
    if (!hasExploredPath(fromId, toId)) {
      exploredPaths.push({from: fromId, to: toId});
      console.log('📝 Chemin exploré: ' + fromId + ' → ' + toId);
    }
  }

  // Fonction pour vérifier si une scène a des flèches non explorées
  function hasUnexploredArrows(sceneId) {
    var scene = scenes.find(function(s) { return s.data.id === sceneId; });
    if (!scene) return false;

    var hotspots = scene.data.linkHotspots;
    for (var i = 0; i < hotspots.length; i++) {
      if (!hasExploredPath(sceneId, hotspots[i].target)) {
        return true;
      }
    }
    return false;
  }

  // Fonction pour trouver une pièce avec des flèches non explorées (pour backtracking)
  function findRoomWithUnexploredArrows() {
    // Stratégie 1 : Priorité à Salon (point de départ principal)
    if (hasUnexploredArrows('0-salon')) {
      return '0-salon';
    }

    // Stratégie 2 : Chercher dans l'ordre de visite des pièces
    for (var i = 0; i < visitedScenes.length; i++) {
      if (hasUnexploredArrows(visitedScenes[i])) {
        return visitedScenes[i];
      }
    }

    // Stratégie 3 : Chercher dans toutes les pièces
    for (var j = 0; j < scenes.length; j++) {
      var sceneId = scenes[j].data.id;
      if (hasUnexploredArrows(sceneId)) {
        return sceneId;
      }
    }

    return null; // Tous les chemins explorés
  }

  // Fonction centralisée pour changer de scène (par ID)
  function switchToScene(targetId) {
    // Trouver l'index de la scène cible
    for (var i = 0; i < scenes.length; i++) {
      if (scenes[i].data.id === targetId) {
        currentSceneIndex = i;
        break;
      }
    }

    // Ajouter à l'historique des pièces visitées
    if (visitedScenes.indexOf(targetId) === -1) {
      visitedScenes.push(targetId);
    }

    // Changer de scène (appelle la fonction existante)
    switchScene(scenes[currentSceneIndex]);

    // Redémarrer le tracking de rotation
    rotationAccumulated = 0;
    lastYaw = null;
    autoSwitchStartTime = Date.now();

    console.log('📍 Pièces visitées: ' + visitedScenes.length + '/' + scenes.length);
  }

  // Fonction pour réinitialiser l'exploration si cycle complet
  function resetExplorationIfComplete() {
    // Calculer le nombre total de chemins possibles
    var totalPaths = 0;
    for (var i = 0; i < scenes.length; i++) {
      totalPaths += scenes[i].data.linkHotspots.length;
    }

    // Si tous les chemins explorés → reset
    if (exploredPaths.length >= totalPaths) {
      console.log('✅ Tous les chemins explorés (' + exploredPaths.length + '/' + totalPaths + ') - RESET');
      exploredPaths = [];
      visitedScenes = [];

      // Retour au Salon pour recommencer
      switchToScene('0-salon');
    }
  }

  // Fonction pour choisir intelligemment le meilleur hotspot avec support backtracking
  function chooseBestHotspotWithBacktracking(currentScene, currentYaw, threshold) {
    var hotspots = currentScene.data.linkHotspots;
    var currentSceneId = currentScene.data.id;
    var nearbyHotspots = [];

    // Étape 1 : Trouver les flèches proches (dans la vue actuelle)
    for (var i = 0; i < hotspots.length; i++) {
      var hotspot = hotspots[i];
      if (isNearHotspot(currentYaw, hotspot.yaw, threshold)) {
        nearbyHotspots.push(hotspot);
      }
    }

    // Étape 2 : Parmi les flèches proches, choisir une flèche NON explorée
    for (var j = 0; j < nearbyHotspots.length; j++) {
      var hotspot2 = nearbyHotspots[j];
      if (!hasExploredPath(currentSceneId, hotspot2.target)) {
        return {hotspot: hotspot2, needsBacktrack: false};
      }
    }

    // Étape 3 : Aucune flèche proche → vérifier si besoin de backtrack
    // Si toutes les flèches de cette pièce sont explorées → BACKTRACK
    var allExplored = true;
    for (var k = 0; k < hotspots.length; k++) {
      if (!hasExploredPath(currentSceneId, hotspots[k].target)) {
        allExplored = false;
        break;
      }
    }

    if (allExplored) {
      // BACKTRACK : trouver une pièce avec flèches non explorées
      var backtrackTarget = findRoomWithUnexploredArrows();
      if (backtrackTarget) {
        console.log('🔙 BACKTRACK nécessaire vers : ' + backtrackTarget);
        return {
          hotspot: null,
          needsBacktrack: true,
          backtrackTarget: backtrackTarget
        };
      }
    }

    return null; // Pas de changement nécessaire
  }

  // Fonction pour détecter les rotations et changer de pièce sur hotspot (avec backtracking)
  function checkAutoSwitch() {
    if (!videoAnimation || !videoAnimation.isPlaying || videoAnimation.userInteracted) {
      requestAnimationFrame(checkAutoSwitch);
      return;
    }

    var currentView = viewer.view();
    if (!currentView) {
      requestAnimationFrame(checkAutoSwitch);
      return;
    }

    var currentYaw = currentView.yaw();
    var now = Date.now();

    // Accumuler la rotation (en gérant correctement le passage -PI/+PI)
    if (lastYaw !== null) {
      var yawDiff = currentYaw - lastYaw;
      if (Math.abs(yawDiff) > Math.PI) {
        yawDiff = yawDiff > 0 ? yawDiff - 2*Math.PI : yawDiff + 2*Math.PI;
      }
      rotationAccumulated += Math.abs(yawDiff);
    }
    lastYaw = currentYaw;

    // Vérifier toutes les 100ms
    if (now - lastHotspotCheck < 100) {
      requestAnimationFrame(checkAutoSwitch);
      return;
    }
    lastHotspotCheck = now;

    // Log toutes les 500ms
    if (now - autoSwitchStartTime > 500 && (now - autoSwitchStartTime) % 500 < 100) {
      var degrees = Math.round(rotationAccumulated * 180 / Math.PI);
      var seconds = ((now - autoSwitchStartTime) / 1000).toFixed(1);
      console.log('[' + scenes[currentSceneIndex].data.name + '] Rotation: ' + degrees + '° | Temps: ' + seconds + 's');
    }

    // Sécurité : forcer changement après 15 secondes
    if (now - autoSwitchStartTime > 15000) {
      console.log('⏰ Timeout 15s atteint, force changement');
      var scene = scenes[currentSceneIndex];
      var hotspots = scene.data.linkHotspots;
      if (hotspots.length > 0) {
        switchToScene(hotspots[0].target);
        markPathExplored(scene.data.id, hotspots[0].target);
      }
      requestAnimationFrame(checkAutoSwitch);
      return;
    }

    // Après 450° de rotation : chercher une flèche
    if (rotationAccumulated >= 2.5 * Math.PI) {
      var currentScene = scenes[currentSceneIndex];
      var threshold = 1.2; // ~69° - tolérance large

      var result = chooseBestHotspotWithBacktracking(currentScene, currentYaw, threshold);

      if (result) {
        if (result.needsBacktrack) {
          // BACKTRACK : téléportation vers une pièce avec flèches non explorées
          console.log('🚀 TÉLÉPORTATION vers : ' + result.backtrackTarget);
          switchToScene(result.backtrackTarget);
          // NE PAS marquer comme exploré (on ne suit pas une flèche)

          // Vérifier si tous les chemins sont explorés
          resetExplorationIfComplete();
        } else if (result.hotspot) {
          // Navigation normale via une flèche
          var targetId = result.hotspot.target;
          console.log('→ Changement: ' + currentScene.data.name + ' → ' + targetId);
          switchToScene(targetId);
          markPathExplored(currentScene.data.id, targetId);

          // Vérifier si tous les chemins sont explorés
          resetExplorationIfComplete();
        }
      }
    }

    requestAnimationFrame(checkAutoSwitch);
  }

  function startAutoSwitchTimer() {
    stopAutoSwitchTimer();
    // Réinitialiser les compteurs de rotation
    rotationAccumulated = 0;
    lastYaw = null;
    lastHotspotCheck = 0;
    autoSwitchStartTime = Date.now();

    // Ajouter la pièce de départ à l'historique si c'est le début
    if (visitedScenes.length === 0) {
      var currentSceneId = scenes[currentSceneIndex].data.id;
      visitedScenes.push(currentSceneId);
      console.log('🏁 Démarrage depuis: ' + currentSceneId);
    }

    // Démarrer la boucle de vérification continue
    requestAnimationFrame(checkAutoSwitch);
  }

  function stopAutoSwitchTimer() {
    // Réinitialiser les compteurs
    rotationAccumulated = 0;
    lastYaw = null;
    autoSwitchStartTime = 0;
  }

  function startAutorotate() {
    if (!autorotateToggleElement.classList.contains('enabled')) {
      return;
    }
    // Utiliser l'animation vidéo au lieu de l'autorotation basique
    if (videoAnimation) {
      videoAnimation.start();
      startAutoSwitchTimer();
    }
  }

  function stopAutorotate() {
    // Arrêter l'animation vidéo
    if (videoAnimation) {
      videoAnimation.stop();
      stopAutoSwitchTimer();
    }
  }

  function toggleAutorotate() {
    if (autorotateToggleElement.classList.contains('enabled')) {
      autorotateToggleElement.classList.remove('enabled');
      stopAutorotate();
    } else {
      autorotateToggleElement.classList.add('enabled');
      startAutorotate();
    }
  }

  function createLinkHotspotElement(hotspot) {

    // Create wrapper element to hold icon and tooltip.
    var wrapper = document.createElement('div');
    wrapper.classList.add('hotspot');
    wrapper.classList.add('link-hotspot');

    // Create image element.
    var icon = document.createElement('img');
    icon.src = 'img/link.png';
    icon.classList.add('link-hotspot-icon');

    // Set rotation transform.
    var transformProperties = [ '-ms-transform', '-webkit-transform', 'transform' ];
    for (var i = 0; i < transformProperties.length; i++) {
      var property = transformProperties[i];
      icon.style[property] = 'rotate(' + hotspot.rotation + 'rad)';
    }

    // Add click event handler.
    wrapper.addEventListener('click', function() {
      switchScene(findSceneById(hotspot.target));
    });

    // Prevent touch and scroll events from reaching the parent element.
    // This prevents the view control logic from interfering with the hotspot.
    stopTouchAndScrollEventPropagation(wrapper);

    // Create tooltip element.
    var tooltip = document.createElement('div');
    tooltip.classList.add('hotspot-tooltip');
    tooltip.classList.add('link-hotspot-tooltip');
    tooltip.innerHTML = findSceneDataById(hotspot.target).name;

    wrapper.appendChild(icon);
    wrapper.appendChild(tooltip);

    return wrapper;
  }

  function createInfoHotspotElement(hotspot) {

    // Create wrapper element to hold icon and tooltip.
    var wrapper = document.createElement('div');
    wrapper.classList.add('hotspot');
    wrapper.classList.add('info-hotspot');

    // Create hotspot/tooltip header.
    var header = document.createElement('div');
    header.classList.add('info-hotspot-header');

    // Create image element.
    var iconWrapper = document.createElement('div');
    iconWrapper.classList.add('info-hotspot-icon-wrapper');
    var icon = document.createElement('img');
    icon.src = 'img/info.png';
    icon.classList.add('info-hotspot-icon');
    iconWrapper.appendChild(icon);

    // Create title element.
    var titleWrapper = document.createElement('div');
    titleWrapper.classList.add('info-hotspot-title-wrapper');
    var title = document.createElement('div');
    title.classList.add('info-hotspot-title');
    title.innerHTML = hotspot.title;
    titleWrapper.appendChild(title);

    // Create close element.
    var closeWrapper = document.createElement('div');
    closeWrapper.classList.add('info-hotspot-close-wrapper');
    var closeIcon = document.createElement('img');
    closeIcon.src = 'img/close.png';
    closeIcon.classList.add('info-hotspot-close-icon');
    closeWrapper.appendChild(closeIcon);

    // Construct header element.
    header.appendChild(iconWrapper);
    header.appendChild(titleWrapper);
    header.appendChild(closeWrapper);

    // Create text element.
    var text = document.createElement('div');
    text.classList.add('info-hotspot-text');
    text.innerHTML = hotspot.text;

    // Place header and text into wrapper element.
    wrapper.appendChild(header);
    wrapper.appendChild(text);

    // Create a modal for the hotspot content to appear on mobile mode.
    var modal = document.createElement('div');
    modal.innerHTML = wrapper.innerHTML;
    modal.classList.add('info-hotspot-modal');
    document.body.appendChild(modal);

    var toggle = function() {
      wrapper.classList.toggle('visible');
      modal.classList.toggle('visible');
    };

    // Show content when hotspot is clicked.
    wrapper.querySelector('.info-hotspot-header').addEventListener('click', toggle);

    // Hide content when close icon is clicked.
    modal.querySelector('.info-hotspot-close-wrapper').addEventListener('click', toggle);

    // Prevent touch and scroll events from reaching the parent element.
    // This prevents the view control logic from interfering with the hotspot.
    stopTouchAndScrollEventPropagation(wrapper);

    return wrapper;
  }

  // Prevent touch and scroll events from reaching the parent element.
  function stopTouchAndScrollEventPropagation(element, eventList) {
    var eventList = [ 'touchstart', 'touchmove', 'touchend', 'touchcancel',
                      'wheel', 'mousewheel' ];
    for (var i = 0; i < eventList.length; i++) {
      element.addEventListener(eventList[i], function(event) {
        event.stopPropagation();
      });
    }
  }

  function findSceneById(id) {
    for (var i = 0; i < scenes.length; i++) {
      if (scenes[i].data.id === id) {
        return scenes[i];
      }
    }
    return null;
  }

  function findSceneDataById(id) {
    for (var i = 0; i < data.scenes.length; i++) {
      if (data.scenes[i].id === id) {
        return data.scenes[i];
      }
    }
    return null;
  }

  // Display the initial scene.
  switchScene(scenes[0]);

})();
