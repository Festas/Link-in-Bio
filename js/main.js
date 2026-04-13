/**
 * main.js — Smooth scroll animations and interactivity
 * No external dependencies required.
 */

(function () {
  'use strict';

  /* ─── Intersection Observer: fade-in on scroll ─────────────────────── */
  function initFadeIn() {
    const elements = document.querySelectorAll('.fade-in');
    if (!elements.length) return;

    // Trigger elements that are already in view on load
    const observer = new IntersectionObserver(
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
    const cards = document.querySelectorAll('.project-card');
    if (!cards.length) return;

    const observer = new IntersectionObserver(
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
      card.style.transform = 'translateY(24px)';
      card.style.transition = 'opacity 0.5s ease ' + (i * 0.07) + 's, transform 0.5s ease ' + (i * 0.07) + 's, border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease';
      observer.observe(card);
    });
  }

  /* ─── Tech badges: staggered entrance animation ─────────────────────── */
  function initTechBadges() {
    const badges = document.querySelectorAll('.tech-badge');
    if (!badges.length) return;

    const observer = new IntersectionObserver(
      function (entries) {
        if (entries.some(function (e) { return e.isIntersecting; })) {
          badges.forEach(function (badge, i) {
            setTimeout(function () {
              badge.style.opacity = '1';
              badge.style.transform = 'scale(1)';
            }, i * 40);
          });
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    badges.forEach(function (badge) {
      badge.style.opacity = '0';
      badge.style.transform = 'scale(0.9)';
      badge.style.transition = 'opacity 0.35s ease, transform 0.35s ease, color 0.2s ease, border-color 0.2s ease, background 0.2s ease';
    });

    const section = document.querySelector('.tech');
    if (section) observer.observe(section);
  }

  /* ─── Scroll hint: hide after first scroll ──────────────────────────── */
  function initScrollHint() {
    const hint = document.querySelector('.hero-scroll-hint');
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

  /* ─── Init ──────────────────────────────────────────────────────────── */
  function init() {
    initFadeIn();
    initProjectCards();
    initTechBadges();
    initScrollHint();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
