import { fromApiFilters } from '../state/filters.js';

export function isSelected(question, answers, optionId) {
  const answer = answers[question.id];
  return question.type === 'multi' ? (answer ?? []).includes(optionId) : answer === optionId;
}

export function toggleAnswer(question, answers, optionId) {
  if (question.type !== 'multi') return { ...answers, [question.id]: optionId };
  const current = answers[question.id] ?? [];
  const next = current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId];
  return { ...answers, [question.id]: next };
}

export function isAnswered(question, answers) {
  if (!question.required) return true;
  const answer = answers[question.id];
  return Array.isArray(answer) ? answer.length > 0 : Boolean(answer);
}

// Значення обраних варіантів зливаються в тіло POST /api/recommendations
export function buildRecommendationInput(quiz, answers, coords) {
  const input = { interests: [], format: [], price: 'any' };
  let wantsLocation = false;

  for (const question of quiz.questions) {
    const selected = [answers[question.id]].flat().filter(Boolean);
    for (const optionId of selected) {
      const option = question.options.find((o) => o.id === optionId);
      if (!option) continue;
      const { interests, useLocation, ...rest } = option.value;
      if (interests) input.interests.push(...interests);
      if (useLocation) wantsLocation = true;
      Object.assign(input, rest);
    }
  }

  input.interests = [...new Set(input.interests)];
  if (wantsLocation && coords) {
    input.lat = coords.lat;
    input.lng = coords.lng;
  }
  return { input, wantsLocation };
}

// Фільтри для «Показати на карті». Сервер кладе у filters лише обрані інтереси, а рекомендації
// можуть бути зі спорідненого напрямку тієї ж категорії — додаємо їхні напрямки, щоб кожен курс лишився на карті.
export function resultMapFilters(result, meta, coords) {
  const filters = { ...fromApiFilters(result.filters, meta), near: Boolean(coords) };
  if (filters.direction.length > 0) {
    const recommended = result.items.map((item) => item.direction.slug);
    filters.direction = [...new Set([...filters.direction, ...recommended])];
  }
  return filters;
}
