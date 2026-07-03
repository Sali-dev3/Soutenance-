// Gestion du Chat et de l'enregistrement des messages vocaux
// Intègre MediaRecorder pour enregistrer du vrai son et la synthèse vocale pour lire.

class WakatKoomChatManager {
  constructor() {
    this.activeContact = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
    this.recordStartTime = 0;
    this.recordTimerInterval = null;
    
    // Pour retenir la langue de traduction active par message
    // Structure : { messageId: 'moore' | 'dioula' | 'fulfulde' | 'en' | null }
    this.activeTranslations = {};
  }

  // Initialiser les événements du chat
  init() {
    const recordBtn = document.getElementById("btn-record-message");
    
    // Gérer l'enregistrement vocal (Appui long / Clic)
    // Nous supportons le clic simple (Toggle) pour la simplicité sur ordinateur
    // Et l'appui long (mousedown/mouseup, touchstart/touchend) pour l'effet mobile
    
    let pressTimer;
    
    const startRec = (e) => {
      e.preventDefault();
      if (this.isRecording) return;
      
      this.isRecording = true;
      recordBtn.classList.add("recording");
      document.getElementById("recording-overlay").classList.add("active");
      
      this.startAudioRecording();
    };

    const stopRec = (e) => {
      e.preventDefault();
      if (!this.isRecording) return;
      
      this.isRecording = false;
      recordBtn.classList.remove("recording");
      document.getElementById("recording-overlay").classList.remove("active");
      
      this.stopAudioRecording();
    };

    // Mousedown / Touchstart
    recordBtn.addEventListener("mousedown", startRec);
    recordBtn.addEventListener("touchstart", startRec, { passive: false });

    // Mouseup / Touchend
    recordBtn.addEventListener("mouseup", stopRec);
    recordBtn.addEventListener("mouseleave", stopRec);
    recordBtn.addEventListener("touchend", stopRec, { passive: false });
  }

  // Ouvrir une conversation
  openConversation(contact) {
    this.activeContact = contact;
    this.activeTranslations = {}; // Reset translations for this screen

    // Mettre à jour l'en-tête du chat
    document.getElementById("chat-contact-name").innerText = contact.name;
    document.getElementById("chat-contact-img").src = contact.avatar;

    // Charger les messages
    this.renderMessages();

    // Petit guide vocal d'entrée dans le chat
    window.WakatKoomVoice.speak(
      `Discussion avec ${contact.name}. Pour écouter un message, appuyez sur le bouton vert à côté. Pour répondre, maintenez le grand micro vert en bas.`,
      null
    );
  }

  // Afficher les messages dans le flux
  renderMessages() {
    const container = document.getElementById("chat-messages");
    container.innerHTML = "";

    if (!this.activeContact) return;

    // Charger les messages (depuis le local storage ou mock-data)
    const messages = this.getSavedMessages(this.activeContact.id);

    messages.forEach(msg => {
      const bubble = document.createElement("div");
      bubble.className = `message-bubble ${msg.sender}`;
      bubble.id = `msg-${msg.id}`;

      // 1. Lecteur audio
      const audioPlayer = document.createElement("div");
      audioPlayer.className = "message-audio-player";

      const playBtn = document.createElement("button");
      playBtn.className = "btn-play-voice";
      playBtn.innerHTML = '<i data-lucide="play"></i>';
      
      // Gérer la lecture vocale
      playBtn.addEventListener("click", () => {
        this.playMessageVoice(msg, playBtn);
      });

      const wave = document.createElement("div");
      wave.className = "audio-wave-visualizer";
      // Créer de fausses barres d'ondes
      for (let i = 0; i < 15; i++) {
        const bar = document.createElement("span");
        bar.className = "wave-bar-static";
        // Hauteur aléatoire pour l'esthétique
        const height = Math.floor(Math.random() * 80) + 20;
        bar.style.transform = `scaleY(${height / 100})`;
        wave.appendChild(bar);
      }

      const duration = document.createElement("span");
      duration.className = "audio-duration";
      duration.innerText = msg.duration || "0:05";

      audioPlayer.appendChild(playBtn);
      audioPlayer.appendChild(wave);
      audioPlayer.appendChild(duration);
      bubble.appendChild(audioPlayer);

      // 2. Transcription textuelle (avec toggle translation)
      const transcript = document.createElement("div");
      transcript.className = "message-transcription";
      
      const lang = this.activeTranslations[msg.id];
      if (lang && msg.translations && msg.translations[lang]) {
        // Afficher la traduction
        transcript.innerHTML = `
          <div class="translation-container">
            <span class="translation-text">${msg.translations[lang]}</span>
            <button class="btn-translate-bubble" id="btn-trans-${msg.id}">
              <i data-lucide="globe"></i> FR
            </button>
          </div>
        `;
      } else {
        // Afficher le français d'origine
        transcript.innerText = msg.text;
        
        // Si c'est un message reçu qui possède des traductions locales
        if (msg.sender === "them" && msg.translations) {
          const transBtnContainer = document.createElement("div");
          transBtnContainer.style.display = "flex";
          transBtnContainer.style.justifyContent = "flex-end";
          transBtnContainer.style.marginTop = "6px";

          const transBtn = document.createElement("button");
          transBtn.className = "btn-translate-bubble";
          transBtn.innerHTML = '<i data-lucide="globe"></i> Traduire';
          
          transBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            this.showTranslationOptions(msg);
          });
          
          transBtnContainer.appendChild(transBtn);
          transcript.appendChild(transBtnContainer);
        }
      }

      // Gérer le retour vers le français
      const frBtn = transcript.querySelector(`#btn-trans-${msg.id}`);
      if (frBtn) {
        frBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          this.activeTranslations[msg.id] = null;
          this.renderMessages();
        });
      }

      bubble.appendChild(transcript);

      // 3. Metadata (heure)
      const meta = document.createElement("div");
      meta.className = "message-meta";
      meta.innerText = msg.timestamp;
      bubble.appendChild(meta);

      container.appendChild(bubble);
    });

    // Scroller vers le bas
    container.scrollTop = container.scrollHeight;
    
    // Rendre les icônes Lucide
    lucide.createIcons();
  }

  // --- LECTURE AUDIO DES MESSAGES ---
  playMessageVoice(msg, playBtn) {
    const icon = playBtn.querySelector("i");
    
    // Si c'est un enregistrement local (Blob URL)
    if (msg.audioUrl) {
      const audio = new Audio(msg.audioUrl);
      
      playBtn.innerHTML = '<i data-lucide="square"></i>';
      lucide.createIcons();
      
      audio.play();
      
      // Animer l'onde
      const waveBars = playBtn.parentElement.querySelectorAll(".wave-bar-static");
      const animInterval = setInterval(() => {
        waveBars.forEach(bar => {
          const scale = Math.random() * 1.5 + 0.2;
          bar.style.transform = `scaleY(${scale})`;
        });
      }, 100);

      audio.onended = () => {
        clearInterval(animInterval);
        playBtn.innerHTML = '<i data-lucide="play"></i>';
        lucide.createIcons();
        waveBars.forEach(bar => {
          bar.style.transform = `scaleY(0.5)`;
        });
      };
      return;
    }

    // Sinon, on simule en lisant la transcription textuelle via TTS
    let textToSpeak = msg.text;
    let speakLang = 'fr-FR';

    // Si une traduction locale est active pour ce message, on lit la traduction
    const activeLang = this.activeTranslations[msg.id];
    if (activeLang && msg.translations && msg.translations[activeLang]) {
      textToSpeak = msg.translations[activeLang];
      // Note: Mooré/Dioula n'ont pas de synthétiseurs natifs dans la plupart des navigateurs.
      // Nous lisons avec une vitesse lente et une tonalité standard, ce qui sonne phonétiquement compréhensible.
    }

    playBtn.innerHTML = '<i data-lucide="volume-2" class="pulse"></i>';
    lucide.createIcons();

    // Animer l'onde
    const waveBars = playBtn.parentElement.querySelectorAll(".wave-bar-static");
    const animInterval = setInterval(() => {
      waveBars.forEach(bar => {
        const scale = Math.random() * 1.5 + 0.2;
        bar.style.transform = `scaleY(${scale})`;
      });
    }, 100);

    window.WakatKoomVoice.speak(textToSpeak, () => {
      clearInterval(animInterval);
      playBtn.innerHTML = '<i data-lucide="play"></i>';
      lucide.createIcons();
      waveBars.forEach(bar => {
        bar.style.transform = `scaleY(0.5)`;
      });
    }, speakLang);
  }

  // --- TRADUCTION DES MESSAGES ---
  showTranslationOptions(msg) {
    // Synthétiser vocalement le choix des langues
    window.WakatKoomVoice.speak("Choisissez une langue de traduction : Mooré, Dioula, Fulfuldé ou Anglais.", null);
    
    // Créer une alerte/dialogue élégante pour le choix de la langue locale
    const overlay = document.createElement("div");
    overlay.className = "call-overlay-bg";
    overlay.style.zIndex = "1500";
    overlay.style.display = "flex";
    overlay.style.justifyContent = "center";
    overlay.style.alignItems = "center";

    const dialog = document.createElement("div");
    dialog.className = "ai-dialog-box";
    dialog.style.width = "280px";
    dialog.style.display = "flex";
    dialog.style.flexDirection = "column";
    dialog.style.gap = "12px";
    dialog.style.pointerEvents = "auto";

    const title = document.createElement("h3");
    title.innerText = "Traduire en :";
    title.style.color = "#FFFFFF";
    title.style.marginBottom = "8px";
    dialog.appendChild(title);

    const languages = [
      { code: 'moore', label: 'Mooré (Mossi)' },
      { code: 'dioula', label: 'Dioula (Bambara)' },
      { code: 'fulfulde', label: 'Fulfuldé (Peul)' },
      { code: 'english', label: 'English (Anglais)' }
    ];

    languages.forEach(lang => {
      const btn = document.createElement("button");
      btn.className = "suggestion-chip";
      btn.style.width = "100%";
      btn.innerHTML = `<i data-lucide="languages"></i> ${lang.label}`;
      btn.addEventListener("click", () => {
        this.activeTranslations[msg.id] = lang.code;
        document.body.removeChild(overlay);
        this.renderMessages();
        // Lire la traduction directement après sélection
        setTimeout(() => {
          const bubble = document.getElementById(`msg-${msg.id}`);
          if (bubble) {
            const playBtn = bubble.querySelector(".btn-play-voice");
            if (playBtn) playBtn.click();
          }
        }, 300);
      });
      dialog.appendChild(btn);
    });

    // Bouton retour/annuler
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "btn-sos-cancel";
    cancelBtn.style.padding = "10px";
    cancelBtn.innerText = "Fermer";
    cancelBtn.addEventListener("click", () => {
      document.body.removeChild(overlay);
    });
    dialog.appendChild(cancelBtn);

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    lucide.createIcons();
  }

  // --- ENREGISTREMENT AUDIO RÉEL ---
  startAudioRecording() {
    this.audioChunks = [];
    
    // Démarre le chronomètre
    this.recordStartTime = Date.now();
    const timerElem = document.getElementById("recording-timer");
    timerElem.innerText = "00:00";
    
    this.recordTimerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.recordStartTime) / 1000);
      const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
      const secs = String(elapsed % 60).padStart(2, '0');
      timerElem.innerText = `${mins}:${secs}`;
    }, 1000);

    // Initialiser le microphone réel du PC
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        this.mediaRecorder = new MediaRecorder(stream);
        this.mediaRecorder.ondataavailable = (event) => {
          this.audioChunks.push(event.data);
        };
        
        this.mediaRecorder.onstop = () => {
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
          const audioUrl = URL.createObjectURL(audioBlob);
          const elapsedSecs = Math.floor((Date.now() - this.recordStartTime) / 1000);
          
          this.saveRecordedMessage(audioUrl, elapsedSecs);
        };

        this.mediaRecorder.start();
      })
      .catch(err => {
        console.warn("Accès micro refusé ou indisponible, enregistrement simulé :", err);
      });
  }

  stopAudioRecording() {
    clearInterval(this.recordTimerInterval);
    
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
      // Arrête tous les flux micro pour éteindre le voyant d'enregistrement
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
    } else {
      // Simulation si pas de micro disponible
      const elapsedSecs = Math.floor((Date.now() - this.recordStartTime) / 1000);
      this.saveRecordedMessage(null, elapsedSecs || 3);
    }
  }

  // --- SAUVEGARDE ET SIMULATION DE TRANCRIPTION D'ENVOI ---
  saveRecordedMessage(audioUrl, durationSeconds) {
    if (!this.activeContact) return;

    const formattedDuration = `0:${String(durationSeconds).padStart(2, '0')}`;
    
    // Simuler la transcription voix vers texte (Web Speech Recognition en direct peut être utilisé)
    // Nous simulons un message vocal de l'utilisateur avec un texte descriptif
    const userText = "Message vocal envoyé (Bonjour, je vous envoie cette note vocale)";

    const newMsg = {
      id: Date.now(),
      sender: "me",
      type: "voice",
      audioUrl: audioUrl, // Contiendra le vrai son s'il a été enregistré
      text: userText,
      duration: formattedDuration,
      timestamp: "À l'instant"
    };

    // Sauvegarder dans LocalStorage
    this.appendMessage(this.activeContact.id, newMsg);
    this.renderMessages();

    // Simulation d'une réponse automatique de l'interlocuteur après 2.5 secondes
    setTimeout(() => {
      this.simulateContactResponse();
    }, 2500);
  }

  simulateContactResponse() {
    if (!this.activeContact) return;

    const responses = [
      {
        text: "D'accord, j'ai bien reçu votre message vocal. Je fais ça tout de suite !",
        translations: {
          moore: "N-yẽ, m paama yãmb koẽgã. M na n maane sãan-sãan !",
          dioula: "Awa, n ka i ka kuma mɛn. N bé o kɛ sisan sisan !",
          fulfulde: "Ayyoo, mi hebi nelde ma. Mi waɗan ɗum jooni jooni !",
          english: "Okay, I received your voice message. I will do it right away!"
        }
      },
      {
        text: "Merci pour le message. On se rappelle ce soir pour en discuter plus longuement.",
        translations: {
          moore: "Bark wusgo ne koẽgã. Tɩ na n boond taaba zaabre n paas n sɩnge yel-kẽndã.",
          dioula: "Baraji n ka kuma ye. An bé sogoma firi suru la ka kuma a kan ko gniin.",
          fulfulde: "Abaraka e nelde nden. En noddan jemma ngam haala hebi yaade yeeso.",
          english: "Thank you for the message. We'll talk tonight to discuss it further."
        }
      }
    ];

    // Choisir une réponse au hasard
    const chosen = responses[Math.floor(Math.random() * responses.length)];

    const responseMsg = {
      id: Date.now() + 1,
      sender: "them",
      type: "voice",
      text: chosen.text,
      translations: chosen.translations,
      duration: "0:06",
      timestamp: "À l'instant"
    };

    this.appendMessage(this.activeContact.id, responseMsg);
    this.renderMessages();

    // Lire automatiquement le message si l'option est activée
    const autoRead = document.getElementById("setting-auto-read").checked;
    if (autoRead) {
      // Petite alerte vibrante / sonore
      window.WakatKoomVoice.playBeep(520, 200);
      
      setTimeout(() => {
        // Cliquer sur le play du dernier message reçu
        const bubbles = document.querySelectorAll(".message-bubble.them");
        if (bubbles.length > 0) {
          const lastBubble = bubbles[bubbles.length - 1];
          const playBtn = lastBubble.querySelector(".btn-play-voice");
          if (playBtn) playBtn.click();
        }
      }, 500);
    }
  }

  // --- PERSISTANCE LOCAL STORAGE ---
  getSavedMessages(contactId) {
    const key = `wakatkoom_msgs_contact_${contactId}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      return JSON.parse(saved);
    }
    
    // Sinon, charger depuis la base mockée
    const contact = window.CONTACTS.find(c => c.id === contactId);
    return contact ? contact.messages : [];
  }

  appendMessage(contactId, message) {
    const key = `wakatkoom_msgs_contact_${contactId}`;
    const messages = this.getSavedMessages(contactId);
    messages.push(message);
    localStorage.setItem(key, JSON.stringify(messages));
  }
}

// Exposer globalement
window.WakatKoomChat = new WakatKoomChatManager();
document.addEventListener("DOMContentLoaded", () => {
  window.WakatKoomChat.init();
});
