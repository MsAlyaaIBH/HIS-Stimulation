/*
 * HIS Simulator — scenario data
 * ------------------------------------------------------------
 * Edit this file to change patients, drugs, interactions and cases.
 * All patients, staff, products and the hospital are FICTIONAL.
 * Clinical rules are simplified for teaching and must not be used
 * for real patient care. Poison groups are indicative only — check
 * the current Poisons List before teaching them as fact.
 *
 * If you change the seed data, increase VERSION so students'
 * browsers load the new data instead of their saved progress.
 */
(function () {
  'use strict';
  var DAY = 86400000;

  var FREQ = {
    OD:  { label: 'OD — once daily', perDay: 1, text: 'once daily' },
    ON:  { label: 'ON — at night', perDay: 1, text: 'at night' },
    BD:  { label: 'BD — twice daily', perDay: 2, text: 'twice daily' },
    TDS: { label: 'TDS — three times daily', perDay: 3, text: 'three times daily' },
    QID: { label: 'QID — four times daily', perDay: 4, text: 'four times daily' },
    Q6H: { label: 'Q6H — every 6 hours', perDay: 4, text: 'every 6 hours' },
    Q4H: { label: 'Q4H — every 4 hours', perDay: 6, text: 'every 4 hours' },
    PRN: { label: 'PRN — when needed (max 4×/day)', perDay: 4, text: 'when needed, up to 4 times a day' }
  };

  var ALLERGY_LABEL = {
    penicillin: 'Penicillin',
    sulfonamide: 'Sulfonamide',
    nsaid: 'NSAID',
    macrolide: 'Macrolide',
    tetracycline: 'Tetracycline'
  };

  var GROUP_LABEL = {
    B: 'Group B poison (prescription only)',
    C: 'Group C poison (pharmacist or doctor supply)',
    OTC: 'Non-poison (over the counter)'
  };

  var DRUGS = [
    { id: 'amoxicillin', name: 'Amoxicillin 500 mg capsule', short: 'Amoxicillin', strength: 500, unit: 'mg', form: 'capsule',
      cls: 'penicillin', clsLabel: 'penicillin antibiotic', group: 'B', usual: '500 mg TDS', maxDaily: 3000, price: 0.30,
      counsel: ['Take at evenly spaced times', 'Complete the full course', 'Stop and seek help if a rash or swelling appears'] },
    { id: 'cloxacillin', name: 'Cloxacillin 500 mg capsule', short: 'Cloxacillin', strength: 500, unit: 'mg', form: 'capsule',
      cls: 'penicillin', clsLabel: 'penicillin antibiotic', group: 'B', usual: '500 mg QID', maxDaily: 4000, price: 0.40,
      counsel: ['Take on an empty stomach', 'Complete the full course'] },
    { id: 'clarithromycin', name: 'Clarithromycin 500 mg tablet', short: 'Clarithromycin', strength: 500, unit: 'mg', form: 'tablet',
      cls: 'macrolide', clsLabel: 'macrolide antibiotic', group: 'B', usual: '500 mg BD', maxDaily: 1000, price: 1.20,
      counsel: ['May cause a metallic taste', 'Complete the full course'] },
    { id: 'doxycycline', name: 'Doxycycline 100 mg capsule', short: 'Doxycycline', strength: 100, unit: 'mg', form: 'capsule',
      cls: 'tetracycline', clsLabel: 'tetracycline antibiotic', group: 'B', usual: '100 mg BD (200 mg on day 1 in some regimens)', maxDaily: 200, price: 0.50,
      counsel: ['Swallow with a full glass of water while sitting or standing', 'Avoid milk, antacids and iron within 2 hours of a dose', 'Use sun protection'] },
    { id: 'metformin', name: 'Metformin 500 mg tablet', short: 'Metformin', strength: 500, unit: 'mg', form: 'tablet',
      cls: 'biguanide', clsLabel: 'biguanide (antidiabetic)', group: 'B', usual: '500–1000 mg BD with meals', maxDaily: 3000, price: 0.10,
      renal: [
        { below: 30, sev: 'major', msg: 'eGFR below 30: metformin is contraindicated (risk of lactic acidosis).', advice: 'Withhold metformin. Recommend an agent without renal restriction, e.g. linagliptin 5 mg OD.' },
        { below: 45, sev: 'moderate', msg: 'eGFR 30–44: maximum 1000 mg per day.', advice: 'Reduce the dose and monitor renal function.' }
      ],
      counsel: ['Take with or just after meals', 'Stomach upset usually settles after a few weeks'] },
    { id: 'gliclazide', name: 'Gliclazide 80 mg tablet', short: 'Gliclazide', strength: 80, unit: 'mg', form: 'tablet',
      cls: 'sulfonylurea', clsLabel: 'sulfonylurea (antidiabetic)', group: 'B', usual: '40–160 mg with breakfast', maxDaily: 320, price: 0.15,
      renal: [
        { below: 30, sev: 'moderate', msg: 'eGFR below 30: higher risk of low blood sugar.', advice: 'Use with caution at a low dose, or choose another agent.' }
      ],
      counsel: ['Take with breakfast', 'Learn the signs of low blood sugar and carry sweets'] },
    { id: 'linagliptin', name: 'Linagliptin 5 mg tablet', short: 'Linagliptin', strength: 5, unit: 'mg', form: 'tablet',
      cls: 'dpp4', clsLabel: 'DPP-4 inhibitor (antidiabetic)', group: 'B', usual: '5 mg OD', maxDaily: 5, price: 3.80,
      counsel: ['Take once a day, with or without food', 'No dose change is needed for kidney function'] },
    { id: 'simvastatin', name: 'Simvastatin 20 mg tablet', short: 'Simvastatin', strength: 20, unit: 'mg', form: 'tablet',
      cls: 'statin', clsLabel: 'statin (lipid-lowering)', group: 'B', usual: '20–40 mg at night', maxDaily: 40, price: 0.20,
      counsel: ['Take at night', 'Report unexplained muscle pain or weakness'] },
    { id: 'amlodipine', name: 'Amlodipine 5 mg tablet', short: 'Amlodipine', strength: 5, unit: 'mg', form: 'tablet',
      cls: 'ccb', clsLabel: 'calcium-channel blocker', group: 'B', usual: '5–10 mg OD', maxDaily: 10, price: 0.10,
      counsel: ['May cause ankle swelling', 'Do not stop suddenly'] },
    { id: 'warfarin', name: 'Warfarin 5 mg tablet', short: 'Warfarin', strength: 5, unit: 'mg', form: 'tablet',
      cls: 'anticoagulant', clsLabel: 'oral anticoagulant', group: 'B', usual: 'Dose adjusted to INR (target 2–3 for AF)', maxDaily: 15, price: 0.15,
      counsel: ['Take at the same time every day', 'Keep every INR appointment', 'Avoid NSAIDs and new herbal products unless advised'] },
    { id: 'paracetamol', name: 'Paracetamol 500 mg tablet', short: 'Paracetamol', strength: 500, unit: 'mg', form: 'tablet',
      cls: 'analgesic', clsLabel: 'simple analgesic', group: 'OTC', usual: '500–1000 mg every 4–6 hours', maxDaily: 4000, price: 0.05,
      counsel: ['Do not take more than 8 tablets (4 g) in 24 hours', 'Avoid other products that contain paracetamol'] },
    { id: 'ibuprofen', name: 'Ibuprofen 400 mg tablet', short: 'Ibuprofen', strength: 400, unit: 'mg', form: 'tablet',
      cls: 'nsaid', clsLabel: 'NSAID', group: 'C', usual: '400 mg TDS after food', maxDaily: 2400, price: 0.12,
      counsel: ['Take after food', 'Stop and seek help if stomach pain or black stools occur'] },
    { id: 'salbutamol', name: 'Salbutamol 100 mcg/dose inhaler (200 doses)', short: 'Salbutamol inhaler', strength: 1, unit: 'puff', form: 'inhaler', pack: true,
      cls: 'saba', clsLabel: 'short-acting beta-2 agonist', group: 'C', usual: '1–2 puffs when needed', maxDaily: 16, price: 9.50,
      counsel: ['Shake well before use; use a spacer if advised', 'See a doctor if you need it more often than usual'] }
  ];

  var INTERACTIONS = [
    { a: 'warfarin', b: 'ibuprofen', sev: 'major',
      msg: 'NSAID with warfarin: greatly increased risk of bleeding, especially from the stomach.',
      advice: 'Avoid. Paracetamol is the preferred analgesic.' },
    { a: 'warfarin', b: 'clarithromycin', sev: 'major',
      msg: 'Clarithromycin slows warfarin breakdown, so the INR may rise sharply.',
      advice: 'Choose another antibiotic, or monitor INR closely.' },
    { a: 'warfarin', b: 'doxycycline', sev: 'moderate',
      msg: 'Doxycycline may increase the effect of warfarin.',
      advice: 'Monitor INR during and after the course.' },
    { a: 'warfarin', b: 'paracetamol', sev: 'moderate',
      msg: 'Regular paracetamol above 2 g/day for several days may raise the INR.',
      advice: 'Still preferred over NSAIDs. Monitor INR and counsel on bleeding signs.' },
    { a: 'simvastatin', b: 'clarithromycin', sev: 'major',
      msg: 'Contraindicated: clarithromycin raises simvastatin levels, with a risk of muscle damage (rhabdomyolysis).',
      advice: 'Choose a non-macrolide antibiotic, or withhold simvastatin during the course.' }
  ];

  var LAB_TESTS = {
    renal: { name: 'Renal profile', price: 25, fields: [
      { k: 'creat', label: 'Creatinine', unit: 'µmol/L', low: 45, high: 110, normal: 80 },
      { k: 'egfr', label: 'eGFR', unit: 'mL/min/1.73 m²', low: 60, normal: 92 }
    ] },
    fbc: { name: 'Full blood count', price: 20, fields: [
      { k: 'hb', label: 'Haemoglobin', unit: 'g/dL', low: 12, high: 17, normal: 13.8 },
      { k: 'wbc', label: 'White cells', unit: '×10⁹/L', low: 4, high: 11, normal: 7.2 },
      { k: 'plt', label: 'Platelets', unit: '×10⁹/L', low: 150, high: 400, normal: 260 }
    ] },
    inr: { name: 'INR', price: 15, fields: [
      { k: 'inr', label: 'INR', unit: '', low: 0.8, high: 1.2, normal: 1.0, note: 'Target 2.0–3.0 on warfarin' }
    ] },
    lft: { name: 'Liver function test', price: 25, fields: [
      { k: 'alt', label: 'ALT', unit: 'U/L', high: 45, normal: 22 }
    ] }
  };

  var WARDS = ['Ward 5 (Medical)', 'Ward 6 (Medical)', 'Ward 2 (Paediatrics)', 'Ward 8 (Surgical)'];

  var TIERS = {
    BHIS: { name: 'Basic HIS (BHIS)', beds: 'Small hospital, under 200 beds', records: 'Hybrid — paper and electronic',
      modules: 'Patient Management System + Clinical Information System (including nursing)', example: 'e.g. Hosp. Kuala Batas, Setiu, Pekan' },
    IHIS: { name: 'Intermediate HIS (IHIS)', beds: 'Medium hospital, over 200 beds', records: 'Hybrid — paper and electronic',
      modules: 'BHIS + Laboratory IS + Pharmacy IS', example: 'e.g. Hosp. Keningau, Lahad Datu' },
    THIS: { name: 'Total HIS (THIS)', beds: 'Large hospital, over 400 beds', records: 'Paperless',
      modules: 'IHIS + Radiology IS + PACS + finance, administration and inventory', example: 'e.g. Hosp. Selayang, Putrajaya, Serdang' }
  };

  var STAFF = [
    { id: 'dr_hafiz', name: 'Dr. Hafiz Ismail', role: 'Medical Officer', unit: 'Medical wards 5 and 6, Medical clinic' },
    { id: 'ph_kamal', name: 'Kamal Ariff', role: 'Pharmacist', unit: 'Inpatient pharmacy' },
    { id: 'nurse_aisyah', name: 'Aisyah Musa', role: 'Staff Nurse', unit: 'Ward 5 (Medical)' },
    { id: 'nurse_farah', name: 'Farah Idris', role: 'Staff Nurse', unit: 'Ward 2 (Paediatrics)' },
    { id: 'clerk_zul', name: 'Zulkifli Omar', role: 'Registration clerk', unit: 'Registration counter' },
    { id: 'lab_mei', name: 'Tan Mei Ling', role: 'Medical Lab Technologist', unit: 'Pathology laboratory' }
  ];

  function seed() {
    var now = Date.now();
    var sod = new Date(); sod.setHours(0, 0, 0, 0);
    var T0 = sod.getTime();
    function at(day, h, m) { return new Date(T0 + day * DAY + h * 3600000 + m * 60000).toISOString(); }
    function inDays(d) { return new Date(now + d * DAY).toISOString(); }
    function staff(id) { return STAFF.filter(function (s) { return s.id === id; })[0]; }
    function aud(id, t, user, action, mrn, detail, suspicious) {
      var s = staff(user);
      return { id: id, t: t, user: user, name: s.name, role: s.role, action: action, mrn: mrn, detail: detail, suspicious: !!suspicious };
    }
    function ord(id, mrn, drugId, dose, freq, days, qty, indication, status, createdAt) {
      return { id: id, mrn: mrn, drugId: drugId, dose: dose, freq: freq, days: days, qty: qty, indication: indication,
        prescriber: 'Dr. Hafiz Ismail', createdAt: createdAt, status: status, source: 'seed',
        verifiedBy: status === 'dispensed' ? 'Kamal Ariff' : null, dispensedAt: status === 'dispensed' ? createdAt : null };
    }

    return {
      patients: [
        { mrn: 'BTM-000101', name: 'Puan Siti Aminah binti Yusof', ic: '680312-07-xxxx', sex: 'F', age: 58, weight: 62,
          allergies: ['penicillin'], allergyNote: 'Rash with amoxicillin in 2019',
          conditions: ['Hypertension', 'Dyslipidaemia', 'Community-acquired pneumonia'],
          status: 'admitted', ward: 'Ward 5 (Medical)', address: 'Kepala Batas, Pulau Pinang', registeredAt: at(-2, 7, 40), seed: true },
        { mrn: 'BTM-000102', name: 'Encik Lim Wei Jie', ic: '590721-07-xxxx', sex: 'M', age: 67, weight: 70,
          allergies: [], allergyNote: '', conditions: ['Type 2 diabetes', 'Chronic kidney disease'],
          status: 'outpatient', ward: '', address: 'Bertam, Pulau Pinang', registeredAt: at(-1, 9, 30), seed: true },
        { mrn: 'BTM-000103', name: 'Encik Tan Ah Kow', ic: '540118-07-xxxx', sex: 'M', age: 72, weight: 58,
          allergies: [], allergyNote: '', conditions: ['Atrial fibrillation (on warfarin)', 'Knee osteoarthritis'],
          status: 'admitted', ward: 'Ward 6 (Medical)', address: 'Tasek Gelugor, Pulau Pinang', registeredAt: at(-2, 15, 10), seed: true },
        { mrn: 'BTM-000104', name: 'Cik Nurul Huda binti Hassan', ic: '020909-07-xxxx', sex: 'F', age: 24, weight: 51,
          allergies: ['nsaid'], allergyNote: 'Wheeze after ibuprofen', conditions: ['Asthma'],
          status: 'outpatient', ward: '', address: 'Penaga, Pulau Pinang', registeredAt: at(-30, 10, 0), seed: true }
      ],
      notes: [
        { id: 'NOTE-1', mrn: 'BTM-000101', at: at(-1, 8, 10), by: 'Dr. Hafiz Ismail',
          text: 'Admitted with fever and productive cough for 3 days. CXR: right lower lobe consolidation. Impression: community-acquired pneumonia. BP 162/94 — start amlodipine. Penicillin allergy (rash, 2019).' },
        { id: 'NOTE-2', mrn: 'BTM-000102', at: at(-1, 10, 0), by: 'Dr. Hafiz Ismail',
          text: 'Clinic review. Type 2 diabetes, HbA1c 8.4%. Start metformin. Renal profile sent today.' },
        { id: 'NOTE-3', mrn: 'BTM-000103', at: at(-1, 8, 35), by: 'Dr. Hafiz Ismail',
          text: 'Knee osteoarthritis pain. AF on warfarin, INR 2.6. Avoid NSAIDs. Start regular paracetamol.' },
        { id: 'NOTE-4', mrn: 'BTM-000104', at: at(-30, 10, 20), by: 'Dr. Hafiz Ismail',
          text: 'Asthma review, well controlled. Wheeze after ibuprofen in the past: avoid NSAIDs.' }
      ],
      orders: [
        ord('ORD-0901', 'BTM-000101', 'simvastatin', 20, 'ON', 30, 30, 'Dyslipidaemia', 'dispensed', at(-10, 11, 0)),
        ord('ORD-0903', 'BTM-000103', 'warfarin', 5, 'OD', 30, 30, 'Atrial fibrillation', 'dispensed', at(-12, 10, 0)),
        ord('ORD-1001', 'BTM-000101', 'amoxicillin', 500, 'TDS', 5, 15, 'Community-acquired pneumonia', 'new', at(-1, 8, 20)),
        ord('ORD-1002', 'BTM-000102', 'metformin', 1000, 'BD', 30, 120, 'Type 2 diabetes', 'new', at(-1, 10, 10)),
        ord('ORD-1003', 'BTM-000103', 'paracetamol', 1000, 'Q4H', 5, 60, 'Knee osteoarthritis pain', 'new', at(-1, 8, 40)),
        ord('ORD-1004', 'BTM-000101', 'amlodipine', 5, 'OD', 30, 30, 'Hypertension', 'new', at(-1, 8, 25))
      ],
      labs: [
        { id: 'LAB-1901', mrn: 'BTM-000103', test: 'inr', status: 'released', values: { inr: 2.6 },
          orderedAt: at(-1, 7, 30), releasedAt: at(-1, 11, 30), releasedBy: 'Tan Mei Ling' },
        { id: 'LAB-1902', mrn: 'BTM-000101', test: 'renal', status: 'released', values: { creat: 72, egfr: 82 },
          orderedAt: at(-1, 8, 15), releasedAt: at(-1, 11, 0), releasedBy: 'Tan Mei Ling' },
        { id: 'LAB-1903', mrn: 'BTM-000101', test: 'fbc', status: 'released', values: { hb: 12.9, wbc: 14.2, plt: 310 },
          orderedAt: at(-1, 8, 15), releasedAt: at(-1, 11, 5), releasedBy: 'Tan Mei Ling' },
        { id: 'LAB-2001', mrn: 'BTM-000102', test: 'renal', status: 'received', values: { creat: 210, egfr: 25 },
          orderedAt: at(-1, 10, 5), receivedAt: at(-1, 15, 20) }
      ],
      imaging: [
        { id: 'IMG-3001', mrn: 'BTM-000101', type: 'Chest X-ray (PA)', status: 'reported', at: at(-1, 9, 0),
          report: 'Right lower lobe consolidation, consistent with pneumonia. No pleural effusion.', reportedBy: 'Dr. Lee (Radiologist)' }
      ],
      inventory: [
        { drugId: 'amoxicillin', batch: 'AMX2411', stock: 600, reorder: 200, expiry: inDays(420) },
        { drugId: 'cloxacillin', batch: 'CLX2402', stock: 80, reorder: 200, expiry: inDays(380) },
        { drugId: 'clarithromycin', batch: 'CLR2309', stock: 120, reorder: 60, expiry: inDays(45) },
        { drugId: 'doxycycline', batch: 'DOX2501', stock: 300, reorder: 100, expiry: inDays(510) },
        { drugId: 'metformin', batch: 'MET2503', stock: 2000, reorder: 500, expiry: inDays(600) },
        { drugId: 'gliclazide', batch: 'GLZ2410', stock: 150, reorder: 300, expiry: inDays(470) },
        { drugId: 'linagliptin', batch: 'LIN2502', stock: 200, reorder: 60, expiry: inDays(640) },
        { drugId: 'simvastatin', batch: 'SIM2412', stock: 900, reorder: 300, expiry: inDays(530) },
        { drugId: 'amlodipine', batch: 'AML2501', stock: 1200, reorder: 300, expiry: inDays(700) },
        { drugId: 'warfarin', batch: 'WAR2408', stock: 400, reorder: 100, expiry: inDays(300) },
        { drugId: 'paracetamol', batch: 'PCM2505', stock: 5000, reorder: 1000, expiry: inDays(820) },
        { drugId: 'ibuprofen', batch: 'IBU2410', stock: 600, reorder: 200, expiry: inDays(450) },
        { drugId: 'salbutamol', batch: 'SAL2310', stock: 25, reorder: 20, expiry: inDays(-10) }
      ],
      audit: [
        aud('AUD-0001', at(-1, 8, 5), 'dr_hafiz', 'VIEW RECORD', 'BTM-000101', 'Ward round'),
        aud('AUD-0002', at(-1, 8, 20), 'dr_hafiz', 'ORDER', 'BTM-000101', 'Amoxicillin 500 mg TDS (ORD-1001)'),
        aud('AUD-0003', at(-1, 8, 40), 'dr_hafiz', 'ORDER', 'BTM-000103', 'Paracetamol 1000 mg Q4H (ORD-1003)'),
        aud('AUD-0004', at(-1, 9, 2), 'ph_kamal', 'VIEW RECORD', 'BTM-000103', 'Medication review'),
        aud('AUD-0005', at(-1, 10, 15), 'nurse_aisyah', 'VIEW RECORD', 'BTM-000101', 'Medication round'),
        aud('AUD-0006', at(-1, 11, 30), 'lab_mei', 'RELEASE RESULT', 'BTM-000103', 'INR 2.6 (LAB-1901)'),
        aud('AUD-0007', at(-1, 14, 30), 'clerk_zul', 'UPDATE DEMOGRAPHICS', 'BTM-000104', 'Contact number updated at counter'),
        aud('AUD-0008', at(0, 2, 13), 'nurse_farah', 'VIEW RECORD', 'BTM-000101', 'Viewed full record, including home address', true),
        aud('AUD-0009', at(0, 2, 14), 'nurse_farah', 'PRINT', 'BTM-000101', 'Printed patient summary', true),
        aud('AUD-0010', at(0, 7, 50), 'nurse_aisyah', 'VIEW RECORD', 'BTM-000101', 'Morning handover')
      ],
      paperRx: [
        { id: 'RX-OP-01', mrn: 'BTM-000104', patient: 'Nurul Huda bt Hassan', ic: '020909-07-xxxx', from: 'Klinik Kesihatan Bertam (fictional)',
          doctor: 'Dr. Salmah Yusri', at: new Date(now - 2 * 3600000).toISOString(),
          lines: [
            { drug: 'Tab. Paracetamol 500 mg', sig: '1 g QID × 3/7' },
            { drug: 'Tab. Ibuprofen 400 mg', sig: '1 tab TDS × 3/7' }
          ],
          note: 'Dx: Acute viral fever with myalgia' }
      ],
      indents: [
        { id: 'IND-0501', ward: 'Ward 5 (Medical)', by: 'Aisyah Musa', at: new Date(now - 3 * 3600000).toISOString(), status: 'pending',
          lines: [
            { drugId: 'paracetamol', qty: 500 },
            { drugId: 'cloxacillin', qty: 120 },
            { drugId: 'salbutamol', qty: 4 }
          ] }
      ]
    };
  }

  /* Pre-test and post-test (same questions). Aligned to the lecture learning outcomes. */
  var TEST = [
    { id: 't1', q: 'Which statement best describes a Hospital Information System (HIS)?', options: [
      'An integrated electronic system that collects, stores, retrieves and displays patient information across the hospital',
      'A website where patients book appointments',
      'A billing program used only by the finance department',
      'A stand-alone database used only by the pharmacy'], answer: 0,
      explain: 'An HIS is integrated: every department works on one shared electronic system and one patient record.' },
    { id: 't2', q: 'A 450-bed hospital keeps fully paperless records with PACS and automatic billing. Which HIS tier is this?', options: ['BHIS', 'IHIS', 'THIS', 'None of these'], answer: 2,
      explain: 'Total HIS (THIS) is for large hospitals (over 400 beds) and is paperless, adding RIS/PACS, finance and administration.' },
    { id: 't3', q: 'Which HIS module does the pharmacy mainly use to screen, verify and dispense prescriptions?', options: ['PMS', 'LIS', 'PhIS', 'RIS'], answer: 2,
      explain: 'The Pharmacy Information System (PhIS) handles orders, screening, dispensing, inventory and more.' },
    { id: 't4', q: 'Why can a pharmacist in an IHIS hospital see a patient’s kidney function result in the system, but not in a BHIS hospital?', options: [
      'IHIS includes a Laboratory Information System linked to the pharmacy system',
      'Pharmacists in BHIS hospitals are not allowed to see lab results',
      'Kidney tests are only done in IHIS hospitals',
      'BHIS hospitals have no laboratory'], answer: 0,
      explain: 'IHIS adds the LIS and PhIS. In BHIS, lab results still travel on paper.' },
    { id: 't5', q: 'A new order for amoxicillin arrives for a patient with a recorded penicillin allergy. What should happen?', options: [
      'Dispense it, because the doctor prescribed it',
      'Do not dispense; the pharmacist contacts the prescriber to recommend an alternative',
      'Dispense half the dose to be safe',
      'Ask the patient to buy it from a community pharmacy'], answer: 1,
      explain: 'A major allergy alert means the order should not be dispensed. The pharmacist intervenes with the prescriber. Pharmacy assistants refer it to the pharmacist.' },
    { id: 't6', q: 'Which of these is NOT part of Konsep 5B?', options: ['Right patient', 'Right medicine', 'Right price', 'Right time'], answer: 2,
      explain: 'Konsep 5B: right patient, right medicine, right dose, right way to take it, right time.' },
    { id: 't7', q: 'What is the main purpose of a re-order level in a computerised drug inventory?', options: [
      'To record the price of each item',
      'To trigger a new order before stock runs out',
      'To show which items have expired',
      'To limit how much a doctor can prescribe'], answer: 1,
      explain: 'When stock falls to the re-order level, the system prompts a purchase order, preventing stock-outs.' },
    { id: 't8', q: 'The HIS was down for two hours and staff used paper forms. What must happen when the system is restored?', options: [
      'Throw away the paper forms',
      'Back-enter the paper records into the system',
      'Nothing; paper forms are enough',
      'Ask patients to come back tomorrow'], answer: 1,
      explain: 'Back-entry keeps the electronic record, stock and billing complete and accurate.' },
    { id: 't9', q: 'Why does an HIS record every access to a patient record in an audit trail?', options: [
      'To make the system run faster',
      'To make users accountable and detect unauthorised access',
      'To calculate staff salaries',
      'To print reports for patients'], answer: 1,
      explain: 'Audit trails protect patient privacy: every view is traceable to a user, which deters and detects misuse.' },
    { id: 't10', q: 'Which is a key advantage of e-prescribing over handwritten prescriptions?', options: [
      'It removes errors from illegible handwriting',
      'It removes the need for a pharmacist',
      'It never needs a backup procedure',
      'It lets patients choose their own dose'], answer: 0,
      explain: 'Typed electronic orders cannot be misread, and they can be screened automatically for allergies, interactions and doses.' }
  ];

  var GLOSSARY = [
    ['HIS', 'Hospital Information System: one integrated electronic system for patient, clinical, support and management data.'],
    ['BHIS', 'Basic HIS: small hospitals (under 200 beds). Patient management + clinical system. Hybrid records.'],
    ['IHIS', 'Intermediate HIS: medium hospitals (over 200 beds). BHIS + laboratory and pharmacy systems. Hybrid records.'],
    ['THIS', 'Total HIS: large hospitals (over 400 beds). IHIS + radiology, PACS, finance and administration. Paperless.'],
    ['Hybrid records', 'Some information is electronic and some is still on paper.'],
    ['MRN', 'Medical Record Number: the unique number given at registration that links all of a patient’s information.'],
    ['EMR', 'Electronic Medical Record: the patient’s complete record in electronic form. In Malaysia: “One Individual, One Record”.'],
    ['PMS', 'Patient Management System: registration, appointments, admission, discharge and billing details.'],
    ['CIS', 'Clinical Information System: doctors’ and nurses’ notes, orders and results.'],
    ['CPOE', 'Computerised Physician Order Entry: the doctor types orders (medicines, tests) directly into the system.'],
    ['e-Prescribing', 'Writing and sending prescriptions electronically instead of on paper.'],
    ['LIS', 'Laboratory Information System: receives test orders and analyser results; lab staff validate and release them.'],
    ['PhIS', 'Pharmacy Information System (MOH): orders, screening, dispensing, inventory, counselling, ADR, TDM, MTAC and more.'],
    ['NIS', 'Nursing Information System: nursing care records, including the MAR.'],
    ['MAR', 'Medication Administration Record: a record of every dose given to an inpatient.'],
    ['RIS', 'Radiology Information System: imaging orders and reports.'],
    ['PACS', 'Picture Archiving and Communication System: stores and displays X-ray and scan images.'],
    ['FIS', 'Financial Information System: billing and accounts.'],
    ['DICE', 'Drug Information and Consumer Education: drug information service and PhIS module.'],
    ['TDM', 'Therapeutic Drug Monitoring: measuring drug levels in blood to adjust doses (clinical pharmacokinetics).'],
    ['MTAC', 'Medication Therapy Adherence Clinic: pharmacist-run clinic that helps patients use their medicines well.'],
    ['ADR', 'Adverse Drug Reaction: a harmful, unintended response to a medicine.'],
    ['Screening', 'Checking an order for allergies, interactions, duplicate therapy, dose, kidney function and stock before it is supplied.'],
    ['Major alert', 'A serious problem. The order should not be supplied as written.'],
    ['Moderate alert', 'A problem that usually needs counselling or monitoring, not necessarily a change.'],
    ['Alert fatigue', 'When too many alerts make staff ignore or click past them, including important ones.'],
    ['Drug interaction', 'When one medicine changes the effect of another (e.g. ibuprofen + warfarin increases bleeding).'],
    ['Duplicate therapy', 'Two medicines from the same class given together, often by mistake.'],
    ['Intervention', 'A pharmacist’s action to change or stop an order, recorded with the reason.'],
    ['Override', 'Continuing despite an alert. Must be justified and is recorded in the audit trail.'],
    ['Verification', 'The pharmacist’s clinical check and approval of an order before it is supplied.'],
    ['Dispensing', 'Preparing, labelling and supplying a medicine with counselling to the patient or carer.'],
    ['Konsep 5B', 'MOH “Know Your Medicine” five rights: right patient, right medicine, right dose, right way to take it, right time.'],
    ['Two identifiers', 'Confirming a patient with two details (e.g. name + MRN or IC) before giving medicine.'],
    ['Counselling', 'Explaining to the patient how to take a medicine, what to expect and what to avoid.'],
    ['Transcription', 'Typing a paper prescription into the system. It must be entered exactly as written; concerns go to the pharmacist.'],
    ['Refer', 'Pass a concern to the pharmacist instead of deciding yourself.'],
    ['Ward indent', 'A ward’s request to the pharmacy for stock medicines.'],
    ['Partial supply', 'Supplying less than requested (e.g. low stock) and recording the reason and the balance owed.'],
    ['Re-order level', 'The stock quantity at which a new order should be placed.'],
    ['Purchase order (PO)', 'An order to the supplier for new stock.'],
    ['Batch', 'A production lot of a medicine, with its own batch number and expiry date.'],
    ['Quarantine', 'Removing stock from use (e.g. expired or recalled) so it cannot be supplied.'],
    ['Downtime', 'A period when the computer system is unavailable. Staff switch to paper procedures.'],
    ['Back-entry', 'Entering paper records into the system after downtime.'],
    ['Audit trail', 'A log of who viewed or changed what, and when.'],
    ['Role-based access control', 'Each user can only see and do what their job needs.'],
    ['eGFR', 'Estimated glomerular filtration rate: a measure of kidney function. Below 60 is reduced; below 30 is severely reduced.'],
    ['Creatinine', 'A blood test used to estimate kidney function. High creatinine = poorer kidney function.'],
    ['INR', 'A blood test for patients on warfarin. Target is usually 2–3.'],
    ['Group B poison', 'Under the Poisons Act 1952, medicines that need a prescription.'],
    ['Group C poison', 'Medicines supplied by a pharmacist or doctor without a prescription.'],
    ['OD / ON', 'Once daily / at night.'],
    ['BD / TDS / QID', 'Twice / three times / four times a day.'],
    ['Q4H / Q6H', 'Every 4 hours (6 doses a day) / every 6 hours (4 doses a day).'],
    ['PRN', 'When needed.'],
    ['3/7, 1/52, 1/12', 'Prescription shorthand for 3 days, 1 week, 1 month.'],
    ['Tab. / Cap. / MDI', 'Tablet / capsule / metered-dose inhaler.'],
    ['CAP', 'Community-acquired pneumonia: a lung infection caught outside hospital.'],
    ['AF', 'Atrial fibrillation: an irregular heart rhythm, often treated with an anticoagulant like warfarin.'],
    ['CKD', 'Chronic kidney disease.'],
    ['T2DM', 'Type 2 diabetes mellitus.']
  ];

  var CASES = [
    { id: 'c1', title: 'Register and admit a new patient', modules: 'PMS → CIS', slides: 'What is an HIS? · How an HIS is organised',
      objective: 'See how one registration flows into every other module: one patient, one record.',
      steps: [
        'Log in as Registration clerk and open Patient Management (PMS).',
        'Register Encik Rahman bin Ali: male, 45 years, 72 kg, IC 810505-07-xxxx, allergy: Sulfonamide, condition: Type 2 diabetes. Admit him to Ward 5 (Medical).',
        'Log in as Doctor. In Clinical & e-Prescribing (CIS), open his chart, write an admission note and order a Renal profile.'
      ],
      hint: 'You can admit during registration (choose a ward) or afterwards from the patient list.',
      reflection: 'Which other modules can now see Encik Rahman’s data, and why does a single MRN matter?' },
    { id: 'c2', title: 'Allergy alert on an antibiotic order', modules: 'CIS → PhIS', slides: 'Seven components (PhIS) · What computerisation brings',
      objective: 'Use PhIS screening to stop an allergy error and choose a safe alternative.',
      steps: [
        'Log in as Pharmacist and open Pharmacy (PhIS) → Order queue.',
        'Open ORD-1001 for Puan Siti Aminah and read every screening check.',
        'Do not verify it. Use Intervene to recommend a safe alternative antibiotic.',
        'Screen the new order, then verify and dispense it.'
      ],
      hint: 'Check her current medicines before choosing. The first alternative you think of may trigger a second alert.',
      reflection: 'What could have happened with a handwritten prescription and no electronic allergy screening?' },
    { id: 'c3', title: 'Lab results reach the pharmacy', modules: 'LIS → PhIS', slides: 'Three HIS tiers · HIS benefits',
      objective: 'See how integration between LIS and PhIS protects a patient with poor kidney function.',
      steps: [
        'As Pharmacist, open ORD-1002 (metformin) for Encik Lim and look at the renal check. Do not act yet.',
        'Log in as Lab officer. In Laboratory (LIS), validate and release Encik Lim’s renal profile (the analyser result has arrived).',
        'Log in as Pharmacist again. Reopen ORD-1002, compare the renal check, and intervene appropriately.'
      ],
      hint: 'If you withhold a drug, choose “Withhold” in the Intervene form. You can also recommend an alternative.',
      reflection: 'In a BHIS hospital, lab results stay on paper. How would the pharmacist catch this problem there?' },
    { id: 'c4', title: 'Dose check for an older patient', modules: 'PhIS', slides: 'What computerisation brings (accuracy, safety)',
      objective: 'Find a dosing error and decide which alerts need action and which need counselling.',
      steps: [
        'As Pharmacist, open ORD-1003 (paracetamol) for Encik Tan Ah Kow.',
        'Work out the total daily dose and compare it with the maximum.',
        'Intervene to correct the frequency, then verify and dispense the corrected order.'
      ],
      hint: 'The corrected order still shows one moderate alert. Decide whether it needs an intervention or only counselling and monitoring.',
      reflection: 'Why do some alerts need action while others only need counselling? What is “alert fatigue”?' },
    { id: 'c5', title: 'Dispense with Konsep 5B, then give the dose', modules: 'PhIS → NIS', slides: 'Konsep 5B · Dispensing',
      objective: 'Follow a medicine from the pharmacy to the bedside.',
      steps: [
        'As Pharmacist, verify and dispense ORD-1004 (amlodipine) for Puan Siti, completing the 5B checklist.',
        'Log in as Nurse. In Nursing & MAR (NIS), record the first dose for Puan Siti.'
      ],
      hint: 'Dispensing is a separate step after verifying. Scroll down after you verify.',
      reflection: 'Which of the five rights does the system check for you, and which still depend on people?' },
    { id: 'c6', title: 'Pharmacy inventory control', modules: 'PhIS inventory', slides: 'Keeping the right stock, automatically',
      objective: 'Use the inventory module to remove unsafe stock and prevent stock-outs.',
      steps: [
        'As Pharmacist, open Pharmacy (PhIS) → Inventory.',
        'Quarantine any expired batch.',
        'Generate re-orders so that every item at or below its re-order level has a purchase order.',
        'Optional: receive a purchase order and watch the stock update.'
      ],
      hint: 'Quarantining stock can push an item below its re-order level, so check the list again afterwards.',
      reflection: 'How does a computerised inventory reduce pilferage and expired stock compared with manual stock cards?' },
    { id: 'c7', title: 'Downtime drill', modules: 'Downtime procedures', slides: 'HIS disadvantages · What makes computerisation hard',
      objective: 'Keep patients safe when the system goes down, then restore the electronic record.',
      steps: [
        'Click “Start downtime drill” in the top bar. The system goes offline.',
        'Open Downtime procedures. The doctor writes: Cik Nurul Huda (BTM-000104), Salbutamol inhaler, 2 puffs QID PRN, 1 inhaler. Record it on the paper form.',
        'Click “End downtime drill”.',
        'In Downtime procedures, back-enter the paper record into the system.'
      ],
      hint: 'Back-entry happens after the system is restored. Match the paper record to the right patient and drug.',
      reflection: 'What risks arise during downtime, and why does back-entry matter for the patient’s record?' },
    { id: 'c8', title: 'Compare the three HIS tiers', modules: 'All modules', slides: 'Three tiers, set by hospital size',
      objective: 'Experience what each HIS tier can and cannot do.',
      steps: [
        'Use the BHIS / IHIS / THIS switch in the top bar to visit all three tiers.',
        'In each tier, note which modules are available and what the EMR shows for Encik Lim’s lab results.',
        'Answer the three questions below.'
      ],
      quiz: [
        { id: 'q1', q: 'Hospital A has 150 beds. Which HIS tier fits it?', options: ['BHIS', 'IHIS', 'THIS'], answer: 'BHIS' },
        { id: 'q2', q: 'In BHIS, why can’t the pharmacist see eGFR in the system?', options: [
          'BHIS has no Laboratory Information System, so results stay on paper',
          'Lab results are hidden from pharmacists for privacy',
          'eGFR is only reported in private hospitals'
        ], answer: 'BHIS has no Laboratory Information System, so results stay on paper' },
        { id: 'q3', q: 'Which tier generates bills automatically from tests and dispensing?', options: ['BHIS', 'IHIS', 'THIS'], answer: 'THIS' }
      ],
      reflection: 'Your hospital is moving from IHIS to THIS. Which two changes would affect pharmacists most?' },
    { id: 'c9', title: 'Privacy and the audit trail', modules: 'EMR · Audit', slides: 'HIS disadvantages (privacy) · Data security',
      objective: 'See role-based access control in action and investigate suspicious access.',
      steps: [
        'Log in as Registration clerk (or Finance officer in THIS). Open the Electronic Medical Record and try to open a patient’s clinical record.',
        'Log in as IT / Admin. Open Audit trail and read the Staff directory.',
        'Flag every audit entry that shows access without a care relationship.'
      ],
      hint: 'Compare each user’s ward and role with where the patient is, and the time of access.',
      reflection: 'Why must every access to a patient record be logged? Link your answer to the data-security challenge.' },
    { id: 'c10', track: 'assistant', title: 'Transcribe a paper prescription', modules: 'PhIS entry', slides: 'Prescriptions · e-Prescribing advantages',
      objective: 'Enter a handwritten clinic prescription into PhIS exactly as written, and refer problems to the pharmacist.',
      steps: [
        'Log in as Pharmacy assistant. Open Pharmacy (PhIS) → Prescription entry.',
        'Read the paper prescription RX-OP-01. Select the right patient, then enter each item exactly as written.',
        'Open each new order from the Order queue and read the screening. Refer any order with a major alert to the pharmacist.',
        'Log in as Pharmacist. Act on the referral, then verify the safe item.',
        'Log in as Pharmacy assistant (or stay as Pharmacist) and dispense the verified item with the 5B checklist.'
      ],
      hint: '“3/7” means 3 days. Check the patient’s allergies in the banner. Do not change the prescription yourself: that is the pharmacist’s decision.',
      reflection: 'Why must a transcriber enter a prescription exactly as written, even when they notice a problem? What could go wrong with transcription that e-prescribing avoids?' },
    { id: 'c11', track: 'assistant', title: 'Supply a ward stock request (indent)', modules: 'PhIS indent · inventory', slides: 'Keeping the right stock, automatically',
      objective: 'Supply ward stock safely, never issuing expired stock and recording every short supply.',
      steps: [
        'As Pharmacy assistant, open Pharmacy (PhIS) → Ward requests.',
        'For indent IND-0501 from Ward 5, check the usable stock of each item.',
        'Enter the quantity to supply. If you supply less than requested, write the reason.',
        'Click Supply and check the stock levels in Inventory.'
      ],
      hint: 'Expired or quarantined stock counts as zero usable stock.',
      reflection: 'How does recording partial supplies in the system help the ward, the pharmacy and the store?' },
    { id: 'c12', track: 'assistant', title: 'Label and counselling check', modules: 'Dispensing', slides: 'Dispensing · Konsep 5B',
      objective: 'Spot labelling and counselling errors before a medicine reaches the patient.',
      steps: ['Answer the three questions below. Use the Drug information (DICE) tab in PhIS if you need it.'],
      quiz: [
        { id: 'l1', q: 'Order: Amlodipine 5 mg OD × 30 days for Puan Siti Aminah (BTM-000101). Which label is correct?', options: [
          'Puan Siti Aminah binti Yusof · BTM-000101 — Amlodipine 5 mg tablet — Take 1 tablet (5 mg) once daily for 30 days',
          'Puan Siti Aminah binti Yusof · BTM-000103 — Amlodipine 5 mg tablet — Take 1 tablet (5 mg) once daily for 30 days',
          'Puan Siti Aminah binti Yusof · BTM-000101 — Amlodipine 5 mg tablet — Take 1 tablet (5 mg) twice daily for 30 days'
        ], answer: 'Puan Siti Aminah binti Yusof · BTM-000101 — Amlodipine 5 mg tablet — Take 1 tablet (5 mg) once daily for 30 days' },
        { id: 'l2', q: 'Order: Paracetamol 1000 mg QID × 3 days. The tablets are 500 mg. Which direction is correct?', options: [
          'Take 1 tablet (1000 mg) four times daily for 3 days',
          'Take 2 tablets (1000 mg) four times daily for 3 days',
          'Take 2 tablets (1000 mg) every 4 hours for 3 days'
        ], answer: 'Take 2 tablets (1000 mg) four times daily for 3 days' },
        { id: 'l3', q: 'Which counselling point belongs with doxycycline?', options: [
          'Swallow with a full glass of water while upright; avoid milk and antacids within 2 hours',
          'Take at night and report muscle pain',
          'Do not take more than 8 tablets in 24 hours'
        ], answer: 'Swallow with a full glass of water while upright; avoid milk and antacids within 2 hours' }
      ],
      reflection: 'Which label error do you think is most dangerous, and how does the system’s printed label reduce these errors compared with handwriting?' }
  ];
  var TRACK = { c1: 'core', c2: 'pharmacist', c3: 'pharmacist', c4: 'pharmacist', c5: 'core', c6: 'core', c7: 'core', c8: 'core', c9: 'core' };
  CASES.forEach(function (c) { if (!c.track) c.track = TRACK[c.id]; });

  window.SIM_DATA = {
    VERSION: 2,
    TEST: TEST,
    GLOSSARY: GLOSSARY,
    DAY: DAY,
    FREQ: FREQ,
    ALLERGY_LABEL: ALLERGY_LABEL,
    GROUP_LABEL: GROUP_LABEL,
    DRUGS: DRUGS,
    INTERACTIONS: INTERACTIONS,
    LAB_TESTS: LAB_TESTS,
    WARDS: WARDS,
    TIERS: TIERS,
    STAFF: STAFF,
    CASES: CASES,
    seed: seed
  };
})();
