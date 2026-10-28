import prisma from "@/lib/prisma";

// Klien Google Calendar API via fetch (tanpa dependency baru).
// Token OAuth disimpan oleh Better Auth pada tabel Account; token tidak
// pernah dikirim ke client dan tidak ditulis ke log (PRD §11, §13).
// Fungsi ini melempar Error dengan pesan yang aman ditampilkan ke pengguna.

function sanitizeErrorMessage(message: string): string {
  // Jangan pernah membocorkan token/secret yang mungkin ada di pesan error.
  return message.replace(/[A-Za-z0-9\-_]{20,}/g, "[disembunyikan]").slice(0, 300);
}

export async function getGoogleAccessToken(userId: string): Promise<string> {
  const account = await prisma.account.findFirst({
    where: { userId, providerId: "google" },
  });
  if (!account) {
    throw new Error("Akun Google belum terhubung. Hubungkan dulu di halaman Kalender.");
  }
  const expiresAt = account.accessTokenExpiresAt ?? account.expiresAt;
  if (account.accessToken && expiresAt && expiresAt.getTime() > Date.now() + 60000) {
    return account.accessToken;
  }
  if (!account.refreshToken) {
    throw new Error(
      "Sesi Google kedaluwarsa dan tidak ada refresh token. Putuskan lalu hubungkan ulang Google.",
    );
  }
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      refresh_token: account.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    throw new Error(
      "Gagal memperbarui token Google. Putuskan lalu hubungkan ulang Google.",
    );
  }
  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };
  await prisma.account.update({
    where: { id: account.id },
    data: {
      accessToken: data.access_token,
      accessTokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
    },
  });
  return data.access_token;
}

async function googleFetch(
  userId: string,
  path: string,
  init?: RequestInit,
): Promise<unknown> {
  const token = await getGoogleAccessToken(userId);
  const res = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let detail = "";
    try {
      const body = (await res.json()) as { error?: { message?: string } };
      detail = body.error?.message ?? "";
    } catch {
      detail = "";
    }
    throw new Error(
      sanitizeErrorMessage(
        `Google Calendar menolak permintaan (${res.status})${detail ? `: ${detail}` : ""}`,
      ),
    );
  }
  if (res.status === 204) return null;
  return res.json();
}

export type GoogleCalendarSummary = {
  id: string;
  summary: string;
  primary: boolean;
};

export async function listGoogleCalendars(
  userId: string,
): Promise<GoogleCalendarSummary[]> {
  const data = (await googleFetch(userId, "/users/me/calendarList")) as {
    items?: Array<{ id: string; summary?: string; primary?: boolean }>;
  };
  return (data.items ?? []).map((c) => ({
    id: c.id,
    summary: c.summary ?? c.id,
    primary: c.primary ?? false,
  }));
}

export type CalendarEventInput = {
  summary: string;
  description?: string;
  startAt: Date;
  endAt: Date;
  timeZone: string;
  reminderMinutes: number;
};

export async function createGoogleEvent(
  userId: string,
  calendarId: string,
  input: CalendarEventInput,
): Promise<string> {
  const data = (await googleFetch(
    userId,
    `/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      body: JSON.stringify({
        summary: input.summary,
        description: input.description ?? "",
        start: { dateTime: input.startAt.toISOString(), timeZone: input.timeZone },
        end: { dateTime: input.endAt.toISOString(), timeZone: input.timeZone },
        reminders: {
          useDefault: false,
          overrides: [{ method: "popup", minutes: input.reminderMinutes }],
        },
      }),
    },
  )) as { id: string };
  return data.id;
}

export async function updateGoogleEvent(
  userId: string,
  calendarId: string,
  externalEventId: string,
  input: CalendarEventInput,
): Promise<void> {
  await googleFetch(
    userId,
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(externalEventId)}`,
    {
      method: "PUT",
      body: JSON.stringify({
        summary: input.summary,
        description: input.description ?? "",
        start: { dateTime: input.startAt.toISOString(), timeZone: input.timeZone },
        end: { dateTime: input.endAt.toISOString(), timeZone: input.timeZone },
        reminders: {
          useDefault: false,
          overrides: [{ method: "popup", minutes: input.reminderMinutes }],
        },
      }),
    },
  );
}

export async function deleteGoogleEvent(
  userId: string,
  calendarId: string,
  externalEventId: string,
): Promise<void> {
  try {
    await googleFetch(
      userId,
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(externalEventId)}`,
      { method: "DELETE" },
    );
  } catch (err) {
    // Event yang sudah dihapus dari luar bukan kegagalan yang perlu diributkan.
    if (err instanceof Error && err.message.includes("(404)")) return;
    throw err;
  }
}
