-- Perencana Kebiasaan: profil, habit, jadwal, occurrence, koneksi kalender.
-- Model auth Better Auth tidak diubah.
CREATE TABLE "user_profile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "timezone" TEXT NOT NULL DEFAULT 'Asia/Jakarta',
  "weekStartsOn" INTEGER NOT NULL DEFAULT 1,
  "timeFormat" TEXT NOT NULL DEFAULT '24',
  "reminderMinutes" INTEGER NOT NULL DEFAULT 15,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "user_profile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "user_profile_userId_key" ON "user_profile"("userId");

CREATE TABLE "habit" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT,
  "color" TEXT NOT NULL DEFAULT '#0EA5A5',
  "defaultDurationMinutes" INTEGER NOT NULL DEFAULT 30,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "habit_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "habit_userId_idx" ON "habit"("userId");

CREATE TABLE "habit_schedule" (
  "id" TEXT NOT NULL,
  "habitId" TEXT NOT NULL,
  "daysOfWeek" INTEGER[] NOT NULL,
  "localTime" TEXT NOT NULL,
  "durationMinutes" INTEGER NOT NULL,
  "effectiveFrom" TEXT,
  "effectiveUntil" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "habit_schedule_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "habit_schedule_habitId_idx" ON "habit_schedule"("habitId");

CREATE TABLE "scheduled_item" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "habitId" TEXT,
  "scheduleId" TEXT,
  "title" TEXT NOT NULL,
  "notes" TEXT,
  "dateKey" TEXT NOT NULL,
  "startAt" TIMESTAMP(3) NOT NULL,
  "endAt" TIMESTAMP(3) NOT NULL,
  "timezone" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "source" TEXT NOT NULL DEFAULT 'habit',
  "completedAt" TIMESTAMP(3),
  "syncStatus" TEXT NOT NULL DEFAULT 'not_synced',
  "syncError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "scheduled_item_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "scheduled_item_userId_scheduleId_dateKey_key" ON "scheduled_item"("userId", "scheduleId", "dateKey");
CREATE INDEX "scheduled_item_userId_dateKey_idx" ON "scheduled_item"("userId", "dateKey");
CREATE INDEX "scheduled_item_userId_startAt_idx" ON "scheduled_item"("userId", "startAt");

CREATE TABLE "calendar_connection" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'google',
  "calendarId" TEXT NOT NULL,
  "calendarName" TEXT,
  "status" TEXT NOT NULL DEFAULT 'connected',
  "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "calendar_connection_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "calendar_connection_userId_provider_key" ON "calendar_connection"("userId", "provider");

CREATE TABLE "calendar_event_mapping" (
  "id" TEXT NOT NULL,
  "connectionId" TEXT NOT NULL,
  "scheduledItemId" TEXT NOT NULL,
  "externalEventId" TEXT NOT NULL,
  "externalCalendarId" TEXT NOT NULL,
  "syncStatus" TEXT NOT NULL DEFAULT 'synced',
  "lastSyncedAt" TIMESTAMP(3),
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "calendar_event_mapping_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "calendar_event_mapping_scheduledItemId_key" ON "calendar_event_mapping"("scheduledItemId");

CREATE TABLE "sync_operation" (
  "id" TEXT NOT NULL,
  "mappingId" TEXT,
  "operation" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextRetryAt" TIMESTAMP(3),
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sync_operation_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "habit" ADD CONSTRAINT "habit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "habit_schedule" ADD CONSTRAINT "habit_schedule_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "habit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "scheduled_item" ADD CONSTRAINT "scheduled_item_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "scheduled_item" ADD CONSTRAINT "scheduled_item_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "habit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "scheduled_item" ADD CONSTRAINT "scheduled_item_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "habit_schedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "calendar_connection" ADD CONSTRAINT "calendar_connection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "calendar_event_mapping" ADD CONSTRAINT "calendar_event_mapping_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "calendar_connection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "calendar_event_mapping" ADD CONSTRAINT "calendar_event_mapping_scheduledItemId_fkey" FOREIGN KEY ("scheduledItemId") REFERENCES "scheduled_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sync_operation" ADD CONSTRAINT "sync_operation_mappingId_fkey" FOREIGN KEY ("mappingId") REFERENCES "calendar_event_mapping"("id") ON DELETE CASCADE ON UPDATE CASCADE;
