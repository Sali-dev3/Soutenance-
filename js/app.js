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
    this.homeAlertActive = false;
    this.currentCoordinates = null;
    this.currentAddress = null;
    this.currentCity = "Ouagadougou";
    this.sosMap = null;
    this.sosMarker = null;
    this.sosAudioBlob = null;
    this.sosPhotoFile = null;
    this.sosMediaRecorder = null;
    this.sosMediaStream = null;
    this.sosMediaChunks = [];
    this.isSosRecording = false;
  }

  // --- INITIALISATION ---
  init() {
    this.updateClock();
    setInterval(() => this.updateClock(), 60000);

    this.renderHomeDashboard();
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
            "Écran d'accueil. Choisissez une grande carte pour envoyer un message vocal, ouvrir l'assistant, signaler une coupure d'eau ou accéder aux paramètres.",
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

  // --- TABLEAU DE BORD D'ACCUEIL ACCESSIBLE ---
  renderHomeDashboard() {
    const listContainer = document.getElementById("home-dashboard-grid");
    if (!listContainer) return;

    const actions = [
      {
        id: "voice",
        title: "Envoyer un message vocal",
        description: "Ouvre directement l'enregistrement vocal.",
        icon: "mic",
        variant: "voice",
        badge: null,
        onClick: () => {
          const contact = window.CONTACTS.find(item => item.id === 1) || window.CONTACTS[0];
          window.WakatKoomChat.openConversation(contact);
          this.navigate("screen-chat");
          window.WakatKoomVoice.speak("Appuyez pour enregistrer votre message vocal.", null);
        }
      },
      {
        id: "assistant",
        title: "Assistant vocal IA",
        description: "Suggestions vocales et avatar animé.",
        icon: "bot",
        variant: "assistant",
        badge: null,
        onClick: () => {
          this.navigate("screen-ai");
          window.WakatKoomVoice.speak("Assistant vocal activé. Dites simplement ce que vous voulez faire.", null);
        }
      },
      {
        id: "sos",
        title: "Signaler une coupure d'eau",
        description: "Accès rapide au module ONEA et au GPS.",
        icon: "droplets",
        variant: "sos",
        badge: this.homeAlertActive ? "●" : null,
        onClick: () => {
          this.startSOS();
        }
      },
      {
        id: "position",
        title: "Ma position",
        description: "Carte OpenStreetMap et géolocalisation.",
        icon: "map-pin",
        variant: "position",
        badge: null,
        onClick: () => {
          this.navigate("screen-sos");
          this.updateCurrentLocation();
          window.WakatKoomVoice.speak("Votre position actuelle est affichée sur la carte.", null);
        }
      },
      {
        id: "messages",
        title: "Écouter mes messages",
        description: "Lecture automatique des messages vocaux reçus.",
        icon: "play-circle",
        variant: "messages",
        badge: null,
        onClick: () => {
          const contact = window.CONTACTS.find(item => item.id === 1) || window.CONTACTS[0];
          window.WakatKoomChat.openConversation(contact);
          this.navigate("screen-chat");
          const lastReceived = contact.messages.filter(msg => msg.sender === "them").slice(-1)[0];
          if (lastReceived) {
            window.WakatKoomVoice.speak(`Vous avez un nouveau message de ${contact.name}. ${lastReceived.text}`, null);
          }
        }
      },
      {
        id: "language",
        title: "Changer la langue",
        description: "Français, Mooré, Dioula, Fulfuldé et English.",
        icon: "languages",
        variant: "language",
        badge: null,
        onClick: () => {
          this.navigate("screen-settings");
          window.WakatKoomVoice.speak("Choisissez votre langue préférée.", null);
        }
      },
      {
        id: "call",
        title: "Appel vocal",
        description: "Lance rapidement un appel vocal simplifié.",
        icon: "phone",
        variant: "call",
        badge: null,
        onClick: () => {
          const contact = window.CONTACTS.find(item => item.id === 1) || window.CONTACTS[0];
          this.startCall(contact, false);
        }
      },
      {
        id: "settings",
        title: "Paramètres",
        description: "Accessibilité, taille, vibrations et synthèse vocale.",
        icon: "sliders",
        variant: "settings",
        badge: null,
        onClick: () => {
          this.navigate("screen-settings");
          window.WakatKoomVoice.speak("Paramètres d'accessibilité et de confort.", null);
        }
      }
    ];

    listContainer.innerHTML = "";

    actions.forEach(action => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = `dashboard-card dashboard-card--${action.variant}`;
      card.setAttribute("aria-label", action.title);

      card.innerHTML = `
        <div class="dashboard-card-icon">
          <i data-lucide="${action.icon}"></i>
        </div>
        <div class="dashboard-card-content">
          <h3>${action.title}</h3>
          <p>${action.description}</p>
        </div>
        ${action.badge ? `<span class="dashboard-card-badge is-active">${action.badge}</span>` : ""}
      `;

      card.addEventListener("click", () => {
        this.triggerVibration();
        action.onClick();
      });

      listContainer.appendChild(card);
    });

    lucide.createIcons();
  }

  // --- LOGIQUE SOS URGENCE ---
  bindSOSEvents() {
    const sosTrigger = document.getElementById("btn-sos-trigger");
    const sosCancel = document.getElementById("btn-sos-cancel");
    const sosBack = document.getElementById("btn-sos-back");
    const locationBtn = document.getElementById("btn-get-location");
    const sosReport = document.getElementById("btn-sos-report");
    const sosExit = document.getElementById("btn-sos-exit");
    const recordBtn = document.getElementById("btn-sos-record");
    const photoBtn = document.getElementById("btn-sos-photo");
    const photoInput = document.getElementById("sos-photo-input");

    this.initLeafletMap();

    if (sosTrigger) {
      sosTrigger.addEventListener("click", () => {
        this.startSOS();
      });
    }

    if (sosCancel) {
      sosCancel.addEventListener("click", () => {
        this.cancelSOS();
      });
    }

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

    if (recordBtn) {
      recordBtn.addEventListener("click", () => {
        this.toggleSosRecording(recordBtn);
      });
    }

    if (photoBtn && photoInput) {
      photoBtn.addEventListener("click", () => {
        photoInput.click();
      });
      photoInput.addEventListener("change", () => {
        this.sosPhotoFile = photoInput.files[0] || null;
        this.renderPhotoPreview();
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
    this.homeAlertActive = true;
    this.renderHomeDashboard();
    this.navigate("screen-sos");
    this.updateCurrentLocation();

    let countdown = 3;
    const countdownNumber = document.getElementById("sos-countdown-number");
    countdownNumber.innerText = countdown;

    window.WakatKoomVoice.speak("SOS d'urgence enclenché. Annulez avant la fin du décompte si c'est une erreur.", null);
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

  initLeafletMap() {
    const mapElement = document.getElementById("sos-map");
    if (!mapElement || this.sosMap) return;

    this.sosMap = L.map("sos-map", { zoomControl: true, scrollWheelZoom: false }).setView([12.3714, -1.5197], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors"
    }).addTo(this.sosMap);

    this.sosMarker = L.marker([12.3714, -1.5197]).addTo(this.sosMap);
    this.sosMarker.bindPopup("Position de départ").openPopup();
  }

  updateSosMap(lat, lon, label = "Votre position") {
    if (!this.sosMap) this.initLeafletMap();
    if (!this.sosMap) return;

    this.sosMap.setView([lat, lon], 15);
    this.sosMarker.setLatLng([lat, lon]).bindPopup(label).openPopup();
  }

  renderPhotoPreview() {
    const preview = document.getElementById("sos-photo-preview");
    if (!preview) return;

    if (!this.sosPhotoFile) {
      preview.innerHTML = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      preview.innerHTML = `<img src="${reader.result}" alt="Photo jointe" />`;
    };
    reader.readAsDataURL(this.sosPhotoFile);
  }

  async toggleSosRecording(button) {
    if (!this.isSosRecording) {
      try {
        this.sosMediaChunks = [];
        this.sosMediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.sosMediaRecorder = new MediaRecorder(this.sosMediaStream);
        this.sosMediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) this.sosMediaChunks.push(event.data);
        };
        this.sosMediaRecorder.onstop = () => {
          this.sosAudioBlob = new Blob(this.sosMediaChunks, { type: "audio/webm" });
          if (button) {
            button.querySelector("span").textContent = "Enregistrement prêt";
          }
        };
        this.sosMediaRecorder.start();
        this.isSosRecording = true;
        if (button) {
          button.classList.add("is-recording");
          button.querySelector("span").textContent = "Arrêter";
        }
        window.WakatKoomVoice.speak("Enregistrement en cours. Parlez clairement pour laisser votre message vocal.", null);
      } catch (error) {
        console.warn("Micro indisponible", error);
        this.showToastMessage("Micro indisponible. Le signalement sera envoyé sans message vocal.");
      }
    } else {
      if (this.sosMediaRecorder && this.sosMediaRecorder.state !== "inactive") {
        this.sosMediaRecorder.stop();
        this.sosMediaStream.getTracks().forEach(track => track.stop());
      }
      this.isSosRecording = false;
      if (button) {
        button.classList.remove("is-recording");
      }
      window.WakatKoomVoice.speak("Message vocal enregistré.", null);
    }
  }

  async getCurrentCoordinates() {
    if (this.currentCoordinates) {
      return this.currentCoordinates;
    }

    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Géolocalisation non disponible"));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
        reject,
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });
  }

  async updateCurrentLocation() {
    const coordsEl = document.getElementById("sos-coordinates");
    if (!coordsEl) return;

    if (!navigator.geolocation) {
      coordsEl.innerText = "Géolocalisation non supportée.";
      window.WakatKoomVoice.speak("La géolocalisation n'est pas disponible sur votre navigateur.", null);
      return;
    }

    coordsEl.innerText = "Obtention de la position…";
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        this.currentCoordinates = { latitude, longitude };
        this.updateSosMap(latitude, longitude, "Votre position actuelle");
        coordsEl.innerText = `Latitude ${latitude.toFixed(5)}°, Longitude ${longitude.toFixed(5)}°`;
        await this.reverseGeocode(latitude, longitude, accuracy);
        window.WakatKoomVoice.speak("Position GPS récupérée.", null);
      },
      (error) => {
        coordsEl.innerText = "Position introuvable.";
        window.WakatKoomVoice.speak("Impossible de récupérer la position. Vérifiez que vous avez autorisé la géolocalisation.", null);
        console.warn("Erreur géolocalisation :", error);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }

  async reverseGeocode(latitude, longitude, accuracy) {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`, {
        headers: { Accept: "application/json" }
      });
      const data = await response.json();
      const address = data.display_name || "Adresse non détectée";
      this.currentAddress = address;
      this.currentCity = data.address?.city || data.address?.town || data.address?.village || "Ouagadougou";
      const coordsEl = document.getElementById("sos-coordinates");
      if (coordsEl) {
        coordsEl.innerText = `${address}\nPrécision GPS: ${Math.round(accuracy || 0)} m`;
      }
    } catch (error) {
      console.warn("Géocodage refusé", error);
    }
  }

  async sendWaterCutReport() {
    const coordsEl = document.getElementById("sos-coordinates");
    const reportButton = document.getElementById("btn-sos-report");
    if (reportButton) {
      reportButton.disabled = true;
      reportButton.innerHTML = '<i data-lucide="loader"></i> Envoi…';
      lucide.createIcons();
    }

    try {
      const coordinates = await this.getCurrentCoordinates();
      const formData = new FormData();
      formData.append("name", "Utilisateur WakatKoom");
      formData.append("phone", "");
      formData.append("problem_type", "Coupure d'eau");
      formData.append("description", "Signalement vocal et géolocalisé envoyé depuis WakatKoom");
      formData.append("latitude", String(coordinates.latitude));
      formData.append("longitude", String(coordinates.longitude));
      formData.append("address", this.currentAddress || "Adresse non détectée");
      formData.append("district", this.currentAddress || "");
      formData.append("sector", "");
      formData.append("city", this.currentCity || "Ouagadougou");
      if (this.sosAudioBlob) {
        formData.append("audio", this.sosAudioBlob, "message.webm");
      }
      if (this.sosPhotoFile) {
        formData.append("photo", this.sosPhotoFile, this.sosPhotoFile.name);
      }

      const response = await fetch("http://127.0.0.1:8000/api/reports", { method: "POST", body: formData });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail || "Échec d'envoi");

      const tracking = payload.report?.tracking_number || "inconnu";
      if (coordsEl) {
        coordsEl.innerText = `Signalement envoyé. Suivi : ${tracking}`;
      }
      window.WakatKoomVoice.speak(`Signalement envoyé à la ONEA. Votre numéro de suivi est ${tracking}.`, null);
      this.showToastMessage(`Signalement envoyé. Suivi ${tracking}`);
      this.homeAlertActive = false;
      this.renderHomeDashboard();
      const confirmationPanel = document.getElementById("sos-confirmation-panel");
      if (confirmationPanel) {
        confirmationPanel.hidden = false;
      }
    } catch (error) {
      if (coordsEl) {
        coordsEl.innerText = "Envoi impossible. Vérifiez la connexion au serveur.";
      }
      window.WakatKoomVoice.speak("Le signalement n'a pas pu être envoyé. Vérifiez votre connexion et réessayez.", null);
      this.showToastMessage("Envoi impossible");
    } finally {
      if (reportButton) {
        reportButton.disabled = false;
        reportButton.innerHTML = '<i data-lucide="send"></i> Signaler ONEA';
        lucide.createIcons();
      }
    }
  }

  triggerSOSAlertFinal() {
    window.WakatKoomVoice.playSiren(5);
    window.WakatKoomVoice.speak(
      "SOS activé ! Votre position GPS a été envoyée par SMS d'urgence à la police ainsi qu'à Fatou et Inoussa. L'application reste en veille sonore.",
      null
    );

    if (navigator.vibrate) {
      navigator.vibrate([500, 250, 500, 250, 500]);
    }

    document.getElementById("sos-coordinates").innerText = "Ouagadougou (12.3714° N, 1.5197° W) - SMS Envoyé";
  }

  cancelSOS() {
    this.homeAlertActive = false;
    this.renderHomeDashboard();
    clearInterval(this.sosTimer);
    window.WakatKoomVoice.stopSpeaking();
    window.WakatKoomVoice.playBeep(330, 150);
    window.WakatKoomVoice.speak("Alerte annulée.", () => {
      this.navigate("screen-home");
    });
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
    this.homeAlertActive = false;
    this.renderHomeDashboard();
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
    const aiAvatar = document.getElementById("ai-avatar-element")?.parentElement;

    if (aiTrigger) {
      aiTrigger.addEventListener("click", () => {
        this.navigate("screen-ai");
      });
    }

    if (!aiMicBtn || !aiResponseText || !userSpeechText || !aiAvatar) return;

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
