"use client";

import { useState, useEffect, useCallback } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";

function FormPagamentoStripe({
  prenotazioneId,
  onSuccess,
}: {
  prenotazioneId: string;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [errore, setErrore] = useState<string | null>(null);
  const [pagando, setPagando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setPagando(true);
    setErrore(null);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/dashboard/pagamento/${prenotazioneId}`,
      },
      redirect: "if_required",
    });

    if (error) {
      setErrore(error.message ?? "Pagamento fallito. Riprova.");
      setPagando(false);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      const res = await fetch("/api/pagamento/stripe/conferma", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentIntentId: paymentIntent.id, prenotazioneId }),
      });
      const json = await res.json();
      if (res.ok) onSuccess();
      else setErrore(json.error ?? "Errore durante la conferma.");
    }

    setPagando(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PaymentElement />
      {errore && <Alert variant="error">{errore}</Alert>}
      <Button type="submit" size="lg" className="w-full" loading={pagando} disabled={!stripe}>
        {pagando ? "Pagamento in corso…" : "Paga ora"}
      </Button>
    </form>
  );
}

export default function CheckoutStripe({
  prenotazioneId,
  onSuccess,
}: {
  prenotazioneId: string;
  onSuccess: () => void;
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stripeInstance, setStripeInstance] = useState<Stripe | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  const confermaDopoRedirect = useCallback(
    async (piId: string) => {
      const res = await fetch("/api/pagamento/stripe/conferma", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentIntentId: piId, prenotazioneId }),
      });
      if (res.ok) onSuccess();
      else {
        const json = await res.json();
        setErrore(json.error ?? "Errore conferma pagamento.");
      }
    },
    [prenotazioneId, onSuccess]
  );

  useEffect(() => {
    // Ritorno da redirect 3DS
    const params = new URLSearchParams(window.location.search);
    const piId = params.get("payment_intent");
    if (piId) {
      confermaDopoRedirect(piId);
      return;
    }

    fetch("/api/pagamento/stripe/crea-intento", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prenotazioneId }),
    })
      .then((r) => r.json())
      .then(async (data: { clientSecret?: string; publishableKey?: string; error?: string }) => {
        if (data.error || !data.clientSecret || !data.publishableKey) {
          setErrore(data.error ?? "Errore Stripe.");
          return;
        }
        const s = await loadStripe(data.publishableKey);
        setStripeInstance(s);
        setClientSecret(data.clientSecret);
      })
      .catch(() => setErrore("Errore di connessione."));
  }, [prenotazioneId, confermaDopoRedirect]);

  if (errore) return <Alert variant="error">{errore}</Alert>;

  if (!clientSecret || !stripeInstance) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-6 w-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Elements
      stripe={stripeInstance}
      options={{ clientSecret, locale: "it", appearance: { theme: "stripe" } }}
    >
      <FormPagamentoStripe prenotazioneId={prenotazioneId} onSuccess={onSuccess} />
    </Elements>
  );
}
