import { NextResponse } from "next/server";
import { sendJobReadyEmail } from "@/lib/resend";

export const dynamic = "force-dynamic";

/**
 * Endpoint appelé par le worker Trigger.dev une fois le job en état terminal
 * (READY ou FAILED). On délègue ici l'envoi du mail Resend pour que le worker
 * n'ait jamais à charger `lib/resend.ts` (qui dépend de NEXT_PUBLIC_APP_URL).
 *
 * Pas d'auth utilisateur : l'endpoint est idempotent côté abus — il ne fait
 * que rejouer un email déjà autorisé par les préférences (`notifyOnReady` /
 * `notifyOnFailed`) du destinataire.
 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    await sendJobReadyEmail(params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur d'envoi de notification" },
      { status: 500 },
    );
  }
}
