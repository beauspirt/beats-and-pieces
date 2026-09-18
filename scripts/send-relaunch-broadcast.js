const fs = require('fs');
const path = require('path');
const { Resend } = require('resend');

// Load environment variables from .env.local if present
try {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...rest] = trimmed.split('=');
        const val = rest.join('=').trim().replace(/^["']|["']$/g, '');
        process.env[key.trim()] = val;
      }
    });
  }
} catch (e) {
  console.log('Notice: Could not parse .env.local, checking process.env');
}

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Beats & Pieces <noreply@beatsandpieces.ro>';

// Import or require HTML template generator
const { generateRelaunchHtml } = require('../src/lib/email/templates/relaunchTemplate');

// Simple CSV parser
function parseCsv(content) {
  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
  const emailIdx = headers.findIndex(h => h.toLowerCase() === 'email');
  const nameIdx = headers.findIndex(h => h.toLowerCase() === 'name');
  const tagIdx = headers.findIndex(h => h.toLowerCase().includes('tag'));

  const users = [];
  for (let i = 1; i < lines.length; i++) {
    // Regex for CSV columns with quotes
    const cols = [];
    let current = '';
    let inQuotes = false;
    for (let c = 0; c < lines[i].length; c++) {
      const char = lines[i][c];
      if (char === '"' && lines[i][c + 1] === '"') {
        current += '"';
        c++;
      } else if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        cols.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    cols.push(current);

    const email = (cols[emailIdx] || '').trim().toLowerCase();
    const name = (cols[nameIdx] || cols[tagIdx] || '').trim();
    if (email && email.includes('@')) {
      users.push({ email, name });
    }
  }
  return users;
}

async function main() {
  const args = process.argv.slice(2);
  const isTest = args.includes('--test');
  const isDryRun = args.includes('--dry-run');
  const isSend = args.includes('--send');
  const testEmailIndex = args.indexOf('--test');
  const testEmail = testEmailIndex !== -1 ? args[testEmailIndex + 1] : null;

  console.log('====================================================');
  console.log('🔊 BEATS & PIECES - RELAUNCH BROADCAST SENDER');
  console.log('====================================================\n');

  if (!RESEND_API_KEY && !isDryRun) {
    console.error('❌ ERROR: RESEND_API_KEY is not set in .env.local!');
    console.log('\nPlease add your Resend API key to .env.local:');
    console.log('RESEND_API_KEY=re_123456789...');
    console.log('RESEND_FROM_EMAIL=Beats & Pieces <noreply@beatsandpieces.ro>\n');
    process.exit(1);
  }

  const csvPath = path.join(__dirname, '..', 'Old Database', 'legacy_users_emails.csv');
  if (!fs.existsSync(csvPath)) {
    console.error('❌ ERROR: legacy_users_emails.csv not found at ' + csvPath);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const users = parseCsv(csvContent);
  console.log(`✅ Successfully loaded ${users.length} unique email records from CSV.\n`);

  // MODE 1: DRY RUN
  if (isDryRun || (!isTest && !isSend)) {
    console.log('🔎 MODE: [DRY-RUN PREVIEW] (No emails will be sent)\n');
    console.log('First 5 recipients preview:');
    users.slice(0, 5).forEach((u, i) => {
      console.log(`  [${i + 1}] Name: "${u.name || 'Beatmaker'}" -> Email: ${u.email}`);
    });
    console.log(`\n...and ${users.length - 5} more records.`);
    console.log('\n----------------------------------------------------');
    console.log('👉 To send 1 test email to your inbox, run:');
    console.log('   node scripts/send-relaunch-broadcast.js --test your.email@gmail.com\n');
    console.log('👉 To broadcast to all ' + users.length + ' users, run:');
    console.log('   node scripts/send-relaunch-broadcast.js --send');
    console.log('----------------------------------------------------\n');
    return;
  }

  const resend = new Resend(RESEND_API_KEY);

  // MODE 2: TEST EMAIL
  if (isTest) {
    if (!testEmail || !testEmail.includes('@')) {
      console.error('❌ Please specify a valid email: --test yourname@gmail.com');
      process.exit(1);
    }
    console.log(`📤 Sending TEST email to: ${testEmail} from ${FROM_EMAIL}...`);
    const html = generateRelaunchHtml({ name: 'Tester', email: testEmail });

    try {
      const response = await resend.emails.send({
        from: FROM_EMAIL,
        to: testEmail,
        reply_to: process.env.RESEND_REPLY_TO || undefined,
        subject: '🔊 Beats & Pieces s-a întors! Mesaj de la Nerub + Test Battle Activ',
        html: html,
      });

      console.log('\n✅ TEST EMAIL SENT SUCCESSFULLY!');
      console.log('Resend Response:', JSON.stringify(response, null, 2));
      console.log('\nCheck your inbox at: ' + testEmail);
    } catch (err) {
      console.error('\n❌ Failed to send test email:', err.message || err);
    }
    return;
  }

  // MODE 3: FULL PRODUCTION BROADCAST
  if (isSend) {
    console.log(`🚀 BROADCASTING RELAUNCH EMAIL TO ${users.length} USERS...\n`);
    console.log(`From: ${FROM_EMAIL}\n`);

    const results = {
      total: users.length,
      sent: 0,
      failed: 0,
      errors: [],
      timestamp: new Date().toISOString(),
    };

    // Send in small batches with rate-limiting (2 emails/sec for free tier compliance)
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const html = generateRelaunchHtml({ name: user.name, email: user.email });

      process.stdout.write(`[${i + 1}/${users.length}] Sending to ${user.email}... `);

      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: user.email,
          reply_to: process.env.RESEND_REPLY_TO || undefined,
          subject: '🔊 Beats & Pieces s-a întors! Mesaj de la Nerub + Test Battle Activ',
          html: html,
        });
        results.sent++;
        console.log('✅ Sent');
      } catch (err) {
        results.failed++;
        console.log(`❌ Failed (${err.message || 'Unknown error'})`);
        results.errors.push({ email: user.email, error: err.message || String(err) });
      }

      // 600ms pause between sends (smooth ~1.6 req/sec under the 2 req/sec Resend limit)
      await new Promise(resolve => setTimeout(resolve, 600));
    }

    // Save broadcast report
    const reportPath = path.join(__dirname, '..', 'Old Database', `broadcast_report_${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2), 'utf8');

    console.log('\n====================================================');
    console.log(`🏁 BROADCAST COMPLETE! ${results.sent}/${users.length} sent successfully.`);
    if (results.failed > 0) {
      console.log(`⚠️ ${results.failed} failed. See report at: ${reportPath}`);
    }
    console.log('====================================================\n');
  }
}

main().catch(console.error);
