import http from 'http';

function httpRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        const cookies = res.headers['set-cookie'];
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch {
          parsed = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          cookies,
          data: parsed,
        });
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function run() {
  console.log('====================================================');
  console.log('   PENGUJIAN & VERIFIKASI FITUR AI SAWIT ECOSYSTEM   ');
  console.log('====================================================\n');

  // 1. Health Check Meta AI Ecosystem
  console.log('--- 1. UJI STATUS HEALTH META AI ECOSYSTEM (/api/meta/health) ---');
  try {
    const health = await httpRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/meta/health',
      method: 'GET',
    });
    console.log('Status HTTP:', health.status);
    console.log('Hasil:', JSON.stringify(health.data, null, 2));
  } catch (err) {
    console.error('Gagal memanggil /api/meta/health:', err.message);
  }

  // 2. Login untuk mendapatkan Session Cookie Tenant
  console.log('\n--- 2. AUTENTIKASI DEMO TENANT (/api/auth/login) ---');
  let sessionCookie = '';
  try {
    const formData = 'email=owner%40sawitlestari.co.id&password=owner123';
    const loginRes = await httpRequest(
      {
        hostname: 'localhost',
        port: 3000,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(formData),
        },
      },
      formData
    );
    console.log('Status HTTP Login:', loginRes.status);
    if (loginRes.cookies && loginRes.cookies.length > 0) {
      sessionCookie = loginRes.cookies[0].split(';')[0];
      console.log('Session Cookie didapatkan:', sessionCookie.substring(0, 30) + '...');
    } else {
      console.log('Tidak ada set-cookie di response login. Headers:', loginRes.headers);
    }
  } catch (err) {
    console.error('Gagal login:', err.message);
  }

  // 3. Uji Diagnosa AI Agronomi (Meta Llama Vision + SAM 3.1)
  console.log('\n--- 3. UJI DIAGNOSA AGRONOMI AI (/api/agronomy/diagnose) ---');
  try {
    const payload = JSON.stringify({
      blockCode: 'A1',
      symptoms: 'Daun menguning pada pelepah bawah bercak oranye defisiensi kalium',
      targetSku: 'FERT-KCL-25',
      dosageKgPerHa: 150,
      reason: 'Rekomendasi pemupukan kalium untuk pemulihan klorosis',
    });
    const diag = await httpRequest(
      {
        hostname: 'localhost',
        port: 3000,
        path: '/api/agronomy/diagnose',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          ...(sessionCookie ? { Cookie: sessionCookie } : {}),
        },
      },
      payload
    );
    console.log('Status HTTP:', diag.status);
    console.log('Hasil Diagnosa AI:', JSON.stringify(diag.data, null, 2));
  } catch (err) {
    console.error('Gagal memanggil /api/agronomy/diagnose:', err.message);
  }

  // 4. Uji Multi-Stage AI Pipeline (ASR + PDP Guard + Llama Reasoning)
  console.log('\n--- 4. UJI PIPELINE AGEN AI (/api/agent/pipeline) ---');
  try {
    const payload = JSON.stringify({
      text: 'Lapor panen Blok A1 4800 Kg hadir 6 orang selesai, beli pupuk Pak Joko 720 ribu per sak',
      channel: 'WEB',
      supplierName: 'Pak Joko',
      commodityPricePerKg: 3200,
      stockVolumeKg: 4800,
    });
    const pipe = await httpRequest(
      {
        hostname: 'localhost',
        port: 3000,
        path: '/api/agent/pipeline',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          ...(sessionCookie ? { Cookie: sessionCookie } : {}),
        },
      },
      payload
    );
    console.log('Status HTTP:', pipe.status);
    console.log('Hasil Pipeline AI:', JSON.stringify(pipe.data, null, 2));
  } catch (err) {
    console.error('Gagal memanggil /api/agent/pipeline:', err.message);
  }

  // 5. Uji Impact Benchmarks
  console.log('\n--- 5. UJI IMPACT BENCHMARKS (/api/impact/benchmarks) ---');
  try {
    const bench = await httpRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/impact/benchmarks',
      method: 'GET',
    });
    console.log('Status HTTP:', bench.status);
    console.log('Hasil Benchmarks:', JSON.stringify(bench.data, null, 2));
  } catch (err) {
    console.error('Gagal memanggil /api/impact/benchmarks:', err.message);
  }

  console.log('\n====================================================');
  console.log('               VERIFIKASI SELESAI                   ');
  console.log('====================================================');
}

run();
