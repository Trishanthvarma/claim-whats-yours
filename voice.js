// Voice helpers: speech input (speech-to-text) and speech output (text-to-speech).
// Browser support varies. Every function checks that the API exists and does nothing if it does not.
// Nothing here runs on a server: "window" is only read inside functions.

// Language codes used by the browser speech APIs.
export const LANG_CODES = { en: 'en-IN', te: 'te-IN', hi: 'hi-IN' };

function getRecognitionConstructor() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function isSpeechRecognitionSupported() {
  return getRecognitionConstructor() !== null;
}

export function isSpeechSynthesisSupported() {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof window.SpeechSynthesisUtterance === 'function'
  );
}

/**
 * Start listening once. Calls onResult(text) with the spoken words.
 * Returns a stop() function. If speech input is not supported, onError is called and stop() does nothing.
 */
export function startListening({ lang = 'en', onResult, onError, onEnd } = {}) {
  const Recognition = getRecognitionConstructor();
  if (!Recognition) {
    if (onError) onError('not-supported');
    if (onEnd) onEnd();
    return () => {};
  }

  const recognition = new Recognition();
  recognition.lang = LANG_CODES[lang] || LANG_CODES.en;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    const transcript = event.results?.[0]?.[0]?.transcript ?? '';
    if (onResult) onResult(transcript);
  };
  recognition.onerror = (event) => {
    if (onError) onError(event.error || 'unknown');
  };
  recognition.onend = () => {
    if (onEnd) onEnd();
  };

  try {
    recognition.start();
  } catch (err) {
    // start() throws if it is already running.
    if (onError) onError(err?.message || 'start-failed');
  }

  return function stop() {
    try {
      recognition.stop();
    } catch {
      // Already stopped: nothing to do.
    }
  };
}

/**
 * Read text aloud. Cancels anything already being spoken first.
 * Returns true if speech was started, false if it is not supported or text is empty.
 */
export function speak(text, lang = 'en') {
  if (!isSpeechSynthesisSupported() || !text) return false;
  window.speechSynthesis.cancel();
  const utterance = new window.SpeechSynthesisUtterance(text);
  utterance.lang = LANG_CODES[lang] || LANG_CODES.en;
  window.speechSynthesis.speak(utterance);
  return true;
}
