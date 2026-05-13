export async function generateUniqueUsername(
  baseUsername: string,
  isExisting: (username: string) => Promise<boolean>,
) {
  const normalizedBase =
    baseUsername.toLowerCase().replace(/[^a-z0-9_]/g, '') || 'user';
  let candidate = normalizedBase;
  let suffix = 0;
  while (await isExisting(candidate)) {
    suffix += 1;
    candidate = `${normalizedBase}${suffix}`;
  }
  return candidate;
}
