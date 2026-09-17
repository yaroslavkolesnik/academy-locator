import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { vi } from 'vitest';
import { buildMetaIndex, MetaContext } from '../state/MetaProvider.jsx';
import { ToastProvider } from '../ui/Toast.jsx';

// Відповідь GET /api/meta (напрямки скорочено; значення як у data/seed)
export const metaFixture = {
  city: {
    id: 'kharkiv',
    name: 'Харків',
    center: { lat: 49.9935, lng: 36.2304 },
    zoom: 13,
    bounds: { south: 49.88, west: 36.1, north: 50.1, east: 36.46 },
  },
  categories: [
    { code: 'S', name: 'Наука', nameEn: 'Science', color: '#16A34A', icon: 'flask-conical' },
    { code: 'T', name: 'Технології', nameEn: 'Technology', color: '#2563EB', icon: 'cpu' },
    { code: 'E', name: 'Інженерія', nameEn: 'Engineering', color: '#EA580C', icon: 'cog' },
    { code: 'A', name: 'Мистецтво', nameEn: 'Arts', color: '#DB2777', icon: 'palette' },
    { code: 'M', name: 'Математика', nameEn: 'Mathematics', color: '#7C3AED', icon: 'sigma' },
  ],
  directions: [
    { id: 'robotics', slug: 'robotics', name: 'Робототехніка', categoryCode: 'T', keywords: ['arduino'] },
    { id: 'programming', slug: 'programming', name: 'Програмування', categoryCode: 'T', keywords: ['python'] },
    { id: '3d-modeling', slug: '3d-modeling', name: '3D-моделювання та друк', categoryCode: 'E', keywords: ['3d'] },
    { id: 'animation', slug: 'animation', name: 'Анімація', categoryCode: 'A', keywords: [] },
    { id: 'astronomy', slug: 'astronomy', name: 'Астрономія', categoryCode: 'S', keywords: [] },
  ],
  institutionTypes: [
    { id: 'university', name: 'Університет' },
    { id: 'academy', name: 'Академія' },
    { id: 'private_school', name: 'Приватна школа' },
    { id: 'center', name: 'Освітній центр' },
  ],
  formats: [
    { id: 'offline', name: 'Офлайн' },
    { id: 'online', name: 'Онлайн' },
    { id: 'hybrid', name: 'Гібрид' },
  ],
  ageGroups: [
    { id: '6-9', ageFrom: 6, ageTo: 9, name: '6–9 років' },
    { id: '10-13', ageFrom: 10, ageTo: 13, name: '10–13 років' },
    { id: '14-17', ageFrom: 14, ageTo: 17, name: '14–17 років' },
    { id: '18+', ageFrom: 18, ageTo: 99, name: '18+ років' },
  ],
  levels: [
    { id: 'beginner', name: 'Початковий' },
    { id: 'intermediate', name: 'Середній' },
    { id: 'advanced', name: 'Просунутий' },
  ],
  priceOptions: [
    { id: 'free', name: 'Безкоштовно' },
    { id: 'paid', name: 'Платно' },
  ],
  dataNotice: 'Заклади реальні; курси, розклади, ціни та кількість місць є демонстраційними.',
};

const jsonResponse = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

// routes: { '/api/prefix': body | (url, init) => ({ status, body }) }; найдовший префікс має пріоритет
export function mockFetch(routes = {}) {
  const table = Object.entries({ '/api/meta': metaFixture, ...routes }).sort(([a], [b]) => b.length - a.length);
  const fetchMock = vi.fn(async (url, init = {}) => {
    const path = String(url);
    const entry = table.find(([prefix]) => path.startsWith(prefix));
    if (!entry) return jsonResponse(404, { error: { code: 'NOT_FOUND', message: 'Маршрут не знайдено' } });
    const [, handler] = entry;
    if (typeof handler !== 'function') return jsonResponse(200, handler);
    const { status = 200, body } = await handler(path, init);
    return jsonResponse(status, body);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

export function renderWithProviders(ui, { route = '/', path, meta = metaFixture } = {}) {
  const content = path ? (
    <Routes>
      <Route path={path} element={ui} />
    </Routes>
  ) : (
    ui
  );
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ToastProvider>
        <MetaContext.Provider value={buildMetaIndex(meta)}>{content}</MetaContext.Provider>
      </ToastProvider>
    </MemoryRouter>,
  );
}

export const markersFixture = {
  summary: { institutions: 3, courses: 8 },
  items: [
    {
      id: 'khpi',
      name: 'Національний технічний університет «Харківський політехнічний інститут»',
      shortName: 'НТУ «ХПІ»',
      type: 'university',
      lat: 49.9989798,
      lng: 36.2483061,
      address: 'вул. Кирпичова, 2, Харків, 61002',
      status: 'approved',
      courseCount: 4,
      matchedCourseCount: 4,
      steamProfile: { S: 0, T: 2, E: 2, A: 0, M: 0 },
      distanceKm: null,
    },
    {
      id: 'kh-palace',
      name: 'Харківський обласний Палац дитячої та юнацької творчості',
      shortName: 'Палац дитячої та юнацької творчості',
      type: 'center',
      lat: 50.003594,
      lng: 36.2346559,
      address: 'вул. Сумська, 37, Харків, 61022',
      status: 'approved',
      courseCount: 3,
      matchedCourseCount: 3,
      steamProfile: { S: 1, T: 1, E: 0, A: 1, M: 0 },
      distanceKm: null,
    },
    {
      id: '5c0f6a1e-1111-4222-8333-944455556666',
      name: 'Школа робототехніки «Кібер»',
      shortName: 'Школа робототехніки «Кібер»',
      type: 'private_school',
      lat: 50.0021,
      lng: 36.2445,
      address: 'вул. Пушкінська, 50, Харків',
      status: 'pending',
      courseCount: 0,
      matchedCourseCount: 0,
      steamProfile: { S: 0, T: 1, E: 0, A: 0, M: 0 },
      distanceKm: null,
    },
  ],
};

export const institutionCardFixture = {
  institution: {
    id: 'khpi',
    name: 'Національний технічний університет «Харківський політехнічний інститут»',
    shortName: 'НТУ «ХПІ»',
    type: 'university',
    shortDescription: 'Провідний технічний університет Харкова: інженерія, енергетика, комп’ютерні науки та робототехніка.',
    description: 'Один із найстаріших технічних університетів України, заснований у 1885 році.',
    logoUrl: null,
    address: 'вул. Кирпичова, 2, Харків, 61002',
    city: 'kharkiv',
    lat: 49.9989798,
    lng: 36.2483061,
    website: 'https://www.kpi.kharkov.ua',
    phone: null,
    email: null,
    hasShelter: null,
    declaredDirectionIds: [],
    status: 'approved',
    source: 'seed',
    createdAt: '2026-09-17T00:00:00.000Z',
    courseCount: 4,
    steamProfile: { S: 0, T: 2, E: 2, A: 0, M: 0 },
  },
  directions: [
    { slug: 'programming', name: 'Програмування', categoryCode: 'T', courseCount: 1, matchedCourseCount: 1 },
    { slug: 'robotics', name: 'Робототехніка', categoryCode: 'T', courseCount: 1, matchedCourseCount: 0 },
    { slug: '3d-modeling', name: '3D-моделювання та друк', categoryCode: 'E', courseCount: 1, matchedCourseCount: 0 },
    { slug: 'electronics', name: 'Електроніка', categoryCode: 'E', courseCount: 1, matchedCourseCount: 1 },
  ],
};

export const directionCoursesFixture = {
  institution: { id: 'itstep-kharkiv', name: 'Комп’ютерна Академія ITSTEP, Харків', shortName: 'ITSTEP Академія' },
  direction: { slug: 'game-dev', name: 'Розробка ігор', categoryCode: 'T' },
  items: [
    {
      id: 'itstep-unity-3d',
      title: 'Unity: створення 3D-ігор',
      shortDescription: 'Від ідеї до власної 3D-гри на рушії Unity та C#.',
      ageMin: 12,
      ageMax: 16,
      level: 'intermediate',
      format: 'online',
      price: 1900,
      priceUnit: 'month',
      durationText: '6 місяців, 2 заняття на тиждень',
      scheduleText: 'Вівторок і четвер, 17:00–18:30',
      startDate: '2026-10-06',
      seatsTotal: null,
      seatsLeft: null,
      matchesFilters: true,
    },
    {
      id: 'itstep-scratch',
      title: 'Scratch: перші ігри',
      shortDescription: 'Програмуємо ігри та анімації з візуальних блоків.',
      ageMin: 8,
      ageMax: 11,
      level: 'beginner',
      format: 'hybrid',
      price: 1600,
      priceUnit: 'month',
      durationText: '4 місяці, 1 заняття на тиждень',
      scheduleText: 'Неділя, 10:00–11:30',
      startDate: '2026-10-04',
      seatsTotal: 10,
      seatsLeft: 4,
      matchesFilters: false,
    },
  ],
};

export const courseDetailsFixture = {
  course: {
    id: 'khpi-robotics-arduino',
    institutionId: 'khpi',
    directionId: 'robotics',
    title: 'Робототехніка на Arduino',
    shortDescription: 'Збираємо та програмуємо власних роботів на Arduino.',
    description: 'Датчики, сервоприводи, двигуни та основи C++ для мікроконтролерів.',
    audience: 'Школярі, які вже пробували конструювати і хочуть програмувати «залізо»',
    ageMin: 11,
    ageMax: 16,
    level: 'beginner',
    format: 'offline',
    price: 1200,
    priceUnit: 'month',
    durationText: '5 місяців, 1 заняття на тиждень',
    scheduleText: 'Субота, 12:00–14:00',
    scheduleDays: ['sat'],
    startDate: '2026-10-03',
    language: 'uk',
    seatsTotal: 12,
    seatsLeft: 3,
  },
  institution: {
    id: 'khpi',
    name: 'Національний технічний університет «Харківський політехнічний інститут»',
    shortName: 'НТУ «ХПІ»',
    type: 'university',
    address: 'вул. Кирпичова, 2, Харків, 61002',
    lat: 49.9989798,
    lng: 36.2483061,
    website: 'https://www.kpi.kharkov.ua',
    phone: null,
    email: null,
    status: 'approved',
  },
  direction: { slug: 'robotics', name: 'Робототехніка', categoryCode: 'T' },
  category: { code: 'T', name: 'Технології', color: '#2563EB' },
};

export const quizFixture = {
  id: 'what-to-choose',
  title: 'Що обрати дитині?',
  subtitle: '5 коротких запитань — і ми покажемо 3 найкращі варіанти на карті.',
  questions: [
    {
      id: 'age',
      title: 'Скільки років учасникові?',
      type: 'single',
      required: true,
      options: [
        { id: 'age-6-9', label: '6–9 років', value: { age: 8 } },
        { id: 'age-10-13', label: '10–13 років', value: { age: 11 } },
        { id: 'age-14-17', label: '14–17 років', value: { age: 15 } },
        { id: 'age-18-plus', label: '18+ років', value: { age: 25 } },
      ],
    },
    {
      id: 'interests',
      title: 'Що найбільше подобається робити?',
      subtitle: 'Можна обрати кілька варіантів.',
      type: 'multi',
      required: true,
      options: [
        { id: 'build', label: 'Будувати й конструювати', value: { interests: ['robotics', '3d-modeling', 'electronics'] } },
        { id: 'code', label: 'Створювати ігри та програми', value: { interests: ['programming', 'game-dev'] } },
        { id: 'draw', label: 'Малювати й оживляти персонажів', value: { interests: ['digital-design', 'animation'] } },
      ],
    },
    {
      id: 'format',
      title: 'Який формат занять зручніший?',
      type: 'single',
      required: true,
      options: [
        { id: 'format-offline', label: 'Наживо, в класі', value: { format: ['offline', 'hybrid'] } },
        { id: 'format-online', label: 'Онлайн з дому', value: { format: ['online', 'hybrid'] } },
        { id: 'format-any', label: 'Не важливо', value: { format: [] } },
      ],
    },
    {
      id: 'price',
      title: 'Розглядаєте платні заняття?',
      type: 'single',
      required: true,
      options: [
        { id: 'price-free', label: 'Лише безкоштовні', value: { price: 'free' } },
        { id: 'price-any', label: 'Підійдуть і платні', value: { price: 'any' } },
      ],
    },
    {
      id: 'distance',
      title: 'Чи важливо, щоб заклад був поруч?',
      type: 'single',
      required: false,
      options: [
        { id: 'distance-near', label: 'Так, шукати біля мене', value: { useLocation: true } },
        { id: 'distance-any', label: 'Не важливо', value: { useLocation: false } },
      ],
    },
  ],
};

export const recommendationsFixture = {
  filters: { ageFrom: 11, ageTo: 11, direction: ['robotics', '3d-modeling', 'electronics'], format: ['offline', 'hybrid'] },
  items: [
    {
      course: {
        id: 'khpi-robotics-arduino',
        title: 'Робототехніка на Arduino',
        shortDescription: 'Збираємо та програмуємо власних роботів на Arduino.',
        ageMin: 11,
        ageMax: 16,
        level: 'beginner',
        format: 'offline',
        price: 1200,
        priceUnit: 'month',
        durationText: '5 місяців, 1 заняття на тиждень',
        scheduleText: 'Субота, 12:00–14:00',
        startDate: '2026-10-03',
        seatsTotal: 12,
        seatsLeft: 3,
      },
      institution: { id: 'khpi', name: 'НТУ «ХПІ»', shortName: 'НТУ «ХПІ»', lat: 49.9989798, lng: 36.2483061 },
      direction: { slug: 'robotics', name: 'Робототехніка', categoryCode: 'T' },
      score: 1,
      reasons: ['Підходить за віком (11–16 років)', 'Ваш інтерес: Робототехніка', 'Формат: офлайн'],
      distanceKm: null,
    },
    {
      course: {
        id: 'itstep-scratch',
        title: 'Scratch: перші ігри',
        shortDescription: 'Програмуємо ігри та анімації з візуальних блоків.',
        ageMin: 8,
        ageMax: 11,
        level: 'beginner',
        format: 'hybrid',
        price: 1600,
        priceUnit: 'month',
        durationText: '4 місяці, 1 заняття на тиждень',
        scheduleText: 'Неділя, 10:00–11:30',
        startDate: '2026-10-04',
        seatsTotal: 10,
        seatsLeft: 4,
      },
      institution: { id: 'itstep-kharkiv', name: 'ITSTEP', shortName: 'ITSTEP Академія', lat: 50.0045811, lng: 36.2568894 },
      direction: { slug: 'game-dev', name: 'Розробка ігор', categoryCode: 'T' },
      score: 0.69,
      reasons: ['Підходить за віком (8–11 років)', 'Схожий напрям: Розробка ігор', 'Формат: гібрид'],
      distanceKm: null,
    },
  ],
};
