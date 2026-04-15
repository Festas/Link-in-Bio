/**
 * i18n.js — Lightweight internationalization for festas-builds.com
 * Supports DE (default) and EN with localStorage persistence
 * and auto-detection via navigator.language.
 */

(function () {
  'use strict';

  var translations = {
    de: {
      // Nav
      'nav.home': 'Home',
      'nav.about': 'Über mich',
      'nav.gallery': 'Einblicke',
      'nav.explore': 'Entdecken',
      'nav.projects': 'Projekte',
      'nav.contact': 'Kontakt',

      // Hero
      'hero.tagline': 'Tech & Gaming Creator · Nuclear Engineer',
      'hero.bio': 'Hey, ich bin Eric — Tech & Gaming Content Creator und Ingenieur in einem Kernkraftwerk aus Hamburg. Ich teile meine Leidenschaft für Tech, PC-Builds und Gaming-Setups auf Instagram und TikTok — und arbeite nebenbei mit radioaktiven Abfällen. Ja, wirklich.',

      // Stats
      'stats.total': 'Gesamt-Follower',
      'stats.instagram': 'Instagram',
      'stats.tiktok': 'TikTok',
      'stats.threads': 'Threads',
      'stats.updated': 'Stand: April 2026',

      // About
      'about.title': 'Über mich',
      'about.text': 'Ich bin Eric — tagsüber sorge ich dafür, dass radioaktive Abfälle in einem Kernkraftwerk sicher verarbeitet werden. Abends tauche ich in die Welt von Tech und Gaming ein und teile meine Leidenschaft mit über 185K Followern.',
      'about.text2': 'Ja, ich arbeite buchstäblich mit radioaktivem Material — und dann gehe ich nach Hause und baue Custom PCs mit RGB-Beleuchtung. Das ist so ziemlich der krasseste Kontrast, den man sich vorstellen kann.',
      'about.engineering': 'Engineering',
      'about.creative': 'Kreativ',
      'about.fact.job': 'Kernkraftwerk-Ingenieur',
      'about.fact.creator': 'Tech & Gaming Creator',
      'about.fact.age': 'Jahre alt',
      'about.fact.married': 'Verheiratet',
      'about.fact.kids': 'Stolzer Vater von zwei Kindern',
      'about.fact.location': 'Hamburg, Deutschland',
      'about.family.title': 'Familie',
      'about.family.daughter': 'Tochter',
      'about.family.baby': 'Baby',
      'about.family.years': 'Jahre',

      // Gallery
      'gallery.title': 'Einblicke',
      'gallery.pc': 'Custom PC Build',
      'gallery.setup': 'Gaming Setup',
      'gallery.gaming': 'Gaming',
      'gallery.work': 'Day Job ☢️',

      // Explore
      'explore.title': 'Entdecken',
      'explore.linkinbio.title': 'Link in Bio',
      'explore.linkinbio.desc': 'Alle meine aktuellen Links, Kooperationen und Inhalte an einem Ort. Schneller Zugriff auf alles, woran ich arbeite.',
      'explore.mediakit.title': 'Media Kit',
      'explore.mediakit.desc': 'Für Markenpartnerschaften und Kooperationsmöglichkeiten. Statistiken, Audience-Insights und bisherige Arbeiten — alles an einem Ort.',

      // Projects
      'projects.title': 'Projekte',
      'projects.minecraft.name': 'Minecraft RPG Server',
      'projects.minecraft.desc': 'Custom MMO Minecraft Server mit Quests, Dungeons, Custom Items und einer Live-Webkonsole.',
      'projects.cosmic.name': 'Cosmic Survivor',
      'projects.cosmic.desc': 'Browserbasiertes Weltraum-Survivalspiel. Sofort spielbar, kein Download nötig.',

      // Milestones
      'milestones.title': 'Meilensteine',
      'milestone.1': '100K Follower auf Instagram erreicht',
      'milestone.baby': 'Zweites Kind geboren 👶',
      'milestone.3': 'Minecraft RPG Server gelauncht',
      'milestone.4': 'Cosmic Survivor veröffentlicht',
      'milestone.daughter': 'Erste Tochter geboren 👧',
      'milestone.5': 'Erste Markenkooperation',
      'milestone.6': 'Content-Reise gestartet',

      // Contact
      'contact.title': 'Kontakt',
      'contact.intro': 'Hast du ein Projekt im Kopf, möchtest zusammenarbeiten oder einfach Hallo sagen? Füll das Formular aus und ich melde mich bei dir.',
      'contact.name': 'Name',
      'contact.name.placeholder': 'Dein Name',
      'contact.email': 'E-Mail',
      'contact.email.placeholder': 'du@beispiel.de',
      'contact.type': 'Anfrage-Typ',
      'contact.type.placeholder': 'Bitte auswählen…',
      'contact.type.brand': '🤝 Markenkooperation / Sponsoring',
      'contact.type.creator': '🎬 Creator-Kooperation',
      'contact.type.press': '📰 Presseanfrage',
      'contact.type.business': '💼 Geschäftliche Anfrage',
      'contact.type.other': '💬 Sonstiges',
      'contact.message': 'Nachricht',
      'contact.message.placeholder': 'Erzähl mir von deiner Idee…',
      'contact.submit': 'Nachricht senden',
      'contact.fallback': 'Oder schreib mir direkt an',
      'contact.success': 'Nachricht gesendet! Ich melde mich bald.',
      'contact.error': 'Etwas ist schiefgelaufen. Bitte versuche es erneut.',

      // Footer
      'footer.copy': '© 2026 festas_builds · Hamburg, Deutschland',
      'footer.contact': 'Kontakt',
    },

    en: {
      // Nav
      'nav.home': 'Home',
      'nav.about': 'About',
      'nav.gallery': 'Gallery',
      'nav.explore': 'Explore',
      'nav.projects': 'Projects',
      'nav.contact': 'Contact',

      // Hero
      'hero.tagline': 'Tech & Gaming Creator · Nuclear Engineer',
      'hero.bio': "Hey, I'm Eric — a tech & gaming content creator and nuclear power plant engineer from Hamburg, Germany. I share my passion for tech, PC builds, and gaming setups on Instagram and TikTok — and I work with radioactive waste on the side. Yes, really.",

      // Stats
      'stats.total': 'Total Followers',
      'stats.instagram': 'Instagram',
      'stats.tiktok': 'TikTok',
      'stats.threads': 'Threads',
      'stats.updated': 'Last updated: April 2026',

      // About
      'about.title': 'About Me',
      'about.text': "I'm Eric — by day, I make sure radioactive waste at a nuclear power plant is safely processed. By night, I dive into the world of tech and gaming, sharing my passion with 185K+ followers.",
      'about.text2': "Yes, I literally work with radioactive material — and then I go home and build custom PCs with RGB lighting. It's probably the wildest contrast you can imagine.",
      'about.engineering': 'Engineering',
      'about.creative': 'Creative',
      'about.fact.job': 'Nuclear Power Plant Engineer',
      'about.fact.creator': 'Tech & Gaming Creator',
      'about.fact.age': 'years old',
      'about.fact.married': 'Married',
      'about.fact.kids': 'Proud father of two',
      'about.fact.location': 'Hamburg, Germany',
      'about.family.title': 'Family',
      'about.family.daughter': 'Daughter',
      'about.family.baby': 'Baby',
      'about.family.years': 'years',

      // Gallery
      'gallery.title': 'Gallery',
      'gallery.pc': 'Custom PC Build',
      'gallery.setup': 'Gaming Setup',
      'gallery.gaming': 'Gaming',
      'gallery.work': 'Day Job ☢️',

      // Explore
      'explore.title': 'Explore',
      'explore.linkinbio.title': 'Link in Bio',
      'explore.linkinbio.desc': 'All my latest links, collabs, and content in one place. Quick access to everything I\'m working on.',
      'explore.mediakit.title': 'Media Kit',
      'explore.mediakit.desc': 'For brand partnerships and collaboration opportunities. Stats, audience insights, and past work — all in one place.',

      // Projects
      'projects.title': 'Projects',
      'projects.minecraft.name': 'Minecraft RPG Server',
      'projects.minecraft.desc': 'Custom MMO Minecraft server with quests, dungeons, custom items, and a live web console.',
      'projects.cosmic.name': 'Cosmic Survivor',
      'projects.cosmic.desc': 'Browser-based space survival game. Play instantly, no download.',

      // Milestones
      'milestones.title': 'Milestones',
      'milestone.1': 'Reached 100K followers on Instagram',
      'milestone.baby': 'Second child born 👶',
      'milestone.3': 'Launched Minecraft RPG server',
      'milestone.4': 'Released Cosmic Survivor',
      'milestone.daughter': 'First daughter born 👧',
      'milestone.5': 'First brand collaboration',
      'milestone.6': 'Started content creation journey',

      // Contact
      'contact.title': 'Get in Touch',
      'contact.intro': "Have a project in mind, want to collaborate, or just say hi? Fill out the form below and I'll get back to you.",
      'contact.name': 'Name',
      'contact.name.placeholder': 'Your name',
      'contact.email': 'Email',
      'contact.email.placeholder': 'you@example.com',
      'contact.type': 'Inquiry Type',
      'contact.type.placeholder': 'Select an option…',
      'contact.type.brand': '🤝 Brand Collaboration / Sponsorship',
      'contact.type.creator': '🎬 Creator Collaboration',
      'contact.type.press': '📰 Press Inquiry',
      'contact.type.business': '💼 Business / General Inquiry',
      'contact.type.other': '💬 Other',
      'contact.message': 'Message',
      'contact.message.placeholder': 'Tell me about your idea…',
      'contact.submit': 'Send Message',
      'contact.fallback': 'Or email me directly at',
      'contact.success': 'Message sent! I\'ll get back to you soon.',
      'contact.error': 'Something went wrong. Please try again.',

      // Footer
      'footer.copy': '© 2026 festas_builds · Hamburg, Germany',
      'footer.contact': 'Contact',
    }
  };

  var currentLang = 'de';

  function detectLanguage() {
    // 1. Check localStorage
    var stored = localStorage.getItem('festas-lang');
    if (stored && translations[stored]) return stored;

    // 2. Auto-detect from browser
    var browserLang = (navigator.language || navigator.userLanguage || 'de').toLowerCase();
    if (browserLang.startsWith('de')) return 'de';
    return 'en';
  }

  function t(key) {
    return (translations[currentLang] && translations[currentLang][key]) || key;
  }

  function applyTranslations() {
    // Update all elements with data-i18n attribute
    var elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      var text = t(key);
      el.textContent = text;
    });

    // Update all elements with data-i18n-placeholder
    var placeholders = document.querySelectorAll('[data-i18n-placeholder]');
    placeholders.forEach(function (el) {
      var key = el.getAttribute('data-i18n-placeholder');
      el.placeholder = t(key);
    });

    // Update html lang attribute
    document.documentElement.lang = currentLang;

    // Update toggle button text
    var toggleBtn = document.getElementById('lang-toggle');
    if (toggleBtn) {
      toggleBtn.setAttribute('aria-label', currentLang === 'de' ? 'Switch to English' : 'Auf Deutsch wechseln');
      var labelEl = toggleBtn.querySelector('.lang-label');
      if (labelEl) {
        labelEl.textContent = currentLang === 'de' ? 'EN' : 'DE';
      }
    }
  }

  function setLanguage(lang) {
    if (!translations[lang]) return;
    currentLang = lang;
    localStorage.setItem('festas-lang', lang);
    applyTranslations();
  }

  function toggleLanguage() {
    setLanguage(currentLang === 'de' ? 'en' : 'de');
  }

  // Public API
  window.i18n = {
    t: t,
    setLanguage: setLanguage,
    toggleLanguage: toggleLanguage,
    getCurrentLang: function () { return currentLang; },
    init: function () {
      currentLang = detectLanguage();
      applyTranslations();
    }
  };
}());
