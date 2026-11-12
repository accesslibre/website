(function () {
  'use strict';
  var mobile = window.matchMedia('(max-width: 48rem)');
  var button;
  var panel;
  var open = false;

  function render() {
    if (!button || !panel) return;
    button.hidden = !mobile.matches;
    panel.hidden = mobile.matches && !open;
    button.setAttribute('aria-expanded', String(mobile.matches && open));
    var label = button.querySelector('[data-nav-label]');
    var text = mobile.matches && open ? 'Close' : 'Menu';
    if (label.textContent !== text) label.textContent = text;
  }

  function close(restoreFocus) {
    if (!open) return;
    open = false;
    render();
    if (restoreFocus) button.focus();
  }

  function connect() {
    // Wait until the DC home has rendered, rather than editing its source template.
    var next = Array.from(document.querySelectorAll('[data-nav-toggle]'))
      .find(function (node) { return !node.closest('x-dc'); });
    if (!next || next === button) return;
    button = next;
    panel = document.getElementById(button.getAttribute('aria-controls'));
    open = false;
    render();
  }

  document.addEventListener('click', function (event) {
    if (!button || !panel || !mobile.matches) return;
    if (button.contains(event.target)) {
      open = !open;
      render();
    } else if (panel.contains(event.target) && event.target.closest('a')) {
      close(false);
    } else if (!button.closest('header').contains(event.target)) {
      close(false);
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && mobile.matches && open) {
      event.preventDefault();
      close(true);
    }
  });

  mobile.addEventListener('change', function () {
    if (!button || !panel) return;
    var buttonFocused = document.activeElement === button;
    var panelFocused = panel.contains(document.activeElement);
    open = false;
    render();
    if (mobile.matches && panelFocused) button.focus();
    if (!mobile.matches && buttonFocused) panel.querySelector('a').focus();
  });

  connect();
  // The imported home can mount or replace its header after this deferred script.
  new MutationObserver(connect).observe(document.body, { childList: true, subtree: true });
})();
