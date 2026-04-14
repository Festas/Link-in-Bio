/**
 * main.js — Smooth scroll animations and interactivity
 * No external dependencies required.
 */

(function () {
  'use strict';

  /* ─── Intersection Observer: fade-in on scroll ─────────────────────── */
  function initFadeIn() {
    var elements = document.querySelectorAll('.fade-in');
    if (!elements.length) return;

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );

    elements.forEach(function (el) {
      observer.observe(el);
    });
  }

  /* ─── Project cards: staggered entrance animation ──────────────────── */
  function initProjectCards() {
    var cards = document.querySelectorAll('.project-card');
    if (!cards.length) return;

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    cards.forEach(function (card, i) {
      card.style.opacity = '0';
      card.style.transform = 'translateY(30px)';
      card.style.transition = 'opacity 0.6s cubic-bezier(0.4,0,0.2,1) ' + (i * 0.1) + 's, transform 0.6s cubic-bezier(0.4,0,0.2,1) ' + (i * 0.1) + 's, border-color 0.25s ease, background 0.25s ease, box-shadow 0.25s ease';
      observer.observe(card);
    });
  }

  /* ─── Explore cards: staggered entrance animation ──────────────────── */
  function initExploreCards() {
    var cards = document.querySelectorAll('.explore-card');
    if (!cards.length) return;

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    cards.forEach(function (card, i) {
      card.style.opacity = '0';
      card.style.transform = 'translateY(30px)';
      card.style.transition = 'opacity 0.6s cubic-bezier(0.4,0,0.2,1) ' + (i * 0.15) + 's, transform 0.6s cubic-bezier(0.4,0,0.2,1) ' + (i * 0.15) + 's, border-color 0.25s ease, background 0.25s ease, box-shadow 0.25s ease';
      observer.observe(card);
    });
  }

  /* ─── Tech badges: staggered entrance animation ─────────────────────── */
  function initTechBadges() {
    var badges = document.querySelectorAll('.tech-badge');
    if (!badges.length) return;

    var observer = new IntersectionObserver(
      function (entries) {
        if (entries.some(function (e) { return e.isIntersecting; })) {
          badges.forEach(function (badge, i) {
            setTimeout(function () {
              badge.style.opacity = '1';
              badge.style.transform = 'scale(1) translateY(0)';
            }, i * 50);
          });
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    badges.forEach(function (badge) {
      badge.style.opacity = '0';
      badge.style.transform = 'scale(0.85) translateY(10px)';
      badge.style.transition = 'opacity 0.4s ease, transform 0.4s ease, color 0.25s ease, border-color 0.25s ease, background 0.25s ease, box-shadow 0.25s ease';
    });

    var section = document.querySelector('.tech');
    if (section) observer.observe(section);
  }

  /* ─── Stat counters: animate numbers on scroll ──────────────────────── */
  function initStatCounters() {
    var statNumbers = document.querySelectorAll('.stat-number');
    if (!statNumbers.length) return;

    function parseStatValue(text) {
      text = text.trim();
      var suffix = '';
      var num;

      // Handle suffixes like K+, K, M+, M
      var match = text.match(/^([\d]+\.?[\d]*)\s*([KkMm]?\+?)$/);
      if (match) {
        num = parseFloat(match[1]);
        suffix = match[2];
      } else {
        num = parseFloat(text.replace(/[^\d.]/g, ''));
        suffix = text.replace(/[\d.\s]/g, '');
      }

      return { num: num || 0, suffix: suffix || '' };
    }

    function animateCounter(el, parsed) {
      var duration = 1600;
      var start = performance.now();
      var hasDecimal = String(parsed.num).indexOf('.') !== -1;

      function step(now) {
        var elapsed = now - start;
        var progress = Math.min(elapsed / duration, 1);
        // Ease-out cubic
        var eased = 1 - Math.pow(1 - progress, 3);
        var current = parsed.num * eased;

        if (hasDecimal) {
          el.textContent = current.toFixed(1) + parsed.suffix;
        } else {
          el.textContent = Math.round(current) + parsed.suffix;
        }

        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          // Ensure final value is exact
          if (hasDecimal) {
            el.textContent = parsed.num.toFixed(1) + parsed.suffix;
          } else {
            el.textContent = Math.round(parsed.num) + parsed.suffix;
          }
        }
      }

      requestAnimationFrame(step);
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var el = entry.target;
            var parsed = parseStatValue(el.getAttribute('data-stat-value') || el.textContent);
            el.textContent = '0' + parsed.suffix;
            animateCounter(el, parsed);
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.3 }
    );

    statNumbers.forEach(function (el) {
      // Store original value before any animation
      el.setAttribute('data-stat-value', el.textContent.trim());
      observer.observe(el);
    });
  }

  /* ─── Stat items: staggered entrance ────────────────────────────────── */
  function initStatItems() {
    var items = document.querySelectorAll('.stat-item');
    if (!items.length) return;

    var observer = new IntersectionObserver(
      function (entries) {
        if (entries.some(function (e) { return e.isIntersecting; })) {
          items.forEach(function (item, i) {
            setTimeout(function () {
              item.style.opacity = '1';
              item.style.transform = 'translateY(0)';
            }, i * 100);
          });
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    items.forEach(function (item) {
      item.style.opacity = '0';
      item.style.transform = 'translateY(20px)';
      item.style.transition = 'opacity 0.5s ease, transform 0.5s ease, box-shadow 0.25s ease, border-color 0.25s ease';
    });

    var section = document.querySelector('.stats');
    if (section) observer.observe(section);
  }

  /* ─── Scroll hint: hide after first scroll ──────────────────────────── */
  function initScrollHint() {
    var hint = document.querySelector('.hero-scroll-hint');
    if (!hint) return;

    var hidden = false;
    function hide() {
      if (!hidden && window.scrollY > 60) {
        hidden = true;
        hint.style.transition = 'opacity 0.4s ease';
        hint.style.opacity = '0';
        hint.style.pointerEvents = 'none';
        window.removeEventListener('scroll', hide);
      }
    }

    window.addEventListener('scroll', hide, { passive: true });
  }

  /* ─── Sticky navigation ────────────────────────────────────────────── */
  function initNav() {
    var nav = document.getElementById('site-nav');
    var hero = document.querySelector('.hero');
    var toggle = document.querySelector('.nav-toggle');
    var links = document.querySelector('.nav-links');
    var navLinks = document.querySelectorAll('.nav-link');
    if (!nav || !hero) return;

    // Show/hide nav based on scroll past hero
    var heroObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            nav.classList.remove('visible');
          } else {
            nav.classList.add('visible');
          }
        });
      },
      { threshold: 0, rootMargin: '-56px 0px 0px 0px' }
    );
    heroObserver.observe(hero);

    // Highlight active section
    var sections = document.querySelectorAll('section[id]');
    var scrollObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var id = entry.target.getAttribute('id');
            navLinks.forEach(function (link) {
              if (link.getAttribute('href') === '#' + id) {
                link.classList.add('active');
              } else {
                link.classList.remove('active');
              }
            });
          }
        });
      },
      { threshold: 0.3 }
    );
    sections.forEach(function (section) {
      scrollObserver.observe(section);
    });

    // Mobile toggle
    if (toggle && links) {
      toggle.addEventListener('click', function () {
        var expanded = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(!expanded));
        links.classList.toggle('open');
      });

      // Close menu on link click
      navLinks.forEach(function (link) {
        link.addEventListener('click', function () {
          toggle.setAttribute('aria-expanded', 'false');
          links.classList.remove('open');
        });
      });
    }
  }

  /* ─── Contact form (mailto) ────────────────────────────────────────── */
  function initContactForm() {
    var form = document.getElementById('contact-form');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var name = (document.getElementById('contact-name').value || '').trim();
      var email = (document.getElementById('contact-email').value || '').trim();
      var type = (document.getElementById('contact-type').value || '').trim();
      var message = (document.getElementById('contact-message').value || '').trim();

      // Basic validation
      if (!name || !email || !type || !message) return;

      var subject = type + ' — ' + name;
      var body = 'Hi Eric,\n\n' + message + '\n\n— ' + name + '\n' + email;
      var mailto = 'mailto:eric@festas-builds.com'
        + '?subject=' + encodeURIComponent(subject)
        + '&body=' + encodeURIComponent(body);

      window.location.href = mailto;
    });
  }

  /* ─── Init ──────────────────────────────────────────────────────────── */
  function init() {
    initFadeIn();
    initProjectCards();
    initExploreCards();
    initTechBadges();
    initStatItems();
    initStatCounters();
    initScrollHint();
    initNav();
    initContactForm();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
