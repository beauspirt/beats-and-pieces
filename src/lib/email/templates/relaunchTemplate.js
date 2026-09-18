function generateRelaunchHtml({ name, email, unsubscribeUrl }) {
  const displayName = name && name.trim().length > 0 ? name.trim() : "Beatmaker";
  const unsubLink = unsubscribeUrl || "https://beatsandpieces.ro/profile";

  return `<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Beats & Pieces s-a întors! - Mesaj de la Nerub</title>
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #0A0A0A; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; padding: 12px !important; }
      .content-padding { padding: 24px 18px !important; }
      .feature-title { font-size: 15px !important; }
    }
  </style>
</head>
<body style="background-color: #0A0A0A; color: #EDEDED; margin: 0; padding: 32px 0;">
  <center>
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
      <tr>
        <td align="center" style="padding: 0 16px;">
          <!-- Main Card Container: 100% Border-Free with smooth dark background -->
          <table border="0" cellpadding="0" cellspacing="0" width="600" class="email-container" style="max-width: 600px; width: 100%; background-color: #141414; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.8);">
            
            <!-- Header with Logo & Tagline -->
            <tr>
              <td align="center" style="padding: 44px 32px 28px 32px; background: linear-gradient(180deg, #1A1A1A 0%, #141414 100%);">
                <a href="https://beatsandpieces.ro" target="_blank" style="text-decoration: none;">
                  <img src="https://beatsandpieces.ro/logo.png" alt="Beats & Pieces" width="170" style="display: block; width: 170px; max-width: 100%; height: auto; margin: 0 auto;" />
                </a>
                <p style="margin: 16px 0 0 0; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #7B61FF;">
                  Romanian Beatmaker Community
                </p>
              </td>
            </tr>

            <!-- Main Body Content -->
            <tr>
              <td class="content-padding" style="padding: 24px 36px 36px 36px;">
                
                <!-- Personal Greeting -->
                <h1 style="margin: 0 0 18px 0; font-size: 24px; font-weight: 800; color: #FFFFFF; line-height: 1.3;">
                  Salut, ${displayName}! 👋
                </h1>
                
                <p style="margin: 0 0 18px 0; font-size: 15px; color: #D6D6D6; line-height: 1.65;">
                  Sunt <strong>Nerub</strong>. Îți scriu acest email direct pentru că ai fost alături de noi și ai făcut parte din comunitatea <strong style="color: #FFFFFF;">Beats & Pieces</strong> încă de la începuturi.
                </p>

                <p style="margin: 0 0 18px 0; font-size: 15px; color: #D6D6D6; line-height: 1.65;">
                  După o pauză lungă în care am regândit totul în detaliu, am reconstruit platforma de la zero. Mi-am dorit să avem un spațiu dedicat beatmakerilor români, care să se miște impecabil pe telefon și desktop și să pună producția muzicală pe primul loc.
                </p>

                <!-- Personal Highlight Box (Borderless) -->
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #191919; border-radius: 18px; margin: 28px 0;">
                  <tr>
                    <td style="padding: 24px 22px;">
                      
                      <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #7B61FF; margin-bottom: 16px;">
                        Ce am îmbunătățit pe noua platformă:
                      </div>

                      <!-- Bullet 1 -->
                      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 16px;">
                        <tr>
                          <td width="30" valign="top" style="font-size: 18px; line-height: 1;">🎧</td>
                          <td style="padding-left: 10px;">
                            <div class="feature-title" style="font-size: 15px; font-weight: 700; color: #FFFFFF; margin-bottom: 3px;">Player audio modern & waveforms de precizie</div>
                            <div style="font-size: 13px; color: #9E9E9E; line-height: 1.5;">Audiție fluidă fără întreruperi, comenzi rapide pe mobil și playback instant.</div>
                          </td>
                        </tr>
                      </table>

                      <!-- Bullet 2 -->
                      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 16px;">
                        <tr>
                          <td width="30" valign="top" style="font-size: 18px; line-height: 1;">⚔️</td>
                          <td style="padding-left: 10px;">
                            <div class="feature-title" style="font-size: 15px; font-weight: 700; color: #FFFFFF; margin-bottom: 3px;">Format nou de Beat Battles</div>
                            <div style="font-size: 13px; color: #9E9E9E; line-height: 1.5;">Înscrieri directe de beat-uri, vot public prin sistemul de Flames 🔥 și note detaliate de la juriu.</div>
                          </td>
                        </tr>
                      </table>

                      <!-- Bullet 3 -->
                      <table border="0" cellpadding="0" cellspacing="0" width="100%;">
                        <tr>
                          <td width="30" valign="top" style="font-size: 18px; line-height: 1;">👤</td>
                          <td style="padding-left: 10px;">
                            <div class="feature-title" style="font-size: 15px; font-weight: 700; color: #FFFFFF; margin-bottom: 3px;">Profilul tău de producător & Beat Vault</div>
                            <div style="font-size: 13px; color: #9E9E9E; line-height: 1.5;">Pagina ta cu istoricul participărilor, catalogul de beat-uri românești și breakdown-uri de producție.</div>
                          </td>
                        </tr>
                      </table>

                    </td>
                  </tr>
                </table>

                <!-- Active Test Battle Banner (Borderless Gradient Card) -->
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(135deg, #1E1A2E 0%, #2A1715 100%); border-radius: 18px; margin-bottom: 30px;">
                  <tr>
                    <td align="center" style="padding: 28px 22px;">
                      <span style="background-color: #FF5E3A; color: #FFFFFF; font-size: 11px; font-weight: 800; text-transform: uppercase; padding: 5px 12px; border-radius: 20px; letter-spacing: 1px; display: inline-block; margin-bottom: 14px;">
                        Battle Activ Acum
                      </span>
                      <h2 style="margin: 0 0 10px 0; font-size: 21px; font-weight: 800; color: #FFFFFF;">
                        Test Battle-ul este Deschis!
                      </h2>
                      <p style="margin: 0 0 22px 0; font-size: 14px; color: #D6D6D6; line-height: 1.55; max-width: 440px;">
                        Înainte să dăm drumul la noile sezoane oficiale, am deschis un <strong>test battle</strong> live. Te invit să intri, să asculți beat-urile sau să înscrii chiar tu o piesă pentru test!
                      </p>
                      
                      <!-- CTA Button (Borderless) -->
                      <table border="0" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="border-radius: 14px; background-color: #7B61FF;">
                            <a href="https://beatsandpieces.ro/battles" target="_blank" style="font-size: 15px; font-weight: 700; color: #FFFFFF; text-decoration: none; padding: 14px 30px; border-radius: 14px; display: inline-block; box-shadow: 0 6px 20px rgba(123,97,255,0.45);">
                              Intră în Test Battle & Explorează Platforma →
                            </a>
                          </td>
                        </tr>
                      </table>

                    </td>
                  </tr>
                </table>

                <!-- Personal Sign-Off -->
                <p style="margin: 0 0 16px 0; font-size: 15px; color: #D6D6D6; line-height: 1.65;">
                  Aruncă o privire pe platformă și spune-mi ce părere ai. Dacă ai orice fel de feedback, sugestii sau pur și simplu vrei să saluți, <strong>poți da direct Reply la acest email</strong> – citesc și răspund personal.
                </p>

                <p style="margin: 24px 0 0 0; font-size: 15px; color: #FFFFFF; line-height: 1.6;">
                  Ne auzim pe platformă și în battle,<br/>
                  <strong style="color: #7B61FF; font-size: 17px;">Nerub</strong><br/>
                  <span style="color: #888888; font-size: 13px;">Adrian Hrihor • Beats & Pieces</span>
                </p>

              </td>
            </tr>

            <!-- Footer & Unsubscribe (Borderless) -->
            <tr>
              <td align="center" style="padding: 24px 32px 32px 32px; background-color: #0D0D0D;">
                <p style="margin: 0 0 10px 0; font-size: 11px; color: #555555; line-height: 1.5;">
                  Primești acest email deoarece ai un cont creat pe platforma <strong>beatsandpieces.ro</strong>.<br/>
                  Beats & Pieces România • Comunitatea Producătorilor de Beat-uri
                </p>
                <p style="margin: 0; font-size: 11px; color: #555555;">
                  <a href="${unsubLink}" style="color: #777777; text-decoration: underline;">Dezabonare / Preferințe email</a>
                  &nbsp;•&nbsp;
                  <a href="https://beatsandpieces.ro" style="color: #777777; text-decoration: underline;">beatsandpieces.ro</a>
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </center>
</body>
</html>`;
}

module.exports = { generateRelaunchHtml };
