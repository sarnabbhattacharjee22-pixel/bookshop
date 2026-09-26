/* ==========================================================================
   MemeForge | js/app.js
   Application Entry Point & Global Event Bindings
   ========================================================================== */

let isInitializing = false;

/**
 * Normalizes the global application state before any modules initialize.
 * Ensures required arrays (like stickers, templates) always exist, 
 * preventing "undefined" crashes if external data files fail to load.
 */
function normalizeAppState() {
    console.log("MemeForge: Normalizing application state...");
    
    if (typeof window.MemeData === 'undefined') {
        window.MemeData = {};
    }

    // Guarantee the stickers array exists with core fallback library
    if (!Array.isArray(window.MemeData.stickers)) {
        window.MemeData.stickers = [
            // Emojis
            { id: 'emoji-laugh', char: '😂', category: 'emojis' },
            { id: 'emoji-skull', char: '💀', category: 'emojis' },
            { id: 'emoji-fire', char: '🔥', category: 'emojis' },
            { id: 'emoji-100', char: '💯', category: 'emojis' },
            { id: 'emoji-clown', char: '🤡', category: 'emojis' },
            { id: 'emoji-cry', char: '😭', category: 'emojis' },
            { id: 'emoji-sunglasses', char: '😎', category: 'emojis' },
            { id: 'emoji-eyes', char: '👀', category: 'emojis' },
            { id: 'emoji-heart', char: '❤️', category: 'emojis' },
            { id: 'emoji-thinking', char: '🤔', category: 'emojis' },
            { id: 'emoji-sweat', char: '😅', category: 'emojis' },
            { id: 'emoji-rocket', char: '🚀', category: 'emojis' },
            // Props
            { id: 'prop-arrow-red', char: '➡️', category: 'props' },
            { id: 'prop-check', char: '✅', category: 'props' },
            { id: 'prop-x', char: '❌', category: 'props' },
            { id: 'prop-alert', char: '⚠️', category: 'props' },
            { id: 'prop-sparkles', char: '✨', category: 'props' },
            { id: 'prop-star', char: '⭐', category: 'props' },
            { id: 'prop-crown', char: '👑', category: 'props' },
            { id: 'prop-money', char: '💸', category: 'props' },
            // Text Faces
            { id: 'rage-lenny', char: '( ͡° ͜ʖ ͡°)', category: 'rage' },
            { id: 'rage-shrug', char: '¯\\_(ツ)_/¯', category: 'rage' },
            { id: 'rage-tableflip', char: '(╯°□°）╯︵ ┻━┻', category: 'rage' },
            { id: 'rage-look', char: 'ಠ_ಠ', category: 'rage' },
            { id: 'rage-fight', char: '(ง\'̀-\'́)ง', category: 'rage' },
            { id: 'rage-yay', char: '\\( ﾟヮﾟ)/', category: 'rage' }
        ];
    }

    // Guarantee templates array exists for the fallback provider
    if (!Array.isArray(window.MemeData.templates)) {
        window.MemeData.templates = [];
    }
}

/**
 * Robust initialization system with dependency checks, timeouts, and error handling.
 */
async function initializeApp() {
    if (isInitializing) return;
    isInitializing = true;
    
    const loader = document.getElementById('global-loader');
    const normalState = document.getElementById('loader-content-normal');
    const errorState = document.getElementById('loader-content-error');
    const errorMsg = document.getElementById('loader-error-message');
    
    // Reset loader UI to normal state
    if (normalState) normalState.classList.remove('hidden');
    if (errorState) errorState.classList.add('hidden');
    if (loader) {
        loader.style.display = 'flex';
        loader.classList.remove('fade-out');
    }
    
    try {
        const timeout = new Promise((_, reject) => {
            setTimeout(() => reject(new Error("Initialization timed out. A required resource took too long to load.")), 8000);
        });
        
        const initProcess = async () => {
            console.log("MemeForge: Starting initialization sequence...");

            // 0. Establish Guaranteed Application State (Prevents undefined property crashes)
            normalizeAppState();

            // 1. Verify External Dependencies (Fabric.js is critical for Canvas)
            if (typeof fabric === 'undefined') {
                throw new Error("Fabric.js failed to load from CDN. Please check your internet connection.");
            }

            // 2. Initialize Core UI Systems
            if (!window.MemeUI) throw new Error("UI module (ui.js) failed to load.");
            MemeUI.init();

            // 3. Initialize Editor Tools & Bindings (CRITICAL: MUST BE BEFORE CANVAS)
            if (!window.MemeEditor) throw new Error("Editor module (meme-editor.js) failed to load.");
            MemeEditor.init();

            // 4. Initialize Canvas Engine
            if (!window.MemeCanvas) throw new Error("Canvas module (canvas.js) failed to load.");
            MemeCanvas.init('meme-canvas', '.canvas-wrapper-outer', {
                onSelectionChange: (activeObject) => {
                    if (window.MemeEditor) MemeEditor.handleSelectionChange(activeObject);
                },
                onStateChange: (state) => {
                    if (window.MemeUI) MemeUI.updateHistoryButtons(state);
                },
                onLayersChange: (layers) => {
                    if (window.MemeEditor) MemeEditor.handleLayersChange(layers);
                }
            });

            // 5. Initialize Massive Templates Data & API Providers
            // Checks if Template library exists before initializing, otherwise falls back gracefully
            if (window.MemeTemplates) {
                MemeTemplates.init();
            } else {
                console.warn("MemeForge: Templates module not loaded. Dynamic library disabled.");
            }

            // 6. Initialize Download & Export Logic
            if (window.MemeDownload) MemeDownload.init();

            // 7. Setup Global Event Listeners
            setupKeyboardShortcuts();
            setupBeforeUnload();
            
            console.log("MemeForge: Initialization successful.");
            return true;
        };

        // Race the initialization against the 8-second timeout
        await Promise.race([initProcess(), timeout]);
        
        // Success: Hide the loader gracefully
        if (loader) {
            loader.classList.add('fade-out');
            setTimeout(() => {
                loader.style.display = 'none';
            }, 500);
        }
        
    } catch (error) {
        // Failure: Show Error State & Retry Button
        console.error("MemeForge Initialization Error:", error);
        
        if (normalState) normalState.classList.add('hidden');
        if (errorState) errorState.classList.remove('hidden');
        if (errorMsg) errorMsg.innerText = error.message || "An unexpected error occurred while starting the application.";
    } finally {
        isInitializing = false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Bind the retry button
    const retryBtn = document.getElementById('btn-retry-init');
    if (retryBtn) {
        retryBtn.addEventListener('click', initializeApp);
    }
    
    // Begin initialization
    initializeApp();
});

/**
 * Sets up application-wide keyboard shortcuts for the editor
 */
function setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
        const editorView = document.getElementById('view-editor');
        if (!editorView || !editorView.classList.contains('active')) return;

        const isInputActive = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);
        
        if (e.ctrlKey || e.metaKey) {
            if (e.key.toLowerCase() === 'z') {
                e.preventDefault();
                if (window.MemeCanvas) MemeCanvas.undo();
                return;
            }
            if (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey)) {
                e.preventDefault();
                if (window.MemeCanvas) MemeCanvas.redo();
                return;
            }
            if (e.key.toLowerCase() === 'd' && !isInputActive) {
                e.preventDefault();
                if (window.MemeCanvas) MemeCanvas.duplicateSelected();
                return;
            }
            if (e.key.toLowerCase() === 's') {
                e.preventDefault();
                const saveBtn = document.getElementById('btn-save-local');
                if (saveBtn) saveBtn.click();
                return;
            }
            if (e.key === '+' || e.key === '=') {
                e.preventDefault();
                if (window.MemeCanvas) MemeCanvas.zoomIn();
                return;
            }
            if (e.key === '-') {
                e.preventDefault();
                if (window.MemeCanvas) MemeCanvas.zoomOut();
                return;
            }
        }

        if ((e.key === 'Delete' || e.key === 'Backspace') && !isInputActive) {
            e.preventDefault();
            if (window.MemeCanvas) MemeCanvas.deleteSelected();
        }
    });

    document.addEventListener('gesturestart', function (e) {
        e.preventDefault(); 
    });
}

/**
 * Prevents the user from accidentally closing the tab while editing
 */
function setupBeforeUnload() {
    window.addEventListener('beforeunload', (e) => {
        const editorView = document.getElementById('view-editor');
        if (editorView && editorView.classList.contains('active')) {
            if (window.MemeCanvas) {
                const canvas = MemeCanvas.getCanvas();
                if (canvas && canvas.getObjects().length > 1) {
                    const message = "You have unsaved changes. Are you sure you want to leave?";
                    e.returnValue = message; 
                    return message;
                }
            }
        }
    });
}