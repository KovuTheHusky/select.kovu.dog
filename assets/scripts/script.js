// 1. Setup AudioContext and State
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();
const audioBuffers = {};
let currentVersion = 6;
let bgmSource = null;
let isStarted = false;

// NEW: A Set to track every single sound currently playing
const activeSources = new Set();

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

// 3. Pre-load and decode all audio instantly
async function loadAudio() {
  const loadPromises = audioFiles.map(async (fileName) => {
    try {
      const response = await fetch(`assets/sounds/${fileName}.flac`);
      const arrayBuffer = await response.arrayBuffer();
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

  const source = audioCtx.createBufferSource();
  source.buffer = audioBuffers[name];
  source.connect(audioCtx.destination);
  source.loop = loop;

  // Tag the source with its name so we can identify it later
  source.soundName = name;

  // Add it to our active tracking Set
  activeSources.add(source);

  // NEW: When the sound finishes...
  source.onended = () => {
    activeSources.delete(source); // Clean up the tracker

    // If it was the "chosen" jingle and it wasn't interrupted by the user...
    if (name.startsWith("chosen") && !source.interrupted) {
      document.getElementById("intro-overlay").classList.remove("active");
      playBGM(currentVersion); // Resume the background music!
    }
  };

  source.start(0);
  return source;
}

// NEW: Helper function to abruptly kill all playing audio
function stopAllSounds() {
  activeSources.forEach((source) => {
    source.interrupted = true; // Flag it so onended doesn't trigger the BGM loop
    try {
      source.stop();
    } catch (e) {} // Catch safely in case it ended a millisecond ago
  });
  activeSources.clear();
  bgmSource = null;
}

// 5. Function to handle Background Music switching
function playBGM(version) {
  // If we just want to restart BGM, kill the old one first
  if (bgmSource) {
    bgmSource.interrupted = true;
    bgmSource.stop();
  }
  bgmSource = playSound(`select-${version}`, true);
}

// 6. Unlock Audio (Browser Autoplay Workaround)
function unlockAudio() {
  if (isStarted) return;
  isStarted = true;

  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  playBGM(currentVersion);
}

window.addEventListener("pointerdown", unlockAudio, { once: true });
window.addEventListener("keydown", unlockAudio, { once: true });

// 7. Handle Keyboard Version Switching (1-6)
window.addEventListener("keydown", (e) => {
  const key = parseInt(e.key);

  if (key >= 1 && key <= 6 && key !== currentVersion) {
    currentVersion = key;

    if (isStarted) {
      // NEW: Force hide the overlay if they change tracks mid-animation
      document.getElementById("intro-overlay").classList.remove("active");

      stopAllSounds();
      playBGM(currentVersion);
    }
  }
});

// 8. Handle Boss Cell Interactions
const bossCells = document.querySelectorAll(
  ".boss-cell:not(.center-character)",
);

bossCells.forEach((cell) => {
  cell.addEventListener("mouseenter", () => {
    if (isStarted) playSound("hover");
  });

  cell.addEventListener("click", () => {
    if (!isStarted) unlockAudio();

    activeSources.forEach((source) => {
      if (
        source.soundName.startsWith("select") ||
        source.soundName.startsWith("chosen")
      ) {
        source.interrupted = true;
        source.stop();
      }
    });

    // Grabbing the Boss Image
    const bossImg = cell.querySelector("img");

    // NEW: Finding the boss name exactly 7 DOM nodes forward
    const parentContainer = cell.parentElement;
    const allCells = Array.from(parentContainer.children);
    const clickedIndex = allCells.indexOf(cell);
    const nameCell = allCells[clickedIndex + 7];

    if (bossImg) {
      document.getElementById("intro-boss-sprite").src = bossImg.src;

      // If we found the text cell, inject its exact text into the overlay
      if (nameCell) {
        document.getElementById("intro-boss-name").textContent =
          nameCell.textContent;
      }

      document.getElementById("intro-overlay").classList.add("active");
    }

    playSound("click");
    playSound(`chosen-${currentVersion}`);
  });
});
