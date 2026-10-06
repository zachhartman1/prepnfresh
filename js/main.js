document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.main-nav');
  if (!toggle || !nav) return;
  toggle.addEventListener('click', function () {
    nav.classList.toggle('open');
    var expanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!expanded));
  });
  nav.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () { nav.classList.remove('open'); });
  });
});

// Centralized "missing photo" fallback for every dish/hero image on the
// site. An <img> whose src fails to load carries data-fallback-wrap
// naming the ancestor selector to mark with a "no-image" class (which
// CSS uses to show the "Add photo" placeholder) — the image itself is
// then removed. This replaces per-image inline onerror="" attributes,
// which required loosening the Content-Security-Policy to allow inline
// scripts; a single delegated listener here means script-src can stay
// locked to 'self' with no exceptions. The 'error' event doesn't bubble,
// so this listens in the capture phase instead, which does catch it.
document.addEventListener('error', function (e) {
  var img = e.target;
  if (!img || img.tagName !== 'IMG' || !img.dataset || !img.dataset.fallbackWrap) return;
  var wrap = img.closest(img.dataset.fallbackWrap);
  if (wrap) wrap.classList.add('no-image');
  img.remove();
}, true);
