"""
Internationalization (i18n) module for Link-in-Bio application.

This module provides:
- Translation loading from JSON files
- Translation lookup with fallback
- Template helper functions
- Language detection

Usage:
    from app.i18n import get_translator, t

    # Get a translator for a specific language
    translator = get_translator('de')
    text = translator('common.save')  # Returns "Speichern"

    # Or use the global translation function
    text = t('common.save', lang='de')
"""

import json
import os
import logging
from pathlib import Path
from typing import Dict, Any, Optional, Callable
from functools import lru_cache

logger = logging.getLogger(__name__)

# Default configuration
DEFAULT_LANGUAGE = "de"
FALLBACK_LANGUAGE = "en"
LOCALES_DIR = Path(__file__).parent.parent / "locales"

# Cache for loaded translations
_translations: Dict[str, Dict[str, Any]] = {}


def load_translations(language: str) -> Dict[str, Any]:
    """
    Load translation file for a specific language.

    Args:
        language: Language code (e.g., 'de', 'en')

    Returns:
        Dictionary with translations or empty dict if not found
    """
    if language in _translations:
        return _translations[language]

    locale_file = LOCALES_DIR / f"{language}.json"

    if not locale_file.exists():
        logger.warning(f"Translation file not found: {locale_file}")
        return {}

    try:
        with open(locale_file, "r", encoding="utf-8") as f:
            translations = json.load(f)
            _translations[language] = translations
            logger.info(f"Loaded translations for language: {language}")
            return translations
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in translation file {locale_file}: {e}")
        return {}
    except Exception as e:
        logger.error(f"Error loading translation file {locale_file}: {e}")
        return {}


def get_nested_value(data: Dict[str, Any], key_path: str, default: Optional[str] = None) -> str:
    """
    Get a nested value from a dictionary using dot notation.

    Args:
        data: The dictionary to search
        key_path: Dot-separated key path (e.g., 'common.save')
        default: Default value if key not found

    Returns:
        The value at the key path or default
    """
    keys = key_path.split(".")
    value = data

    for key in keys:
        if isinstance(value, dict) and key in value:
            value = value[key]
        else:
            return default if default is not None else key_path

    return str(value) if not isinstance(value, dict) else (default or key_path)


def translate(key: str, lang: str = DEFAULT_LANGUAGE, default: Optional[str] = None, **params) -> str:
    """
    Translate a key to the specified language.

    Args:
        key: Translation key in dot notation (e.g., 'common.save')
        lang: Target language code
        default: Default value if translation not found
        **params: Parameters for string formatting

    Returns:
        Translated string
    """
    # Load translations for the language
    translations = load_translations(lang)

    # Get the translation
    text = get_nested_value(translations, key)

    # If not found and not the same as key, try fallback language
    if text == key and lang != FALLBACK_LANGUAGE:
        fallback_translations = load_translations(FALLBACK_LANGUAGE)
        text = get_nested_value(fallback_translations, key, default)

    # Apply parameter substitution
    if params and text != key:
        try:
            for param_key, param_value in params.items():
                text = text.replace("{" + param_key + "}", str(param_value))
        except Exception as e:
            logger.warning(f"Error formatting translation: {e}")

    return text


# Shorthand alias for translate function
t = translate


def get_translator(lang: str = DEFAULT_LANGUAGE) -> Callable[[str], str]:
    """
    Get a translator function bound to a specific language.

    Args:
        lang: Target language code

    Returns:
        A function that translates keys to the specified language
    """

    def translator(key: str, default: Optional[str] = None, **params) -> str:
        return translate(key, lang=lang, default=default, **params)

    return translator


def get_available_languages() -> list:
    """
    Get a list of available languages.

    Returns:
        List of language codes with available translations
    """
    languages = []

    if not LOCALES_DIR.exists():
        return languages

    for file in LOCALES_DIR.glob("*.json"):
        lang_code = file.stem
        try:
            translations = load_translations(lang_code)
            meta = translations.get("meta", {})
            languages.append(
                {
                    "code": lang_code,
                    "name": meta.get("name", lang_code.upper()),
                    "version": meta.get("version", "1.0.0"),
                }
            )
        except Exception as e:
            logger.warning(f"Could not load language {lang_code}: {e}")

    return languages


def detect_language_from_request(request) -> str:
    """
    Detect the preferred language from a request.

    Args:
        request: FastAPI/Starlette request object

    Returns:
        Detected language code
    """
    # Check query parameter first
    if hasattr(request, "query_params"):
        lang = request.query_params.get("lang")
        if lang and (LOCALES_DIR / f"{lang}.json").exists():
            return lang

    # Check cookie
    if hasattr(request, "cookies"):
        lang = request.cookies.get("lang")
        if lang and (LOCALES_DIR / f"{lang}.json").exists():
            return lang

    # Check Accept-Language header
    if hasattr(request, "headers"):
        accept_lang = request.headers.get("accept-language", "")
        # Parse Accept-Language header (simplified)
        for lang_part in accept_lang.split(","):
            lang_code = lang_part.split(";")[0].strip().split("-")[0].lower()
            if (LOCALES_DIR / f"{lang_code}.json").exists():
                return lang_code

    return DEFAULT_LANGUAGE


def get_language_name(code: str) -> str:
    """
    Get the display name of a language.

    Args:
        code: Language code

    Returns:
        Display name or the code if not found
    """
    translations = load_translations(code)
    return translations.get("meta", {}).get("name", code.upper())


def reload_translations():
    """
    Clear the translation cache and reload all translations.
    Useful for development when translation files are updated.
    """
    global _translations
    _translations = {}
    logger.info("Translation cache cleared")


# Template context processor for Jinja2
def i18n_context_processor(request):
    """
    Context processor that adds translation functions to templates.

    Usage in Jinja2 template:
        {{ t('common.save') }}
        {{ _('common.save') }}
    """
    lang = detect_language_from_request(request)
    translator = get_translator(lang)

    return {
        "t": translator,
        "_": translator,  # Common alias
        "current_language": lang,
        "available_languages": get_available_languages(),
    }


# Initialize translations on module load
try:
    for locale_file in LOCALES_DIR.glob("*.json"):
        load_translations(locale_file.stem)
except Exception as e:
    logger.error(f"Error initializing translations: {e}")
