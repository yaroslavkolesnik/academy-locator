const STORAGE_KEY = 'academy-locator-admin-token';

// sessionStorage: токен живе до закриття вкладки. У приватному режимі сховище може бути недоступне.
export function readToken() {
  try {
    return sessionStorage.getItem(STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

export function saveToken(token) {
  try {
    sessionStorage.setItem(STORAGE_KEY, token);
  } catch {
    // токен лишиться лише в пам'яті сторінки
  }
}

export function clearToken() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // нічого очищати
  }
}

export function adminHeaders(token) {
  return { 'X-Admin-Token': token };
}
