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
      'nav.milestones': 'Journey',
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

      // Social Proof
      'socialproof.label': 'Bekannt aus Kooperationen mit',

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

      // Platforms
      'platforms.title': 'Plattformen',
      'platforms.followers': 'Follower',
      'platforms.instagram.cta': 'Auf Instagram folgen →',
      'platforms.tiktok.cta': 'Auf TikTok folgen →',
      'platforms.threads.cta': 'Auf Threads folgen →',

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

      // Newsletter
      'newsletter.title': 'Bleib auf dem Laufenden',
      'newsletter.desc': 'Erhalte Updates zu neuen Builds, Gaming-Content und Projekten direkt in dein Postfach.',
      'newsletter.placeholder': 'deine@email.de',
      'newsletter.submit': 'Abonnieren',
      'newsletter.note': 'Kein Spam. Jederzeit abbestellbar.',
      'newsletter.success': 'Danke für dein Abo! 🎉',
      'newsletter.error': 'Etwas ist schiefgelaufen. Bitte versuche es erneut.',

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

      // Milestones
      'milestones.title': 'Creator Journey',
      'milestones.2021.year': '2021',
      'milestones.2021.title': 'Content-Creation gestartet',
      'milestones.2021.desc': 'Erste Posts auf Instagram — PC Builds und Gaming-Setups, gebaut mit Leidenschaft.',
      'milestones.2022.year': '2022',
      'milestones.2022.title': 'Erste Brand-Kooperation',
      'milestones.2022.desc': 'Erste offizielle Zusammenarbeit mit NZXT — der Beginn einer langen Liste von Partnerschaften.',
      'milestones.2023.year': '2023',
      'milestones.2023.title': '100K auf Instagram',
      'milestones.2023.desc': 'Die Community wächst: 100.000 Follower auf Instagram erreicht.',
      'milestones.2023b.year': 'Okt. 2023',
      'milestones.2023b.title': 'Tochter geboren',
      'milestones.2023b.desc': 'Das größte Projekt des Jahres — die Familie wächst.',
      'milestones.2024.year': '2024',
      'milestones.2024.title': 'Top-Brand-Partnerschaften',
      'milestones.2024.desc': 'Kooperationen mit Corsair, Elgato, ASUS ROG und Razer — Creator auf Vollgas.',
      'milestones.2025.year': 'Jun. 2025',
      'milestones.2025.title': 'Zweites Kind geboren',
      'milestones.2025.desc': 'Familienzuwachs — und trotzdem weiter Builds, Content und Engineering.',
      'milestones.2026.year': '2026',
      'milestones.2026.title': '185K+ Community',
      'milestones.2026.desc': '185.000+ Follower auf Instagram, TikTok und Threads. Die Reise geht weiter.',

      // Meta (for JS-driven meta desc)
      'meta.description': 'Eric Schönke — Tech & Gaming Creator und Ingenieur aus Hamburg. 185K+ Follower. PC Builds, Gaming Setups, Nuclear Engineering.',

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
      'nav.milestones': 'Journey',
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

      // Social Proof
      'socialproof.label': 'Featured collaborations with',

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

      // Platforms
      'platforms.title': 'Platforms',
      'platforms.followers': 'Followers',
      'platforms.instagram.cta': 'Follow on Instagram →',
      'platforms.tiktok.cta': 'Follow on TikTok →',
      'platforms.threads.cta': 'Follow on Threads →',

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
      'milestones.title': 'Creator Journey',
      'milestones.2021.year': '2021',
      'milestones.2021.title': 'Started Content Creation',
      'milestones.2021.desc': 'First posts on Instagram — PC builds and gaming setups, made with passion.',
      'milestones.2022.year': '2022',
      'milestones.2022.title': 'First Brand Deal',
      'milestones.2022.desc': 'First official collab with NZXT — the start of a long list of brand partnerships.',
      'milestones.2023.year': '2023',
      'milestones.2023.title': '100K on Instagram',
      'milestones.2023.desc': 'The community grows: reached 100,000 followers on Instagram.',
      'milestones.2023b.year': 'Oct. 2023',
      'milestones.2023b.title': 'Daughter Born',
      'milestones.2023b.desc': 'The biggest project of the year — the family grows.',
      'milestones.2024.year': '2024',
      'milestones.2024.title': 'Top Brand Partnerships',
      'milestones.2024.desc': 'Collaborations with Corsair, Elgato, ASUS ROG, and Razer — creator in full swing.',
      'milestones.2025.year': 'Jun. 2025',
      'milestones.2025.title': 'Second Child Born',
      'milestones.2025.desc': 'Family grows again — still building, creating, and engineering.',
      'milestones.2026.year': '2026',
      'milestones.2026.title': '185K+ Community',
      'milestones.2026.desc': '185,000+ followers on Instagram, TikTok, and Threads. The journey continues.',

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

      // Newsletter
      'newsletter.title': 'Stay in the Loop',
      'newsletter.desc': 'Get updates on new builds, gaming content, and projects delivered to your inbox.',
      'newsletter.placeholder': 'your@email.com',
      'newsletter.submit': 'Subscribe',
      'newsletter.note': 'No spam. Unsubscribe anytime.',
      'newsletter.success': 'Thanks for subscribing! 🎉',
      'newsletter.error': 'Something went wrong. Please try again.',

      // Meta
      'meta.description': 'Eric Schönke — Tech & Gaming Creator and Engineer from Hamburg. 185K+ followers. PC Builds, Gaming Setups, Nuclear Engineering.',

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

    // Update meta description based on language
    var metaDesc = document.getElementById('meta-description');
    if (metaDesc) {
      metaDesc.setAttribute('content', t('meta.description'));
    }

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
