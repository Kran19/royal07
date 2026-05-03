# RoyalBet: Project Documentation

## 1. Project Overview
"RoyalBet" is a modern, responsive web application featuring an innovative **Elevator Betting Game**. It provides a fully-fledged user interface for placing simulated bets on elevator floor stops, paired with a comprehensive Administrator Dashboard for tracking analytics, users, and transactions. 

The project is built on cutting-edge web technologies, utilizing the Next.js App Router for backend/frontend unification and React 19 for fluid interactivity.

## 2. Technology Stack
* **Framework:** Next.js 16.2.1 (App Router, Turbopack)
* **Library:** React 19.2.4 & React DOM
* **Styling:** Vanilla CSS ([game.css](file:///c:/Users/Admin/Desktop/royalbackend/src/app/%28user%29/game.css)) + TailwindCSS
* **Language:** TypeScript/JavaScript (Mixed codebase)
* **Launcher:** Custom Windows Batch Scripts ([START.bat](file:///c:/Users/Admin/Desktop/royalbackend/START.bat) & [STOP.bat](file:///c:/Users/Admin/Desktop/royalbackend/STOP.bat)) with `ngrok` for instant public tunneling.

---

## 3. Game Mechanics & Rules
The core logic resides in [src/lib/gameLogic.js](file:///c:/Users/Admin/Desktop/royalbackend/src/lib/gameLogic.js). The game revolves around an elevator that randomly stops on specific floors. Players wager on which floors the elevator will stop at.

### The Elevator
* The building has **12 Floors** (1 through 12).
* Each round, the elevator makes a random number of stops between **1 and 4 floors**.
* The round proceeds through phases: `BETTING` -> `LOCKED` -> `MOVING` (Result) -> `BUFFER`.

### Betting Modes
Players can place bets using two distinct modes:

#### 1. Simple Mode
* Players select individual floors they believe the elevator will stop at.
* **Multiplier:** **3x** the staked amount for that floor.
* *Example:* If a player bets 100 on Floor 5, and the elevator stops at Floor 5, they win 300.

#### 2. Pair Mode
* Players select a combination of **2, 3, or 4 floors**.
* To win, the elevator must stop at **ALL** of the selected floors in that pair combination.
* **Multipliers:**
  * **2 Floors:** 10x payout
  * **3 Floors:** 20x payout
  * **4 Floors:** 30x payout
* *Example:* A player bets 100 on the pair [3, 7, 10]. If the elevator stops at 3, 7, and 10 during the round, the player wins 2000 (100 * 20x).

---

## 4. Code Architecture & Directory Structure

The project is structured entirely inside the `src/` directory, cleanly separating the user-facing game from the administrative tools.

### `/src/app/` (Routing Layer)
* **`(user)/`**: The primary game interface.
  * `page.jsx`: The monolithic controller for the game. Manages all states (balance, active bets, elevator phases, sound effects).
  * `game.css`: Contains extensive, highly-polished vanilla CSS for the dark-mode aesthetic, animations, and responsive layout.
* **`admin/`**: The nested administrator dashboard router.
  * Extensively split into dedicated monitoring pages: `/analytics`, `/audit`, `/bets`, `/dashboard`, `/monitoring`, `/rounds`, `/settings`, `/transactions`, `/users`.
  * `layout.tsx`: Acts as the shared wrapper for the entire Admin panel.

### `/src/components/` (UI Elements)
* **`user/`**: Components responsible for the game visual state.
  * `ControlsPanel.jsx`: Manages the betting inputs, chip selections, toggle modes, and bet placement UI. 
  * `ElevatorPanel.jsx`: The visual representation of the elevator shaft, doors, and floor indicators.
  * `SidePanel.jsx` / `MobileNav.jsx`: Layout structures for housing history feeds and live bet trackers.
* **`admin/`**: Dashboard components.
  * **`common/`**: Reusable atomic UI parts (`Button`, `DataTable`, `Modal`, `Pagination`, `StatCard`, etc.)
  * **`layout/`**: `AdminLayout`, `Header`, `Sidebar`.
  * **`dashboard/`**: `DashboardWidgets` summarizing platform data.

### `/src/lib/` (Core Logic)
* `gameLogic.js`: Pure functions for validating templates, calculating multipliers, and generating RNG stops.
* `hooks/useMediaQuery.js`: Utility for responsive JS-based layout switching between desktop and mobile.

---

## 5. Session Management & Quick Scripts
* **`START.bat`**: A custom Windows executable designed to launch the platform locally. It automatically handles killing old ghost processes, starting `npm run start` in production, and simultaneously bridging an `ngrok` tunnel for immediate worldwide access.
* **Autoplay System**: Built into the client app, users can easily loop their chosen draft (either Simple or Pair) for a preset amount of rounds without manual interaction.

## 6. Visual Design System
The interface uses a premium "dark mode glassmorphism" style.
* **Colors:** Deep navy/slate backgrounds (`#0f172a`), accented heavily with primary gold/yellow (`#fbbf24`, `#f59e0b`) for interactive elements, mimicking a casino "Royal" aesthetic.
* **Typography:** Utilizes Google Fonts (`Sora` for prominent numerical displays/headers, and `Space Grotesk` for technical data and standard text).
* **Audio:** Fully integrated sound effects for betting, elevator moving, dinging, winning, and losing, adding deep immersion to the UX.
