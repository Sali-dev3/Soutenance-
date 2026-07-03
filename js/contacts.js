// Base de données locale pour la messagerie WakatKoom
// Contient les contacts de démonstration avec leurs profils et conversations pré-enregistrées.

const CONTACTS = [
  {
    id: 1,
    name: "Fatou (Maman)",
    role: "Famille",
    avatar: "assets/fatou.jpg",
    gender: "female",
    voiceLabel: "Fatou, votre maman. Appuyez pour lui parler.",
    messages: [
      {
        id: 101,
        sender: "them",
        type: "voice",
        text: "Bonjour mon fils. J'espère que tu vas bien. Est-ce que tu as pu récupérer les médicaments à la pharmacie pour moi aujourd'hui ?",
        translations: {
          moore: "Ne y windiga m biiga. M dabo ti yãmb yel-kẽnd sõma. Yãmb paam n dɩgda tɩɩmã tɩ-yãkda n zãms-m rãmbã vɩ ?",
          dioula: "An ni sogoma n dusu. I ka kéné wa ? I séra ka fura ta n yé furakéla yoro la bi wa ?",
          fulfulde: "Jam waali am boofi. A selli koo ? A hebiii yaarude lekki ki to suudu lekki hannde naa ?",
          english: "Good morning my son. I hope you are doing well. Were you able to get the medicine from the pharmacy for me today?"
        },
        duration: "12s",
        timestamp: "Il y a 2 heures",
        verified: true
      },
      {
        id: 102,
        sender: "me",
        type: "voice",
        text: "Oui maman, je les ai achetés. Je passerai te les donner ce soir après le travail.",
        duration: "8s",
        timestamp: "Il y a 1 heure"
      }
    ]
  },
  {
    id: 2,
    name: "Moussa (Maraîcher)",
    role: "Travail",
    avatar: "assets/moussa.jpg",
    gender: "male",
    voiceLabel: "Moussa, le maraîcher. Appuyez pour lui parler.",
    messages: [
      {
        id: 201,
        sender: "them",
        type: "voice",
        text: "Salut mon ami. Les tomates et les oignons sont prêts pour le marché. Tu peux passer avec la charrette pour les récupérer ?",
        translations: {
          moore: "Ne y béogo m dõma. Tumaat dãmbã ne gandã rãmbã segla zaka tɩ yãmb tall goore n dɩg n dɩk-b.",
          dioula: "An ni tié n teri. Tomati ni saba bé tayar yé dugumadugu yé. I bé se ka na ni wotoro ye ka u ta wa ?",
          fulfulde: "Jam waali soobaajo am. Tumaate e albasal hebi yarude luumo. A wawayi warude e pus-pus ngam hebi kambe ?",
          english: "Hello my friend. The tomatoes and onions are ready for the market. Can you come by with the cart to pick them up?"
        },
        duration: "10s",
        timestamp: "Hier"
      }
    ]
  },
  {
    id: 3,
    name: "Dr. Sawadogo",
    role: "Santé",
    avatar: "assets/doctor.jpg",
    gender: "male",
    voiceLabel: "Docteur Sawadogo. Appuyez pour lui parler.",
    messages: [
      {
        id: 301,
        sender: "them",
        type: "voice",
        text: "Bonjour. N'oubliez pas votre rendez-vous demain matin à huit heures pour le contrôle médical.",
        translations: {
          moore: "Ne y windiga. Bãng-y tɩ yãmb tar logtor zaka yel-kẽnd béogo yibeoogo a nii bãngr yĩnga.",
          dioula: "An ni sogoma. I kana gniin i ka rande-vu la sini sogoma fiiri ségui la doto so la.",
          fulfulde: "Jam waali. Ta yejjitu rande-vu ma jango subaka e njoweetati ngam sehil lekki.",
          english: "Hello. Do not forget your appointment tomorrow morning at eight o'clock for your medical checkup."
        },
        duration: "7s",
        timestamp: "Hier"
      }
    ]
  },
  {
    id: 4,
    name: "Inoussa (Frère)",
    role: "Famille",
    avatar: "assets/inoussa.jpg",
    gender: "male",
    voiceLabel: "Inoussa, votre frère. Appuyez pour lui parler.",
    messages: [
      {
        id: 401,
        sender: "them",
        type: "voice",
        text: "Hé grand frère ! Est-ce que tu peux m'envoyer un peu d'argent par Orange Money ? J'ai une urgence avec mon vélo.",
        translations: {
          moore: "Ne y yibeoogo m kẽema ! Yãmb tõe n tũnug ne Orange Money n tall ligd bilf n tole-m vɩ ? M tãmbgã dɩgda kibare.",
          dioula: "An ni sogoma n koro ! I bé se ka wari dɔni ci n ma ni Orange Money ye wa ? N ka nègèsow ye gassira.",
          fulfulde: "Mawniraajo jam ! A wawayi nelde am ceede seeda e Orange Money naa ? Pus-pus am hebi caalo.",
          english: "Hey big brother! Can you send me some money via Orange Money? I have an emergency with my bicycle."
        },
        duration: "14s",
        timestamp: "Lundi"
      }
    ]
  }
];

// Exposer globalement
window.CONTACTS = CONTACTS;
