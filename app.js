const state = {
  provider: localStorage.getItem("nova_provider") || "gemini",
  model: localStorage.getItem("nova_model") || "gemini-2.5-flash",
  apiKey: localStorage.getItem("nova_api_key") || "",
  voice: localStorage.getItem("nova_voice") !== "false",
  proactive: localStorage.getItem("nova_proactive") !== "false",
  lastTalk: Date.now(),
};

const authScreen = document.querySelector("#authScreen");
const chatScreen = document.querySelector("#chatScreen");
const authForm = document.querySelector("#authForm");
const skipLogin = document.querySelector("#skipLogin");
const messages = document.querySelector("#messages");
const chatForm = document.querySelector("#chatForm");
const messageInput = document.querySelector("#messageInput");
const micButton = document.querySelector("#micButton");
const settingsButton = document.querySelector("#settingsButton");
const closeSettings = document.querySelector("#closeSettings");
const settingsSheet = document.querySelector("#settingsSheet");
const providerSelect = document.querySelector("#providerSelect");
const apiKeyInput = document.querySelector("#apiKeyInput");
const modelInput = document.querySelector("#modelInput");
const proactiveToggle = document.querySelector("#proactiveToggle");
const voiceToggle = document.querySelector("#voiceToggle");
const saveSettings = document.querySelector("#saveSettings");
const providerLabel = document.querySelector("#providerLabel");
const voiceLabel = document.querySelector("#voiceLabel");
const proactiveLabel = document.querySelector("#proactiveLabel");
const novaMood = document.querySelector("#novaMood");
const orb = document.querySelector("#orb");

function boot() {
  providerSelect.value = state.provider;
  apiKeyInput.value = state.apiKey;
  modelInput.value = state.model;
  proactiveToggle.checked = state.proactive;
  voiceToggle.checked = state.voice;
  updateLabels();

  if (localStorage.getItem("nova_mobile_session") === "trusted") {
    openChat();
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

function openChat() {
  authScreen.classList.add("hidden");
  chatScreen.classList.remove("hidden");
  addMessage("nova", "Ami Nova. Android web app mode-e ready achi.");
  speak("Ami Nova. Android web app mode-e ready achi.");
  setTimeout(proactiveCheck, 2500);
}

authForm.addEventListener("submit", (event) => {
  event.preventDefault();
  localStorage.setItem("nova_mobile_session", "trusted");
  openChat();
});

skipLogin.addEventListener("click", openChat);

document.querySelectorAll("[data-provider]").forEach((button) => {
  button.addEventListener("click", () => {
    addMessage("nova", `${button.dataset.provider} login needs a real OAuth backend. Use Continue for this mobile frontend.`);
  });
});

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = messageInput.value.trim();
  if (!text) return;
  messageInput.value = "";
  addMessage("user", text);
  state.lastTalk = Date.now();
  await answer(text);
});

settingsButton.addEventListener("click", () => settingsSheet.classList.remove("hidden"));
closeSettings.addEventListener("click", () => settingsSheet.classList.add("hidden"));

saveSettings.addEventListener("click", () => {
  state.provider = providerSelect.value;
  state.model = modelInput.value.trim() || "gemini-2.5-flash";
  state.apiKey = apiKeyInput.value.trim();
  state.proactive = proactiveToggle.checked;
  state.voice = voiceToggle.checked;
  localStorage.setItem("nova_provider", state.provider);
  localStorage.setItem("nova_model", state.model);
  localStorage.setItem("nova_api_key", state.apiKey);
  localStorage.setItem("nova_proactive", String(state.proactive));
  localStorage.setItem("nova_voice", String(state.voice));
  updateLabels();
  settingsSheet.classList.add("hidden");
});

micButton.addEventListener("click", () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    addMessage("nova", "Ei browser speech recognition support korche na.");
    return;
  }
  const recognition = new SpeechRecognition();
  recognition.lang = "en-IN";
  recognition.interimResults = false;
  recognition.onstart = () => {
    novaMood.textContent = "Listening...";
    orb.classList.add("speaking");
  };
  recognition.onresult = (event) => {
    const text = event.results[0][0].transcript;
    messageInput.value = text;
    chatForm.requestSubmit();
  };
  recognition.onend = () => {
    novaMood.textContent = "Nova is listening for your next move.";
    orb.classList.remove("speaking");
  };
  recognition.start();
});

async function answer(prompt) {
  const bubble = addMessage("nova", "");
  novaMood.textContent = "Thinking...";
  orb.classList.add("speaking");

  if (state.provider === "gemini" && state.apiKey) {
    await streamGemini(prompt, bubble);
  } else {
    await fakeLocalAnswer(prompt, bubble);
  }

  orb.classList.remove("speaking");
  novaMood.textContent = "Nova is listening for your next move.";
}

async function streamGemini(prompt, bubble) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(state.model)}:streamGenerateContent?alt=sse`;
  const payload = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.5, maxOutputTokens: 320 },
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": state.apiKey,
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok || !response.body) throw new Error(`Gemini failed: ${response.status}`);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let spoken = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const data = JSON.parse(line.slice(5));
        const chunk = (data.candidates?.[0]?.content?.parts || []).map((part) => part.text || "").join("");
        if (!chunk) continue;
        bubble.textContent += chunk;
        spoken += chunk;
        messages.scrollTop = messages.scrollHeight;
        const sentence = takeSentence(spoken);
        if (sentence) {
          speak(sentence.text);
          spoken = sentence.rest;
        }
      }
    }
    if (spoken.trim()) speak(spoken.trim());
  } catch (error) {
    bubble.textContent = `${error.message}. Browser CORS/API-key restrictions may apply. Use the Python desktop app for full local control.`;
    speak(bubble.textContent);
  }
}

async function fakeLocalAnswer(prompt, bubble) {
  const text = `Mobile frontend ready. You said: "${prompt}". For real Ollama from Android browser, add a backend bridge on your PC; browser cannot safely call local Ollama on another device without server setup.`;
  for (const chunk of text.match(/.{1,12}/g) || []) {
    bubble.textContent += chunk;
    await wait(35);
  }
  speak(text);
}

function addMessage(role, text) {
  const bubble = document.createElement("div");
  bubble.className = `message ${role}`;
  bubble.textContent = text;
  messages.appendChild(bubble);
  messages.scrollTop = messages.scrollHeight;
  return bubble;
}

function speak(text) {
  if (!state.voice || !("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.08;
  utterance.pitch = 1.02;
  speechSynthesis.speak(utterance);
}

function takeSentence(text) {
  const match = text.match(/^(.+?[.!?।])\s+/s);
  if (!match) return null;
  return { text: match[1].trim(), rest: text.slice(match[0].length) };
}

function proactiveCheck() {
  if (state.proactive && Date.now() - state.lastTalk > 1000 * 60 * 3) {
    const text = "Ami ekhane achi. Tumi chaile ami nij theke tomar kaj niye check-in korte pari.";
    addMessage("nova", text);
    speak(text);
    state.lastTalk = Date.now();
  }
  setTimeout(proactiveCheck, 30000);
}

function updateLabels() {
  providerLabel.textContent = state.provider === "gemini" ? "Gemini" : "Ollama";
  voiceLabel.textContent = state.voice ? "Ready" : "Muted";
  proactiveLabel.textContent = state.proactive ? "Proactive" : "Manual";
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

boot();
