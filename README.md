# The Great Birthday Escape

A personalised, browser-based birthday escape room. The birthday person goes through four rooms from his life, solves puzzles about his own past, collects four digits, opens the Birthday Vault, and finds a letter from his family.

There's nothing to install: no accounts, no server, no build step.

```
birthday-escape/
├── index.html                 ← the page (don't need to touch)
├── styles.css                 ← the look (don't need to touch)
├── script.js                  ← the game engine (don't need to touch)
├── data.js                    ← ★ ALL personal content goes here ★
├── FAMILY_CONTENT_TEMPLATE.md ← questionnaire to send to Mom & family
└── assets/
    ├── images/                ← photos go here
    ├── audio/                 ← optional ending music
    └── video/                 ← optional ending video
```

---

## 1. Run it on your computer

**Easiest:** double-click `index.html`. It opens in your browser and the whole game works.

**Recommended:** run a tiny local server. Some browsers are stricter with video and audio when you open a file directly. In a terminal:

```bash
cd birthday-escape
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

Progress is saved in the browser, so a refresh doesn't lose anything. To start over, use the **↺** button at the top right, or **Start over** on the title screen.

---

## 2. Where the personal content lives

**Everything personal is in `data.js`.** Open it in any text editor (TextEdit, Notepad, VS Code) and replace the `[PLACEHOLDERS]`.

A few rules keep it working:

- Keep the `"quotes"` around text, and keep the commas at the ends of lines.
- Write `{name}` anywhere and it becomes his name. Write `{age}` for his age.
- Set his name once at the top: `name: "Ganesh",`
- `**double stars**` make text **bold**.
- If something breaks after an edit, it's almost always a missing comma or quote mark. Check the last line you changed.

---

## 3. Replacing questions

Each room has a list of `objects`. Each object is something clickable in the room, and each one holds one `puzzle`:

```js
{
  id: "photo-frame",          // any unique word, no spaces
  label: "Photo frame",       // the tag shown under the object
  icon: "frame",              // which drawing to show (list below)
  x: 10, y: 14,               // position in the room, in % from the left / top
  puzzle: { ... }
}
```

A room is solved when **all** of its objects are solved. You can add or remove objects; 3–5 per room works best.

**Icons available:** `frame`, `tv`, `toybox`, `desk`, `yearbook`, `walkman`, `report`, `calendar`, `portrait` (add `color: "#4f7a8a"` to change the person's colour), `phone`, `album`, `folder`, `redacted`, `polaroid`, `board`.

### Puzzle types

Every puzzle can have `eyebrow` (the small red stamp above the question), `hint` (offered after 2 wrong tries) and `successText` (shown when solved). After 3 wrong tries the player can choose to have the answer revealed, so nobody ever gets stuck.

**Multiple choice.** `answer` counts from 0: the first option is 0, the second is 1, and so on.
```js
{ type: "multiple-choice", question: "…", options: ["A", "B", "C", "D"], answer: 1, successText: "…" }
```
Add `acceptAny: true` for opinion questions ("most likely to…") where every answer counts.

**True / false**
```js
{ type: "true-false", question: "…", answer: true, successText: "…" }
```

**Two truths and a lie.** `lieIndex` counts from 0.
```js
{ type: "two-truths-one-lie", question: "Which NEVER happened?", statements: ["…", "…", "…"], lieIndex: 2 }
```

**Timeline.** The player taps the events in order. `order` is the true order.
```js
{ type: "timeline", question: "…", events: [ { label: "…", order: 1 }, { label: "…", order: 2 } ] }
```

**Torn photo.** The player swaps strips back into place.
```js
{ type: "photo-puzzle", question: "…", image: "assets/images/beach.jpg", pieces: 3 }
```

**Blurred photo.** The photo stays blurred until the question is answered. Leave out `options` and the player simply taps "Develop the photo".
```js
{ type: "photo-memory", question: "…", image: "assets/images/x.jpg", options: [...], answer: 0, caption: "…" }
```

**Family group chat.** Messages appear one by one, then an optional follow-up question.
```js
{ type: "chat", chatTitle: "FAMILY GROUP", messages: [ { from: "Mom", text: "…" } ],
  followUp: { question: "…", options: [...], answer: 2 } }
```

---

## 4. Replacing photos

1. Copy the photo into `assets/images/`, for example `assets/images/beach-1990.jpg`.
2. In `data.js`, change the path, for example
   `"assets/images/placeholder-childhood.svg"` → `"assets/images/beach-1990.jpg"`.

Tips: JPGs around 1600px wide are plenty. File names are case-sensitive once the site is online, so avoid spaces. Landscape photos work best for the torn-photo and blurred-photo puzzles.

The ending's photo collage is the `ending.photos` list. Add or remove as many as you like.

---

## 5. Changing the final code

At the top of `data.js`:

```js
finalCode: ["7", "1", "9", "4"],
```

Room 1 awards the first digit, Room 2 the second, and so on. A meaningful number works well: a birth year, a house number, a date.

---

## 6. Adding family messages

At the bottom of `data.js`, under `ending.messages`:

```js
messages: [
  { from: "Mom", relationship: "Mom", text: "Happy birthday, my dear…" },
  { from: "Priya", relationship: "Sister", text: "…" },
]
```

Add as many as you like. The letter itself is `ending.letter`, one paragraph per line, followed by `ending.signature`.

**Optional video:** put `birthday.mp4` in `assets/video/` and set `video: "assets/video/birthday.mp4"`.
**Optional music:** put `birthday.mp3` in `assets/audio/` and set `music: "assets/audio/birthday.mp3"`. It only plays at the ending, softly, and only if sound is on.

---

## 7. Putting it online (to send him a link)

### Netlify Drop (easiest, no account needed to try)
1. Go to <https://app.netlify.com/drop>.
2. Drag the whole `birthday-escape` folder onto the page.
3. You get a link right away. Create a free account to keep it permanently.

### GitHub Pages
1. Create a new repository on GitHub and upload the contents of `birthday-escape/` (so that `index.html` is at the top level).
2. Go to **Settings → Pages**, set **Source: Deploy from a branch**, branch `main`, folder `/ (root)`, and save.
3. After a minute the site is live at `https://<your-username>.github.io/<repo-name>/`.

> Note: anyone with the link can see the site, and the answers are readable in `data.js` by someone who goes looking. That's fine for a birthday game. Just don't put anything truly private in it.

---

## 8. Dependencies

None. It's plain HTML, CSS and JavaScript. Fonts load from Google Fonts when online and fall back to system fonts offline. Sound effects are generated in the browser, so no audio files are needed.

## Testing tips

- Open the site in a **private/incognito window** to see it exactly as he will (no saved progress).
- Check it on a phone. The rooms rearrange into a tidy grid on small screens.
- To jump back to the start at any time, press **↺**.
