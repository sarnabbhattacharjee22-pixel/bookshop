/* ==========================================================================
   MemeForge | js/providers.js
   Dynamic Template API Adapter & Provider Manager
   ========================================================================== */

window.MemeProviders = (function() {

    // ======================================================================
    // 1. WIKIMEDIA COMMONS PROVIDER (Primary - 100% Open & CORS Safe)
    // ======================================================================
    const WikimediaProvider = {
        name: 'Wikimedia Commons',
        baseUrl: 'https://commons.wikimedia.org/w/api.php',
        
        async search(query, options = {}) {
            const page = options.page || 1;
            const limit = options.limit || 30;
            const offset = (page - 1) * limit;
            
            let searchQuery = query ? `${query} meme` : 'meme template';
            
            // origin=* is REQUIRED for Wikimedia to allow browser-side CORS
            // iiurlwidth=400 ensures we get a lightweight thumbnail URL
            const url = `${this.baseUrl}?action=query&generator=search&gsrsearch=${encodeURIComponent(searchQuery)}&gsrnamespace=6&gsrlimit=${limit}&gsroffset=${offset}&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=400&format=json&origin=*`;
            
            console.group('[MemeForge Template Network] WIKIMEDIA');
            console.log('Provider:', this.name);
            console.log('Request URL:', url);
            console.log('Query:', searchQuery);

            try {
                const response = await fetch(url);
                
                console.log('Response status:', response.status);
                console.log('Response OK:', response.ok);

                if (!response.ok) {
                    if (response.status === 429) throw new Error("Rate limit exceeded (429)");
                    throw new Error(`HTTP Error: ${response.status}`);
                }

                const data = await response.json();
                console.log('Raw response:', data);
                console.groupEnd();

                if (!data || !data.query || !data.query.pages) {
                    return { results: [], hasMore: false, total: 0 };
                }

                const pages = Object.values(data.query.pages);
                const results = this.normalize(pages);

                return {
                    results: results,
                    hasMore: data.continue !== undefined,
                    total: results.length
                };

            } catch (error) {
                console.error('[MemeForge Template Network] FETCH FAILED', error);
                console.groupEnd();
                throw error;
            }
        },

        normalize(pages) {
            const normalized = [];
            for (const page of pages) {
                if (!page.imageinfo || !page.imageinfo[0]) continue;
                
                const info = page.imageinfo[0];
                const meta = info.extmetadata || {};
                
                let licenseRaw = meta.LicenseShortName ? meta.LicenseShortName.value : 'Unknown';
                
                const isPD = licenseRaw.toLowerCase().includes('cc0') || licenseRaw.toLowerCase().includes('pd') || licenseRaw.toLowerCase().includes('public domain');
                const isNC = licenseRaw.toLowerCase().includes('nc'); // Non-commercial restriction
                
                // Parse Creator HTML safely
                let creator = 'Unknown Creator';
                if (meta.Artist) {
                    const temp = document.createElement('div');
                    temp.innerHTML = meta.Artist.value;
                    creator = temp.textContent || temp.innerText || 'Unknown Creator';
                }

                normalized.push({
                    id: `wiki_${page.pageid}`,
                    title: page.title.replace('File:', '').replace(/\.[^/.]+$/, "") || 'Wikimedia Image',
                    imageUrl: info.url,
                    thumbnailUrl: info.thumburl || info.url,
                    sourceUrl: info.descriptionurl || info.url,
                    creator: creator,
                    provider: this.name,
                    license: licenseRaw,
                    licenseUrl: meta.LicenseUrl ? meta.LicenseUrl.value : '#',
                    attributionRequired: !isPD,
                    commercialAllowed: !isNC,
                    width: info.width || 800,
                    height: info.height || 800,
                    tags: ['wikimedia', 'commons']
                });
            }
            return normalized;
        }
    };

    // ======================================================================
    // 2. IMGFLIP PROVIDER (Secondary - Guaranteed classic formats)
    // ======================================================================
    const ImgflipProvider = {
        name: 'Imgflip (Meme Database)',
        baseUrl: 'https://api.imgflip.com/get_memes',
        
        async search(query, options = {}) {
            const page = options.page || 1;
            const limit = options.limit || 30;
            
            console.group('[MemeForge Template Network] IMGFLIP');
            console.log('Provider:', this.name);
            console.log('Request URL:', this.baseUrl);
            
            try {
                const response = await fetch(this.baseUrl);
                console.log('Response status:', response.status);
                
                if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

                const data = await response.json();
                console.log('Raw response length:', data.data?.memes?.length);
                console.groupEnd();

                if (!data.success || !data.data || !data.data.memes) {
                    return { results: [], hasMore: false, total: 0 };
                }

                let memes = data.data.memes;

                // In-memory filter since Imgflip doesn't have a search endpoint
                if (query && query !== 'trending' && query !== 'all') {
                    const q = query.toLowerCase();
                    memes = memes.filter(m => m.name.toLowerCase().includes(q));
                }

                const start = (page - 1) * limit;
                const end = start + limit;
                const paginated = memes.slice(start, end);

                return {
                    results: this.normalize(paginated),
                    hasMore: end < memes.length,
                    total: memes.length
                };

            } catch (error) {
                console.error('[MemeForge Template Network] FETCH FAILED', error);
                console.groupEnd();
                throw error;
            }
        },

        normalize(memes) {
            return memes.map(m => ({
                id: `imgf_${m.id}`,
                title: m.name,
                imageUrl: m.url,
                thumbnailUrl: m.url, // Imgflip URLs are already optimized (~100kb)
                sourceUrl: m.url,
                creator: 'Imgflip Community',
                provider: this.name,
                license: 'Fair Use / Standard Meme',
                licenseUrl: 'https://imgflip.com/terms',
                attributionRequired: false,
                commercialAllowed: false, // Memes are legally risky for commercial ads
                width: m.width,
                height: m.height,
                tags: ['meme', 'classic']
            }));
        }
    };

    // ======================================================================
    // 3. LOCAL FALLBACK PROVIDER (Offline safety net)
    // ======================================================================
    const LocalFallbackProvider = {
        name: 'Local Vault',
        async search(query, options = {}) {
            await new Promise(resolve => setTimeout(resolve, 300));
            const page = options.page || 1;
            const limit = options.limit || 30;
            const q = (query || '').toLowerCase();

            const localData = (window.MemeData && window.MemeData.templates) ? window.MemeData.templates : [];

            let filtered = localData.filter(item => {
                return !q || q === 'trending' || item.name.toLowerCase().includes(q);
            });

            const start = (page - 1) * limit;
            const end = start + limit;

            return {
                results: this.normalize(filtered.slice(start, end)),
                hasMore: end < filtered.length,
                total: filtered.length
            };
        },
        normalize(raw) {
            return raw.map(item => ({
                id: `loc_${item.id}`,
                title: item.name || 'Local Template',
                imageUrl: item.url,
                thumbnailUrl: item.url,
                sourceUrl: item.url,
                creator: 'MemeForge Local',
                provider: this.name,
                license: item.license || 'CC0',
                licenseUrl: '#',
                attributionRequired: false,
                commercialAllowed: true,
                width: item.width || 800,
                height: item.height || 800,
                tags: item.categories || []
            }));
        }
    };

    // ======================================================================
    // 4. TEMPLATE PROVIDER MANAGER
    // ======================================================================
    const TemplateProviderManager = {
        _cache: new Map(),

        async search(query, options = {}) {
            const cacheKey = `${query}_${options.page}_${options.licenseType}`;
            
            if (this._cache.has(cacheKey)) {
                return this._cache.get(cacheKey);
            }

            let finalResults = [];
            let hasMore = false;
            let usingFallback = false;

            try {
                // Determine routing based on query. 
                // "drake" or classic meme names do terribly on Wikimedia, route them to Imgflip first.
                const isMemeSpecific = query && ['drake', 'boyfriend', 'brain', 'doge'].some(k => query.toLowerCase().includes(k));
                
                if (isMemeSpecific) {
                    const imgflipRes = await ImgflipProvider.search(query, options);
                    finalResults = imgflipRes.results;
                    hasMore = imgflipRes.hasMore;
                } else {
                    // Default behavior: Wikimedia First
                    const wikiRes = await WikimediaProvider.search(query, options);
                    finalResults = wikiRes.results;
                    hasMore = wikiRes.hasMore;

                    // If Wikimedia returns 0 results, fallback to Imgflip seamlessly
                    if (finalResults.length === 0) {
                        console.log("[MemeForge] Wikimedia returned 0 results. Checking Imgflip...");
                        const imgflipRes = await ImgflipProvider.search(query, options);
                        finalResults = imgflipRes.results;
                        hasMore = imgflipRes.hasMore;
                    }
                }

            } catch (err) {
                console.warn("[MemeForge] Online networks failed. Using Local Fallback.", err);
                const localRes = await LocalFallbackProvider.search(query, options);
                finalResults = localRes.results;
                hasMore = localRes.hasMore;
                usingFallback = true;
            }

            // LICENSE FILTERING APPLIED HERE
            if (options.licenseType && options.licenseType !== 'all') {
                finalResults = finalResults.filter(r => {
                    if (options.licenseType === 'public-domain') {
                        return r.license.toLowerCase().includes('cc0') || r.license.toLowerCase() === 'pd';
                    }
                    if (options.licenseType === 'commercial') {
                        return r.commercialAllowed === true;
                    }
                    if (options.licenseType === 'no-attribution') {
                        return r.attributionRequired === false;
                    }
                    return true;
                });
            }

            finalResults = this._deduplicate(finalResults);

            const resultObj = {
                results: finalResults,
                hasMore: hasMore,
                isFallback: usingFallback
            };

            // Cache management
            if (this._cache.size > 50) this._cache.delete(this._cache.keys().next().value);
            this._cache.set(cacheKey, resultObj);

            return resultObj;
        },

        _deduplicate(templates) {
            const seen = new Set();
            return templates.filter(t => {
                const hash = t.imageUrl.split('?')[0]; 
                if (seen.has(hash)) return false;
                seen.add(hash);
                return true;
            });
        }
    };

    return TemplateProviderManager;
})();