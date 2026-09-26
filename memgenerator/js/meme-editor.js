/* ==========================================================================
   MemeForge | js/meme-editor.js
   Handles Editor UI, Tool Switching, and Syncing Properties with Canvas
   ========================================================================== */

window.MemeEditor = (function() {
    // DOM Elements Cache
    const els = {};

    // Internal State
    let activeTool = 'text'; 
    let currentSelection = null;
    let isUpdatingFromCanvas = false;

    /**
     * Initializes all editor UI bindings
     */
    const init = () => {
        cacheDOM();
        bindToolSwitching();
        bindTextProperties();
        bindCanvasProperties();
        bindStickerPanel();
        bindLayerControls();
        bindActionButtons();
    };

    /**
     * Caches frequently used DOM elements
     */
    const cacheDOM = () => {
        // Toolbar
        els.tools = document.querySelectorAll('.tool-btn');
        els.panels = document.querySelectorAll('.property-section');
        els.propPanel = document.getElementById('properties-panel');
        
        // Text Properties
        els.textOverlay = document.getElementById('text-edit-controls');
        els.textValue = document.getElementById('prop-text-value');
        els.fontFamily = document.getElementById('prop-font-family');
        els.fontSize = document.getElementById('prop-font-size');
        els.fillColor = document.getElementById('prop-fill-color');
        els.hexFillColor = document.getElementById('hex-fill-color');
        els.strokeColor = document.getElementById('prop-stroke-color');
        els.hexStrokeColor = document.getElementById('hex-stroke-color');
        els.strokeWidth = document.getElementById('prop-stroke-width');
        els.valStrokeWidth = document.getElementById('val-stroke-width');
        els.btnBold = document.getElementById('prop-bold');
        els.btnItalic = document.getElementById('prop-italic');
        els.btnUpper = document.getElementById('prop-uppercase');
        els.alignBtns = document.querySelectorAll('.prop-align');
        
        // Action Buttons
        els.btnAddText = document.getElementById('btn-add-text');
        els.btnCloneText = document.getElementById('btn-duplicate-text');
        els.btnDeleteText = document.getElementById('btn-delete-text');
        
        // Canvas Properties
        els.bgColor = document.getElementById('prop-bg-color');
        els.hexBgColor = document.getElementById('hex-bg-color');
        els.ratioBtns = document.querySelectorAll('.ratio-btn');
        
        // Stickers
        els.stickersGrid = document.getElementById('stickers-grid');
        els.stickerCatBtns = document.querySelectorAll('.stickers-categories .pill-btn');
        
        // Layers
        els.layersList = document.getElementById('layers-list');
        els.btnLayerUp = document.getElementById('btn-layer-up');
        els.btnLayerDown = document.getElementById('btn-layer-down');
    };

    const bindToolSwitching = () => {
        if (!els.tools) return;
        
        els.tools.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const toolId = btn.id.replace('tool-', '');
                
                if (toolId === 'image') {
                    document.getElementById('upload-image-input').click();
                    return;
                }
                
                switchTool(toolId);
                openMobileSheet();
            });
        });

        const fileInput = document.getElementById('upload-image-input');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    if(window.MemeCanvas) MemeCanvas.addUserImage(e.target.files[0]);
                    e.target.value = ''; 
                    if (window.MemeUI) window.MemeUI.showToast('Image added', 'success');
                }
            });
        }
    };

    const switchTool = (toolId) => {
        activeTool = toolId;
        
        els.tools.forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.getElementById(`tool-${toolId}`);
        if (activeBtn) activeBtn.classList.add('active');

        els.panels.forEach(panel => {
            panel.classList.remove('active');
            setTimeout(() => {
                if (!panel.classList.contains('active')) {
                    panel.classList.add('hidden');
                }
            }, 300); 
        });
        
        const activePanel = document.getElementById(`panel-${toolId}`);
        if (activePanel) {
            activePanel.classList.remove('hidden');
            setTimeout(() => activePanel.classList.add('active'), 10);
        }
    };

    const openMobileSheet = () => {
        if (window.innerWidth <= 768 && els.propPanel) {
            els.propPanel.classList.add('sheet-open');
        }
    };

    const closeMobileSheet = () => {
        if (els.propPanel) els.propPanel.classList.remove('sheet-open');
    };

    const bindTextProperties = () => {
        if (!els.textValue) return;

        els.textValue.addEventListener('input', (e) => {
            if (!isUpdatingFromCanvas && window.MemeCanvas) MemeCanvas.updateActiveText(e.target.value);
        });

        els.fontFamily.addEventListener('change', (e) => {
            if (!isUpdatingFromCanvas && window.MemeCanvas) MemeCanvas.updateActiveObject('fontFamily', e.target.value);
        });

        els.fontSize.addEventListener('input', (e) => {
            if (!isUpdatingFromCanvas && window.MemeCanvas) MemeCanvas.updateActiveObject('fontSize', parseInt(e.target.value));
        });

        els.fillColor.addEventListener('input', (e) => {
            els.hexFillColor.innerText = e.target.value.toUpperCase();
            if (!isUpdatingFromCanvas && window.MemeCanvas) MemeCanvas.updateActiveObject('fill', e.target.value);
        });

        els.strokeColor.addEventListener('input', (e) => {
            els.hexStrokeColor.innerText = e.target.value.toUpperCase();
            if (!isUpdatingFromCanvas && window.MemeCanvas) MemeCanvas.updateActiveObject('stroke', e.target.value);
        });

        els.strokeWidth.addEventListener('input', (e) => {
            els.valStrokeWidth.innerText = e.target.value + 'px';
            if (!isUpdatingFromCanvas && window.MemeCanvas) MemeCanvas.updateActiveObject('strokeWidth', parseInt(e.target.value));
        });

        els.btnBold.addEventListener('click', () => {
            const isBold = els.btnBold.classList.toggle('active');
            if (!isUpdatingFromCanvas && window.MemeCanvas) MemeCanvas.updateActiveObject('fontWeight', isBold ? 'bold' : 'normal');
        });

        els.btnItalic.addEventListener('click', () => {
            const isItalic = els.btnItalic.classList.toggle('active');
            if (!isUpdatingFromCanvas && window.MemeCanvas) MemeCanvas.updateActiveObject('fontStyle', isItalic ? 'italic' : 'normal');
        });

        els.btnUpper.addEventListener('click', () => {
            const isUpper = els.btnUpper.classList.toggle('active');
            if (!isUpdatingFromCanvas && currentSelection && currentSelection.type === 'i-text' && window.MemeCanvas) {
                const currentText = currentSelection.text;
                MemeCanvas.updateActiveText(isUpper ? currentText.toUpperCase() : currentText.toLowerCase());
                els.textValue.value = isUpper ? currentText.toUpperCase() : currentText.toLowerCase();
            }
        });

        els.alignBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetBtn = e.target.closest('button');
                els.alignBtns.forEach(b => b.classList.remove('active'));
                targetBtn.classList.add('active');
                
                const align = targetBtn.dataset.align;
                if (!isUpdatingFromCanvas && window.MemeCanvas) MemeCanvas.updateActiveObject('textAlign', align);
            });
        });
    };

    const bindCanvasProperties = () => {
        if (!els.bgColor) return;
        
        els.bgColor.addEventListener('input', (e) => {
            els.hexBgColor.innerText = e.target.value.toUpperCase();
            if(window.MemeCanvas) MemeCanvas.setBackgroundColor(e.target.value);
        });

        els.ratioBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetBtn = e.target.closest('button');
                els.ratioBtns.forEach(b => b.classList.remove('active'));
                targetBtn.classList.add('active');
                
                if(window.MemeCanvas) MemeCanvas.setAspectRatio(targetBtn.dataset.ratio);
            });
        });
    };

    const bindStickerPanel = () => {
        const renderStickers = (category) => {
            if (!els.stickersGrid) return;
            els.stickersGrid.innerHTML = '';
            
            // Rely on normalized state guaranteed by app.js
            const stateStickers = window.MemeData.stickers || [];
            
            const stickers = stateStickers.filter(s => 
                category === 'all' || s.category === category
            );
            
            stickers.forEach(sticker => {
                const div = document.createElement('div');
                div.className = 'sticker-item';
                div.innerHTML = sticker.char; 
                
                div.addEventListener('click', () => {
                    if (window.MemeCanvas) MemeCanvas.addSticker(sticker.char);
                    if (window.innerWidth <= 768) closeMobileSheet();
                });
                
                els.stickersGrid.appendChild(div);
            });
        };

        if (els.stickerCatBtns) {
            els.stickerCatBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    els.stickerCatBtns.forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');
                    renderStickers(e.target.dataset.cat);
                });
            });
        }

        renderStickers('emojis');
    };

    const bindLayerControls = () => {
        if (!els.btnLayerUp || !els.btnLayerDown) return;
        
        els.btnLayerUp.addEventListener('click', () => {
            if (window.MemeCanvas) MemeCanvas.moveLayer('up');
        });
        
        els.btnLayerDown.addEventListener('click', () => {
            if (window.MemeCanvas) MemeCanvas.moveLayer('down');
        });
    };

    const bindActionButtons = () => {
        if (els.btnAddText) {
            els.btnAddText.addEventListener('click', () => {
                if (window.MemeCanvas) MemeCanvas.addText("NEW TEXT");
                if (window.innerWidth <= 768) closeMobileSheet();
            });
        }

        if (els.btnCloneText) {
            els.btnCloneText.addEventListener('click', () => {
                if (window.MemeCanvas) MemeCanvas.duplicateSelected();
            });
        }

        if (els.btnDeleteText) {
            els.btnDeleteText.addEventListener('click', () => {
                if (window.MemeCanvas) MemeCanvas.deleteSelected();
            });
        }
    };

    /**
     * Callback fired by MemeCanvas when selection changes.
     */
    const handleSelectionChange = (activeObject) => {
        if (!els.textOverlay) return; 

        currentSelection = activeObject;
        isUpdatingFromCanvas = true;

        if (!activeObject) {
            els.textOverlay.classList.add('is-disabled');
            els.textValue.value = '';
            els.btnCloneText.disabled = true;
            els.btnDeleteText.disabled = true;
            els.btnLayerUp.disabled = true;
            els.btnLayerDown.disabled = true;
        } else {
            els.btnCloneText.disabled = false;
            els.btnDeleteText.disabled = false;
            els.btnLayerUp.disabled = false;
            els.btnLayerDown.disabled = false;
            
            if (activeObject.type === 'i-text' || activeObject.type === 'text') {
                els.textOverlay.classList.remove('is-disabled');
                
                if (activeTool !== 'text' && window.innerWidth > 768) {
                    switchTool('text');
                }

                els.textValue.value = activeObject.text || '';
                
                const fontVal = activeObject.fontFamily || '';
                Array.from(els.fontFamily.options).forEach(opt => {
                    if (opt.value.includes(fontVal) || fontVal.includes(opt.value.replace(/['"]/g, ''))) {
                        els.fontFamily.value = opt.value;
                    }
                });

                els.fontSize.value = Math.round(activeObject.fontSize || 40);

                if (activeObject.fill) {
                    els.fillColor.value = activeObject.fill;
                    els.hexFillColor.innerText = activeObject.fill.toUpperCase();
                }
                
                if (activeObject.stroke) {
                    els.strokeColor.value = activeObject.stroke;
                    els.hexStrokeColor.innerText = activeObject.stroke.toUpperCase();
                }

                if (activeObject.strokeWidth !== undefined) {
                    els.strokeWidth.value = activeObject.strokeWidth;
                    els.valStrokeWidth.innerText = activeObject.strokeWidth + 'px';
                }

                if (activeObject.fontWeight === 'bold') els.btnBold.classList.add('active');
                else els.btnBold.classList.remove('active');

                if (activeObject.fontStyle === 'italic') els.btnItalic.classList.add('active');
                else els.btnItalic.classList.remove('active');

                const align = activeObject.textAlign || 'center';
                els.alignBtns.forEach(btn => {
                    if (btn.dataset.align === align) btn.classList.add('active');
                    else btn.classList.remove('active');
                });

            } else {
                els.textOverlay.classList.add('is-disabled');
            }
        }

        isUpdatingFromCanvas = false;
    };

    /**
     * Callback fired by MemeCanvas to update the Layers panel UI
     */
    const handleLayersChange = (layers) => {
        if (!els.layersList) return;

        els.layersList.innerHTML = '';
        
        layers.forEach((layer, index) => {
            if (layer.isBackground) return; 

            const li = document.createElement('li');
            li.className = 'layer-item';
            if (currentSelection && currentSelection.id === layer.id) {
                li.classList.add('active');
            }

            let iconClass = 'fa-solid fa-font';
            if (layer.type === 'image') iconClass = 'fa-regular fa-image';
            
            let displayName = layer.text || 'Element';
            if (displayName.length > 15) displayName = displayName.substring(0, 15) + '...';

            li.innerHTML = `
                <div class="layer-info">
                    <div class="layer-icon"><i class="${iconClass}"></i></div>
                    <div class="layer-name">${displayName}</div>
                </div>
                <div class="layer-controls">
                    <button class="layer-btn" title="Delete"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            `;

            li.addEventListener('click', (e) => {
                if (!e.target.closest('.layer-btn')) {
                    if (!window.MemeCanvas) return;
                    const canvas = MemeCanvas.getCanvas();
                    const targetObj = canvas.getObjects().find(o => o.id === layer.id);
                    if (targetObj) {
                        canvas.setActiveObject(targetObj);
                        canvas.renderAll();
                    }
                }
            });

            const delBtn = li.querySelector('.layer-btn');
            delBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!window.MemeCanvas) return;
                const canvas = MemeCanvas.getCanvas();
                const targetObj = canvas.getObjects().find(o => o.id === layer.id);
                if (targetObj) {
                    canvas.remove(targetObj);
                    canvas.renderAll();
                }
            });

            els.layersList.appendChild(li);
        });
    };

    // Public API
    return {
        init,
        handleSelectionChange,
        handleLayersChange,
        closeMobileSheet
    };

})();