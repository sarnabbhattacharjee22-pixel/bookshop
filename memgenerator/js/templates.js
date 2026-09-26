/* ==========================================================================
   MemeForge | js/templates.js
   Massive Template Library, Infinite Scroll, Tabs, Favorites, and Recents
   ========================================================================== */

window.MemeTemplates = (function() {
    
    // ======================================================================
    // DOM Elements Cache
    // ======================================================================
    const els = {
        // Grids & Containers
        mainGrid: document.getElementById('templates-main-grid'),
        homeGrid: document.getElementById('home-templates-grid'),
        scrollTrigger: document.getElementById('infinite-scroll-trigger'),
        
        // Toolbars & Inputs
        searchInput: document.getElementById('template-search'),
        filterCategory: document.getElementById('filter-category'),
        filterLicense: document.getElementById('filter-license'),
        tabBtns: document.querySelectorAll('.template-tabs .tab-btn'),
        apiStatusBanner: document.getElementById('template-api-status'),
        btnRetryApi: document.getElementById('btn-retry-api'),
        
        // Empty States
        emptyLibrary: document.getElementById('templates-empty-state'),
        emptyFavorites: document.getElementById('favorites-empty-state'),
        emptyRecent: document.getElementById('recent-empty-state'),
        
        // Modal (Template Info)
        modalInfo: document.getElementById('modal-template-info'),
        modalTitle: document.getElementById('info-modal-title'),
        modalCreator: document.getElementById('info-modal-creator'),
        modalProvider: document.getElementById('info-modal-provider'),
        modalBadge: document.getElementById('info-modal-license-badge'),
        modalComm: document.getElementById('info-modal-comm'),
        modalMod: document.getElementById('info-modal-mod'),
        modalAttr: document.getElementById('info-modal-attr'),
        btnModalSource: document.getElementById('btn-modal-source'),
        btnModalUse: document.getElementById('btn-modal-use-template'),
        iconComm: document.getElementById('icon-comm-use'),
        iconMod: document.getElementById('icon-mod-use'),
        iconAttr: document.getElementById('icon-attr-use')
    };

    // ======================================================================
    // State Management
    // ======================================================================
    const state = {
        currentTab: 'library', // 'library', 'favorites', 'recent'
        page: 1,
        query: '',
        category: 'all',
        license: 'all',
        isLoading: false,
        hasMore: true,
        renderedIds: new Set(),
        searchTimeout: null,
        activeModalTemplate: null
    };

    // Local Storage Keys for Templates
    const KEYS = {
        FAVORITES: 'memeforge_favorites_v2',
        RECENT: 'memeforge_recent_v2'
    };

    // ======================================================================
    // Initialization
    // ======================================================================
    const init = () => {
        if (!window.MemeProviders) {
            console.error("[MemeForge] MemeProviders not found. Cannot initialize templates.");
            return;
        }

        bindEvents();
        setupInfiniteScroll();
        
        // Initial Loads
        loadHomeFeatured();
        loadTemplates(true);
    };

    // ======================================================================
    // Event Binding
    // ======================================================================
    const bindEvents = () => {
        // Search Input (Debounced)
        if (els.searchInput) {
            els.searchInput.addEventListener('input', (e) => {
                state.query = e.target.value.trim();
                clearTimeout(state.searchTimeout);
                
                state.searchTimeout = setTimeout(() => {
                    if (state.currentTab === 'library') {
                        loadTemplates(true);
                    } else {
                        renderLocalTab(state.currentTab);
                    }
                }, 600); // 600ms debounce to prevent API spam
            });
        }

        // Category Filter
        if (els.filterCategory) {
            els.filterCategory.addEventListener('change', (e) => {
                state.category = e.target.value;
                if (state.currentTab === 'library') loadTemplates(true);
            });
        }

        // License Filter
        if (els.filterLicense) {
            els.filterLicense.addEventListener('change', (e) => {
                state.license = e.target.value;
                if (state.currentTab === 'library') loadTemplates(true);
            });
        }

        // Tabs
        els.tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (state.isLoading) return; // Prevent tab switching while loading

                els.tabBtns.forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                
                const tab = e.currentTarget.dataset.tab;
                switchTab(tab);
            });
        });

        // API Retry Button
        if (els.btnRetryApi) {
            els.btnRetryApi.addEventListener('click', () => {
                if (els.apiStatusBanner) els.apiStatusBanner.classList.add('hidden');
                loadTemplates(true);
            });
        }

        // Modal Action - Use Template
        if (els.btnModalUse) {
            els.btnModalUse.addEventListener('click', () => {
                if (state.activeModalTemplate) {
                    if (els.modalInfo) els.modalInfo.classList.add('hidden');
                    useTemplate(state.activeModalTemplate);
                }
            });
        }

        // Modal Close logic
        const closeBtn = document.querySelector('#modal-template-info .modal-close');
        if (closeBtn && els.modalInfo) {
            closeBtn.addEventListener('click', () => els.modalInfo.classList.add('hidden'));
        }
        if (els.modalInfo) {
            els.modalInfo.addEventListener('click', (e) => {
                if (e.target === els.modalInfo) els.modalInfo.classList.add('hidden');
            });
        }
    };

    // ======================================================================
    // Tab Management
    // ======================================================================
    const switchTab = (tabId) => {
        state.currentTab = tabId;
        
        // Reset grid & UI states
        if (els.mainGrid) els.mainGrid.innerHTML = '';
        hideAllEmptyStates();
        if (els.scrollTrigger) els.scrollTrigger.classList.add('hidden');
        if (els.apiStatusBanner) els.apiStatusBanner.classList.add('hidden');
        
        if (tabId === 'library') {
            loadTemplates(true);
        } else {
            renderLocalTab(tabId);
        }
    };

    const hideAllEmptyStates = () => {
        if (els.emptyLibrary) els.emptyLibrary.classList.add('hidden');
        if (els.emptyFavorites) els.emptyFavorites.classList.add('hidden');
        if (els.emptyRecent) els.emptyRecent.classList.add('hidden');
    };

    // ======================================================================
    // API Fetching & Infinite Scroll
    // ======================================================================
    
    /**
     * Initializes the IntersectionObserver for infinite scrolling
     */
    const setupInfiniteScroll = () => {
        if (!els.scrollTrigger || !('IntersectionObserver' in window)) return;

        const observer = new IntersectionObserver((entries) => {
            const trigger = entries[0];
            // Fetch more if visible, not loading, has more pages, and on the library tab
            if (trigger.isIntersecting && !state.isLoading && state.hasMore && state.currentTab === 'library') {
                loadTemplates(false);
            }
        }, {
            root: null,
            rootMargin: '400px', // Trigger well before reaching the actual bottom
            threshold: 0.1
        });

        observer.observe(els.scrollTrigger);
    };

    /**
     * Core function to load templates from the Provider API
     */
    const loadTemplates = async (isNewSearch = false) => {
        if (state.isLoading) return;
        
        if (isNewSearch) {
            state.page = 1;
            state.hasMore = true;
            state.renderedIds.clear();
            if (els.mainGrid) els.mainGrid.innerHTML = '';
            hideAllEmptyStates();
        }

        if (!state.hasMore) return;

        state.isLoading = true;
        if (els.scrollTrigger) els.scrollTrigger.classList.remove('hidden');

        try {
            // Compile search query based on inputs and category filter
            let effectiveQuery = state.query;
            
            // If the user selected a category but didn't type anything
            if (state.category !== 'all' && state.category !== 'trending') {
                effectiveQuery = effectiveQuery ? `${effectiveQuery} ${state.category}` : state.category;
            } else if (state.category === 'trending' && !effectiveQuery) {
                // If trending and no search text, fetch popular memes
                effectiveQuery = 'popular meme';
            } else if (!effectiveQuery && state.category === 'all') {
                // Provide a default broad query to ensure the library isn't empty on load
                effectiveQuery = 'meme';
            }

            // Call the Provider Manager
            const response = await window.MemeProviders.search(effectiveQuery, {
                page: state.page,
                limit: 30,
                licenseType: state.license
            });

            // Handle Fallback Status Banner
            if (els.apiStatusBanner) {
                if (response.isFallback) {
                    els.apiStatusBanner.classList.remove('hidden');
                } else {
                    els.apiStatusBanner.classList.add('hidden');
                }
            }

            state.hasMore = response.hasMore;
            state.page++;

            // Render Results
            if (response.results.length === 0 && isNewSearch) {
                if (els.emptyLibrary) els.emptyLibrary.classList.remove('hidden');
            } else {
                renderCards(response.results, els.mainGrid);
            }

        } catch (error) {
            console.error("[MemeForge] Template Load Error:", error);
            if (isNewSearch && els.emptyLibrary) els.emptyLibrary.classList.remove('hidden');
            if (window.MemeUI) MemeUI.showToast("Failed to load templates from the network.", "error");
        } finally {
            state.isLoading = false;
            // Hide scroll trigger if no more results or if we didn't find anything
            if (!state.hasMore || (els.mainGrid && els.mainGrid.children.length === 0)) {
                if (els.scrollTrigger) els.scrollTrigger.classList.add('hidden');
            }
        }
    };

    /**
     * Loads a small batch of featured templates for the Home view
     */
    const loadHomeFeatured = async () => {
        if (!els.homeGrid) return;
        try {
            const response = await window.MemeProviders.search('popular meme', { page: 1, limit: 8 });
            els.homeGrid.innerHTML = ''; // Clear skeleton loaders
            
            if (response.results && response.results.length > 0) {
                renderCards(response.results.slice(0, 8), els.homeGrid, true);
            } else {
                els.homeGrid.innerHTML = '<p class="text-muted w-100 text-center" style="grid-column: 1/-1;">No featured templates available.</p>';
            }
        } catch (error) {
            console.warn("[MemeForge] Home templates failed to load", error);
            els.homeGrid.innerHTML = '<p class="text-muted w-100 text-center" style="grid-column: 1/-1;">Failed to load featured templates.</p>';
        }
    };

    // ======================================================================
    // Local Tabs (Favorites & Recents) Rendering
    // ======================================================================
    const renderLocalTab = (tabType) => {
        if (!els.mainGrid) return;
        
        els.mainGrid.innerHTML = '';
        if (els.scrollTrigger) els.scrollTrigger.classList.add('hidden');
        
        let data = [];
        if (tabType === 'favorites') data = getLocalList(KEYS.FAVORITES);
        if (tabType === 'recent') data = getLocalList(KEYS.RECENT);

        // Apply local search filtering if user is typing
        if (state.query) {
            const q = state.query.toLowerCase();
            data = data.filter(t => {
                const titleMatch = t.title && t.title.toLowerCase().includes(q);
                const tagMatch = t.tags && t.tags.some(tag => tag.toLowerCase().includes(q));
                return titleMatch || tagMatch;
            });
        }

        if (data.length === 0) {
            if (tabType === 'favorites' && els.emptyFavorites) els.emptyFavorites.classList.remove('hidden');
            if (tabType === 'recent' && els.emptyRecent) els.emptyRecent.classList.remove('hidden');
        } else {
            // Reverse so newest/most recently added is first
            renderCards(data.reverse(), els.mainGrid);
        }
    };

    // ======================================================================
    // Card Rendering
    // ======================================================================
    const renderCards = (templates, container, isHome = false) => {
        if (!container) return;
        
        const favorites = new Set(getLocalList(KEYS.FAVORITES).map(t => t.id));

        templates.forEach((t, index) => {
            // Strict deduplication to prevent React-style key warnings or visual dupes
            if (state.renderedIds.has(t.id) && !isHome) return;
            state.renderedIds.add(t.id);

            const isFav = favorites.has(t.id);
            const badgeClass = getBadgeClass(t.license);
            
            const card = document.createElement('div');
            card.className = 'template-card fade-in-up';
            card.classList.add(`stagger-${(index % 8) + 1}`);
            
            card.innerHTML = `
                <div class="template-favorite-btn ${isFav ? 'is-favorited' : ''}" data-id="${t.id}" title="Toggle Favorite">
                    <i class="${isFav ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
                </div>
                <div class="template-img-wrapper skeleton-img">
                    <img src="${t.thumbnailUrl}" alt="${t.title}" loading="lazy" crossorigin="anonymous">
                    <div class="template-actions">
                        <div style="display: flex; gap: 0.5rem;">
                            <button class="btn btn-secondary icon-btn small btn-info" title="License Info"><i class="fa-solid fa-info"></i></button>
                            <button class="btn btn-primary btn-use-template">Use Template</button>
                        </div>
                    </div>
                </div>
                <div class="template-info">
                    <div class="template-name" title="${t.title}">${t.title}</div>
                    <div class="template-meta-row mt-10">
                        <span class="license-badge ${badgeClass}">${t.license}</span>
                        <span class="text-muted small"><i class="fa-solid fa-globe"></i> ${t.provider === 'Local Vault' ? 'Local' : 'Web'}</span>
                    </div>
                </div>
            `;

            // Image Loading/Error States
            const img = card.querySelector('img');
            img.onload = () => {
                const wrapper = card.querySelector('.template-img-wrapper');
                if (wrapper) wrapper.classList.remove('skeleton-img');
            };
            img.onerror = () => {
                const wrapper = card.querySelector('.template-img-wrapper');
                if (wrapper) {
                    wrapper.classList.remove('skeleton-img');
                    wrapper.innerHTML = '<i class="fa-solid fa-image-slash text-muted fa-3x"></i><p class="small text-muted mt-10">Image unavailable</p>';
                }
                const actions = card.querySelector('.template-actions');
                if (actions) actions.style.display = 'none'; // Prevent using broken images
            };

            // Bind DOM Actions
            const favBtn = card.querySelector('.template-favorite-btn');
            if (favBtn) {
                favBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    toggleFavorite(t, e.currentTarget);
                });
            }

            const useBtn = card.querySelector('.btn-use-template');
            if (useBtn) {
                useBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    useTemplate(t);
                });
            }

            const infoBtn = card.querySelector('.btn-info');
            if (infoBtn) {
                infoBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openTemplateInfo(t);
                });
            }

            // Mobile fallback: click anywhere on the image wrapper opens info
            const imgWrapper = card.querySelector('.template-img-wrapper');
            if (imgWrapper) {
                imgWrapper.addEventListener('click', () => {
                    if (window.innerWidth <= 768) {
                        openTemplateInfo(t);
                    }
                });
            }

            container.appendChild(card);
        });
    };

    const getBadgeClass = (license) => {
        if (!license) return 'unknown';
        const l = license.toLowerCase();
        if (l === 'cc0' || l === 'pd' || l.includes('public domain')) return 'pd';
        if (l.includes('cc') && l.includes('by')) return 'cc-by';
        return 'unknown';
    };

    // ======================================================================
    // Template Actions
    // ======================================================================
    const useTemplate = (template) => {
        // Save to Recents purely by metadata
        addToRecents(template);

        // Update UI Title
        const titleEl = document.getElementById('current-template-name');
        if (titleEl) titleEl.innerText = template.title;

        // Switch to Studio View
        if (window.MemeUI) {
            MemeUI.switchView('view-editor');
        }

        // Load onto Canvas
        if (window.MemeCanvas) {
            // Show global loader while the high-res image fetches
            const loader = document.getElementById('global-loader');
            if (loader) {
                const text = loader.querySelector('p');
                if (text) text.innerText = "Loading High-Res Template...";
                loader.style.display = 'flex';
                loader.classList.remove('fade-out');
            }

            // Pass the full resolution image URL
            MemeCanvas.loadTemplate(template.imageUrl, () => {
                // Remove loader
                if (loader) {
                    loader.classList.add('fade-out');
                    setTimeout(() => loader.style.display = 'none', 500);
                }

                // Add default text objects automatically
                const canvasHeight = MemeCanvas.getCanvas().height;
                MemeCanvas.addText("TOP TEXT", { 
                    top: canvasHeight * 0.1,
                    textTransform: 'uppercase'
                });
                MemeCanvas.addText("BOTTOM TEXT", { 
                    top: canvasHeight * 0.9,
                    textTransform: 'uppercase'
                });
            });
        }
    };

    const openTemplateInfo = (template) => {
        if (!els.modalInfo) return;

        state.activeModalTemplate = template;

        if (els.modalTitle) els.modalTitle.innerText = template.title || 'Untitled';
        if (els.modalCreator) els.modalCreator.innerText = template.creator || 'Unknown';
        if (els.modalProvider) els.modalProvider.innerText = template.provider || 'Web';
        
        if (els.modalBadge) {
            els.modalBadge.className = `license-badge detail-badge ${getBadgeClass(template.license)}`;
            els.modalBadge.innerText = template.license || 'Unknown';
        }

        if (els.btnModalSource) {
            // Avoid href="#" causing page jumps
            if (template.sourceUrl && template.sourceUrl !== '#') {
                els.btnModalSource.href = template.sourceUrl;
                els.btnModalSource.target = "_blank";
                els.btnModalSource.style.display = "inline-flex";
            } else if (template.imageUrl) {
                els.btnModalSource.href = template.imageUrl;
                els.btnModalSource.target = "_blank";
                els.btnModalSource.style.display = "inline-flex";
            } else {
                els.btnModalSource.style.display = "none";
            }
        }
        
        // Parse permissions
        if (els.modalComm && els.iconComm) {
            if (template.commercialAllowed === false) {
                els.modalComm.innerText = 'Not Recommended';
                els.modalComm.className = 'text-warning';
                els.iconComm.className = 'fa-solid fa-triangle-exclamation text-warning';
            } else {
                els.modalComm.innerText = 'Allowed';
                els.modalComm.className = 'text-success';
                els.iconComm.className = 'fa-solid fa-circle-check text-success';
            }
        }

        if (els.modalAttr && els.iconAttr) {
            if (template.attributionRequired) {
                els.modalAttr.innerText = 'Required';
                els.modalAttr.className = 'text-warning';
                els.iconAttr.className = 'fa-solid fa-circle-exclamation text-warning';
            } else {
                els.modalAttr.innerText = 'Not Required';
                els.modalAttr.className = 'text-primary';
                els.iconAttr.className = 'fa-solid fa-circle-check text-primary';
            }
        }

        els.modalInfo.classList.remove('hidden');
    };

    // ======================================================================
    // Local Storage Data Management
    // ======================================================================
    const getLocalList = (key) => {
        try {
            const data = localStorage.getItem(key);
            if (!data) return [];
            const parsed = JSON.parse(data);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.error(`[MemeForge] Failed to parse local storage for ${key}`, e);
            return [];
        }
    };

    const saveLocalList = (key, list) => {
        try {
            localStorage.setItem(key, JSON.stringify(list));
        } catch (e) {
            console.error(`[MemeForge] Storage limit reached or failed saving ${key}`, e);
            if (window.MemeUI) MemeUI.showToast("Storage full. Cannot save data.", "error");
        }
    };

    const toggleFavorite = (template, btnElement) => {
        let favorites = getLocalList(KEYS.FAVORITES);
        const index = favorites.findIndex(t => t.id === template.id);
        
        const icon = btnElement.querySelector('i');

        if (index >= 0) {
            // Remove
            favorites.splice(index, 1);
            btnElement.classList.remove('is-favorited');
            if (icon) icon.className = 'fa-regular fa-heart';
            if (window.MemeUI) MemeUI.showToast("Removed from favorites");
            
            // If on the favorites tab, remove the card dynamically
            if (state.currentTab === 'favorites') {
                const card = btnElement.closest('.template-card');
                if (card) {
                    card.style.opacity = '0';
                    setTimeout(() => {
                        card.remove();
                        if (favorites.length === 0 && els.emptyFavorites) {
                            els.emptyFavorites.classList.remove('hidden');
                        }
                    }, 300);
                }
            }
        } else {
            // Add
            favorites.push(template);
            btnElement.classList.add('is-favorited');
            if (icon) icon.className = 'fa-solid fa-heart';
            if (window.MemeUI) MemeUI.showToast("Added to favorites", "success");
        }

        saveLocalList(KEYS.FAVORITES, favorites);
    };

    const addToRecents = (template) => {
        let recents = getLocalList(KEYS.RECENT);
        // Remove if it exists so we can move it to the front
        recents = recents.filter(t => t.id !== template.id);
        recents.push(template);
        
        // Keep list lightweight (last 30)
        if (recents.length > 30) {
            recents.shift();
        }
        
        saveLocalList(KEYS.RECENT, recents);
    };

    // ======================================================================
    // Public API
    // ======================================================================
    return {
        init,
        useTemplate
    };

})();