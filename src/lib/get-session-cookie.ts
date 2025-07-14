'use server';

import { cookies } from 'next/headers';

export async function getSessionCookie() {
  const cookie = cookies().get('__session')?.value;
  return cookie || null;
}
