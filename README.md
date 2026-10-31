    # 🏏 LocalCricket — Offline Cricket Scoring Progressive Web App

[![PWA Ready](https://img.shields.io/badge/PWA-100%25%20Offline-16803C?style=for-the-badge&logo=pwa&logoColor=white)](https://msivakumar7.github.io/Local_Cricket_Scoreboard/)
[![Tests Passing](https://img.shields.io/badge/Vitest-84%2F84%20Passing-brightgreen?style=for-the-badge&logo=vitest&logoColor=white)](https://github.com/msivakumar7/Local_Cricket_Scoreboard)
[![React 19](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

> **Live Web App**: [https://msivakumar7.github.io/Local_Cricket_Scoreboard/](https://msivakumar7.github.io/Local_Cricket_Scoreboard/)  
> **100% Offline • Zero Cloud Dependencies • No Account or Sign-in Required • Official Cricket Rules Enforced**

---

## 📖 App Description

**LocalCricket** is an authoritative, broadcast-grade cricket scoring application crafted specifically for local clubs, weekend tournament organizers, school leagues, and cricket enthusiasts. 

Unlike heavy scoring apps that depend on continuous cellular connectivity, require paid monthly subscriptions, or drain phone batteries with constant cloud syncing, LocalCricket is **100% offline-first**. It runs completely inside your mobile browser using modern Progressive Web App (PWA) technology, caching all assets and storing matches safely in your device's local database (`IndexedDB`).

Whether you are scoring on remote village grounds, open public parks with zero cellular signal, or under blazing midday sunlight, LocalCricket delivers:
- **Instant One-Thumb Scoring:** High-contrast buttons designed for bright daylight visibility.
- **Rule Enforcement:** Automated strike rotation, bowler quota management, complex run-out victim tracking, and extras calculations according to official cricket laws.
- **Error-Proof Undo Engine:** Full event-sourced immutable snapshot history that reverses any tap cleanly without corrupted figures.
- **Professional PDF Scorecards:** Generate print-ready vector PDF match sheets locally on your phone in one tap.
- **Interactive Analytics:** Worm charts, run rate comparisons, over-by-over delivery ribbons, and partnership charts.

---

## 📲 How to Install as a Mobile App (PWA)

LocalCricket installs directly onto your smartphone **without needing the Google Play Store or Apple App Store**. It takes under 2 MB of storage, launches instantly in full screen (without browser address bars), and works offline anytime.

### 🤖 For Android (Google Chrome, Samsung Internet, Edge, Brave)

1. Open **Google Chrome** on your Android phone.
2. Navigate to: **[https://msivakumar7.github.io/Local_Cricket_Scoreboard/](https://msivakumar7.github.io/Local_Cricket_Scoreboard/)**
3. Tap the **three dots menu (`⋮`)** in the top-right corner of Chrome.
4. Select **"Install app"** (or **"Add to Home screen"**).
5. In the confirmation pop-up, tap **"Install"**.
6. The **LocalCricket** app icon will appear on your home screen and app drawer. Tap it to launch full-screen!

> [!TIP]
> Once installed, you can switch on Airplane Mode and LocalCricket will still launch and score matches seamlessly with zero internet connection.

---

### 🍏 For iPhone & iPad (iOS Safari)

1. Open **Safari** on your iPhone or iPad (*Note: Apple requires Safari for PWA installation*).
2. Navigate to: **[https://msivakumar7.github.io/Local_Cricket_Scoreboard/](https://msivakumar7.github.io/Local_Cricket_Scoreboard/)**
3. Tap the **Share** button at the bottom of the screen (the square icon with an upward arrow `⎋`).
4. Scroll down the share sheet and tap **"Add to Home Screen"** (`➕`).
5. Tap **"Add"** in the top-right corner.
6. The **LocalCricket** icon will now appear on your iPhone home screen. It opens in dedicated standalone app mode without Safari browser toolbars.

---

### 💻 For Desktop & Laptop (Windows, macOS, ChromeOS, Linux)

1. Open the URL in **Chrome**, **Microsoft Edge**, or **Brave**.
2. Click the **Install** icon on the right side of the URL address bar (a computer screen with a downward arrow), or go to browser menu (`⋮`) → **"Install LocalCricket"**.
3. Confirm installation. The app will launch in its own native desktop window with a desktop shortcut.

---

## 🎮 How to Use LocalCricket (Quick Start Guide)

Follow this step-by-step walkthrough to score your first match from toss to victory:

### Step 1: Create a Match (Setup Wizard)
1. Launch **LocalCricket** and tap **"New Match"** on the home screen.
2. **Match Details:** Enter the Match Title, Venue, Overs per innings (choose quick presets `5, 6, 8, 10, 12, 15, 20, 50` or enter custom overs), and Max Overs per Bowler.
3. **Teams & Squads:** Enter Team names and add player rosters. Easily toggle the **(C)** Captain and **(WK)** Wicketkeeper badges for each player.
4. **Toss:** Select the toss-winning team and their decision to **Bat** or **Bowl**.
5. **Openers:** Pick the opening **Striker**, **Non-Striker**, and the opening **Bowler** to begin scoring.

---

### Step 2: Scoring Deliveries in Play
The live scoring dashboard features large, high-contrast, one-thumb controls:

- **Dot & Standard Runs:** Tap `0`, `1`, `2`, or `3`.
  - Singles and three runs automatically switch striker and non-striker at the creases.
- **Boundaries:** Tap `4` (Four) or `6` (Six) highlighted in distinct victory green.
- **Wides (`WD`):** Opens a quick panel to add any additional runs completed during a wide delivery. Wides penalize the bowler (+1 run), add to team extras, and do not increment the legal ball count.
- **No-Balls (`NB`):** Record bat runs or bye/leg-bye extras scored off a no-ball. The ball is not counted toward the 6 legal deliveries.
- **Byes & Leg-Byes:** Tap **Extras** to record runs where the ball missed the bat. These add to team score without penalizing the bowler's economy.
- **Wickets (`WICKET`):** Tap the high-visibility red wicket button to record dismissals:
  - Select the dismissal type: *Bowled, Caught, Caught & Bowled, LBW, Stumped, Run Out, Hit Wicket, Obstructing the Field, or Retired Hurt*.
  - For **Run Out**, explicitly choose:
    1. Who was dismissed: **Striker** or **Non-Striker**.
    2. Number of completed runs prior to the run out.
    3. Whether batters crossed during the attempted run.
  - Choose the incoming new batter from the bench.
- **Undo (`↩`):** Made an accidental tap or wrong entry? Tap the Undo button anytime. LocalCricket will roll back the delivery, resetting bowler figures, batter stats, and strike positions accurately.
- **Mid-Over Adjustments:**
  - Tap **"Swap Batters"** if batters took a short run or physical positions need realigning.
  - Tap **"Change Bowler"** if a bowler cannot complete their over due to injury.

---

### Step 3: End of Over & Innings Transition
- **Over Completion:** When 6 legal balls are completed, LocalCricket announces over completion and prompts the scorer to pick the next bowler.
  - *Rule Protection:* The engine prevents the same bowler from bowling back-to-back overs and prevents any bowler from exceeding their allocated quota.
  - *Strike Rotation:* Batsmen automatically change ends for the new over.
- **Target Chase (2nd Innings):**
  - When the 1st innings concludes, LocalCricket automatically computes the target score.
  - During the chase, live telemetry updates after every ball: **Target**, **Runs Needed**, **Balls Remaining**, **Current Run Rate (CRR)**, and **Required Run Rate (RRR)**.
  - When the target is reached or final balls expire, the match automatically marks as completed and announces the official result (e.g., *"Team A won by 4 wickets"* or *"Team B won by 18 runs"*).

---

### Step 4: Exporting PDF Scorecards & Match Backups
- **Generate PDF Scorecard:** Tap **"PDF Scorecard"** from the match view or history screen. LocalCricket immediately builds a clean, vector PDF document formatted with:
  - Match summary header (Teams, Date, Venue, Toss, Result).
  - Complete Batting tables (Runs, Balls, 4s, 6s, Strike Rate, Dismissal info).
  - Complete Bowling figures (Overs, Maidens, Runs, Wickets, Economy, Wides, No-balls).
  - Extras breakdown and Fall of Wickets (FOW) timeline.
- **Backup & Share JSON:** Go to the **History** tab to export match data as a portable `.json` file. You can import this file on any other phone or PC to restore the match database.

---

## ⚡ Key Features

| Category | Capability |
| :--- | :--- |
| **Offline Reliability** | Built with Vite PWA Service Workers + IndexedDB (Dexie.js). 100% operational offline. |
| **Official Rules** | Enforces overs quotas, legal ball counters, dead-ball/penalty extras, and automatic strike rotation. |
| **Dismissal Taxonomy** | Full MCC-compliant dismissals including Run Out cross-logic and Retired Hurt. |
| **Telemetry UI** | Designed with daylight-contrast tokens (`#1565C0` Primary, `#16803C` Boundaries, `#D32F2F` Wickets). |
| **Event-Sourced Undo** | Immutable snapshots for every ball; allows infinite consecutive undos with zero state corruption. |
| **Statistical Visuals** | Interactive Worm Charts (cumulative runs) and Run Rate charts powered by Recharts. |
| **Vector PDF Export** | Client-side generation using jsPDF & AutoTable without sending any data to external servers. |
| **Data Portability** | JSON database import/export for sharing match data between tournament scorers. |

---

## 🎨 UI Design System Tokens

LocalCricket uses high-contrast tokens engineered for bright outdoor viewing on sports grounds:

```css
--primary:        #1565C0;  /* Primary brand actions & navigation */
--primary-dark:   #0D47A1;  /* Headers, active states */
--primary-light:  #42A5F5;  /* Focus rings & active striker indicator */
--primary-soft:   #E3F2FD;  /* Selection fills & active card backgrounds */
--background:     #F5F9FF;  /* Glare-resistant application shell */
--surface:        #FFFFFF;  /* High-contrast cards & modal dialogs */
--text-primary:   #172B4D;  /* Deep navy for instant readability */
--text-secondary: #60758A;  /* Secondary metrics & helper labels */
--success:        #16803C;  /* Boundary 4s and 6s */
--danger:         #D32F2F;  /* Wickets, run-outs, destructive actions */
--warning:        #F59E0B;  /* Extras (wides, no-balls) */
--border:         #DCE7F5;  /* Structural 1px division borders */
```

---

## 🛠️ Developer Guide & Setup

If you want to run LocalCricket locally, contribute, or build your own version:

### Prerequisites
- [Node.js](https://nodejs.org/) (version 20 or higher recommended)
- `npm` (version 9 or higher)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/msivakumar7/Local_Cricket_Scoreboard.git
cd Local_Cricket_Scoreboard/localcricket
npm install
```

### 2. Start the Development Server
```bash
npm run dev
```
Open `http://localhost:5173/Local_Cricket_Scoreboard/` in your browser.

### 3. Run Automated Unit & Rule Tests
The test suite validates cricket engine rules, strike rotation, run outs, bowler limits, and undo states:
```bash
npm test
```
*(Runs 84 automated Vitest tests across domain engine, wide scoring, bowler selection, and PDF generator).*

### 4. Build for Production
```bash
npm run build
```
Compiles TypeScript, processes Tailwind CSS, splits vendor bundles, and outputs the production-ready PWA files in `localcricket/dist/`.

### 5. Preview Production Build
```bash
npm run preview
```

### 6. GitHub Pages Deployment
A GitHub Actions workflow is included at [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). When changes are pushed to `master`, the workflow automatically runs tests, compiles the production build, and deploys it to GitHub Pages.

---

## 🧰 Tech Stack

- **Framework:** [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Bundler:** [Vite 6](https://vitejs.dev/)
- **PWA Engine:** [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) (Workbox Service Worker caching)
- **Local Storage:** [Dexie.js](https://dexie.org/) (Reactive IndexedDB wrapper)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Charts:** [Recharts](https://recharts.org/)
- **PDF Generation:** [jsPDF](https://github.com/parallax/jsPDF) + [jsPDF-AutoTable](https://github.com/simonbengtsson/jsPDF-AutoTable)
- **Testing:** [Vitest](https://vitest.dev/) + [React Testing Library](https://testing-library.com/)

---

## ❓ Frequently Asked Questions (FAQ)

<details>
<summary><b>Does LocalCricket need internet access on the cricket ground?</b></summary>
<p>No. Once loaded or installed on your phone, LocalCricket functions 100% offline. All match scores, rosters, and statistics are stored inside your device's browser IndexedDB.</p>
</details>

<details>
<summary><b>Will I lose match data if I close the browser tab or phone battery dies?</b></summary>
<p>No. Every delivery event is immediately persisted to IndexedDB. When you reopen LocalCricket, your match will be exactly where you left it.</p>
</details>

<details>
<summary><b>Can I score matches with custom over formats (e.g., 6, 8, 12, or 25 overs)?</b></summary>
<p>Yes. The setup wizard lets you pick popular standard formats or type any custom number of overs, with custom bowler over restrictions.</p>
</details>

<details>
<summary><b>How can I transfer a match to another scorer or my computer?</b></summary>
<p>Go to the <b>History</b> tab, tap <b>Export</b> next to the match, and share the downloaded <code>.json</code> file. On the other device, tap <b>Import</b> to load the full match history and scorecard.</p>
</details>

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) — free for clubs, tournament organizers, and community developers worldwide.
