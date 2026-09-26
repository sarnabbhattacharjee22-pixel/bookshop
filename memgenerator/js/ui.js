/* ==========================================================================
   MemeForge | js/ui.js
   Global UI Controllers, Navigation, Theme, Toasts, and Saved Memes
   ========================================================================== */

window.MemeUI = (function() {
    const els = {
        html: document.documentElement,
        app: document.getElementById('app'),
        views: document.querySelectorAll('.view'),
        navBtns: document.querySelectorAll('.nav-btn'),
        navRoutes: document.querySelectorAll('.nav-route'),
        themeToggle: document.getElementById('theme-toggle'),
        toastContainer: document.getElementById('toast-container'),
        
        btnUndo: document.getElementById('btn-undo'),
        btnRedo: document.getElementById('btn-redo'),
        btnReset: document.getElementById('btn-reset'),
        btnSaveLocal: document.getElementById('btn-save-local'),
        
        savedGrid: document.getElementById('saved-memes-grid'),
        savedEmptyState: document.getElementById('saved-empty-state'),
        btnClearAllMemes: document.getElementById('clear-all-memes-btn')
    };

    const init = () => {
        initTheme();
        bindNavigation();
        bindEditorHeader();
        bindSavedMemes();
        
        // Hiding the loader is now strictly handled by app.js initialization process
    };

    const initTheme = () => {
        if (!window.MemeStorage) return;
        const savedTheme = MemeStorage.getTheme();
        els.html.setAttribute('data-theme', savedTheme);
        updateThemeIcon(savedTheme);

        if (els.themeToggle) {
            els.themeToggle.addEventListener('click', () => {
                const currentTheme = els.html.getAttribute('data-theme');
                const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                
                els.html.setAttribute('data-theme', newTheme);
                updateThemeIcon(newTheme);
                MemeStorage.saveTheme(newTheme);
            });
        }
    };

    const updateThemeIcon = (theme) => {
        if (!els.themeToggle) return;
        const icon = els.themeToggle.querySelector('i');
        if (theme === 'dark') {
            icon.className = 'fa-solid fa-moon';
        } else {
            icon.className = 'fa-solid fa-sun';
        }
    };

    const bindNavigation = () => {
        els.navBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetId = e.currentTarget.getAttribute('data-target');
                if (targetId) switchView(targetId);
            });
        });

        els.navRoutes.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetId = e.currentTarget.getAttribute('data-target');
                if (targetId) switchView(targetId);
            });
        });
    };

    const switchView = (viewId) => {
        els.views.forEach(view => {
            if (view.id === viewId) {
                view.classList.add('active');
            } else {
                view.classList.remove('active');
            }
        });

        els.navBtns.forEach(btn => {
            if (btn.getAttribute('data-target') === viewId) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        if (viewId === 'view-saved') {
            renderSavedMemes();
        }

        if (viewId === 'view-editor' && window.MemeCanvas) {
            setTimeout(() => {
                MemeCanvas.fitToScreen();
            }, 50);
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const showToast = (message, type = 'info') => {
        if (!els.toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let iconClass = 'fa-solid fa-circle-info';
        if (type === 'success') iconClass = 'fa-solid fa-circle-check';
        if (type === 'error') iconClass = 'fa-solid fa-circle-exclamation';

        toast.innerHTML = `
            <i class="${iconClass}"></i>
            <span>${message}</span>
        `;

        els.toastContainer.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.parentElement.removeChild(toast);
                }
            }, 300); 
        }, 3000);
    };

    const bindEditorHeader = () => {
        if (els.btnUndo) els.btnUndo.addEventListener('click', () => {
            if (window.MemeCanvas) MemeCanvas.undo();
        });
        
        if (els.btnRedo) els.btnRedo.addEventListener('click', () => {
            if (window.MemeCanvas) MemeCanvas.redo();
        });

        if (els.btnReset) els.btnReset.addEventListener('click', () => {
            if (confirm("Are you sure you want to clear the canvas? This cannot be undone.")) {
                if (window.MemeCanvas) MemeCanvas.clearCanvas();
            }
        });

        const btnZoomIn = document.getElementById('btn-zoom-in');
        const btnZoomOut = document.getElementById('btn-zoom-out');
        const btnZoomFit = document.getElementById('btn-zoom-fit');

        if (btnZoomIn) btnZoomIn.addEventListener('click', () => MemeCanvas && MemeCanvas.zoomIn());
        if (btnZoomOut) btnZoomOut.addEventListener('click', () => MemeCanvas && MemeCanvas.zoomOut());
        if (btnZoomFit) btnZoomFit.addEventListener('click', () => MemeCanvas && MemeCanvas.fitToScreen());

        if (els.btnSaveLocal) els.btnSaveLocal.addEventListener('click', handleSaveMeme);
    };

    const updateHistoryButtons = (state) => {
        if (els.btnUndo) els.btnUndo.disabled = !state.canUndo;
        if (els.btnRedo) els.btnRedo.disabled = !state.canRedo;
    };

    const handleSaveMeme = () => {
        if (!window.MemeCanvas || !window.MemeStorage) return;

        const originalText = els.btnSaveLocal.innerHTML;
        els.btnSaveLocal.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving';
        els.btnSaveLocal.disabled = true;

        MemeCanvas.getCanvas().discardActiveObject();
        MemeCanvas.getCanvas().renderAll();

        setTimeout(() => {
            const previewDataUrl = MemeCanvas.exportImage('jpeg', 0.5);
            const canvasState = MemeCanvas.getStateJSON();
            
            if (!previewDataUrl || !canvasState) {
                showToast("Failed to save meme. Canvas might be empty.", "error");
                resetBtn();
                return;
            }

            const templateName = document.getElementById('current-template-name').innerText || "Untitled Meme";

            const result = MemeStorage.saveMeme({
                name: templateName,
                preview: previewDataUrl,
                state: canvasState,
            });

            if (result.success) {
                showToast("Meme saved successfully!", "success");
            } else {
                showToast(result.error || "Failed to save meme.", "error");
                els.btnSaveLocal.classList.add('error-shake');
                setTimeout(() => els.btnSaveLocal.classList.remove('error-shake'), 500);
            }

            resetBtn();
        }, 100); 

        function resetBtn() {
            els.btnSaveLocal.innerHTML = originalText;
            els.btnSaveLocal.disabled = false;
        }
    };

    const renderSavedMemes = () => {
        if (!els.savedGrid || !window.MemeStorage) return;

        const memes = MemeStorage.getSavedMemes();
        els.savedGrid.innerHTML = '';

        if (memes.length === 0) {
            els.savedGrid.style.display = 'none';
            els.savedEmptyState.classList.remove('hidden');
            els.btnClearAllMemes.classList.add('hidden');
            return;
        }

        els.savedGrid.style.display = 'grid';
        els.savedEmptyState.classList.add('hidden');
        els.btnClearAllMemes.classList.remove('hidden');

        memes.forEach((meme, index) => {
            const card = document.createElement('div');
            card.className = 'template-card fade-in-up';
            card.classList.add(`stagger-${(index % 8) + 1}`);

            const date = new Date(meme.date);
            const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

            card.innerHTML = `
                <div class="template-img-wrapper" style="background-color: var(--canvas-wrapper-bg);">
                    <img src="${meme.preview}" alt="${meme.name}">
                </div>
                <div class="template-info" style="flex-direction: column; align-items: flex-start; gap: 0.5rem;">
                    <div style="width: 100%; display: flex; justify-content: space-between; align-items: center;">
                        <span class="template-name" title="${meme.name}">${meme.name}</span>
                        <span class="text-muted small">${dateStr}</span>
                    </div>
                    <div class="action-row w-100" style="margin-top: 0.5rem;">
                        <button class="btn btn-primary small flex-1 btn-edit-saved" data-id="${meme.id}">
                            <i class="fa-solid fa-pen"></i> Edit
                        </button>
                        <button class="btn btn-danger small btn-delete-saved" data-id="${meme.id}">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </div>
            `;
            
            els.savedGrid.appendChild(card);
        });

        bindSavedMemeActions();
    };

    const bindSavedMemeActions = () => {
        document.querySelectorAll('.btn-edit-saved').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = e.currentTarget.getAttribute('data-id');
                loadSavedMemeToEditor(id);
            });
        });

        document.querySelectorAll('.btn-delete-saved').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = e.currentTarget.getAttribute('data-id');
                if (confirm("Are you sure you want to delete this saved meme?")) {
                    if (MemeStorage.deleteMeme(id)) {
                        showToast("Meme deleted.", "info");
                        renderSavedMemes(); 
                    }
                }
            });
        });
    };

    const bindSavedMemes = () => {
        if (els.btnClearAllMemes) {
            els.btnClearAllMemes.addEventListener('click', () => {
                if (confirm("Are you sure you want to delete ALL saved memes? This cannot be undone.")) {
                    if (MemeStorage.clearAllMemes()) {
                        showToast("All saved memes deleted.", "info");
                        renderSavedMemes();
                    }
                }
            });
        }
    };

    const loadSavedMemeToEditor = (id) => {
        if (!window.MemeStorage || !window.MemeCanvas) return;
        
        const meme = MemeStorage.getMemeById(id);
        if (!meme) {
            showToast("Failed to load meme data.", "error");
            return;
        }

        const loader = document.getElementById('global-loader');
        if (loader) {
            const p = loader.querySelector('p');
            if (p) p.innerText = "Loading Canvas State...";
            loader.style.display = 'flex';
            loader.classList.remove('fade-out');
        }

        switchView('view-editor');
        document.getElementById('current-template-name').innerText = meme.name;

        setTimeout(() => {
            MemeCanvas.loadState(meme.state, () => {
                if (loader) {
                    loader.classList.add('fade-out');
                    setTimeout(() => loader.style.display = 'none', 500);
                }
            });
        }, 100);
    };

    return {
        init,
        switchView,
        showToast,
        updateHistoryButtons
    };

})();