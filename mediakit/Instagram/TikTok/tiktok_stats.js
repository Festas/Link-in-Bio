require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const qs = require('querystring');

// Pfade
const TOKEN_FILE = path.join(__dirname, 'tiktok_tokens.json');
const OUTPUT_FILE = path.join(__dirname, 'public', 'media_kit_tiktok.json');

// Hilfsfunktion: Tokens lesen/schreiben
function getTokens() {
    if (!fs.existsSync(TOKEN_FILE)) return null;
    return JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
}

function saveTokens(tokenData) {
    // Wir behalten alte Daten bei und überschreiben nur was neu ist
    const current = getTokens() || {};
    const newData = { ...current, ...tokenData, last_updated: Date.now() };
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(newData, null, 2));
}

// 1. TOKEN REFRESH (Das Herzstück)
async function refreshAccessToken() {
    const tokens = getTokens();
    if (!tokens || !tokens.refresh_token) {
        throw new Error("❌ Keine Tokens gefunden! Bitte tiktok_tokens.json prüfen.");
    }

    console.log("🔄 Erneuere TikTok Token...");

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
        
        // Speichern für den nächsten Lauf
        saveTokens({
            access_token: newTokens.access_token,
            refresh_token: newTokens.refresh_token, // WICHTIG: Refresh Token rotiert oft auch!
            expires_in: newTokens.expires_in
        });

        console.log("✅ Token erfolgreich erneuert!");
        return newTokens.access_token;

    } catch (error) {
        console.error("❌ Token Refresh fehlgeschlagen:", error.response?.data || error.message);
        throw error;
    }
}

// 2. STATS HOLEN
async function fetchTikTokStats() {
    try {
        // Immer erst refreshen, um sicher zu gehen
        const accessToken = await refreshAccessToken();
        
        console.log("📊 Lade Profil & Videos...");

        // A. Profil Daten
        const userRes = await axios.get('https://open.tiktokapis.com/v2/user/info/', {
            headers: { 'Authorization': `Bearer ${accessToken}` },
            params: { fields: 'display_name,avatar_url,follower_count,likes_count,video_count' }
        });
        
        // B. Letzte Videos für Engagement Rate
        const videoRes = await axios.post('https://open.tiktokapis.com/v2/video/list/', {
            max_count: 10 // Wir analysieren die letzten 10 Videos
        }, {
            headers: { 
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            params: { fields: 'id,title,view_count,like_count,comment_count,share_count' }
        });

        const user = userRes.data.data.user;
        const videos = videoRes.data.data.videos || [];

        // C. Engagement Rate Berechnen
        let totalEngagements = 0;
        let totalViews = 0;

        videos.forEach(vid => {
            totalEngagements += (vid.like_count + vid.comment_count + vid.share_count);
            totalViews += vid.view_count;
        });

        // Formel: (Interaktionen / Views) * 100
        const engagementRate = totalViews > 0 ? ((totalEngagements / totalViews) * 100).toFixed(2) : 0;

        // D. Output bauen
        const output = {
            meta: {
                updated_at: new Date().toISOString(),
                source: "TikTok Official API (Sandbox)"
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
                avg_views: videos.length > 0 ? Math.round(totalViews / videos.length) : 0
            }
        };

        // Speichern
        const dir = path.dirname(OUTPUT_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
        console.log(`🎉 TikTok Stats gespeichert in: ${OUTPUT_FILE}`);

    } catch (error) {
        console.error("❌ Abbruch:", error.message);
    }
}

fetchTikTokStats();


