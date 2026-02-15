// 1. Setup AudioContext and State
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();
const audioBuffers = {}; // We will cache the decoded audio here
let currentVersion = 6; // Default to Mega Man 6
let bgmSource = null; // Keeps track of the looping music
let isStarted = false; // Tracks if the user has interacted yet

// 2. Define all required files
const audioFiles = [
  "click",
  "hover",
  "chosen-1",
  "chosen-2",
  "chosen-3",
  "chosen-4",
  "chosen-5",
  "chosen-6",
  "select-1",
  "select-2",
  "select-3",
  "select-4",
  "select-5",
  "select-6",
];

// 3. Pre-load and decode all audio instantly in the background
async function loadAudio() {
  const loadPromises = audioFiles.map(async (fileName) => {
    try {
      const response = await fetch(`assets/sounds/${fileName}.flac`);
      const arrayBuffer = await response.arrayBuffer();
      // Decode the audio data so it's ready for instant playback
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      audioBuffers[fileName] = audioBuffer;
    } catch (err) {
      console.error(`Failed to load ${fileName}.flac`, err);
    }
  });
  await Promise.all(loadPromises);
}
loadAudio();

// 4. Helper function to play a sound instantly
function playSound(name, loop = false) {
  if (!audioBuffers[name]) return null;

  // AudioBufferSourceNodes are one-time use. We create a new one for every sound.
  // This is what allows for perfect, overlapping rapid-fire hover sounds!
  const source = audioCtx.createBufferSource();
  source.buffer = audioBuffers[name];
  source.connect(audioCtx.destination);
  source.loop = loop;
  source.start(0);
  return source;
}

// 5. Function to handle Background Music switching
function playBGM(version) {
  if (bgmSource) {
    bgmSource.stop(); // Stop the previous track
  }
  bgmSource = playSound(`select-${version}`, true);
}

// 6. Unlock Audio (Browser Autoplay Workaround)
function unlockAudio() {
  if (isStarted) return;
  isStarted = true;

  // Wake up the audio context
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  // Start the music!
  playBGM(currentVersion);
}

// Listen for the absolute first interaction to unlock audio
window.addEventListener("pointerdown", unlockAudio, { once: true });
window.addEventListener("keydown", unlockAudio, { once: true });

// 7. Handle Keyboard Version Switching (1-6)
window.addEventListener("keydown", (e) => {
  const key = parseInt(e.key);
  // Check if they pressed a number between 1 and 6
  if (key >= 1 && key <= 6) {
    currentVersion = key;
    // If audio is already running, switch the background music seamlessly
    if (isStarted) {
      playBGM(currentVersion);
    }
  }
});

// 8. Handle Boss Cell Interactions
// We select everything EXCEPT the center character
const bossCells = document.querySelectorAll(
  ".boss-cell:not(.center-character)",
);

bossCells.forEach((cell) => {
  // Hover effect
  cell.addEventListener("mouseenter", () => {
    if (isStarted) playSound("hover");
  });

  // Click effect
  cell.addEventListener("click", () => {
    if (!isStarted) unlockAudio(); // Safety fallback

    playSound("click");

    // Stop the looping select music and play the chosen jingle
    if (bgmSource) {
      bgmSource.stop();
    }
    playSound(`chosen-${currentVersion}`);

    // Optional: Add a visual class here to flash the screen or animate the boss!
  });
});
