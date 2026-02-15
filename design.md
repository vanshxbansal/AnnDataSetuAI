# AnnadataSetu.AI — Design Document

## 1. Design Goals
1. **Voice-first**: usable from any phone (no app dependency)
2. **Personalized**: advice incorporates location/crop/stage/weather when available
3. **Modular “Skills”**: easy to add more farmer services without rewriting core
4. **Safe + Trustworthy**: guardrails, disclaimers, escalation on low confidence
5. **Scalable**: async tasks for alerts; cache for external data

---

## 2. High-Level Architecture

### Core Components
- **Twilio Voice/SMS**: inbound calls, outbound alerts
- **Django + DRF**: API + webhook handlers + admin
- **AI Layer (OpenAI API)**:
  - Intent classification
  - Advisory generation with guardrails
- **Context Layer**:
  - Farmer profile: location, crops, language preference
  - Farm metadata: crop stage, prior interactions
- **Data Layer (PostgreSQL)**:
  - Call sessions, transcripts, farmer profile, alerts, logs
- **Async Layer (Celery + Redis)**:
  - Price alert checks
  - Weather risk checks
  - Outbound call/SMS scheduling
- **Hosting (AWS EC2)**:
  - Django app
  - Redis
  - Worker(s)

---

## 3. Key Concept: Extensible Farmer Services Layer
Instead of hardcoding only “crop advisory” and “mandi prices,” the system routes every request through a **Skill Router**.

### Skills (MVP)
- CropAdvisorySkill
- MandiPriceSkill
- PriceAlertSkill
- WeatherAlertSkill
- SchemeEligibilitySkill
- (Extensible) OtherFarmerServicesSkill

Adding a new service = add a new Skill class + register it in the router.

---

## 4. Call Flow (Voice UX)

### A) Crop Advisory Flow
1. Farmer calls → speaks issue
2. ASR → transcript
3. Intent Router selects CropAdvisorySkill
4. Skill asks follow-up questions (if needed)
5. System composes farm context (location/crop/stage)
6. AI generates response with safe guardrails
7. TTS speaks back advice
8. Optional: schedule reminder via SMS/voice

### B) Mandi Price Query Flow
1. Farmer asks crop + “bhav”
2. Skill fetches prices (within radius of location)
3. Formats top 3–5 mandis and trends
4. Speaks results + sends SMS summary

### C) Price Alert Flow
1. Farmer: “Call me when wheat above 2500”
2. Parse crop + threshold + radius
3. Store alert in DB
4. Celery runs periodic check
5. If condition met → outbound call/SMS

### D) Weather Risk Alerts
1. Celery periodically checks weather signals by location
2. If heavy rain/humidity risk → alert farmers opted-in

---

## 5. Data Model (PostgreSQL)

### Farmer
- id (UUID)
- phone_number (unique)
- name (optional)
- language (default: hi)
- location_text (district/village)
- pincode (optional)
- lat, lng (optional)
- created_at, updated_at

### CallSession
- id (UUID)
- farmer_id (FK)
- twilio_call_sid
- started_at, ended_at
- transcript_raw
- detected_intent
- response_text
- status (success/fail)

### Alert
- id (UUID)
- farmer_id (FK)
- type (PRICE / WEATHER)
- crop (nullable for weather)
- threshold_price (nullable)
- radius_km (default 50)
- is_active (bool)
- last_triggered_at (nullable)
- created_at

### MandiPriceCache (optional)
- id
- crop
- mandi_name
- district
- price
- date

### SchemeQuery
- id
- farmer_id
- attributes_json (category, land_size, etc.)
- results_json
- created_at

---

## 6. APIs / Endpoints (Django + DRF)

### Twilio Webhooks
- `POST /twilio/voice/inbound/`
  - receives call, returns TwiML to prompt user and record speech
- `POST /twilio/voice/collect/`
  - receives speech result (transcript), triggers processing and responds
- `POST /twilio/sms/inbound/` (optional)

### Internal APIs
- `POST /api/alerts/` create alert
- `GET /api/prices/?crop=tomato&radius=50` fetch prices (for debugging/admin)
- `POST /api/schemes/check/` scheme eligibility

---

## 7. AI Design

### 7.1 Intent Classification
Input: transcript + minimal farmer profile  
Output: intent label + extracted entities (crop, price, location)

Implementation:
- OpenAI function calling (JSON schema) to return structured intent response

### 7.2 Crop Advisory Generation
Inputs:
- Transcript
- Farm context (location/pincode, crop, stage)
- Weather snapshot (if available)
- Knowledge snippets (curated advisory)

Process:
- Retrieval of relevant knowledge snippets (simple keyword match in MVP)
- Prompt OpenAI with:
  - “Use ONLY provided knowledge + safe general guidance”
  - “If uncertain, ask follow-ups or advise consulting expert”
  - “Avoid risky dosage; provide ranges and safety notes”

Outputs:
- Spoken answer (short)
- SMS summary (very short)

### 7.3 Guardrails
- Confidence estimation:
  - Heuristic: missing crop/stage + ambiguous symptoms → low confidence
- Safe fallback:
  - ask follow-up questions
  - recommend contacting local KVK/agri officer if severe

---

## 8. Background Jobs (Celery)

### Price Alert Checker (every 30–60 min)
- For each active PRICE alert:
  - fetch latest price for crop around farmer location
  - if price >= threshold and not triggered recently → notify

### Weather Risk Checker (daily or 2x/day)
- Fetch weather for farmer location
- If risk rules match → notify

### Notification Sender
- Sends outbound voice call (Twilio) and/or SMS
- Writes delivery status to logs

---

## 9. Deployment (AWS EC2)
- Nginx (optional) → Gunicorn → Django
- Redis for Celery broker
- Celery worker + Celery beat
- PostgreSQL (RDS optional; MVP can be local on EC2)

---

## 10. Security & Privacy
- Store minimum personal data (phone number + optional location)
- Encrypt secrets using environment variables
- Rate-limit inbound endpoints (basic throttling)
- Avoid storing full audio (store transcript only for MVP)

---

## 11. Demo Script (Hackathon)
1. Call: “Mere tamatar ke patte peele ho gaye”
   - AI asks 1 follow-up
   - Gives advice + prevention tips
2. Call: “Aaj gehu ka bhav kya hai?”
   - Returns top nearby mandi prices
3. Call: “Jab gehu 2500 se upar ho, call karna”
   - Creates alert
   - Trigger simulated callback/SMS

---

## 12. Future Enhancements
- Dialect-tuned ASR models
- Image/WhatsApp integration for leaf photos
- Community-level outbreak heatmaps
- Richer scheme database and document checklist automation
- Offline-first caching for mandi/weather
