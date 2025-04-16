
import { Client, GatewayIntentBits } from 'discord.js';
import { Rcon } from 'rcon-srcds';
import dotenv from 'dotenv';
dotenv.config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const rcon = new Rcon({
  host: process.env.RCON_HOST,
  port: Number(process.env.RCON_PORT),
  password: process.env.RCON_PASSWORD,
  timeout: 5000,
});

client.once('ready', async () => {
  console.log(`🤖 Discord 機器人已登入：${client.user.tag}`);
  try {
    await rcon.connect();
    console.log('✅ RCON 連線成功');
    // 啟動後持續 ping log
    setInterval(async () => {
      const log = await rcon.execute('server.log'); // 假設支援 log 指令，視實際可用指令調整
      if (log) {
        const lines = log.split('\n');
        lines.forEach(line => {
          const match = line.match(/\d{2}:\d{2}:\d{2} \| (#[A-Z]+) +\| ([^:]+) ?: (.+)/);
          if (match) {
            const [, scope, player, message] = match;
            const scopeText = scope === "#TEAM" ? "👥 Team" : "🌐 Global";
            const formatted = `**${scopeText}** | 🧑‍🚀 \`${player.trim()}\`：${message.trim()}`;
            const channel = client.channels.cache.get(process.env.DISCORD_CHANNEL_ID);
            if (channel) channel.send(formatted);
          }
        });
      }
    }, 8000);
  } catch (error) {
    console.error('❌ RCON 連線失敗：', error);
  }
});

client.login(process.env.DISCORD_TOKEN);
