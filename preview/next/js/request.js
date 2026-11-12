(function () {
  'use strict';
  var form = document.getElementById('request-form');
  if (!form) return;
  var status = document.getElementById('request-status');
  var button = form.querySelector('[type="submit"]');
  var receipt = document.getElementById('request-receipt');
  var receiptHeading = document.getElementById('receipt-heading');
  var intro = document.querySelector('.request-intro');
  var review = document.getElementById('proposal-expectations');
  var availability = document.getElementById('request-availability');
  var initialTitle = document.title;
  var fields = ['barrier', 'who', 'email', 'name'].map(function (name) {return form.elements[name];});
  var ready, widget, pending, attempt, verificationToken = '', verificationTimer, verificationFailed = false, locked = false, busy = false;
  form.hidden = false;
  function message(text, focus) {status.textContent = text; if (focus) status.focus();}
  function working(value, label) {
    busy = value; button.disabled = value || locked; button.textContent = label || 'Send proposal';
    form.setAttribute('aria-busy', String(value));
    fields.forEach(function (field) {field.readOnly = value;});
  }
  function invalid(field, text) {
    field.setAttribute('aria-invalid', 'true');
    if (field.dataset.description === undefined) field.dataset.description = field.getAttribute('aria-describedby') || '';
    field.setAttribute('aria-describedby', (field.dataset.description + ' request-status').trim());
    message(text); field.focus();
  }
  fields.forEach(function (field) {
    field.addEventListener('input', function () {
      field.removeAttribute('aria-invalid');
      if (field.dataset.description !== undefined) {
        if (field.dataset.description) field.setAttribute('aria-describedby', field.dataset.description);
        else field.removeAttribute('aria-describedby');
      }
    });
  });
  function loadTurnstile() {
    if (window.turnstile) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var timer = setTimeout(function () {reject(new Error('Spam check unavailable'));}, 20000);
      window.onLibreProposalTurnstile = function () {clearTimeout(timer); resolve();};
      var script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onLibreProposalTurnstile';
      script.async = true;
      script.onerror = function () {clearTimeout(timer); script.remove(); reject(new Error('Spam check unavailable'));};
      document.head.appendChild(script);
    });
  }
  function ensureReady() {
    if (ready) return ready;
    ready = (async function () {
      var response = await fetch('/api/request-config', {cache: 'no-store', signal: AbortSignal.timeout(15000)});
      var config = await response.json();
      if (!response.ok || !config.available || !config.turnstileSiteKey) throw new Error('Sending unavailable');
      await loadTurnstile();
      var container = document.getElementById('proposal-spam-check');
      widget = window.turnstile.render(container, {
        sitekey: config.turnstileSiteKey, action: 'proposal', theme: 'light',
        size: container.getBoundingClientRect().width < 300 ? 'compact' : 'flexible',
        execution: 'render', appearance: 'always',
        callback: function (token) {
          clearTimeout(verificationTimer); verificationFailed = false; verificationToken = token;
          if (pending) deliver(token);
        },
        'expired-callback': function () {verificationToken = '';},
        'error-callback': function (code) {
          clearTimeout(verificationTimer); verificationFailed = true; verificationToken = '';
          console.warn('Proposal spam check error:', code);
          pending = null; working(false);
          message('The spam check could not finish. Your text is still here. Please try again or use email.');
          return true;
        },
        'timeout-callback': function () {
          clearTimeout(verificationTimer); verificationFailed = true; verificationToken = '';
          pending = null; working(false);
          message('The spam check timed out. Your text is still here. Please try again.');
        }
      });
    })();
    ready.catch(function () {ready = null;});
    return ready;
  }
  function reference(id) {return 'LA-' + id.replaceAll('-', '').slice(0, 12).toUpperCase();}
  function uncertain() {
    locked = true; working(false, 'Delivery unconfirmed');
    message('We could not confirm delivery. Your text is still here. Email contact@libreaccessibility.org with reference ' + reference(attempt.id) + ' before sending again.', true);
  }
  async function deliver(token) {
    var payload = pending;
    if (!payload) return;
    clearTimeout(verificationTimer); verificationToken = ''; pending = null;
    button.textContent = 'Sending…'; message('Sending your proposal.');
    try {
      var response = await fetch('/api/request', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(Object.assign({}, payload, {submissionId: attempt.id, turnstileToken: token})),
        signal: AbortSignal.timeout(60000)
      });
      var result = await response.json();
      if (response.ok && result.ok && result.reference) {
        locked = true; working(false, 'Proposal sent');
        fields.forEach(function (field) {field.readOnly = true;});
        clearTimeout(verificationTimer);
        try {window.turnstile.remove(widget);} catch { /* A cleanup error must not hide a confirmed receipt. */ }
        widget = undefined; ready = null;
        document.getElementById('receipt-reference').textContent = result.reference;
        form.hidden = true; intro.hidden = true; review.hidden = true; availability.hidden = true;
        receipt.hidden = false;
        document.title = 'Proposal received - LibreAccessibility';
        message(''); receiptHeading.focus();
        return;
      }
      if (result.code === 'uncertain' || result.code === 'conflict') {uncertain(); return;}
      working(false);
      if (result.field && form.elements[result.field]) invalid(form.elements[result.field], result.error);
      else message((result.error || 'Your proposal was not sent. Please try again or use email.') + ' Your text is still here.');
      window.turnstile.reset(widget);
    } catch {uncertain();}
  }
  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (busy || locked) return;
    var barrier = form.elements.barrier, email = form.elements.email;
    if (!barrier.value.trim()) {invalid(barrier, 'Describe the barrier you would like help with.'); return;}
    if (!email.value.trim() || !email.checkValidity()) {invalid(email, 'Enter a valid email address so we can reply.'); return;}
    var payload = Object.fromEntries(fields.map(function (field) {return [field.name, field.value.trim()];}));
    var signature = JSON.stringify(payload);
    if (!attempt || attempt.signature !== signature) attempt = {id: crypto.randomUUID(), signature: signature};
    pending = payload; working(true, 'Checking…'); message('Complete the spam check to send your proposal.');
    try {
      await ensureReady();
      if (verificationToken && !window.turnstile.isExpired(widget)) {deliver(verificationToken); return;}
      if (verificationFailed || window.turnstile.isExpired(widget)) {
        verificationFailed = false; verificationToken = ''; window.turnstile.reset(widget);
      }
      verificationTimer = setTimeout(function () {
        if (!pending) return;
        pending = null; working(false);
        message('The spam check did not finish. Your text is still here. Please try again or use email.');
      }, 45000);
    } catch {
      pending = null; working(false);
      message('Sending is temporarily unavailable. Your text is still here. Please try again or use email.');
    }
  });
  function prepare() {
    button.disabled = true; message('Loading the form…');
    ensureReady().then(function () {
      if (!busy && !locked) {button.disabled = false; message('');}
    }).catch(function () {
      if (locked) return;
      button.disabled = false;
      message('Sending is temporarily unavailable. You can try again or email contact@libreaccessibility.org.');
    });
  }
  document.getElementById('request-another').addEventListener('click', function () {
    if (receipt.hidden) return;
    locked = false; attempt = null; pending = null; verificationToken = ''; verificationFailed = false;
    form.reset(); working(false);
    fields.forEach(function (field) {field.dispatchEvent(new Event('input'));});
    receipt.hidden = true; form.hidden = false; intro.hidden = false; review.hidden = false; review.open = false; availability.hidden = false;
    document.title = initialTitle;
    prepare(); form.elements.barrier.focus();
  });
  prepare();
})();
