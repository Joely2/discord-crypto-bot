const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const axios = require('axios');
const express = require('express');
const API_KEY = '93c44873216d4cef9d95f2542d9b686f'; // Reemplaza con tu API Key de BlockCypher
const DISCORD_TOKEN = 'MTM0NDM0MzEwOTM1MzYwMzE5Ng.G9lOaF.pAzUheNtn-qclBX6lmRvrVrZtsr6sCcpoR34gY'; // Reemplaza con tu token de bot de Discord
const BLOCKCYPHER_WEBHOOK_URL = 'TU_URL_WEBHOOK'; // URL pública para recibir notificaciones de BlockCypher

const BTC_ADDRESS = '19W8XpD1rhrL11LM4XNKvJzBsfJcMXbNa6';
const LTC_ADDRESS = 'LVyPFsPwSRamPAc8ozcSSsSM6jApZ2YM1m';

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.MessageContent] });
const app = express();
app.use(express.json());

client.once('ready', async () => {
    console.log(`Bot conectado como ${client.user.tag}`);
    const guild = client.guilds.cache.first();
    if (!guild) return console.log('El bot no está en ningún servidor.');

    let vouchesChannel = guild.channels.cache.find(channel => channel.name === '✅-vouches');
    let cryptoChannel = guild.channels.cache.find(channel => channel.name === 'cryptocurrency');

    if (!vouchesChannel) console.log('El canal de vouches no existe. Créalo manualmente en el servidor.');
    if (cryptoChannel) {
        // Enviar mensaje con menú de selección de criptomonedas
        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('crypto_selection')
                .setPlaceholder('Selecciona tu método de pago')
                .addOptions([
                    { label: 'Bitcoin', value: 'btc', emoji: '₿' },
                    { label: 'Litecoin', value: 'ltc', emoji: 'Ł' }
                ])
        );
        await cryptoChannel.send({
            content: '**Selecciona tu método de pago:**',
            components: [row]
        });
    }

    // Registrar Webhook en BlockCypher
    try {
        await axios.post(`https://api.blockcypher.com/v1/btc/main/hooks?token=${API_KEY}`, {
            event: 'confirmed-tx',
            address: BTC_ADDRESS,
            url: BLOCKCYPHER_WEBHOOK_URL
        });
        await axios.post(`https://api.blockcypher.com/v1/ltc/main/hooks?token=${API_KEY}`, {
            event: 'confirmed-tx',
            address: LTC_ADDRESS,
            url: BLOCKCYPHER_WEBHOOK_URL
        });
        console.log('✅ Webhooks registrados en BlockCypher');
    } catch (error) {
        console.error('❌ Error al registrar Webhooks:', error.response?.data || error.message);
    }
});

// Evento para manejar selección de criptomonedas
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isStringSelectMenu()) return;
    if (interaction.customId === 'crypto_selection') {
        let paymentAddress = '';
        if (interaction.values[0] === 'btc') paymentAddress = BTC_ADDRESS;
        if (interaction.values[0] === 'ltc') paymentAddress = LTC_ADDRESS;
        
        await interaction.reply({
            content: `Has seleccionado **${interaction.values[0].toUpperCase()}**. Envía tu pago a:
            
            **${paymentAddress}**`,
            ephemeral: true
        });
    }
});

// Webhook para recibir notificaciones de pagos en BlockCypher
app.post('/webhook', async (req, res) => {
    const { hash, inputs, outputs } = req.body;
    if (!hash || !inputs || !outputs) return res.status(400).send('Datos inválidos');
    
    const address = outputs[0].addresses[0];
    const amountBTC = outputs[0].value / 100000000; // Convertir satoshis a BTC/LTC
    const usdValue = (amountBTC * 40000).toFixed(2); // Estimación en dólares (debería conectarse a una API de precios en tiempo real)
    const guild = client.guilds.cache.first();
    const vouchesChannel = guild.channels.cache.find(channel => channel.name === '✅-vouches');
    
    if (vouchesChannel) {
        const embed = new EmbedBuilder()
            .setTitle('✅ Pago Recibido')
            .setColor('#4CAF50')
            .setDescription(`Se ha recibido un pago en la dirección **${address}**.`)
            .addFields(
                { name: 'Monto', value: `**${amountBTC} BTC/LTC** (~$${usdValue} USD)`, inline: true },
                { name: 'Transacción', value: `[Ver en BlockCypher](https://live.blockcypher.com/btc/tx/${hash})`, inline: true }
            )
            .setFooter({ text: 'Pago confirmado automáticamente' });
        
        vouchesChannel.send({ embeds: [embed] });
    }
    
    res.status(200).send('Notificación recibida');
});

app.listen(3000, () => {
    console.log('🚀 Servidor webhook corriendo en el puerto 3000');
});

client.login(DISCORD_TOKEN);
