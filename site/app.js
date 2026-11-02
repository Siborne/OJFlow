const paletteMap = {
  ocean: { primary: '#087f8c', accent: '#e2754b', paper: '#edf7f8' },
  ember: { primary: '#c6532c', accent: '#168a91', paper: '#fbf3ed' },
  forest: { primary: '#3f7a42', accent: '#a96618', paper: '#eef5e9' },
  berry: { primary: '#b5385d', accent: '#cb6a57', paper: '#f9edf1' },
  sky: { primary: '#2563eb', accent: '#0891b2', paper: '#edf4ff' },
  sand: { primary: '#a96618', accent: '#0f766e', paper: '#faf2e1' },
  ink: { primary: '#475569', accent: '#0e7490', paper: '#eff3f6' },
};

const root = document.documentElement;
const preview = document.querySelector('#theme-preview');
const schemeButtons = [...document.querySelectorAll('[data-scheme]')];
const surfaceButtons = [...document.querySelectorAll('[data-surface]')];

function applyScheme(name) {
  const palette = paletteMap[name] ?? paletteMap.ocean;
  root.style.setProperty('--primary', palette.primary);
  root.style.setProperty('--primary-deep', palette.primary);
  root.style.setProperty('--accent', palette.accent);
  root.style.setProperty('--paper', palette.paper);
  preview?.style.setProperty('--theme-primary', palette.primary);
  preview?.style.setProperty('--theme-paper', palette.paper);
  schemeButtons.forEach(button =>
    button.classList.toggle('active', button.dataset.scheme === name),
  );
}

function applySurface(name) {
  document.body.dataset.surface = name;
  surfaceButtons.forEach(button =>
    button.classList.toggle('active', button.dataset.surface === name),
  );
}

schemeButtons.forEach(button => {
  button.addEventListener('click', () => applyScheme(button.dataset.scheme));
});

surfaceButtons.forEach(button => {
  button.addEventListener('click', () => applySurface(button.dataset.surface));
});

const year = document.querySelector('#year');
if (year) year.textContent = String(new Date().getFullYear());

applyScheme('ocean');
applySurface('glass');
