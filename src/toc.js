document.addEventListener('DOMContentLoaded', () => {
    const aside = document.querySelector('aside');

    const filename = location.pathname.split('/').pop();
    const links = [...aside.querySelectorAll(`a[href^="${filename}"]`)];
    for (const link of links) {
        link.dataset.anchor = link.href.split('#').pop();
    }

    if (links) {
        const selector = links.filter(Boolean).map((x) => '#' + x.dataset.anchor).join(',');
        const anchors = [...document.querySelectorAll(selector)];

        let highlighted;
        const highlightCurrentLink = () => {
            const anchor = findCurrentAnchor(anchors);
            if (anchor.id === highlighted?.dataset?.anchor) {
                return;
            }

            highlighted?.classList?.remove('current');

            highlighted = links.find((x) => x.dataset.anchor == anchor.id);
            highlighted.classList.add('current');
        };

        highlightCurrentLink();
        highlighted.scrollIntoView({
            block: 'center',
        });

        document.addEventListener(
            'scroll',
            throttle(200, () => {
                highlightCurrentLink();
                history.replaceState(null, '', highlighted.href);
            }),
            { passive: true },
        );
    }
});

function findCurrentAnchor(anchors) {
    const line = window.innerHeight * 0.3;

    for (const anchor of [...anchors].reverse()) {
        const rect = anchor.getBoundingClientRect();
        if (rect.top < line) {
            return anchor;
        }
    }

    return anchors[0];
}

function throttle(timeout, fn) {
    let interval = undefined;
    let scheduled = false;

    return (...args) => {
        if (interval !== undefined) {
            scheduled = true;
            return;
        }

        fn(...args);
        scheduled = false;

        interval = setInterval(() => {
            if (scheduled) {
                fn(...args);
                scheduled = false;
            } else {
                clearInterval(interval);
                interval = undefined;
            }
        }, timeout);
    };
}
