/* =====================================================================
   THE GREAT BIRTHDAY ESCAPE — ALL PERSONAL CONTENT LIVES IN THIS FILE
   =====================================================================

   You only need to edit this file to personalise the game.

   Quick rules:
   • Keep the quotes " " around every piece of text.
   • Keep the commas at the end of lines.
   • Write {name} anywhere and it becomes the birthday person's name.
     Write {age} and it becomes his age.
   • Wrap words in **double stars** to make them bold.
   • "answer" numbers count from 0:  first option = 0, second = 1, third = 2, fourth = 3.
   • Photos go in assets/images/ — then change the file name here.
     (e.g. "assets/images/placeholder-childhood.svg" → "assets/images/beach-1989.jpg")

   Every object in a room is one puzzle. A room is solved when all of
   its objects are solved. See README.md for every puzzle type.
   ===================================================================== */

window.BIRTHDAY_DATA = {
  name: "Ganesh",
  age: 37,

  // The four digits of the vault code — one is earned per room, in order.
  finalCode: ["7", "1", "9", "4"],

  intro: {
    title: "The Great Birthday Escape",
    subtitle: "{age} years. 4 rooms. 1 missing birthday cake.",
    lines: [
      "{name}! Someone has locked away your birthday cake!",
      "There is only one way to get it back.",
      "Travel through your own past, recover four keys, and prove that you actually remember the last {age} years.",
      "Your family has supplied the evidence.",
      "Some of it is incriminating.",
      "Good luck."
    ]
  },

  // Shown at random after a wrong answer. Add as many as you like.
  wrongAnswerMessages: [
    "Nice try. Your mother strongly disagrees.",
    "The family archives say otherwise.",
    "Suspicious. Very suspicious.",
    "We have photographic evidence.",
    "That answer has been forwarded to the family group chat.",
    "Bold choice. Wrong, but bold.",
    "Someone in the family just gasped.",
    "Memory says no. Try again."
  ],

  rooms: [
    /* ------------------------------------------------------------------
       ROOM 1 — CHILDHOOD BEDROOM
       ------------------------------------------------------------------ */
    {
      id: "childhood",
      title: "The Childhood Bedroom",
      subtitle: "Room 1 · circa [YEAR]",
      theme: "bedroom",
      intro: "Glow-in-the-dark stars. A suspicious smell of crayons. Somewhere in here is the first key.",
      clueLabel: "First clue recovered",
      objects: [
        {
          id: "photo-frame",
          label: "Photo frame",
          icon: "frame",
          x: 10, y: 14,
          puzzle: {
            type: "multiple-choice",
            eyebrow: "Memory detected",
            question: "Where did {name} spend most of his childhood?",
            options: ["[CITY A]", "[CITY B]", "[CITY C]", "[CITY D]"],
            answer: 1,
            hint: "[HINT — e.g. 'Think monsoon. Think traffic.']",
            successText: "Correct. Apparently this is also where he once [FUNNY CHILDHOOD STORY]."
          }
        },
        {
          id: "old-tv",
          label: "Old television",
          icon: "tv",
          x: 66, y: 42,
          puzzle: {
            type: "multiple-choice",
            eyebrow: "Broadcast intercepted",
            question: "Which cartoon did young {name} refuse to miss?",
            options: ["[CARTOON A]", "[CARTOON B]", "[CARTOON C]", "[CARTOON D]"],
            answer: 0,
            hint: "[HINT]",
            successText: "Correct. Legend says he [FUNNY TV MEMORY]."
          }
        },
        {
          id: "toy-chest",
          label: "Toy chest",
          icon: "toybox",
          x: 38, y: 60,
          puzzle: {
            type: "true-false",
            eyebrow: "Toy chest testimony",
            question: "True or false: {name}'s favourite toy was [FAVOURITE TOY].",
            answer: true,
            hint: "[HINT]",
            successText: "True. He [STORY ABOUT THE TOY]."
          }
        },
        {
          id: "desk-drawer",
          label: "Desk drawer",
          icon: "desk",
          x: 12, y: 56,
          puzzle: {
            type: "photo-puzzle",
            eyebrow: "Torn photograph",
            question: "Someone tore this photo into pieces and hid it in the drawer. Tap two pieces to swap them until the picture is whole.",
            image: "assets/images/placeholder-childhood.svg",
            imageAlt: "[DESCRIBE THE CHILDHOOD PHOTO]",
            pieces: 3,
            successText: "Restored! [ONE-LINE STORY BEHIND THIS PHOTO]."
          }
        }
      ]
    },

    /* ------------------------------------------------------------------
       ROOM 2 — SCHOOL & COLLEGE
       ------------------------------------------------------------------ */
    {
      id: "school",
      title: "School & College",
      subtitle: "Room 2 · the formative years",
      theme: "classroom",
      intro: "The chalk is dusty, the cassette is chewed, and the report card has been… creatively stored.",
      clueLabel: "Second clue recovered",
      objects: [
        {
          id: "yearbook",
          label: "Yearbook",
          icon: "yearbook",
          x: 8, y: 54,
          puzzle: {
            type: "multiple-choice",
            eyebrow: "Yearbook, page 47",
            question: "Who was {name}'s closest friend during [SCHOOL / COLLEGE]?",
            options: ["[FRIEND A]", "[FRIEND B]", "[FRIEND C]", "[FRIEND D]"],
            answer: 2,
            hint: "[HINT]",
            successText: "Correct. Together they once [FUNNY FRIEND STORY]."
          }
        },
        {
          id: "walkman",
          label: "Walkman",
          icon: "walkman",
          x: 72, y: 58,
          puzzle: {
            type: "multiple-choice",
            eyebrow: "Now playing (on repeat)",
            question: "Which artist or song was always playing during this era?",
            options: ["[ARTIST / SONG A]", "[ARTIST / SONG B]", "[ARTIST / SONG C]", "[ARTIST / SONG D]"],
            answer: 3,
            hint: "[HINT]",
            successText: "Correct. The neighbours still remember [MUSIC MEMORY]."
          }
        },
        {
          id: "report-card",
          label: "Report card",
          icon: "report",
          x: 40, y: 62,
          puzzle: {
            type: "multiple-choice",
            eyebrow: "Official academic record",
            question: "Which subject was {name} best at?",
            options: ["[SUBJECT A]", "[SUBJECT B]", "[SUBJECT C]", "[SUBJECT D]"],
            answer: 0,
            hint: "[HINT]",
            successText: "Correct. Less impressive: his grade in [WORST SUBJECT]."
          }
        },
        {
          id: "timeline",
          label: "Wall calendar",
          icon: "calendar",
          x: 74, y: 10,
          puzzle: {
            type: "timeline",
            eyebrow: "Timeline scrambled",
            question: "The calendar pages fell off the wall. Tap the events in the order they happened — oldest first.",
            events: [
              { label: "[FIRST MAJOR EVENT]", order: 1 },
              { label: "[GRADUATED COLLEGE]", order: 2 },
              { label: "[FIRST JOB]", order: 3 },
              { label: "[MOVED TO CITY]", order: 4 },
              { label: "[MET IMPORTANT PERSON]", order: 5 }
            ],
            hint: "[HINT — e.g. 'The job came before the move.']",
            successText: "History restored. The space-time continuum thanks you."
          }
        }
      ]
    },

    /* ------------------------------------------------------------------
       ROOM 3 — FAMILY LIVING ROOM
       ------------------------------------------------------------------ */
    {
      id: "family",
      title: "The Family Living Room",
      subtitle: "Room 3 · where the witnesses live",
      theme: "living",
      intro: "Every portrait on this wall has something to say about you. Most of it is true.",
      clueLabel: "Third clue recovered",
      objects: [
        {
          id: "mom-portrait",
          label: "Mom's portrait",
          icon: "portrait",
          color: "#c46b5a",
          x: 10, y: 10,
          puzzle: {
            type: "true-false",
            eyebrow: "Mom's testimony",
            question: "\"{name} used to refuse to [THING] as a child.\"",
            answer: true,
            hint: "Mom is never wrong. Mom would like that noted.",
            successText: "True. Mom adds: \"[MOM'S EXTRA COMMENT]\""
          }
        },
        {
          id: "sibling-portrait",
          label: "[SIBLING]'s portrait",
          icon: "portrait",
          color: "#4f7a8a",
          x: 32, y: 8,
          puzzle: {
            type: "multiple-choice",
            eyebrow: "[SIBLING]'s challenge",
            question: "What does [SIBLING] say is {name}'s most annoying habit?",
            options: ["[HABIT A]", "[HABIT B]", "[HABIT C]", "[HABIT D]"],
            answer: 1,
            hint: "[HINT]",
            successText: "Correct. [SIBLING] would like it on record that [SIBLING'S COMMENT]."
          }
        },
        {
          id: "family-chat",
          label: "Family group chat (37 unread)",
          icon: "phone",
          x: 74, y: 52,
          puzzle: {
            type: "chat",
            eyebrow: "Family group · 37 unread",
            question: "Someone has leaked a clue.",
            chatTitle: "FAMILY GROUP",
            messages: [
              { from: "[MOM]", text: "Has anyone seen the cake??" },
              { from: "[SIBLING]", text: "Hint for {name}: it was the summer of [YEAR] 😂" },
              { from: "[COUSIN]", text: "Don't help him!!" },
              { from: "[MOM]", text: "Fine. Ask him where we went on [MEMORABLE VACATION]." }
            ],
            followUp: {
              question: "So — where did the family go on that famous vacation?",
              options: ["[PLACE A]", "[PLACE B]", "[PLACE C]", "[PLACE D]"],
              answer: 2
            },
            hint: "[HINT]",
            successText: "Correct. Nobody has forgotten [VACATION STORY]."
          }
        },
        {
          id: "coffee-table-album",
          label: "Coffee-table album",
          icon: "album",
          x: 42, y: 66,
          puzzle: {
            type: "photo-memory",
            eyebrow: "Coffee-table album",
            question: "A page is stuck together. Who is standing next to {name} in this photo?",
            image: "assets/images/placeholder-family.svg",
            imageAlt: "[DESCRIBE THE FAMILY PHOTO]",
            options: ["[PERSON A]", "[PERSON B]", "[PERSON C]", "[PERSON D]"],
            answer: 0,
            hint: "[HINT]",
            caption: "[YEAR] — [STORY BEHIND THIS PHOTO]."
          }
        }
      ]
    },

    /* ------------------------------------------------------------------
       ROOM 4 — CLASSIFIED FAMILY ARCHIVES
       ------------------------------------------------------------------ */
    {
      id: "archives",
      title: "Classified Family Archives",
      subtitle: "Room 4 · access restricted",
      theme: "archives",
      intro: "The evidence room. Decades of files. Some redacted for your protection. Some for ours.",
      clueLabel: "Fourth clue recovered",
      objects: [
        {
          id: "who-said-this",
          label: "Interview transcript",
          icon: "folder",
          x: 8, y: 50,
          puzzle: {
            type: "multiple-choice",
            eyebrow: "Exhibit A · who said this?",
            question: "\"[QUOTE ABOUT {name}]\"",
            options: ["Mom", "[SIBLING]", "[COUSIN]", "[FRIEND]"],
            answer: 0,
            hint: "[HINT]",
            successText: "Correct. Context: [WHEN AND WHY IT WAS SAID]."
          }
        },
        {
          id: "redacted-file",
          label: "Redacted file",
          icon: "redacted",
          x: 30, y: 62,
          puzzle: {
            type: "two-truths-one-lie",
            eyebrow: "Exhibit B · two truths and a lie",
            question: "Which of these NEVER happened to {name}?",
            statements: [
              "[TRUE STORY 1]",
              "[TRUE STORY 2]",
              "[FAKE STORY]"
            ],
            lieIndex: 2,
            hint: "[HINT]",
            successText: "Correct — that one is pure fiction. The other two? Fully documented."
          }
        },
        {
          id: "photo-evidence",
          label: "Undeveloped photo",
          icon: "polaroid",
          x: 56, y: 58,
          puzzle: {
            type: "photo-memory",
            eyebrow: "Exhibit C · photographic evidence",
            question: "What was happening in this photo?",
            image: "assets/images/placeholder-archive.svg",
            imageAlt: "[DESCRIBE THE ARCHIVE PHOTO]",
            options: ["[GUESS A]", "[GUESS B]", "[GUESS C]", "[GUESS D]"],
            answer: 3,
            hint: "[HINT]",
            caption: "[YEAR] — [THE FULL STORY]."
          }
        },
        {
          id: "most-likely-to",
          label: "Evidence board",
          icon: "board",
          x: 66, y: 8,
          puzzle: {
            type: "multiple-choice",
            eyebrow: "Exhibit D · family verdict",
            question: "What does the family think {name} is most likely to do?",
            options: [
              "[MOST LIKELY TO A]",
              "[MOST LIKELY TO B]",
              "[MOST LIKELY TO C]",
              "[MOST LIKELY TO D]"
            ],
            // acceptAny: every answer counts — this one is about opinions, not facts.
            acceptAny: true,
            successText: "The family has reviewed your answer and finds it… entirely plausible."
          }
        }
      ]
    }
  ],

  /* ------------------------------------------------------------------
     THE VAULT & ENDING
     ------------------------------------------------------------------ */
  vault: {
    wrongCodeMessage: "Either the code is wrong or your family has been lying to you for {age} years.",
    // Funny stats on the "Escape Successful" screen. {accuracy}, {memories} and
    // {wrong} are filled in automatically from how he played.
    stats: [
      { label: "Time survived on Earth", value: "~{age} years" },
      { label: "Family trivia accuracy", value: "{accuracy}%" },
      { label: "Embarrassing memories recovered", value: "{memories}" },
      { label: "Times you questioned your family's memory", value: "{wrong}" }
    ],
    achievement: "Level {age}"
  },

  ending: {
    teaser: "There is one last thing in the vault.",
    letter: [
      "Happy Birthday, {name}.",
      "You've collected a lot of stories over the last {age} years.",
      "Judging by the number of people who contributed to this game, you've also collected a lot of people who love you.",
      "Here's to the next level."
    ],
    signature: "— With love, [FAMILY]",

    // Add or remove photos freely. Captions are optional.
    photos: [
      { src: "assets/images/placeholder-final.svg", caption: "[FINAL_FAMILY_PHOTO]" },
      { src: "assets/images/placeholder-childhood.svg", caption: "[YEAR] · [CAPTION]" },
      { src: "assets/images/placeholder-school.svg", caption: "[YEAR] · [CAPTION]" },
      { src: "assets/images/placeholder-family.svg", caption: "[YEAR] · [CAPTION]" }
    ],

    // Optional video: put the file in assets/video/ and write its path here,
    // e.g. "assets/video/birthday.mp4". Leave as "" for no video.
    video: "",

    // Optional music for the ending: e.g. "assets/audio/birthday.mp3". "" = none.
    music: "",

    messages: [
      { from: "[MOM]", relationship: "Mom", text: "[1–3 SENTENCE BIRTHDAY MESSAGE]" },
      { from: "[SIBLING]", relationship: "Sibling", text: "[1–3 SENTENCE BIRTHDAY MESSAGE]" },
      { from: "[COUSIN]", relationship: "Cousin", text: "[1–3 SENTENCE BIRTHDAY MESSAGE]" },
      { from: "[FRIEND]", relationship: "Friend", text: "[1–3 SENTENCE BIRTHDAY MESSAGE]" }
    ]
  }
};
