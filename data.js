var APP_DATA = {
  "scenes": [
    {
      "id": "0-salon",
      "name": "Salon",
      "levels": [
        {
          "tileSize": 256,
          "size": 256,
          "fallbackOnly": true
        },
        {
          "tileSize": 512,
          "size": 512
        },
        {
          "tileSize": 512,
          "size": 1024
        },
        {
          "tileSize": 512,
          "size": 2048
        }
      ],
      "faceSize": 2000,
      "initialViewParameters": {
        "yaw": 0,
        "pitch": 0,
        "fov": 1.3468096107558716
      },
      "linkHotspots": [
        {
          "yaw": -1.9748945524535877,
          "pitch": 0.29267811391408927,
          "rotation": 6.283185307179586,
          "target": "3-terrasse"
        },
        {
          "yaw": -1.6566839552439898,
          "pitch": 0.41585411686258134,
          "rotation": 1.5707963267948966,
          "target": "1-ch-coucher"
        }
      ],
      "infoHotspots": []
    },
    {
      "id": "1-ch-coucher",
      "name": "Ch-coucher",
      "levels": [
        {
          "tileSize": 256,
          "size": 256,
          "fallbackOnly": true
        },
        {
          "tileSize": 512,
          "size": 512
        },
        {
          "tileSize": 512,
          "size": 1024
        },
        {
          "tileSize": 512,
          "size": 2048
        }
      ],
      "faceSize": 2000,
      "initialViewParameters": {
        "pitch": 0,
        "yaw": 0,
        "fov": 1.5707963267948966
      },
      "linkHotspots": [
        {
          "yaw": -1.8595589990062216,
          "pitch": 0.2906537018702018,
          "rotation": 0,
          "target": "0-salon"
        },
        {
          "yaw": 2.3899341223321766,
          "pitch": 0.17628776264797352,
          "rotation": 0,
          "target": "2-douche"
        }
      ],
      "infoHotspots": []
    },
    {
      "id": "2-douche",
      "name": "Douche",
      "levels": [
        {
          "tileSize": 256,
          "size": 256,
          "fallbackOnly": true
        },
        {
          "tileSize": 512,
          "size": 512
        },
        {
          "tileSize": 512,
          "size": 1024
        },
        {
          "tileSize": 512,
          "size": 2048
        }
      ],
      "faceSize": 2000,
      "initialViewParameters": {
        "pitch": 0,
        "yaw": 0,
        "fov": 1.5707963267948966
      },
      "linkHotspots": [
        {
          "yaw": 2.8110767231450673,
          "pitch": 0.13257969192654429,
          "rotation": 0,
          "target": "1-ch-coucher"
        }
      ],
      "infoHotspots": []
    },
    {
      "id": "3-terrasse",
      "name": "Terrasse",
      "levels": [
        {
          "tileSize": 256,
          "size": 256,
          "fallbackOnly": true
        },
        {
          "tileSize": 512,
          "size": 512
        },
        {
          "tileSize": 512,
          "size": 1024
        },
        {
          "tileSize": 512,
          "size": 2048
        }
      ],
      "faceSize": 2000,
      "initialViewParameters": {
        "pitch": 0,
        "yaw": 0,
        "fov": 1.5707963267948966
      },
      "linkHotspots": [
        {
          "yaw": 1.439245152678799,
          "pitch": 0.004258283598176149,
          "rotation": 0,
          "target": "4-cuisine"
        }
      ],
      "infoHotspots": []
    },
    {
      "id": "4-cuisine",
      "name": "Cuisine",
      "levels": [
        {
          "tileSize": 256,
          "size": 256,
          "fallbackOnly": true
        },
        {
          "tileSize": 512,
          "size": 512
        },
        {
          "tileSize": 512,
          "size": 1024
        },
        {
          "tileSize": 512,
          "size": 2048
        }
      ],
      "faceSize": 2000,
      "initialViewParameters": {
        "pitch": 0,
        "yaw": 0,
        "fov": 1.5707963267948966
      },
      "linkHotspots": [
        {
          "yaw": 2.467927866354784,
          "pitch": -0.12581775592687627,
          "rotation": 4.71238898038469,
          "target": "3-terrasse"
        }
      ],
      "infoHotspots": []
    }
  ],
  "name": "Project Title",
  "settings": {
    "mouseViewMode": "drag",
    "autorotateEnabled": true,
    "fullscreenButton": false,
    "viewControlButtons": false
  }
};
