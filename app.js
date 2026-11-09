// ---------- সাধারণ সাহায্যকারী ফাংশন ----------

// কাঞ্জির ওপরে furigana দেখানো (furigana না থাকলে শুধু শব্দ)
function renderJp(el, w) {
  el.textContent = "";
  if (w.furigana) {
    const ruby = document.createElement("ruby");
    ruby.append(w.jp);
    const rt = document.createElement("rt");
    rt.textContent = w.furigana;
    ruby.append(rt);
    el.append(ruby);
  } else {
    el.textContent = w.jp;
  }
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------- ডেটা সেভ (localStorage) ----------

const STORAGE_KEY = "jp-flashcards-v1";

// সেভ করা ডেটা পড়া। না থাকলে বা নষ্ট হলে ফাঁকা অবস্থা দেয়
function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (s && typeof s === "object") {
      return {
        firstTryCorrect: Number(s.firstTryCorrect) || 0,
        answeredTotal: Number(s.answeredTotal) || 0,
        known: Array.isArray(s.known) ? s.known : [],
      };
    }
  } catch (e) { /* ডেটা পড়া না গেলে নতুন করে শুরু */ }
  return { firstTryCorrect: 0, answeredTotal: 0, known: [] };
}

const state = loadState();

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) { /* সেভ করা না গেলেও অ্যাপ চলবে */ }
}

// ---------- ট্যাব বদলানো ----------

const quizSec = document.getElementById("quiz");
const flashSec = document.getElementById("flash");
const tabQuiz = document.getElementById("tab-quiz");
const tabFlash = document.getElementById("tab-flash");

function showTab(name) {
  const isQuiz = name === "quiz";
  quizSec.hidden = !isQuiz;
  flashSec.hidden = isQuiz;
  tabQuiz.classList.toggle("active", isQuiz);
  tabFlash.classList.toggle("active", !isQuiz);
}
tabQuiz.addEventListener("click", () => showTab("quiz"));
tabFlash.addEventListener("click", () => showTab("flash"));

// ---------- পপ-আপ ----------

const popup = document.getElementById("popup");
const popupEmoji = document.getElementById("popup-emoji");
const popupText = document.getElementById("popup-text");
const popupSub = document.getElementById("popup-sub");
const confettiEl = document.getElementById("confetti");

function showPopup({ ok, sub }, onDone) {
  popup.className = "popup " + (ok ? "ok" : "bad");
  popupEmoji.textContent = ok ? "🎉" : "😢";
  popupText.textContent = ok ? "সঠিক!" : "ভুল!";
  popupSub.textContent = sub || "";

  // উৎসবের ইমোজি ছড়িয়ে পড়বে (শুধু সঠিক উত্তরে)
  confettiEl.textContent = "";
  if (ok) {
    const icons = ["🎉", "🎊", "✨", "🥳", "⭐"];
    for (let i = 0; i < 24; i++) {
      const s = document.createElement("span");
      s.textContent = icons[i % icons.length];
      s.style.left = Math.random() * 100 + "%";
      s.style.animationDelay = Math.random() * 0.6 + "s";
      s.style.fontSize = 18 + Math.random() * 20 + "px";
      confettiEl.append(s);
    }
  }

  popup.hidden = false;
  setTimeout(() => {
    popup.hidden = true;
    onDone && onDone();
  }, 2000); // ২ সেকেন্ড
}

// ---------- কুইজ মোড ----------

const quizJpEl = document.getElementById("quiz-jp");
const optionsEl = document.getElementById("options");
const scoreEl = document.getElementById("quiz-score");

let quizQueue = [];
let quizCurrent = null;
let missed = false;       // এই প্রশ্নে কি আগে ভুল হয়েছে?
let busy = false;         // পপ-আপ চলার সময় ক্লিক বন্ধ

function nextQuestion() {
  if (quizQueue.length === 0) quizQueue = shuffle(words);
  quizCurrent = quizQueue.shift();
  missed = false;
  busy = false;

  renderJp(quizJpEl, quizCurrent);

  // ৩টা ভুল অপশন + ১টা সঠিক
  const wrongs = shuffle(
    words.filter(w => w.meaning !== quizCurrent.meaning)
  ).slice(0, 3);
  const choices = shuffle([quizCurrent, ...wrongs]);

  optionsEl.textContent = "";
  choices.forEach(c => {
    const b = document.createElement("button");
    b.className = "option";
    b.textContent = c.meaning;
    b.addEventListener("click", () => onPick(b, c));
    optionsEl.append(b);
  });

  updateScore();
}

function updateScore() {
  scoreEl.textContent =
    `প্রথমবারেই সঠিক: ${state.firstTryCorrect} / ${state.answeredTotal}`;
}

function onPick(btn, choice) {
  if (busy) return;
  busy = true;

  if (choice.meaning === quizCurrent.meaning) {
    btn.classList.add("right");
    state.answeredTotal++;
    if (!missed) state.firstTryCorrect++;
    saveState();
    if (missed) {
      // আগে ভুল করেছিল, তাই শব্দটা কিছুক্ষণ পরে আবার আসবে
      quizQueue.splice(Math.min(5, quizQueue.length), 0, quizCurrent);
    }
    showPopup(
      { ok: true, sub: `${quizCurrent.meaning} (${quizCurrent.pron})` },
      nextQuestion // ২ সেকেন্ড পরে নিজে নিজে পরের শব্দে
    );
  } else {
    btn.classList.add("wrong");
    btn.disabled = true;
    missed = true;
    showPopup({ ok: false, sub: "আবার চেষ্টা করুন" }, () => {
      busy = false;
    });
  }
}

// ---------- ফ্ল্যাশকার্ড মোড ----------

const cardEl = document.getElementById("card");
const jpEl = document.getElementById("jp");
const meaningEl = document.getElementById("meaning");
const pronEl = document.getElementById("pron");
const counterEl = document.getElementById("counter");

let queue = [];
let current = null;

function showNext() {
  if (queue.length === 0) {
    // আগে "জানি" মার্ক করা শব্দ বাদ দিয়ে তালিকা বানানো
    queue = shuffle(words.filter(w => !state.known.includes(w.jp)));
    if (queue.length === 0) {
      // সব শব্দ জানা হয়ে গেলে নতুন করে শুরু
      state.known = [];
      saveState();
      queue = shuffle(words);
    }
  }
  current = queue[0];
  cardEl.classList.remove("flipped");
  // উল্টানোর অ্যানিমেশন শেষ হওয়ার আগে উত্তর যেন না দেখা যায়
  setTimeout(() => {
    renderJp(jpEl, current);
    meaningEl.textContent = current.meaning;
    pronEl.textContent = "উচ্চারণ: " + current.pron;
  }, 150);
  counterEl.textContent = `জানা হয়েছে: ${state.known.length} / ${words.length}`;
}

cardEl.addEventListener("click", () => cardEl.classList.toggle("flipped"));

document.getElementById("known").addEventListener("click", () => {
  const w = queue.shift();
  if (!state.known.includes(w.jp)) state.known.push(w.jp);
  saveState();
  showNext();
});

document.getElementById("unknown").addEventListener("click", () => {
  queue.push(queue.shift());
  showNext();
});

// ---------- প্রগতি রিসেট ----------

document.getElementById("reset").addEventListener("click", () => {
  if (!confirm("সব প্রগতি (স্কোর ও জানা শব্দ) মুছে ফেলবেন?")) return;
  state.firstTryCorrect = 0;
  state.answeredTotal = 0;
  state.known = [];
  saveState();
  queue = [];
  showNext();
  updateScore();
});

// ---------- শুরু ----------
nextQuestion();
showNext();
