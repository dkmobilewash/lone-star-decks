// Mobile navigation and submenu toggles.
(function () {
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  document.querySelectorAll('.submenu-toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var menu = btn.parentElement.querySelector('.menu');
      var open = menu.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });

  // Close the mobile menu after jumping to an on-page anchor like #quote.
  if (nav) {
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a') && e.target.closest('a').getAttribute('href').charAt(0) === '#') {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }
})();
