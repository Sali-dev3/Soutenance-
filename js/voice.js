// Gestion de la voix (Reconnaissance vocale et Synthèse vocale)
// Utilise les API natives Web Speech Synthesis et Web Speech Recognition.

class WakatKoomVoiceManager {
  constructor() {
    this.synth = window.speechSynthesis;
    this.recognition = null;
    this.isListening = false;
    this.voiceGuidanceEnabled = true;
    this.voiceAssistantEnabled = true;
    this.currentUtterance = null;

    // Initialiser la reconnaissance vocale
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.lang = 'fr-FR';
      this.recognition.interimResults = false;
      this.recognition.maxAlternatives = 1;
    } else {
      console.warn("La reconnaissance vocale n'est pas supportée par ce navigateur.");
    }
  }

  // --- SYNTHÈSE VOCALE (TEXT TO SPEECH) ---
  
  // Parler à haute voix
  speak(text, callback = null, languageCode = 'fr-FR', force = false) {
    if (!this.synth) return;
    
    if (!this.voiceAssistantEnabled && !force) return;

    // Annuler toute lecture en cours
    this.synth.cancel();

    // La synthèse vocale reste disponible pour les actions explicites,
    // même si le guide vocal automatique est désactivé.
    this.currentUtterance = new SpeechSynthesisUtterance(text);
    
    // Configurer la langue
    this.currentUtterance.lang = languageCode;
    
    // Tenter de trouver une voix française appropriée
    const voices = this.synth.getVoices();
    const frVoice = voices.find(voice => voice.lang.startsWith(languageCode.substring(0, 2)));
    if (frVoice) {
      this.currentUtterance.voice = frVoice;
    }

    // Vitesse légèrement plus lente pour plus de clarté
    this.currentUtterance.rate = 0.95;
    this.currentUtterance.pitch = 1.0;

    this.currentUtterance.onend = () => {
      this.currentUtterance = null;
      if (callback) callback();
    };

    this.currentUtterance.onerror = (event) => {
      console.error("Erreur de synthèse vocale :", event);
      this.currentUtterance = null;
      if (callback) callback();
    };

    this.synth.speak(this.currentUtterance);
  }

  // Arrêter de parler
  stopSpeaking() {
    if (this.synth) {
      this.synth.cancel();
    }
  }

  // --- RECONNAISSANCE VOCALE (SPEECH TO TEXT) ---

  // Commencer à écouter
  startListening(onResult, onEnd, onError) {
    if (!this.recognition) {
      if (onError) onError("Reconnaissance vocale non supportée sur ce navigateur.");
      return;
    }

    if (this.isListening) return;
    
    // Arrêter la synthèse vocale pour ne pas que l'application s'écoute elle-même
    this.stopSpeaking();

    this.isListening = true;

    this.recognition.onstart = () => {
      // Jouer un bip d'enregistrement (Audio API)
      this.playBeep(440, 100);
    };

    this.recognition.onresult = (event) => {
      const resultText = event.results[0][0].transcript;
      this.isListening = false;
      if (onResult) onResult(resultText);
    };

    this.recognition.onerror = (event) => {
      this.isListening = false;
      console.error("Erreur de reconnaissance vocale :", event.error);
      if (onError) onError(event.error);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (onEnd) onEnd();
    };

    try {
      this.recognition.start();
    } catch (e) {
      console.error(e);
      this.isListening = false;
      if (onEnd) onEnd();
    }
  }

  // Arrêter d'écouter
  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  // --- INTERPRÉTATION DES COMMANDES VOCALES ---
  
  processCommand(rawText) {
    const text = rawText.toLowerCase().trim();
    console.log("Commande vocale reçue :", text);

    // 1. Commande SOS / ONEA
    if (text.includes("sos") || text.includes("urgence") || text.includes("danger") || text.includes("police") || text.includes("onea") || text.includes("signalement")) {
      return { action: "SOS", arg: null };
    }

    // 2. Commande Appeler un contact
    if (text.includes("appelle") || text.includes("appeler") || text.includes("téléphone à")) {
      // Trouver le nom du contact
      const contact = window.CONTACTS.find(c => {
        const namePart = c.name.split(" ")[0].toLowerCase(); // Ex: fatou
        return text.includes(namePart);
      });
      if (contact) {
        return { action: "CALL", arg: contact };
      } else {
        return { action: "SPEAK", arg: "Je n'ai pas trouvé ce contact dans votre répertoire." };
      }
    }

    // 3. Commande Ouvrir discussion
    if (text.includes("message à") || text.includes("parle à") || text.includes("ouvrir")) {
      const contact = window.CONTACTS.find(c => {
        const namePart = c.name.split(" ")[0].toLowerCase();
        return text.includes(namePart);
      });
      if (contact) {
        return { action: "OPEN_CHAT", arg: contact };
      }
    }

    // 4. Commande Lire les messages
    if (text.includes("lis") || text.includes("lire") || text.includes("message")) {
      return { action: "READ_MESSAGES", arg: null };
    }

    // 5. Commande Assistant
    if (text.includes("assistant") || text.includes("aide") || text.includes("wakatkoom")) {
      return { action: "OPEN_AI", arg: null };
    }

    // 6. Commande Retour
    if (text.includes("retour") || text.includes("fermer") || text.includes("accueil")) {
      return { action: "GO_HOME", arg: null };
    }

    // 7. Réponses d'assistance générique (Assistant WakatKoom)
    if (text.includes("bonjour") || text.includes("salut")) {
      return { action: "SPEAK", arg: "Bonjour ! Comment puis-je vous aider aujourd'hui ? Vous pouvez me dire d'appeler quelqu'un." };
    }
    
    if (text.includes("qui es-tu") || text.includes("ton nom")) {
      return { action: "SPEAK", arg: "Je suis WakatKoom, votre assistant intelligent. Je vous aide à envoyer des messages vocaux et appeler vos proches sans lire ni écrire." };
    }

    if (text.includes("météo") || text.includes("temps")) {
      return { action: "SPEAK", arg: "Il fait beau et chaud à Ouagadougou, environ 35 degrés. C'est une belle journée." };
    }

    // Sinon, réponse d'incompréhension intelligente
    return { 
      action: "SPEAK", 
      arg: "Je n'ai pas tout à fait compris. Dites 'Appelle Maman' ou dites 'SOS' en cas d'urgence." 
    };
  }

  // Utilitaire : Jouer un bip sonore synthétisé avec l'API Web Audio
  playBeep(frequency = 440, durationMs = 150) {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = "sine";

      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + durationMs / 1000);

      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + durationMs / 1000);
    } catch (e) {
      console.warn("Échec de la lecture du bip :", e);
    }
  }

  // Jouer le son de la sirène SOS (alternance de fréquences)
  playSiren(durationSeconds = 3, callback = null) {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.type = "sawtooth";
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      
      // Alterner la fréquence (sirène)
      const startTime = audioCtx.currentTime;
      const endTime = startTime + durationSeconds;
      
      let time = startTime;
      while (time < endTime) {
        osc.frequency.setValueAtTime(600, time);
        osc.frequency.setValueAtTime(900, time + 0.25);
        time += 0.5;
      }
      
      osc.start(startTime);
      osc.stop(endTime);
      
      if (callback) {
        setTimeout(callback, durationSeconds * 1000);
      }
    } catch (e) {
      console.warn(e);
      if (callback) callback();
    }
  }
}

// Exposer globalement
window.WakatKoomVoice = new WakatKoomVoiceManager();
// Pour déclencher le chargement des voix du navigateur tôt
window.speechSynthesis.getVoices();
window.speechSynthesis.onvoiceschanged = () => {
  window.speechSynthesis.getVoices();
};
