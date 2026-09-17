// Копія перевірки з бекенду (src/services/geo.js): фронтенд не імпортує серверний код
export function isWithinBounds({ lat, lng }, { south, west, north, east }) {
  return lat >= south && lat <= north && lng >= west && lng <= east;
}

export function roundCoord(value) {
  return Math.round(value * 1e5) / 1e5;
}

// На desktop точку перекриває ліва панель (400px + відступ), на mobile — нижня шторка (половина екрана)
export function focusOffset({ isDesktop, height }) {
  return isDesktop ? [-216, 0] : [0, Math.round(height * 0.25)];
}
