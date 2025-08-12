# App Challenge - AI Elder Care Companion

> An AI-powered system that makes daily check-in phone calls to elderly patients, helping families stay connected and monitor their loved ones' well-being.

## 🎯 Overview

An elderly care system that combines AI voice technology with real phone calls to check on elderly patients daily. Family members get a dashboard to manage patients, trigger calls, and view detailed conversation logs.

**The Problem**: Millions of elderly people live alone, and their families worry about their daily well-being but can't always call to check in.

**The Solution**: An AI companion that makes friendly, personalized phone calls to elderly patients, asks about their day, reminds them about medications, plays cognitive games, and reports back to families through a web dashboard.

## 🔗 Quick Links

-   **📱 [Live Demo](https://aviatoragents.app/)** - Try it now
-   **🎥 [Video Walkthrough](https://www.loom.com/share/1405b82b5ca14140aa2cefc1ea7a1493)** - 3-minute demo (when played at 1.5x speed)
-   **💻 [GitHub Repository](https://github.com/philosophy-flow/stealth-startup-challenge)** - Source code + README

## ✨ Features

### 🤖 AI Voice Agent

-   **Real Phone Calls**: Uses Twilio to make actual outbound phone calls
-   **Natural Conversation**: Structured flow with mood checks, schedule discussions, and medication reminders
-   **Cognitive Games**: Includes a number guessing game to engage patients
-   **Voice Options**: 6 different voice personalities to choose from
-   **Cost Optimized**: Each call costs less than $0.005 through careful model selection and prompt tuning

### 👨‍👩‍👧‍👦 Family Dashboard

-   **Patient Management**: Add, edit, and delete patient profiles
-   **Call Triggering**: Initiate calls with one click
-   **Call History**: View detailed logs with transcripts and AI-generated summaries
-   **Mood Tracking**: Monitor happiness rates across all calls
-   **Statistics**: Track total patients, calls, and daily activity

### 🔐 Authentication System

-   **Passwordless Login**: Secure 6-digit OTP codes sent via email
-   **Session Management**: Persistent sessions with automatic refresh
-   **Protected Routes**: Middleware ensures only authenticated users access the dashboard

## 🛠️ Tech Stack

-   **Frontend**: Next.js 15 (App Router) + TypeScript + Tailwind CSS v4
-   **Backend**: Next.js API Routes
-   **Database**: Supabase (PostgreSQL with Row Level Security)
-   **Authentication**: Supabase Auth (Magic Link OTP)
-   **Voice/Phone**: Twilio Voice API
-   **AI/TTS**: OpenAI API (GPT-4o-mini for mood & summaries + TTS-1)
-   **Deployment**: Vercel w/ Custom Domain

## 🏗️ How It Works

### 1. Authentication Flow

```
User enters email → 6-digit code sent → User verifies code → Session created → Dashboard access
```

The system uses Supabase's built-in OTP authentication. Users never need to create or remember passwords - they just enter their email and receive a verification code.

### 2. Voice Agent System

The AI voice agent follows a structured conversation flow:

```
Greeting → Mood Check → Daily Schedule → Medication Reminder → Number Game → Closing
```

**Key Components**:

-   **State Machine**: Manages conversation flow through predefined states
-   **Speech Recognition**: Twilio's speech-to-text captures patient responses
-   **Mood Detection**: AI-powered analysis understands context, sarcasm, and implicit meaning
-   **Text-to-Speech**: OpenAI TTS creates natural-sounding responses
-   **Real-time Updates**: Database updates throughout the call

**Example Conversation**:

```
AI: "Good morning Sarah! This is your AI care companion calling. How are you feeling today?"
Patient: "Oh, I'm doing pretty well, thank you."
AI: "Wonderful to hear! What do you have planned for today?"
Patient: "I'm going to visit my grandchildren this afternoon."
AI: "That sounds lovely! Have you taken your morning medications?"
Patient: "Yes, I took them with breakfast."
AI: "Let's play a guessing game. I'm thinking of a number between one and ten. What's your guess?"
Patient: "Seven."
AI: "Good try! The number was five."
Patient: "We win some, we lose some, don't we? Thank you."
AI: "Thank you. Have a wonderful day!"
```

### 3. Dashboard Functionality

The dashboard provides three main areas:

**Overview Page**:

-   Statistics cards (patients, calls, happiness rate)
-   Quick action buttons
-   Instructions for new users

**Patients Page**:

-   Table view of all patients
-   Add/Edit/Delete functionality
-   One-click call triggering
-   Voice personality selection

**Call History Page**:

-   Chronological list of all calls
-   Detailed view with transcripts
-   AI-generated summaries
-   Mood and response data

## 🚀 Getting Started

### Prerequisites

-   Node.js 18+ installed
-   Supabase account (free tier works)
-   Twilio account with phone number ([Quick setup guide](https://www.twilio.com/docs/usage/tutorials/how-to-use-your-free-trial-account))
-   OpenAI API key (requires API credits)
-   ngrok for local webhook functionality ([2-minute setup](https://ngrok.com/docs/getting-started/))

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/aviator-health-challenge.git
cd aviator-health-challenge
```

2. **Install dependencies**

```bash
cd next
npm install
```

3. **Set up environment variables**

Create a `.env.local` file in the `next` directory:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# App URL (use ngrok URL for local testing)
NEXT_PUBLIC_APP_URL=https://your-ngrok-id.ngrok-free.app
```

4. **Set up the database**

Run the schema SQL in your Supabase SQL editor:

```sql
-- See schema.sql
```

5. **Start the development server**

```bash
npm run dev
```

6. **Set up ngrok for Twilio webhooks**

In a separate terminal:

```bash
ngrok http 3000
```

Update `NEXT_PUBLIC_APP_URL` in `.env.local` with the ngrok URL.

### Testing Voice Calls

1. Add a patient with a real phone number
2. Click "Call Patient" from the patients page
3. Answer the phone when it rings
4. Talk to the AI companion
5. View the call details in Call History

## 📁 Project Structure

```
aviator-health-challenge/
├── next/                             # Next.js application
│   ├── src/
│   │   ├── app/                      # App Router
│   │   │   ├── (ui)/                 # UI routes (grouped for organization)
│   │   │   │   ├── auth/             # Authentication page
│   │   │   │   ├── dashboard/        # Protected dashboard pages
│   │   │   │   └── page.tsx          # Root page
│   │   │   └── api/                  # API endpoints
│   │   │       ├── audio/cached/     # Audio streaming
│   │   │       ├── calls/trigger/    # Initiate outbound calls
│   │   │       └── webhooks/twilio/  # Voice webhooks (unified handler)
│   │   ├── components/               # React components
│   │   ├── lib/                      # Core third-party logic
│   │   │   ├── supabase/             # Database clients & data access functions
│   │   │   ├── twilio.ts             # Phone integration utilities
│   │   │   └── openai/               # AI/TTS services + audio cache
│   │   ├── utils/                    # Core non-third-party logic
│   │   │   ├── calls.ts              # Call handling logic (state machine)
│   │   │   └── url.ts                # URL helper utilities
│   │   └── types/                    # TypeScript definitions
│   └── public/                       # Static assets
├── schemas/                          # Database schemas
└── docs/                             # Documentation
```

## 💰 Cost Analysis

The system is optimized for low operational costs:

-   **Per Call**: ~$0.005
    -   Twilio: ~$0.003 (1-minute call)
    -   OpenAI TTS: ~$0.001 (300 characters)
    -   OpenAI GPT: ~$0.001 (summary + mood analysis in single call)
-   **Monthly (100 patients, daily calls)**: ~$15

## 🔒 Security

-   **Row Level Security**: Users only see their own patients
-   **Service Role**: Webhooks use admin client for call updates
-   **Input Validation**: All forms validate data before submission
-   **Secure Sessions**: HTTPOnly cookies with CSRF protection
-   **No Stored Credentials**: All sensitive data in environment variables

## 📖 Post-Mortem

### The Journey

**Day 1 Afternoon**: Started strong with auth system and polished UI. Had a working dashboard by noon with full CRUD operations for patient management.

**Day 1 Evening - The Pivot**: Hit a critical decision point. Found myself refactoring components for "perfect" architecture. After 2 hours of abstraction with zero new features, I recognized the trap. Made a hard pivot: ship features, not abstractions.

**Day 1 Night**: Went full sprint on voice system. Integrated Twilio, OpenAI TTS, and built the entire call flow. The code wasn't pretty, but patients were capable of receiving real phone calls by midnight.

**Day 2 Morning**: Recorded a demo, wrangled documentation, and deployed the application.

**Day 2 Afternoon**: Configured custom domain w/ SSL via Cloudflare DNS.

**Day 2 Evening**: Further codebase analysis and refactoring.

### Key Learnings

1. **Perfectionism is the enemy of shipping** - A working product is more valuable than a perfect architecture
2. **AI tools are a superpower** - Used Claude Code extensively to learn Twilio/Supabase/Next.js 15 in real-time
3. **Constraints drive creativity** - The 48-hour limit forced pragmatic decisions that mirror real startup conditions

### What I'm Most Proud Of

-   **It actually works** - Real phone calls to real numbers, not a simulation
-   **Cost optimization** - Got calls down to $0.005 each through careful programmatic prompt tuning
-   **Learning velocity** - Went from zero knowledge of Twilio/Supabase to production deployment in 48 hours
-   **The pivot** - Recognizing and escaping the refactoring trap saved the project

### Eleventh Hour Discovery & Refactor

**The Crisis**: With hours left before submission, I deployed to Vercel and watched (listened?) in horror as the OpenAI TTS functionality failed, leaving the graceless Twilio default voice to handle the conversation. The culprit? My audio caching strategy was writing files to `/public/temp/audio/`, which works locally but isn't permitted on Vercel's read-only filesystem.

**Pivot to In-Memory Cache**: The original implementation had a critical flaw, so I used the time spent debugging to also clean up a few other items:

-   Cost tracking logged twice (on generation AND on serving)
-   Manual XML string construction causing escaping issues (`&amp;` everywhere)
-   No cleanup mechanism - expensive audio files accumulated forever
-   **Fatal flaw**: Generated TTS audio → Saved to filesystem → Served as static files

**The Solution**: Implement a simple in-memory cache:

```
OLD: Generate TTS → Write MP3 to disk (Vercel refuses) → 💥
NEW: Generate TTS → Store Buffer in memory → Serve from cache ✅
```

**Technical Improvements**:

1. **In-Memory Audio Cache** - Audio buffers stored in a Map with 5-minute TTL

    - No filesystem access required
    - Automatic cleanup prevents memory leaks
    - Cache hits prevent duplicate API calls

2. **Proper TwiML Library Usage** - Replaced all manual XML construction

    - No more `&amp;` escaping nightmares
    - Twilio's official library handles all edge cases
    - Cleaner, more maintainable code

3. **Cost Optimization** - Fixed double-billing bug

    - Cost logged once on generation, not on every serve
    - Cache prevents regenerating identical prompts
    - Saved ~50% on TTS costs

4. **Production-Ready Architecture**

    - Works on any serverless platform (Vercel, Netlify, AWS Lambda)
    - Stateless design scales horizontally,
    - No persistent storage requirements

**The Result**: What started as a deployment disaster became the catalyst for a superior architecture. The refactored system is faster (cached responses), cheaper (no duplicate generations), more reliable (no filesystem dependencies), and actually deployable.

### Post-Submission Refactoring: AI Enhancement & Code Simplification

**The Problem**: The original mood detection used 150+ keywords, resulting in a 320-line state machine file. Despite extensive keyword lists, it failed on simple cases like "I had a wonderful day" when the patient was actually feeling unwell (keywords couldn't understand context).

**The Solution**: Replace keyword matching with AI-powered mood analysis using GPT-4o-mini:

```
OLD: 150+ keywords → Parse speech → Match patterns → Often wrong (320 lines)
NEW: Collect transcript → AI analyzes context → Accurate mood (95 lines)
```

**Technical Achievements**:

1. **70% Code Reduction** - From 320 to 95 lines in `/utils/calls.ts`

    - Deleted `/lib/call/prompts.ts` (129 lines)
    - Deleted `/lib/call/state-machine.ts` (460 lines)
    - Inline prompt generation, simplified state transitions

2. **Unified Webhook Architecture** - Single route handler for all conversation states

    - `/api/webhooks/twilio/voice/[state]/route.ts` handles everything
    - Dynamic state-based routing eliminates code duplication
    - Cleaner, more maintainable codebase

3. **Context-Aware AI** - Understands nuance, not just keywords

    - Correctly identifies "wonderful day but feeling unwell" as negative mood
    - Detects sarcasm: "Oh just peachy" recognized as negative
    - Understands negation: "not great" properly classified

4. **Route Group Organization** - Clean separation of concerns
    - All UI routes in `(ui)` group for better organization
    - API routes remain at root level for clarity
    - No URL changes, just better code structure

**The Impact**: What began as fixing a mood detection bug evolved into a comprehensive refactor that demonstrates mature engineering - simplifying complex systems while enhancing capabilities. The AI doesn't just count keywords; it understands human communication.

## 📋 Technical Write-Up: Decisions, Trade-offs, and Next Steps

### Technical Decisions & Trade-offs

**Chose Supabase over SQLite**

-   ✅ Pro: Instant auth, real-time subscriptions, zero backend setup
-   ❌ Con: Vendor lock-in, requires internet for local dev
-   **Verdict**: Right choice for 48-hour sprint and rapid scaling

**Real Phone Calls (Twilio) vs Web Audio**

-   ✅ Pro: Actually solves the problem - elderly users just answer their phone
-   ❌ Con: Complex webhooks, costs money, harder local testing (ngrok)
-   **Verdict**: Worth the complexity - this is the core value prop

**State Machine vs Open Conversation**

-   ✅ Pro: Predictable data extraction, controlled costs, shippable in 48h
-   ✅ Pro: With AI mood detection, extracts meaning despite rigid structure
-   ❌ Con: Still feels like a survey rather than natural conversation
-   **Verdict**: Right choice for challenge, AI enhancement helps, but OpenAI Realtime API would be ideal

### Future Features Roadmap

**Immediate Improvements**:

-   [x] ~~AI-powered mood detection~~ (Completed post-submission)
-   [ ] Implement OpenAI Realtime API for natural conversation
-   [ ] Improve error recovery for misunderstood responses
-   [ ] Automatic scheduling with cron jobs

**Next Quarter**:

-   [ ] Codebase organization and test suite implementation for voice flow
-   [ ] Custom conversation builder
-   [ ] Call memory ("How was the ballgame yesterday?")

**Long-term Vision**:

-   [ ] Medication database integration for detailed check-in (HIPAA-compliant)
-   [ ] Voice biomarker analysis for mood detection
-   [ ] Automated crisis response integration

### The Bottom Line

What I built in 48 hours:

-   ✅ A robot that successfully calls elderly people.
-   ⚠️ Something they'd actually look forward to (needs work).

The current experience is functional but not delightful. The elderly deserve better than a script-reading robot, and I can build it given more time.

This 48-hour build proves the concept. The path forward is clear: enhance reliability, add intelligence, and optimize with scale.

## 📄 License

MIT License - feel free to use this code for your own projects.

---

_Built with ❤️ in 48 hours using Claude Code, my brain, lots of coffee, and a pragmatic mindset._
