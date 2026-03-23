// EBD Logic Engine (Stage 1)
// Input: hr, hrv, userPalette
// Output: state + lighting prescription

// Therapeutic Color Palettes - Evidence-Based Chromotherapy
const colorMapping = {
  AMBER: {
    stress: "#FFBF00", // Amber - Cortisol reduction, warm comfort
    calm: "#FFD700",   // Gold - Sustained warmth, stability
    wavelength: 590,   // Yellow-orange spectrum
  },
  VIOLET: {
    stress: "#4B0082", // Indigo - Deep nervous system calming
    calm: "#EE82EE",   // Violet - Gentle recovery, spiritual calm
    wavelength: 420,   // Violet spectrum
  },
  PINK: {
    stress: "#FFB6C1", // Light Pink - Emotional soothing
    calm: "#FFC0CB",   // Pink - Nurturing, gentle comfort
    wavelength: 495,   // Pink-purple spectrum
  },
  EARTH: {
    stress: "#8B7355", // Brown - Grounding, stability
    calm: "#D2B48C",   // Tan - Natural, earthy calm
    wavelength: 580,   // Yellow-brown spectrum
  },
  DEFAULT: {
    stress: "#2E8BFF", // Soft Blue - Universal calming (fallback)
    calm: "#87CEEB",   // Sky Blue - General relaxation
    wavelength: 475,   // Blue spectrum
  }
};

// Patient-centered stress management (not automated physiological detection)
function getEbdPrescription(hr, hrv, userPalette = 'AMBER', sessionContext = {}) {
  hr = Number(hr);
  hrv = Number(hrv);

  // Validate userPalette, fallback to DEFAULT if invalid
  const palette = colorMapping[userPalette] || colorMapping.DEFAULT;

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

  // PATIENT-PRIMARY approach: Let patient control intervention
  const interventionMode = sessionContext.interventionTrigger || 'PATIENT_INITIATED';

  if (interventionMode === 'PATIENT_INITIATED') {
    // Patient manually requests stress intervention - pass user preferences for mode selection
    const userPreferences = sessionContext.userPreferences || { comfortMode: false, fullAR: true };
    return buildPatientInitiatedResponse(sessionContext.patientAnxietyLevel, palette, userPreferences);
  } else if (interventionMode === 'SCHEDULED') {
    // Scheduled breathing sessions (not stress-reactive)
    return buildScheduledResponse(palette);
  } else {
    // Monitoring mode only - show vitals, respect user preference
    const userPreferences = sessionContext.userPreferences || { comfortMode: false, fullAR: true };
    return buildMonitoringResponse(hr, hrv, palette, userPreferences);
  }
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

// Multi-signal stress classification addressing cardiac patient limitations
function classifyState(hr, hrv, patientBaseline = null, additionalSignals = {}) {
  // A) SAFETY FIRST: Bradycardia (can be dangerous)
  if (hr < 50) return "BRADYCARDIA_ALERT";

  // B) HRV-PRIMARY approach (most reliable for cardiac patients)
  // HRV is the strongest autonomic indicator, less affected by medications
  const hrvStress = classifyHRVStress(hrv);

  // C) HR-SECONDARY (supportive evidence only, not primary)
  const hrStress = classifyHRSupportive(hr, patientBaseline);

  // D) ADDITIONAL SIGNALS if available
  const multiModalStress = combineSignals(hrvStress, hrStress, additionalSignals);

  return multiModalStress;
}

function classifyHRVStress(hrv) {
  // HRV thresholds based on cardiac patient research
  if (hrv < 20) return "SEVERE_STRESS";    // Very low HRV = high sympathetic
  if (hrv < 35) return "HIGH_STRESS";      // Low HRV = moderate stress
  if (hrv < 50) return "MILD_STRESS";      // Borderline HRV
  if (hrv >= 60) return "RECOVERY_STATE";  // Good parasympathetic tone
  return "MODERATE";                       // Normal range
}

function classifyHRSupportive(hr, baseline) {
  // HR provides SUPPORTIVE evidence only (not primary decision)
  if (baseline !== null) {
    const deviation = ((hr - baseline) / baseline) * 100;
    if (deviation > 20) return "HR_ELEVATED";     // Supporting evidence
    if (deviation > 10) return "HR_MODERATE";     // Mild supporting evidence
    return "HR_NORMAL";
  }

  // Fallback for very high HR (supportive evidence)
  if (hr > 120) return "HR_ELEVATED";
  if (hr > 100) return "HR_MODERATE";
  return "HR_NORMAL";
}

function combineSignals(hrvStress, hrStress, additionalSignals = {}) {
  // HRV-weighted decision (primary indicator)
  if (hrvStress === "SEVERE_STRESS") return "HIGH_STRESS";

  // Combine HRV + HR supportive evidence
  if (hrvStress === "HIGH_STRESS" && hrStress === "HR_ELEVATED") {
    return "HIGH_STRESS";  // Both signals agree
  }

  if (hrvStress === "HIGH_STRESS") return "MODERATE"; // HRV only

  // Check for patient self-report (if available)
  if (additionalSignals.selfReportAnxiety >= 7) {
    return "HIGH_STRESS";  // Patient knows their own state
  }

  if (hrvStress === "RECOVERY_STATE" && hrStress === "HR_NORMAL") {
    return "CALM_RECOVERY";
  }

  // Conservative default
  return "MODERATE";
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
