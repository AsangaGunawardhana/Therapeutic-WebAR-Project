// EBD Logic Engine - Final Version for March 30th Deadline
// Incorporates Cardiologist feedback, Multi-modal Data Fusion, and Hardware Fallbacks

const colorMapping = {
  OCEAN: { stress: "#4FC3F7", calm: "#81D4FA", wavelength: 470 },
  NATURE: { stress: "#66BB6A", calm: "#81C784", wavelength: 530 },
  AMBER: { stress: "#FFBF00", calm: "#FFD700", wavelength: 590 },
  VIOLET: { stress: "#4B0082", calm: "#EE82EE", wavelength: 420 },
  PINK: { stress: "#FFB6C1", calm: "#FFC0CB", wavelength: 495 },
  EARTH: { stress: "#8B7355", calm: "#D2B48C", wavelength: 580 },
  DEFAULT: { stress: "#4FC3F7", calm: "#81D4FA", wavelength: 470 }
};

/**
 * Main Entry Point: getEbdPrescription
 * Performs Data Fusion between Sensor (HR/HRV) and Manual Input
 */
function getEbdPrescription(hr, hrv, userPalette = 'OCEAN', sessionContext = {}) {
  hr = Number(hr);
  hrv = Number(hrv);
  const palette = colorMapping[userPalette] || colorMapping.DEFAULT;
  const userPrefs = sessionContext.userPreferences || { comfortMode: false };
  const manualAnxiety = Number(sessionContext.patientAnxietyLevel || 0);

  // 1. EMERGENCY CHECK: Bradycardia (Medical Safety Gate)
  if (hr > 0 && hr < 50) {
    return buildCommand({
      state: "BRADYCARDIA_ALERT",
      visual: { mode: "SAFETY", colorOrCCT: { cctK: 4000 }, intensity: 0.8 },
      patientMessage: "Low heart rate detected. Please rest and stay calm.",
      clinicalJustification: "Emergency low heart rate (<50 BPM). Interaction disabled for safety.",
      vitals: { hr, hrv }
    });
  }

  // 2. DATA FUSION BRAIN: Determine Clinical State
  const sensorState = classifyState(hr, hrv); 

  // LOGIC GATE: Merging sensor data with the patient's manual button
  let finalState = sensorState;
  
  if (manualAnxiety >= 7) {
    finalState = "HIGH_STRESS"; // Patient override: They feel stressed, believe them.
  } else if (hr >= 100 && manualAnxiety < 4) {
    finalState = "MONITORING_ELEVATED"; // Doctor's Case: High HR, but patient feels calm.
  }

  // 3. GENERATE THE VISUAL COMMAND based on the final fused state

  if (finalState === "HIGH_STRESS") {
    return buildCommand({
      state: "HIGH_STRESS",
      visual: {
        mode: userPrefs.comfortMode ? "SIMPLE_CALM" : "IMMERSIVE_SOOTHING",
        colorOrCCT: palette.stress,
        intensity: 0.7,
        particles: { enabled: !userPrefs.comfortMode, type: "calming_flow", speed: "slow" },
        breathing: { pattern: "4-7-8", visualGuide: "expanding_circle" }
      },
      patientMessage: "Let's breathe together. Focus on the light.",
      clinicalJustification: `Acute stress confirmed (Manual: ${manualAnxiety}, HR: ${hr}). Applying ${palette.stress} spectrum.`,
      vitals: { hr, hrv }
    });
  }

  if (finalState === "MONITORING_ELEVATED") {
    return buildCommand({
      state: "MONITORING_ELEVATED",
      visual: { 
        mode: "GENTLE_AR", 
        colorOrCCT: { cctK: 2700 }, // Neutral Warm Amber
        intensity: 0.4,
        particles: { enabled: !userPrefs.comfortMode, type: "soft_ambient", speed: "very_slow" }
      },
      patientMessage: "Your heart rate is slightly high. Keeping the room steady.",
      clinicalJustification: "High HR detected without subjective stress. Applying neutral warmth to prevent escalation.",
      vitals: { hr, hrv }
    });
  }

  if (finalState === "MODERATE") {
    return buildCommand({
      state: "MODERATE",
      visual: {
        mode: "GENTLE_AR",
        colorOrCCT: { cctK: 3000 }, // Gentle Warm White
        intensity: 0.5,
        particles: { enabled: !userPrefs.comfortMode, type: "soft_ambient", speed: "very_slow" }
      },
      patientMessage: "The room is adjusting to help you stay comfortable.",
      clinicalJustification: "Moderate stress levels detected. Applying warm lighting to stabilize.",
      vitals: { hr, hrv }
    });
  }

  // DEFAULT: Calm Recovery
  return buildCommand({
    state: "CALM_RECOVERY",
    visual: {
      mode: "RECOVERY_AR",
      colorOrCCT: palette.calm,
      intensity: 0.4,
      particles: { enabled: !userPrefs.comfortMode, type: "peaceful_drift", speed: "drift" }
    },
    patientMessage: "You are doing well. Recovering comfortably.",
    clinicalJustification: "Vitals within normal range. Maintaining therapeutic environment.",
    vitals: { hr, hrv }
  });
}

function buildPatientInitiatedResponse(anxietyLevel, palette, userPreferences = {}) {
  const useComfortMode = userPreferences.comfortMode || false; // Simple mode for older patients
  const useFullAR = userPreferences.fullAR || true;           // Full AR mode with particles (DEFAULT)

  // Use baseline vitals for patient-initiated interventions (no real HR data available)
  const baselineHR = 75;
  const baselineHRV = 50;

  // FULL AR MODE (Your Original Design) - Keep the particles and interactions!
  if (useFullAR && !useComfortMode) {
    if (anxietyLevel >= 7) {
      return buildCommand({
        state: "PATIENT_REPORTED_HIGH_STRESS",
        visual: {
          mode: "IMMERSIVE_SOOTHING",
          colorOrCCT: palette.stress,
          intensity: 0.6,
          particles: {
            enabled: true,
            type: "calming_flow",
            density: "medium",
            speed: "slow"
          },
          breathing: {
            pattern: "4-7-8",
            visualGuide: "expanding_circle",
            particleSync: true
          }
        },
        patientMessage: "Let's create a calming space together. Focus on the breathing guide and let the environment support you.",
        clinicalJustification: "Patient self-reported high stress (≥7/10). Delivering immersive AR therapeutic environment with Evidence-Based Design lighting, calming particles, and guided breathing visualization.",
        vitals: { hr: baselineHR, hrv: baselineHRV },
      });
    } else if (anxietyLevel >= 4) {
      return buildCommand({
        state: "PATIENT_REPORTED_MODERATE_STRESS",
        visual: {
          mode: "GENTLE_AR",
          colorOrCCT: { cctK: 2700 },
          intensity: 0.5,
          particles: {
            enabled: true,
            type: "soft_ambient",
            density: "light",
            speed: "very_slow"
          },
          breathing: {
            pattern: "box_breathing",
            visualGuide: "gentle_glow"
          }
        },
        patientMessage: "The room is adjusting to help you feel more at ease. Follow the gentle breathing guide.",
        clinicalJustification: "Patient self-reported moderate stress (4-6/10). Gentle AR intervention with warm lighting, subtle particles, and breathing guidance.",
        vitals: { hr: baselineHR, hrv: baselineHRV },
      });
    }

    return buildCommand({
      state: "PATIENT_CALM_AR",
      visual: {
        mode: "RECOVERY_AR",
        colorOrCCT: palette.calm,
        intensity: 0.7,
        particles: {
          enabled: true,
          type: "peaceful_drift",
          density: "minimal",
          speed: "drift"
        }
      },
      patientMessage: "You're in a good space. The environment will support your continued recovery.",
      clinicalJustification: "Patient self-reported calm state. Maintaining supportive AR environment with recovery-optimized lighting and peaceful visual elements.",
      vitals: { hr: baselineHR, hrv: baselineHRV },
    });
  }

  // COMFORT MODE (Simple for Older Patients) - Your new addition
  if (useComfortMode) {
    if (anxietyLevel >= 7) {
      return buildCommand({
        state: "PATIENT_REQUESTED_COMFORT",
        visual: { mode: "SIMPLE_CALM", colorOrCCT: { cctK: 2700 }, intensity: 0.4 },
        patientMessage: "Let's take some slow, deep breaths together.",
        clinicalJustification: "Patient requested comfort support. Providing simple breathing guidance with warm, gentle lighting appropriate for recovery environment.",
        vitals: { hr: baselineHR, hrv: baselineHRV },
      });
    } else if (anxietyLevel >= 4) {
      return buildCommand({
        state: "PATIENT_REQUESTED_MILD_SUPPORT",
        visual: { mode: "GENTLE", colorOrCCT: { cctK: 3000 }, intensity: 0.3 },
        patientMessage: "Taking a moment to breathe can help you feel more comfortable.",
        clinicalJustification: "Patient requested mild support. Gentle breathing guidance with soft, age-appropriate lighting.",
        vitals: { hr: baselineHR, hrv: baselineHRV },
      });
    }

    return buildCommand({
      state: "PATIENT_COMFORTABLE",
      visual: { mode: "RESTFUL", colorOrCCT: { cctK: 3000 }, intensity: 0.5 },
      patientMessage: "You're doing well with your recovery. Keep resting comfortably.",
      clinicalJustification: "Patient reports feeling comfortable. Maintaining restful lighting environment appropriate for recovery.",
      vitals: { hr: baselineHR, hrv: baselineHRV },
    });
  }
}

function buildScheduledResponse(palette) {
  const baselineHR = 75;
  const baselineHRV = 50;

  // Scheduled breathing session (preventive, not reactive)
  return buildCommand({
    state: "SCHEDULED_BREATHING",
    visual: {
      mode: "GUIDED_BREATHING",
      colorOrCCT: { cctK: 2700 },
      intensity: 0.5,
      particles: {
        enabled: true,
        type: "gentle_guidance",
        density: "light",
        speed: "breathing_sync"
      }
    },
    patientMessage: "Time for your scheduled breathing session. Let's practice together.",
    clinicalJustification: "Scheduled breathing practice session. Proactive stress management and breathing technique reinforcement.",
    vitals: { hr: baselineHR, hrv: baselineHRV },
  });
}

function buildMonitoringResponse(hr, hrv, palette, userPreferences = {}) {
  // Respect user preference for monitoring mode
  const useComfortMode = userPreferences.comfortMode || false;

  if (useComfortMode) {
    // Simple monitoring for older patients - no particles
    return buildCommand({
      state: "MONITORING_SIMPLE",
      visual: { mode: "SIMPLE_MONITORING", colorOrCCT: { cctK: 3000 }, intensity: 0.3 },
      patientMessage: `Heart rate: ${hr} beats per minute. Everything looks steady.`,
      clinicalJustification: "Simple monitoring mode for comfort-preference patients. Gentle interface without complex visuals.",
      vitals: { hr, hrv },
    });
  } else {
    // Full AR monitoring with particles
    return buildCommand({
      state: "MONITORING_AR",
      visual: {
        mode: "AR_MONITORING",
        colorOrCCT: { cctK: 3000 },
        intensity: 0.5,
        particles: {
          enabled: true,
          type: "gentle_monitoring",
          density: "minimal",
          speed: "slow"
        }
      },
      patientMessage: `HR: ${hr} bpm. System monitoring - press 'I need help' if you feel stressed.`,
      clinicalJustification: "AR monitoring mode with minimal particle feedback for tech-comfortable patients.",
      vitals: { hr, hrv },
    });
  }
}

/**
 * HRV and HR Classification Logic
 * Includes Fallback for when HRV is not provided by hardware
 */
function classifyState(hr, hrv) {
  // Check if HRV is real (Mock data is usually 50)
  const isHRVAvailable = (hrv > 0 && hrv !== 50);

  if (isHRVAvailable) {
    // PRIMARY INDICATOR: HRV (Clinical Research)
    if (hrv < 20) return "HIGH_STRESS";
    if (hrv < 35) return "HIGH_STRESS";
    if (hrv < 50) return "MODERATE";
    return "CALM_RECOVERY";
  } else {
    // SECONDARY INDICATOR: HR (Hardware Fallback for Demo)
    if (hr >= 100) return "HIGH_STRESS";
    if (hr >= 85) return "MODERATE";
    return "CALM_RECOVERY";
  }
}

function prescriptionFromState(state, palette) {
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
      colorHex: palette.stress, // Dynamic color based on user preference
      wavelengthNm: palette.wavelength,
      intensity: 0.6,
      justification:
        `High stress state. Therapeutic ${palette.stress} light (${palette.wavelength} nm) promotes relaxation by reducing sympathetic nervous system activity and cortisol levels.`,
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
      lightingMode: "COLOR",
      colorHex: palette.calm, // Dynamic color for calm state
      wavelengthNm: palette.wavelength,
      intensity: 0.7,
      justification:
        `Calm recovery state. Therapeutic ${palette.calm} light supports circadian alignment and accelerates physiological healing.`,
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
  // Build enhanced visual object that includes particles and breathing config
  const enhancedVisual = {
    mode: visual.mode, // e.g., "IMMERSIVE_SOOTHING", "SIMPLE_CALM", "NEUTRAL"
    colorOrCCT: visual.colorOrCCT, // e.g., "#2E7DFF" OR { cctK: 6500 }
    intensity: visual.intensity, // 0..1
  };

  // Add particle configuration if present (for Full AR mode)
  if (visual.particles) {
    enhancedVisual.particles = {
      enabled: visual.particles.enabled,
      type: visual.particles.type,
      density: visual.particles.density,
      speed: visual.particles.speed,
      particleSync: visual.particles.particleSync || false
    };
  }

  // Add breathing guidance configuration if present
  if (visual.breathing) {
    enhancedVisual.breathing = {
      pattern: visual.breathing.pattern,
      visualGuide: visual.breathing.visualGuide,
      particleSync: visual.breathing.particleSync || false
    };
  }

  return {
    type: "ar:command",
    version: 1,
    timestamp: Date.now(),
    state, // PATIENT_REPORTED_HIGH_STRESS | PATIENT_REQUESTED_COMFORT | etc.
    vitals: {
      hr: vitals.hr,
      hrv: vitals.hrv,
      units: { hr: "bpm", hrv: "ms" },
    },
    visual: enhancedVisual,
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
