# AnnadataSetu.AI — Requirements

## 1. Overview
AnnadataSetu.AI is a **voice-first AI assistant for farmers** that works via a simple phone call. It provides:
- **Personalized crop advisory** (based on symptoms described in speech + farm context)
- **Nearby mandi price intelligence** (prices within a configurable radius)
- **Proactive alerts** (price threshold alerts + weather risk alerts)
- **Government scheme eligibility guidance** (based on farmer profile)

Primary goal: make critical agricultural information accessible to **low-literacy, non-smartphone** users in local language using voice.

---

## 2. Problem
Farmers often lack:
- Timely, personalized crop advisory (helplines are overloaded + generic)
- Reliable nearby mandi price comparison (fragmented sources; low awareness)
- Proactive alerts for weather/price conditions
- Easy access to scheme eligibility information

---

## 3. Target Users
- Small and marginal farmers (feature phone / smartphone users)
- Farmers who prefer voice over text (low literacy / dialect preference)
- Rural communities needing hyper-local advisories and price awareness

---

## 4. Scope

### In Scope
1. Voice call flow (inbound via Twilio)
2. Speech-to-text (ASR) to capture farmer query
3. Intent detection:
   - Crop advisory
   - Mandi price query
   - Price alert setup
   - Weather alert (risk warning)
   - Scheme eligibility query
4. Crop advisory response generation using:
   - Knowledge base (curated crop guidance)
   - LLM-assisted explanation + safety guardrails
5. Mandi price lookup for selected crop + radius
6. Alert scheduling (Celery):
   - Price threshold notifications
   - Weather risk notifications
7. Outbound notifications:
   - Voice call (TTS)
   - SMS fallback
8. Farmer profile storage (phone number as key)

---

## 5. Functional Requirements

### FR-01: Voice Call Entry
- Farmer can call a number and speak query naturally
- System captures caller phone number and session ID

### FR-02: Speech-to-Text (ASR)
- Convert farmer speech to text for processing
- Must handle rural accents reasonably (MVP: best-effort)

### FR-03: Intent Classification
- Determine which service the farmer needs:
  - Crop advisory
  - Mandi prices
  - Alerts
  - Weather risk
  - Govt schemes

### FR-04: Crop Advisory (Personalized)
- Ask 1–3 follow-up questions if needed (crop, stage, location, symptom severity)
- Generate step-by-step actionable advice
- Include safety disclaimers and escalation when confidence is low

### FR-05: Mandi Price Intelligence
- Farmer asks “Aaj tamatar ka bhav kya hai?”
- System returns top nearby mandi prices (within radius)
- Must support location-based results (district/pincode or inferred from profile)

### FR-06: Price Alerts (Opt-in)
- Farmer sets rule: “Call me when wheat goes above ₹2500”
- Store alert preferences per phone number
- Trigger outbound call/SMS when condition met

### FR-07: Weather Risk Alerts
- Trigger warnings (e.g., heavy rain/fungal risk) using weather API signals
- Notify farmer in local language via call/SMS

### FR-08: Scheme Eligibility Checker (Basic)
- Ask simple profile questions (state, category, land size, crop)
- Return likely eligible schemes and next steps (MVP: limited set)

### FR-09: Logging & Analytics (Minimal)
- Store interactions:
  - transcripts
  - intents
  - advice delivered
  - alerts created/fired
- Admin view (basic Django admin) for debugging and monitoring

---

## 6. Non-Functional Requirements

### NFR-01: Accessibility
- Must work without smartphone UI; voice-first interaction
- SMS fallback for low connectivity

### NFR-02: Reliability
- Background tasks must not block call response
- Graceful degradation if external APIs fail

### NFR-03: Safety & Trust
- Do not provide unsafe pesticide dosage as definitive medical-grade instruction
- Provide “consult local expert” fallback when confidence is low
- Always include safe-use disclaimers

### NFR-04: Scalability (Design)
- Modular intents (“skills”) so new services can be added
- Queue-based background processing (Celery)

### NFR-05: Observability
- Central logging for calls and task runs
- Track failures for ASR/LLM/data fetch

---

## 7. Tech Stack (Finalized)
**Backend**
- Django
- Django REST Framework

**AI**
- OpenAI API

**Telephony**
- Twilio (inbound + outbound calls, SMS)

**Database**
- PostgreSQL

**Background Tasks**
- Celery + Redis

**Hosting**
- AWS EC2

---

## 8. External Integrations (MVP)
- Twilio Voice webhook (call events)
- Twilio SMS
- Weather API (e.g., OpenWeather / IMD proxy if available) — for MVP can be mocked
- Mandi price dataset/API (Agmarknet / cached dataset) — for MVP can be mocked

---

## 9. Acceptance Criteria 
- A live call can:
  1) Ask a crop issue in Hindi → receive spoken advisory
  2) Ask mandi prices → receive best nearby rates
  3) Set a price alert → system stores it and triggers (simulated) callback/SMS
- Admin dashboard shows call logs and alerts created
- System demonstrates modular flow for adding more farmer services later

---
