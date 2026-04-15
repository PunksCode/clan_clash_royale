// ============================================
//   nav.js — Hamburger Menu (shared)
// ============================================
(function () {
    const hamburger = document.getElementById('hamburger');
    const navList   = document.getElementById('navList');
    const overlay   = document.getElementById('navOverlay');

    if (!hamburger || !navList || !overlay) return;

    // Marcar link activo según la página actual
    (function setActiveLink() {
        const current = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
        navList.querySelectorAll('a[href]').forEach(function (a) {
            const href = (a.getAttribute('href') || '').split('/').pop().toLowerCase();
            if (href && href === current) a.classList.add('active');
        });
    })();

    function openMenu() {
        hamburger.classList.add('open');
        navList.classList.add('open');
        overlay.classList.add('open');
        hamburger.setAttribute('aria-expanded', 'true');
        overlay.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }

    function closeMenu() {
        hamburger.classList.remove('open');
        navList.classList.remove('open');
        overlay.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
        overlay.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    hamburger.addEventListener('click', function () {
        const isOpen = navList.classList.contains('open');
        isOpen ? closeMenu() : openMenu();
    });

    // Cerrar al hacer click en el overlay
    overlay.addEventListener('click', closeMenu);

    // Cerrar con Escape
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeMenu();
    });

    // Cerrar al hacer click en un link (para SPA o misma página)
    navList.querySelectorAll('a').forEach(function (link) {
        link.addEventListener('click', closeMenu);
    });
})();
