// EBD Logic Engine (Stage 1)
// Input: hr, hrv
// Output: state + lighting prescription

function getEbdPrescription(hr, hrv) {
  hr = Number(hr);
  hrv = Number(hrv);

  if (!Number.isFinite(hr) || !Number.isFinite(hrv)) {
    return buildCommand({
      state: "MODERATE",
      visual: { mode: "NEUTRAL", colorOrCCT: { cctK: 3000 }, intensity: 0.5 },
      patientMessage: "Reading not available. Keeping the room steady.",
      clinicalJustification:
        "Invalid vitals input (NaN/undefined). Safe default applied.",
      vitals: { hr, hrv },
    });
  }

  const state = classifyState(hr, hrv);
  const p = prescriptionFromState(state);

  return buildCommand({
    state,
    visual: toLockedVisual(p),
    patientMessage: patientMessageFromState(state),
    clinicalJustification: p.justification,
    vitals: { hr, hrv },
  });
}

function classifyState(hr, hrv) {
  // A) SAFETY FIRST: Bradycardia (can be dangerous)
  if (hr < 50) return "BRADYCARDIA_ALERT";

  // B) HRV is strongest stress indicator (per your LR)
  if (hrv < 30) return "HIGH_STRESS"; // very low HRV = high stress
  if (hrv >= 30 && hrv <= 59) return "MODERATE";

  // C) HR-based refinement (only if HRV is good/high)
  if (hr > 100) return "HIGH_STRESS";
  if (hr >= 85 && hr <= 100) return "MODERATE";
  if (hr >= 60 && hr <= 80 && hrv >= 60) return "CALM_RECOVERY";

  // D) Safe default
  return "MODERATE";
}

function prescriptionFromState(state) {
  if (state === "BRADYCARDIA_ALERT") {
    return {
      state,
      lightingMode: "CCT",
      cctKelvin: 4000, // neutral daylight (stable + clear visibility)
      intensity: 0.8,
      alert: true,
      justification:
        "Bradycardia detected (HR < 50 BPM). Stable neutral lighting ensures safety, visibility, and physiological stability.",
    };
  }

  if (state === "HIGH_STRESS") {
    return {
      state,
      lightingMode: "COLOR",
      colorHex: "#2E8BFF", // soft blue (preview)
      wavelengthNm: 475,
      intensity: 0.6,
      justification:
        "High stress state. Soothing blue light (475 nm) promotes relaxation by reducing sympathetic nervous system activity and cortisol levels.",
    };
  }

  if (state === "MODERATE") {
    return {
      state,
      lightingMode: "CCT",
      cctKelvin: 2700,
      intensity: 0.5,
      justification:
        "Moderate state. Warm white light supports circadian rhythm and reduces cortisol levels.",
    };
  }

  if (state === "CALM_RECOVERY") {
    return {
      state,
      lightingMode: "CCT",
      cctKelvin: 4000,
      intensity: 0.7,
      justification:
        "Calm recovery state. Neutral daylight supports circadian alignment and accelerates physiological healing.",
    };
  }

  // never reached, but safe
  return {
    state: "MODERATE",
    lightingMode: "CCT",
    cctKelvin: 3000,
    intensity: 0.5,
  };
}

function buildCommand({
  state,
  visual,
  patientMessage,
  clinicalJustification,
  vitals,
}) {
  return {
    type: "ar:command",
    version: 1,
    timestamp: Date.now(),
    state, // HIGH_STRESS | MODERATE | CALM_RECOVERY | BRADYCARDIA_ALERT
    vitals: {
      hr: vitals.hr,
      hrv: vitals.hrv,
      units: { hr: "bpm", hrv: "ms" },
    },
    visual: {
      mode: visual.mode, // e.g., "SOOTHING", "NEUTRAL", "RECOVERY", "ALERT"
      colorOrCCT: visual.colorOrCCT, // e.g., "#2E7DFF" OR { cctK: 6500 }
      intensity: visual.intensity, // 0..1
    },
    message_patient: patientMessage, // short, friendly
    message_clinical: clinicalJustification, //  EBD justification text
  };
}

function toLockedVisual(p) {
  if (p.state === "BRADYCARDIA_ALERT") {
    return {
      mode: "ALERT",
      colorOrCCT: { cctK: p.cctKelvin },
      intensity: p.intensity,
    };
  }

  if (p.lightingMode === "COLOR") {
    return {
      mode: "SOOTHING",
      colorOrCCT: p.colorHex, // ← string, not object
      intensity: p.intensity,
    };
  }

  return {
    mode: "NEUTRAL",
    colorOrCCT: { cctK: p.cctKelvin }, // ← ONLY ONCE
    intensity: p.intensity,
  };
}


function patientMessageFromState(state) {
  if (state === "BRADYCARDIA_ALERT")
    return "Your heart rate is low. Please rest and call a nurse.";
  if (state === "HIGH_STRESS")
    return "Let’s slow down. The room will shift to a calming mode.";
  if (state === "CALM_RECOVERY")
    return "You’re recovering well. Keeping the room comfortable.";
  return "You’re okay. We’ll keep the room steady.";
}

module.exports = { getEbdPrescription };
