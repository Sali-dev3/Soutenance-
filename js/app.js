// Contrôleur principal de l'application WakatKoom
// Gère la navigation, l'initialisation, le SOS et les appels.

class WakatKoomApp {
  constructor() {
    this.currentScreenId = "screen-welcome";
    this.sosTimer = null;
    this.sosSirenInterval = null;
    this.webcamStream = null;
    this.isMuted = false;
    this.isSpeakerOn = false;
  }

  // --- INITIALISATION ---
  init() {
    this.updateClock();
    setInterval(() => this.updateClock(), 60000);

    this.renderContactsGrid();
    this.bindNavigationEvents();
    this.bindSOSEvents();
    this.bindAIEvents();
    this.bindCallEvents();
    this.bindSettingsEvents();
    this.bindHomeVoiceToggle();
    this.bindDrawerEvents();

    // Rendre les icônes Lucide
    lucide.createIcons();
  }

  // Horloge du téléphone
  updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    document.getElementById("status-time").innerText = `${hours}:${minutes}`;
  }

  // --- NAVIGATION ENTRE LES ÉCRANS ---
  navigate(screenId) {
    const screens = document.querySelectorAll(".screen");
    screens.forEach(screen => {
      screen.classList.remove("active");
    });

    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
      targetScreen.classList.add("active");
      this.currentScreenId = screenId;
    }

    // Arrêter la lecture audio en cours lors d'un changement d'écran
    window.WakatKoomVoice.stopSpeaking();
    this.stopWebcam();

    // Vibration tactile d'accessibilité (si cochée)
    if (document.getElementById("setting-vibration").checked) {
      this.triggerVibration();
    }
  }

  // Déclencher le tutoriel vocal adapté à chaque écran
  triggerScreenVoiceGuidance(screenId) {
    const active = document.getElementById("setting-voice-guidance").checked;
    if (!active && screenId !== "screen-welcome") return;

    setTimeout(() => {
      switch (screenId) {
        case "screen-welcome":
          window.WakatKoomVoice.speak(
            "Bienvenue sur WakatKoom, l'application de messagerie vocale intelligente. Touchez le bouton 'Commencer' en bas pour ouvrir l'application.",
            null
          );
          break;
        case "screen-home":
          window.WakatKoomVoice.speak(
            "Écran d'accueil. Touchez la photo d'un contact pour lui envoyer un message, ou touchez le grand bouton en bas à droite pour parler à l'assistant WakatKoom.",
            null
          );
          break;
        case "screen-ai":
          window.WakatKoomVoice.speak(
            "Assistant intelligent de WakatKoom. Appuyez sur le bouton micro bleu en bas de l'écran et posez votre question de vive voix.",
            null
          );
          break;
        case "screen-settings":
          window.WakatKoomVoice.speak(
            "Paramètres. Vous pouvez ici changer la langue de l'application ou activer le guide vocal.",
            null
          );
          break;
      }
    }, 400);
  }

  // Vibration tactile simulée ou réelle
  triggerVibration() {
    if (navigator.vibrate) {
      navigator.vibrate(30); // Petite vibration de 30ms
    }
  }

  // --- ÉVÉNEMENTS DE NAVIGATION ---
  bindNavigationEvents() {
    // Bouton de démarrage (Boot)
    document.getElementById("btn-start-app").addEventListener("click", () => {
      this.navigate("screen-home");
    });

    // Clic sur l'indicateur d'accueil physique du téléphone (Bouton home virtuel)
    document.getElementById("phone-home-button").addEventListener("click", () => {
      if (this.currentScreenId !== "screen-welcome") {
        this.navigate("screen-home");
      }
    });

    // Retour du Chat à l'accueil
    document.getElementById("btn-chat-back").addEventListener("click", () => {
      this.navigate("screen-home");
    });

    // Retour de l'assistant IA à l'accueil
    document.getElementById("btn-ai-back").addEventListener("click", () => {
      this.navigate("screen-home");
    });

    // Accès aux paramètres
    document.getElementById("btn-settings").addEventListener("click", () => {
      this.navigate("screen-settings");
    });

    document.getElementById("btn-settings-back").addEventListener("click", () => {
      this.navigate("screen-home");
    });

    // Alerte notification (simulation)
    document.getElementById("btn-notifications").addEventListener("click", () => {
      this.triggerVibration();
      window.WakatKoomVoice.speak("Vous n'avez aucun nouveau message non lu pour le moment.", null);
    });

    // Bouton profil
    document.getElementById("btn-my-profile").addEventListener("click", () => {
      this.triggerVibration();
      window.WakatKoomVoice.speak("Votre profil. Vous vous appelez Diallo. Votre numéro est le 70 00 00 00.", null);
    });
  }

  // --- GRILL DES CONTACTS DÉCORÉS ---
  renderContactsGrid() {
    const listContainer = document.getElementById("contacts-list");
    listContainer.innerHTML = "";

    window.CONTACTS.forEach(contact => {
      const card = document.createElement("div");
      card.className = "contact-card";
      card.setAttribute("id", `contact-card-${contact.id}`);

      // Création de l'avatar avec badge
      const avatarWrapper = document.createElement("div");
      avatarWrapper.className = "contact-avatar-wrapper";

      const avatar = document.createElement("img");
      avatar.src = contact.avatar;
      avatar.alt = contact.name;
      avatar.className = "contact-avatar";
      
      // Fallback si l'image générée n'est pas encore prête
      avatar.onerror = () => {
        avatar.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(contact.name)}&backgroundColor=2e8b57`;
      };

      avatarWrapper.appendChild(avatar);

      // Simuler des notifications non lues sur le premier contact
      if (contact.id === 1) {
        const badge = document.createElement("div");
        badge.className = "contact-badge-unread";
        badge.innerText = "1";
        avatarWrapper.appendChild(badge);
      }

      const name = document.createElement("h3");
      name.className = "contact-name";
      name.innerText = contact.name;

      const role = document.createElement("span");
      role.className = "contact-role";
      role.innerText = contact.role;

      card.appendChild(avatarWrapper);
      card.appendChild(name);
      card.appendChild(role);

      // Au clic, on ouvre le chat du contact
      card.addEventListener("click", () => {
        window.WakatKoomChat.openConversation(contact);
        this.navigate("screen-chat");
      });

      // Gestion d'un appui long ou clic droit pour annoncer le nom vocalement
      card.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        window.WakatKoomVoice.speak(contact.voiceLabel, null);
      });

      listContainer.appendChild(card);
    });
  }

  // --- LOGIQUE SOS URGENCE ---
  bindSOSEvents() {
    const sosTrigger = document.getElementById("btn-sos-trigger");
    const sosCancel = document.getElementById("btn-sos-cancel");
    const sosBack = document.getElementById("btn-sos-back");
    const locationBtn = document.getElementById("btn-get-location");
    const sosReport = document.getElementById("btn-sos-report");
    const sosExit = document.getElementById("btn-sos-exit");

    sosTrigger.addEventListener("click", () => {
      this.startSOS();
    });

    sosCancel.addEventListener("click", () => {
      this.cancelSOS();
    });

    if (sosBack) {
      sosBack.addEventListener("click", () => {
        this.cancelSOS();
      });
    }

    if (locationBtn) {
      locationBtn.addEventListener("click", () => {
        this.updateCurrentLocation();
      });
    }

    const sosTriggerHome = document.getElementById("btn-sos-trigger-home");
    if (sosTriggerHome) {
      sosTriggerHome.addEventListener("click", () => {
        this.startSOS();
      });
    }

    const sosReturn = document.getElementById("btn-sos-return");
    const sosResolved = document.getElementById("btn-sos-resolved");

    if (sosReport) {
      sosReport.addEventListener("click", () => {
        this.sendWaterCutReport();
      });
    }

    if (sosResolved) {
      sosResolved.addEventListener("click", () => {
        this.markSOSResolved();
      });
    }

    if (sosReturn) {
      sosReturn.addEventListener("click", () => {
        this.navigate("screen-home");
      });
    }

    if (sosExit) {
      sosExit.addEventListener("click", () => {
        this.cancelSOS();
        this.navigate("screen-home");
      });
    }
  }

  startSOS() {
    this.navigate("screen-sos");
    this.updateCurrentLocation();
    
    let countdown = 3;
    const countdownNumber = document.getElementById("sos-countdown-number");
    countdownNumber.innerText = countdown;

    // Lancer les instructions vocales d'alerte
    window.WakatKoomVoice.speak("SOS d'urgence enclenché. Annulez avant la fin du décompte si c'est une erreur.", null);

    // Lancer la sirène à chaque seconde
    window.WakatKoomVoice.playBeep(880, 200);

    this.sosTimer = setInterval(() => {
      countdown--;
      countdownNumber.innerText = countdown;

      if (countdown > 0) {
        window.WakatKoomVoice.playBeep(880, 200);
      } else {
        clearInterval(this.sosTimer);
        this.triggerSOSAlertFinal();
      }
    }, 1000);
  }

  triggerSOSAlertFinal() {
    // Jouer une vraie sirène continue
    window.WakatKoomVoice.playSiren(5);
    
    // Message de détresse envoyé
    window.WakatKoomVoice.speak(
      "SOS activé ! Votre position GPS a été envoyée par SMS d'urgence à la police ainsi qu'à Fatou et Inoussa. L'application reste en veille sonore.", 
      null
    );

    // Vibration longue
    if (navigator.vibrate) {
      navigator.vibrate([500, 250, 500, 250, 500]);
    }

    // Afficher des coordonnées changeantes pour faire réel
    document.getElementById("sos-coordinates").innerText = "Ouagadougou (12.3714° N, 1.5197° W) - SMS Envoyé";
  }

  cancelSOS() {
    clearInterval(this.sosTimer);
    window.WakatKoomVoice.stopSpeaking();
    window.WakatKoomVoice.playBeep(330, 150); // Bip bas pour indiquer l'annulation
    window.WakatKoomVoice.speak("Alerte annulée.", () => {
      this.navigate("screen-home");
    });
  }

  updateCurrentLocation() {
    const coordsEl = document.getElementById("sos-coordinates");
    const mapFrame = document.getElementById("sos-map-iframe");
    if (!coordsEl) return;

    if (!navigator.geolocation) {
      coordsEl.innerText = "Géolocalisation non supportée.";
      window.WakatKoomVoice.speak("La géolocalisation n'est pas disponible sur votre navigateur.", null);
      return;
    }

    coordsEl.innerText = "Obtention de la position…";
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        coordsEl.innerText = `Latitude ${latitude.toFixed(5)}°, Longitude ${longitude.toFixed(5)}°`;
        window.WakatKoomVoice.speak("Position GPS récupérée.", null);
        if (mapFrame) {
          // Compute a bbox delta based on accuracy (meters -> degrees). 1 deg ~ 111.32 km
          const accuracyMeters = accuracy || 50; // fallback
          const metersToDeg = (m) => m / 111320;
          // use a slightly larger bbox than accuracy to provide context
          let delta = Math.max(metersToDeg(accuracyMeters) * 1.6, 0.0015);
          // clamp delta to reasonable zoom levels
          delta = Math.min(Math.max(delta, 0.0015), 0.05);

          const left = longitude - delta;
          const right = longitude + delta;
          const bottom = latitude - delta;
          const top = latitude + delta;

          // Encode marker as lat,lon
          const marker = encodeURIComponent(`${latitude},${longitude}`);
          const src = `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${marker}`;
          mapFrame.src = src;
        }
      },
      (error) => {
        coordsEl.innerText = "Position introuvable.";
        window.WakatKoomVoice.speak("Impossible de récupérer la position. Vérifiez que vous avez autorisé la géolocalisation.", null);
        console.warn("Erreur géolocalisation :", error);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }

  sendWaterCutReport() {
    const coordsEl = document.getElementById("sos-coordinates");
    if (!navigator.geolocation) {
      coordsEl.innerText = "Géolocalisation non supportée.";
      window.WakatKoomVoice.speak("La géolocalisation n'est pas disponible sur votre navigateur.", null);
      return;
    }

    coordsEl.innerText = "Envoi du signalement à ONEA…";
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        coordsEl.innerText = `Signalement envoyé : ${latitude.toFixed(5)}°, ${longitude.toFixed(5)}°`;
        window.WakatKoomVoice.speak("Le signalement de la coupure d'eau a été envoyé à ONEA. Ils vont traiter la panne.", null);
        this.showToastMessage("Signalement envoyé à ONEA.");
        const confirmationPanel = document.getElementById("sos-confirmation-panel");
        const reportButton = document.getElementById("btn-sos-report");
        if (reportButton) {
          reportButton.disabled = true;
          reportButton.style.opacity = "0.6";
          reportButton.style.cursor = "not-allowed";
        }
        if (confirmationPanel) {
          confirmationPanel.hidden = false;
          confirmationPanel.classList.remove('show');
          const resolvedBtn = document.getElementById("btn-sos-resolved");
          const confirmationText = document.getElementById("sos-confirmation-text");
          if (resolvedBtn) {
            resolvedBtn.hidden = false;
          }
          if (confirmationText) {
            confirmationText.innerText = "Votre signalement a bien été reçu par ONEA. Appuyez sur 'Panne résolue' lorsque le service vous confirme la réparation.";
          }
        }
      },
      (error) => {
        coordsEl.innerText = "Envoi impossible.";
        window.WakatKoomVoice.speak("Impossible d'envoyer le signalement sans localisation. Activez votre GPS.", null);
        console.warn("Erreur géolocalisation pour envoi :", error);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }

  showToastMessage(message) {
    let toast = document.getElementById("app-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "app-toast";
      toast.className = "app-toast";
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("visible");
    setTimeout(() => {
      toast.classList.remove("visible");
    }, 3000);
  }

  markSOSResolved() {
    const confirmationText = document.getElementById("sos-confirmation-text");
    const sosResolved = document.getElementById("btn-sos-resolved");
    if (confirmationText) {
      confirmationText.innerText = "Merci. La panne est marquée comme résolue. ONEA a bien pris en compte la confirmation de réparation.";
    }
    if (sosResolved) {
      sosResolved.disabled = true;
      sosResolved.style.opacity = "0.6";
      sosResolved.style.cursor = "not-allowed";
    }
    this.showToastMessage("Panne résolue confirmée.");
    window.WakatKoomVoice.speak("La panne a été résolue. Merci de votre confirmation.", null);
  }

  // --- LOGIQUE ASSISTANT IA ---
  bindAIEvents() {
    const aiTrigger = document.getElementById("btn-ai-trigger");
    const aiMicBtn = document.getElementById("btn-ai-mic");
    const aiResponseText = document.getElementById("ai-response-text");
    const userSpeechText = document.getElementById("ai-user-speech-text");
    const aiAvatar = document.getElementById("ai-avatar-element").parentElement;

    aiTrigger.addEventListener("click", () => {
      this.navigate("screen-ai");
    });

    // Clic sur le micro de l'IA
    aiMicBtn.addEventListener("click", () => {
      if (aiMicBtn.classList.contains("listening")) {
        window.WakatKoomVoice.stopListening();
      } else {
        aiMicBtn.classList.add("listening");
        document.getElementById("ai-mic-label").innerText = "Je vous écoute...";
        userSpeechText.innerText = "";
        aiAvatar.classList.add("speaking"); // Faire pulser le ring

        window.WakatKoomVoice.startListening(
          // Résultat
          (speechText) => {
            userSpeechText.innerText = `« ${speechText} »`;
            
            // Traiter la commande
            const command = window.WakatKoomVoice.processCommand(speechText);
            this.executeAICommand(command, aiResponseText);
          },
          // Fin
          () => {
            aiMicBtn.classList.remove("listening");
            document.getElementById("ai-mic-label").innerText = "Appuyez et parlez";
            aiAvatar.classList.remove("speaking");
          },
          // Erreur
          (err) => {
            aiResponseText.innerText = "Désolé, je n'ai pas pu vous entendre. Réessayez.";
            window.WakatKoomVoice.speak("Je n'ai pas entendu. Réessayez.", null);
          }
        );
      }
    });

    // Connecter les chips de suggestion vocale
    const chips = document.querySelectorAll(".suggestion-chip");
    chips.forEach(chip => {
      chip.addEventListener("click", () => {
        const cmd = chip.getAttribute("data-command");
        userSpeechText.innerText = `« ${cmd} »`;
        const command = window.WakatKoomVoice.processCommand(cmd);
        this.executeAICommand(command, aiResponseText);
      });
    });
  }

  executeAICommand(command, responseTextContainer) {
    const aiAvatar = document.getElementById("ai-avatar-element").parentElement;
    
    switch (command.action) {
      case "SOS":
        this.startSOS();
        break;
        
      case "CALL":
        this.navigate("screen-home"); // Reset screen state
        setTimeout(() => {
          this.startCall(command.arg, false);
        }, 300);
        break;

      case "OPEN_CHAT":
        window.WakatKoomChat.openConversation(command.arg);
        this.navigate("screen-chat");
        break;

      case "READ_MESSAGES":
        // Si on est dans un chat
        if (this.currentScreenId === "screen-chat" && window.WakatKoomChat.activeContact) {
          const msgs = window.WakatKoomChat.getSavedMessages(window.WakatKoomChat.activeContact.id);
          const themMsgs = msgs.filter(m => m.sender === "them");
          if (themMsgs.length > 0) {
            const lastMsg = themMsgs[themMsgs.length - 1];
            window.WakatKoomVoice.speak(`Le dernier message de ${window.WakatKoomChat.activeContact.name} est : ${lastMsg.text}`, null);
            responseTextContainer.innerText = `Lecture du message de ${window.WakatKoomChat.activeContact.name}.`;
          } else {
            window.WakatKoomVoice.speak("Vous n'avez pas reçu de messages dans cette discussion.", null);
          }
        } else {
          // Sinon lire le tout dernier message général
          window.WakatKoomVoice.speak("Vous avez un nouveau message de Maman. Elle dit : Bonjour mon fils, as-tu pris mes médicaments ?", null);
          responseTextContainer.innerText = "Lecture du nouveau message de Fatou (Maman).";
        }
        break;

      case "GO_HOME":
        this.navigate("screen-home");
        break;

      case "OPEN_AI":
        this.navigate("screen-ai");
        break;

      case "SPEAK":
      default:
        responseTextContainer.innerText = command.arg;
        aiAvatar.classList.add("speaking");
        window.WakatKoomVoice.speak(command.arg, () => {
          aiAvatar.classList.remove("speaking");
        });
        break;
    }
  }

  // --- LOGIQUE D'APPEL DIRECTS (VOIX & VIDÉO) ---
  bindCallEvents() {
    // Boutons de déclenchement dans l'en-tête du chat
    document.getElementById("btn-chat-call").addEventListener("click", () => {
      if (window.WakatKoomChat.activeContact) {
        this.startCall(window.WakatKoomChat.activeContact, false);
      }
    });

    document.getElementById("btn-chat-video").addEventListener("click", () => {
      if (window.WakatKoomChat.activeContact) {
        this.startCall(window.WakatKoomChat.activeContact, true);
      }
    });

    const callBack = document.getElementById("btn-call-back");
    if (callBack) {
      callBack.addEventListener("click", () => {
        this.hangupCall();
      });
    }

    // Contrôles de l'appel
    document.getElementById("btn-call-hangup").addEventListener("click", () => {
      this.hangupCall();
    });

    const muteBtn = document.getElementById("btn-call-mute");
    muteBtn.addEventListener("click", () => {
      this.isMuted = !this.isMuted;
      muteBtn.classList.toggle("active", this.isMuted);
      this.triggerVibration();
    });

    const speakerBtn = document.getElementById("btn-call-speaker");
    speakerBtn.addEventListener("click", () => {
      this.isSpeakerOn = !this.isSpeakerOn;
      speakerBtn.classList.toggle("active", this.isSpeakerOn);
      this.triggerVibration();
    });
  }

  startCall(contact, isVideo) {
    this.navigate("screen-call");
    
    // Init infos contact
    document.getElementById("call-contact-avatar").src = contact.avatar;
    document.getElementById("call-contact-avatar").onerror = () => {
      document.getElementById("call-contact-avatar").src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(contact.name)}`;
    };
    document.querySelectorAll("#call-contact-name").forEach(el => el.innerText = contact.name);
    
    const statusLabel = document.getElementById("call-status-label");
    statusLabel.innerText = isVideo ? "Appel vidéo en cours..." : "Appel vocal en cours...";

    const videoBox = document.getElementById("video-preview");

    if (isVideo) {
      videoBox.classList.add("active");
      // Essayer d'allumer la webcam du PC pour l'effet "Wow"
      this.startWebcam(videoBox);
    } else {
      videoBox.classList.remove("active");
    }

    // Jouer une tonalité de sonnerie
    this.playRingTone();

    // Simuler le décrochage du contact après 2.5 secondes
    this.callTimer = setTimeout(() => {
      statusLabel.innerText = "Connecté (00:01)";
      window.WakatKoomVoice.speak(`Appel connecté avec ${contact.name.split(" ")[0]}.`, null);

      // Démarrer le chronomètre d'appel
      let durationSec = 1;
      this.callClock = setInterval(() => {
        durationSec++;
        const mins = String(Math.floor(durationSec / 60)).padStart(2, '0');
        const secs = String(durationSec % 60).padStart(2, '0');
        statusLabel.innerText = `${mins}:${secs}`;
      }, 1000);

      // Message vocal du contact après décrochage
      setTimeout(() => {
        const greeting = contact.gender === "female" 
          ? "Allô bonjour mon fils, comment tu vas ? C'est maman." 
          : "Allô bonjour l'ami, comment ça se passe ? C'est Moussa.";
        window.WakatKoomVoice.speak(greeting, null);
      }, 1500);

    }, 2500);
  }

  playRingTone() {
    // Tonalité de sonnerie synthétisée
    let ringsCount = 0;
    this.ringInterval = setInterval(() => {
      window.WakatKoomVoice.playBeep(425, 800); // 425Hz sonnerie classique
      ringsCount++;
      if (ringsCount >= 4) {
        clearInterval(this.ringInterval);
      }
    }, 2000);
  }

  hangupCall() {
    clearTimeout(this.callTimer);
    clearInterval(this.callClock);
    clearInterval(this.ringInterval);
    
    window.WakatKoomVoice.stopSpeaking();
    this.stopWebcam();
    
    window.WakatKoomVoice.playBeep(330, 200); // Bip de fermeture

    // Retour au chat
    this.navigate("screen-chat");
  }

  startWebcam(videoContainer) {
    // Supprimer l'ancienne balise vidéo s'il y en a une
    const oldVideo = videoContainer.querySelector("video");
    if (oldVideo) videoContainer.removeChild(oldVideo);

    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then(stream => {
        this.webcamStream = stream;
        
        const videoElement = document.createElement("video");
        videoElement.srcObject = stream;
        videoElement.autoplay = true;
        videoElement.playsInline = true;
        videoElement.style.width = "100%";
        videoElement.style.height = "100%";
        videoElement.style.objectFit = "cover";
        videoElement.style.position = "absolute";
        videoElement.style.top = "0";
        videoElement.style.left = "0";
        
        videoContainer.appendChild(videoElement);
      })
      .catch(err => {
        console.warn("Impossible d'allumer la webcam :", err);
      });
  }

  stopWebcam() {
    if (this.webcamStream) {
      this.webcamStream.getTracks().forEach(track => track.stop());
      this.webcamStream = null;
    }
  }

  // --- PARAMÈTRES & ACCESSIBILITÉ ---
  bindSettingsEvents() {
    // Gestion du clic sur les options de langue locale
    const items = document.querySelectorAll(".setting-item");
    items.forEach(item => {
      item.addEventListener("click", () => {
        items.forEach(el => el.classList.remove("active"));
        item.classList.add("active");
        this.triggerVibration();

        const lang = item.getAttribute("data-lang");
        const langName = item.querySelector("span").innerText;

        window.WakatKoomVoice.speak(`Langue changée en ${langName}.`, null);
      });
    });

    // Switches
    document.getElementById("setting-voice-guidance").addEventListener("change", (e) => {
      this.triggerVibration();
      window.WakatKoomVoice.voiceGuidanceEnabled = e.target.checked;
      
      const text = e.target.checked ? "Guide vocal activé" : "Guide vocal désactivé";
      window.WakatKoomVoice.speak(text, null);
    });

    document.getElementById("setting-vibration").addEventListener("change", (e) => {
      this.triggerVibration();
    });
  }

  bindHomeVoiceToggle() {
    const homeVoiceToggle = document.getElementById("home-voice-assistant-toggle");
    if (!homeVoiceToggle) return;

    homeVoiceToggle.checked = window.WakatKoomVoice.voiceAssistantEnabled;
    homeVoiceToggle.addEventListener("change", (e) => {
      const enabled = e.target.checked;
      window.WakatKoomVoice.voiceAssistantEnabled = enabled;
      this.triggerVibration();
      this.showToastMessage(enabled ? "Assistant vocal activé" : "Assistant vocal désactivé");
      if (enabled) {
        window.WakatKoomVoice.speak("Assistant vocal activé", null, 'fr-FR', true);
      }
    });
  }

  // --- PRÉSENTATION DRAWER ---
  bindDrawerEvents() {
    const drawer = document.getElementById("info-drawer");
    const toggle = document.getElementById("drawer-toggle");

    toggle.addEventListener("click", () => {
      drawer.classList.toggle("collapsed");
    });

    // Commencer effondré
    drawer.classList.add("collapsed");
  }
}

// Exposer globalement et initialiser
window.WakatKoom = new WakatKoomApp();
document.addEventListener("DOMContentLoaded", () => {
  window.WakatKoom.init();
});
