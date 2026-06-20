(function () {
    if (window.__pageTransitionInitialized) {
        return;
    }
    window.__pageTransitionInitialized = true;

    const NAVIGATION_DELAY = 180;
    const ENTER_CLASS = 'page-transition-enter';
    const LEAVE_CLASS = 'page-transition-leave';
    const STYLE_ID = 'page-transition-styles';

    const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    function prefersReducedMotion() {
        return reduceMotionQuery.matches;
    }

    function ensureStyles() {
        if (document.getElementById(STYLE_ID)) {
            return;
        }

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
html.${ENTER_CLASS} body {
    opacity: 0;
}

html.${LEAVE_CLASS} body {
    opacity: 0;
}

body {
    transition:
        opacity 220ms cubic-bezier(0.22, 1, 0.36, 1),
        filter 220ms cubic-bezier(0.22, 1, 0.36, 1);
    will-change: opacity, filter;
}

body::before {
    content: '';
    position: fixed;
    inset: 0;
    pointer-events: none;
    opacity: 0;
    background:
        radial-gradient(circle at top, rgba(17, 166, 184, 0.08), transparent 55%),
        linear-gradient(to bottom, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0));
    transition: opacity 220ms cubic-bezier(0.22, 1, 0.36, 1);
    z-index: 2147483646;
}

html.${LEAVE_CLASS} body::before {
    opacity: 1;
}

html.${ENTER_CLASS} body::before {
    opacity: 0;
}

html.${LEAVE_CLASS} body {
    filter: blur(1px) saturate(0.98);
}

html.${ENTER_CLASS} body {
    filter: blur(0.5px);
}

@media (prefers-reduced-motion: reduce) {
    body,
    body::before {
        transition: none !important;
    }
}
`;
        document.head.appendChild(style);
    }

    function startEnterAnimation() {
        if (prefersReducedMotion() || window.__pageTransitionEnterStarted) {
            return;
        }

        window.__pageTransitionEnterStarted = true;
        const html = document.documentElement;
        html.classList.add(ENTER_CLASS);

        requestAnimationFrame(() => {
            html.classList.remove(ENTER_CLASS);
        });
    }

    function sameOriginUrl(rawUrl) {
        try {
            return new URL(rawUrl, window.location.href);
        } catch (error) {
            return null;
        }
    }

    function isSamePageLink(link) {
        const targetUrl = sameOriginUrl(link.href);
        if (!targetUrl) {
            return false;
        }

        if (targetUrl.origin !== window.location.origin) {
            return false;
        }

        const current = new URL(window.location.href);
        return (
            targetUrl.pathname === current.pathname &&
            targetUrl.search === current.search &&
            targetUrl.hash !== ''
        );
    }

    function shouldAnimateLink(link, event) {
        if (!link || !link.href) {
            return false;
        }

        if (link.hasAttribute('download')) {
            return false;
        }

        if (link.target && link.target !== '_self') {
            return false;
        }

        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
            return false;
        }

        if (link.getAttribute('href').startsWith('#') || isSamePageLink(link)) {
            return false;
        }

        const targetUrl = sameOriginUrl(link.href);
        if (!targetUrl) {
            return false;
        }

        return targetUrl.origin === window.location.origin;
    }

    function navigateWithTransition(rawUrl, options = {}) {
        const targetUrl = sameOriginUrl(rawUrl);
        if (!targetUrl) {
            window.location.href = rawUrl;
            return;
        }

        const replace = Boolean(options.replace);
        if (prefersReducedMotion()) {
            if (replace) {
                window.location.replace(targetUrl.href);
            } else {
                window.location.assign(targetUrl.href);
            }
            return;
        }

        if (window.__pageTransitionLeaving) {
            return;
        }
        window.__pageTransitionLeaving = true;

        const html = document.documentElement;
        html.classList.remove(ENTER_CLASS);
        html.classList.add(LEAVE_CLASS);

        window.setTimeout(() => {
            if (replace) {
                window.location.replace(targetUrl.href);
            } else {
                window.location.assign(targetUrl.href);
            }
        }, NAVIGATION_DELAY);
    }

    function handleClick(event) {
        const link = event.target.closest('a[href]');
        if (!link || !shouldAnimateLink(link, event)) {
            return;
        }

        event.preventDefault();
        navigateWithTransition(link.href, {
            replace: link.dataset.transitionReplace === 'true',
        });
    }

    ensureStyles();
    window.transitionNavigate = navigateWithTransition;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startEnterAnimation, { once: true });
    } else {
        startEnterAnimation();
    }

    window.addEventListener('pageshow', (event) => {
        window.__pageTransitionLeaving = false;
        const html = document.documentElement;
        html.classList.remove(LEAVE_CLASS);

        if (!event.persisted || prefersReducedMotion()) {
            return;
        }

        window.__pageTransitionEnterStarted = false;
        startEnterAnimation();
    });

    document.addEventListener('click', handleClick, true);
})();
