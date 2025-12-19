/* ---------------------------------------------------------
   prm_patterns.js
   Loads PRM library from prm_library.json (preferred) or JS fallback.
   To force only new patterns, keep allowJsFallback=false (default) and ensure prm_library.json exists.
----------------------------------------------------------- */

class PRMPatternLibrary {
    constructor(options = {}) {
        this.library = [];
        this.loaded = false;
        // Default: allow JS fallback so file:// or blocked JSON fetch still works
        this.allowJsFallback = options.allowJsFallback ?? true;
    }

    /* -----------------------------------------------
       Fetch JSON, optionally fallback to window.PRM_LIBRARY
    ------------------------------------------------ */
    async loadLibrary() {
        const tryFetchJson = async () => {
            if (typeof fetch !== "function") return null;
            try {
                const res = await fetch("prm_library.json", { cache: "no-store" });
                if (!res.ok) throw new Error(`status ${res.status}`);
                const data = await res.json();
                if (!Array.isArray(data)) throw new Error("JSON is not an array.");
                window.PRM_LIBRARY = data; // compatibility
                console.log("PRM Library loaded from JSON:", data.length);
                return data;
            } catch (e) {
                console.warn("PRM JSON fetch failed:", e.message);
                return null;
            }
        };

        try {
            let data = await tryFetchJson();

            if (!data) {
                if (this.allowJsFallback) {
                    if (!window.PRM_LIBRARY) {
                        throw new Error("PRM library not found. Provide prm_library.json or enable JS fallback.");
                    }
                    if (!Array.isArray(window.PRM_LIBRARY)) {
                        throw new Error("Invalid PRM library format: expected array.");
                    }
                    data = window.PRM_LIBRARY;
                    console.log("PRM Library loaded from JS fallback:", data.length);
                } else {
                    throw new Error("PRM JSON not available and JS fallback disabled.");
                }
            }

            this.library = data;
            this.loaded = true;
            return true;
        } catch (err) {
            console.error("Error loading PRM library:", err);
            this.loaded = false;
            return false;
        }
    }

    /* ----------------------------------------------- */
    isReady() {
        return this.loaded && Array.isArray(this.library) && this.library.length > 0;
    }

    /* ----------------------------------------------- */
    selectStudyPatterns(n = 12) {
        if (!this.isReady()) {
            throw new Error("PRM Library not loaded.");
        }

        const arr = this.library.slice();
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr.slice(0, n);
    }

    /* ----------------------------------------------- */
    getNovelPattern(generator) {
        if (!generator || typeof generator.generatePattern !== "function") {
            console.error("Novel pattern generator missing.");
            return null;
        }
        return generator.generatePattern();
    }

    /* ----------------------------------------------- */
    getById(id) {
        if (!this.isReady()) return null;
        return this.library.find(p => p.id === id) || null;
    }
}

window.PRMPatternLibrary = PRMPatternLibrary;
