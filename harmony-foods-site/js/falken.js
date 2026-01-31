(function () {
  const term = document.getElementById("terminal");
  if (!term) return;

  // Only type the text lines (not the menu buttons)
  const lines = [...term.querySelectorAll(".t-line")];
  const menu = term.querySelector(".t-menu");

  // Hide menu at start
  if (menu) {
    menu.style.opacity = "0";
    menu.style.pointerEvents = "none";
    menu.style.transition = "opacity 600ms ease";
  }

  // Store original text
  const textLines = lines.map(el => el.textContent);

  // Clear lines
  lines.forEach(el => el.textContent = "");

  let lineIndex = 0;
  let charIndex = 0;

  const TYPE_SPEED = 38;   // typing speed
  const LINE_PAUSE = 450; // pause between lines

  function typeNextChar() {
    if (lineIndex >= lines.length) {
      // Finished typing — reveal menu
      if (menu) {
        setTimeout(() => {
          menu.style.opacity = "1";
          menu.style.pointerEvents = "auto";
        }, 600);
      }
      return;
    }

    const currentText = textLines[lineIndex];
    const el = lines[lineIndex];

    if (charIndex < currentText.length) {
      el.textContent += currentText.charAt(charIndex);
      charIndex++;
      setTimeout(typeNextChar, TYPE_SPEED);
    } else {
      // finished this line
      charIndex = 0;
      lineIndex++;
      setTimeout(typeNextChar, LINE_PAUSE);
    }
    if (currentText.includes("PROFESSOR FALKEN")) {
      setTimeout(typeNextChar, 1200);
      return;
    }

  }

  typeNextChar();
})();
