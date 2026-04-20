/**
 * main.js — Smooth scroll animations, interactivity, theming,
 * and i18n integration for festas-builds.com
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

    var sections = document.querySelectorAll('.tech, .about');
    sections.forEach(function (section) {
      observer.observe(section);
    });
  }

  /* ─── Auto-updating age calculator ───────────────────────────────────── */
  function calcAge(birthYear, birthMonth, birthDay) {
    var today = new Date();
    var age = today.getFullYear() - birthYear;
    var m = today.getMonth() + 1 - birthMonth;
    if (m < 0 || (m === 0 && today.getDate() < birthDay)) {
      age--;
    }
    return Math.max(0, age);
  }

  function initAges() {
    // Eric: June 5, 1997
    var ageEl = document.getElementById('age-display');
    if (ageEl) ageEl.textContent = calcAge(1997, 6, 5);

    // Daughter: October 19, 2023
    var daughterEl = document.getElementById('daughter-age');
    if (daughterEl) daughterEl.textContent = calcAge(2023, 10, 19);

    // Baby: June 13, 2025
    var babyEl = document.getElementById('baby-age');
    if (babyEl) babyEl.textContent = calcAge(2025, 6, 13);
  }

  /* ─── Gallery items: staggered entrance animation ─────────────────── */
  function initGalleryItems() {
    var items = document.querySelectorAll('.gallery-item');
    if (!items.length) return;

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

    items.forEach(function (item, i) {
      item.style.opacity = '0';
      item.style.transform = 'translateY(30px)';
      item.style.transition = 'opacity 0.6s cubic-bezier(0.4,0,0.2,1) ' + (i * 0.1) + 's, transform 0.6s cubic-bezier(0.4,0,0.2,1) ' + (i * 0.1) + 's, border-color 0.25s ease, box-shadow 0.25s ease';
      observer.observe(item);
    });
  }

  /* ─── Fact cards: staggered entrance animation ────────────────────── */
  function initFactCards() {
    var cards = document.querySelectorAll('.fact-card');
    if (!cards.length) return;

    var observer = new IntersectionObserver(
      function (entries) {
        if (entries.some(function (e) { return e.isIntersecting; })) {
          cards.forEach(function (card, i) {
            setTimeout(function () {
              card.style.opacity = '1';
              card.style.transform = 'translateY(0)';
            }, i * 80);
          });
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    cards.forEach(function (card) {
      card.style.opacity = '0';
      card.style.transform = 'translateY(15px)';
      card.style.transition = 'opacity 0.4s ease, transform 0.4s ease, border-color 0.25s ease, background 0.25s ease, box-shadow 0.25s ease';
    });

    var section = document.querySelector('.quick-facts');
    if (section) observer.observe(section);
  }
  function initStatCounters() {
    var statNumbers = document.querySelectorAll('.stat-number');
    if (!statNumbers.length) return;

    function parseStatValue(text) {
      text = text.trim();
      var suffix = '';
      var num;

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

  /* ─── Timeline items: staggered entrance ────────────────────────────── */
  // (Milestones section removed — initTimeline kept as no-op guard)
  function initTimeline() {
    var items = document.querySelectorAll('.timeline-item');
    if (!items.length) return;

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2, rootMargin: '0px 0px -40px 0px' }
    );

    items.forEach(function (item) {
      observer.observe(item);
    });
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

    if (toggle && links) {
      toggle.addEventListener('click', function () {
        var expanded = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(!expanded));
        links.classList.toggle('open');
      });

      navLinks.forEach(function (link) {
        link.addEventListener('click', function () {
          toggle.setAttribute('aria-expanded', 'false');
          links.classList.remove('open');
        });
      });
    }
  }

  /* ─── Contact form (Web3Forms) ─────────────────────────────────────── */
  function initContactForm() {
    var form = document.getElementById('contact-form');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var name = (document.getElementById('contact-name').value || '').trim();
      var email = (document.getElementById('contact-email').value || '').trim();
      var type = (document.getElementById('contact-type').value || '').trim();
      var message = (document.getElementById('contact-message').value || '').trim();
      var statusEl = document.getElementById('form-status');
      var submitBtn = document.getElementById('form-submit-btn');

      if (!name || !email || !type || !message) return;

      // Fallback to mailto since Web3Forms requires an access key
      // The owner can replace this with a Web3Forms integration by adding their key
      var subject = type + ' — ' + name;
      var body = 'Hi Eric,\n\n' + message + '\n\n— ' + name + '\n' + email;
      var mailto = 'mailto:eric@festas-builds.com'
        + '?subject=' + encodeURIComponent(subject)
        + '&body=' + encodeURIComponent(body);

      window.location.href = mailto;

      // Show success state
      if (statusEl) {
        var successText = (window.i18n && window.i18n.t) ? window.i18n.t('contact.success') : 'Opening your email client…';
        statusEl.textContent = successText;
        statusEl.className = 'form-status form-status-success';
        setTimeout(function () {
          statusEl.textContent = '';
          statusEl.className = 'form-status';
        }, 5000);
      }
    });
  }

  /* ─── Theme toggle (dark/light) ────────────────────────────────────── */
  function initThemeToggle() {
    var toggle = document.getElementById('theme-toggle');
    if (!toggle) return;

    var stored = localStorage.getItem('festas-theme');
    if (stored === 'light') {
      document.body.classList.add('theme-light');
    } else if (!stored && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      document.body.classList.add('theme-light');
    }

    toggle.addEventListener('click', function () {
      document.body.classList.toggle('theme-light');
      var isLight = document.body.classList.contains('theme-light');
      localStorage.setItem('festas-theme', isLight ? 'light' : 'dark');
    });

    // Listen for system theme changes
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', function (e) {
        if (!localStorage.getItem('festas-theme')) {
          if (e.matches) {
            document.body.classList.add('theme-light');
          } else {
            document.body.classList.remove('theme-light');
          }
        }
      });
    }
  }

  /* ─── Language toggle ──────────────────────────────────────────────── */
  function initLangToggle() {
    var toggle = document.getElementById('lang-toggle');
    if (!toggle || !window.i18n) return;

    toggle.addEventListener('click', function () {
      window.i18n.toggleLanguage();
    });
  }

  /* ─── Keyboard shortcuts ───────────────────────────────────────────── */
  function initKeyboardShortcuts() {
    var sectionMap = {
      '1': '#home',
      '2': '#about',
      '3': '#gallery',
      '4': '#explore',
      '5': '#projects',
      '6': '#contact'
    };

    document.addEventListener('keydown', function (e) {
      // Don't trigger when typing in form fields
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      var href = sectionMap[e.key];
      if (href) {
        var el = document.querySelector(href);
        if (el) {
          e.preventDefault();
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  }

  /* ─── Back to Top button ───────────────────────────────────────────── */
  function initBackToTop() {
    var btn = document.getElementById('back-to-top');
    if (!btn) return;

    function toggleBtn() {
      if (window.scrollY > 400) {
        btn.classList.add('visible');
      } else {
        btn.classList.remove('visible');
      }
    }

    window.addEventListener('scroll', toggleBtn, { passive: true });
    toggleBtn();

    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ─── Gallery Lightbox ─────────────────────────────────────────────── */
  function initLightbox() {
    var lightbox = document.getElementById('lightbox');
    var lightboxImg = document.getElementById('lightbox-img');
    var closeBtn = lightbox ? lightbox.querySelector('.lightbox-close') : null;
    if (!lightbox || !lightboxImg) return;

    var galleryItems = document.querySelectorAll('.gallery-item');
    galleryItems.forEach(function (item) {
      function openLightbox() {
        var img = item.querySelector('img');
        if (!img) return;
        // Use a higher resolution version if URL contains dimension params
        var src = img.src;
        if (src.indexOf('w=') !== -1) {
          src = src.replace(/w=\d+/, 'w=1200').replace(/h=\d+/, 'h=800');
        }
        lightboxImg.src = src;
        lightboxImg.alt = img.alt;
        lightbox.hidden = false;
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
      item.addEventListener('click', openLightbox);
      item.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openLightbox();
        }
      });
    });

    function closeLightbox() {
      lightbox.classList.remove('active');
      document.body.style.overflow = '';
      setTimeout(function () {
        lightbox.hidden = true;
        lightboxImg.src = '';
      }, 300);
    }

    if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) closeLightbox();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && lightbox.classList.contains('active')) {
        closeLightbox();
      }
    });
  }

  /* ─── Newsletter form ──────────────────────────────────────────────── */
  // Newsletter endpoint — update this URL once the external newsletter
  // service (separate repo) is deployed.
  var NEWSLETTER_API = 'https://newsletter.festas-builds.com/api/subscribe';

  function initNewsletter() {
    var form = document.getElementById('newsletter-form');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var input  = document.getElementById('newsletter-email');
      var email  = (input && input.value || '').trim();
      var status = document.getElementById('newsletter-status');
      var btn    = form.querySelector('.newsletter-btn');
      var btnSpan = btn ? btn.querySelector('span') : null;

      if (!email) return;

      // Disable while in-flight
      if (btn) btn.disabled = true;

      fetch(NEWSLETTER_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email })
      })
      .then(function (res) {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .then(function () {
        var successText = (window.i18n && window.i18n.t) ? window.i18n.t('newsletter.success') : 'Danke für dein Abo! 🎉';
        if (status) {
          status.textContent = successText;
          status.className = 'newsletter-status newsletter-status-success';
        }
        input.value = '';
      })
      .catch(function () {
        var errorText = (window.i18n && window.i18n.t) ? window.i18n.t('newsletter.error') : 'Etwas ist schiefgelaufen. Bitte versuche es erneut.';
        if (status) {
          status.textContent = errorText;
          status.className = 'newsletter-status newsletter-status-error';
        }
      })
      .finally(function () {
        if (btn) btn.disabled = false;
        setTimeout(function () {
          if (status) {
            status.textContent = '';
            status.className = 'newsletter-status';
          }
        }, 4000);
      });
    });
  }

  /* ─── Social Proof entrance animation ──────────────────────────────── */
  function initSocialProofAnim() {
    var items = document.querySelectorAll('.social-proof-item');
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
      item.style.transform = 'translateY(15px)';
      item.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    });

    var section = document.querySelector('.social-proof');
    if (section) observer.observe(section);
  }

  /* ─── Init ──────────────────────────────────────────────────────────── */
  function init() {
    // Apply saved theme immediately, or respect system preference
    var stored = localStorage.getItem('festas-theme');
    if (stored === 'light') {
      document.body.classList.add('theme-light');
    } else if (!stored && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      document.body.classList.add('theme-light');
    }

    // Initialize i18n
    if (window.i18n) {
      window.i18n.init();
    }

    initFadeIn();
    initProjectCards();
    initExploreCards();
    initTechBadges();
    initStatItems();
    initStatCounters();
    initTimeline();
    initScrollHint();
    initNav();
    initContactForm();
    initThemeToggle();
    initLangToggle();
    initKeyboardShortcuts();
    initAges();
    initGalleryItems();
    initFactCards();
    initBackToTop();
    initLightbox();
    initNewsletter();
    initSocialProofAnim();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
