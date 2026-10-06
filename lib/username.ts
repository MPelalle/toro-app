export const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,20}$/;
export const USERNAME_HINT = "Usá de 3 a 20 caracteres: letras, números, punto, guion o guion bajo.";

/** The public handle is case-insensitive and never contains leading @ or spaces. */
export function normalizeUsername(value: string) {
  return value.trim().replace(/^@+/, "").toLocaleLowerCase();
}

export function validateUsername(value: string) {
  const username = normalizeUsername(value);
  return USERNAME_PATTERN.test(username) ? username : null;
}
