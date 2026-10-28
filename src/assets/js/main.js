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

// Quote forms: submit to /api/quote without leaving the page, then go to /thank-you/.
// Without JavaScript the form still posts normally and the server redirects.
(function () {
  var callUs = 'Please call <a href="tel:+18304311093">(830) 431-1093</a> instead.';

  function showError(form, msg) {
    var status = form.querySelector('.form-status');
    status.innerHTML = (msg || 'Sorry, something went wrong sending your request.') + ' ' + callUs;
    status.hidden = false;
  }

  document.querySelectorAll('.quote-form').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      if (!window.fetch) return;
      e.preventDefault();
      var button = form.querySelector('button[type="submit"]');
      var label = button.textContent;
      button.disabled = true;
      button.textContent = 'Sending…';
      form.querySelector('.form-status').hidden = true;

      var data = {};
      new FormData(form).forEach(function (value, key) { data[key] = value; });

      fetch(form.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data),
      })
        .then(function (res) { return res.json().catch(function () { return { ok: false }; }); })
        .then(function (result) {
          if (result.ok) {
            window.location.href = '/thank-you/';
          } else {
            showError(form, result.error);
            button.disabled = false;
            button.textContent = label;
          }
        })
        .catch(function () {
          showError(form);
          button.disabled = false;
          button.textContent = label;
        });
    });
  });

  // No-JS fallback redirects here with ?error=1 when sending failed.
  if (/[?&]error=1/.test(window.location.search)) {
    var form = document.querySelector('.quote-form');
    if (form) showError(form);
  }
})();
