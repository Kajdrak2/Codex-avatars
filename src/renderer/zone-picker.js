'use strict';

const params = new URLSearchParams(location.search);
const french = params.get('language') === 'fr';
const copy = french ? {
  title: 'Sélectionnez la zone des avatars',
  detail: 'Faites glisser pour tracer un rectangle. Entrée confirme, Échap annule.',
  apply: 'Utiliser cette zone',
  cancel: 'Annuler',
  small: 'La zone doit mesurer au moins 160 × 120.',
} : {
  title: 'Select the avatar roaming area',
  detail: 'Drag to draw a rectangle. Enter confirms, Escape cancels.',
  apply: 'Use this area',
  cancel: 'Cancel',
  small: 'The area must be at least 160 × 120.',
};

const selectionElement = document.querySelector('#selection');
const actions = document.querySelector('#actions');
const size = document.querySelector('#size');
const title = document.querySelector('#picker-title');
const detail = document.querySelector('#picker-copy');
title.textContent = copy.title;
detail.textContent = copy.detail;
document.querySelector('#apply').textContent = copy.apply;
document.querySelector('#cancel').textContent = copy.cancel;

let origin = null;
let selection = null;

function normalizedRectangle(start, end) {
  const x = Math.round(Math.min(start.x, end.x));
  const y = Math.round(Math.min(start.y, end.y));
  return {
    x,
    y,
    width: Math.round(Math.max(start.x, end.x) - x),
    height: Math.round(Math.max(start.y, end.y) - y),
  };
}

function render() {
  if (!selection) {
    selectionElement.hidden = true;
    actions.hidden = true;
    return;
  }
  selectionElement.hidden = false;
  selectionElement.style.left = `${selection.x}px`;
  selectionElement.style.top = `${selection.y}px`;
  selectionElement.style.width = `${selection.width}px`;
  selectionElement.style.height = `${selection.height}px`;
  size.textContent = `${selection.width} × ${selection.height}`;
  actions.hidden = origin !== null;
}

function applySelection() {
  if (!selection || selection.width < 160 || selection.height < 120) {
    detail.textContent = copy.small;
    return;
  }
  void window.codexAvatars.completeZoneSelection(selection);
}

window.addEventListener('pointerdown', (event) => {
  if (event.target.closest('button')) return;
  origin = { x: event.clientX, y: event.clientY };
  selection = { x: origin.x, y: origin.y, width: 0, height: 0 };
  detail.textContent = copy.detail;
  document.body.setPointerCapture?.(event.pointerId);
  render();
});

window.addEventListener('pointermove', (event) => {
  if (!origin) return;
  selection = normalizedRectangle(origin, { x: event.clientX, y: event.clientY });
  render();
});

window.addEventListener('pointerup', (event) => {
  if (!origin) return;
  selection = normalizedRectangle(origin, { x: event.clientX, y: event.clientY });
  origin = null;
  render();
  if (selection.width < 160 || selection.height < 120) detail.textContent = copy.small;
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') void window.codexAvatars.cancelZoneSelection();
  if (event.key === 'Enter') applySelection();
});

document.querySelector('#apply').addEventListener('click', applySelection);
document.querySelector('#cancel').addEventListener('click', () => void window.codexAvatars.cancelZoneSelection());
