// index.js (Versi Final Stabil #MAMADGANG)
const { Client, GatewayIntentBits, Collection, Partials, EmbedBuilder } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus } = require('@discordjs/voice');
const dotenv = require('dotenv');
const express = require('express');

// Mengimpor handlers
const commandHandler = require('./handlers/commandHandler');
const eventHandler = require('./handlers/eventHandler');
const giveawayHandler = require('./handlers/giveawayHandler');
const afkHandler = require('./handlers/afkHandler');

dotenv.config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildBans,
        GatewayIntentBits.GuildEmojisAndStickers,
        GatewayIntentBits.GuildIntegrations,
        GatewayIntentBits.GuildWebhooks,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMessageTyping,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildVoiceStates,
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.GuildMember,
        Partials.Reaction,
        Partials.User,
    ]
});

// Inisialisasi Collections
client.commands = new Collection();
client.aliases = new Collection();
client.snipes = new Collection();
client.giveaways = new Collection();
client.afk = new Collection();

// --- FUNGSI VOICE 24/7 STABIL ---
const stayInVoice = async () => {
    const voiceChannelId = process.env.VOICE_CHANNEL_ID;
    if (!voiceChannelId) return console.log('⚠️ VOICE_CHANNEL_ID tidak ditemukan di .env');

    try {
        const channel = client.channels.cache.get(voiceChannelId);
        if (!channel) return console.log('❌ Channel voice tidak ditemukan!');

        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
            selfDeaf: true,
            selfMute: false
        });

        const player = createAudioPlayer();
        
        const playResource = () => {
            const resource = createAudioResource('./silence.mp3');
            player.play(resource);
        };

        playResource();
        connection.subscribe(player);

        // Loop audio jika selesai
        player.on(AudioPlayerStatus.Idle, () => playResource());
        
        // Auto-reconnect jika terputus
        connection.on(VoiceConnectionStatus.Disconnected, async () => {
            try {
                await Promise.race([
                    entersState(connection, VoiceConnectionStatus.Signalling, 5000),
                    entersState(connection, VoiceConnectionStatus.Connecting, 5000),
                ]);
            } catch (error) {
                console.log('🎤 Mencoba menyambung ulang ke voice...');
                stayInVoice();
            }
        });

        console.log(`🎤 #MAMADGANG Aktif di Voice: ${channel.name}`);
    } catch (err) {
        console.error('❌ Error Voice 24/7:', err);
    }
};

client.on('ready', () => {
    console.log(`✅ ${client.user.username} telah online!`);
    console.log(`📊 Berjalan di ${client.guilds.cache.size} server.`);

    // Jalankan Voice 24/7
    stayInVoice();

    // Memulai Giveaway Handler
    if (typeof giveawayHandler === 'function') giveawayHandler(client);
    console.log('🎉 Giveaway Handler telah dimulai.');

    // Status Bot Berputar
    const statuses = [
        { name: '#MAMADGANG', type: 0 },
        { name: '!!help | Komunitas Aman', type: 0 },
        { name: 'Sistem: Online', type: 0 }
    ];

    let currentStatus = 0;
    setInterval(() => {
        client.user.setActivity(statuses[currentStatus].name, { type: statuses[currentStatus].type });
        currentStatus = (currentStatus + 1) % statuses.length;
    }, 30000);
});

// Event Message Create
client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;
    
    const prefix = 'g!'; // Sesuaikan prefix Anda
    if (!message.content.startsWith(prefix)) return;
    
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    
    const command = client.commands.get(commandName) || 
                    client.commands.get(client.aliases.get(commandName));
    
    if (!command) return;
    
    // Permission Check (Owner)
    if (command.ownerOnly && message.author.id !== process.env.OWNER_ID) return;

    // Permission Check (User)
    if (command.userPermissions && !message.member.permissions.has(command.userPermissions)) {
        return message.reply('❌ Anda tidak punya izin untuk ini.');
    }

    try {
        await command.execute(message, args, client);
    } catch (error) {
        console.error(error);
    }
});

// Memanggil Handlers
commandHandler(client);
eventHandler(client);
afkHandler(client);

client.login(process.env.DISCORD_TOKEN);

// Web Server untuk Render
const app = express();
app.get('/', (req, res) => res.send('Bot #MAMADGANG is online!'));
app.listen(3000, () => console.log(`🚀 Port 3000 siap`));