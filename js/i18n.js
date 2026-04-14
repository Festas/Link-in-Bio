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
      'nav.explore': 'Entdecken',
      'nav.projects': 'Projekte',
      'nav.content': 'Content',
      'nav.contact': 'Kontakt',

      // Hero
      'hero.tagline': 'Software Engineer · Tech Creator · Builder',
      'hero.bio': 'Hey, ich bin Eric — Software Engineer und Tech Content Creator aus Hamburg. Ich entwickle Webanwendungen, Self-Hosted-Infrastruktur und Games — und teile meine Leidenschaft für Tech, PC-Builds und Gaming-Setups auf Instagram und TikTok.',

      // Stats
      'stats.total': 'Gesamt-Follower',
      'stats.instagram': 'Instagram',
      'stats.tiktok': 'TikTok',
      'stats.threads': 'Threads',
      'stats.youtube': 'YouTube',
      'stats.updated': 'Stand: April 2026',

      // About
      'about.title': 'Über mich',
      'about.text': 'Ich bin Eric Schönke — Software Engineer und Content Creator aus Hamburg. Tagsüber entwickle ich Webanwendungen und manage Self-Hosted-Infrastruktur. In meiner Freizeit teile ich meine Leidenschaft für Tech, Custom PC Builds und RGB-Setups mit über 185K Followern auf Social Media.',
      'about.text2': 'Ich liebe es, an der Schnittstelle von Engineering und Kreativität zu arbeiten — ob es darum geht, einen Minecraft MMO-Server zu bauen, ein Browser-Game zu entwickeln oder das perfekte Setup zu gestalten.',
      'about.engineering': 'Engineering',
      'about.creative': 'Kreativ',

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

      // Content
      'content.title': 'Neuester Content',
      'content.latest': 'Neuestes Video',
      'content.more': 'Mehr auf YouTube →',

      // Milestones
      'milestones.title': 'Meilensteine',
      'milestone.1': '100K Follower auf Instagram erreicht',
      'milestone.2': 'YouTube-Kanal gestartet',
      'milestone.3': 'Minecraft RPG Server gelauncht',
      'milestone.4': 'Cosmic Survivor veröffentlicht',
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
      'nav.explore': 'Explore',
      'nav.projects': 'Projects',
      'nav.content': 'Content',
      'nav.contact': 'Contact',

      // Hero
      'hero.tagline': 'Software Engineer · Tech Creator · Builder',
      'hero.bio': "Hey, I'm Eric — a software engineer and tech content creator from Hamburg, Germany. I build web applications, self-hosted infrastructure, and games — and share my passion for tech, PC builds, and gaming setups on Instagram and TikTok.",

      // Stats
      'stats.total': 'Total Followers',
      'stats.instagram': 'Instagram',
      'stats.tiktok': 'TikTok',
      'stats.threads': 'Threads',
      'stats.youtube': 'YouTube',
      'stats.updated': 'Last updated: April 2026',

      // About
      'about.title': 'About Me',
      'about.text': "I'm Eric Schönke — a software engineer and content creator based in Hamburg, Germany. By day, I build web applications and manage self-hosted infrastructure. By night, I share my passion for tech, custom PC builds, and RGB setups with 185K+ followers across social media.",
      'about.text2': "I love working at the intersection of engineering and creativity — whether that's building a Minecraft MMO server, developing a browser game, or crafting the perfect setup.",
      'about.engineering': 'Engineering',
      'about.creative': 'Creative',

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

      // Content
      'content.title': 'Latest Content',
      'content.latest': 'Latest Video',
      'content.more': 'More on YouTube →',

      // Milestones
      'milestones.title': 'Milestones',
      'milestone.1': 'Reached 100K followers on Instagram',
      'milestone.2': 'Launched YouTube channel',
      'milestone.3': 'Launched Minecraft RPG server',
      'milestone.4': 'Released Cosmic Survivor',
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
