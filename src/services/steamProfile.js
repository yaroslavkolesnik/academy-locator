export const STEAM_CODES = Object.freeze(['S', 'T', 'E', 'A', 'M']);

export function emptyProfile() {
  return Object.fromEntries(STEAM_CODES.map((code) => [code, 0]));
}

// Кількість курсів закладу в кожній категорії STEAM — дані для кільця на мітці.
// Якщо курсів немає (свіжа заявка), рахуємо заявлені напрямки.
export function steamProfile({ courses = [], declaredDirectionIds = [], directionsById }) {
  const profile = emptyProfile();
  const directionIds = courses.length > 0 ? courses.map((c) => c.directionId) : declaredDirectionIds;

  for (const id of directionIds) {
    const code = directionsById.get(id)?.categoryCode;
    if (code in profile) profile[code] += 1;
  }
  return profile;
}
