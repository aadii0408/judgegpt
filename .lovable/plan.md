

# JudgeGPT — AI-Powered Hackathon Judging Panel

## Overview
A multi-agent hackathon evaluation system where 5 AI judge personas evaluate project submissions with streaming feedback, voice narration, debate simulation, and persistent history.

---

## Phase 1: Backend Setup & Core Infrastructure

### Supabase Database
- **Projects table**: Store submissions (name, description, architecture, demo transcript, track, timestamps)
- **Evaluations table**: Store individual judge scores, strengths, weaknesses, concerns, reasoning per project
- **Final Reports table**: Store consensus reports with overall scores, verdict, improvements
- **Leaderboard view**: Ranked projects by overall score, filterable by track

### Edge Functions
- **`evaluate-judge`**: Calls Anthropic Claude Sonnet 4 API with each judge's system prompt, streams the response back via SSE
- **`generate-consensus`**: Takes all 5 judge evaluations and generates the final synthesized report
- **`simulate-qa`**: Handles follow-up Q&A questions, routing to the most relevant judge
- **`run-debate`**: Generates a debate dialogue between judges with the largest score gap (>3 points)
- **`elevenlabs-tts`**: Text-to-speech edge function for judge voice narration (each judge gets a unique ElevenLabs voice)

### API Keys Required
- **Anthropic API Key** — for Claude Sonnet 4 judge evaluations
- **ElevenLabs API Key** — for voice narration of judge feedback and Q&A responses

---

## Phase 2: Project Submission Page

- Clean, well-structured form with:
  - Project Name input
  - Track selection dropdown (AI Agents, Web3, DevTools, Healthcare, Other)
  - Description textarea (500 char limit with counter)
  - Architecture Details textarea (1000 char limit)
  - Demo Transcript/Notes (optional textarea)
- "View Example" button showing a pre-filled sample submission for reference
- Submit button that saves to database and navigates to the live evaluation page
- Validation with helpful error messages

---

## Phase 3: Live Evaluation Page (The Star Feature)

### Layout
- **Left panel** (sticky): Project summary card showing submitted details
- **Right panel**: Sequential judge evaluation cards

### Judge Panel Experience
Each of the 5 judges appears one at a time:
1. **Dr. Alex Chen** (Technical Depth) — Blue theme
2. **Maya Patel** (Business Impact) — Green theme
3. **Jordan Blake** (Product & UX) — Purple theme
4. **Sam Rodriguez** (Risk & Safety) — Orange theme
5. **Riley Kim** (Innovation) — Pink theme

### Per Judge Card
- Color-coded avatar and name/role header
- Streaming text showing the judge's reasoning as it generates (typing effect)
- 🔊 Play button to hear the judge narrate their evaluation via ElevenLabs TTS (each judge has a distinct voice)
- Animated score reveal (0-10 gauge with color gradient) after reasoning completes
- Expandable strengths/weaknesses/concerns lists with colored pills
- Progress indicator showing which judge is currently evaluating (1 of 5, 2 of 5, etc.)

---

## Phase 4: Final Report Page

### Hero Section
- Large animated overall score (count-up animation)
- Confetti effect for scores above 9.0
- Verdict summary in a highlighted card

### Judge Breakdown
- Bar chart (using Recharts) showing all 5 judges' scores side by side, color-coded

### Consensus Findings
- ✅ Strengths — green pills
- ⚠️ Weaknesses — yellow pills
- 🚨 Critical Gaps — red pills

### Improvement Roadmap
- Prioritized list of actionable improvements

### Q&A Simulation Section
- Text input where the user can ask follow-up questions
- AI routes the question to the most relevant judge
- Streaming text response from that judge, in character
- 🔊 Option to hear the judge's Q&A response spoken aloud via ElevenLabs

### Debate Mode
- Automatically triggered when any two judges have a score gap of 3+ points
- Shows a dialogue-format debate between the highest and lowest scoring judges
- Each line attributed to the judge with their color coding

### Export & Share
- "Share Report" button (copies a shareable link or exports summary)

---

## Phase 5: History & Leaderboard

### Evaluation History
- List of all past project evaluations with date, name, track, and score
- Click to view the full report again

### Leaderboard
- Ranked table of all evaluated projects
- Filterable by track
- Shows project name, track, overall score, and date

---

## Phase 6: Polish & UX

- Dark mode support
- Mobile-responsive design across all pages
- Loading states with shimmer/skeleton effects during evaluation
- Error handling with toast notifications for API failures
- 3 pre-populated example projects (Business Astrologer, CodeReview AI, MediChat) for demo purposes
- Smooth page transitions and animations throughout

