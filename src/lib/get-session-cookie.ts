'use server';

import { cookies } from 'next/headers';

export async function getSessionCookie() {
  const cookieStore = await cookies();
  const cookie = cookieStore.get('__session')?.value;
  return cookie || null;
}
