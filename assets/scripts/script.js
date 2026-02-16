const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();
const audioBuffers = {};
let currentVersion = 6;
let bgmSource = null;
let isStarted = false;

const activeSources = new Set();

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

function playSound(name, loop = false) {
  if (!audioBuffers[name]) return null;

  const source = audioCtx.createBufferSource();
  source.buffer = audioBuffers[name];
  source.connect(audioCtx.destination);
  source.loop = loop;

  source.soundName = name;

  activeSources.add(source);

  source.onended = () => {
    activeSources.delete(source);

    if (name.startsWith("chosen") && !source.interrupted) {
      document.getElementById("intro-overlay").classList.remove("active");
      playBGM(currentVersion);
    }
  };

  source.start(0);
  return source;
}

function stopAllSounds() {
  activeSources.forEach((source) => {
    source.interrupted = true;
    try {
      source.stop();
    } catch (e) {}
  });
  activeSources.clear();
  bgmSource = null;
}

function playBGM(version) {
  if (bgmSource) {
    bgmSource.interrupted = true;
    bgmSource.stop();
  }
  bgmSource = playSound(`select-${version}`, true);
}

function unlockAudio() {
  if (isStarted) return;
  isStarted = true;

  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  playBGM(currentVersion);
}

// 6.5 Handle the Start Screen (Click Anywhere)
function startGame() {
  // If we already started, ignore this
  if (document.body.classList.contains("is-started")) return;

  // Wake up the audio and play the background music
  unlockAudio();

  // Reveal the rest of the site!
  document.body.classList.add("is-started");

  // Play the 'click' confirm sound!
  playSound("click");
}

// Listen for a click/tap ANYWHERE on the window
window.addEventListener("pointerdown", startGame, { once: true });

// Optional: Also allow them to press 'Enter', 'Space', or any key to start
window.addEventListener("keydown", (e) => {
  if (!document.body.classList.contains("is-started")) {
    startGame();
  }
});

// 8. Handle Boss Cell Interactions
const bossCells = document.querySelectorAll(
  ".boss-cell:not(.center-character)",
);

// NEW: Keep track of which cell is currently "hovered" on mobile
let currentMobileHover = null;

bossCells.forEach((cell) => {
  // Handle Desktop Hovering
  cell.addEventListener("pointerenter", (e) => {
    // ONLY play the hover sound if they are using a physical mouse.
    // Touch screens fire this right before a click, which causes double audio.
    if (isStarted && e.pointerType === "mouse") {
      playSound("hover");
    }
  });

  // Handle Clicking & Tapping
  cell.addEventListener("click", (e) => {
    if (!isStarted) unlockAudio();

    // --- NEW: MOBILE TOUCH INTERCEPT ---
    // Check if the user is on a touch device (coarse pointer)
    if (window.matchMedia("(pointer: coarse)").matches) {
      // If they tapped a cell that isn't currently "hovered"
      if (currentMobileHover !== cell) {
        // Remove the visual hover state from any previously tapped cell
        bossCells.forEach((c) => c.classList.remove("mobile-hover-active"));

        // Set this new cell as the active hover
        currentMobileHover = cell;
        cell.classList.add("mobile-hover-active");

        // Play the hover sound and STOP. Do not trigger the boss intro yet!
        playSound("hover");
        return;
      }
    }

    // --- NORMAL CLICK LOGIC ---
    // If we reach here, it's either a desktop click, OR the second tap on mobile!

    // Clean up the mobile hover tracker
    currentMobileHover = null;
    cell.classList.remove("mobile-hover-active");

    // Stop previous music
    activeSources.forEach((source) => {
      if (
        source.soundName.startsWith("select") ||
        source.soundName.startsWith("chosen")
      ) {
        source.interrupted = true;
        source.stop();
      }
    });

    // Grab the Boss Image
    const bossImg = cell.querySelector("img");

    // Find the boss name exactly 7 DOM nodes forward
    const parentContainer = cell.parentElement;
    const allCells = Array.from(parentContainer.children);
    const clickedIndex = allCells.indexOf(cell);
    const nameCell = allCells[clickedIndex + 7];

    if (bossImg) {
      document.getElementById("intro-boss-sprite").src = bossImg.src;

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

// Optional: If they tap the center character or empty space on mobile, clear the hover
document.addEventListener("click", (e) => {
  if (window.matchMedia("(pointer: coarse)").matches && currentMobileHover) {
    if (!e.target.closest(".boss-cell:not(.center-character)")) {
      bossCells.forEach((c) => c.classList.remove("mobile-hover-active"));
      currentMobileHover = null;
    }
  }
});

// --- Track Changing Logic & UI Sync ---
const ostButtons = document.querySelectorAll(".ost-btn");

function changeTrack(newVersion) {
  if (newVersion === currentVersion) return;

  currentVersion = newVersion;

  // Update the UI visually
  ostButtons.forEach((btn) => {
    if (parseInt(btn.dataset.track) === currentVersion) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  // Switch the audio
  if (isStarted) {
    playSound("click"); // Satisfying tick when changing tracks
    stopAllSounds();
    playBGM(currentVersion);
  }
}

// Update your keyboard listener to use the new helper function
window.addEventListener("keydown", (e) => {
  const key = parseInt(e.key);
  if (key >= 1 && key <= 6) {
    changeTrack(key);
  }
});

// Make the floating UI clickable
ostButtons.forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.stopPropagation(); // Prevents accidental double-clicks on the window
    const clickedVersion = parseInt(btn.dataset.track);
    changeTrack(clickedVersion);
  });
});
