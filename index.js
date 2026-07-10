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
  var lastHotspotCheck = 0;        // Timestamp du dernier check
  var lastChosenHotspotIndex = -1; // Dernier hotspot choisi
  var sceneStartTime = 0;          // Timestamp de début dans la scène actuelle

  // Fonction pour vérifier si on est proche d'un hotspot
  function isNearHotspot(currentYaw, hotspotYaw, threshold) {
    // Normaliser les angles entre -PI et PI
    var diff = Math.abs(currentYaw - hotspotYaw);
    if (diff > Math.PI) {
      diff = 2 * Math.PI - diff;
    }
    return diff < threshold;
  }

  // Fonction pour choisir intelligemment le meilleur hotspot
  function chooseBestHotspot(currentScene, currentYaw, threshold) {
    var hotspots = currentScene.data.linkHotspots;
    if (hotspots.length === 0) return null;

    // Filtrer les hotspots proches de la position actuelle
    var nearbyHotspots = [];
    for (var i = 0; i < hotspots.length; i++) {
      if (isNearHotspot(currentYaw, hotspots[i].yaw, threshold)) {
        nearbyHotspots.push({ hotspot: hotspots[i], index: i });
      }
    }

    // Si aucun hotspot proche, retourner null
    if (nearbyHotspots.length === 0) return null;

    // Stratégie 1 : Priorité aux pièces NON VISITÉES
    for (var j = 0; j < nearbyHotspots.length; j++) {
      var targetId = nearbyHotspots[j].hotspot.target;
      if (visitedScenes.indexOf(targetId) === -1) {
        // Pièce jamais visitée, on y va !
        lastChosenHotspotIndex = nearbyHotspots[j].index;
        return nearbyHotspots[j].hotspot;
      }
    }

    // Stratégie 2 : Toutes les pièces proches ont été visitées
    // Alterner entre les différentes flèches pour explorer différents chemins
    if (nearbyHotspots.length > 1) {
      // Trouver un hotspot différent du dernier choisi
      for (var k = 0; k < nearbyHotspots.length; k++) {
        if (nearbyHotspots[k].index !== lastChosenHotspotIndex) {
          lastChosenHotspotIndex = nearbyHotspots[k].index;
          return nearbyHotspots[k].hotspot;
        }
      }
    }

    // Stratégie 3 : Par défaut, prendre le premier hotspot proche
    lastChosenHotspotIndex = nearbyHotspots[0].index;
    return nearbyHotspots[0].hotspot;
  }

  // Fonction pour choisir un hotspot sans condition de proximité (fallback)
  function chooseBestHotspotNoProximity(currentScene) {
    var hotspots = currentScene.data.linkHotspots;
    if (hotspots.length === 0) return null;

    // Priorité 1 : Pièce non visitée
    for (var i = 0; i < hotspots.length; i++) {
      if (visitedScenes.indexOf(hotspots[i].target) === -1) {
        return hotspots[i];
      }
    }

    // Priorité 2 : Alterner entre les hotspots
    if (hotspots.length > 1) {
      var nextIndex = (lastChosenHotspotIndex + 1) % hotspots.length;
      lastChosenHotspotIndex = nextIndex;
      return hotspots[nextIndex];
    }

    // Par défaut : premier hotspot
    return hotspots[0];
  }

  // Fonction pour détecter les rotations et changer de pièce sur hotspot
  function checkAutoSwitch() {
    if (!videoAnimation || !videoAnimation.isPlaying || videoAnimation.userInteracted) {
      return;
    }

    var currentView = viewer.view();
    if (!currentView) return;

    var currentYaw = currentView.yaw();
    var currentScene = scenes[currentSceneIndex];

    // Accumuler la rotation (en gérant correctement le passage -PI/+PI)
    if (lastYaw !== null) {
      var yawDiff = currentYaw - lastYaw;

      // Si le saut est très grand (> PI), c'est qu'on a passé la frontière -PI/+PI
      // Dans ce cas, on calcule la vraie distance dans l'autre sens
      if (Math.abs(yawDiff) > Math.PI) {
        // Passage de frontière : calculer la vraie distance
        if (yawDiff > 0) {
          yawDiff = yawDiff - (2 * Math.PI);
        } else {
          yawDiff = yawDiff + (2 * Math.PI);
        }
      }

      rotationAccumulated += Math.abs(yawDiff);
    }
    lastYaw = currentYaw;

    var now = Date.now();
    var timeInScene = now - sceneStartTime;

    // SÉCURITÉ : Après 15 secondes dans la même pièce, forcer le changement
    var maxTimeInScene = 15000; // 15 secondes max
    var forceChange = timeInScene > maxTimeInScene;

    // DEBUG : Afficher la rotation accumulée (seulement toutes les 500ms)
    if (now - lastHotspotCheck > 500) {
      var rotationDegrees = (rotationAccumulated * 180 / Math.PI).toFixed(0);
      var currentSceneName = currentScene.data.name;
      console.log('[' + currentSceneName + '] Rotation: ' + rotationDegrees + '° | Temps: ' + (timeInScene/1000).toFixed(1) + 's | isPlaying: ' + videoAnimation.isPlaying + ' | userInteracted: ' + videoAnimation.userInteracted);
    }

    // Après avoir tourné d'au moins 2.5*PI radians (450° = 1 tour + 1/4), chercher un hotspot
    // On met plus que 360° pour être SÛR d'avoir fait un tour complet
    if ((rotationAccumulated >= 2.5 * Math.PI || forceChange) && currentScene.data.linkHotspots.length > 0) {
      // Vérifier seulement toutes les 150ms pour éviter les checks trop fréquents
      if (now - lastHotspotCheck < 150) {
        requestAnimationFrame(checkAutoSwitch);
        return;
      }
      lastHotspotCheck = now;

      var bestHotspot = null;

      // Si on force le changement (timeout), ne pas vérifier la proximité
      if (forceChange) {
        bestHotspot = chooseBestHotspotNoProximity(currentScene);
      } else {
        // Seuil de détection réduit pour plus de précision (changement pile sur flèche)
        var threshold = 0.4; // ~23 degrés de tolérance (plus précis)

        // Choisir intelligemment le prochain hotspot
        bestHotspot = chooseBestHotspot(currentScene, currentYaw, threshold);

        // FALLBACK : Si on a fait plus d'un tour et demi (3*PI) et toujours rien trouvé
        // Forcer le changement vers n'importe quel hotspot intelligent
        if (!bestHotspot && rotationAccumulated >= 3 * Math.PI) {
          bestHotspot = chooseBestHotspotNoProximity(currentScene);
        }
      }

      if (bestHotspot) {
        var targetScene = findSceneById(bestHotspot.target);
        if (targetScene) {
          // Ajouter la pièce actuelle à l'historique AVANT de vérifier
          var currentSceneId = currentScene.data.id;
          if (visitedScenes.indexOf(currentSceneId) === -1) {
            visitedScenes.push(currentSceneId);
          }

          // Si on a visité toutes les pièces, réinitialiser l'historique
          if (visitedScenes.length >= scenes.length) {
            visitedScenes = [];
          }

          // Changer de pièce !
          rotationAccumulated = 0;
          lastYaw = null;
          sceneStartTime = Date.now();
          switchScene(targetScene);
          return;
        }
      }
    }

    // Continuer à vérifier
    requestAnimationFrame(checkAutoSwitch);
  }

  function startAutoSwitchTimer() {
    stopAutoSwitchTimer();
    // Réinitialiser les compteurs de rotation
    rotationAccumulated = 0;
    lastYaw = null;
    lastHotspotCheck = 0;
    sceneStartTime = Date.now();

    // NE PAS ajouter la pièce actuelle à l'historique au démarrage
    // Elle sera ajoutée quand on la quitte

    // Démarrer la boucle de vérification continue
    requestAnimationFrame(checkAutoSwitch);
  }

  function stopAutoSwitchTimer() {
    // Réinitialiser les compteurs
    rotationAccumulated = 0;
    lastYaw = null;
    sceneStartTime = 0;
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
