/* ============================================================
   ASM Postpartum Taper Calculator
   ============================================================ */

'use strict';

// ── Medication profiles ───────────────────────────────────────
//
// Core heuristic:
//   The more an ASM relies on metabolic pathways that are upregulated
//   by oestrogen/progesterone (glucuronidation for LTG; renal tubular
//   secretion for LEV), the more dramatically clearance changes during
//   pregnancy — and the more important postpartum tapering becomes.
//   The rate of postpartum clearance normalisation also matters:
//   LTG normalises particularly fast (days to 1–2 weeks), making it
//   the highest-risk drug in the immediate postpartum period.
//
//   LTG: Glucuronidation (UGT1A4) is strongly induced by oestrogen.
//        Clearance increases 2–3× during pregnancy. After delivery,
//        oestrogen falls abruptly → clearance normalises within days
//        to 1–2 weeks → rapid rise in plasma levels → toxicity risk.
//        Per epilepsypregnancy.com / MONEAD data:
//          - First reduction: day 2 postpartum
//          - Step interval:   every 4 days
//          - Target dose:     ~116% of pre-pregnancy dose
//        Ref: Pennell et al. (2004, 2008); epilepsypregnancy.com
//
//   LEV: Renal clearance increases ~50–100% during pregnancy
//        (progesterone-mediated increased GFR and tubular secretion).
//        Returns toward baseline within days postpartum, though
//        more gradually than LTG.
//        Per epilepsypregnancy.com:
//          - First reduction: day 3 postpartum
//          - Step interval:   every 5 days
//          - Target dose:     ~136% of pre-pregnancy dose
//        Ref: Tomson, Landmark & Battino (2013); epilepsypregnancy.com

const MEDS = {
  ltg: {
    label: 'Lamotrigine (LTG)',
    unit: 'mg/L',
    roundTo: 25,              // tablet sizes: 25, 50, 100, 150, 200 mg
    firstStepDay: 2,          // first dose reduction at day 2 postpartum (MONEAD)
    stepIntervalDays: 4,      // then every 4 days
    targetMultiplier: 1.16,   // target ~116% of pre-pregnancy dose (MONEAD data)
    therapeuticRange: { low: 3, high: 15 },
    recommendation:
      '<strong>Why taper?</strong> LTG is cleared primarily by glucuronidation (UGT1A4), ' +
      'a pathway strongly induced by oestrogen. Clearance increases 2–3× during pregnancy. ' +
      'After delivery, oestrogen falls abruptly and clearance returns to baseline within ' +
      '<strong>days to 1–2 weeks</strong> — making LTG the highest-risk ASM in the ' +
      'immediate postpartum period. Without dose reduction, plasma levels can rise ' +
      'into the toxic range within days of delivery.' +
      '<br><br>' +
      '<strong>Recommendation (epilepsypregnancy.com / MONEAD):</strong> Begin first ' +
      'reduction at <strong>day 2 postpartum</strong>, then every <strong>4 days</strong> ' +
      'until target is reached (~2 weeks total). ' +
      'The target is set at <strong>~116% of the pre-pregnancy dose</strong> — slightly ' +
      'above baseline to buffer against postpartum sleep deprivation and stress. ' +
      'Plasma level monitoring at delivery and at 1 week postpartum is strongly advised.',
    monitoring: [
      'Check plasma level at delivery (baseline)',
      'Repeat plasma level at 1 week postpartum',
      'Repeat at each dose step if levels are available',
      'Watch for toxicity: dizziness, diplopia, ataxia, nausea',
      'LTG transfers into breast milk — monitor breastfed infant for drowsiness',
    ],
  },
  lev: {
    label: 'Levetiracetam (LEV)',
    unit: 'mg/L',
    roundTo: 500,             // standard tablet sizes: 500, 1000 mg
    firstStepDay: 3,          // first dose reduction at day 3 postpartum
    stepIntervalDays: 5,      // then every 5 days
    targetMultiplier: 1.36,   // target ~136% of pre-pregnancy dose
    therapeuticRange: { low: 12, high: 46 },
    recommendation:
      '<strong>Why taper?</strong> LEV is renally cleared, and renal clearance increases ' +
      '~50–100% during pregnancy (progesterone-mediated rise in GFR and tubular secretion). ' +
      'After delivery, clearance returns toward baseline over days to weeks — somewhat ' +
      'more gradually than LTG, but dose reduction is still required to prevent accumulation.' +
      '<br><br>' +
      '<strong>Recommendation (epilepsypregnancy.com):</strong> Begin first reduction at ' +
      '<strong>day 3 postpartum</strong>, then every <strong>5 days</strong> until target ' +
      'is reached (~2 weeks total). ' +
      'The target is set at <strong>~136% of the pre-pregnancy dose</strong> — slightly ' +
      'above baseline to buffer against postpartum sleep deprivation and stress. ' +
      'Plasma level monitoring in the first week postpartum is recommended.',
    monitoring: [
      'Check plasma level at delivery (baseline)',
      'Repeat plasma level at 1 week postpartum',
      'Watch for dose-dependent side effects: irritability, mood changes',
      'Low breast milk transfer — generally considered compatible with breastfeeding',
    ],
  },
};

// ── DOM shorthand ─────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

// ── State ─────────────────────────────────────────────────────
let selectedMed = null;

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

  // Medication buttons
  document.querySelectorAll('.med-btn').forEach((btn) => {
    btn.addEventListener('click', () => selectMed(btn.dataset.med));
  });

  // Pre-pregnancy dose → auto-populate no target field needed
  $('pre-preg-dose').addEventListener('input', () => {
    // Clear any validation state
    $('current-dose').classList.remove('invalid');
  });

  // Back button
  $('back-btn').addEventListener('click', () => {
    $('step-doses').classList.add('hidden');
    $('step-medication').classList.remove('hidden');
    $('results-section').classList.add('hidden');
  });

  // Edit button
  $('edit-btn').addEventListener('click', () => {
    $('results-section').classList.add('hidden');
    $('step-doses').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Generate
  $('generate-btn').addEventListener('click', generate);

  // Print
  $('print-btn').addEventListener('click', () => window.print());

  // Default delivery date to today
  $('delivery-date').value = new Date().toISOString().split('T')[0];
});

// ── Select medication ─────────────────────────────────────────
function selectMed(med) {
  selectedMed = med;

  document.querySelectorAll('.med-btn').forEach((b) => b.classList.remove('selected'));
  $(`btn-${med}`).classList.add('selected');

  // Show recommendation
  $('rec-box').innerHTML = MEDS[med].recommendation;
  $('plasma-unit').textContent = MEDS[med].unit;

  // Show dose step
  $('step-medication').classList.add('hidden');
  $('step-doses').classList.remove('hidden');
  $('results-section').classList.add('hidden');

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Generate taper ────────────────────────────────────────────
function generate() {
  if (!selectedMed) return;

  const med = MEDS[selectedMed];

  const currentDose = parseFloat($('current-dose').value);
  const prePregDose = parseFloat($('pre-preg-dose').value);
  const dosesPerDay = parseInt($('doses-per-day').value);
  const deliveryDate = $('delivery-date').value || null;

  const plasmaCurrentRaw = $('plasma-current').value;
  const plasmaPrepregRaw = $('plasma-prepreg').value;
  const plasmaCurrent = plasmaCurrentRaw ? parseFloat(plasmaCurrentRaw) : null;
  const plasmaPrepreg = plasmaPrepregRaw ? parseFloat(plasmaPrepregRaw) : null;

  // ── Validate ──────────────────────────────────────────────
  if (!currentDose || currentDose <= 0) {
    $('current-dose').classList.add('invalid');
    $('current-dose').focus();
    return;
  }
  $('current-dose').classList.remove('invalid');

  // Determine target dose
  // Per epilepsypregnancy.com: target is set slightly above the pre-pregnancy
  // dose (LTG: ~116%, LEV: ~136%) to buffer against postpartum sleep
  // deprivation and stress, which are independent seizure triggers.
  let targetDose;
  let targetNote = '';

  if (!isNaN(prePregDose) && prePregDose > 0) {
    if (prePregDose >= currentDose) {
      alert(
        'The pre-pregnancy dose is equal to or higher than the current dose. ' +
        'No postpartum dose reduction may be required. Please review the entries.'
      );
      return;
    }
    // Apply postpartum target multiplier
    const adjustedTarget = roundNearest(prePregDose * med.targetMultiplier, med.roundTo);
    if (adjustedTarget >= currentDose) {
      // Multiplier pushes target above current dose — no meaningful taper needed
      targetDose = prePregDose;
      targetNote = 'minimal';
    } else {
      targetDose = adjustedTarget;
      targetNote = 'adjusted';
    }
  } else {
    // Pre-pregnancy dose unknown — estimate as 50% of delivery dose
    targetDose = roundNearest(currentDose * 0.5, med.roundTo);
    targetNote = 'estimated';
  }

  // ── Build taper schedule ──────────────────────────────────
  const steps = buildTaperSteps(
    currentDose, targetDose, med.roundTo, deliveryDate,
    med.firstStepDay, med.stepIntervalDays
  );

  // ── Render ────────────────────────────────────────────────
  renderResults({
    med, currentDose, targetDose, targetNote,
    dosesPerDay, steps,
    plasmaCurrent, plasmaPrepreg,
  });
}

// ── Render results ────────────────────────────────────────────
function renderResults({ med, currentDose, targetDose, targetNote,
                         dosesPerDay, steps, plasmaCurrent, plasmaPrepreg }) {

  let html = '';

  // Summary chips
  const reduction = currentDose - targetDose;
  const reductionPct = Math.round((reduction / currentDose) * 100);

  html += `<div class="summary-strip">
    <div class="summary-chip">
      <div class="chip-label">Medication</div>
      <div class="chip-val">${med.label}</div>
    </div>
    <div class="summary-chip">
      <div class="chip-label">Starting dose</div>
      <div class="chip-val">${currentDose} mg/day</div>
    </div>
    <div class="summary-chip">
      <div class="chip-label">Target dose</div>
      <div class="chip-val">${targetDose} mg/day</div>
    </div>
    <div class="summary-chip">
      <div class="chip-label">Total reduction</div>
      <div class="chip-val">${reduction} mg (${reductionPct}%)</div>
    </div>
    <div class="summary-chip">
      <div class="chip-label">Duration</div>
      <div class="chip-val">${durationLabel(steps)}</div>
    </div>
  </div>`;

  // Target note
  if (targetNote === 'adjusted') {
    html += `<div class="plasma-flag ok" style="margin-bottom:1.25rem;">
      ✓ <strong>Target dose set at ${targetDose} mg/day</strong> (~${Math.round(med.targetMultiplier * 100)}% of pre-pregnancy dose).
      This is intentionally slightly above the pre-pregnancy dose to buffer against
      postpartum sleep deprivation and stress, per epilepsypregnancy.com guidance.
    </div>`;
  } else if (targetNote === 'estimated') {
    html += `<div class="plasma-flag low" style="margin-bottom:1.25rem;">
      ⚠ <strong>Pre-pregnancy dose not provided.</strong>
      Target dose of <strong>${targetDose} mg/day</strong> is an estimate (50% of delivery dose).
      Verify against the patient's clinical history before use.
    </div>`;
  } else if (targetNote === 'minimal') {
    html += `<div class="plasma-flag low" style="margin-bottom:1.25rem;">
      ⚠ <strong>Minimal postpartum reduction expected.</strong>
      The adjusted target (${Math.round(med.targetMultiplier * 100)}% of pre-pregnancy dose)
      is close to the current delivery dose. Review whether dose adjustment is needed.
    </div>`;
  }

  // Plasma level flag
  if (plasmaCurrent !== null) {
    const r = med.therapeuticRange;
    let flagClass = 'ok';
    let flagMsg = `Current plasma level: <strong>${plasmaCurrent} ${med.unit}</strong> — within the standard therapeutic range (${r.low}–${r.high} ${med.unit}).`;

    if (plasmaCurrent > r.high) {
      flagClass = 'high';
      flagMsg = `Current plasma level: <strong>${plasmaCurrent} ${med.unit}</strong> — <strong>above the therapeutic range</strong> (${r.low}–${r.high} ${med.unit}). Toxicity risk is elevated; prompt dose reduction is indicated.`;
    } else if (plasmaCurrent < r.low) {
      flagClass = 'low';
      flagMsg = `Current plasma level: <strong>${plasmaCurrent} ${med.unit}</strong> — below the therapeutic range (${r.low}–${r.high} ${med.unit}). Caution: consider whether dose reduction is appropriate given the current level.`;
    }

    if (plasmaPrepreg !== null) {
      flagMsg += ` Pre-pregnancy reference level: <strong>${plasmaPrepreg} ${med.unit}</strong>.`;
    }

    html += `<div class="plasma-flag ${flagClass}">${flagMsg}</div>`;
  }

  // Taper table
  const hasDates = steps[0].date !== null;

  html += `<div class="taper-table-wrap"><table class="taper-table">
    <thead>
      <tr>
        ${hasDates ? '<th>Date</th>' : ''}
        <th>Timepoint</th>
        <th>Daily dose</th>
        <th>Per dose (×${dosesPerDay}/day)</th>
        <th>Change</th>
      </tr>
    </thead>
    <tbody>`;

  steps.forEach((s, i) => {
    const prev = i === 0 ? s.dose : steps[i - 1].dose;
    const change = i === 0 ? '—' : `↓ ${prev - s.dose} mg`;
    const perDose = roundNearest(s.dose / dosesPerDay, dosesPerDay === 1 ? 1 : 0.5);
    const badgeLabel = s.badge === 'delivery' ? 'Pre-delivery'
                     : s.badge === 'target'   ? 'Target reached' : 'Reduce';
    const badgeClass = `badge-${s.badge}`;
    const rowClass = s.badge === 'target' ? ' class="target-row"' : '';

    html += `<tr${rowClass}>
      ${hasDates ? `<td>${s.date}</td>` : ''}
      <td>${s.label}${s.note ? `<br><span class="step-note">${s.note}</span>` : ''}</td>
      <td><strong>${s.dose} mg</strong></td>
      <td>${perDose} mg</td>
      <td>${i === 0 ? `<span class="badge ${badgeClass}">${badgeLabel}</span>` : change}</td>
    </tr>`;
  });

  html += `</tbody></table></div>`;

  // Monitoring
  html += `<div class="monitoring">
    <h3>Monitoring</h3>
    <ul>${med.monitoring.map((m) => `<li>${m}</li>`).join('')}</ul>
  </div>`;

  html += `<p class="generated-note">Generated ${new Date().toLocaleString()} &mdash; for practitioner use only.</p>`;

  // Inject and show
  $('results-content').innerHTML = html;
  $('step-doses').classList.add('hidden');
  $('results-section').classList.remove('hidden');
  $('results-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Taper step builder ────────────────────────────────────────
//
// Timing per epilepsypregnancy.com:
//   LTG: first step day 2, then every 4 days
//   LEV: first step day 3, then every 5 days
//
// Two scenarios:
//
//   Small reduction (≤ 2 tablet steps):
//     Single-step reduction at firstStepDay — no prolonged taper needed.
//
//   Standard reduction (> 2 tablet steps):
//     Step 1 — day firstStepDay:              ~1/3 of total reduction
//     Step 2 — day firstStepDay + interval:   half the remainder
//     Step 3 — day firstStepDay + 2×interval: reach target (if needed)
//
function buildTaperSteps(currentDose, targetDose, roundTo, deliveryDate,
                          firstStepDay, stepIntervalDays) {
  const totalReduction = currentDose - targetDose;
  const steps = [];

  // Context row — dose patient is on at delivery (no change yet)
  steps.push({
    label: 'Delivery dose',
    dose: currentDose,
    date: deliveryDate ? dateLabel(deliveryDate, 0) : null,
    badge: 'delivery',
    note: null,
  });

  // ── Edge case: small reduction ────────────────────────────
  // ≤ 2 tablet increments — single-step reduction at firstStepDay.
  if (totalReduction <= roundTo * 2) {
    steps.push({
      label: `Day ${firstStepDay} postpartum`,
      dose: targetDose,
      date: deliveryDate ? dateLabel(deliveryDate, firstStepDay) : null,
      badge: 'target',
      note: 'Small adjustment — single-step reduction.',
    });
    return steps;
  }

  // ── Standard taper ────────────────────────────────────────
  // Step 1: first reduction at firstStepDay (~1/3 of total)
  const day1 = firstStepDay;
  const step1reduction = roundNearest(totalReduction / 3, roundTo);
  const step1dose = currentDose - step1reduction;
  steps.push({
    label: `Day ${day1} postpartum`,
    dose: step1dose,
    date: deliveryDate ? dateLabel(deliveryDate, day1) : null,
    badge: 'reduce',
    note: 'First reduction — do not reduce before this day.',
  });

  // Step 2: half the remaining reduction
  const day2 = day1 + stepIntervalDays;
  const remaining = step1dose - targetDose;
  const step2dose = roundNearest(step1dose - remaining / 2, roundTo);

  if (step2dose > targetDose) {
    steps.push({
      label: `Day ${day2} postpartum`,
      dose: step2dose,
      date: deliveryDate ? dateLabel(deliveryDate, day2) : null,
      badge: 'reduce',
      note: null,
    });
    // Step 3: reach target
    const day3 = day2 + stepIntervalDays;
    steps.push({
      label: `Day ${day3} postpartum — target`,
      dose: targetDose,
      date: deliveryDate ? dateLabel(deliveryDate, day3) : null,
      badge: 'target',
      note: null,
    });
  } else {
    // Remaining fits in one more step
    steps.push({
      label: `Day ${day2} postpartum — target`,
      dose: targetDose,
      date: deliveryDate ? dateLabel(deliveryDate, day2) : null,
      badge: 'target',
      note: null,
    });
  }

  return steps;
}

function durationLabel(steps) {
  const taperSteps = steps.length - 1;
  if (taperSteps === 1) return 'Single step';
  // Approximate total days from the last step label
  const lastLabel = steps[steps.length - 1].label;
  const match = lastLabel.match(/Day (\d+)/);
  if (match) {
    const days = parseInt(match[1]);
    return `~${Math.ceil(days / 7)} week${days > 7 ? 's' : ''}`;
  }
  return '~2 weeks';
}

// ── Helpers ───────────────────────────────────────────────────
function roundNearest(value, nearest) {
  if (!nearest || nearest <= 0) return value;
  return Math.round(value / nearest) * nearest;
}

function dateLabel(startStr, offsetDays) {
  const d = new Date(startStr);
  d.setDate(d.getDate() + offsetDays);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
