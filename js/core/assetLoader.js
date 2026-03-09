// ===================== ASSET LOADER =====================
// Loads and caches sprite/tile/entity images from manifest.json.
// Returns null for missing assets so renderers fall back to procedural.

const AssetLoader = {
  _cache: {},       // key → Image
  _ready: {},       // key → boolean
  _manifest: null,  // parsed manifest.json
  _totalLoaded: 0,
  _totalAssets: 0,
  _basePath: 'assets/',
  _sceneAssets: {}, // sceneName → [keys]
  _initialized: false,

  /**
   * Initialize: fetch manifest and preload all registered assets.
   * Call once at startup (before game loop).
   */
  async init() {
    try {
      const resp = await fetch(this._basePath + 'manifest.json?v=' + Date.now());
      this._manifest = await resp.json();
    } catch (e) {
      console.warn('[AssetLoader] No manifest.json found, running fully procedural.');
      this._manifest = { sprites: {}, tiles: {}, entities: {}, frameSize: {} };
    }

    // Collect all assets to preload
    const allAssets = {};
    for (const category of ['sprites', 'entities']) {
      const section = this._manifest[category] || {};
      for (const key in section) {
        allAssets[key] = this._basePath + section[key];
      }
    }
    // Tiles are scene-based — index them but don't preload yet
    const tileSection = this._manifest.tiles || {};
    for (const key in tileSection) {
      if (!this._sceneAssets[key]) this._sceneAssets[key] = [];
      this._sceneAssets[key].push({ key: 'tile_' + key, path: this._basePath + tileSection[key] });
    }

    // Preload sprites + entities (non-tile assets)
    this._totalAssets = Object.keys(allAssets).length;
    if (this._totalAssets === 0) {
      this._initialized = true;
      return;
    }

    const promises = [];
    for (const key in allAssets) {
      promises.push(this._loadImage(key, allAssets[key]));
    }
    await Promise.all(promises);
    this._initialized = true;
    console.log('[AssetLoader] Loaded ' + this._totalLoaded + '/' + this._totalAssets + ' assets.');
  },

  /**
   * Preload tileset assets for a specific scene.
   * Call on scene transition.
   */
  async preloadScene(sceneName) {
    const assets = this._sceneAssets[sceneName];
    if (!assets || assets.length === 0) return;

    const promises = [];
    for (const asset of assets) {
      if (!this._cache[asset.key]) {
        this._totalAssets++;
        promises.push(this._loadImage(asset.key, asset.path));
      }
    }
    if (promises.length > 0) {
      await Promise.all(promises);
    }
  },

  /**
   * Get a loaded Image by key. Returns null if not loaded (use procedural fallback).
   */
  get(key) {
    return (this._ready[key] && this._cache[key]) || null;
  },

  /**
   * Get a tileset Image by scene name. Returns null if not loaded.
   */
  getTileset(sceneName) {
    return this.get('tile_' + sceneName);
  },

  /**
   * Get source rect for a spritesheet frame.
   * @param {string} key - Asset key
   * @param {number} col - Frame column (0-3)
   * @param {number} row - Direction row (0=down, 1=up, 2=left, 3=right)
   * @param {string} [sizeType='default'] - Frame size type from manifest
   * @returns {{ img, sx, sy, sw, sh } | null}
   */
  getFrame(key, col, row, sizeType) {
    const img = this.get(key);
    if (!img) return null;

    const sizes = this._manifest.frameSize || {};
    const size = sizes[sizeType || 'default'] || sizes['default'] || [48, 48];
    const sw = size[0];
    const sh = size[1];

    return {
      img: img,
      sx: col * sw,
      sy: row * sh,
      sw: sw,
      sh: sh
    };
  },

  /**
   * Check if all preloaded assets are ready.
   */
  ready() {
    return this._totalAssets === 0 || this._totalLoaded >= this._totalAssets;
  },

  /**
   * Loading progress (0 to 1).
   */
  progress() {
    return this._totalAssets ? this._totalLoaded / this._totalAssets : 1;
  },

  /**
   * Internal: load a single image.
   */
  _loadImage(key, src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        this._cache[key] = img;
        this._ready[key] = true;
        this._totalLoaded++;
        resolve(true);
      };
      img.onerror = () => {
        console.warn('[AssetLoader] Failed to load: ' + src);
        this._ready[key] = false;
        this._totalLoaded++;
        resolve(false);
      };
      img.src = src;
    });
  }
};

// Auto-initialize on load
AssetLoader.init();
