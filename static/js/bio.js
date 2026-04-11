// bio.js - Minimal JS for link-in-bio public page
(function() {
  // Click tracking
  window.tc = function(id) {
    fetch('/api/click/' + id, { method: 'POST' }).catch(function(){});
  };

  // Pageview tracking
  fetch('/api/pageview', { method: 'POST' }).catch(function(){});

  // Newsletter form submission
  document.addEventListener('submit', function(e) {
    var form = e.target;
    if (!form.classList.contains('subscribe-form')) return;
    e.preventDefault();
    var email = form.querySelector('input[type="email"]').value;
    var btn = form.querySelector('button');
    var origText = btn.textContent;
    btn.textContent = '...';
    btn.disabled = true;

    fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, privacy_agreed: true })
    })
    .then(function(r) {
      if (!r.ok) throw new Error('Failed');
      form.querySelector('input').value = '';
      showToast('Subscribed! \u2713');
    })
    .catch(function() {
      showToast('Something went wrong');
    })
    .finally(function() {
      btn.textContent = origText;
      btn.disabled = false;
    });
  });

  function showToast(msg) {
    var el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(function() {
      el.classList.add('show');
    });
    setTimeout(function() {
      el.classList.remove('show');
      setTimeout(function() { el.remove(); }, 300);
    }, 3000);
  }
})();
