/**
 * NovaBooks - Main JavaScript file
 * Handles core UI interactions, navigation, modals, and generic components.
 */

document.addEventListener('DOMContentLoaded', () => {
    
    /* ==========================================================================
       1. MOBILE NAVIGATION & OFFCANVAS MENU
       ========================================================================== */
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const closeMenuBtn = document.getElementById('closeMenuBtn');
    const mainNav = document.querySelector('.main-nav');
    const menuOverlay = document.getElementById('menuOverlay');
    const body = document.body;

    // Open Mobile Menu
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            mainNav.classList.add('active');
            menuOverlay.classList.add('active');
            body.classList.add('no-scroll');
        });
    }

    // Close Mobile Menu
    const closeMenu = () => {
        mainNav.classList.remove('active');
        menuOverlay.classList.remove('active');
        body.classList.remove('no-scroll');
    };

    if (closeMenuBtn) closeMenuBtn.addEventListener('click', closeMenu);
    if (menuOverlay) menuOverlay.addEventListener('click', closeMenu);

    /* ==========================================================================
       2. MOBILE MEGA MENU ACCORDION
       ========================================================================== */
    const dropdownItems = document.querySelectorAll('.nav-item.has-dropdown');

    dropdownItems.forEach(item => {
        const link = item.querySelector('a');
        
        link.addEventListener('click', (e) => {
            // Only act as accordion on mobile/tablet view (< 992px)
            if (window.innerWidth <= 992) {
                e.preventDefault();
                item.classList.toggle('active');
                
                // Close other open dropdowns
                dropdownItems.forEach(otherItem => {
                    if (otherItem !== item) {
                        otherItem.classList.remove('active');
                    }
                });
            }
        });
    });

    // Reset accordion state on window resize
    window.addEventListener('resize', () => {
        if (window.innerWidth > 992) {
            dropdownItems.forEach(item => item.classList.remove('active'));
            if (mainNav.classList.contains('active')) {
                closeMenu();
            }
        }
    });

    /* ==========================================================================
       3. STICKY HEADER & SCROLL EFFECTS
       ========================================================================== */
    const header = document.getElementById('header');
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;

        // Add subtle shadow when scrolling down
        if (currentScroll > 50) {
            header.style.boxShadow = '0 4px 10px rgba(0,0,0,0.08)';
        } else {
            header.style.boxShadow = 'var(--shadow-sm)';
        }
        
        lastScroll = currentScroll;
    });

    /* ==========================================================================
       4. COUNTDOWN TIMER (Deal of the Week)
       ========================================================================== */
    const countdownEl = document.getElementById('countdown');
    
    if (countdownEl) {
        // Set target date to 3 days, 14 hours from now (Simulating an active deal)
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + 3);
        targetDate.setHours(targetDate.getHours() + 14);

        const daysEl = document.getElementById('days');
        const hoursEl = document.getElementById('hours');
        const minsEl = document.getElementById('mins');
        const secsEl = document.getElementById('secs');

        const updateCountdown = () => {
            const now = new Date().getTime();
            const distance = targetDate.getTime() - now;

            if (distance < 0) {
                clearInterval(timerInterval);
                countdownEl.innerHTML = '<div class="promo-expired">Deal has expired!</div>';
                return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            // Add leading zeros
            daysEl.textContent = days < 10 ? '0' + days : days;
            hoursEl.textContent = hours < 10 ? '0' + hours : hours;
            minsEl.textContent = minutes < 10 ? '0' + minutes : minutes;
            secsEl.textContent = seconds < 10 ? '0' + seconds : seconds;
        };

        // Initial call and interval setup
        updateCountdown();
        const timerInterval = setInterval(updateCountdown, 1000);
    }

    /* ==========================================================================
       5. QUICK VIEW MODAL LOGIC
       ========================================================================== */
    const quickViewModal = document.getElementById('quickViewModal');
    const quickViewBtns = document.querySelectorAll('.quick-view-btn');
    let closeQuickViewBtn = null;

    const openQuickView = (bookId) => {
        // In a real scenario, fetch book details by ID. 
        // Here we simulate the modal content injection for the prototype.
        const modalContent = document.getElementById('quickViewContent');
        
        modalContent.innerHTML = `
            <div class="quick-view-image" style="flex: 1; padding: 20px;">
                <img src="https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=400&q=80" alt="Book Cover" style="width: 100%; border-radius: 8px;">
            </div>
            <div class="quick-view-details" style="flex: 1.5; padding: 20px; display: flex; flex-direction: column; justify-content: center;">
                <span style="color: var(--color-text-muted); font-size: 0.85rem; text-transform: uppercase;">Thriller</span>
                <h2 style="font-family: var(--font-heading); color: var(--color-primary); margin-bottom: 10px; font-size: 2rem;">The Silent Patient</h2>
                <p style="color: var(--color-secondary); font-weight: 600; margin-bottom: 15px;">Alex Michaelides</p>
                <p style="color: var(--color-text-muted); margin-bottom: 20px; line-height: 1.6;">A shocking psychological thriller of a woman's act of violence against her husband—and of the therapist obsessed with uncovering her motive.</p>
                <div style="font-size: 1.5rem; color: var(--color-primary); font-weight: 700; margin-bottom: 25px;">৳ 510 <span style="text-decoration: line-through; color: var(--color-text-muted); font-size: 1rem; margin-left: 10px;">৳ 600</span></div>
                <div style="display: flex; gap: 15px;">
                    <input type="number" value="1" min="1" style="width: 70px; padding: 10px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); text-align: center; font-weight: 600;">
                    <button class="btn btn-primary" style="flex: 1;"><i class="fa-solid fa-bag-shopping"></i> Add to Cart</button>
                    <button class="btn btn-outline-white" style="border-color: var(--color-border); color: var(--color-text-main);"><i class="fa-regular fa-heart"></i></button>
                </div>
                <a href="book-details.html?id=${bookId}" style="margin-top: 20px; display: inline-block; text-decoration: underline; font-weight: 600;">View Full Details</a>
            </div>
        `;
        
        // Setup flex layout for the injected content
        modalContent.style.display = 'flex';
        if(window.innerWidth < 768) {
            modalContent.style.flexDirection = 'column';
        } else {
            modalContent.style.flexDirection = 'row';
        }

        quickViewModal.classList.add('active');
        body.classList.add('no-scroll');
    };

    const closeQuickView = () => {
        quickViewModal.classList.remove('active');
        body.classList.remove('no-scroll');
    };

    // Attach events to all quick view buttons
    quickViewBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            // Get parent book card ID
            const bookCard = e.target.closest('.book-card');
            const bookId = bookCard ? bookCard.getAttribute('data-id') : '1';
            openQuickView(bookId);
        });
    });

    // Close Modal via close button
    if (quickViewModal) {
        closeQuickViewBtn = quickViewModal.querySelector('.close-modal');
        closeQuickViewBtn.addEventListener('click', closeQuickView);
        
        // Close Modal via overlay click
        quickViewModal.addEventListener('click', (e) => {
            if (e.target === quickViewModal) {
                closeQuickView();
            }
        });
    }

    /* ==========================================================================
       6. LIVE SEARCH MOCKUP (UI Only)
       ========================================================================== */
    const searchInput = document.getElementById('searchInput');
    const searchSuggestions = document.getElementById('searchSuggestions');

    if (searchInput && searchSuggestions) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            
            if (query.length > 2) {
                // Show mock suggestions
                searchSuggestions.innerHTML = `
                    <ul style="padding: 10px; margin: 0; list-style: none;">
                        <li style="padding: 8px 10px; border-bottom: 1px solid #eee; display: flex; align-items: center; gap: 10px;">
                            <i class="fa-solid fa-book" style="color: var(--color-text-muted);"></i>
                            <a href="book-details.html" style="color: var(--color-text-main); font-weight: 500;">${query} in Fiction</a>
                        </li>
                        <li style="padding: 8px 10px; border-bottom: 1px solid #eee; display: flex; align-items: center; gap: 10px;">
                            <i class="fa-solid fa-user-pen" style="color: var(--color-text-muted);"></i>
                            <a href="authors.html" style="color: var(--color-text-main); font-weight: 500;">Author matching "${query}"</a>
                        </li>
                        <li style="padding: 8px 10px; display: flex; align-items: center; gap: 10px;">
                            <img src="https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=50&q=80" style="width: 30px; height: 40px; object-fit: cover; border-radius: 2px;">
                            <div>
                                <a href="book-details.html" style="display: block; color: var(--color-primary); font-weight: 600; font-size: 0.9rem;">The Silent Patient</a>
                                <span style="font-size: 0.75rem; color: var(--color-text-muted);">Alex Michaelides</span>
                            </div>
                        </li>
                    </ul>
                `;
                
                searchSuggestions.style.position = 'absolute';
                searchSuggestions.style.top = '100%';
                searchSuggestions.style.left = '0';
                searchSuggestions.style.width = '100%';
                searchSuggestions.style.backgroundColor = 'var(--color-white)';
                searchSuggestions.style.boxShadow = 'var(--shadow-md)';
                searchSuggestions.style.borderRadius = '0 0 var(--radius-md) var(--radius-md)';
                searchSuggestions.style.zIndex = '100';
                searchSuggestions.style.display = 'block';
            } else {
                searchSuggestions.style.display = 'none';
            }
        });

        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !searchSuggestions.contains(e.target)) {
                searchSuggestions.style.display = 'none';
            }
        });
    }
});