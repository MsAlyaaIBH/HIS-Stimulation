/*
 * HIS Simulator — application logic
 * Plain JavaScript, no build step. Progress is saved in the browser (localStorage).
 */
(function () {
  'use strict';
  var D = window.SIM_DATA;
  var KEY = 'his-sim-v' + D.VERSION;
  var DAY = D.DAY;

  var ROLES = {
    clerk: { label: 'Registration clerk', home: 'pms' },
    doctor: { label: 'Doctor', home: 'cis' },
    pharmacist: { label: 'Pharmacist', home: 'phis' },
    assistant: { label: 'Pharmacy assistant', home: 'phis' },
    lab: { label: 'Lab officer', home: 'lis' },
    nurse: { label: 'Nurse', home: 'nis' },
    finance: { label: 'Finance officer', home: 'fis' },
    admin: { label: 'IT / Admin', home: 'audit' }
  };
  var CLINICAL = ['doctor', 'pharmacist', 'assistant', 'nurse', 'lab'];
  var PHARMACY = ['pharmacist', 'assistant'];
  var TRACKS = {
    pharmacist: { label: 'Pharmacist track', cases: ['core', 'pharmacist'] },
    assistant: { label: 'Pharmacy assistant track', cases: ['core', 'assistant'] },
    both: { label: 'All cases', cases: ['core', 'pharmacist', 'assistant'] }
  };
  var TRACK_TAG = { core: 'Core', pharmacist: 'Pharmacist', assistant: 'Pharmacy assistant' };

  var MODULES = [
    { id: 'home', label: 'Dashboard', code: 'Home', roles: null, tiers: null },
    { id: 'pms', label: 'Patient Management', code: 'PMS', roles: ['clerk'], tiers: null },
    { id: 'cis', label: 'Clinical & e-Prescribing', code: 'CIS', roles: ['doctor'], tiers: null },
    { id: 'nis', label: 'Nursing & MAR', code: 'NIS', roles: ['nurse'], tiers: null },
    { id: 'lis', label: 'Laboratory', code: 'LIS', roles: ['lab'], tiers: ['IHIS', 'THIS'] },
    { id: 'phis', label: 'Pharmacy', code: 'PhIS', roles: ['pharmacist', 'assistant'], tiers: ['IHIS', 'THIS'] },
    { id: 'ris', label: 'Radiology & PACS', code: 'RIS', roles: ['doctor'], tiers: ['THIS'] },
    { id: 'fis', label: 'Finance & Billing', code: 'FIS', roles: ['finance'], tiers: ['THIS'] },
    { id: 'emr', label: 'Electronic Medical Record', code: 'EMR', roles: null, tiers: null },
    { id: 'audit', label: 'Audit trail', code: 'Audit', roles: ['admin'], tiers: null },
    { id: 'downtime', label: 'Downtime procedures', code: 'Paper', roles: null, tiers: null }
  ];

  var TIER_WHY = {
    lis: 'Laboratory Information System is added from IHIS. In BHIS, lab requests and results travel on paper.',
    phis: 'Pharmacy Information System is added from IHIS. In BHIS, the pharmacy works from printed or handwritten prescriptions.',
    ris: 'Radiology IS and PACS are only part of THIS. Smaller hospitals send films and reports separately.',
    fis: 'Financial Information System is only part of THIS, where charges are billed automatically. In BHIS and IHIS, billing is done manually.'
  };

  /* ---------- state ---------- */
  var S;
  var skipRender = false;
  var ui = {
    module: 'home', cisMrn: null, cisTab: 'summary', phisTab: 'queue', orderId: null, emrMrn: '',
    risId: null, dice: 'amoxicillin', auditTab: 'trail', auditMrn: '', auditUser: '',
    drawer: false, openCase: null, modal: null, cpoe: null, cpoeAlerts: null,
    test: null, glossary: false, allCases: false
  };

  function fresh(student) {
    var s = D.seed();
    s.v = D.VERSION;
    s.student = student || null;
    s.role = 'clerk';
    s.tier = 'THIS';
    s.downtime = false;
    s.tiersVisited = ['THIS'];
    s.quiz = {};
    s.reflections = {};
    s.flags = [];
    s.drill = { started: false, ended: false };
    s.seq = 5000;
    s.mar = [];
    s.pos = [];
    s.bills = [];
    s.paperForms = [];
    s.simlog = [];
    s.pretest = null;
    s.posttest = null;
    return s;
  }
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) { var s = JSON.parse(raw); if (s && s.v === D.VERSION) return s; }
    } catch (e) { /* storage blocked: start fresh */ }
    return fresh(null);
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function val(id) { var el = document.getElementById(id); return el ? el.value : ''; }
  function isChecked(id) { var el = document.getElementById(id); return !!(el && el.checked); }
  function drug(id) { return D.DRUGS.filter(function (d) { return d.id === id; })[0]; }
  function pat(mrn) { return S.patients.filter(function (p) { return p.mrn === mrn; })[0]; }
  function order(id) { return S.orders.filter(function (o) { return o.id === id; })[0]; }
  function inv(id) { return S.inventory.filter(function (i) { return i.drugId === id; })[0]; }
  function iso() { return new Date().toISOString(); }
  function fmt(t) { return new Date(t).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); }
  function fmtDate(t) { return new Date(t).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
  function rm(n) { return 'RM ' + n.toFixed(2); }
  function nid(prefix) { S.seq += 1; return prefix + '-' + S.seq; }
  function me() { return S.student ? S.student.name : 'Student'; }
  function roleLabel() { return ROLES[S.role].label; }
  function mod(id) { return MODULES.filter(function (m) { return m.id === id; })[0]; }
  function tierHas(id) { var m = mod(id); return !m.tiers || m.tiers.indexOf(S.tier) >= 0; }
  function perDay(f) { return D.FREQ[f].perDay; }
  function calcQty(d, dose, freq, days) { return d.pack ? 1 : Math.ceil(dose / d.strength) * perDay(freq) * days; }
  function orderText(o) { var d = drug(o.drugId); return d.short + ' ' + o.dose + ' ' + d.unit + ' ' + o.freq + ' × ' + o.days + ' d'; }
  function directions(o) {
    var d = drug(o.drugId), f = D.FREQ[o.freq];
    if (d.pack) return 'Inhale ' + o.dose + ' puff' + (o.dose > 1 ? 's' : '') + ' ' + f.text;
    var n = o.dose / d.strength, nt = Number.isInteger(n) ? n : n.toFixed(1);
    return 'Take ' + nt + ' ' + d.form + (n > 1 ? 's' : '') + ' (' + o.dose + ' ' + d.unit + ') ' + f.text + ' for ' + o.days + ' days';
  }
  function statusText(p) { return p.status === 'admitted' ? p.ward : 'Outpatient'; }
  function isExpired(i) { return new Date(i.expiry).getTime() < Date.now(); }
  function isLow(i) { return i.stock <= i.reorder; }
  function usableStock(i) { return !i || i.quarantined || isExpired(i) ? 0 : i.stock; }
  function log(action, mrn, detail) {
    S.audit.push({ id: nid('AUD'), t: iso(), user: 'student', name: me(), role: roleLabel(), action: action, mrn: mrn || '', detail: detail || '' });
  }
  function simlog(text) { S.simlog.push({ t: iso(), text: text }); }
  function addBill(mrn, item, amount) {
    if (S.tier !== 'THIS') return;
    S.bills.push({ id: nid('BILL'), mrn: mrn, item: item, amount: amount, at: iso() });
  }
  function latestEgfr(mrn) {
    var l = S.labs.filter(function (x) { return x.mrn === mrn && x.test === 'renal' && x.status === 'released'; })
      .sort(function (a, b) { return a.releasedAt < b.releasedAt ? 1 : -1; })[0];
    return l ? { val: l.values.egfr, at: l.releasedAt } : null;
  }
  function activeMeds(mrn, exceptId) {
    return S.orders.filter(function (o) { return o.mrn === mrn && o.status === 'dispensed' && o.id !== exceptId; });
  }
  function toast(msg, kind) {
    if (kind === 'bad') skipRender = true; // keep what the user typed after a validation error
    document.querySelectorAll('.toast').forEach(function (t) { t.remove(); });
    var el = document.createElement('div');
    el.className = 'toast ' + (kind || '');
    el.setAttribute('role', 'status');
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function () { el.classList.add('out'); }, 3400);
    setTimeout(function () { el.remove(); }, 3900);
  }
  function chip(text, kind) { return '<span class="chip ' + (kind || '') + '">' + esc(text) + '</span>'; }
  function sevChip(sev) {
    return sev === 'major' ? chip('Major', 'red') : sev === 'moderate' ? chip('Moderate', 'amber') : sev === 'info' ? chip('Check', 'blue') : chip('Pass', 'green');
  }

  /* ---------- clinical screening (PhIS) ---------- */
  function screen(o) {
    var d = drug(o.drugId), p = pat(o.mrn), C = [];
    // allergy
    if (p.allergies.indexOf(d.cls) >= 0) {
      C.push({ name: 'Allergy', sev: 'major', msg: 'Recorded ' + D.ALLERGY_LABEL[d.cls] + ' allergy' + (p.allergyNote ? ' (' + p.allergyNote + ')' : '') + '. ' + d.short + ' is a ' + d.clsLabel + '.',
        advice: 'Do not dispense. Recommend a drug from a different class, and check it against the patient’s other medicines.' });
    } else {
      C.push({ name: 'Allergy', sev: 'pass', msg: p.allergies.length ? 'No match with recorded allergies (' + p.allergies.map(function (a) { return D.ALLERGY_LABEL[a]; }).join(', ') + ').' : 'No known drug allergy recorded.' });
    }
    // interactions
    var meds = activeMeds(o.mrn, o.id), found = 0;
    meds.forEach(function (m) {
      D.INTERACTIONS.forEach(function (ix) {
        if ((ix.a === o.drugId && ix.b === m.drugId) || (ix.b === o.drugId && ix.a === m.drugId)) {
          found++;
          C.push({ name: 'Interaction', sev: ix.sev, msg: d.short + ' + ' + drug(m.drugId).short + ' (current medicine): ' + ix.msg, advice: ix.advice });
        }
      });
    });
    if (!found) C.push({ name: 'Interaction', sev: 'pass', msg: meds.length ? 'No interactions with current medicines (' + meds.map(function (m) { return drug(m.drugId).short; }).join(', ') + ').' : 'No current medicines on record.' });
    // duplicate therapy
    var dup = meds.filter(function (m) { return drug(m.drugId).cls === d.cls; })[0];
    if (dup) C.push({ name: 'Duplicate therapy', sev: 'moderate', msg: 'Already on ' + drug(dup.drugId).short + ' from the same class.', advice: 'Confirm with the prescriber whether both are intended.' });
    else C.push({ name: 'Duplicate therapy', sev: 'pass', msg: 'No other medicine from the same class.' });
    // dose
    var daily = o.dose * perDay(o.freq);
    if (daily > d.maxDaily) C.push({ name: 'Dose', sev: 'major', msg: 'Total ' + daily + ' ' + d.unit + ' per day (' + o.dose + ' ' + d.unit + ' × ' + perDay(o.freq) + ') exceeds the maximum of ' + d.maxDaily + ' ' + d.unit + ' per day.', advice: 'Correct the dose or frequency with the prescriber.' });
    else C.push({ name: 'Dose', sev: 'pass', msg: daily + ' ' + d.unit + ' per day, within the maximum of ' + d.maxDaily + ' ' + d.unit + '.' });
    // renal
    if (d.renal) {
      if (!tierHas('lis')) {
        C.push({ name: 'Renal function', sev: 'info', msg: 'Renal results are not held electronically in BHIS.', advice: 'Check the paper lab report before dispensing.' });
      } else {
        var e = latestEgfr(o.mrn);
        var pending = S.labs.some(function (l) { return l.mrn === o.mrn && l.test === 'renal' && l.status !== 'released'; });
        if (!e) {
          C.push({ name: 'Renal function', sev: 'info', msg: pending ? 'A renal profile is pending in the laboratory. No result has been released yet.' : 'No renal result on record.',
            advice: 'This drug needs renal dose checking. Wait for, or request, a renal profile.' });
        } else {
          var rule = d.renal.filter(function (r) { return e.val < r.below; })[0];
          if (rule) C.push({ name: 'Renal function', sev: rule.sev, msg: 'eGFR ' + e.val + ' (' + fmt(e.at) + '). ' + rule.msg, advice: rule.advice });
          else C.push({ name: 'Renal function', sev: 'pass', msg: 'eGFR ' + e.val + ': no adjustment needed.' });
        }
      }
    } else {
      C.push({ name: 'Renal function', sev: 'pass', msg: 'No renal adjustment needed for this drug.' });
    }
    // stock
    var i = inv(o.drugId);
    if (!i) C.push({ name: 'Stock', sev: 'major', msg: 'Not stocked.' });
    else if (i.quarantined || isExpired(i)) C.push({ name: 'Stock', sev: 'major', msg: 'Batch ' + i.batch + ' is ' + (i.quarantined ? 'quarantined' : 'expired') + '. No usable stock.', advice: 'Receive new stock before dispensing.' });
    else if (i.stock < o.qty) C.push({ name: 'Stock', sev: 'major', msg: 'Insufficient stock: ' + i.stock + ' available, ' + o.qty + ' needed.', advice: 'Re-order, or supply part and record the balance.' });
    else C.push({ name: 'Stock', sev: 'pass', msg: i.stock + ' in stock (batch ' + i.batch + ').' });
    return C;
  }
  function count(checks, sev) { return checks.filter(function (c) { return c.sev === sev; }).length; }

  /* ---------- case checks ---------- */
  var SITI = 'BTM-000101', LIM = 'BTM-000102', TAN = 'BTM-000103', NURUL = 'BTM-000104';
  function item(label, done) { return { label: label, done: !!done }; }
  var CHECKS = {
    c1: function () {
      var p = S.patients.filter(function (x) { return !x.seed && /rahman/i.test(x.name); })[0];
      return [
        item('Encik Rahman registered in PMS', p),
        item('Sulfonamide allergy recorded', p && p.allergies.indexOf('sulfonamide') >= 0),
        item('Admitted to a ward', p && p.status === 'admitted'),
        item('Admission note written in CIS', p && S.notes.some(function (n) { return n.mrn === p.mrn; })),
        item('Renal profile ordered', p && S.labs.some(function (l) { return l.mrn === p.mrn && l.test === 'renal'; }))
      ];
    },
    c2: function () {
      var o = order('ORD-1001');
      var mine = S.orders.filter(function (x) { return x.mrn === SITI && x.status === 'dispensed' && x.source !== 'seed'; });
      var safe = mine.some(function (x) { var c = drug(x.drugId).cls; return (c === 'macrolide' || c === 'tetracycline') && x.majorsAtVerify === 0; });
      var unsafe = mine.some(function (x) { return drug(x.drugId).cls === 'penicillin' || x.majorsAtVerify > 0; });
      return [
        item('Amoxicillin order stopped with an allergy intervention', o.status === 'rejected' && o.intervention && o.intervention.reason === 'Allergy'),
        item('A safe alternative antibiotic dispensed (no major alerts)', safe && !unsafe)
      ];
    },
    c3: function () {
      var l = S.labs.filter(function (x) { return x.id === 'LAB-2001'; })[0], o = order('ORD-1002');
      var metDisp = S.orders.some(function (x) { return x.mrn === LIM && x.drugId === 'metformin' && x.status === 'dispensed'; });
      return [
        item('Renal profile validated and released in LIS', l && l.status === 'released'),
        item('Metformin stopped with a renal-function intervention', o.status === 'rejected' && o.intervention && o.intervention.reason === 'Renal function' && !metDisp)
      ];
    },
    c4: function () {
      var o = order('ORD-1003');
      var ok = S.orders.some(function (x) { return x.mrn === TAN && x.drugId === 'paracetamol' && x.status === 'dispensed' && x.dose * perDay(x.freq) <= 4000 && x.majorsAtVerify === 0; });
      return [
        item('Q4H order stopped with a dose intervention', o.status === 'rejected' && o.intervention && o.intervention.reason === 'Dose'),
        item('Corrected paracetamol (≤ 4 g/day) verified and dispensed', ok)
      ];
    },
    c5: function () {
      var o = order('ORD-1004');
      return [
        item('Amlodipine dispensed with the 5B checklist', o.status === 'dispensed' && o.fiveB),
        item('First dose recorded on the MAR by a nurse', S.mar.some(function (m) { return m.orderId === 'ORD-1004'; }))
      ];
    },
    c6: function () {
      var sal = inv('salbutamol');
      var low = S.inventory.filter(function (i) { return isLow(i); });
      var covered = S.pos.length > 0 && low.every(function (i) { return S.pos.some(function (p) { return p.drugId === i.drugId && p.status === 'open'; }); });
      return [
        item('Expired salbutamol batch quarantined', sal.everQuarantined),
        item('Every item at or below re-order level has a purchase order', covered && sal.everQuarantined)
      ];
    },
    c7: function () {
      var form = S.paperForms.filter(function (f) { return f.duringDowntime && /nurul|000104/i.test(f.patient + ' ' + f.mrn) && /salbut/i.test(f.drug); })[0];
      return [
        item('Downtime drill started', S.drill.started),
        item('Prescription recorded on the paper form during downtime', form),
        item('Drill ended (system restored)', S.drill.ended),
        item('Paper record back-entered into the system', S.orders.some(function (o) { return o.source === 'back-entry' && o.mrn === NURUL && o.drugId === 'salbutamol'; }))
      ];
    },
    c10: function () {
      var tx = S.orders.filter(function (o) { return o.paperRxId === 'RX-OP-01' && o.status !== 'cancelled'; });
      var para = tx.filter(function (o) { return o.drugId === 'paracetamol' && o.mrn === NURUL && o.dose === 1000 && o.freq === 'QID' && o.days === 3; })[0];
      var ibu = tx.filter(function (o) { return o.drugId === 'ibuprofen' && o.mrn === NURUL && o.dose === 400 && o.freq === 'TDS' && o.days === 3; })[0];
      var ibuDisp = S.orders.some(function (o) { return o.mrn === NURUL && o.drugId === 'ibuprofen' && o.status === 'dispensed'; });
      var wrong = tx.some(function (o) { return o !== para && o !== ibu; });
      return [
        item('Paracetamol entered exactly as written (1000 mg QID × 3 days, right patient)', para),
        item('Ibuprofen entered exactly as written (400 mg TDS × 3 days, right patient)', ibu),
        item('No incorrect entries left active (cancel any mistakes)', (para || ibu) && !wrong),
        item('Ibuprofen allergy alert referred to the pharmacist', ibu && ibu.referred),
        item('Pharmacist stopped ibuprofen with an allergy intervention', ibu && ibu.status === 'rejected' && ibu.intervention.reason === 'Allergy' && !ibuDisp),
        item('Paracetamol verified and dispensed', para && para.status === 'dispensed')
      ];
    },
    c11: function () {
      var ind = S.indents.filter(function (x) { return x.id === 'IND-0501'; })[0];
      var done = ind.status === 'supplied';
      var line = function (id) { return ind.lines.filter(function (l) { return l.drugId === id; })[0]; };
      return [
        item('Ward 5 request supplied', done),
        item('Paracetamol supplied in full (500)', done && line('paracetamol').supplied === 500),
        item('No expired salbutamol issued, with the reason recorded', done && line('salbutamol').supplied === 0 && line('salbutamol').note),
        item('Cloxacillin shortfall explained (or supplied in full)', done && (line('cloxacillin').supplied === 120 || line('cloxacillin').note))
      ];
    },
    c12: function () { return quizItems('c12'); },
    c8: function () {
      var c = D.CASES.filter(function (x) { return x.id === 'c8'; })[0];
      var allRight = c.quiz.every(function (q) { return S.quiz[q.id] === q.answer; });
      return [
        item('Visited BHIS', S.tiersVisited.indexOf('BHIS') >= 0),
        item('Visited IHIS', S.tiersVisited.indexOf('IHIS') >= 0),
        item('Visited THIS', S.tiersVisited.indexOf('THIS') >= 0),
        item('All three questions answered correctly', allRight)
      ];
    },
    c9: function () {
      var sus = S.audit.filter(function (a) { return a.suspicious; }).map(function (a) { return a.id; });
      var allSus = sus.every(function (id) { return S.flags.indexOf(id) >= 0; });
      var wrong = S.flags.some(function (id) { return sus.indexOf(id) < 0; });
      return [
        item('Tried to open a record without clinical access (denied and logged)', S.audit.some(function (a) { return a.user === 'student' && a.action === 'ACCESS DENIED'; })),
        item('Flagged every suspicious entry', allSus),
        item('No legitimate entries flagged', S.flags.length > 0 && !wrong)
      ];
    }
  };
  function quizItems(id) {
    var c = D.CASES.filter(function (x) { return x.id === id; })[0];
    return c.quiz.map(function (q, i) { return item('Question ' + (i + 1) + ' answered correctly', S.quiz[q.id] === q.answer); });
  }
  function caseItems(id) { return CHECKS[id](); }
  function caseDone(id) { return caseItems(id).every(function (x) { return x.done; }); }
  function track() { return (S.student && TRACKS[S.student.track]) ? S.student.track : 'both'; }
  function myCases() { return D.CASES.filter(function (c) { return TRACKS[track()].cases.indexOf(c.track) >= 0; }); }

  /* ---------- pre/post test ---------- */
  function testView(kind) {
    var rec = kind === 'pre' ? S.pretest : S.posttest;
    var title = kind === 'pre' ? 'Pre-test' : 'Post-test';
    if (kind === 'post' && rec) {
      var pre = S.pretest && !S.pretest.skipped ? S.pretest : null;
      return '<div class="welcome"><div class="welcome-card wide"><p class="eyebrow">Post-test results</p><h1>' + rec.score + ' / ' + D.TEST.length + '</h1>' +
        (pre ? '<p class="lead">Pre-test: <b>' + pre.score + ' / ' + D.TEST.length + '</b> → Post-test: <b>' + rec.score + ' / ' + D.TEST.length + '</b> (' + (rec.score - pre.score >= 0 ? '+' : '') + (rec.score - pre.score) + ')</p>' : '') +
        '<ol class="results">' + D.TEST.map(function (q) {
          var a = rec.answers[q.id], ok = a === q.answer;
          return '<li class="' + (ok ? 'ok' : 'bad') + '"><b>' + esc(q.q) + '</b><br>Your answer: ' + esc(q.options[a]) + ' ' + (ok ? '<span class="ok-t">✓</span>' : '<span class="bad-t">✗</span><br>Correct: ' + esc(q.options[q.answer])) +
            '<br><span class="muted small">' + esc(q.explain) + '</span></li>';
        }).join('') + '</ol><div class="row"><button type="button" class="btn btn-primary" data-act="report">Download report</button><button type="button" class="btn" data-act="test-close">Back to the simulator</button></div></div></div>';
    }
    return '<div class="welcome"><div class="welcome-card wide"><p class="eyebrow">' + title + ' · ' + D.TEST.length + ' questions</p><h1>' + title + '</h1>' +
      '<p class="lead">' + (kind === 'pre'
        ? 'Before you start, answer what you already know. It is fine not to know yet. You will not see the answers now; the same questions come again at the end so you can see what you learned.'
        : 'Answer the same questions again. After you submit, you will see your score, your pre-test score and an explanation for each question. You can only submit once.') + '</p>' +
      D.TEST.map(function (q, i) {
        return '<fieldset class="fs tq"><legend>' + (i + 1) + '. ' + esc(q.q) + '</legend>' + q.options.map(function (o, oi) {
          return '<label class="check"><input type="radio" name="t-' + q.id + '" value="' + oi + '"> ' + esc(o) + '</label>';
        }).join('') + '</fieldset>';
      }).join('') +
      '<div class="row"><button type="button" class="btn btn-primary btn-lg" data-act="test-submit" data-v="' + kind + '">Submit ' + title.toLowerCase() + '</button>' +
      (kind === 'pre' ? '<button type="button" class="link" data-act="test-skip">Skip (lecturer demo only)</button>' : '<button type="button" class="btn btn-ghost" data-act="test-close">Not yet, back to the simulator</button>') +
      '</div></div></div>';
  }

  function glossaryPanel() {
    return '<div class="scrim" data-act="glossary"></div><aside class="drawer" aria-label="Glossary"><div class="dr-head"><h2>Glossary</h2><button type="button" class="btn btn-ghost btn-sm" data-act="glossary">Close</button></div>' +
      '<label>Search<input id="gloss-q" data-gloss="1" placeholder="e.g. eGFR, PRN, indent" autocomplete="off"></label>' +
      '<dl class="gloss">' + D.GLOSSARY.map(function (g) {
        return '<div class="g-item" data-term="' + esc((g[0] + ' ' + g[1]).toLowerCase()) + '"><dt>' + esc(g[0]) + '</dt><dd>' + esc(g[1]) + '</dd></div>';
      }).join('') + '</dl><p class="muted small" id="gloss-none" hidden>No matching term.</p></aside>';
  }

  /* ---------- layout ---------- */
  function render() {
    var root = document.getElementById('app');
    if (!S.student) { root.innerHTML = welcome(); return; }
    if (!S.pretest) { root.innerHTML = testView('pre'); root.dataset.mod = ''; window.scrollTo(0, 0); save(); return; }
    if (ui.test === 'post') { root.innerHTML = testView('post'); root.dataset.mod = ''; window.scrollTo(0, 0); save(); return; }
    var sameModule = root.dataset.mod === ui.module;
    var y = window.scrollY;
    var dr = root.querySelector('.drawer');
    var drY = dr ? dr.scrollTop : 0;
    root.innerHTML = topbar() + '<div class="shell">' + sidebar() + '<main class="main" id="main">' + mainView() + '</main></div>' +
      (ui.drawer ? drawer() : '') + (ui.glossary ? glossaryPanel() : '') + (ui.modal ? modal() : '');
    root.dataset.mod = ui.module;
    window.scrollTo(0, sameModule ? y : 0);
    var dr2 = root.querySelector('.drawer');
    if (dr2) dr2.scrollTop = drY;
    save();
  }

  function welcome() {
    return '<div class="welcome"><div class="welcome-card">' +
      '<p class="eyebrow">PHD 111 · ICT for Pharmacy</p>' +
      '<h1>Hospital Information System Simulator</h1>' +
      '<p class="lead">Step into <b>Hospital Bertam</b>, a fictional teaching hospital. You will log in as a clerk, doctor, pharmacist, lab officer, nurse, finance officer and IT admin, and work through nine cases that apply what you learned in the lecture.</p>' +
      '<div class="grid2">' +
      '<label>Full name<input id="w-name" autocomplete="name" placeholder="e.g. Aina binti Ahmad"></label>' +
      '<label>Matric number<input id="w-matric" placeholder="e.g. 2025123456"></label>' +
      '<label>Group<input id="w-group" placeholder="e.g. PHD1A"></label>' +
      '<label>Your track<select id="w-track"><option value="assistant">Pharmacy assistant (Diploma)</option><option value="pharmacist">Pharmacist (Degree)</option><option value="both">All cases</option></select></label>' +
      '</div>' +
      '<p class="small muted">Your track decides which cases are assigned to you. Your lecturer will tell you which to choose.</p>' +
      '<button type="button" class="btn btn-primary btn-lg" data-act="start">Start the simulation</button>' +
      '<p class="small muted">Your progress is saved in this browser only. All patients, staff and products are fictional, and the clinical rules are simplified for teaching.</p>' +
      '</div></div>';
  }

  function topbar() {
    var mine = myCases();
    var done = mine.filter(function (c) { return caseDone(c.id); }).length;
    var t = D.TIERS[S.tier];
    var roles = Object.keys(ROLES).map(function (k) { return '<option value="' + k + '"' + (S.role === k ? ' selected' : '') + '>' + ROLES[k].label + '</option>'; }).join('');
    return '<header class="top">' +
      '<div class="brand"><span class="logo" aria-hidden="true">H</span><div><div class="b1">HIS Simulator</div><div class="b2">Hospital Bertam · fictional</div></div></div>' +
      '<div class="ctrls">' +
      '<div class="seg" role="group" aria-label="HIS tier">' + ['BHIS', 'IHIS', 'THIS'].map(function (x) {
        return '<button type="button" data-act="tier" data-v="' + x + '" class="' + (S.tier === x ? 'on' : '') + '" aria-pressed="' + (S.tier === x) + '">' + x + '</button>';
      }).join('') + '</div>' +
      '<label class="role">Logged in as <select data-change="role">' + roles + '</select></label>' +
      '<button type="button" class="btn ' + (S.downtime ? 'btn-danger' : 'btn-ghost') + '" data-act="downtime">' + (S.downtime ? 'End downtime drill' : 'Start downtime drill') + '</button>' +
      '<button type="button" class="btn btn-primary" data-act="drawer">Cases ' + done + '/' + mine.length + '</button>' +
      '<button type="button" class="btn btn-ghost" data-act="glossary">Glossary</button>' +
      '<button type="button" class="btn btn-ghost" data-act="posttest">' + (S.posttest ? 'Test results' : 'Post-test') + '</button>' +
      '<button type="button" class="btn btn-ghost" data-act="report">Download report</button>' +
      '</div></header>' +
      (S.downtime ? '<div class="downbar" role="alert">DOWNTIME DRILL — the electronic system is unavailable. Use Downtime procedures (paper).</div>' : '') +
      '<div class="tierbar"><b>' + esc(t.name) + '</b><span>' + esc(t.beds) + '</span><span>Records: ' + esc(t.records) + '</span><span>Modules: ' + esc(t.modules) + '</span></div>';
  }

  function sidebar() {
    return '<nav class="side" aria-label="Modules">' + MODULES.map(function (m) {
      var tierOk = !m.tiers || m.tiers.indexOf(S.tier) >= 0;
      var roleOk = !m.roles || m.roles.indexOf(S.role) >= 0;
      var off = S.downtime && m.id !== 'home' && m.id !== 'downtime';
      var note = !tierOk ? 'Not in ' + S.tier : off ? 'Offline' : !roleOk ? 'No access' : '';
      return '<button type="button" class="nav' + (ui.module === m.id ? ' on' : '') + (note ? ' dim' : '') + '" data-act="nav" data-v="' + m.id + '">' +
        '<span class="code">' + m.code + '</span><span class="lbl">' + m.label + (note ? '<small>' + note + '</small>' : '') + '</span></button>';
    }).join('') + '<div class="side-foot"><button type="button" class="link" data-act="reset">Reset simulation</button></div></nav>';
  }

  function mainView() {
    var m = mod(ui.module);
    if (S.downtime && m.id !== 'home' && m.id !== 'downtime') {
      return panel('System unavailable', '<p>The downtime drill is running, so ' + esc(m.label) + ' cannot be used. Open <b>Downtime procedures</b> to work on paper.</p><button type="button" class="btn btn-primary" data-act="nav" data-v="downtime">Open Downtime procedures</button>', 'warn');
    }
    if (m.tiers && m.tiers.indexOf(S.tier) < 0) {
      return panel(m.label + ' is not part of ' + S.tier, '<p>' + esc(TIER_WHY[m.id] || '') + '</p><p class="muted">Switch the tier in the top bar to compare.</p>', 'info');
    }
    if (m.roles && m.roles.indexOf(S.role) < 0) {
      return panel('Access denied', '<p>Your role, <b>' + roleLabel() + '</b>, cannot open <b>' + esc(m.label) + '</b>. This attempt has been recorded in the audit trail.</p><p class="muted">Role-based access control gives each user only the information needed for their job. Change “Logged in as” in the top bar to use this module.</p>', 'danger');
    }
    return VIEWS[m.id]();
  }

  function panel(title, body, kind) {
    return '<section class="card notice ' + (kind || '') + '"><h2>' + esc(title) + '</h2>' + body + '</section>';
  }
  function head(code, title, sub) {
    return '<div class="phead"><p class="eyebrow">' + esc(code) + '</p><h1>' + esc(title) + '</h1>' + (sub ? '<p class="lead">' + sub + '</p>' : '') + '</div>';
  }
  function banner(p) {
    var al = p.allergies.length ? p.allergies.map(function (a) { return chip(D.ALLERGY_LABEL[a] + ' allergy', 'red'); }).join(' ') : chip('No known drug allergy');
    return '<div class="banner"><div><div class="b-name">' + esc(p.name) + '</div><div class="b-meta">' + esc(p.mrn) + ' · IC ' + esc(p.ic) + ' · ' + p.sex + ' · ' + p.age + ' y · ' + p.weight + ' kg · ' + esc(statusText(p)) + '</div></div><div class="b-tags">' + al + '</div></div>';
  }
  function tabs(name, list, cur) {
    return '<div class="tabs" role="tablist">' + list.map(function (t) {
      return '<button type="button" role="tab" aria-selected="' + (cur === t[0]) + '" class="' + (cur === t[0] ? 'on' : '') + '" data-act="tab" data-k="' + name + '" data-v="' + t[0] + '">' + esc(t[1]) + '</button>';
    }).join('') + '</div>';
  }
  function patientOptions(sel, placeholder) {
    return '<option value="">' + esc(placeholder || 'Select a patient') + '</option>' + S.patients.map(function (p) {
      return '<option value="' + p.mrn + '"' + (sel === p.mrn ? ' selected' : '') + '>' + esc(p.name) + ' · ' + p.mrn + '</option>';
    }).join('');
  }
  function drugOptions(sel) {
    return D.DRUGS.map(function (d) { return '<option value="' + d.id + '"' + (sel === d.id ? ' selected' : '') + '>' + esc(d.name) + '</option>'; }).join('');
  }
  function freqOptions(sel) {
    return Object.keys(D.FREQ).map(function (k) { return '<option value="' + k + '"' + (sel === k ? ' selected' : '') + '>' + D.FREQ[k].label + '</option>'; }).join('');
  }
  function statusChip(o) {
    return o.status === 'new' ? chip('Awaiting verification', 'blue') : o.status === 'verified' ? chip('Verified, ready to dispense', 'amber') :
      o.status === 'dispensed' ? chip('Dispensed', 'green') : o.status === 'cancelled' ? chip('Cancelled entry', 'grey') : chip('Intervened, not dispensed', 'red');
  }
  function empty(text) { return '<div class="empty">' + text + '</div>'; }

  /* ---------- views ---------- */
  var VIEWS = {};

  VIEWS.home = function () {
    var t = D.TIERS[S.tier];
    var stats = [
      ['Pharmacy orders to screen', S.orders.filter(function (o) { return o.status === 'new'; }).length],
      ['Lab results awaiting release', S.labs.filter(function (l) { return l.status === 'received' || l.status === 'ordered'; }).length],
      ['Admitted patients', S.patients.filter(function (p) { return p.status === 'admitted'; }).length],
      ['Your cases completed', myCases().filter(function (c) { return caseDone(c.id); }).length + ' of ' + myCases().length]
    ];
    return head('Dashboard', 'Welcome, ' + me(), 'You are logged in as <b>' + roleLabel() + '</b>. Change “Logged in as” in the top bar to play another role, then open that role’s module on the left.') +
      '<div class="stats">' + stats.map(function (s) { return '<div class="stat"><div class="n">' + s[1] + '</div><div class="l">' + s[0] + '</div></div>'; }).join('') + '</div>' +
      '<div class="grid2">' +
      '<section class="card"><h2>This hospital is running ' + esc(t.name) + '</h2><dl class="dl">' +
      '<dt>Size</dt><dd>' + esc(t.beds) + '</dd><dt>Records</dt><dd>' + esc(t.records) + '</dd><dt>Modules</dt><dd>' + esc(t.modules) + '</dd><dt>Real examples</dt><dd>' + esc(t.example) + '</dd></dl>' +
      '<p class="muted small">Switch BHIS / IHIS / THIS in the top bar to see what changes.</p></section>' +
      '<section class="card"><h2>How to work through the simulation</h2><ol class="steps">' +
      '<li>Open <b>Cases</b> (top bar). Your track (' + esc(TRACKS[track()].label) + ') decides which cases are assigned.</li>' +
      '<li>Follow the steps, switching roles as each step says. Ticks appear automatically when you complete each task.</li>' +
      '<li>Stuck on a term? Open the <b>Glossary</b>.</li>' +
      '<li>Write a short reflection for each case.</li>' +
      '<li>At the end, take the <b>Post-test</b>, then click <b>Download report</b> and submit the file.</li></ol>' +
      '<button type="button" class="btn btn-primary" data-act="drawer">Open Cases</button></section>' +
      '</div>';
  };

  VIEWS.pms = function () {
    var rows = S.patients.map(function (p) {
      return '<tr><td><b>' + esc(p.name) + '</b><br><span class="muted small">' + p.mrn + ' · IC ' + esc(p.ic) + '</span></td><td>' + p.sex + ' / ' + p.age + '</td>' +
        '<td>' + (p.allergies.length ? p.allergies.map(function (a) { return chip(D.ALLERGY_LABEL[a], 'red'); }).join(' ') : '<span class="muted">None known</span>') + '</td>' +
        '<td>' + esc(statusText(p)) + '</td><td>' + (p.status === 'admitted'
          ? '<button type="button" class="btn btn-sm" data-act="discharge" data-v="' + p.mrn + '">Discharge</button>'
          : '<button type="button" class="btn btn-sm" data-act="admit" data-v="' + p.mrn + '">Admit</button>') + '</td></tr>';
    }).join('');
    var allergies = Object.keys(D.ALLERGY_LABEL).map(function (k) {
      return '<label class="check"><input type="checkbox" id="r-al-' + k + '"> ' + D.ALLERGY_LABEL[k] + '</label>';
    }).join('');
    return head('PMS · Patient Management System', 'Registration and admissions', 'Registration creates the Medical Record Number (MRN) that every other module uses.') +
      '<section class="card"><h2>Register a new patient</h2><div class="form grid3">' +
      '<label>Full name<input id="r-name" placeholder="e.g. Encik Rahman bin Ali"></label>' +
      '<label>IC number<input id="r-ic" placeholder="e.g. 810505-07-xxxx"></label>' +
      '<label>Sex<select id="r-sex"><option value="M">Male</option><option value="F">Female</option></select></label>' +
      '<label>Age (years)<input id="r-age" type="number" min="0" max="120"></label>' +
      '<label>Weight (kg)<input id="r-weight" type="number" min="1" max="300"></label>' +
      '<label>Conditions<input id="r-cond" placeholder="e.g. Type 2 diabetes"></label>' +
      '</div><fieldset class="fs"><legend>Drug allergies</legend><div class="checks-row">' + allergies + '</div></fieldset>' +
      '<div class="form grid3"><label>Visit type<select id="r-status"><option value="">Outpatient</option>' + D.WARDS.map(function (w) { return '<option>' + w + '</option>'; }).join('') + '</select></label></div>' +
      '<button type="button" class="btn btn-primary" data-act="register">Register patient</button></section>' +
      '<section class="card"><h2>Patient list</h2><div class="tablewrap"><table><thead><tr><th>Patient</th><th>Sex / age</th><th>Allergies</th><th>Location</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div></section>';
  };

  VIEWS.cis = function () {
    var list = S.patients.map(function (p) {
      return '<button type="button" class="pt' + (ui.cisMrn === p.mrn ? ' on' : '') + '" data-act="cis-pt" data-v="' + p.mrn + '"><b>' + esc(p.name) + '</b><span>' + p.mrn + ' · ' + esc(statusText(p)) + '</span></button>';
    }).join('');
    var body;
    if (!ui.cisMrn) body = empty('Select a patient to open the chart.');
    else {
      var p = pat(ui.cisMrn);
      var tlist = [['summary', 'Summary'], ['notes', 'Notes'], ['inv', 'Investigations'], ['rx', 'e-Prescribe'], ['orders', 'Medication orders']];
      body = banner(p) + tabs('cisTab', tlist, ui.cisTab) + CIS_TABS[ui.cisTab](p);
    }
    return head('CIS · Clinical Information System', 'Clinical charting and e-prescribing', 'Doctors write notes, order investigations and prescribe electronically (CPOE).') +
      '<div class="split"><div class="ptlist">' + list + '</div><div class="pane">' + body + '</div></div>';
  };

  function labLine(l) {
    var t = D.LAB_TESTS[l.test];
    if (l.status !== 'released') return '<li>' + esc(t.name) + ' ' + chip(l.status === 'paper' ? 'Paper request (BHIS)' : 'Pending', 'blue') + '</li>';
    return '<li><b>' + esc(t.name) + '</b> (' + fmt(l.releasedAt) + '): ' + t.fields.map(function (f) {
      var v = l.values[f.k], flag = (f.low !== undefined && v < f.low) ? ' L' : (f.high !== undefined && v > f.high) ? ' H' : '';
      return esc(f.label) + ' ' + v + (f.unit ? ' ' + f.unit : '') + (flag ? ' <b class="flag">' + flag.trim() + '</b>' : '');
    }).join(', ') + (t.fields[0].note ? ' <span class="muted small">(' + esc(t.fields[0].note) + ')</span>' : '') + '</li>';
  }
  function labsBlock(mrn) {
    if (!tierHas('lis')) return '<p class="muted">Lab results are on paper in BHIS and are not visible here.</p>';
    var labs = S.labs.filter(function (l) { return l.mrn === mrn; });
    return labs.length ? '<ul class="plain">' + labs.map(labLine).join('') + '</ul>' : '<p class="muted">No lab tests.</p>';
  }

  var CIS_TABS = {
    summary: function (p) {
      var meds = activeMeds(p.mrn);
      var img = S.imaging.filter(function (i) { return i.mrn === p.mrn; });
      return '<div class="grid2"><section class="card"><h3>Allergies</h3><p>' + (p.allergies.length ? p.allergies.map(function (a) { return D.ALLERGY_LABEL[a]; }).join(', ') + (p.allergyNote ? ' — ' + esc(p.allergyNote) : '') : 'No known drug allergy') + '</p>' +
        '<h3>Conditions</h3><p>' + esc(p.conditions.join(', ') || '—') + '</p>' +
        '<h3>Current medicines</h3>' + (meds.length ? '<ul class="plain">' + meds.map(function (o) { return '<li>' + esc(orderText(o)) + '</li>'; }).join('') + '</ul>' : '<p class="muted">None</p>') + '</section>' +
        '<section class="card"><h3>Lab results</h3>' + labsBlock(p.mrn) +
        '<h3>Imaging</h3>' + (!tierHas('ris') ? '<p class="muted">Imaging reports are separate from the HIS in ' + S.tier + '.</p>' : img.length ? '<ul class="plain">' + img.map(function (i) { return '<li><b>' + esc(i.type) + ':</b> ' + esc(i.status === 'reported' ? i.report : 'Awaiting report') + '</li>'; }).join('') + '</ul>' : '<p class="muted">None</p>') + '</section></div>';
    },
    notes: function (p) {
      var notes = S.notes.filter(function (n) { return n.mrn === p.mrn; }).slice().reverse();
      return '<section class="card"><h3>Add a clinical note</h3><textarea id="n-text" rows="4" placeholder="e.g. Admitted for poorly controlled diabetes…"></textarea><button type="button" class="btn btn-primary" data-act="note">Save note</button></section>' +
        (notes.length ? notes.map(function (n) { return '<article class="card note"><div class="muted small">' + fmt(n.at) + ' · ' + esc(n.by) + '</div><p>' + esc(n.text) + '</p></article>'; }).join('') : empty('No notes yet.'));
    },
    inv: function (p) {
      var opts = Object.keys(D.LAB_TESTS).map(function (k) { return '<option value="' + k + '">' + D.LAB_TESTS[k].name + '</option>'; }).join('');
      return '<div class="grid2"><section class="card"><h3>Order a lab test</h3><label>Test<select id="lab-test">' + opts + '</select></label><button type="button" class="btn btn-primary" data-act="lab-order">Order test</button>' +
        (!tierHas('lis') ? '<p class="muted small">BHIS: the request is printed and the result returns on paper.</p>' : '') + '</section>' +
        '<section class="card"><h3>Order imaging</h3>' + (tierHas('ris') ? '<label>Examination<select id="img-type"><option>Chest X-ray (PA)</option><option>X-ray knee (AP/lateral)</option></select></label><button type="button" class="btn btn-primary" data-act="img-order">Order imaging</button>' : '<p class="muted">Radiology IS and PACS are only available in THIS.</p>') + '</section></div>' +
        '<section class="card"><h3>Results</h3>' + labsBlock(p.mrn) + '</section>';
    },
    rx: function (p) {
      var dr = ui.cpoe && ui.cpoe.mrn === p.mrn ? ui.cpoe : { drugId: 'paracetamol', dose: '', freq: 'OD', days: 5, indication: '' };
      var alerts = ui.cpoeAlerts && ui.cpoe && ui.cpoe.mrn === p.mrn ? ui.cpoeAlerts : null;
      return '<section class="card"><h3>Computerised Physician Order Entry (CPOE)</h3><div class="form grid3">' +
        '<label class="span2">Drug<select id="rx-drug">' + drugOptions(dr.drugId) + '</select></label>' +
        '<label>Dose per administration (mg, or puffs for inhalers)<input id="rx-dose" type="number" min="0" step="any" value="' + esc(dr.dose) + '"></label>' +
        '<label>Frequency<select id="rx-freq">' + freqOptions(dr.freq) + '</select></label>' +
        '<label>Duration (days)<input id="rx-days" type="number" min="1" value="' + esc(dr.days) + '"></label>' +
        '<label>Indication<input id="rx-ind" value="' + esc(dr.indication) + '"></label></div>' +
        (alerts ? '<div class="alertbox"><b>Prescriber alert</b><ul>' + alerts.map(function (a) { return '<li>' + esc(a.msg) + '</li>'; }).join('') + '</ul><p class="small">You can change the order, or send it anyway. The pharmacist will screen it again.</p></div>' : '') +
        '<div class="row"><button type="button" class="btn btn-primary" data-act="rx-send">' + (alerts ? 'Re-check order' : 'Send to pharmacy') + '</button>' +
        (alerts ? '<button type="button" class="btn btn-danger" data-act="rx-send" data-v="force">Send anyway (override)</button>' : '') + '</div>' +
        (!tierHas('phis') ? '<p class="muted small">BHIS: the order prints out and the pharmacy works from the paper copy.</p>' : '') + '</section>';
    },
    orders: function (p) {
      var os = S.orders.filter(function (o) { return o.mrn === p.mrn; }).slice().reverse();
      return '<section class="card"><div class="tablewrap"><table><thead><tr><th>Order</th><th>Medicine</th><th>Status</th><th>Pharmacist note</th></tr></thead><tbody>' +
        os.map(function (o) {
          return '<tr><td>' + o.id + '<br><span class="muted small">' + fmt(o.createdAt) + '</span></td><td>' + esc(orderText(o)) + '</td><td>' + statusChip(o) + '</td><td>' +
            (o.intervention ? esc(o.intervention.reason + ': ' + (o.intervention.action === 'withhold' ? 'withhold' : 'replaced by ' + o.intervention.newOrderId) + (o.intervention.note ? ' — ' + o.intervention.note : '')) : '') + '</td></tr>';
        }).join('') + '</tbody></table></div></section>';
    }
  };

  VIEWS.nis = function () {
    var adm = S.patients.filter(function (p) { return p.status === 'admitted'; });
    var blocks = adm.map(function (p) {
      var meds = activeMeds(p.mrn);
      return '<section class="card">' + banner(p) + (meds.length ? '<div class="tablewrap"><table><thead><tr><th>Medicine</th><th>Directions</th><th>Last given</th><th></th></tr></thead><tbody>' + meds.map(function (o) {
        var last = S.mar.filter(function (m) { return m.orderId === o.id; }).slice(-1)[0];
        return '<tr><td><b>' + esc(drug(o.drugId).short) + '</b><br><span class="muted small">' + o.id + '</span></td><td>' + esc(directions(o)) + '</td><td>' + (last ? fmt(last.at) + '<br><span class="muted small">' + esc(last.by) + '</span>' : '<span class="muted">Not yet</span>') + '</td>' +
          '<td><button type="button" class="btn btn-sm btn-primary" data-act="mar" data-v="' + o.id + '">Record dose</button></td></tr>';
      }).join('') + '</tbody></table></div>' : '<p class="muted">No medicines dispensed yet. Orders appear here after the pharmacy dispenses them.</p>') + '</section>';
    }).join('');
    var mar = S.mar.slice().reverse();
    return head('NIS · Nursing Information System', 'Medication Administration Record (MAR)', 'Nurses record each dose given to admitted patients.') +
      (blocks || empty('No admitted patients.')) +
      '<section class="card"><h2>Administration log</h2>' + (mar.length ? '<div class="tablewrap"><table><thead><tr><th>Time</th><th>Patient</th><th>Medicine</th><th>Given by</th><th>Note</th></tr></thead><tbody>' + mar.map(function (m) {
        var o = order(m.orderId);
        return '<tr><td>' + fmt(m.at) + '</td><td>' + esc(pat(m.mrn).name) + '</td><td>' + esc(orderText(o)) + '</td><td>' + esc(m.by) + '</td><td>' + esc(m.note) + '</td></tr>';
      }).join('') + '</tbody></table></div>' : '<p class="muted">No doses recorded yet.</p>') + '</section>';
  };

  VIEWS.lis = function () {
    function card(l, btn) {
      var t = D.LAB_TESTS[l.test], p = pat(l.mrn);
      return '<article class="card labcard"><div class="row-between"><div><b>' + esc(t.name) + '</b> · ' + l.id + '<div class="muted small">' + esc(p.name) + ' · ' + p.mrn + ' · ordered ' + fmt(l.orderedAt) + '</div></div>' + btn + '</div>' +
        (l.values ? '<table class="mini"><tbody>' + t.fields.map(function (f) {
          var v = l.values[f.k], flag = (f.low !== undefined && v < f.low) ? 'Low' : (f.high !== undefined && v > f.high) ? 'High' : '';
          return '<tr><td>' + esc(f.label) + '</td><td><b>' + v + '</b> ' + esc(f.unit) + '</td><td>' + (flag ? chip(flag, 'red') : chip('Normal', 'green')) + '</td><td class="muted small">' + (f.low !== undefined ? 'ref ≥ ' + f.low : '') + (f.high !== undefined ? ' ≤ ' + f.high : '') + (f.note ? ' · ' + esc(f.note) : '') + '</td></tr>';
        }).join('') + '</tbody></table>' : '') + '</article>';
    }
    var received = S.labs.filter(function (l) { return l.status === 'received'; });
    var ordered = S.labs.filter(function (l) { return l.status === 'ordered'; });
    var released = S.labs.filter(function (l) { return l.status === 'released'; }).slice().reverse().slice(0, 8);
    return head('LIS · Laboratory Information System', 'Laboratory worklist', 'Analysers send results straight into the LIS. The lab officer validates them before release to doctors and pharmacists.') +
      '<h2 class="sec">Analyser results awaiting validation</h2>' + (received.length ? received.map(function (l) { return card(l, '<button type="button" class="btn btn-primary" data-act="lab-release" data-v="' + l.id + '">Validate and release</button>'); }).join('') : empty('Nothing waiting.')) +
      '<h2 class="sec">Ordered, sample not yet run</h2>' + (ordered.length ? ordered.map(function (l) { return card(l, '<button type="button" class="btn" data-act="lab-run" data-v="' + l.id + '">Run on analyser</button>'); }).join('') : empty('No samples waiting.')) +
      '<h2 class="sec">Recently released</h2>' + (released.length ? released.map(function (l) { return card(l, chip('Released ' + fmt(l.releasedAt), 'green')); }).join('') : empty('None yet.'));
  };

  /* PhIS */
  VIEWS.phis = function () {
    var h = head('PhIS · Pharmacy Information System', 'Pharmacy', 'Screen, verify and dispense orders; manage stock; look up drug information.');
    if (ui.phisTab === 'queue' && ui.orderId) return h + verifyView(order(ui.orderId));
    return h + (S.role === 'assistant' ? '<p class="note-tier">You are logged in as a <b>pharmacy assistant</b>. You can enter prescriptions, supply ward requests, manage stock and dispense verified orders. Clinical verification and interventions are the pharmacist’s role, so refer any alert to the pharmacist.</p>' : '') +
      tabs('phisTab', [['queue', 'Order queue'], ['entry', 'Prescription entry'], ['indent', 'Ward requests'], ['inventory', 'Inventory'], ['dice', 'Drug information (DICE)'], ['int', 'Interventions']], ui.phisTab) + PHIS_TABS[ui.phisTab]();
  };
  var PHIS_TABS = {
    queue: function () {
      var act = S.orders.filter(function (o) { return o.status === 'new' || o.status === 'verified'; });
      var done = S.orders.filter(function (o) { return (o.status === 'dispensed' || o.status === 'rejected') && o.source !== 'seed' && o.source !== 'back-entry'; }).slice().reverse().slice(0, 8);
      function row(o) {
        var c = o.status === 'new' ? screen(o) : null;
        var al = c ? (count(c, 'major') ? chip(count(c, 'major') + ' major', 'red') + ' ' : '') + (count(c, 'moderate') ? chip(count(c, 'moderate') + ' moderate', 'amber') : '') : '';
        if (o.referred && o.status === 'new') al += ' ' + chip('Referred to pharmacist', 'blue');
        return '<tr><td><b>' + o.id + '</b><br><span class="muted small">' + fmt(o.createdAt) + '</span></td><td>' + esc(pat(o.mrn).name) + '<br><span class="muted small">' + o.mrn + '</span></td><td>' + esc(orderText(o)) + '</td><td>' + statusChip(o) + ' ' + al + '</td>' +
          '<td><button type="button" class="btn btn-sm btn-primary" data-act="open-order" data-v="' + o.id + '">Open</button></td></tr>';
      }
      return '<section class="card"><h2>To do</h2>' + (act.length ? '<div class="tablewrap"><table><thead><tr><th>Order</th><th>Patient</th><th>Medicine</th><th>Status</th><th></th></tr></thead><tbody>' + act.map(row).join('') + '</tbody></table></div>' : '<p class="muted">The queue is empty.</p>') + '</section>' +
        (done.length ? '<section class="card"><h2>Recently completed</h2><div class="tablewrap"><table><thead><tr><th>Order</th><th>Patient</th><th>Medicine</th><th>Status</th><th></th></tr></thead><tbody>' + done.map(row).join('') + '</tbody></table></div></section>' : '');
    },
    entry: function () {
      var html = S.paperRx.map(function (rx) {
        var entered = S.orders.filter(function (o) { return o.paperRxId === rx.id; });
        return '<div class="grid2 entry"><article class="rxpaper" aria-label="Handwritten prescription ' + rx.id + '">' +
          '<div class="rx-h"><b>' + esc(rx.from) + '</b><span>PRESKRIPSI · ' + rx.id + '</span></div>' +
          '<div class="rx-hand">Nama: ' + esc(rx.patient) + '<br>K/P: ' + esc(rx.ic) + '<br><span class="rx-sym">℞</span>' +
          rx.lines.map(function (l, i) { return '<div class="rx-line">' + (i + 1) + '. ' + esc(l.drug) + ' — ' + esc(l.sig) + '</div>'; }).join('') +
          '<div class="rx-dx">' + esc(rx.note) + '</div><div class="rx-sig">' + esc(rx.doctor) + '</div></div>' +
          '<div class="muted small">Received ' + fmt(rx.at) + '</div></article>' +
          '<section class="card"><h3>Enter one item at a time</h3><p class="small muted">Enter exactly what is written. Do not correct it yourself; refer concerns to the pharmacist.</p>' +
          '<label>Patient (match two identifiers: name and IC)<select id="tx-pt-' + rx.id + '">' + patientOptions('', 'Select the patient') + '</select></label>' +
          '<label>Drug<select id="tx-drug-' + rx.id + '">' + drugOptions('paracetamol') + '</select></label>' +
          '<div class="form grid3"><label>Dose (mg)<input id="tx-dose-' + rx.id + '" type="number" min="0" step="any"></label>' +
          '<label>Frequency<select id="tx-freq-' + rx.id + '">' + freqOptions('OD') + '</select></label>' +
          '<label>Days<input id="tx-days-' + rx.id + '" type="number" min="1"></label></div>' +
          '<button type="button" class="btn btn-primary" data-act="tx-add" data-v="' + rx.id + '">Add to pharmacy queue</button>' +
          (entered.length ? '<h3>Entered from this prescription</h3><ul class="plain">' + entered.map(function (o) {
            return '<li>' + o.id + ' · ' + esc(pat(o.mrn).name) + ' · ' + esc(orderText(o)) + ' ' + statusChip(o) +
              (o.status === 'new' && !o.referred ? ' <button type="button" class="btn btn-sm" data-act="open-order" data-v="' + o.id + '">Open</button> <button type="button" class="btn btn-sm btn-ghost" data-act="tx-cancel" data-v="' + o.id + '">Cancel entry</button>' : '') + '</li>';
          }).join('') + '</ul>' : '') + '</section></div>';
      }).join('');
      return html || empty('No paper prescriptions waiting.');
    },
    indent: function () {
      return S.indents.slice().reverse().map(function (ind) {
        var pending = ind.status === 'pending';
        return '<section class="card"><div class="row-between"><div><h2>' + ind.id + ' · ' + esc(ind.ward) + '</h2><p class="muted small">Requested by ' + esc(ind.by) + ' · ' + fmt(ind.at) + '</p></div>' +
          (pending ? chip('Pending', 'blue') : chip('Supplied ' + fmt(ind.suppliedAt) + ' by ' + ind.suppliedBy, 'green')) + '</div>' +
          '<div class="tablewrap"><table><thead><tr><th>Item</th><th class="num">Requested</th><th class="num">Usable stock</th><th>' + (pending ? 'Supply now' : 'Supplied') + '</th><th>Reason if short</th></tr></thead><tbody>' +
          ind.lines.map(function (l, i) {
            var iv = inv(l.drugId), usable = usableStock(iv);
            var why = !iv ? 'Not stocked' : iv.quarantined ? 'Quarantined' : isExpired(iv) ? 'Expired batch' : '';
            return '<tr><td><b>' + esc(drug(l.drugId).name) + '</b></td><td class="num">' + l.qty + '</td><td class="num">' + usable + (why ? '<br>' + chip(why, 'red') : '') + '</td>' +
              (pending ? '<td><input id="ind-q-' + ind.id + '-' + i + '" type="number" min="0" style="max-width:110px"></td><td><input id="ind-n-' + ind.id + '-' + i + '" placeholder="e.g. Low stock, balance to follow"></td>'
                : '<td class="num">' + l.supplied + '</td><td>' + esc(l.note || '') + '</td>') + '</tr>';
          }).join('') + '</tbody></table></div>' +
          (pending ? '<button type="button" class="btn btn-primary" data-act="indent-supply" data-v="' + ind.id + '">Supply</button>' : '') + '</section>';
      }).join('') || empty('No ward requests.');
    },
    inventory: function () {
      var soon = Date.now() + 90 * DAY;
      var rows = S.inventory.map(function (i) {
        var d = drug(i.drugId), st;
        if (i.quarantined) st = chip('Quarantined', 'grey');
        else if (isExpired(i)) st = chip('Expired', 'red');
        else if (new Date(i.expiry).getTime() < soon) st = chip('Near expiry', 'amber');
        else st = chip('In date', 'green');
        var lvl = isLow(i) ? chip('At or below re-order level', 'red') : chip('OK', 'green');
        var po = S.pos.filter(function (p) { return p.drugId === i.drugId && p.status === 'open'; })[0];
        return '<tr><td><b>' + esc(d.name) + '</b><br><span class="muted small">Batch ' + i.batch + '</span></td><td class="num">' + i.stock + '</td><td class="num">' + i.reorder + '</td><td>' + lvl + (po ? '<br><span class="muted small">' + po.id + ' open</span>' : '') + '</td><td>' + fmtDate(i.expiry) + '<br>' + st + '</td>' +
          '<td>' + (isExpired(i) && !i.quarantined ? '<button type="button" class="btn btn-sm btn-danger" data-act="quarantine" data-v="' + i.drugId + '">Quarantine</button>' : '') + '</td></tr>';
      }).join('');
      var pos = S.pos.slice().reverse();
      return '<section class="card"><div class="row-between"><h2>Stock levels</h2><button type="button" class="btn btn-primary" data-act="reorder">Generate re-orders</button></div>' +
        '<div class="tablewrap"><table><thead><tr><th>Item</th><th class="num">Stock</th><th class="num">Re-order level</th><th>Level</th><th>Expiry</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div></section>' +
        '<section class="card"><h2>Purchase orders</h2>' + (pos.length ? '<div class="tablewrap"><table><thead><tr><th>PO</th><th>Item</th><th class="num">Quantity</th><th>Status</th><th></th></tr></thead><tbody>' + pos.map(function (p) {
          return '<tr><td>' + p.id + '<br><span class="muted small">' + fmt(p.createdAt) + '</span></td><td>' + esc(drug(p.drugId).name) + '</td><td class="num">' + p.qty + '</td><td>' + (p.status === 'open' ? chip('Open', 'blue') : chip('Received ' + fmt(p.receivedAt), 'green')) + '</td>' +
            '<td>' + (p.status === 'open' ? '<button type="button" class="btn btn-sm" data-act="receive" data-v="' + p.id + '">Receive</button>' : '') + '</td></tr>';
        }).join('') + '</tbody></table></div>' : '<p class="muted">No purchase orders yet.</p>') + '</section>';
    },
    dice: function () {
      var d = drug(ui.dice);
      var ix = D.INTERACTIONS.filter(function (x) { return x.a === d.id || x.b === d.id; });
      return '<section class="card"><label>Medicine<select data-change="dice">' + drugOptions(d.id) + '</select></label>' +
        '<h2>' + esc(d.name) + '</h2><dl class="dl">' +
        '<dt>Class</dt><dd>' + esc(d.clsLabel) + '</dd><dt>Legal category</dt><dd>' + esc(D.GROUP_LABEL[d.group]) + ' <span class="muted small">(simplified)</span></dd>' +
        '<dt>Usual dose</dt><dd>' + esc(d.usual) + '</dd><dt>Maximum</dt><dd>' + d.maxDaily + ' ' + d.unit + ' per day</dd>' +
        '<dt>Renal</dt><dd>' + (d.renal ? d.renal.map(function (r) { return esc(r.msg); }).join('<br>') : 'No adjustment') + '</dd>' +
        '<dt>Interactions</dt><dd>' + (ix.length ? ix.map(function (x) { return sevChip(x.sev) + ' ' + esc(drug(x.a === d.id ? x.b : x.a).short) + ': ' + esc(x.msg); }).join('<br>') : 'None in this simulator') + '</dd>' +
        '<dt>Counselling</dt><dd><ul class="plain">' + d.counsel.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') + '</ul></dd></dl></section>';
    },
    int: function () {
      var list = S.orders.filter(function (o) { return o.intervention; }).slice().reverse();
      return '<section class="card"><h2>Pharmacist interventions</h2>' + (list.length ? '<div class="tablewrap"><table><thead><tr><th>Order</th><th>Patient</th><th>Reason</th><th>Action</th><th>Note</th></tr></thead><tbody>' + list.map(function (o) {
        var n = o.intervention.newOrderId ? order(o.intervention.newOrderId) : null;
        return '<tr><td>' + o.id + '<br><span class="muted small">' + esc(orderText(o)) + '</span></td><td>' + esc(pat(o.mrn).name) + '</td><td>' + esc(o.intervention.reason) + '</td><td>' + (n ? 'Changed to ' + esc(orderText(n)) + ' (' + n.id + ')' : 'Withheld') + '</td><td>' + esc(o.intervention.note) + '</td></tr>';
      }).join('') + '</tbody></table></div>' : '<p class="muted">No interventions yet.</p>') + '</section>';
    }
  };

  function verifyView(o) {
    var p = pat(o.mrn), d = drug(o.drugId);
    var back = '<button type="button" class="btn btn-ghost" data-act="close-order">← Back to queue</button>';
    var meds = activeMeds(o.mrn, o.id);
    var e = tierHas('lis') ? latestEgfr(o.mrn) : null;
    var info = '<section class="card"><div class="grid2"><div><p class="eyebrow">Order ' + o.id + (o.replaces ? ' · replaces ' + o.replaces : '') + '</p>' +
      '<h2>' + esc(d.name) + '</h2><p class="big">' + o.dose + ' ' + d.unit + ' ' + esc(D.FREQ[o.freq].label.split(' — ')[1]) + ' for ' + o.days + ' days · quantity ' + o.qty + '</p>' +
      '<p class="muted">Indication: ' + esc(o.indication || '—') + '<br>Prescriber: ' + esc(o.prescriber) + ' · ' + fmt(o.createdAt) + '</p>' + statusChip(o) + '</div>' +
      '<div><h3>Current medicines</h3>' + (meds.length ? '<ul class="plain">' + meds.map(function (m) { return '<li>' + esc(orderText(m)) + '</li>'; }).join('') + '</ul>' : '<p class="muted">None</p>') +
      '<h3>Latest eGFR</h3><p>' + (!tierHas('lis') ? '<span class="muted">Not available electronically (BHIS)</span>' : e ? e.val + ' mL/min/1.73 m² <span class="muted small">(' + fmt(e.at) + ')</span>' : '<span class="muted">No released result</span>') + '</p></div></div></section>';

    if (o.status === 'rejected') {
      var n = o.intervention.newOrderId;
      return back + banner(p) + info + panel('Intervention recorded', '<p><b>' + esc(o.intervention.reason) + ':</b> ' + esc(o.intervention.note || '') + '</p>' +
        (n ? '<button type="button" class="btn btn-primary" data-act="open-order" data-v="' + n + '">Open replacement order ' + n + '</button>' : '<p>The order was withheld.</p>'), 'info');
    }
    if (o.status === 'dispensed') {
      return back + banner(p) + info + panel('Dispensed', '<p>' + esc(directions(o)) + '. Dispensed ' + (o.dispensedAt ? fmt(o.dispensedAt) : '') + (o.dispensedBy ? ' by ' + esc(o.dispensedBy) : '') + '.</p>', 'ok');
    }

    var checks = screen(o);
    var maj = count(checks, 'major'), modr = count(checks, 'moderate');
    var table = '<section class="card"><h2>Clinical screening</h2><div class="tablewrap"><table class="screen"><thead><tr><th>Check</th><th>Result</th><th>Details</th></tr></thead><tbody>' +
      checks.map(function (c) { return '<tr class="sev-' + c.sev + '"><td><b>' + esc(c.name) + '</b></td><td>' + sevChip(c.sev) + '</td><td>' + esc(c.msg) + (c.advice ? '<br><span class="advice">' + esc(c.advice) + '</span>' : '') + '</td></tr>'; }).join('') +
      '</tbody></table></div></section>';

    var actions;
    var refNote = o.referred ? '<div class="note-tier"><b>Referred by ' + esc(o.referred.by) + '</b> · ' + fmt(o.referred.at) + (o.referred.note ? ': ' + esc(o.referred.note) : '') + '</div>' : '';
    if (o.status === 'new' && S.role === 'assistant') {
      actions = '<section class="card"><h2>Pharmacy assistant action</h2>' +
        (o.referred ? refNote + '<p class="muted">Waiting for the pharmacist. Log in as Pharmacist to act on it.</p>' :
          (maj ? '<div class="alertbox">There ' + (maj > 1 ? 'are ' + maj + ' major alerts' : 'is 1 major alert') + '. Do not supply. Refer to the pharmacist.</div>' :
            '<p>No major alerts. The pharmacist still needs to verify this order before it can be dispensed.</p>') +
          '<label>Note to pharmacist<textarea id="ref-note" rows="2" placeholder="e.g. Allergy alert: patient has NSAID allergy"></textarea></label>' +
          '<button type="button" class="btn btn-primary" data-act="refer" data-v="' + o.id + '">Refer to pharmacist</button>') + '</section>';
    } else if (o.status === 'new') {
      actions = '<section class="card"><h2>Decision</h2>' + refNote +
        (maj ? '<div class="alertbox">There ' + (maj > 1 ? 'are ' + maj + ' major alerts' : 'is 1 major alert') + '. The safe choice is usually to intervene. To verify anyway, you must give an override reason.</div><label>Override reason (required to verify with a major alert)<textarea id="ov" rows="2"></textarea></label>' : '') +
        (modr ? '<label class="check"><input type="checkbox" id="ack"> I have reviewed the moderate alert' + (modr > 1 ? 's' : '') + ' and will counsel or monitor as advised.</label>' : '') +
        '<div class="row"><button type="button" class="btn ' + (maj ? 'btn-ghost' : 'btn-primary') + '" data-act="verify" data-v="' + o.id + '">' + (maj ? 'Override and verify' : 'Verify order') + '</button>' +
        '<button type="button" class="btn ' + (maj ? 'btn-primary' : 'btn-ghost') + '" data-act="intervene" data-v="' + o.id + '">Intervene</button></div></section>';
    } else {
      var units = d.pack ? '1 inhaler' : o.qty + ' ' + d.form + 's';
      actions = '<section class="card"><h2>Dispense</h2><div class="grid2"><div class="label-prev" aria-label="Label preview">' +
        '<div class="lp-h">HOSPITAL BERTAM PHARMACY <span>(simulation)</span></div>' +
        '<div><b>' + esc(p.name) + '</b> · ' + p.mrn + '</div><div class="lp-drug">' + esc(d.name) + '</div><div>' + esc(directions(o)) + '</div>' +
        '<div class="muted small">Qty: ' + units + ' · ' + fmtDate(Date.now()) + ' · ' + esc(me()) + '</div></div>' +
        '<div><h3>Konsep 5B checklist</h3>' +
        [['fb1', 'Right patient: confirmed with two identifiers (name + MRN or IC)'], ['fb2', 'Right medicine: label matches the order'], ['fb3', 'Right dose: strength and quantity checked'], ['fb4', 'Right way to take it: route and method explained'], ['fb5', 'Right time: frequency and duration explained'], ['fbc', 'Counselling given (points below)']]
          .map(function (x) { return '<label class="check"><input type="checkbox" id="' + x[0] + '"> ' + x[1] + '</label>'; }).join('') +
        '<h3>Counselling points</h3><ul class="plain">' + d.counsel.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') + '</ul></div></div>' +
        '<button type="button" class="btn btn-primary" data-act="dispense" data-v="' + o.id + '">Dispense</button></section>';
    }
    return back + banner(p) + info + table + actions;
  }

  VIEWS.ris = function () {
    var list = S.imaging.slice().reverse();
    var sel = ui.risId ? S.imaging.filter(function (i) { return i.id === ui.risId; })[0] : list[0];
    var viewer = sel ? '<section class="card"><h2>' + esc(sel.type) + ' · ' + esc(pat(sel.mrn).name) + '</h2>' + xray(sel) +
      '<p><b>Report:</b> ' + esc(sel.status === 'reported' ? sel.report + ' (' + sel.reportedBy + ')' : 'Awaiting radiologist report.') + '</p></section>' : empty('No imaging yet.');
    return head('RIS / PACS · Radiology', 'Radiology Information System and PACS', 'Images go straight from the X-ray machine into PACS and can be viewed at any authorised workstation.') +
      '<div class="split"><div class="ptlist">' + list.map(function (i) {
        return '<button type="button" class="pt' + (sel && sel.id === i.id ? ' on' : '') + '" data-act="ris" data-v="' + i.id + '"><b>' + esc(i.type) + '</b><span>' + esc(pat(i.mrn).name) + ' · ' + fmt(i.at) + '</span></button>';
      }).join('') + '</div><div class="pane">' + viewer + '</div></div>';
  };
  function xray(i) {
    var cons = /consolidation/i.test(i.report || '');
    return '<svg class="xray" viewBox="0 0 400 300" role="img" aria-label="Simulated ' + esc(i.type) + ' image">' +
      '<rect width="400" height="300" fill="#0d0f12"/>' +
      '<ellipse cx="140" cy="150" rx="70" ry="110" fill="#3b4148"/><ellipse cx="260" cy="150" rx="70" ry="110" fill="#3b4148"/>' +
      '<rect x="190" y="30" width="20" height="250" rx="6" fill="#9aa3ad"/>' +
      '<ellipse cx="225" cy="190" rx="50" ry="45" fill="#cfd5db" opacity=".55"/>' +
      (cons ? '<ellipse cx="135" cy="215" rx="45" ry="32" fill="#e6e9ec" opacity=".55"/>' : '') +
      '<text x="12" y="22" fill="#cfd5db" font-size="13" font-family="monospace">PACS · ' + esc(i.id) + ' · R</text></svg>';
  }

  VIEWS.fis = function () {
    var by = {};
    S.bills.forEach(function (b) { (by[b.mrn] = by[b.mrn] || []).push(b); });
    var keys = Object.keys(by);
    return head('FIS · Financial Information System', 'Patient billing', 'In THIS, every chargeable test and dispensed medicine creates a bill item automatically.') +
      (keys.length ? keys.map(function (k) {
        var total = by[k].reduce(function (s, b) { return s + b.amount; }, 0);
        return '<section class="card"><h2>' + esc(pat(k).name) + ' <span class="muted small">' + k + '</span></h2><div class="tablewrap"><table><thead><tr><th>Time</th><th>Item</th><th class="num">Amount</th></tr></thead><tbody>' +
          by[k].map(function (b) { return '<tr><td>' + fmt(b.at) + '</td><td>' + esc(b.item) + '</td><td class="num">' + rm(b.amount) + '</td></tr>'; }).join('') +
          '<tr class="total"><td></td><td>Total</td><td class="num">' + rm(total) + '</td></tr></tbody></table></div></section>';
      }).join('') : empty('No charges yet. Release a lab result or dispense a medicine (in THIS) and the bill appears here automatically.')) +
      '<p class="muted small">Prices are illustrative only.</p>';
  };

  VIEWS.emr = function () {
    var p = ui.emrMrn ? pat(ui.emrMrn) : null;
    var h = head('EMR · One Individual, One Record', 'Electronic Medical Record', 'Everything recorded in every module, in one timeline per patient.');
    var pick = '<section class="card"><label>Patient<select data-change="emr">' + patientOptions(ui.emrMrn) + '</select></label></section>';
    if (!p) return h + pick;
    var demo = '<section class="card"><h2>Demographics</h2><dl class="dl"><dt>Name</dt><dd>' + esc(p.name) + '</dd><dt>MRN</dt><dd>' + p.mrn + '</dd><dt>IC</dt><dd>' + esc(p.ic) + '</dd><dt>Sex / age</dt><dd>' + p.sex + ' / ' + p.age + '</dd>' +
      '<dt>Address</dt><dd>' + esc(p.address || '—') + '</dd><dt>Location</dt><dd>' + esc(statusText(p)) + '</dd><dt>Registered</dt><dd>' + fmt(p.registeredAt) + '</dd></dl></section>';
    if (CLINICAL.indexOf(S.role) < 0) {
      return h + pick + demo + panel('Clinical record restricted', '<p>As <b>' + roleLabel() + '</b>, you can see demographics only. Notes, results and medicines are hidden.</p><button type="button" class="btn btn-danger" data-act="emr-request" data-v="' + p.mrn + '">Open clinical record</button>', 'danger');
    }
    return h + pick + banner(p) + (S.tier !== 'THIS' ? '<p class="note-tier">' + S.tier + ' keeps hybrid records: some information below is still on paper and is not shown.</p>' : '') + '<section class="card"><h2>Timeline</h2>' + timeline(p) + '</section>';
  };
  function timeline(p) {
    var ev = [];
    ev.push({ t: p.registeredAt, k: 'PMS', text: 'Registered' + (p.status === 'admitted' ? '; admitted to ' + p.ward : '') });
    S.notes.forEach(function (n) { if (n.mrn === p.mrn) ev.push({ t: n.at, k: 'CIS', text: 'Note by ' + n.by + ': ' + n.text }); });
    S.labs.forEach(function (l) {
      if (l.mrn !== p.mrn) return;
      var name = D.LAB_TESTS[l.test].name;
      if (!tierHas('lis')) { ev.push({ t: l.orderedAt, k: 'Paper', text: name + ' requested. Result on paper, not in the system.' }); return; }
      ev.push({ t: l.orderedAt, k: 'LIS', text: name + ' ordered' });
      if (l.status === 'released') ev.push({ t: l.releasedAt, k: 'LIS', text: name + ' released: ' + D.LAB_TESTS[l.test].fields.map(function (f) { return f.label + ' ' + l.values[f.k] + (f.unit ? ' ' + f.unit : ''); }).join(', ') });
    });
    if (tierHas('ris')) S.imaging.forEach(function (i) { if (i.mrn === p.mrn) ev.push({ t: i.at, k: 'RIS', text: i.type + (i.status === 'reported' ? ': ' + i.report : ' ordered') }); });
    S.orders.forEach(function (o) {
      if (o.mrn !== p.mrn) return;
      ev.push({ t: o.createdAt, k: o.source === 'back-entry' ? 'Paper' : 'CIS', text: (o.source === 'back-entry' ? 'Back-entered from downtime form: ' : 'Prescribed ') + orderText(o) });
      if (o.intervention) ev.push({ t: o.intervention.at, k: 'PhIS', text: 'Pharmacist intervention (' + o.intervention.reason + ') on ' + o.id + (o.intervention.note ? ': ' + o.intervention.note : '') });
      if (o.status === 'dispensed' && o.dispensedAt && o.source !== 'back-entry') ev.push({ t: o.dispensedAt, k: 'PhIS', text: 'Dispensed ' + orderText(o) });
    });
    S.mar.forEach(function (m) { if (m.mrn === p.mrn) ev.push({ t: m.at, k: 'NIS', text: 'Dose given: ' + orderText(order(m.orderId)) + ' by ' + m.by }); });
    ev.sort(function (a, b) { return a.t < b.t ? 1 : -1; });
    return '<ol class="tl">' + ev.map(function (e) { return '<li><span class="tl-k">' + e.k + '</span><div><div class="muted small">' + fmt(e.t) + '</div>' + esc(e.text) + '</div></li>'; }).join('') + '</ol>';
  }

  VIEWS.audit = function () {
    var h = head('Admin · Audit trail', 'Who accessed what, and when', 'Every view, order and change is logged against the user who made it.');
    var t = tabs('auditTab', [['trail', 'Audit trail'], ['staff', 'Staff directory']], ui.auditTab);
    if (ui.auditTab === 'staff') {
      return h + t + '<section class="card"><div class="tablewrap"><table><thead><tr><th>User ID</th><th>Name</th><th>Role</th><th>Assigned to</th></tr></thead><tbody>' +
        D.STAFF.map(function (s) { return '<tr><td><code>' + s.id + '</code></td><td>' + esc(s.name) + '</td><td>' + esc(s.role) + '</td><td>' + esc(s.unit) + '</td></tr>'; }).join('') +
        '<tr><td><code>student</code></td><td>' + esc(me()) + '</td><td>Student (all roles)</td><td>Simulation user</td></tr></tbody></table></div>' +
        '<p class="muted small">Patients: Puan Siti Aminah (BTM-000101) and Encik Tan (BTM-000103) are in medical wards 5 and 6. Encik Lim (BTM-000102) and Cik Nurul (BTM-000104) are outpatients.</p></section>';
    }
    var users = []; S.audit.forEach(function (a) { if (users.indexOf(a.user) < 0) users.push(a.user); });
    var rows = S.audit.filter(function (a) { return (!ui.auditMrn || a.mrn === ui.auditMrn) && (!ui.auditUser || a.user === ui.auditUser); }).slice().reverse();
    return h + t + '<section class="card"><div class="form grid3"><label>Patient<select data-change="audit-mrn">' + patientOptions(ui.auditMrn, 'All patients') + '</select></label>' +
      '<label>User<select data-change="audit-user"><option value="">All users</option>' + users.map(function (u) { return '<option value="' + u + '"' + (ui.auditUser === u ? ' selected' : '') + '>' + u + '</option>'; }).join('') + '</select></label>' +
      '<div class="muted small" style="align-self:end">Flagged: ' + S.flags.length + '</div></div>' +
      '<div class="tablewrap"><table><thead><tr><th>Time</th><th>User</th><th>Action</th><th>Patient</th><th>Detail</th><th></th></tr></thead><tbody>' +
      rows.map(function (a) {
        var f = S.flags.indexOf(a.id) >= 0;
        return '<tr class="' + (f ? 'flagged' : '') + '"><td>' + fmt(a.t) + '</td><td><code>' + esc(a.user) + '</code><br><span class="muted small">' + esc(a.role) + '</span></td><td>' + esc(a.action) + '</td><td>' + (a.mrn ? esc(pat(a.mrn) ? pat(a.mrn).name : a.mrn) : '') + '</td><td>' + esc(a.detail) + '</td>' +
          '<td><button type="button" class="btn btn-sm ' + (f ? 'btn-danger' : '') + '" data-act="flag" data-v="' + a.id + '" aria-pressed="' + f + '">' + (f ? 'Flagged' : 'Flag') + '</button></td></tr>';
      }).join('') + '</tbody></table></div></section>';
  };

  VIEWS.downtime = function () {
    var h = head('Downtime procedures', 'When the system is down', 'Keep treating patients on paper, then back-enter everything when the system returns.');
    var forms = S.paperForms.slice().reverse();
    var list = forms.length ? forms.map(function (f) {
      var pending = f.status === 'pending';
      var be = '';
      if (pending && !S.downtime) {
        be = '<div class="form grid3 be"><label>Patient in system<select id="be-pt-' + f.id + '">' + patientOptions('', 'Match the patient') + '</select></label>' +
          '<label>Drug<select id="be-drug-' + f.id + '">' + drugOptions('') + '</select></label>' +
          '<label>Dose (mg or puffs)<input id="be-dose-' + f.id + '" type="number" min="0" step="any"></label>' +
          '<label>Frequency<select id="be-freq-' + f.id + '">' + freqOptions('OD') + '</select></label>' +
          '<label>Days<input id="be-days-' + f.id + '" type="number" min="1" value="30"></label>' +
          '<div style="align-self:end"><button type="button" class="btn btn-primary" data-act="backentry" data-v="' + f.id + '">Back-enter</button></div></div>';
      }
      return '<article class="paper"><div class="row-between"><b>Downtime prescription ' + f.id + '</b>' + (pending ? chip(S.downtime ? 'On paper' : 'Needs back-entry', 'amber') : chip('Back-entered as ' + f.orderId, 'green')) + '</div>' +
        '<p>Patient: ' + esc(f.patient) + ' · MRN/IC: ' + esc(f.mrn) + '<br>Drug: ' + esc(f.drug) + ' · Dose and frequency: ' + esc(f.dose) + '<br>Prescriber: ' + esc(f.prescriber) + ' · Dispensed by: ' + esc(f.by) + ' · ' + fmt(f.at) + '</p>' + be + '</article>';
    }).join('') : '';
    if (S.downtime) {
      return h + panel('Downtime drill in progress', '<ol class="steps"><li>Use paper forms for every prescription and dispensing.</li><li>Identify patients with two identifiers; you cannot check allergies or results in the system.</li><li>Keep every form for back-entry.</li></ol>', 'warn') +
        '<section class="paper"><h2>Downtime prescription form</h2><div class="form grid3">' +
        '<label>Patient name<input id="dt-pt"></label><label>MRN or IC<input id="dt-mrn"></label><label>Drug and strength<input id="dt-drug"></label>' +
        '<label>Dose and frequency<input id="dt-dose"></label><label>Prescriber<input id="dt-presc"></label><label>Dispensed by<input id="dt-by" value="' + esc(me()) + '"></label></div>' +
        '<button type="button" class="btn btn-primary" data-act="paper-save">Save paper form</button></section>' + list;
    }
    return h + '<section class="card"><p>No downtime drill is running. Click <b>Start downtime drill</b> in the top bar to practise.</p>' +
      (S.paperForms.some(function (f) { return f.status === 'pending'; }) ? '<p><b>The system is back.</b> Back-enter each paper form below so the electronic record is complete.</p>' : '') + '</section>' + list;
  };

  /* ---------- drawer & modal ---------- */
  function drawer() {
    var list = ui.allCases ? D.CASES : myCases();
    return '<div class="scrim" data-act="drawer"></div><aside class="drawer" aria-label="Cases"><div class="dr-head"><h2>Cases</h2><button type="button" class="btn btn-ghost btn-sm" data-act="drawer">Close</button></div>' +
      '<p class="muted small">Ticks update automatically from what you do in the system. Showing: <b>' + (ui.allCases ? 'all cases' : esc(TRACKS[track()].label)) + '</b> · <button type="button" class="link" data-act="allcases">' + (ui.allCases ? 'Show my track only' : 'Show all cases') + '</button></p>' +
      list.map(function (c) {
        var i = D.CASES.indexOf(c);
        var items = caseItems(c.id), n = items.filter(function (x) { return x.done; }).length, done = n === items.length, open = ui.openCase === c.id;
        return '<section class="case' + (done ? ' done' : '') + '"><button type="button" class="case-h" data-act="case" data-v="' + c.id + '" aria-expanded="' + open + '"><span class="cnum">' + (done ? '✓' : i + 1) + '</span><span class="ct"><b>' + esc(c.title) + '</b><small>' + esc(TRACK_TAG[c.track]) + ' · ' + esc(c.modules) + ' · ' + n + '/' + items.length + ' done</small></span></button>' +
          (open ? '<div class="case-b"><p><b>Goal:</b> ' + esc(c.objective) + '</p><p class="muted small">Lecture slides: ' + esc(c.slides) + '</p>' +
            '<ol>' + c.steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>' +
            (c.hint ? '<details><summary>Hint</summary><p>' + esc(c.hint) + '</p></details>' : '') +
            (c.quiz ? quizBlock(c) : '') +
            '<ul class="checks">' + items.map(function (x) { return '<li class="' + (x.done ? 'ok' : '') + '"><span aria-hidden="true">' + (x.done ? '✓' : '○') + '</span> ' + esc(x.label) + (x.done ? '' : ' <span class="sr">(not done)</span>') + '</li>'; }).join('') + '</ul>' +
            '<label class="refl">Reflection: ' + esc(c.reflection) + '<textarea data-refl="' + c.id + '" rows="3">' + esc(S.reflections[c.id] || '') + '</textarea></label></div>' : '') + '</section>';
      }).join('') + '</aside>';
  }
  function quizBlock(c) {
    return '<div class="quiz">' + c.quiz.map(function (q, qi) {
      var a = S.quiz[q.id];
      return '<fieldset class="fs"><legend>' + (qi + 1) + '. ' + esc(q.q) + (a ? (a === q.answer ? ' <span class="ok-t">✓ Correct</span>' : ' <span class="bad-t">✗ Try again</span>') : '') + '</legend>' +
        q.options.map(function (o, oi) {
          return '<label class="check"><input type="radio" name="' + q.id + '" data-quiz="' + q.id + '" value="' + esc(o) + '"' + (a === o ? ' checked' : '') + '> ' + esc(o) + '</label>';
        }).join('') + '</fieldset>';
    }).join('') + '</div>';
  }

  function modal() {
    var m = ui.modal, body = '';
    if (m.type === 'intervene') {
      var o = order(m.orderId), checks = screen(o);
      var guess = checks.filter(function (c) { return c.sev === 'major'; })[0];
      var reasonMap = { Allergy: 'Allergy', Interaction: 'Drug interaction', Dose: 'Dose', 'Renal function': 'Renal function', Stock: 'Stock' };
      var def = guess ? reasonMap[guess.name] || 'Other' : 'Other';
      body = '<h2>Pharmacist intervention · ' + o.id + '</h2><p class="muted">' + esc(pat(o.mrn).name) + ' · ' + esc(orderText(o)) + '</p>' +
        '<label>Reason<select id="i-reason">' + ['Allergy', 'Drug interaction', 'Dose', 'Renal function', 'Stock', 'Other'].map(function (r) { return '<option' + (r === def ? ' selected' : '') + '>' + r + '</option>'; }).join('') + '</select></label>' +
        '<fieldset class="fs"><legend>Recommendation</legend><label class="check"><input type="radio" name="i-act" value="change" checked> Change the order (new drug, dose or frequency)</label>' +
        '<label class="check"><input type="radio" name="i-act" value="withhold"> Withhold (no replacement)</label></fieldset>' +
        '<div class="form grid2"><label class="span2">New drug<select id="i-drug">' + drugOptions(o.drugId) + '</select></label>' +
        '<label>Dose (mg or puffs)<input id="i-dose" type="number" min="0" step="any" value="' + o.dose + '"></label>' +
        '<label>Frequency<select id="i-freq">' + freqOptions(o.freq) + '</select></label><label>Days<input id="i-days" type="number" min="1" value="' + o.days + '"></label></div>' +
        '<p class="muted small">Drug, dose and frequency are ignored if you choose Withhold.</p>' +
        '<label>Note to prescriber<textarea id="i-note" rows="2" placeholder="e.g. Penicillin allergy. Suggest …"></textarea></label>' +
        '<div class="row"><button type="button" class="btn btn-primary" data-act="intervene-save">Send intervention</button><button type="button" class="btn btn-ghost" data-act="modal-close">Cancel</button></div>';
    } else if (m.type === 'admit') {
      body = '<h2>Admit ' + esc(pat(m.mrn).name) + '</h2><label>Ward<select id="a-ward">' + D.WARDS.map(function (w) { return '<option>' + w + '</option>'; }).join('') + '</select></label>' +
        '<div class="row"><button type="button" class="btn btn-primary" data-act="admit-save">Admit</button><button type="button" class="btn btn-ghost" data-act="modal-close">Cancel</button></div>';
    } else if (m.type === 'mar') {
      var mo = order(m.orderId);
      body = '<h2>Record dose</h2><p><b>' + esc(pat(mo.mrn).name) + '</b> · ' + esc(directions(mo)) + '</p>' +
        [['m1', 'Right patient: wristband name and MRN checked'], ['m2', 'Right medicine'], ['m3', 'Right dose'], ['m4', 'Right route'], ['m5', 'Right time']].map(function (x) { return '<label class="check"><input type="checkbox" id="' + x[0] + '"> ' + x[1] + '</label>'; }).join('') +
        '<label>Note (optional)<input id="m-note" placeholder="e.g. BP 150/90 before dose"></label>' +
        '<div class="row"><button type="button" class="btn btn-primary" data-act="mar-save">Record</button><button type="button" class="btn btn-ghost" data-act="modal-close">Cancel</button></div>';
    } else if (m.type === 'reset') {
      body = '<h2>Reset the simulation?</h2><p>This clears all patients, orders, cases and reflections in this browser. Your name is kept. It cannot be undone.</p>' +
        '<div class="row"><button type="button" class="btn btn-danger" data-act="reset-yes">Reset</button><button type="button" class="btn btn-ghost" data-act="modal-close">Cancel</button></div>';
    }
    return '<div class="modal-wrap"><div class="modal" role="dialog" aria-modal="true">' + body + '</div></div>';
  }

  /* ---------- actions ---------- */
  var ACT = {};
  ACT.start = function () {
    var name = val('w-name').trim();
    if (!name) { toast('Please enter your name.', 'bad'); return; }
    S.student = { name: name, matric: val('w-matric').trim(), group: val('w-group').trim(), track: val('w-track') || 'both', started: iso() };
    simlog('Started simulation (' + TRACKS[track()].label + ')');
  };
  ACT['test-submit'] = function (kind) {
    var answers = {}, missing = 0;
    D.TEST.forEach(function (q) {
      var el = document.querySelector('input[name="t-' + q.id + '"]:checked');
      if (el) answers[q.id] = parseInt(el.value, 10); else missing++;
    });
    if (missing) { toast('Answer all questions (' + missing + ' left). It is fine to guess.', 'bad'); return; }
    var score = D.TEST.filter(function (q) { return answers[q.id] === q.answer; }).length;
    var rec = { answers: answers, score: score, at: iso(), skipped: false };
    if (kind === 'pre') { S.pretest = rec; simlog('Pre-test submitted'); ui.drawer = true; ui.openCase = myCases()[0].id; }
    else { S.posttest = rec; simlog('Post-test submitted'); ui.test = 'post'; }
  };
  ACT['test-skip'] = function () { S.pretest = { skipped: true, at: iso(), answers: {}, score: null }; simlog('Pre-test skipped'); ui.drawer = true; };
  ACT.posttest = function () { ui.test = 'post'; ui.drawer = false; ui.glossary = false; };
  ACT['test-close'] = function () { ui.test = null; };
  ACT.glossary = function () { ui.glossary = !ui.glossary; ui.drawer = false; };
  ACT.allcases = function () { ui.allCases = !ui.allCases; };
  ACT['tx-add'] = function (rxId) {
    var mrn = val('tx-pt-' + rxId), d = drug(val('tx-drug-' + rxId)), dose = parseFloat(val('tx-dose-' + rxId)), freq = val('tx-freq-' + rxId), days = parseInt(val('tx-days-' + rxId), 10);
    if (!mrn) { toast('Select the patient first. Check two identifiers.', 'bad'); return; }
    if (!(dose > 0) || !(days > 0)) { toast('Enter the dose in mg and the number of days.', 'bad'); return; }
    var rx = S.paperRx.filter(function (x) { return x.id === rxId; })[0];
    var o = { id: nid('ORD'), mrn: mrn, drugId: d.id, dose: dose, freq: freq, days: days, qty: calcQty(d, dose, freq, days), indication: rx.note.replace(/^Dx:\s*/, ''),
      prescriber: rx.doctor + ' (' + rx.from + ')', createdAt: iso(), status: 'new', source: 'transcribed', paperRxId: rxId, enteredBy: me() + ' (' + roleLabel() + ')' };
    S.orders.push(o);
    log('TRANSCRIBE', mrn, rxId + ' → ' + orderText(o) + ' (' + o.id + ')');
    toast('Entered as ' + o.id + '. Open it from the queue to see the screening.', 'ok');
  };
  ACT['tx-cancel'] = function (v) { var o = order(v); o.status = 'cancelled'; log('CANCEL ENTRY', o.mrn, o.id + ' cancelled (transcription error)'); toast(o.id + ' cancelled.'); };
  ACT.refer = function (v) {
    var o = order(v);
    o.referred = { by: me() + ' (Pharmacy assistant)', at: iso(), note: val('ref-note').trim() };
    log('REFER', o.mrn, o.id + ' referred to pharmacist' + (o.referred.note ? ': ' + o.referred.note : ''));
    toast('Referred to the pharmacist.', 'ok');
  };
  ACT['indent-supply'] = function (v) {
    var ind = S.indents.filter(function (x) { return x.id === v; })[0], plan = [];
    for (var i = 0; i < ind.lines.length; i++) {
      var l = ind.lines[i], name = drug(l.drugId).short, raw = val('ind-q-' + v + '-' + i).trim(), note = val('ind-n-' + v + '-' + i).trim();
      var q = parseInt(raw, 10), usable = usableStock(inv(l.drugId));
      if (raw === '' || !(q >= 0)) { toast('Enter a quantity for ' + name + ' (0 if none).', 'bad'); return; }
      if (q > l.qty) { toast(name + ': do not supply more than requested (' + l.qty + ').', 'bad'); return; }
      if (q > usable) { toast(name + ': only ' + usable + ' usable. Expired or quarantined stock cannot be issued.', 'bad'); return; }
      if (q < l.qty && !note) { toast(name + ': record why you are supplying less than requested.', 'bad'); return; }
      plan.push({ l: l, q: q, note: note });
    }
    plan.forEach(function (p) { p.l.supplied = p.q; p.l.note = p.note; inv(p.l.drugId).stock -= p.q; });
    ind.status = 'supplied'; ind.suppliedAt = iso(); ind.suppliedBy = me() + ' (' + roleLabel() + ')';
    log('WARD SUPPLY', '', ind.id + ' to ' + ind.ward + ': ' + plan.map(function (p) { return drug(p.l.drugId).short + ' ' + p.q + '/' + p.l.qty; }).join(', '));
    toast('Ward request supplied. Stock updated.', 'ok');
  };
  ACT.nav = function (v) {
    ui.module = v; ui.orderId = null;
    var m = mod(v);
    var tierOk = !m.tiers || m.tiers.indexOf(S.tier) >= 0;
    if (!S.downtime && tierOk && m.roles && m.roles.indexOf(S.role) < 0) log('ACCESS DENIED', '', 'Tried to open ' + m.label);
  };
  ACT.tier = function (v) {
    S.tier = v;
    if (S.tiersVisited.indexOf(v) < 0) S.tiersVisited.push(v);
    simlog('Tier set to ' + v);
    toast(D.TIERS[v].name + ': ' + D.TIERS[v].modules);
  };
  ACT.downtime = function () {
    S.downtime = !S.downtime;
    if (S.downtime) { S.drill.started = true; simlog('Downtime drill started'); ui.module = 'downtime'; }
    else { if (S.drill.started) S.drill.ended = true; simlog('Downtime drill ended'); ui.module = 'downtime'; toast('System restored. Back-enter your paper forms.', 'ok'); }
  };
  ACT.drawer = function () { ui.drawer = !ui.drawer; ui.glossary = false; };
  ACT['case'] = function (v) { ui.openCase = ui.openCase === v ? null : v; };
  ACT.tab = function (v, el) { ui[el.dataset.k] = v; if (el.dataset.k === 'phisTab') ui.orderId = null; };
  ACT['modal-close'] = function () { ui.modal = null; };
  ACT.reset = function () { ui.modal = { type: 'reset' }; };
  ACT['reset-yes'] = function () {
    var st = S.student; S = fresh(st); ui.modal = null; ui.module = 'home'; ui.orderId = null; ui.cisMrn = null; ui.emrMrn = '';
    toast('Simulation reset.', 'ok');
  };

  ACT.register = function () {
    var name = val('r-name').trim(), age = parseInt(val('r-age'), 10), wt = parseFloat(val('r-weight'));
    if (!name || !(age >= 0) || !(wt > 0)) { toast('Enter the name, age and weight.', 'bad'); return; }
    var al = Object.keys(D.ALLERGY_LABEL).filter(function (k) { return isChecked('r-al-' + k); });
    var ward = val('r-status');
    var mrn = 'BTM-' + String(101 + S.patients.length).padStart(6, '0');
    S.patients.push({ mrn: mrn, name: name, ic: val('r-ic').trim() || '—', sex: val('r-sex'), age: age, weight: wt, allergies: al, allergyNote: '',
      conditions: val('r-cond').trim() ? val('r-cond').split(',').map(function (s) { return s.trim(); }) : [],
      status: ward ? 'admitted' : 'outpatient', ward: ward, address: '', registeredAt: iso(), seed: false });
    log('REGISTER', mrn, 'Registered ' + name + (ward ? '; admitted to ' + ward : ''));
    toast('Registered ' + name + ' as ' + mrn + '.', 'ok');
  };
  ACT.admit = function (v) { ui.modal = { type: 'admit', mrn: v }; };
  ACT['admit-save'] = function () {
    var p = pat(ui.modal.mrn); p.status = 'admitted'; p.ward = val('a-ward');
    log('ADMIT', p.mrn, 'Admitted to ' + p.ward); ui.modal = null; toast(p.name + ' admitted.', 'ok');
  };
  ACT.discharge = function (v) { var p = pat(v); p.status = 'outpatient'; p.ward = ''; log('DISCHARGE', v, 'Discharged'); toast(p.name + ' discharged.'); };

  ACT['cis-pt'] = function (v) { ui.cisMrn = v; ui.cisTab = 'summary'; ui.cpoeAlerts = null; log('VIEW RECORD', v, 'Opened chart in CIS'); };
  ACT.note = function () {
    var t = val('n-text').trim(); if (!t) { toast('Write the note first.', 'bad'); return; }
    S.notes.push({ id: nid('NOTE'), mrn: ui.cisMrn, at: iso(), by: me() + ' (Doctor)', text: t });
    log('NOTE', ui.cisMrn, 'Clinical note added'); toast('Note saved.', 'ok');
  };
  ACT['lab-order'] = function () {
    var test = val('lab-test');
    S.labs.push({ id: nid('LAB'), mrn: ui.cisMrn, test: test, status: tierHas('lis') ? 'ordered' : 'paper', values: null, orderedAt: iso() });
    log('ORDER', ui.cisMrn, D.LAB_TESTS[test].name + ' ordered');
    toast(tierHas('lis') ? D.LAB_TESTS[test].name + ' sent to the laboratory.' : 'BHIS: request printed. The result will come back on paper.', 'ok');
  };
  ACT['img-order'] = function () {
    var type = val('img-type');
    S.imaging.push({ id: nid('IMG'), mrn: ui.cisMrn, type: type, status: 'ordered', at: iso() });
    log('ORDER', ui.cisMrn, type + ' ordered'); addBill(ui.cisMrn, type, 40); toast(type + ' ordered.', 'ok');
  };
  ACT['rx-send'] = function (v) {
    var d = drug(val('rx-drug')), dose = parseFloat(val('rx-dose')), days = parseInt(val('rx-days'), 10), freq = val('rx-freq');
    var draft = { mrn: ui.cisMrn, drugId: d.id, dose: val('rx-dose'), freq: freq, days: val('rx-days'), indication: val('rx-ind') };
    if (!(dose > 0) || !(days > 0)) { ui.cpoe = draft; toast('Enter a dose and duration.', 'bad'); return; }
    var o = { id: '(new)', mrn: ui.cisMrn, drugId: d.id, dose: dose, freq: freq, days: days, qty: calcQty(d, dose, freq, days) };
    var majors = screen(o).filter(function (c) { return c.sev === 'major' && (c.name === 'Allergy' || c.name === 'Interaction' || c.name === 'Dose'); });
    if (majors.length && v !== 'force') { ui.cpoe = draft; ui.cpoeAlerts = majors; return; }
    o.id = nid('ORD'); o.indication = draft.indication; o.prescriber = me() + ' (Doctor)'; o.createdAt = iso(); o.status = 'new'; o.source = 'cpoe';
    if (majors.length) o.prescriberOverride = true;
    S.orders.push(o);
    log('ORDER', ui.cisMrn, orderText(o) + ' (' + o.id + ')' + (majors.length ? ' — prescriber override' : ''));
    ui.cpoe = null; ui.cpoeAlerts = null; ui.cisTab = 'orders';
    toast(tierHas('phis') ? 'Order ' + o.id + ' sent to the pharmacy.' : 'BHIS: prescription printed for the pharmacy.', 'ok');
  };

  ACT.mar = function (v) { ui.modal = { type: 'mar', orderId: v }; };
  ACT['mar-save'] = function () {
    if (!['m1', 'm2', 'm3', 'm4', 'm5'].every(isChecked)) { toast('Confirm all five rights before giving the dose.', 'bad'); return; }
    var o = order(ui.modal.orderId);
    S.mar.push({ id: nid('MAR'), orderId: o.id, mrn: o.mrn, at: iso(), by: me() + ' (Nurse)', note: val('m-note') });
    log('ADMINISTER', o.mrn, orderText(o)); ui.modal = null; toast('Dose recorded.', 'ok');
  };

  ACT['lab-run'] = function (v) {
    var l = S.labs.filter(function (x) { return x.id === v; })[0], vals = {};
    D.LAB_TESTS[l.test].fields.forEach(function (f) { vals[f.k] = f.normal; });
    l.values = vals; l.status = 'received'; l.receivedAt = iso(); toast('Analyser result received.');
  };
  ACT['lab-release'] = function (v) {
    var l = S.labs.filter(function (x) { return x.id === v; })[0];
    l.status = 'released'; l.releasedAt = iso(); l.releasedBy = me() + ' (Lab officer)';
    log('RELEASE RESULT', l.mrn, D.LAB_TESTS[l.test].name + ' (' + l.id + ')');
    addBill(l.mrn, D.LAB_TESTS[l.test].name, D.LAB_TESTS[l.test].price);
    toast('Result released to doctors and pharmacists.', 'ok');
  };

  ACT['open-order'] = function (v) { ui.module = 'phis'; ui.phisTab = 'queue'; ui.orderId = v; log('VIEW RECORD', order(v).mrn, 'Opened ' + v + ' for screening'); };
  ACT['close-order'] = function () { ui.orderId = null; };
  ACT.verify = function (v) {
    var o = order(v), c = screen(o), maj = count(c, 'major'), modr = count(c, 'moderate');
    var ov = val('ov').trim();
    if (maj && ov.length < 10) { toast('Major alert: intervene, or give an override reason of at least 10 characters.', 'bad'); return; }
    if (modr && !isChecked('ack')) { toast('Tick the box to confirm you reviewed the moderate alert.', 'bad'); return; }
    o.status = 'verified'; o.verifiedBy = me() + ' (Pharmacist)'; o.verifiedAt = iso(); o.majorsAtVerify = maj; o.override = maj ? ov : null;
    log('VERIFY', o.mrn, orderText(o) + ' (' + o.id + ')' + (maj ? ' — OVERRIDE: ' + ov : ''));
    toast('Verified. Now complete the dispensing checks.', 'ok');
  };
  ACT.intervene = function (v) { ui.modal = { type: 'intervene', orderId: v }; };
  ACT['intervene-save'] = function () {
    var o = order(ui.modal.orderId), reason = val('i-reason'), note = val('i-note').trim();
    var actEl = document.querySelector('input[name="i-act"]:checked'), act = actEl ? actEl.value : 'change', n = null;
    if (act === 'change') {
      var d = drug(val('i-drug')), dose = parseFloat(val('i-dose')), freq = val('i-freq'), days = parseInt(val('i-days'), 10);
      if (!(dose > 0) || !(days > 0)) { toast('Enter a dose and duration for the new order.', 'bad'); return; }
      if (d.id === o.drugId && dose === o.dose && freq === o.freq && days === o.days) { toast('The new order is the same as the old one. Change something, or choose Withhold.', 'bad'); return; }
      n = { id: nid('ORD'), mrn: o.mrn, drugId: d.id, dose: dose, freq: freq, days: days, qty: calcQty(d, dose, freq, days), indication: o.indication,
        prescriber: o.prescriber + ' (accepted pharmacist recommendation)', createdAt: iso(), status: 'new', source: 'intervention', replaces: o.id };
      S.orders.push(n);
    }
    o.status = 'rejected';
    o.intervention = { reason: reason, action: act, note: note, by: me() + ' (Pharmacist)', at: iso(), newOrderId: n ? n.id : null };
    log('INTERVENTION', o.mrn, o.id + ': ' + reason + ' — ' + (n ? 'changed to ' + orderText(n) + ' (' + n.id + ')' : 'withheld') + (note ? '. ' + note : ''));
    ui.modal = null; ui.orderId = n ? n.id : o.id;
    toast(n ? 'Intervention sent. Screen the new order ' + n.id + '.' : 'Order withheld.', 'ok');
  };
  ACT.dispense = function (v) {
    if (!['fb1', 'fb2', 'fb3', 'fb4', 'fb5', 'fbc'].every(isChecked)) { toast('Complete every item of the 5B checklist and counselling.', 'bad'); return; }
    var o = order(v), i = inv(o.drugId), d = drug(o.drugId);
    if (!i || i.quarantined || isExpired(i) || i.stock < o.qty) { toast('No usable stock to dispense. Check the inventory.', 'bad'); return; }
    i.stock -= o.qty;
    o.status = 'dispensed'; o.dispensedAt = iso(); o.dispensedBy = me() + ' (Pharmacist)'; o.fiveB = true;
    addBill(o.mrn, d.name + ' × ' + o.qty, Math.round(o.qty * d.price * 100) / 100 + 1);
    log('DISPENSE', o.mrn, orderText(o) + ' (' + o.id + ')');
    toast('Dispensed.' + (S.tier === 'THIS' ? ' Bill created automatically.' : ''), 'ok');
  };
  ACT.quarantine = function (v) {
    var i = inv(v); i.quarantinedQty = i.stock; i.stock = 0; i.quarantined = true; i.everQuarantined = true;
    log('QUARANTINE', '', drug(v).name + ' batch ' + i.batch + ' (' + i.quarantinedQty + ' units)'); toast('Batch quarantined.', 'ok');
  };
  ACT.reorder = function () {
    var made = 0;
    S.inventory.forEach(function (i) {
      if (isLow(i) && !S.pos.some(function (p) { return p.drugId === i.drugId && p.status === 'open'; })) {
        var qty = Math.max(i.reorder * 3 - i.stock, i.reorder);
        S.pos.push({ id: nid('PO'), drugId: i.drugId, qty: qty, status: 'open', createdAt: iso() }); made++;
      }
    });
    if (made) log('PURCHASE ORDER', '', made + ' purchase order(s) generated');
    toast(made ? 'Created ' + made + ' purchase order' + (made > 1 ? 's' : '') + '.' : 'No items need re-ordering.', made ? 'ok' : '');
  };
  ACT.receive = function (v) {
    var p = S.pos.filter(function (x) { return x.id === v; })[0], i = inv(p.drugId);
    if (i.quarantined || isExpired(i)) { i.batch = i.batch.slice(0, 3) + 'N' + String(S.seq).slice(-3); i.expiry = new Date(Date.now() + 730 * DAY).toISOString(); i.quarantined = false; i.stock = 0; }
    i.stock += p.qty; p.status = 'received'; p.receivedAt = iso();
    log('RECEIVE STOCK', '', drug(p.drugId).name + ' +' + p.qty + ' (' + p.id + ')'); toast('Stock received.', 'ok');
  };

  ACT.ris = function (v) { ui.risId = v; var i = S.imaging.filter(function (x) { return x.id === v; })[0]; log('VIEW IMAGE', i.mrn, i.type); };
  ACT['emr-request'] = function (v) { log('ACCESS DENIED', v, 'Tried to open clinical record as ' + roleLabel()); toast('Access denied. The attempt was logged in the audit trail.', 'bad'); };
  ACT.flag = function (v) {
    var k = S.flags.indexOf(v);
    if (k >= 0) S.flags.splice(k, 1); else S.flags.push(v);
  };

  ACT['paper-save'] = function () {
    var f = { id: 'DT-' + (S.paperForms.length + 1), patient: val('dt-pt').trim(), mrn: val('dt-mrn').trim(), drug: val('dt-drug').trim(), dose: val('dt-dose').trim(),
      prescriber: val('dt-presc').trim(), by: val('dt-by').trim(), at: iso(), duringDowntime: S.downtime, status: 'pending' };
    if (!f.patient || !f.drug) { toast('Write at least the patient name and drug.', 'bad'); return; }
    S.paperForms.push(f); simlog('Paper form ' + f.id + ' written'); toast('Paper form saved. Keep it for back-entry.', 'ok');
  };
  ACT.backentry = function (v) {
    var f = S.paperForms.filter(function (x) { return x.id === v; })[0];
    var mrn = val('be-pt-' + v), d = drug(val('be-drug-' + v)), dose = parseFloat(val('be-dose-' + v)), freq = val('be-freq-' + v), days = parseInt(val('be-days-' + v), 10);
    if (!mrn) { toast('Match the paper form to a patient in the system.', 'bad'); return; }
    if (!(dose > 0) || !(days > 0)) { toast('Enter the dose and days from the paper form.', 'bad'); return; }
    var o = { id: nid('ORD'), mrn: mrn, drugId: d.id, dose: dose, freq: freq, days: days, qty: calcQty(d, dose, freq, days), indication: 'Downtime supply',
      prescriber: f.prescriber || 'Downtime prescriber', createdAt: f.at, status: 'dispensed', dispensedAt: f.at, dispensedBy: f.by, source: 'back-entry', paperFormId: f.id };
    S.orders.push(o); f.status = 'entered'; f.orderId = o.id;
    log('BACK-ENTRY', mrn, f.id + ' entered as ' + orderText(o) + ' (' + o.id + ')'); toast('Back-entered as ' + o.id + '.', 'ok');
  };

  ACT.report = function () {
    var html = buildReport();
    try {
      var blob = new Blob([html], { type: 'text/html' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'HIS-sim-report-' + (S.student.matric || S.student.name).replace(/[^\w-]+/g, '_') + '.html';
      document.body.appendChild(a); a.click(); a.remove();
      toast('Report downloaded.', 'ok');
    } catch (e) { toast('Download blocked by the browser.', 'bad'); }
  };

  function buildReport() {
    var st = S.student, done = 0, mine = myCases();
    var cases = D.CASES.map(function (c, i) {
      var items = caseItems(c.id), ok = items.every(function (x) { return x.done; }), assigned = mine.indexOf(c) >= 0;
      if (ok && assigned) done++;
      if (!assigned && !items.some(function (x) { return x.done; }) && !S.reflections[c.id]) return '';
      return '<section><h2>' + (i + 1) + '. ' + esc(c.title) + (assigned ? '' : ' (optional)') + ' — ' + (ok ? '<span class="ok">Complete</span>' : '<span class="no">Incomplete</span>') + '</h2><ul>' +
        items.map(function (x) { return '<li>' + (x.done ? '✓' : '✗') + ' ' + esc(x.label) + '</li>'; }).join('') + '</ul>' +
        (c.quiz ? '<p><b>Quiz:</b> ' + c.quiz.map(function (q) { return esc(q.q) + ' → ' + esc(S.quiz[q.id] || '(no answer)') + (S.quiz[q.id] === q.answer ? ' ✓' : ' ✗'); }).join('<br>') + '</p>' : '') +
        '<p><b>Reflection:</b> <i>' + esc(c.reflection) + '</i></p><blockquote>' + esc(S.reflections[c.id] || '(not written)') + '</blockquote></section>';
    }).join('');
    var act = S.audit.filter(function (a) { return a.user === 'student'; }).map(function (a) {
      return '<tr><td>' + fmt(a.t) + '</td><td>' + esc(a.role) + '</td><td>' + esc(a.action) + '</td><td>' + esc(a.mrn) + '</td><td>' + esc(a.detail) + '</td></tr>';
    }).join('');
    return '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>HIS Simulator report — ' + esc(st.name) + '</title><style>' +
      'body{font-family:Arial,sans-serif;max-width:900px;margin:32px auto;padding:0 16px;color:#14213D;line-height:1.5}h1{margin-bottom:0}h2{font-size:18px;margin-top:28px;border-top:1px solid #ccd;padding-top:16px}' +
      '.ok{color:#0B6A69}.no{color:#9C4A15}blockquote{background:#F3F5F4;margin:0;padding:10px 14px;border-left:4px solid #0B6A69;white-space:pre-wrap}table{border-collapse:collapse;width:100%;font-size:13px}td,th{border:1px solid #ccd;padding:4px 6px;text-align:left;vertical-align:top}' +
      '</style></head><body><h1>HIS Simulator report</h1><p>PHD 111 · ICT for Pharmacy</p>' +
      '<table><tr><th>Name</th><td>' + esc(st.name) + '</td><th>Matric no.</th><td>' + esc(st.matric) + '</td></tr><tr><th>Group</th><td>' + esc(st.group) + '</td><th>Generated</th><td>' + fmt(Date.now()) + '</td></tr>' +
      '<tr><th>Track</th><td>' + esc(TRACKS[track()].label) + '</td><th>Started</th><td>' + fmt(st.started) + '</td></tr>' +
      '<tr><th>Assigned cases complete</th><td>' + done + ' of ' + mine.length + '</td><th>Pre-test → Post-test</th><td>' +
      (S.pretest ? (S.pretest.skipped ? 'skipped' : S.pretest.score + '/' + D.TEST.length) : '—') + ' → ' + (S.posttest ? S.posttest.score + '/' + D.TEST.length : 'not taken') + '</td></tr></table>' +
      (S.pretest && !S.pretest.skipped && S.posttest ? '<h2>Test answers</h2><table><thead><tr><th>Question</th><th>Pre</th><th>Post</th></tr></thead><tbody>' + D.TEST.map(function (q, i) {
        return '<tr><td>' + (i + 1) + '. ' + esc(q.q) + '</td><td>' + (S.pretest.answers[q.id] === q.answer ? '✓' : '✗') + '</td><td>' + (S.posttest.answers[q.id] === q.answer ? '✓' : '✗') + '</td></tr>';
      }).join('') + '</tbody></table>' : '') + cases +
      '<h2>Activity log</h2><table><thead><tr><th>Time</th><th>Role</th><th>Action</th><th>MRN</th><th>Detail</th></tr></thead><tbody>' + act + '</tbody></table></body></html>';
  }

  /* ---------- events ---------- */
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-act]');
    if (!t) return;
    var fn = ACT[t.dataset.act];
    if (!fn) return;
    skipRender = false;
    fn(t.dataset.v, t);
    if (skipRender) { skipRender = false; save(); return; }
    render();
  });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.dataset.quiz) { S.quiz[t.dataset.quiz] = t.value; render(); return; }
    var k = t.dataset.change;
    if (!k) return;
    if (k === 'role') {
      S.role = t.value; ui.orderId = null;
      var home = mod(ROLES[S.role].home);
      ui.module = (!home.tiers || home.tiers.indexOf(S.tier) >= 0) ? home.id : 'home';
      log('LOGIN', '', 'Logged in as ' + roleLabel());
    } else if (k === 'emr') {
      ui.emrMrn = t.value;
      if (t.value) log('VIEW RECORD', t.value, CLINICAL.indexOf(S.role) >= 0 ? 'Opened EMR' : 'Opened demographics');
    } else if (k === 'dice') ui.dice = t.value;
    else if (k === 'audit-mrn') ui.auditMrn = t.value;
    else if (k === 'audit-user') ui.auditUser = t.value;
    render();
  });
  document.addEventListener('input', function (e) {
    var id = e.target.dataset && e.target.dataset.refl;
    if (id) { S.reflections[id] = e.target.value; save(); return; }
    if (e.target.dataset && e.target.dataset.gloss) {
      var q = e.target.value.trim().toLowerCase(), shown = 0;
      document.querySelectorAll('.g-item').forEach(function (el) { var hit = !q || el.dataset.term.indexOf(q) >= 0; el.hidden = !hit; if (hit) shown++; });
      document.getElementById('gloss-none').hidden = shown > 0;
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && (ui.modal || ui.drawer || ui.glossary)) { if (ui.modal) ui.modal = null; else { ui.drawer = false; ui.glossary = false; } render(); }
  });

  S = load();
  render();
})();
