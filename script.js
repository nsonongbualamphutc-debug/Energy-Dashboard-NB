// ==================== CONFIG ====================
// !!! แทนที่ URL นี้ด้วย Deployment URL ของ Google Apps Script ของคุณ !!!
const API_URL = 'https://script.google.com/macros/s/AKfycbxjmwZROLai5-MXflxsEiCOa5of3-pvyPiTv0vEsq7TO8mTOZB2hDNZrdBJIedgSJTNLg/exec';

const THAI_MONTHS = ['ตุลาคม','พฤศจิกายน','ธันวาคม','มกราคม','กุมภาพันธ์','มีนาคม',
                     'เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน'];
const MONTH_SHORT = ['ต.ค.','พ.ย.','ธ.ค.','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.'];


// STATE
let mode = 'elec'; // 'elec' | 'oil'
let allData = { electricity: [], oil: [], agencies: [] };
let currentUser = null; // {code, isAdmin}
let charts = {};

// ==================== API (JSONP) ====================
function jsonp(params) {
  return new Promise((resolve, reject) => {
    const cbName = 'cb_' + Math.random().toString(36).substr(2, 9);
    const url = API_URL + '?' + new URLSearchParams({...params, callback: cbName}).toString();
    window[cbName] = (data) => {
      resolve(data);
      delete window[cbName];
      document.getElementById(cbName)?.remove();
    };
    const script = document.createElement('script');
    script.id = cbName;
    script.src = url;
    script.onerror = () => {
      reject(new Error('ไม่สามารถเชื่อมต่อ API'));
      delete window[cbName];
      script.remove();
    };
    document.head.appendChild(script);
    setTimeout(() => {
      if (window[cbName]) {
        reject(new Error('Timeout'));
        delete window[cbName];
        script.remove();
      }
    }, 30000);
  });
}

// ==================== LOAD DATA ====================
async function loadData(showLoader = true) {
  if (showLoader) toggleLoader(true, 'กำลังโหลดข้อมูล...');
  try {
    // ถ้า API_URL ยังไม่ตั้งค่า ให้ใช้ sample data
    if (API_URL.includes('YOUR_DEPLOYMENT_ID')) {
      allData = getSampleData();
      toast('⚠️ ใช้ข้อมูลตัวอย่าง (ยังไม่ได้ตั้งค่า API_URL)', 'error');
    } else {
      const res = await jsonp({ action: 'all' });
      if (res.success) {
        allData = normalizeData(res);
      } else {
        throw new Error(res.error || 'Unknown');
      }
    }
    
    populateFilters();
    renderAll();
    updateStatus('เชื่อมต่อแล้ว · ' + new Date().toLocaleTimeString('th-TH'));
  } catch(err) {
    console.error(err);
    toast('❌ ' + err.message, 'error');
    // Fallback to sample
    allData = getSampleData();
    populateFilters();
    renderAll();
    updateStatus('Offline (sample data)');
  } finally {
    if (showLoader) toggleLoader(false);
  }
}

function normalizeData(res) {
  // แปลง field names จาก backend ให้เป็น key ที่ JS ใช้
  const mapE = row => ({
    /*
    agency: row['หน่วยงาน'] || row['รายการ'] || '',
    year: Number(row['ปี'] || row['ไฟฟ้า'] || row['น้ำมัน'] || 0),
    month: String(row['เดือน'] || '').trim(),
    standard: Number(row['ไฟฟ้ามาตรฐาน'] || row['น้ำมันมาตรฐาน'] || 0),
    actual: Number(row['ไฟฟ้าที่ใช้จริง'] || row['น้ำมันที่ใช้จริง'] || 0),
    unit: row['หน่วย'] || ''
    */

    agency: row.agency || '', 
    year: Number(row.year || 0),
    month: String(row.month || '').trim(),
    standard: Number(row.standard || 0),
    actual: Number(row.actual || 0),
    unit: row.unit || ''
  });
  return {
    electricity: (res.electricity || []).map(mapE).filter(r => r.year),
    oil: (res.oil || []).map(mapE).filter(r => r.year),
    agencies: (res.agencies || []).map(a => ({
      code: a.code || '',
      name: (a.name || '').trim(),
      ministry: a.ministry || '',
      active: a.active === true || a.active === 'ใช้งาน'
    })).filter(a => a.name)

/*
      code: a.code || '', 
      name: (a.name || '').trim(),
      ministry: a.ministry || '',
      active: a.active === true || a.active === 'ใช้งาน' 
    })).filter(a => a.name)
    */
  };
}

// ==================== SAMPLE DATA ====================
/*
function getSampleData() {
  const elec = [];
  const oil = [];
  const baseE = {2567:[1920.55,1888.46,1866.35,1861.59,1915.03,1939.75,2005.31,1773.99,1765.85,1874.26,1932.38,1927.92],
                 2568:[1909.21,1878.35,1781.96,1794.49,1833.08,1931.14,1881.01,1984.70,1911.25,1909.38,2015.46,1907.86],
                 2569:[1898.61,1807.75,1774.91,1799.58,1831.73,1950.00,2000.00,1950.00,1900.00,1950.00,2000.00,1950.00]};
  const actE = {2567:[601,556,440,372,371,642,673,951,643,581,508,641],
                2568:[507,470,410,333,371,679,723,697,848,711,742,727],
                2569:[755,562,325,318,399,0,0,0,0,0,0,0]};
  const baseO = {2567:[341.11,341.11,341.91,341.11,341.11,341.11,341.11,311.17,311.17,331.13,341.11,341.11],
                 2568:[341.11,341.11,341.11,341.11,341.11,341.11,341.11,341.11,341.11,341.11,341.11,341.11],
                 2569:[341.11,341.11,341.11,341.11,341.11,341.11,341.11,341.11,341.11,341.11,341.11,341.11]};
  const actO = {2567:[25.75,0.95,22.43,56.05,0.95,0.95,0.95,54.89,40.04,0.95,48.17,22.69],
                2568:[0.95,34.01,0.95,47.33,107.69,0.95,57.98,29.21,57.98,73.03,72.67,132.91],
                2569:[74.40,60.27,60.27,52.94,62.24,0,0,0,0,0,0,0]};
  
  const agencies = [
    {code:'NBL001', name:'สำนักงานสถิติจังหวัดหนองบัวลำภู', ministry:'กระทรวงดิจิทัลฯ', active:true},
    {code:'NBL002', name:'สำนักงานจังหวัดหนองบัวลำภู', ministry:'กระทรวงมหาดไทย', active:true},
    {code:'NBL017', name:'สำนักงานสาธารณสุขจังหวัดหนองบัวลำภู', ministry:'กระทรวงสาธารณสุข', active:true},
    {code:'NBL018', name:'สำนักงานเกษตรจังหวัดหนองบัวลำภู', ministry:'กระทรวงเกษตรฯ', active:true},
    {code:'NBL024', name:'สำนักงานพลังงานจังหวัดหนองบัวลำภู', ministry:'กระทรวงพลังงาน', active:true}
  ];
  
  agencies.forEach((ag, idx) => {
    Object.keys(baseE).forEach(year => {
      THAI_MONTHS.forEach((month, mi) => {
        if (actE[year][mi] > 0) {
          const variance = 0.7 + (idx * 0.15);
          elec.push({
            agency: ag.name, year: +year, month,
            standard: Math.round(baseE[year][mi] * variance * 100)/100,
            actual: Math.round(actE[year][mi] * variance * 100)/100,
            unit: 'หน่วย'
          });
          oil.push({
            agency: ag.name, year: +year, month,
            standard: Math.round(baseO[year][mi] * variance * 100)/100,
            actual: Math.round(actO[year][mi] * variance * 100)/100,
            unit: 'ลิตร'
          });
        }
      });
    });
  });
  
  return { electricity: elec, oil: oil, agencies };
}
*/

// ==================== FILTERS ====================
function populateFilters() {
  const agencyEl = document.getElementById('agencyFilter');
  const fAgencyEl = document.getElementById('fAgency');
  const yearEl = document.getElementById('yearFilter');
  const fYearEl = document.getElementById('fYear');
  const monthEl = document.getElementById('monthFilter');
  const fMonthEl = document.getElementById('fMonth');
  
  // Agencies
  const agencies = (allData.agencies || []).filter(a => a.active).sort((a,b) => a.name.localeCompare(b.name,'th'));
  agencyEl.innerHTML = '<option value="__ALL__">ภาพรวมจังหวัด (ทั้งหมด)</option>' +
    agencies.map(a => `<option value="${escapeHtml(a.name)}">${escapeHtml(a.name)}</option>`).join('');
  fAgencyEl.innerHTML = agencies.map(a => `<option value="${escapeHtml(a.name)}">${escapeHtml(a.name)}</option>`).join('');
  
  // Years
  const allRecords = [...allData.electricity, ...allData.oil];
  const years = [...new Set(allRecords.map(r => r.year))].sort((a,b) => b-a);
  const currentYear = years[0] || 2569;
  yearEl.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
  yearEl.value = currentYear;
  fYearEl.innerHTML = [currentYear+1, currentYear, currentYear-1, currentYear-2]
    .map(y => `<option value="${y}">${y}</option>`).join('');
  fYearEl.value = currentYear;
  
  // Months
  monthEl.innerHTML = '<option value="__ALL__">ทั้งปี</option>' +
    THAI_MONTHS.map(m => `<option value="${m}">${m}</option>`).join('');
  fMonthEl.innerHTML = THAI_MONTHS.map(m => `<option value="${m}">${m}</option>`).join('');
  
  // Badges
  document.getElementById('elecBadge').textContent = allData.electricity.length + ' รายการ';
  document.getElementById('oilBadge').textContent = allData.oil.length + ' รายการ';
}

// ==================== MODE SWITCH ====================
function switchMode(m) {
  mode = m;
  document.body.classList.toggle('mode-oil', m === 'oil');
  document.querySelectorAll('.tab-card').forEach(el => {
    el.classList.toggle('active', el.dataset.mode === m);
  });
  document.getElementById('techoMode').textContent = m === 'elec' ? 'ELECTRICITY' : 'FUEL';
  document.querySelector('.logo-icon').textContent = m === 'elec' ? '⚡' : '⛽';
  renderAll();
}

// ==================== FILTERING DATA ====================
function getFilteredData() {
  const source = mode === 'elec' ? allData.electricity : allData.oil;
  const agency = document.getElementById('agencyFilter').value;
  const year = Number(document.getElementById('yearFilter').value);
  const month = document.getElementById('monthFilter').value;
  
  return source.filter(r => {
    if (agency !== '__ALL__' && r.agency !== agency) return false;
    if (month !== '__ALL__' && r.month !== month) return false;
    return true;
  });
}

// ==================== RENDER ====================
function renderAll() {
  const year = Number(document.getElementById('yearFilter').value);
  const month = document.getElementById('monthFilter').value;
  const agency = document.getElementById('agencyFilter').value;
  
  const all = getFilteredData();
  const thisYear = all.filter(r => r.year === year);
  const lastYear = all.filter(r => r.year === year - 1);
  
  const sumAct = thisYear.reduce((s,r)=>s+r.actual, 0);
  const sumStd = thisYear.reduce((s,r)=>s+r.standard, 0);
  const sumActLY = lastYear.reduce((s,r)=>s+r.actual, 0);
  
  const percent = sumStd > 0 ? (sumAct/sumStd)*100 : 0;
  const unit = mode === 'elec' ? 'หน่วย' : 'ลิตร';
  
  // Techometer
  document.getElementById('techoAgency').textContent = agency === '__ALL__' ? 'ภาพรวมจังหวัด' : agency;
  document.getElementById('gaugePercent').textContent = percent.toFixed(1);
  document.getElementById('techoStd').textContent = fmtNum(sumStd);
  document.getElementById('techoAct').textContent = fmtNum(sumAct);
  document.getElementById('techoSave').textContent = fmtNum(sumStd - sumAct);
  
  // Status
  const statusEl = document.getElementById('gaugeStatus');
  if (percent < 80) { statusEl.textContent = '✓ ประหยัดดี'; statusEl.style.background='rgba(0,230,118,0.15)'; statusEl.style.color='var(--success)'; }
  else if (percent < 100) { statusEl.textContent = '● ปกติ (ตามเป้า)'; statusEl.style.background='rgba(255,193,7,0.15)'; statusEl.style.color='var(--warning)'; }
  else if (percent < 120) { statusEl.textContent = '▲ เกินเป้าเล็กน้อย'; statusEl.style.background='rgba(255,152,0,0.15)'; statusEl.style.color='#ff9800'; }
  else { statusEl.textContent = '✕ เกินมาตรฐาน'; statusEl.style.background='rgba(255,23,68,0.15)'; statusEl.style.color='var(--danger)'; }
  
  drawGauge(percent);
  
  // KPI
  document.getElementById('kpiActual').innerHTML = fmtNum(sumAct) + `<span class="kpi-unit">${unit}</span>`;
  document.getElementById('kpiStd').innerHTML = fmtNum(sumStd) + `<span class="kpi-unit">${unit}</span>`;
  document.getElementById('kpiActualSub').textContent = `ปี ${year}${month !== '__ALL__' ? ' · ' + month : ''}`;
  
  // YoY trend
  const trendEl = document.getElementById('kpiActualTrend');
  if (sumActLY > 0) {
    const diff = ((sumAct - sumActLY)/sumActLY)*100;
    trendEl.className = 'kpi-trend ' + (diff > 0 ? 'up' : 'down');
    trendEl.textContent = (diff > 0 ? '▲ ' : '▼ ') + Math.abs(diff).toFixed(1) + '% vs ปี ' + (year-1);
  } else {
    trendEl.className = 'kpi-trend neutral';
    trendEl.textContent = 'ไม่มีข้อมูลปีก่อนเทียบ';
  }
  
  // Charts
  renderTrendChart(all, year);
  renderStdVsAct(thisYear);
  renderYoY(sumAct, sumActLY, year);
  renderAgencyChart(year);
  renderRecentTable(thisYear);
}

// ==================== GAUGE (Canvas) ====================
function drawGauge(percent) {
  const canvas = document.getElementById('gaugeCanvas');
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  const w = rect.width, h = rect.height;
  
  ctx.clearRect(0, 0, w, h);
  
  const cx = w/2;
  const cy = h * 0.75;
  const radius = Math.min(w, h*1.4) / 2 - 20;
  
  // เกณฑ์สี
  const startAngle = Math.PI;
  const endAngle = 2 * Math.PI;
  const isElec = mode === 'elec';
  
  // Background arc
  ctx.beginPath();
  ctx.arc(cx, cy, radius, startAngle, endAngle);
  ctx.lineWidth = 24;
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.stroke();
  
  // Segments (0-80 เขียว, 80-100 เหลือง, 100-120 ส้ม, 120+ แดง)
  const segments = [
    {from: 0, to: 80, color: '#00e676'},
    {from: 80, to: 100, color: '#ffc107'},
    {from: 100, to: 120, color: '#ff9800'},
    {from: 120, to: 150, color: '#ff1744'}
  ];
  const max = 150;
  segments.forEach(seg => {
    const a1 = startAngle + (seg.from/max) * Math.PI;
    const a2 = startAngle + (seg.to/max) * Math.PI;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, a1, a2);
    ctx.lineWidth = 24;
    ctx.strokeStyle = seg.color;
    ctx.globalAlpha = 0.4;
    ctx.stroke();
  });
  ctx.globalAlpha = 1;
  
  // Ticks
  for (let p = 0; p <= 150; p += 10) {
    const a = startAngle + (p/max) * Math.PI;
    const inner = radius - 32;
    const outer = radius - 22;
    const major = p % 30 === 0;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * (major ? inner-6 : inner), cy + Math.sin(a) * (major ? inner-6 : inner));
    ctx.lineTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
    ctx.strokeStyle = major ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.25)';
    ctx.lineWidth = major ? 2 : 1;
    ctx.stroke();
    
    if (major) {
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '11px Orbitron';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const tx = cx + Math.cos(a) * (inner - 18);
      const ty = cy + Math.sin(a) * (inner - 18);
      ctx.fillText(p, tx, ty);
      ctx.restore();
    }
  }
  
  // Value arc (glow)
  const valPercent = Math.min(percent, max);
  const valAngle = startAngle + (valPercent/max) * Math.PI;
  
  const grad = ctx.createLinearGradient(0, cy - radius, 0, cy + radius);
  if (isElec) {
    grad.addColorStop(0, '#00e5ff');
    grad.addColorStop(1, '#0099ff');
  } else {
    grad.addColorStop(0, '#ff8a00');
    grad.addColorStop(1, '#ff3d00');
  }
  
  ctx.beginPath();
  ctx.arc(cx, cy, radius, startAngle, valAngle);
  ctx.lineWidth = 16;
  ctx.strokeStyle = grad;
  ctx.lineCap = 'round';
  ctx.shadowColor = isElec ? '#00e5ff' : '#ff8a00';
  ctx.shadowBlur = 20;
  ctx.stroke();
  ctx.shadowBlur = 0;
  
  // Needle
  const needleLen = radius - 10;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(valAngle);
  ctx.beginPath();
  ctx.moveTo(-6, 0);
  ctx.lineTo(needleLen, -2);
  ctx.lineTo(needleLen + 8, 0);
  ctx.lineTo(needleLen, 2);
  ctx.closePath();
  ctx.fillStyle = isElec ? '#00e5ff' : '#ff8a00';
  ctx.shadowColor = isElec ? '#00e5ff' : '#ff8a00';
  ctx.shadowBlur = 15;
  ctx.fill();
  ctx.restore();
  
  // Hub
  ctx.beginPath();
  ctx.arc(cx, cy, 14, 0, 2*Math.PI);
  ctx.fillStyle = '#0a0e1a';
  ctx.strokeStyle = isElec ? '#00e5ff' : '#ff8a00';
  ctx.lineWidth = 3;
  ctx.fill();
  ctx.stroke();
}

// ==================== CHARTS ====================
function getAccent() {
  return mode === 'elec' 
    ? { primary: '#00e5ff', secondary: '#0099ff', glow: 'rgba(0,229,255,0.3)' }
    : { primary: '#ff8a00', secondary: '#ff3d00', glow: 'rgba(255,138,0,0.3)' };
}

function monthlyAggregate(records, year) {
  const map = {};
  THAI_MONTHS.forEach(m => map[m] = {actual: 0, standard: 0, count: 0});
  records.filter(r => r.year === year).forEach(r => {
    if (map[r.month]) {
      map[r.month].actual += r.actual;
      map[r.month].standard += r.standard;
      map[r.month].count++;
    }
  });
  return THAI_MONTHS.map(m => map[m]);
}

function renderTrendChart(all, year) {
  const c = getAccent();
  const years = [year-2, year-1, year];
  const colors = ['#5a6580', '#ffc107', c.primary];
  
  const datasets = years.map((y, i) => {
    const monthly = monthlyAggregate(all, y);
    return {
      label: 'ปี ' + y,
      data: monthly.map(m => m.count > 0 ? m.actual : null),
      borderColor: colors[i],
      backgroundColor: i === 2 ? c.glow : 'transparent',
      borderWidth: i === 2 ? 3 : 2,
      tension: 0.4,
      fill: i === 2,
      pointRadius: 4,
      pointBackgroundColor: colors[i],
      pointBorderColor: '#0a0e1a',
      pointBorderWidth: 2,
      spanGaps: true
    };
  });
  
  charts.trend?.destroy();
  charts.trend = new Chart(document.getElementById('trendChart'), {
    type: 'line',
    data: { labels: MONTH_SHORT, datasets },
    options: commonOpts({ legend: true })
  });
}

function renderStdVsAct(records) {
  const monthly = monthlyAggregate(records, Number(document.getElementById('yearFilter').value));
  const c = getAccent();
  
  charts.stdVsAct?.destroy();
  charts.stdVsAct = new Chart(document.getElementById('stdVsActChart'), {
    type: 'bar',
    data: {
      labels: MONTH_SHORT,
      datasets: [
        {
          label: 'มาตรฐาน',
          data: monthly.map(m => m.standard),
          backgroundColor: 'rgba(255,255,255,0.12)',
          borderColor: 'rgba(255,255,255,0.3)',
          borderWidth: 1,
          borderRadius: 6
        },
        {
          label: 'ใช้จริง',
          data: monthly.map(m => m.count > 0 ? m.actual : null),
          backgroundColor: c.primary,
          borderRadius: 6
        }
      ]
    },
    options: commonOpts({ legend: true })
  });
}

function renderYoY(cur, prev, year) {
  const c = getAccent();
  charts.yoy?.destroy();
  charts.yoy = new Chart(document.getElementById('yoyChart'), {
    type: 'doughnut',
    data: {
      labels: ['ปี ' + (year-1), 'ปี ' + year],
      datasets: [{
        data: [prev, cur],
        backgroundColor: ['rgba(255,255,255,0.15)', c.primary],
        borderColor: '#0a0e1a',
        borderWidth: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: { position: 'bottom', labels: { color: '#8b95b0', font: { family: 'Prompt', size: 11 }, padding: 12, usePointStyle: true } },
        tooltip: { callbacks: { label: (ctx) => ctx.label + ': ' + fmtNum(ctx.parsed) } }
      }
    }
  });
}

function renderAgencyChart(year) {
  const source = mode === 'elec' ? allData.electricity : allData.oil;
  const agg = {};
  source.filter(r => r.year === year).forEach(r => {
    agg[r.agency] = (agg[r.agency] || 0) + r.actual;
  });
  const sorted = Object.entries(agg).sort((a,b) => b[1]-a[1]).slice(0, 10);
  const c = getAccent();
  
  charts.agency?.destroy();
  charts.agency = new Chart(document.getElementById('agencyChart'), {
    type: 'bar',
    data: {
      labels: sorted.map(([n]) => truncate(n, 22)),
      datasets: [{
        label: mode === 'elec' ? 'หน่วย' : 'ลิตร',
        data: sorted.map(([,v]) => v),
        backgroundColor: c.primary,
        borderRadius: 6
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => fmtNum(ctx.parsed.x) } }
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8b95b0' } },
        y: { grid: { display: false }, ticks: { color: '#8b95b0', font: { size: 10 } } }
      }
    }
  });
}

function renderRecentTable(records) {
  const sorted = [...records].sort((a,b) => THAI_MONTHS.indexOf(b.month) - THAI_MONTHS.indexOf(a.month));
  const tbody = document.getElementById('recentTable');
  tbody.innerHTML = sorted.slice(0, 10).map(r => {
    const pct = r.standard > 0 ? (r.actual/r.standard*100) : 0;
    const badgeClass = pct < 80 ? 'ok' : (pct < 100 ? 'warn' : 'bad');
    return `<tr>
      <td>${r.month}</td>
      <td>${fmtNum(r.actual)}</td>
      <td><span class="badge ${badgeClass}">${pct.toFixed(1)}%</span></td>
    </tr>`;
  }).join('') || '<tr><td colspan="3" style="text-align:center;color:var(--text-muted);padding:20px;">ไม่มีข้อมูล</td></tr>';
}

function commonOpts({ legend = false } = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        display: legend,
        position: 'top',
        align: 'end',
        labels: { color: '#8b95b0', font: { family: 'Prompt', size: 11 }, padding: 12, usePointStyle: true, boxWidth: 8 }
      },
      tooltip: {
        backgroundColor: 'rgba(10,14,26,0.95)',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        titleColor: '#f0f4ff',
        bodyColor: '#8b95b0',
        padding: 10,
        callbacks: {
          label: (ctx) => ctx.dataset.label + ': ' + (ctx.parsed.y != null ? fmtNum(ctx.parsed.y) : '-')
        }
      }
    },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8b95b0' } },
      y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8b95b0', callback: (v) => fmtNum(v) } }
    }
  };
}

// ==================== FORM ====================
function openForm() {
  document.getElementById('formModal').classList.add('active');
  if (currentUser) {
    showFormStep();
  } else {
    document.getElementById('loginStep').style.display = 'block';
    document.getElementById('formStep').style.display = 'none';
  }
}

function closeForm() {
  document.getElementById('formModal').classList.remove('active');
}
/*
async function doLogin() {
  const code = document.getElementById('loginCode').value.trim();
  const pin = document.getElementById('loginPin').value.trim();
  if (!code || !pin) { toast('กรอกรหัสหน่วยงานและ PIN', 'error'); return; }
  
  if (API_URL.includes('YOUR_DEPLOYMENT_ID')) {
    // Demo mode
    currentUser = { code, isAdmin: code.toUpperCase() === 'ADMIN' };
    toast('✓ เข้าสู่ระบบ (demo mode)', 'success');
    showFormStep();
    return;
  }
  
  toggleLoader(true, 'กำลังตรวจสอบ...');
  try {
    const res = await jsonp({ action: 'verify', code, pin });
    if (res.success) {
      currentUser = { code: res.code, isAdmin: res.isAdmin };
      toast('✓ เข้าสู่ระบบสำเร็จ', 'success');
      showFormStep();
    } else {
      toast('❌ ' + (res.error || 'PIN ไม่ถูกต้อง'), 'error');
    }
  } catch(e) {
    toast('❌ ' + e.message, 'error');
  } finally {
    toggleLoader(false);
  }
}
  */
async function doLogin() {
  const code = document.getElementById('loginCode').value.trim().toUpperCase();
  const pin = document.getElementById('loginPin').value.trim();

  if (!code || !pin) { 
    toast('กรอกรหัสหน่วยงานและ PIN', 'error'); 
    return; 
  }

  const agencyFound = allData.agencies.find(a => a.code === code);
  
  if (!agencyFound && code !== 'ADMIN') {
    toast('❌ ไม่พบรหัสหน่วยงานนี้ในระบบ (กรุณาใช้ NBLxxx)', 'error');
    return;
  }

  if (API_URL.includes('YOUR_DEPLOYMENT_ID')) {
    currentUser = { 
      code: code, 
      isAdmin: code === 'ADMIN' 
    };
    toast('✓ เข้าสู่ระบบ (demo mode)', 'success');
    showFormStep();
    return;
  }
  
  toggleLoader(true, 'กำลังตรวจสอบ...');
  try {
    const res = await jsonp({ action: 'verify', code, pin });
    if (res.success) {
      currentUser = { code: res.code, isAdmin: res.isAdmin };
      toast('✓ เข้าสู่ระบบสำเร็จ', 'success');
      showFormStep();
    } else {
      toast('❌ ' + (res.error || 'PIN ไม่ถูกต้อง'), 'error');
    }
  } catch(e) {
    toast('❌ ' + e.message, 'error');
  } finally {
    toggleLoader(false);
  }
}

function backToLogin() {
  document.getElementById('formStep').style.display = 'none';
  document.getElementById('loginStep').style.display = 'block';

  document.getElementById('loginCode').value = '';
  document.getElementById('loginPin').value = '';
  currentUser = null;
}


function showFormStep() {
  document.getElementById('loginStep').style.display = 'none';
  document.getElementById('formStep').style.display = 'block';
  
  // ถ้าไม่ใช่ admin lock เลือกหน่วยงานไว้
  const fAgency = document.getElementById('fAgency');
  if (currentUser && !currentUser.isAdmin) {
    const agency = allData.agencies.find(a => a.code === currentUser.code);
    if (agency) {
      fAgency.value = agency.name;
      fAgency.disabled = true;
    }
  } else {
    fAgency.disabled = false;
  }
  
  // Default: ปีและเดือนปัจจุบัน
  document.getElementById('fType').value = mode;
}
/*
function showFormStep() {
  document.getElementById('loginStep').style.display = 'none';
  document.getElementById('formStep').style.display = 'block';
  
  const fAgency = document.getElementById('fAgency');
  
  if (currentUser) {
    const agency = allData.agencies.find(a => a.code === currentUser.code);
    if (agency) {
      fAgency.value = agency.name;
    }
  }
  fAgency.disabled = false;
  
  document.getElementById('fType').value = mode;
}
  */

async function saveRecord() {
  const stdVal = document.getElementById('fStd').value;
  const actVal = document.getElementById('fAct').value;

  if (stdVal === "" || actVal === "") {
    toast('⚠️ กรุณากรอก "ค่ามาตรฐาน" และ "ใช้จริง"', 'error');
    return;
  }

  const payload = {
    type: document.getElementById('fType').value,
    agency: document.getElementById('fAgency').value,
    year: Number(document.getElementById('fYear').value),
    month: document.getElementById('fMonth').value,
    standard: Number(stdVal),
    actual: Number(actVal),
    unit: document.getElementById('fType').value === 'elec' ? 'หน่วย' : 'ลิตร',
    user: currentUser?.code || ''
  };
  
  if (
    !payload.agency || 
    !payload.month || 
    fStd === '' ||
    fAct === '' ||
    isNaN(payload.standard) || 
    isNaN(payload.actual)
  ) {
    toast('กรอกข้อมูลให้ครบ', 'error');
    return;
  }

  if (payload.standard < 0 || payload.actual < 0) {
    toast('❌ ค่ามาตรฐานและค่าที่ใช้จริงต้องไม่ติดลบ', 'error');
    return;
  }
  
  toggleLoader(true, 'กำลังบันทึก...');
  try {
    if (API_URL.includes('YOUR_DEPLOYMENT_ID')) {
      toast('⚠️ Demo mode - ไม่ได้บันทึกจริง', 'error');
    } else {
      const res = await jsonp({ action: 'save', payload: JSON.stringify(payload) });
      if (res.success) {
        toast('✓ ' + res.message, 'success');
        closeForm();
        await loadData(false);
      } else {
        toast('❌ ' + (res.error || 'บันทึกไม่สำเร็จ'), 'error');
      }
    }
  } catch(e) {
    toast('❌ ' + e.message, 'error');
  } finally {
    toggleLoader(false);
  }
}

async function deleteRecord() {
  if (!confirm('ยืนยันลบข้อมูลนี้?')) return;
  const payload = {
    type: document.getElementById('fType').value,
    agency: document.getElementById('fAgency').value,
    year: Number(document.getElementById('fYear').value),
    month: document.getElementById('fMonth').value,
    user: currentUser?.code || ''
  };
  toggleLoader(true, 'กำลังลบ...');
  try {
    const res = await jsonp({ action: 'delete', payload: JSON.stringify(payload) });
    if (res.success) {
      toast('✓ ' + res.message, 'success');
      closeForm();
      await loadData(false);
    } else {
      toast('❌ ' + (res.error || 'ลบไม่สำเร็จ'), 'error');
    }
  } catch(e) {
    toast('❌ ' + e.message, 'error');
  } finally {
    toggleLoader(false);
  }
}

// ==================== REPORT ====================
function openReport() {
  const year = Number(document.getElementById('yearFilter').value);
  const source = mode === 'elec' ? allData.electricity : allData.oil;
  const byAgency = {};
  source.filter(r => r.year === year).forEach(r => {
    if (!byAgency[r.agency]) byAgency[r.agency] = { actual: 0, standard: 0 };
    byAgency[r.agency].actual += r.actual;
    byAgency[r.agency].standard += r.standard;
  });
  
  let report = `รายงานสถานการณ์${mode === 'elec' ? 'ไฟฟ้า' : 'น้ำมัน'} ปี ${year}\n`;
  report += '='.repeat(60) + '\n\n';
  Object.entries(byAgency).sort((a,b) => b[1].actual - a[1].actual).forEach(([name, v], i) => {
    const pct = v.standard > 0 ? (v.actual/v.standard*100).toFixed(1) : '0';
    report += `${(i+1).toString().padStart(2)}. ${name}\n`;
    report += `    ใช้จริง: ${fmtNum(v.actual)} | มาตรฐาน: ${fmtNum(v.standard)} | ${pct}%\n\n`;
  });
  
  const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `รายงาน_${mode === 'elec' ? 'ไฟฟ้า' : 'น้ำมัน'}_${year}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  toast('✓ ดาวน์โหลดรายงาน', 'success');
}

// ==================== UTILS ====================
function fmtNum(n) {
  if (n == null || isNaN(n)) return '-';
  return Number(n).toLocaleString('th-TH', { maximumFractionDigits: 2 });
}

function truncate(s, n) {
  return s.length > n ? s.substring(0, n-1) + '…' : s;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show ' + type;
  setTimeout(() => el.classList.remove('show'), 3500);
}

function toggleLoader(show, text = '') {
  const el = document.getElementById('loader');
  if (text) document.getElementById('loaderText').textContent = text;
  el.classList.toggle('show', show);
}

function updateStatus(text) {
  document.getElementById('statusText').textContent = text;
}

// ==================== INIT ====================
window.addEventListener('resize', () => {
  const year = Number(document.getElementById('yearFilter').value);
  const all = getFilteredData();
  const thisYear = all.filter(r => r.year === year);
  const sumAct = thisYear.reduce((s,r)=>s+r.actual, 0);
  const sumStd = thisYear.reduce((s,r)=>s+r.standard, 0);
  drawGauge(sumStd > 0 ? (sumAct/sumStd)*100 : 0);
});

loadData();

// Auto-refresh ทุก 5 นาที
setInterval(() => loadData(false), 5 * 60 * 1000);