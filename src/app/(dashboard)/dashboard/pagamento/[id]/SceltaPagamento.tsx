"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { CreditCard, Building2, CheckCircle, ChevronRight } from "lucide-react";
import type { MetodoPagamento } from "@/lib/pagamento";

const CheckoutStripe = dynamic(() => import("./CheckoutStripe"), { ssr: false });
const CheckoutPaypal = dynamic(() => import("./CheckoutPaypal"), { ssr: false });

interface Props {
  prenotazioneId: string;
  costoTotale: number;
  metodiDisponibili: MetodoPagamento[];
  paypalClientId: string | null;
  paypalMode: "sandbox" | "live";
  coordinateBancarie: string;
}

const METODI_INFO: Record<MetodoPagamento, { label: string; desc: string; icona: React.ReactNode }> = {
  STRIPE: {
    label: "Carta di credito / debito",
    desc: "Visa, Mastercard, AMEX — pagamento sicuro con Stripe",
    icona: <CreditCard className="h-5 w-5" />,
  },
  PAYPAL: {
    label: "PayPal",
    desc: "Paga con il tuo account PayPal",
    icona: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.217a.77.77 0 0 1 .762-.648h6.925c2.333 0 4.052.67 5.003 1.994.403.566.643 1.175.737 1.86.098.71.05 1.554-.146 2.518v.004l-.003.017c-.634 3.19-2.805 4.868-6.45 4.868H9.85a.77.77 0 0 0-.762.649l-.978 6.215a.641.641 0 0 1-.634.64h-.4Zm8.744-14.6c-.022.14-.047.28-.076.423-.969 4.965-4.285 6.682-8.52 6.682H5.28l-1.277 8.097h3.07l.822-5.216h1.924c3.6 0 6.393-1.462 7.212-5.692.327-1.69.159-3.1-.21-4.294Z" />
      </svg>
    ),
  },
  BONIFICO: {
    label: "Bonifico bancario",
    desc: "Paga con bonifico e carica la ricevuta",
    icona: <Building2 className="h-5 w-5" />,
  },
};

export default function SceltaPagamento({
  prenotazioneId,
  metodiDisponibili,
  paypalClientId,
  paypalMode,
}: Props) {
  const router = useRouter();
  const [metodoScelto, setMetodoScelto] = useState<MetodoPagamento | null>(
    metodiDisponibili.length === 1 ? metodiDisponibili[0] : null
  );
  const [successo, setSuccesso] = useState(false);

  function handleSuccess() {
    setSuccesso(true);
    setTimeout(() => {
      router.push(`/dashboard/prenotazioni/${prenotazioneId}?confermata=1`);
    }, 2000);
  }

  if (successo) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Pagamento completato!</h2>
        <p className="text-gray-500">La tua iscrizione è confermata. Reindirizzamento in corso…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Selezione metodo */}
      {!metodoScelto || metodiDisponibili.length > 1 ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700">Scegli come vuoi pagare</p>
          {metodiDisponibili.map((m) => {
            const info = METODI_INFO[m];
            return (
              <button
                key={m}
                onClick={() => setMetodoScelto(m)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                  metodoScelto === m
                    ? "border-red-600 bg-red-50"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <span className={metodoScelto === m ? "text-red-600" : "text-gray-500"}>
                  {info.icona}
                </span>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 text-sm">{info.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{info.desc}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </button>
            );
          })}
        </div>
      ) : null}

      {/* Form pagamento in base al metodo */}
      {metodoScelto === "STRIPE" && (
        <div className="mt-2">
          {metodiDisponibili.length > 1 && (
            <button
              onClick={() => setMetodoScelto(null)}
              className="text-xs text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-1"
            >
              ← Cambia metodo
            </button>
          )}
          <CheckoutStripe
            prenotazioneId={prenotazioneId}
            onSuccess={handleSuccess}
          />
        </div>
      )}

      {metodoScelto === "PAYPAL" && paypalClientId && (
        <div className="mt-2">
          {metodiDisponibili.length > 1 && (
            <button
              onClick={() => setMetodoScelto(null)}
              className="text-xs text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-1"
            >
              ← Cambia metodo
            </button>
          )}
          <CheckoutPaypal
            prenotazioneId={prenotazioneId}
            clientId={paypalClientId}
            mode={paypalMode}
            onSuccess={handleSuccess}
          />
        </div>
      )}

      {metodoScelto === "BONIFICO" && (
        <div className="mt-2 space-y-4">
          {metodiDisponibili.length > 1 && (
            <button
              onClick={() => setMetodoScelto(null)}
              className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
            >
              ← Cambia metodo
            </button>
          )}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
            <p className="font-medium mb-2">Prossimi passi per il bonifico:</p>
            <ol className="list-decimal pl-4 space-y-1">
              <li>Effettua il bonifico alle coordinate indicate nella tua prenotazione</li>
              <li>Torna nella tua area personale e carica la ricevuta</li>
              <li>La segreteria verificherà il pagamento e confermerà l'iscrizione</li>
            </ol>
          </div>
          <button
            onClick={() => router.push(`/dashboard/prenotazioni/${prenotazioneId}`)}
            className="w-full py-3 rounded-xl bg-gray-900 text-white font-medium hover:bg-gray-800 transition-colors"
          >
            Vai alla prenotazione →
          </button>
        </div>
      )}
    </div>
  );
}
