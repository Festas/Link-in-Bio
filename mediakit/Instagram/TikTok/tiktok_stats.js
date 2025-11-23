require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const qs = require('querystring');

// --- KONFIGURATION ---
const TOKEN_FILE = path.join(__dirname, 'tiktok_tokens.json');
// Pfad wo das Ergebnis für die Webseite landet
const OUTPUT_FILE = path.join(__dirname, 'public', 'media_kit_tiktok.json'); 

// 1. HELFER: DATEIEN LESEN/SCHREIBEN
function getTokens() {
    if (!fs.existsSync(TOKEN_FILE)) {
        console.error("❌ CRITICAL: tiktok_tokens.json fehlt!");
        return null;
    }
    return JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
}

function saveTokens(tokenData) {
    const current = getTokens() || {};
    // Wir speichern den aktuellen Zeitstempel, um später zu rechnen
    const newData = { 
        ...current, 
        ...tokenData, 
        last_updated: Date.now() 
    };
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(newData, null, 2));
    console.log("💾 Tokens aktualisiert und gespeichert.");
}

// 2. LOGIK: TOKEN PRÜFEN & ERNEUERN
async function getValidAccessToken() {
    const tokens = getTokens();
    if (!tokens || !tokens.refresh_token) {
        throw new Error("Keine Tokens vorhanden. Bitte Initial-Setup wiederholen.");
    }

    // Wann läuft der Token ab? (expires_in ist in Sekunden, wir rechnen in ms)
    const now = Date.now();
    const tokenAge = now - (tokens.last_updated || 0);
    const lifeTime = (tokens.expires_in * 1000); 
    
    // Puffer: Wir erneuern, wenn er noch weniger als 60 Minuten gültig ist
    const buffer = 60 * 60 * 1000; 

    const isValid = tokenAge < (lifeTime - buffer);

    if (isValid) {
        console.log("✅ Aktueller Token ist noch gültig. Kein Refresh nötig.");
        return tokens.access_token;
    }

    console.log("⏳ Token läuft bald ab (oder ist alt). Starte Refresh...");
    
    // Der eigentliche Refresh Call
    try {
        const response = await axios.post('https://open.tiktokapis.com/v2/oauth/token/', qs.stringify({
            client_key: process.env.TIKTOK_CLIENT_KEY,
            client_secret: process.env.TIKTOK_CLIENT_SECRET,
            grant_type: 'refresh_token',
            refresh_token: tokens.refresh_token
        }), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const newTokens = response.data;
        
        // Speichern der neuen Schlüssel
        saveTokens({
            access_token: newTokens.access_token,
            refresh_token: newTokens.refresh_token, // WICHTIG: TikTok gibt oft neue Refresh Tokens mit zurück
            expires_in: newTokens.expires_in
        });

        return newTokens.access_token;

    } catch (error) {
        console.error("❌ REFRESH FEHLGESCHLAGEN:", error.response?.data || error.message);
        // Im Notfall versuchen wir es trotzdem mit dem alten Token
        return tokens.access_token;
    }
}

// 3. HAUPTFUNKTION: DATEN HOLEN
async function fetchTikTokStats() {
    try {
        // Hier passiert die Magie: Hole gültigen Token (egal ob alt oder neu)
        const accessToken = await getValidAccessToken();
        
        console.log("📊 Lade TikTok Daten...");

        // A. User Infos laden
        const userRes = await axios.get('https://open.tiktokapis.com/v2/user/info/', {
            headers: { 'Authorization': `Bearer ${accessToken}` },
            params: { fields: 'display_name,avatar_url,follower_count,likes_count,video_count' }
        });
        
        // B. Letzte 10 Videos laden (für Engagement Rate)
        const videoRes = await axios.post('https://open.tiktokapis.com/v2/video/list/', {
            max_count: 10
        }, {
            headers: { 
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            params: { fields: 'id,view_count,like_count,comment_count,share_count' }
        });

        const user = userRes.data.data.user;
        const videos = videoRes.data.data.videos || [];

        // C. Engagement Berechnen
        let totalEngagements = 0;
        let totalViews = 0;

        videos.forEach(vid => {
            totalEngagements += (vid.like_count + vid.comment_count + vid.share_count);
            totalViews += vid.view_count;
        });

        const engagementRate = totalViews > 0 ? ((totalEngagements / totalViews) * 100).toFixed(2) : 0;

        // D. Output erstellen
        const output = {
            meta: {
                updated_at: new Date().toISOString(),
                source: "TikTok Official API"
            },
            profile: {
                username: user.display_name,
                avatar: user.avatar_url,
                url: `https://tiktok.com/@${user.display_name}`
            },
            stats: {
                followers: user.follower_count,
                likes: user.likes_count,
                videos: user.video_count,
                engagement_rate: engagementRate + "%",
                avg_views_last_10: videos.length > 0 ? Math.round(totalViews / videos.length) : 0
            }
        };

        // E. Speichern
        const dir = path.dirname(OUTPUT_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
        console.log(`🎉 Success! Daten gespeichert in: ${OUTPUT_FILE}`);

    } catch (error) {
        console.error("❌ FEHLER BEIM LADEN:", error.response?.data || error.message);
    }
}

// Start
fetchTikTokStats();


