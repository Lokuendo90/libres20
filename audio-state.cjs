'use strict';

// Electron expone audible en el objeto Event. Se aceptan también firmas alternativas
// para tolerar versiones y mocks antiguos sin provocar una excepción en el proceso principal.
function readAudibleState(event, legacyAudible, getCurrent) {
  if (typeof event?.audible === 'boolean') return event.audible;
  if (typeof legacyAudible === 'boolean') return legacyAudible;
  if (typeof getCurrent === 'function') {
    try {
      const current = getCurrent();
      if (typeof current === 'boolean') return current;
    } catch {
      // No interrumpir la navegación por un fallo al consultar el estado de audio.
    }
  }
  return null;
}

function attachAudioStateListener(webContents, tab, send) {
  const listener = (event, legacyAudible) => {
    const audible = readAudibleState(event, legacyAudible, () =>
      typeof webContents.isCurrentlyAudible === 'function'
        ? webContents.isCurrentlyAudible()
        : undefined
    );
    // Si Electron no proporciona el estado, conservar el último valor conocido.
    if (typeof audible === 'boolean') tab.audible = audible;
    send();
  };
  webContents.on('audio-state-changed', listener);
  return () => webContents.removeListener?.('audio-state-changed', listener);
}

module.exports = { readAudibleState, attachAudioStateListener };
