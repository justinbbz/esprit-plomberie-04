/* Esprit Plomberie 04 — scripts (aucun cookie, aucun traceur) */
(function () {
  'use strict';
  // URL qui reçoit le formulaire (ex. webhook Make). Vide = formulaire non relié (aucun faux succès).
  var CONTACT_WEBHOOK_URL = '';
  var TEL = '07 85 83 70 30';

  document.documentElement.classList.add('js');

  // menu mobile
  var btn = document.querySelector('.nav-toggle');
  var menu = document.getElementById('menu');
  if (btn && menu) {
    btn.addEventListener('click', function () {
      var open = menu.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // apparition douce
  var els = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.1 });
    els.forEach(function (el) { io.observe(el); });
  } else {
    els.forEach(function (el) { el.classList.add('in'); });
  }

  // vidéo d'ouverture : fichier léger sur mobile, jamais si "économie de données" ou reduced-motion
  var v = document.querySelector('.hero video');
  if (v) {
    var conn = navigator.connection || {};
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || conn.saveData) {
      v.remove();
    } else {
      var src = window.innerWidth < 700 ? v.getAttribute('data-mobile') : v.getAttribute('data-desktop');
      v.src = src;
      v.play && v.play().catch(function () {});
    }
  }

  // filtres (avis, réalisations)
  document.querySelectorAll('[data-filtres]').forEach(function (bar) {
    var cible = document.querySelector(bar.getAttribute('data-filtres'));
    if (!cible) return;
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-f]');
      if (!b) return;
      bar.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      var f = b.getAttribute('data-f');
      cible.querySelectorAll('[data-cat]').forEach(function (it) {
        var ok = f === 'tout' || it.getAttribute('data-cat').split(' ').indexOf(f) !== -1;
        it.hidden = !ok;
      });
    });
  });

  // visionneuse photo (image entière, ajustée à l'écran)
  var lb = document.getElementById('lb');
  if (lb && typeof lb.showModal === 'function') {
    var items = [], idx = 0;
    var img = lb.querySelector('img'), cap = lb.querySelector('figcaption');
    var show = function (n) {
      idx = (n + items.length) % items.length;
      var b = items[idx];
      img.src = b.getAttribute('data-full');
      img.alt = b.getAttribute('data-alt') || '';
      cap.textContent = b.getAttribute('data-cap') + ' (' + (idx + 1) + ' / ' + items.length + ')';
    };
    document.addEventListener('click', function (e) {
      var b = e.target.closest('.photo-btn');
      if (!b) return;
      items = Array.prototype.filter.call(document.querySelectorAll('.photo-btn'), function (x) { return x.offsetParent !== null; });
      idx = items.indexOf(b);
      if (idx < 0) { items = [b]; idx = 0; }
      show(idx);
      lb.showModal();
    });
    lb.querySelector('.lb-prev').addEventListener('click', function () { show(idx - 1); });
    lb.querySelector('.lb-next').addEventListener('click', function () { show(idx + 1); });
    lb.querySelector('.lb-close').addEventListener('click', function () { lb.close(); });
    lb.addEventListener('click', function (e) { if (e.target === lb) lb.close(); });
    lb.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') show(idx - 1);
      if (e.key === 'ArrowRight') show(idx + 1);
    });
  }

  // carte Google Maps : ne se charge qu'après un clic
  document.querySelectorAll('[data-carte]').forEach(function (box) {
    var b = box.querySelector('button');
    if (!b) return;
    b.addEventListener('click', function () {
      var f = document.createElement('iframe');
      f.src = box.getAttribute('data-carte');
      f.title = box.getAttribute('data-titre') || 'Carte';
      f.loading = 'lazy';
      f.referrerPolicy = 'no-referrer-when-downgrade';
      box.innerHTML = '';
      box.appendChild(f);
    });
  });

  // formulaire de contact
  var form = document.getElementById('form-contact');
  if (form) {
    var statut = form.querySelector('.statut');
    var say = function (msg) { statut.textContent = msg; statut.classList.add('on'); };
    var phoneOk = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.\-]*\d{2}){4}$/;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.elements.societe && form.elements.societe.value) return; // champ piège
      var bad = null;
      form.querySelectorAll('.champ').forEach(function (c) {
        var f = c.querySelector('input,select,textarea');
        if (!f) return;
        var v = (f.value || '').trim();
        var ok = !!v;
        if (f.name === 'telephone') ok = phoneOk.test(v);
        if (f.name === 'message') ok = v.length >= 10;
        c.classList.toggle('invalide', !ok);
        if (!ok && !bad) bad = f;
      });
      var ck = form.elements.consentement;
      if (!ck.checked) { say('Cochez la case de consentement pour envoyer votre demande.'); if (!bad) bad = ck; }
      if (bad) { bad.focus(); return; }
      if (!CONTACT_WEBHOOK_URL) {
        say('Le formulaire n’est pas encore relié. Appelez Benoît au ' + TEL + '.');
        return;
      }
      var data = {
        nom: form.elements.nom.value.trim(), telephone: form.elements.telephone.value.trim(),
        commune: form.elements.commune.value.trim(), sujet: form.elements.sujet.value,
        urgent: form.elements.urgent.checked, message: form.elements.message.value.trim(),
        page: location.pathname, envoye: new Date().toISOString()
      };
      var ctl = new AbortController();
      var t = setTimeout(function () { ctl.abort(); }, 10000);
      fetch(CONTACT_WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), signal: ctl.signal })
        .then(function (r) { clearTimeout(t); if (!r.ok) throw new Error(); form.reset(); say('Votre demande est bien partie. Pour une urgence, appelez directement le ' + TEL + '.'); })
        .catch(function () { say('L’envoi n’a pas marché. Appelez Benoît au ' + TEL + '.'); });
    });
  }
})();
