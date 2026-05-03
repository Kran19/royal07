# RoyalBet Platform: Comprehensive Technical & Operational Guide

## 1. Project Overview
**RoyalBet** is a dual-domain web application designed for high-stakes digital entertainment. It consists of a real-time **Elevator Betting Game** for users and a high-fidelity **Operations Dashboard** for administrators.

The platform is optimized for performance, scalability, and security, utilizing **Next.js 16** and **Tailwind CSS v4** to deliver a "Glassmorphism" premium aesthetic.

---

## 2. What is Going On? (System Behavior)
The platform operates on a synchronized lifecycle. While users are competing in real-time rounds, the admin panel monitors global exposure and user risk in parallel.

### The Real-Time Loop
1.  **Server/Client Synchronization**: The application maintains a consistent state of game phases.
2.  **Simulation Engine**: The frontend simulates live betting activity from other users to create a high-activity "Lobby" atmosphere.
3.  **Risk Calculation**: Every bet placed contributes to "Floor Exposure," which the administrator can view in real-time to manage platform risk.

---

## 3. How Users Interact (Game Mechanics)

### The Betting Experience
Users interact with a 12-floor elevator system. The goal is to predict which floors the elevator will stop at.

#### A. Game Phases
- **BETTING OPEN (30s)**: Users select floors and stake amounts. The "Quick Chips" allow for fast betting.
- **LOCKED (5s)**: The "Doors Close," and no further bets are accepted.
- **MOVING**: The elevator travels from Floor 1 to 12. If it stops at a user's predicted floor, the doors open, and a win is recorded.
- **BUFFER (8s)**: Results are summarized, history is updated, and the system resets for the next round.

#### B. Betting Modes & Odds
- **Simple Mode (3x Payout)**: A bet on a specific floor. If the elevator stops there, you win 3x your stake for that floor.
- **Pair Mode (High Multipliers)**: A "parlay" style bet where you select 2, 3, or 4 floors. **Every** selected floor must hit for the bet to payout.
  - **2 Floors**: 10x Multiplier.
  - **3 Floors**: 20x Multiplier.
  - **4 Floors**: 30x Multiplier.

---

## 4. How Things Work (Tech & Logic Deep Dive)

### Core Logic (`src/lib/gameLogic.js`)
The "Brain" of the betting engine.
- **Random Stop Generation**: Uses a "weighted" randomness to pick between 1 and 4 stops per round out of the 12 possible floors.
- **Template Engine**: Converts UI interactions (clicks on floor buttons) into structured "Bet Tickets" that calculate Stake and Potential Win before the bet is committed.

### State Orchestration (`src/app/(user)/page.jsx`)
The main game component uses complex React `useEffect` and `useRef` chains to handle time-sensitive events.
- **Ref-Based Settle**: Uses `useRef` for balance and active bets to ensure that even if a user's UI lags, the payout logic has the most accurate reference to the game state.
- **Audio Engine**: A pre-loaded sound pool handles precise timing for elevator "Dings," "Ticks," and "Win" fanfares.

### Global Admin Layout (`src/app/admin/layout.tsx`)
A shared layout provides:
- **Route-to-Title Mapping**: Automatically updates the header text based on the current URL.
- **Responsive Shell**: A sidebar that transforms into a bottom-drawer or hamburger menu on mobile devices.

---

## 5. Admin Interface (Operational Depth)

### Dashboard KPIs
- **Risk Exposure**: A heatmap showing which floors have the most money staked. This helps admins identify potentially catastrophic rounds for the house.
- **Flagged Users**: Automatic detection of users with suspicious win-rates or high-volume betting.

### Monitoring & Settings
- **Live Feed**: A real-time stream of every bet placed across the platform.
- **Limit Management**: Admins can configure minimum/maximum bets and round timers globally to control platform volatility.

---

## 6. Directory CRYSTAL CLEAR Structure

```text
root/
├── public/                # Static assets (Sounds, Images)
├── src/
│   ├── app/
│   │   ├── (user)/        # Domain 1: Root Gaming UI (/)
│   │   └── admin/         # Domain 2: Management Portal (/admin)
│   ├── components/
│   │   ├── user/          # Modular Game UI (Buttons, Elevator)
│   │   └── admin/         # Dashboard Widgets, Sidebar, Tables
│   ├── lib/
│   │   ├── api/           # Backend communication layer
│   │   └── gameLogic.js   # Betting math & algorithms
│   └── types/             # Project-wide TypeScript Definitions
```

---

## 7. How to Scale
1.  **Backend Integration**: Replace the mock data in `src/lib/api/api-service.ts` with actual `fetch` calls to your NestJS endpoints.
2.  **WebSocket Integration**: For true real-time synchronization between users, implement a WebSocket listener in the `MOVING` phase effect.
3.  **Internationalization**: Add an `i18n` layer to `src/app/layout.tsx` to support multiple regions.

---
*Documented with precision for the RoyalBet Development Team.*
