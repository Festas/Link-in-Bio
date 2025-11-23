require('dotenv').config(); // Lädt die Variablen aus der .env Datei
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Konfiguration aus den Environment Variables laden
const CONFIG = {
    accessToken: process.env.INSTAGRAM_ACCESS_TOKEN,
    username: process.env.TARGET_USERNAME,
    apiVersion: 'v18.0'
};

const BASE_URL = `https://graph.facebook.com/${CONFIG.apiVersion}`;

// Wo soll die JSON Datei gespeichert werden?
// Passe diesen Pfad an, damit er in deinen Frontend 'public' Ordner zeigt!
const OUTPUT_FILE = path.join(__dirname, 'public', 'media_kit_stats.json'); 

async function getInstagramAccountId() {
    try {
        console.log(`🔍 Suche ID für: ${CONFIG.username}...`);
        
        // Hole verknüpfte Accounts
        const response = await axios.get(`${BASE_URL}/me/accounts`, {
            params: {
                access_token: CONFIG.accessToken,
                fields: 'instagram_business_account{id,username},name'
            }
        });

        const pages = response.data.data;
        const matchingPage = pages.find(p => 
            p.instagram_business_account && 
            p.instagram_business_account.username.toLowerCase() === CONFIG.username.toLowerCase()
        );

        if (!matchingPage) throw new Error(`Kein Business Account für ${CONFIG.username} gefunden.`);
        
        return matchingPage.instagram_business_account.id;

    } catch (error) {
        console.error('❌ Fehler bei ID Suche:', error.message);
        return null;
    }
}

async function fetchAnalytics(instagramId) {
    try {
        console.log('📊 Lade Live-Statistiken...');
        
        // Wir holen Profil-Infos UND Insights in einem Call
        const response = await axios.get(`${BASE_URL}/${instagramId}`, {
            params: {
                access_token: CONFIG.accessToken,
                fields: 'followers_count,media_count,name,profile_picture_url,biography,insights.metric(impressions,reach,profile_views).period(day)'
            }
        });

        return response.data;
    } catch (error) {
        console.error('❌ Fehler beim Laden der Stats:', error.message);
        return null;
    }
}

function saveToFile(data) {
    if (!data) return;

    // Helper um Insights sicher auszulesen
    const getMetric = (name) => {
        const metric = data.insights?.data?.find(m => m.name === name);
        // Nimm den aktuellsten Wert (letztes Element im Array)
        return metric?.values[metric.values.length - 1]?.value || 0;
    };

    const cleanData = {
        meta: {
            updated_at: new Date().toISOString(),
            source: "Meta Graph API"
        },
        profile: {
            username: data.username || CONFIG.username,
            name: data.name,
            avatar: data.profile_picture_url,
            bio: data.biography,
            url: `https://instagram.com/${CONFIG.username}`
        },
        stats: {
            followers: data.followers_count,
            posts: data.media_count,
            reach_daily: getMetric('reach'),
            impressions_daily: getMetric('impressions'),
            profile_views: getMetric('profile_views')
        }
    };

    // Stelle sicher, dass der Ordner existiert
    const dir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(cleanData, null, 2));
    console.log(`✅ Erfolgreich gespeichert in: ${OUTPUT_FILE}`);
}

// Hauptfunktion
async function run() {
    if (!CONFIG.accessToken) {
        console.error("❌ FEHLER: Kein Access Token in der .env Datei gefunden!");
        return;
    }

    const id = await getInstagramAccountId();
    if (id) {
        const data = await fetchAnalytics(id);
        saveToFile(data);
    }
}

run();

