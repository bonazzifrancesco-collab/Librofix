import React from 'react';
import { X, AlertTriangle, ExternalLink, Lock, CheckCircle, HelpCircle } from 'lucide-react';

interface AuthErrorModalProps {
  error: {
    code: string;
    message: string;
    domain?: string;
  };
  onClose: () => void;
}

export default function AuthErrorModal({ error, onClose }: AuthErrorModalProps) {
  const currentDomain = error.domain || window.location.hostname || "localhost";
  const isLocalhost = currentDomain === "localhost" || currentDomain === "127.0.0.1";

  // Determine specific trouble-shooting guidelines based on Firebase Auth error code
  let errorTitle = "Errore di Autenticazione";
  let explanation = "La finestra popup di Google si è chiusa improvvisamente senza effettuare il login. Questo solitamente indica una configurazione mancante nel pannello amministrativo di Firebase.";
  let steps: string[] = [];
  let actionLink = "";
  let actionText = "";

  switch (error.code) {
    case 'auth/operation-not-allowed':
      errorTitle = "Google Sign-In non abilitato";
      explanation = "L'accesso con account Google non è abilitato come provider di autenticazione all'interno del tuo progetto Firebase.";
      steps = [
        "Apri la console Firebase del tuo progetto 'bookflix-da48a'.",
        "Nel menu laterale sinistro, clicca su Build > Authentication (Autenticazione).",
        "Seleziona la scheda 'Sign-in method' (Metodo di accesso) in alto.",
        "Clicca su 'Aggiungi nuovo provider' (Add new provider) e seleziona 'Google'.",
        "Attiva lo switch di abilitazione, compila il campo 'Email di supporto per il progetto' (scegli bonazzi.francesco@gmail.com o la tua email) e clicca su Salva (Save)."
      ];
      actionLink = "https://console.firebase.google.com/u/0/project/bookflix-da48a/authentication/providers";
      actionText = "Abilita Google Sign-In su Firebase";
      break;

    case 'auth/unauthorized-domain':
      errorTitle = "Dominio non autorizzato";
      explanation = `Il dominio '${currentDomain}' da cui stai usando l'applicazione non è autorizzato nei servizi di sicurezza del tuo progetto Firebase.`;
      steps = [
        "Apri la console Firebase del tuo progetto 'bookflix-da48a'.",
        "Nel menu laterale sinistro, vai su Build > Authentication (Autenticazione).",
        "Seleziona la scheda 'Settings' (Impostazioni) in alto.",
        "Nel sottomenu di sinistra, clicca su 'Authorized domains' (Domini autorizzati).",
        `Clicca su 'Add domain' (Aggiungi dominio) e digita esattamente: "${currentDomain}"`,
        "Fai clic su 'Add' (Aggiungi), attendi 15-30 secondi per la propagazione di rete e ricarica questa pagina."
      ];
      actionLink = "https://console.firebase.google.com/u/0/project/bookflix-da48a/authentication/settings";
      actionText = "Aggiungi Dominio Autorizzato su Firebase";
      break;

    case 'auth/popup-blocked':
      errorTitle = "Pop-up bloccato dal browser";
      explanation = "Il tuo browser o un'estensione per il blocco degli annunci ha bloccato l'apertura della finestra di login Google.";
      steps = [
        "Controlla la barra degli indirizzi o gli avvisi del browser per vedere se è apparsa un'icona di blocco pop-up.",
        "Consenti esplicitamente i pop-up per questo sito web.",
        "Se usi ad-blocker aggressivi, prova a disattivarli temporaneamente o aggiungi il sito alle eccezioni."
      ];
      break;

    case 'auth/popup-closed-by-user':
      errorTitle = "Finestra di accesso chiusa";
      explanation = "La schermata di Google è stata chiusa prima del completamento dell'inserimento dei dati di accesso o della conferma.";
      steps = [
        "Riprova cliccando nuovamente su 'Accedi con Google'.",
        "Lascia aperta la finestra fino al completamento e al reindirizzamento automatico all'applicazione."
      ];
      break;

    default:
      if (error.code.includes('network') || error.message.includes('network')) {
        errorTitle = "Errore di Rete / Connessione";
        explanation = "La connessione con i server di autenticazione di Google o Firebase è stata interrotta o bloccata.";
        steps = [
          "Controlla che la tua connessione internet sia attiva ed esente da firewall restrittivi.",
          "Verifica che non ci siano blocchi DNS o VPN attive che filtrano le richieste a firebaseapp.com.",
          "Se sei in modalità di anteprima iframe in AI Studio, potrebbe esserci una sandbox restrittiva. Prova ad aprire in una Nuova Scheda."
        ];
      } else {
        errorTitle = "Errore configurazione Firebase";
        explanation = `Si è verificato un errore Firebase inatteso (${error.code}).`;
        steps = [
          "Verifica che le chiavi e le credenziali all'interno di 'firebase-applet-config.json' siano configurate correttamente sul repository o nel codice.",
          "Verifica lo stato complessivo del servizio di autenticazione nella console Firebase.",
          `Dettagli errore tecnico da ispezionare: ${error.message}`
        ];
      }
      break;
  }

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[100] p-4 overflow-y-auto">
      <div 
        id="auth-error-modal" 
        className="bg-[#121214] border-2 border-red-500/20 rounded-2xl w-full max-w-lg p-6 relative overflow-hidden shadow-2xl space-y-5 text-left"
      >
        {/* Glow accent bar at top */}
        <div className="absolute top-0 inset-x-0 h-1 bg-red-600" />

        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-950/40 border border-red-500/30 text-red-500 rounded-xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight leading-snug">{errorTitle}</h3>
              <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Codice: {error.code}</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="text-zinc-400 hover:text-white hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-800 p-1.5 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Explanation */}
        <div className="bg-red-950/10 border border-red-500/10 p-3.5 rounded-xl">
          <p className="text-xs text-zinc-300 leading-relaxed">
            {explanation}
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          <h4 className="text-[11px] uppercase tracking-wider font-extrabold text-amber-500 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" /> Come risolvere questo problema nel tuo account:
          </h4>
          <ol className="space-y-2.5">
            {steps.map((step, idx) => (
              <li key={idx} className="flex gap-3 text-xs leading-relaxed text-zinc-400">
                <span className="flex-none w-5 h-5 rounded-full bg-zinc-900 border border-zinc-800 text-white font-bold text-[10px] flex items-center justify-center text-center mt-0.5 select-none">
                  {idx + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Action Button & Footer Links */}
        <div className="pt-2 border-t border-zinc-900 flex flex-col sm:flex-row gap-3 items-center justify-between">
          {actionLink ? (
            <a 
              href={actionLink} 
              target="_blank" 
              rel="noreferrer"
              className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 active:scale-95 text-xs text-white uppercase font-black tracking-wider py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-amber-950/20"
            >
              <span>{actionText}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ) : (
            <div className="hidden sm:block text-[10px] text-zinc-500 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-none" /> Verifica i passaggi sopra per ripristinare il servizio.
            </div>
          )}
          
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-bold py-2 px-4 rounded-xl transition border border-zinc-800 text-center"
          >
            Ho capito, chiudi
          </button>
        </div>

      </div>
    </div>
  );
}
