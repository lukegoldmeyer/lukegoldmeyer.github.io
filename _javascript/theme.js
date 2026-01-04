/**
 * Theme management class
 *
 * To reduce flickering during page load, this script should be loaded synchronously.
 */
class Theme {
  static #modeKey = 'mode';
  static #modeAttr = 'data-mode';
  static #darkMedia = window.matchMedia('(prefers-color-scheme: dark)');
  static switchable = !document.documentElement.hasAttribute(this.#modeAttr);

  static get DARK() {
    return 'dark';
  }

  static get LIGHT() {
    return 'light';
  }

  /**
   * @returns {string} Theme mode identifier
   */
  static get ID() {
    return 'theme-mode';
  }

  /**
   * Gets the current visual state of the theme.
   */
  static get visualState() {
    if (this.#hasMode) {
      return this.#mode;
    } else {
      // Fallback: Default to LIGHT even if system is dark
      return this.LIGHT;
    }
  }

  static get #mode() {
    return (
      sessionStorage.getItem(this.#modeKey) ||
      document.documentElement.getAttribute(this.#modeAttr)
    );
  }

  static get #isDarkMode() {
    return this.#mode === this.DARK;
  }

  static get #hasMode() {
    return this.#mode !== null;
  }

  static get #sysDark() {
    return this.#darkMedia.matches;
  }

  static getThemeMapper(light, dark) {
    return {
      [this.LIGHT]: light,
      [this.DARK]: dark
    };
  }

  /**
   * Initializes the theme based on system preferences or stored mode
   */
  static init() {
    // If the theme is locked in _config.yml, do nothing
    if (!this.switchable) {
      return;
    }

    // Listen for system changes (OS Dark Mode toggle)
    this.#darkMedia.addEventListener('change', () => {
      const lastMode = this.#mode;
      this.#clearMode();

      if (lastMode !== this.visualState) {
        this.#notify();
      }
    });

    // === THE FIX ===
    // If the user has NO saved preference (First visit), FORCE Light Mode.
    if (!this.#hasMode) {
      this.#setLight(); 
      return; 
    }
    // ===============

    // Otherwise, load their saved preference
    if (this.#isDarkMode) {
      this.#setDark();
    } else {
      this.#setLight();
    }
  }

  /**
   * Flips the current theme mode
   */
  static flip() {
    // CHANGE 2: Simplified toggle. Never "clear" mode, always set explicit.
    if (this.visualState === this.LIGHT) {
      this.#setDark();
    } else {
      this.#setLight();
    }
    this.#notify();
  }

  static #setDark() {
    document.documentElement.setAttribute(this.#modeAttr, this.DARK);
    sessionStorage.setItem(this.#modeKey, this.DARK);
  }

  static #setLight() {
    document.documentElement.setAttribute(this.#modeAttr, this.LIGHT);
    sessionStorage.setItem(this.#modeKey, this.LIGHT);
  }

  static #clearMode() {
    document.documentElement.removeAttribute(this.#modeAttr);
    sessionStorage.removeItem(this.#modeKey);
  }

  static #notify() {
    window.postMessage({ id: this.ID }, '*');
  }
}

Theme.init();

export default Theme;