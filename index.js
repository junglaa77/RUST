
import { Client, GatewayIntentBits } from 'discord.js';
import Rcon from 'rcon';

import dotenv from 'dotenv';
dotenv.config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const rcon = new Rcon(process.env.RCON_HOST, process.env.RCON_PORT, process.env.RCON_PASSWORD, {
  tcp: true,
  challenge: false
});

rcon.on('auth', () => {
  console.log('✅ RCON 連線成功');
}).on('response', (str) => {
  console.log('RCON訊息：', str);

  const logRegex = /\d{2}:\d{2}:\d{2} \| (#[A-Z]+) +\| ([^:]+) ?: (.+)/;
  const match = str.match(logRegex);
  if (match) {
    const [, scope, player, message] = match;
    const scopeText = scope === "#TEAM" ? "👥 Team" : "🌐 Global";
    const formatted = `**${scopeText}** | 🧑‍🚀 \`${player.trim()}\`：${message.trim()}`;
    const channel = client.channels.cache.get(process.env.DISCORD_CHANNEL_ID);
    if (channel) channel.send(formatted);
  }
}).on('error', err => {
  console.error('❌ RCON 錯誤：', err);
}).on('end', () => {
  console.log('❌ RCON 連線中斷');
});

client.once('ready', () => {
  console.log(`🤖 Discord 機器人已登入：${client.user.tag}`);
  rcon.connect();
});

client.login(process.env.DISCORD_TOKEN);
