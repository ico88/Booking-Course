import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Avvio seed del database...");

  // Crea account segreteria
  const passwordHash = await bcrypt.hash("Admin2024!", 12);

  const segreteria = await prisma.utente.upsert({
    where: { email: "segreteria@example.com" },
    update: {},
    create: {
      nome: "Segreteria",
      cognome: "Amministrazione",
      email: "segreteria@example.com",
      password: passwordHash,
      ruolo: "SEGRETERIA",
    },
  });

  console.log("✅ Account segreteria:", segreteria.email);

  // Crea account amministratore (accesso totale + impostazioni)
  const adminHash = await bcrypt.hash("AdminSystem2024!", 12);

  const admin = await prisma.utente.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      nome: "Super",
      cognome: "Admin",
      email: "admin@example.com",
      password: adminHash,
      ruolo: "ADMIN",
    },
  });

  console.log("✅ Account admin:", admin.email);

  // Crea utente di test
  const utenteHash = await bcrypt.hash("Utente2024!", 12);

  const utente = await prisma.utente.upsert({
    where: { email: "utente@example.com" },
    update: {},
    create: {
      nome: "Mario",
      cognome: "Rossi",
      email: "utente@example.com",
      password: utenteHash,
      telefono: "+39 333 1234567",
      ruolo: "UTENTE",
    },
  });

  console.log("✅ Utente di test:", utente.email);

  // Crea corsi di esempio
  const coordinateBancarie = `Banca: Intesa Sanpaolo
IBAN: IT60 X054 2811 1010 0000 0123 456
BIC: BCITITMM
Intestato a: Gestione Corsi S.r.l.
Causale: [NOME CORSO] - [NOME E COGNOME PARTECIPANTE]`;

  const corso1 = await prisma.corso.upsert({
    where: { id: "seed-corso-1" },
    update: {},
    create: {
      id: "seed-corso-1",
      titolo: "Corso di Primo Soccorso BLSD",
      descrizione: `Corso per l'acquisizione delle competenze di base nel soccorso alle persone in stato di emergenza.

Il programma include:
• Riconoscimento dell'emergenza e chiamata ai soccorsi
• Rianimazione cardiopolmonare (CPR) di base
• Utilizzo del defibrillatore automatico esterno (DAE)
• Disostruzione delle vie aeree nell'adulto e nel bambino
• Gestione delle principali emergenze mediche

Al termine del corso verrà rilasciato l'attestato di partecipazione con validità biennale.`,
      dataInizio: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      orario: "09:00 - 17:00",
      durata: "8 ore",
      luogo: "Via Roma 10, Milano",
      costo: 150.0,
      postiTotali: 12,
      timeoutPagamentoOre: 48,
      coordinateBancarie,
      pubblicato: true,
      attestatoAbilitato: true,
    },
  });

  const corso2 = await prisma.corso.upsert({
    where: { id: "seed-corso-2" },
    update: {},
    create: {
      id: "seed-corso-2",
      titolo: "Sicurezza sul Lavoro - Formazione Generale",
      descrizione: `Corso di formazione obbligatoria per lavoratori ai sensi del D.Lgs. 81/08.

Contenuti:
• Concetti di rischio, danno, prevenzione e protezione
• Organizzazione della prevenzione aziendale
• Diritti, doveri e sanzioni per i vari soggetti aziendali
• Organi di vigilanza, controllo e assistenza
• Principali fattori di rischio

Obbligatorio per tutti i lavoratori secondo la normativa vigente.`,
      dataInizio: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      dataFine: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      orario: "08:30 - 12:30",
      durata: "4 ore",
      luogo: "Online (Zoom)",
      costo: 80.0,
      postiTotali: 30,
      timeoutPagamentoOre: 72,
      coordinateBancarie,
      pubblicato: true,
      attestatoAbilitato: true,
    },
  });

  const corso3 = await prisma.corso.upsert({
    where: { id: "seed-corso-3" },
    update: {},
    create: {
      id: "seed-corso-3",
      titolo: "Formazione Antincendio - Rischio Basso",
      descrizione: `Formazione antincendio per addetti alla prevenzione incendi in attività a rischio di incendio basso.

Il corso copre:
• Principi della combustione e principali cause di incendio
• Sostanze estinguenti e loro uso
• Dispositivi di protezione individuale
• Procedure da adottare in caso di incendio
• Esercitazioni pratiche con estintori`,
      dataInizio: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      orario: "09:00 - 13:00",
      durata: "4 ore",
      luogo: "Via Verdi 5, Roma",
      costo: 120.0,
      postiTotali: 15,
      postiOccupati: 3,
      timeoutPagamentoOre: 48,
      coordinateBancarie,
      pubblicato: true,
      attestatoAbilitato: false,
    },
  });

  console.log("✅ Corsi di esempio creati:", corso1.titolo, corso2.titolo, corso3.titolo);

  console.log("\n🎉 Seed completato con successo!");
  console.log("\n📋 Credenziali di accesso:");
  console.log("   Admin:      admin@example.com / AdminSystem2024!");
  console.log("   Segreteria: segreteria@example.com / Admin2024!");
  console.log("   Utente:     utente@example.com / Utente2024!");
}

main()
  .catch((e) => {
    console.error("❌ Errore durante il seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
