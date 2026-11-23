// Citizen assistant: a voice or typed question box with rule-based answers (no AI).
// Voice input uses the browser speech API when it exists. Typing always works.
// The transcript lives in component state only. No audio is stored anywhere.
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CitizenLayout } from '../components/Layout.jsx';
import { useStore } from '../lib/store.jsx';
import { useLanguage, LANGUAGE_OPTIONS } from '../i18n/LanguageContext.jsx';
import { LANG_CODES, isSpeechRecognitionSupported, startListening, speak } from '../lib/voice.js';

// Shown under the microphone. Also spoken by "Repeat instruction" when there is no reply yet.
const MIC_INSTRUCTION = 'Press the microphone, speak clearly, then press again to stop.';

// Every answer ends with this line.
const DISCLAIMER = 'I give general information only. I do not decide eligibility. Check the official portal.';

// Topics in the order they are checked. The first topic whose keyword appears in the question wins.
// Keywords are lowercase. Telugu and Hindi words are included as they appear in the question text.
const TOPICS = [
  { id: 'farmer', words: ['farmer', 'farm', 'రైతు', 'किसान'] },
  { id: 'student', words: ['student', 'scholarship', 'విద్యార్థి', 'छात्र'] },
  { id: 'documents', words: ['document', 'certificate', 'సర్టిఫికెట్', 'दस्तावेज़'] },
  { id: 'application', words: ['application', 'applied', 'దరఖాస్తు', 'आवेदन'] },
  { id: 'deadline', words: ['deadline', 'last date', 'గడువు', 'अंतिम तिथि'] },
  { id: 'family', words: ['family', 'కుటుంబం', 'परिवार'] },
];

// Find the topic of a question. Returns 'default' when no keyword matches.
function detectTopic(lowerText) {
  for (const topic of TOPICS) {
    if (topic.words.some((word) => lowerText.includes(word))) return topic.id;
  }
  return 'default';
}

// Names of schemes whose name or category matches the pattern. Archived schemes are left out.
function namesMatching(schemes, pattern) {
  return schemes
    .filter((s) => !s.archived && pattern.test(`${s.name ?? ''} ${s.category ?? ''}`))
    .map((s) => s.name);
}

// Format a timestamp as a short English date, e.g. "31 Dec 2026".
function formatDate(ms) {
  return new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Build the answer for a question. Returns { text, link, linkLabel }.
// Replies are English for now. The lang argument is kept so the AI backend can use it later.
function answerQuestion(text, lang, schemes) {
  void lang; // Full multilingual answers need the AI backend later.
  const lowerText = String(text ?? '').toLowerCase();
  const topic = detectTopic(lowerText);
  const now = Date.now();

  let body;
  let link = null;
  let linkLabel = null;

  if (topic === 'farmer') {
    const names = namesMatching(schemes, /farm/i);
    body = `Here are farmer-related sample schemes from your list: ${names.length ? names.join(', ') : 'none right now'}.`;
    link = '/citizen/matches';
    linkLabel = 'See my family schemes';
  } else if (topic === 'student') {
    const names = namesMatching(schemes, /student|scholarship|education/i);
    body = `Here are student-related sample schemes from your list: ${names.length ? names.join(', ') : 'none right now'}.`;
    link = '/citizen/matches';
    linkLabel = 'See my family schemes';
  } else if (topic === 'documents') {
    body = 'The documents you need depend on the scheme. The document guide shows what each scheme asks for.';
    link = '/citizen/documents';
    linkLabel = 'Open document guide';
  } else if (topic === 'application') {
    body = 'You can track the schemes you have started on the applications page.';
    link = '/citizen/applications';
    linkLabel = 'Open my applications';
  } else if (topic === 'deadline') {
    // Published, not archived, end date still in the future. Soonest first, at most three.
    const upcoming = schemes
      .filter((s) => s.status === 'published' && !s.archived)
      .map((s) => ({ name: s.name, end: Date.parse(s.endDate) }))
      .filter((x) => !Number.isNaN(x.end) && x.end > now)
      .sort((a, b) => a.end - b.end)
      .slice(0, 3);
    body = upcoming.length
      ? `Upcoming deadlines, soonest first: ${upcoming
          .map((x) => `${x.name} (ends ${formatDate(x.end)})`)
          .join('; ')}.`
      : 'No open sample schemes have a deadline coming up.';
    link = '/citizen/dashboard';
    linkLabel = 'Open my dashboard';
  } else if (topic === 'family') {
    body = 'You can add and check family members on the family page.';
    link = '/citizen/family';
    linkLabel = 'Open my family';
  } else {
    body = 'I can help you find schemes, documents and deadlines. Try asking about farmers, students, documents or deadlines.';
  }

  return { text: `${body}\n\n${DISCLAIMER}`, link, linkLabel };
}

// Turn a speech error code into a message a person can act on. Returns '' when nothing should be shown.
function friendlyError(code) {
  if (code === 'aborted') return '';
  if (code === 'no-speech') return 'No speech was heard. Try again, or type your question.';
  if (code === 'not-allowed' || code === 'service-not-allowed') {
    return 'Microphone permission was blocked. You can type your question instead.';
  }
  if (code === 'not-supported') return '';
  return `Voice input stopped (${code}). You can type your question instead.`;
}

export default function AssistantPage() {
  const location = useLocation();
  const { state } = useStore();
  const schemes = state.schemes;
  const { lang, setLang } = useLanguage();

  const [transcript, setTranscript] = useState('');
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const [reply, setReply] = useState(null);

  // Holds the stop() function returned by startListening.
  const stopRef = useRef(null);
  const supported = isSpeechRecognitionSupported();

  // Put any question passed from another page into the text box.
  useEffect(() => {
    const prefill = location.state?.prefill;
    if (prefill) setTranscript(String(prefill));
  }, [location.state]);

  // Stop the microphone if the user leaves the page.
  useEffect(() => {
    return () => {
      if (stopRef.current) stopRef.current();
    };
  }, []);

  // Press once to start listening. Press again to stop.
  function handleMicClick() {
    if (listening) {
      if (stopRef.current) stopRef.current();
      setListening(false);
      return;
    }
    setError('');
    setListening(true);
    stopRef.current = startListening({
      lang: LANG_CODES[lang],
      onResult: (text) => {
        if (text) {
          setTranscript(text);
        } else {
          setError('I did not catch that. Try again, or type your question.');
        }
      },
      onError: (code) => {
        const message = friendlyError(code);
        if (message) setError(message);
      },
      onEnd: () => setListening(false),
    });
  }

  // Answer the question in the text box.
  function handleSend() {
    const question = transcript.trim();
    if (!question) {
      setError('Type or speak a question first.');
      return;
    }
    setError('');
    setReply(answerQuestion(question, lang, schemes));
  }

  // Read the reply aloud.
  function handlePlay() {
    if (!reply) return;
    if (!speak(reply.text, LANG_CODES[lang])) {
      setError('Speech output is not available in this browser.');
    }
  }

  // Read the last instruction again. Before any reply, read the microphone instruction.
  function handleRepeat() {
    const line = reply ? reply.text : MIC_INSTRUCTION;
    if (!speak(line, LANG_CODES[lang])) {
      setError('Speech output is not available in this browser.');
    }
  }

  return (
    <CitizenLayout
      title="Assistant"
      helpSteps={[
        'Press the big microphone and speak your question. Press it again to stop.',
        'You can also type your question in the box and press Send.',
        'Check the answer. Press Play response to hear it, or Repeat instruction to hear the last instruction again.',
        'The assistant gives general information only. It does not decide eligibility.',
      ]}
    >
      <div className="container">
        <div className="card">
          <div className="row" style={{ gap: 8, alignItems: 'center' }}>
            <label htmlFor="assistant-language">Language</label>
            <select
              id="assistant-language"
              className="select"
              aria-label="Assistant language"
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              style={{ width: 'auto', minHeight: 44 }}
            >
              {LANGUAGE_OPTIONS.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {!supported && (
            <p className="notice">Voice is not supported in this browser. Type your question below.</p>
          )}

          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button
              type="button"
              className="mic-button"
              aria-pressed={listening}
              aria-label={listening ? 'Stop listening' : 'Start listening'}
              onClick={handleMicClick}
              disabled={!supported}
              style={{
                width: 120,
                height: 120,
                borderRadius: '50%',
                fontSize: 48,
                cursor: supported ? 'pointer' : 'not-allowed',
              }}
            >
              {listening ? '■' : '🎤'}
            </button>
            <p className="muted" style={{ marginTop: 8 }}>
              {listening ? 'Listening...' : MIC_INSTRUCTION}
            </p>
          </div>

          {error && (
            <p role="alert" className="notice">
              {error}
            </p>
          )}

          <label htmlFor="assistant-question">Your question</label>
          <textarea
            id="assistant-question"
            className="textarea"
            rows={4}
            style={{ width: '100%' }}
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Type or speak your question here"
          />

          <div className="grid" style={{ marginTop: 12 }}>
            <button type="button" className="btn btn-primary" onClick={handleSend}>
              Send
            </button>
          </div>
        </div>

        <div className="card" aria-live="polite">
          <h2>Response</h2>
          {reply ? (
            <>
              <p style={{ whiteSpace: 'pre-line' }}>{reply.text}</p>
              {reply.link && (
                <p>
                  <Link className="btn btn-secondary" to={reply.link}>
                    {reply.linkLabel}
                  </Link>
                </p>
              )}
            </>
          ) : (
            <p className="muted">Ask a question to see the answer here.</p>
          )}

          <div className="grid" style={{ marginTop: 12 }}>
            <button type="button" className="btn btn-secondary" onClick={handlePlay} disabled={!reply}>
              Play response
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleRepeat}>
              Repeat instruction
            </button>
          </div>
        </div>
      </div>
    </CitizenLayout>
  );
}
