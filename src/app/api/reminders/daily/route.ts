import { NextResponse } from "next/server";
import type { UserRecord } from "../../../types";
import { getSupabaseServiceClient } from "../../../lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const REMINDER_TIME_ZONE = "Europe/Stockholm";
const REMINDER_HOUR = 18;
const RESEND_EMAIL_URL = "https://api.resend.com/emails";

type ReminderProfile = {
  id: string;
  email: string;
  display_name: string;
  timezone: string;
  reminders_enabled: boolean;
};

type ReminderState = {
  user_id: string;
  app_state_json: UserRecord | null;
};

function getStockholmParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: REMINDER_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    hour: Number(values.hour),
  };
}

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!cronSecret) {
    return false;
  }

  return authorization === `Bearer ${cronSecret}`;
}

function getAppUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL;
  const vercelProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const vercelUrl = process.env.VERCEL_URL;
  const rawUrl = configuredUrl ?? vercelProductionUrl ?? vercelUrl;

  if (!rawUrl) {
    return "http://localhost:3000";
  }

  if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) {
    return rawUrl;
  }

  return `https://${rawUrl}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getIncompleteQuestSummary(user: UserRecord) {
  const openDailyQuests = user.quests.filter((quest) => !quest.completed);
  const hasOpenSpecialQuest =
    !user.specialQuest.completed && user.specialQuest.status !== "waived";

  return {
    openDailyQuests,
    hasOpenSpecialQuest,
    isIncomplete: openDailyQuests.length > 0 || hasOpenSpecialQuest,
  };
}

async function sendReminderEmail(input: {
  to: string;
  name: string;
  user: UserRecord;
}) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const from = process.env.REMINDER_FROM_EMAIL;

  if (!resendApiKey || !from) {
    throw new Error("Reminder email environment variables are missing.");
  }

  const appUrl = getAppUrl();
  const summary = getIncompleteQuestSummary(input.user);
  const openQuestList = summary.openDailyQuests
    .map((quest) => `- ${quest.title} (+${quest.xp} XP)`)
    .join("\n");
  const specialQuestLine = summary.hasOpenSpecialQuest
    ? `\n- Special: ${input.user.specialQuest.title} (+${input.user.specialQuest.xp} XP)`
    : "";
  const text = `The System reminder\n\n${input.name}, your daily protocol is still incomplete.\n\nOpen quests:\n${openQuestList || "- Daily quests cleared"}${specialQuestLine}\n\nOpen The System: ${appUrl}/quests`;

  const htmlQuestItems = summary.openDailyQuests
    .map(
      (quest) =>
        `<li>${escapeHtml(quest.title)} <strong>+${quest.xp} XP</strong></li>`
    )
    .join("");
  const specialHtml = summary.hasOpenSpecialQuest
    ? `<li>Special: ${escapeHtml(input.user.specialQuest.title)} <strong>+${input.user.specialQuest.xp} XP</strong></li>`
    : "";

  const response = await fetch(RESEND_EMAIL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: "The System: daily protocol still open",
      text,
      html: `
        <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
          <h1 style="margin-bottom: 8px;">The System reminder</h1>
          <p>${escapeHtml(input.name)}, your daily protocol is still incomplete.</p>
          <p><strong>Open quests:</strong></p>
          <ul>${htmlQuestItems || "<li>Daily quests cleared</li>"}${specialHtml}</ul>
          <p>
            <a href="${escapeHtml(`${appUrl}/quests`)}" style="color: #2563eb;">
              Open The System
            </a>
          </p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Resend failed: ${response.status} ${details}`);
  }
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "1";
  const { date: stockholmDate, hour: stockholmHour } = getStockholmParts();

  if (!force && stockholmHour !== REMINDER_HOUR) {
    return NextResponse.json({
      skipped: true,
      reason: "Outside reminder hour",
      stockholmDate,
      stockholmHour,
    });
  }

  const supabase = getSupabaseServiceClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase service client is not configured" },
      { status: 500 }
    );
  }

  if (!process.env.RESEND_API_KEY || !process.env.REMINDER_FROM_EMAIL) {
    return NextResponse.json(
      { error: "Resend reminder email environment variables are missing" },
      { status: 500 }
    );
  }

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id,email,display_name,timezone,reminders_enabled")
    .eq("reminders_enabled", true)
    .eq("timezone", REMINDER_TIME_ZONE);

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 });
  }

  const profileRows = (profiles ?? []) as ReminderProfile[];
  const userIds = profileRows.map((profile) => profile.id);

  if (userIds.length === 0) {
    return NextResponse.json({
      sent: 0,
      skipped: 0,
      stockholmDate,
      reason: "No reminder-enabled profiles",
    });
  }

  const { data: sentLogs, error: sentLogsError } = await supabase
    .from("reminder_logs")
    .select("user_id")
    .eq("reminder_date", stockholmDate)
    .eq("channel", "email")
    .in("user_id", userIds);

  if (sentLogsError) {
    return NextResponse.json({ error: sentLogsError.message }, { status: 500 });
  }

  const alreadySent = new Set(
    ((sentLogs ?? []) as Array<{ user_id: string }>).map((log) => log.user_id)
  );

  const { data: states, error: statesError } = await supabase
    .from("user_state")
    .select("user_id,app_state_json")
    .in("user_id", userIds);

  if (statesError) {
    return NextResponse.json({ error: statesError.message }, { status: 500 });
  }

  const stateByUserId = new Map(
    ((states ?? []) as ReminderState[]).map((state) => [
      state.user_id,
      state.app_state_json,
    ])
  );

  const results = {
    sent: 0,
    skipped: 0,
    failed: 0,
    failures: [] as Array<{ email: string; error: string }>,
    stockholmDate,
    stockholmHour,
  };

  for (const profile of profileRows) {
    if (alreadySent.has(profile.id)) {
      results.skipped += 1;
      continue;
    }

    const user = stateByUserId.get(profile.id);

    if (!user || !getIncompleteQuestSummary(user).isIncomplete) {
      results.skipped += 1;
      continue;
    }

    try {
      await sendReminderEmail({
        to: profile.email,
        name: profile.display_name || user.profile.name || "Hunter",
        user,
      });

      const { error: logError } = await supabase.from("reminder_logs").insert({
        user_id: profile.id,
        reminder_date: stockholmDate,
        channel: "email",
      });

      if (logError) {
        throw logError;
      }

      results.sent += 1;
    } catch (error) {
      results.failed += 1;
      results.failures.push({
        email: profile.email,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return NextResponse.json(results);
}
