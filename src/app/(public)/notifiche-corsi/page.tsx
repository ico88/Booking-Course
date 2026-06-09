import { getTagsDisponibili } from "@/lib/leads";
import FormNotifiche from "./FormNotifiche";

export const metadata = {
  title: "Iscriviti alle notifiche corsi",
  description: "Ricevi una email non appena viene pubblicato un corso di tuo interesse.",
};

export default async function NotificheCorsiPage() {
  const tags = await getTagsDisponibili();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-xl mx-auto px-4 py-16">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Iscriviti alle notifiche
          </h1>
          <p className="text-gray-600 leading-relaxed">
            Seleziona le tipologie di corso che ti interessano e ti invieremo
            una email non appena viene pubblicato un nuovo corso.
          </p>
        </div>
        <FormNotifiche tags={tags} />
      </div>
    </div>
  );
}
