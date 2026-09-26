/* ==========================================================================
   MemeForge | js/storage.js
   Local Storage Management (Zero-cost Database)
   ========================================================================== */

/**
 * Handles all persistent local data using the browser's localStorage API.
 * This ensures the application remains zero-cost and offline-capable without
 * relying on external databases.
 */
window.MemeStorage = {
    // Keys used in localStorage
    KEYS: {
        MEMES: 'memeforge_saved_memes',
        THEME: 'memeforge_theme'
    },

    /* --- THEME PREFERENCES --- */
    
    /**
     * Saves the user's theme preference.
     * @param {string} theme - 'dark' or 'light'
     */
    saveTheme(theme) {
        try {
            localStorage.setItem(this.KEYS.THEME, theme);
        } catch (e) {
            console.warn("MemeForge Storage: Could not save theme preference.", e);
        }
    },

    /**
     * Retrieves the saved theme preference.
     * @returns {string} The saved theme or 'dark' default.
     */
    getTheme() {
        try {
            return localStorage.getItem(this.KEYS.THEME) || 'dark';
        } catch (e) {
            console.warn("MemeForge Storage: Could not read theme preference.", e);
            return 'dark';
        }
    },

    /* --- MEME MANAGEMENT --- */
    
    /**
     * Retrieves all locally saved memes.
     * @returns {Array} Array of meme objects.
     */
    getSavedMemes() {
        try {
            const storedData = localStorage.getItem(this.KEYS.MEMES);
            return storedData ? JSON.parse(storedData) : [];
        } catch (e) {
            console.error("MemeForge Storage: Failed to parse saved memes.", e);
            return [];
        }
    },

    /**
     * Retrieves a single saved meme by its ID.
     * @param {string} id - The ID of the meme to retrieve.
     * @returns {Object|null} The meme object or null if not found.
     */
    getMemeById(id) {
        const memes = this.getSavedMemes();
        return memes.find(m => m.id === id) || null;
    },

    /**
     * Saves a new meme or updates an existing one.
     * Catching QuotaExceededError is critical here because base64 image data 
     * can quickly fill the ~5MB localStorage limit.
     * 
     * @param {Object} memeData - Object containing meme details (name, imageDataUrl, canvasState).
     * @returns {Object} { success: boolean, id?: string, error?: string }
     */
    saveMeme(memeData) {
        try {
            const memes = this.getSavedMemes();
            
            // Generate unique ID and timestamp if it's a new save
            if (!memeData.id) {
                memeData.id = 'meme_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            }
            if (!memeData.date) {
                memeData.date = new Date().toISOString();
            }

            // Check if we are updating an existing meme
            const existingIndex = memes.findIndex(m => m.id === memeData.id);
            if (existingIndex >= 0) {
                memes[existingIndex] = memeData;
            } else {
                // Add new memes to the beginning of the array
                memes.unshift(memeData);
            }

            // Attempt to save to localStorage
            localStorage.setItem(this.KEYS.MEMES, JSON.stringify(memes));
            
            return { success: true, id: memeData.id };

        } catch (e) {
            console.error("MemeForge Storage: Save failed.", e);
            
            // Handle Storage Quota limits gracefully
            if (this._isQuotaExceeded(e)) {
                return { 
                    success: false, 
                    error: 'Browser storage is full. Please delete some saved memes in "My Memes" to free up space.' 
                };
            }
            
            return { 
                success: false, 
                error: 'An unexpected error occurred while saving the meme.' 
            };
        }
    },

    /**
     * Deletes a saved meme by ID.
     * @param {string} id - The ID of the meme to delete.
     * @returns {boolean} True if successful, false otherwise.
     */
    deleteMeme(id) {
        try {
            let memes = this.getSavedMemes();
            const originalLength = memes.length;
            
            memes = memes.filter(m => m.id !== id);
            
            if (memes.length < originalLength) {
                localStorage.setItem(this.KEYS.MEMES, JSON.stringify(memes));
                return true;
            }
            return false;
        } catch (e) {
            console.error("MemeForge Storage: Delete failed.", e);
            return false;
        }
    },

    /**
     * Clears all saved memes from local storage.
     * @returns {boolean} True if successful, false otherwise.
     */
    clearAllMemes() {
        try {
            localStorage.removeItem(this.KEYS.MEMES);
            return true;
        } catch (e) {
            console.error("MemeForge Storage: Clear all failed.", e);
            return false;
        }
    },

    /**
     * Helper to determine if an error is a localStorage quota exceeded error.
     * Different browsers throw different error codes for this.
     * @private
     */
    _isQuotaExceeded(e) {
        let quotaExceeded = false;
        if (e) {
            if (e.code) {
                switch (e.code) {
                    case 22: // QUOTA_EXCEEDED_ERR
                        quotaExceeded = true;
                        break;
                    case 1014: // Firefox
                        if (e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
                            quotaExceeded = true;
                        }
                        break;
                }
            } else if (e.number === -2147024882) { // IE8
                quotaExceeded = true;
            }
            
            // Fallback for modern browsers that might just use the name
            if (e.name === 'QuotaExceededError') {
                quotaExceeded = true;
            }
        }
        return quotaExceeded;
    }
};