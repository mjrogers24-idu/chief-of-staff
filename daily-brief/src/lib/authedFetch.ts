"use client";

import type { User } from "firebase/auth";

export async function authedFetch(user: User, path: string, init?: RequestInit) {
  const idToken = await user.getIdToken();
  return fetch(path, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${idToken}`,
    },
  });
}
