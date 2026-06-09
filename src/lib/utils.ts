import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string): string {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(Number(amount));
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatDateShort(date: Date | string): string {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

/**
 * Replaces {{variabile}} placeholders in an HTML attestato template.
 * Uses a single-pass regex so order never matters and partial key names
 * can never contaminate each other. Unknown placeholders are left unchanged.
 */
export function sostituisciVariabiliAttestato(
  template: string,
  variabili: Record<string, string>
): string {
  return template.replace(/\{\{([^{}]+)\}\}/g, (_match, key: string) => {
    const k = key.trim();
    return Object.prototype.hasOwnProperty.call(variabili, k)
      ? variabili[k]
      : `{{${k}}}`;
  });
}

export const STATI_PRENOTAZIONE: Record<string, { label: string; color: string; bg: string }> = {
  IN_ATTESA_PAGAMENTO: {
    label: "In attesa di pagamento",
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
  },
  PAGAMENTO_CARICATO: {
    label: "Verifica in corso",
    color: "text-red-700",
    bg: "bg-red-50 border-red-200",
  },
  CONFERMATA: {
    label: "Confermata",
    color: "text-green-700",
    bg: "bg-green-50 border-green-200",
  },
  ANNULLATA: {
    label: "Annullata",
    color: "text-red-700",
    bg: "bg-red-50 border-red-200",
  },
  SCADUTA: {
    label: "Scaduta",
    color: "text-gray-700",
    bg: "bg-gray-50 border-gray-200",
  },
};
