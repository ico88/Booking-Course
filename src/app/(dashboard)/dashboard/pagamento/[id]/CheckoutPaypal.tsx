"use client";

import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import Alert from "@/components/ui/Alert";
import { useState } from "react";

interface Props {
  prenotazioneId: string;
  clientId: string;
  mode: "sandbox" | "live";
  onSuccess: () => void;
}

export default function CheckoutPaypal({ prenotazioneId, clientId, mode, onSuccess }: Props) {
  const [errore, setErrore] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {errore && <Alert variant="error">{errore}</Alert>}
      <PayPalScriptProvider
        options={{
          clientId,
          currency: "EUR",
          intent: "capture",
          ...(mode === "sandbox" ? { "buyer-country": "IT" } : {}),
        }}
      >
        <PayPalButtons
          style={{ layout: "vertical", color: "gold", shape: "rect", label: "pay" }}
          createOrder={async () => {
            const res = await fetch("/api/pagamento/paypal/crea-ordine", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ prenotazioneId }),
            });
            const data = (await res.json()) as { orderID?: string; error?: string };
            if (data.error) throw new Error(data.error);
            return data.orderID!;
          }}
          onApprove={async (data) => {
            const res = await fetch("/api/pagamento/paypal/cattura", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderID: data.orderID, prenotazioneId }),
            });
            const json = (await res.json()) as { success?: boolean; error?: string };
            if (json.success) {
              onSuccess();
            } else {
              setErrore(json.error ?? "Errore durante la cattura del pagamento.");
            }
          }}
          onError={(err) => {
            console.error("PayPal error:", err);
            setErrore("Si è verificato un errore con PayPal. Riprova o scegli un altro metodo.");
          }}
        />
      </PayPalScriptProvider>
    </div>
  );
}
