# ASM Postpartum Taper

A simple, browser-based clinical tool that generates postpartum dose tapering schedules for patients on lamotrigine (LTG) or levetiracetam (LEV) during pregnancy.

## Background

During pregnancy, the clearance of LTG and LEV increases significantly (2–3× for LTG, ~50–100% for LEV), requiring higher doses to maintain seizure control. After delivery, clearance returns rapidly to pre-pregnancy baseline, making dose reduction necessary to avoid toxicity. This tool produces a structured, printable 3-week tapering schedule based on published pharmacokinetic principles.

## How to use

Open `index.html` in any modern browser — no installation, no server required.

1. Select the medication (LTG or LEV)
2. Enter the current dose at delivery and the pre-pregnancy dose
3. Optionally add delivery date and plasma level
4. Click **Generate taper plan**

## Features

- Clinical recommendation and rationale shown for each medication
- Opinionated 3-week taper (one reduction per week) based on published guidance
- Doses rounded to practical tablet increments (25 mg for LTG, 250 mg for LEV)
- Per-dose breakdown (QD / BID / TID)
- Dated schedule when delivery date is entered
- Plasma level interpretation with therapeutic range flagging
- Medication-specific monitoring reminders
- Print / Save as PDF
- Fully client-side — no data transmitted

## GitHub Pages

To host publicly:
1. Push this repository to GitHub
2. Go to **Settings → Pages → Source → main / root**
3. Share the generated URL

## Disclaimer

For practitioner use only. Not a substitute for clinical judgement or individualised patient assessment. Always verify doses against the patient's clinical history.

## References

- Pennell PB et al. (2008). The impact of pregnancy and childbirth on the metabolism of lamotrigine. *Neurology*
- Tomson T et al. (2019). EURAP study group data on ASM use in pregnancy
- Landmark CJ et al. (2012). Pharmacokinetics of antiepileptic drugs during pregnancy
- Johannessen SI et al. (2005). Levetiracetam in pregnancy

## License

MIT
