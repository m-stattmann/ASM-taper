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
//        Taper to pre-pregnancy dose over 2–3 weeks.
//        Ref: Pennell et al. (2008), Tomson et al. (2019 EURAP)
//
//   LEV: Renal clearance increases ~50–100% during pregnancy
//        (progesterone-mediated increased GFR and tubular secretion).
//        Returns toward baseline within days postpartum, though
//        more gradually than LTG. Taper over 2–3 weeks.
//        Ref: Landmark et al. (2012), Johannessen et al. (2005)

const MEDS = {
  ltg: {
    label: 'Lamotrigine (LTG)',
    unit: 'mg/L',
    roundTo: 25,           // tablet sizes: 25, 50, 100, 150, 200 mg
    taperWeeks: 3,         // recommended taper duration
    therapeuticRange: { low: 3, high: 15 },
    recommendation:
      '<strong>Why taper?</strong> LTG is cleared primarily by glucuronidation (UGT1A4), ' +
      'a pathway strongly induced by oestrogen. Clearance increases 2–3× during pregnancy. ' +
      'After delivery, oestrogen falls abruptly and clearance returns to baseline within ' +
      '<strong>days to 1–2 weeks</strong> — making LTG the highest-risk ASM in the ' +
      'immediate postpartum period. Without dose reduction, plasma levels can rise ' +
      'into the toxic range within days of delivery.' +
      '<br><br>' +
      '<strong>Recommendation:</strong> Taper back to the pre-pregnancy dose over ' +
      '<strong>2–3 weeks</strong> (one reduction per week). ' +
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
    roundTo: 250,          // tablet sizes: 250, 500, 750, 1000 mg
    taperWeeks: 3,
    therapeuticRange: { low: 12, high: 46 },
    recommendation:
      '<strong>Why taper?</strong> LEV is renally cleared, and renal clearance increases ' +
      '~50–100% during pregnancy (progesterone-mediated rise in GFR and tubular secretion). ' +
      'After delivery, clearance returns toward baseline over days to weeks — somewhat ' +
      'more gradually than LTG, but dose reduction is still required to prevent accumulation.' +
      '<br><br>' +
      '<strong>Recommendation:</strong> Taper back to the pre-pregnancy dose over ' +
      '<strong>2–3 weeks</strong> (one reduction per week). ' +
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
  let targetDose;
  let targetNote = '';

  if (!isNaN(prePregDose) && prePregDose > 0) {
    if (prePregDose >= currentDose) {
      // No taper needed or dose already at/below pre-preg
      alert(
        'The pre-pregnancy dose is equal to or higher than the current dose. ' +
        'No postpartum dose reduction may be required. Please review the entries.'
      );
      return;
    }
    targetDose = prePregDose;
    targetNote = 'Pre-pregnancy dose';
  } else {
    // Estimate: halve the excess above a sensible baseline
    // Common heuristic: target ≈ 50% of pregnancy dose when pre-preg unknown
    targetDose = roundNearest(currentDose * 0.5, med.roundTo);
    targetNote = 'Estimated (pre-pregnancy dose unknown — please verify)';
  }

  // ── Build taper schedule ──────────────────────────────────
  //
  // Strategy: evenly distribute the dose reduction across
  // the recommended number of weeks (one step per week).
  // Then round each step to the nearest clinically practical
  // tablet increment.

  const totalReduction = currentDose - targetDose;
  const weeks = med.taperWeeks;

  const steps = [];

  // Delivery / step 0
  steps.push({
    week: 0,
    label: 'Delivery',
    dose: currentDose,
    date: deliveryDate ? dateLabel(deliveryDate, 0) : null,
    badge: 'delivery',
  });

  // Intermediate reductions
  for (let w = 1; w < weeks; w++) {
    const raw = currentDose - (totalReduction * w) / weeks;
    const dose = roundNearest(raw, med.roundTo);
    steps.push({
      week: w,
      label: `Week ${w}`,
      dose: Math.max(dose, targetDose),
      date: deliveryDate ? dateLabel(deliveryDate, w * 7) : null,
      badge: 'reduce',
    });
  }

  // Final target
  steps.push({
    week: weeks,
    label: `Week ${weeks} — target`,
    dose: targetDose,
    date: deliveryDate ? dateLabel(deliveryDate, weeks * 7) : null,
    badge: 'target',
  });

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
      <div class="chip-val">${med.taperWeeks} weeks</div>
    </div>
  </div>`;

  // Target note if estimated
  if (targetNote.includes('Estimated')) {
    html += `<div class="plasma-flag low" style="margin-bottom:1.25rem;">
      ⚠ <strong>Pre-pregnancy dose not provided.</strong>
      Target dose of <strong>${targetDose} mg/day</strong> is an estimate (50% of delivery dose).
      Verify against the patient's clinical history before use.
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
    const badgeLabel = s.badge === 'delivery' ? 'Delivery'
                     : s.badge === 'target'   ? 'Target reached' : 'Reduce';
    const badgeClass = `badge-${s.badge}`;
    const rowClass = s.badge === 'target' ? ' class="target-row"' : '';

    html += `<tr${rowClass}>
      ${hasDates ? `<td>${s.date}</td>` : ''}
      <td>${s.label}</td>
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
