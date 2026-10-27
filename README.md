# LocalCricket — Complete Offline Cricket Scoring Progressive Web App

LocalCricket is an authoritative, broadcast-grade cricket scoring application designed for local clubs, weekend tournament organizers, schools, and cricket enthusiasts. It runs entirely offline in the browser with zero cloud dependencies, complete cricket rule enforcement, interactive statistical charts, and local PDF scorecard generation.

---

## Key Features

- **PWA & 100% Offline Scoring:** Powered by Service Workers and IndexedDB (Dexie.js). Scorer can record matches on remote fields without an internet connection.
- **Rule Enforcement:**
  - Standard & custom overs (5, 6, 8, 10, 12, 15, 20, 50, or custom).
  - Bowler over quota enforcement (prevents exceeding quota or bowling consecutive overs).
  - Explicit Run-Out victim selection (Striker vs Non-Striker, completed runs, crossing status).
  - Extras: Wides, No-balls, Byes, Leg-byes, Bat runs off no-balls, penalty calculations.
  - Complete dismissal taxonomy: Bowled, Caught, Caught & Bowled, LBW, Stumped, Run Out, Hit Wicket, Obstructing Field, Retired Hurt / Out.
  - Automatic strike rotation according to official laws.
- **Match Setup Wizard:** 5-step intuitive wizard for team configuration, roster entry with captain/wicketkeeper tags, toss outcome, and opening batter/bowler selection.
- **Live Scoring Interface:** Designed for one-thumb mobile operation in daylight glare with high-contrast buttons, distinct boundary accents, real-time CRR, RRR, and required runs remaining.
- **Full Historical Undo:** Event-sourced immutable snapshots ensure consecutive undos cleanly reverse deliveries without score discrepancies.
- **Detailed Scorecards & Analytics:** Batting cards, bowling figures, extras breakdown, fall of wickets, partnerships, and over-by-over delivery ribbons. Interactive Worm Charts and Run Rate graphs using Recharts.
- **PDF Scorecards:** Client-side vector PDF generation using jsPDF and AutoTable with professional tabular formatting.
- **Backup & Portability:** One-click JSON export and import for transferring match databases between scorers' phones.

---

## UI Design System Tokens

LocalCricket follows the broadcast telemetry design system:

| Token | Value | Purpose |
| :--- | :--- | :--- |
| `--primary` | `#1565C0` | Primary actions, branding |
| `--primary-dark` | `#0D47A1` | Headers, active states |
| `--primary-light` | `#42A5F5` | Focus rings, striker indicator |
| `--primary-soft` | `#E3F2FD` | Selection fills, active card background |
| `--background` | `#F5F9FF` | Application shell background |
| `--surface` | `#FFFFFF` | Card & dialog surfaces |
| `--text-primary` | `#172B4D` | High-contrast body & numbers |
| `--text-secondary` | `#60758A` | Secondary metrics, labels |
| `--success` | `#16803C` | Boundaries (4s & 6s), completion |
| `--danger` | `#D32F2F` | Wickets, run-outs, destructive actions |
| `--warning` | `#F59E0B` | Extras (wides, no-balls) |
| `--border` | `#DCE7F5` | Crisp 1px structural dividing borders |

---

## Developer Guide & Deployment

### 1. Install Dependencies

```bash
cd localcricket
npm install
```

### 2. Run the Development Server

```bash
npm run dev
```

Visit `http://localhost:5173/localcricket/` in your browser.

### 3. Run Automated Tests

```bash
npm test
```

Executes the Vitest test suite testing scoring invariants, dismissal rules, run-outs, strike rotation, and undo states.

### 4. Build the Application

```bash
npm run build
```

Compiles TypeScript, processes Tailwind CSS, splits vendor bundles, and generates production PWA service workers in `dist/`.

### 5. Preview Production Build

```bash
npm run preview
```

### 6. Push the Code to GitHub

```bash
git add .
git commit -m "feat: complete LocalCricket offline scoring PWA"
git push origin main
```

### 7. Enable GitHub Pages

1. Navigate to your repository on GitHub: `Settings` → `Pages`.
2. Under **Build and deployment**, select **Source**: `GitHub Actions`.
3. The included `.github/workflows/deploy.yml` workflow will automatically test, build, and deploy the application to `https://<username>.github.io/<repo-name>/`.

### 8. Install the PWA

1. Open the application URL in Chrome, Safari, or Edge on mobile or desktop.
2. Tap the browser menu and select **"Add to Home Screen"** or click the install icon in the address bar.
3. The app will launch in standalone display mode and function seamlessly without network access.

### 9. Back Up Match Data

1. In the application, navigate to the **History** tab.
2. Tap the **Export** button next to any match to download a `.json` backup file.
3. To restore on another device or browser, tap **Import** and select the `.json` file.
