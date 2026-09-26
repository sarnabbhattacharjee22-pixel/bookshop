/* ==========================================================================
   MemeForge | js/canvas.js
   Core Canvas Rendering and Manipulation (Powered by Fabric.js)
   ========================================================================== */

/**
 * The MemeCanvas object encapsulates all Fabric.js interactions.
 * It provides a clean API for the UI to interact with the canvas without
 * needing to know about Fabric.js internals.
 */
window.MemeCanvas = (function() {
    // --- Internal State ---
    let canvas = null;
    let canvasElement = null;
    let wrapperElement = null;
    
    // History (Undo/Redo) State
    let history = [];
    let historyIndex = -1;
    let historyProcessing = false;
    let maxHistory = 30; // Limit history to prevent memory leaks

    // Callbacks
    let onSelectionChangeCB = null;
    let onStateChangeCB = null;
    let onLayersChangeCB = null;

    // Viewport & Zoom
    let currentZoom = 1;
    let baseCanvasWidth = 0;
    let baseCanvasHeight = 0;

    // Constants
    const MAX_EXPORT_DIMENSION = 2000; // Prevent canvas from being too huge
    
    // --- Helper Functions ---
    
    /**
     * Generates a unique ID for canvas objects (useful for layer management)
     */
    const generateId = () => 'obj_' + Math.random().toString(36).substr(2, 9);

    /**
     * Calculates the CSS transform scale needed to fit the canvas within its wrapper
     */
    const calculateFitZoom = () => {
        if (!canvas || !wrapperElement) return 1;
        
        // Get wrapper dimensions with some padding (20px on all sides = 40px)
        const wrapperWidth = wrapperElement.clientWidth - 40;
        const wrapperHeight = wrapperElement.clientHeight - 40;
        
        if (wrapperWidth <= 0 || wrapperHeight <= 0) return 1;

        const widthRatio = wrapperWidth / baseCanvasWidth;
        const heightRatio = wrapperHeight / baseCanvasHeight;
        
        // Use the smaller ratio to ensure it fits entirely, but cap at 1 (don't scale up past 100%)
        let zoom = Math.min(widthRatio, heightRatio, 1);
        
        // On very small screens, allow scaling down further
        return Math.max(0.1, zoom);
    };

    /**
     * Applies CSS transform to the canvas container for zooming
     * This avoids messing with Fabric's internal coordinates which causes issues on mobile
     */
    const applyVisualZoom = (zoomLevel) => {
        if (!canvasElement) return;
        currentZoom = zoomLevel;
        
        // Apply CSS transform to the container
        const container = canvasElement.parentElement;
        if (container) {
            container.style.transform = `scale(${currentZoom})`;
        }

        // Notify UI to update zoom percentage text
        const zoomText = document.getElementById('zoom-level');
        if (zoomText) {
            zoomText.innerText = Math.round(currentZoom * 100) + '%';
        }
    };

    /**
     * Saves the current canvas state to history array
     */
    const saveHistoryState = () => {
        if (historyProcessing || !canvas) return;
        
        // We need to store custom properties like 'id'
        const state = canvas.toJSON(['id', 'name', 'selectable', 'isBackground']);
        
        // If we are not at the end of the history, discard future states
        if (historyIndex < history.length - 1) {
            history = history.slice(0, historyIndex + 1);
        }
        
        history.push(JSON.stringify(state));
        
        // Enforce max history length
        if (history.length > maxHistory) {
            history.shift();
        } else {
            historyIndex++;
        }
        
        notifyStateChange();
        notifyLayersChange();
    };

    /**
     * Notifies UI about selection changes
     */
    const notifySelectionChange = () => {
        if (typeof onSelectionChangeCB === 'function' && canvas) {
            const activeObject = canvas.getActiveObject();
            onSelectionChangeCB(activeObject);
        }
    };

    /**
     * Notifies UI about state changes (for Undo/Redo buttons)
     */
    const notifyStateChange = () => {
        if (typeof onStateChangeCB === 'function') {
            onStateChangeCB({
                canUndo: historyIndex > 0,
                canRedo: historyIndex < history.length - 1
            });
        }
    };

    /**
     * Notifies UI about layer changes
     */
    const notifyLayersChange = () => {
        if (typeof onLayersChangeCB === 'function' && canvas) {
            const objects = canvas.getObjects().map(obj => ({
                id: obj.id,
                type: obj.type,
                text: obj.text || (obj.type === 'image' ? 'Image' : 'Element'),
                isBackground: obj.isBackground || false
            }));
            // Reverse so top layer is first in the list
            onLayersChangeCB(objects.reverse());
        }
    };

    // --- Public API ---
    return {
        /**
         * Initializes the Fabric canvas
         */
        init: function(canvasId, wrapperSelector, callbacks = {}) {
            canvasElement = document.getElementById(canvasId);
            wrapperElement = document.querySelector(wrapperSelector);
            
            if (!canvasElement) {
                console.error("MemeForge Canvas: Canvas element not found!");
                return;
            }

            // Setup callbacks
            onSelectionChangeCB = callbacks.onSelectionChange;
            onStateChangeCB = callbacks.onStateChange;
            onLayersChangeCB = callbacks.onLayersChange;

            // Initialize Fabric
            canvas = new fabric.Canvas(canvasId, {
                preserveObjectStacking: true, // Keeps selection from jumping to top layer
                backgroundColor: '#ffffff',
                selection: true, // Allow multi-selection
            });

            // Customize Fabric Selection Styling (Modern look)
            fabric.Object.prototype.set({
                transparentCorners: false,
                cornerColor: '#6366f1',
                cornerStrokeColor: '#ffffff',
                borderColor: '#6366f1',
                cornerSize: 12,
                padding: 10,
                cornerStyle: 'circle',
                borderDashArray: [4, 4]
            });

            // Event Listeners
            canvas.on('selection:created', notifySelectionChange);
            canvas.on('selection:updated', notifySelectionChange);
            canvas.on('selection:cleared', notifySelectionChange);
            
            canvas.on('object:modified', saveHistoryState);
            canvas.on('object:added', (e) => {
                // Don't save history if we are in the middle of undo/redo processing
                if (!historyProcessing) saveHistoryState();
            });
            canvas.on('object:removed', (e) => {
                if (!historyProcessing) saveHistoryState();
            });

            // Handle window resize to adjust visual zoom
            window.addEventListener('resize', () => {
                if (canvas && baseCanvasWidth > 0) {
                    this.fitToScreen();
                }
            });

            // Initial blank state
            this.setDimensions(800, 800);
            saveHistoryState();
        },

        /**
         * Sets canvas actual dimensions and recalculates visual zoom
         */
        setDimensions: function(width, height) {
            if (!canvas) return;
            baseCanvasWidth = width;
            baseCanvasHeight = height;
            canvas.setWidth(width);
            canvas.setHeight(height);
            this.fitToScreen();
        },

        /**
         * Loads a meme template image onto the canvas
         */
        loadTemplate: function(url, callback) {
            if (!canvas) return;
            
            // Show loading if available globally
            const loader = document.getElementById('global-loader');
            if (loader) {
                loader.querySelector('p').innerText = "Loading Template...";
                loader.classList.remove('fade-out');
            }

            // Important: crossOrigin 'anonymous' is required to export images loaded from external URLs
            fabric.Image.fromURL(url, (img) => {
                if (!img) {
                    console.error("MemeForge Canvas: Failed to load template image.");
                    if (loader) loader.classList.add('fade-out');
                    return;
                }

                // Calculate dimensions (cap at MAX_EXPORT_DIMENSION)
                let scale = 1;
                if (img.width > MAX_EXPORT_DIMENSION || img.height > MAX_EXPORT_DIMENSION) {
                    const ratio = Math.min(MAX_EXPORT_DIMENSION / img.width, MAX_EXPORT_DIMENSION / img.height);
                    scale = ratio;
                }

                const finalWidth = img.width * scale;
                const finalHeight = img.height * scale;

                this.setDimensions(finalWidth, finalHeight);

                // Setup image properties
                img.set({
                    scaleX: scale,
                    scaleY: scale,
                    originX: 'center',
                    originY: 'center',
                    left: finalWidth / 2,
                    top: finalHeight / 2
                });

                // Clear previous canvas and set as background
                canvas.clear();
                canvas.setBackgroundColor('#ffffff', canvas.renderAll.bind(canvas));
                canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));

                // Reset History
                history = [];
                historyIndex = -1;
                saveHistoryState();

                if (loader) loader.classList.add('fade-out');
                if (callback) callback();
                
            }, { crossOrigin: 'anonymous' });
        },

        /**
         * Adds an image from a local file upload to the canvas
         */
        addUserImage: function(file) {
            if (!canvas || !file) return;

            const reader = new FileReader();
            reader.onload = (f) => {
                const data = f.target.result;
                fabric.Image.fromURL(data, (img) => {
                    
                    // Scale down if it's too huge
                    if (img.width > baseCanvasWidth) {
                        img.scaleToWidth(baseCanvasWidth * 0.8);
                    }

                    img.set({
                        id: generateId(),
                        left: baseCanvasWidth / 2,
                        top: baseCanvasHeight / 2,
                        originX: 'center',
                        originY: 'center',
                    });

                    canvas.add(img);
                    canvas.setActiveObject(img);
                    canvas.renderAll();
                });
            };
            reader.readAsDataURL(file);
        },

        /**
         * Adds a text object to the canvas
         */
        addText: function(textString = "TOP TEXT", options = {}) {
            if (!canvas) return;

            const defaultFontSize = Math.min(baseCanvasWidth, baseCanvasHeight) * 0.1; // 10% of canvas

            const textProps = Object.assign({
                id: generateId(),
                left: baseCanvasWidth / 2,
                top: baseCanvasHeight / 2,
                originX: 'center',
                originY: 'center',
                fontFamily: 'Impact',
                fill: '#ffffff',
                stroke: '#000000',
                strokeWidth: Math.max(2, defaultFontSize * 0.05), // Adaptive stroke
                fontSize: defaultFontSize,
                fontWeight: 'bold',
                textAlign: 'center',
                textTransform: 'uppercase', // Usually memes are uppercase
                charSpacing: 20
            }, options);

            // Using IText for inline editing
            const text = new fabric.IText(textString, textProps);
            
            // Fix for stroke rendering (puts stroke behind text fill in fabric 5.x)
            text.set('paintFirst', 'stroke');

            canvas.add(text);
            canvas.setActiveObject(text);
            canvas.renderAll();
        },

        /**
         * Adds an emoji or symbol as a text object (Stickers)
         */
        addSticker: function(char) {
            if (!canvas) return;
            
            const fontSize = Math.min(baseCanvasWidth, baseCanvasHeight) * 0.15;
            
            const sticker = new fabric.IText(char, {
                id: generateId(),
                left: baseCanvasWidth / 2,
                top: baseCanvasHeight / 2,
                originX: 'center',
                originY: 'center',
                fontSize: fontSize,
                fontFamily: 'Arial', // Fallback for emojis
                editable: false // Stickers shouldn't be typed into
            });

            canvas.add(sticker);
            canvas.setActiveObject(sticker);
            canvas.renderAll();
        },

        /**
         * Updates a property on the currently active object
         */
        updateActiveObject: function(prop, value) {
            if (!canvas) return;
            const activeObj = canvas.getActiveObject();
            if (activeObj) {
                // If it's a multiple selection, we might need to iterate
                if (activeObj.type === 'activeSelection') {
                    activeObj.forEachObject(obj => {
                        obj.set(prop, value);
                    });
                } else {
                    activeObj.set(prop, value);
                }
                canvas.renderAll();
                saveHistoryState();
            }
        },

        /**
         * Updates text-specific styling which might require uppercase conversion
         */
        updateActiveText: function(text) {
            if (!canvas) return;
            const activeObj = canvas.getActiveObject();
            if (activeObj && activeObj.type === 'i-text') {
                activeObj.set('text', text);
                canvas.renderAll();
                saveHistoryState();
            }
        },

        /**
         * Deletes the currently selected object(s)
         */
        deleteSelected: function() {
            if (!canvas) return;
            const activeObj = canvas.getActiveObject();
            if (activeObj) {
                if (activeObj.type === 'activeSelection') {
                    activeObj.forEachObject(obj => canvas.remove(obj));
                } else {
                    canvas.remove(activeObj);
                }
                canvas.discardActiveObject();
                canvas.renderAll();
                // history saved automatically via 'object:removed' event
            }
        },

        /**
         * Duplicates the currently selected object
         */
        duplicateSelected: function() {
            if (!canvas) return;
            const activeObj = canvas.getActiveObject();
            if (!activeObj) return;

            activeObj.clone((cloned) => {
                canvas.discardActiveObject();
                cloned.set({
                    left: cloned.left + 20,
                    top: cloned.top + 20,
                    id: generateId(), // ensure new ID
                    evented: true
                });
                
                if (cloned.type === 'activeSelection') {
                    cloned.canvas = canvas;
                    cloned.forEachObject((obj) => {
                        canvas.add(obj);
                    });
                    cloned.setCoords();
                } else {
                    canvas.add(cloned);
                }
                
                canvas.setActiveObject(cloned);
                canvas.renderAll();
            });
        },

        /**
         * Clears all objects (keeps background)
         */
        clearCanvas: function() {
            if (!canvas) return;
            canvas.getObjects().forEach(obj => {
                if (!obj.isBackground) {
                    canvas.remove(obj);
                }
            });
            canvas.discardActiveObject();
            canvas.renderAll();
        },

        /**
         * Layer Management: Moves active object up or down
         */
        moveLayer: function(direction) {
            if (!canvas) return;
            const activeObj = canvas.getActiveObject();
            if (!activeObj) return;
            
            if (direction === 'up') {
                activeObj.bringForward();
            } else if (direction === 'down') {
                activeObj.sendBackwards();
            }
            
            canvas.renderAll();
            saveHistoryState();
        },

        /**
         * Layer Management: Sets order from layer panel drag-and-drop
         */
        reorderLayerById: function(id, newIndex, totalItems) {
            if (!canvas) return;
            const obj = canvas.getObjects().find(o => o.id === id);
            if (obj) {
                // Fabric layers are bottom-to-top (0 is bottom)
                // UI layers are top-to-bottom (0 is top)
                const fabricIndex = totalItems - 1 - newIndex;
                obj.moveTo(fabricIndex);
                canvas.renderAll();
                saveHistoryState();
            }
        },

        /**
         * History: Undo operation
         */
        undo: function() {
            if (historyIndex > 0) {
                historyProcessing = true;
                historyIndex--;
                const state = JSON.parse(history[historyIndex]);
                canvas.loadFromJSON(state, () => {
                    canvas.renderAll();
                    historyProcessing = false;
                    notifyStateChange();
                    notifySelectionChange();
                    notifyLayersChange();
                });
            }
        },

        /**
         * History: Redo operation
         */
        redo: function() {
            if (historyIndex < history.length - 1) {
                historyProcessing = true;
                historyIndex++;
                const state = JSON.parse(history[historyIndex]);
                canvas.loadFromJSON(state, () => {
                    canvas.renderAll();
                    historyProcessing = false;
                    notifyStateChange();
                    notifySelectionChange();
                    notifyLayersChange();
                });
            }
        },

        /**
         * Load a complete saved JSON state (used when loading from "My Memes")
         */
        loadState: function(jsonString, callback) {
            if (!canvas) return;
            historyProcessing = true;
            canvas.loadFromJSON(jsonString, () => {
                
                // Need to extract dimensions if stored, otherwise compute bounds
                // For simplicity, we calculate bounding rect of background or objects
                let bg = canvas.backgroundImage;
                if (bg) {
                    this.setDimensions(bg.width * bg.scaleX, bg.height * bg.scaleY);
                }
                
                canvas.renderAll();
                history = [jsonString];
                historyIndex = 0;
                historyProcessing = false;
                
                notifyStateChange();
                notifySelectionChange();
                notifyLayersChange();
                
                if (callback) callback();
            });
        },

        /**
         * Get the current JSON state for saving to LocalStorage
         */
        getStateJSON: function() {
            if (!canvas) return null;
            return JSON.stringify(canvas.toJSON(['id', 'name', 'selectable', 'isBackground']));
        },

        // --- Zooming ---

        zoomIn: function() {
            if (currentZoom < 3) applyVisualZoom(currentZoom + 0.1);
        },

        zoomOut: function() {
            if (currentZoom > 0.1) applyVisualZoom(currentZoom - 0.1);
        },

        fitToScreen: function() {
            applyVisualZoom(calculateFitZoom());
        },

        // --- Canvas Background / Presets ---
        
        setBackgroundColor: function(colorHex) {
            if (!canvas) return;
            canvas.setBackgroundColor(colorHex, () => {
                // If there's a background image, we might need to remove it or change opacity
                // For a true solid background, we clear the background image
                if (canvas.backgroundImage) {
                    canvas.backgroundImage = null;
                }
                canvas.renderAll();
                saveHistoryState();
            });
        },

        setAspectRatio: function(ratioStr) {
            if (!canvas) return;
            
            let newW = baseCanvasWidth;
            let newH = baseCanvasHeight;
            const bgImg = canvas.backgroundImage;

            // If "original" and we have a bg image, revert to its aspect ratio
            if (ratioStr === 'original' && bgImg) {
                newW = bgImg.width * bgImg.scaleX;
                newH = bgImg.height * bgImg.scaleY;
            } else if (ratioStr === '1:1') {
                const size = Math.max(baseCanvasWidth, baseCanvasHeight);
                newW = size;
                newH = size;
            } else if (ratioStr === '16:9') {
                newW = Math.max(baseCanvasWidth, baseCanvasHeight);
                newH = newW * (9/16);
            } else if (ratioStr === '9:16') {
                newH = Math.max(baseCanvasWidth, baseCanvasHeight);
                newW = newH * (9/16);
            }

            this.setDimensions(newW, newH);
            
            // Re-center background image if it exists
            if (bgImg) {
                bgImg.set({
                    left: newW / 2,
                    top: newH / 2
                });
            }
            
            canvas.renderAll();
            saveHistoryState();
        },

        // --- Export & Download ---

        /**
         * Exports the canvas to a Data URL (base64)
         * @param {string} format 'png', 'jpeg', 'webp'
         * @param {number} quality 0.0 to 1.0
         */
        exportImage: function(format = 'png', quality = 1.0) {
            if (!canvas) return null;

            // Deselect objects to remove selection boxes before export
            canvas.discardActiveObject();
            canvas.renderAll();

            // Export using Fabric's internal method
            try {
                const dataUrl = canvas.toDataURL({
                    format: format,
                    quality: parseFloat(quality),
                    multiplier: 1 // We already render at high res internally
                });
                return dataUrl;
            } catch (e) {
                console.error("MemeForge Canvas: Export failed (possible CORS issue).", e);
                return null;
            }
        },

        /**
         * Returns internal Fabric canvas instance (use only if absolutely necessary)
         */
        getCanvas: () => canvas
    };

})();