import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@example.com";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  try {
    const { space_id, sender_id, title, body, url, tag } = await req.json();

    if (!space_id || !sender_id || !title) {
      return new Response(JSON.stringify({ error: "Paramètres manquants" }), { status: 400 });
    }

    // Récupère les user_ids des membres du space (sauf l'expéditeur)
    const { data: members, error: membersErr } = await supabase
      .from("space_members")
      .select("user_id")
      .eq("space_id", space_id)
      .neq("user_id", sender_id);

    if (membersErr || !members?.length) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
    }

    const recipientIds = members.map((m: { user_id: string }) => m.user_id);

    // Récupère leurs abonnements push
    const { data: subs, error: subsErr } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .in("user_id", recipientIds);

    if (subsErr || !subs?.length) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
    }

    const payload = JSON.stringify({ title, body, url: url ?? "/", tag: tag ?? "nc" });

    const results = await Promise.allSettled(
      subs.map((s: { endpoint: string; p256dh: string; auth: string }) =>
        webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        )
      ),
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;

    // Supprime les abonnements expirés (410 Gone)
    const expired = subs.filter(
      (_: unknown, i: number) =>
        results[i].status === "rejected" &&
        (results[i] as PromiseRejectedResult).reason?.statusCode === 410,
    );
    if (expired.length) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .in(
          "endpoint",
          expired.map((s: { endpoint: string }) => s.endpoint),
        );
    }

    return new Response(JSON.stringify({ sent }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
