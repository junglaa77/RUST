
import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from 'discord.js';
import pkg from 'rcon-srcds';
import dotenv from 'dotenv';
dotenv.config();

const Rcon = pkg;
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const rcon = new Rcon({
  host: process.env.RCON_HOST,
  port: Number(process.env.RCON_PORT),
  password: process.env.RCON_PASSWORD,
  timeout: 5000,
});

client.once('ready', async () => {
  console.log(`🤖 機器人已登入：${client.user.tag}`);
  try {
    await rcon.connect();
    console.log('✅ RCON 已連線');

    const channel = client.channels.cache.get(process.env.DISCORD_CHANNEL_ID);
    if (channel) channel.send('🟢 **TakoBot 已上線！** 準備同步聊天 🐙');

    setInterval(async () => {
      const log = await rcon.execute('server.log');
      if (log) {
        const lines = log.split('\n');
        lines.forEach(line => {
          const match = line.match(/\d{2}:\d{2}:\d{2} \| (#[A-Z]+) +\| ([^:]+) ?: (.+)/);
          if (match) {
            const [, scope, player, message] = match;
            const scopeText = scope === "#TEAM" ? "👥 Team" : "🌐 Global";
            const formatted = `**${scopeText}** | 🧑‍🚀 \`${player.trim()}\`：${message.trim()}`;
            if (channel) channel.send(formatted);
          }
        });
      }
    }, 8000);

  } catch (err) {
    console.error('❌ RCON 連線失敗：', err);
  }
});

// Slash Command: /say
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === 'say') {
    const message = interaction.options.getString('message');
    await rcon.execute(`say ${message}`);
    await interaction.reply(`🗣️ 已傳送至 RUST：${message}`);
  }
});

// Register slash command
const commands = [
  new SlashCommandBuilder()
    .setName('say')
    .setDescription('傳送訊息到 Rust 伺服器')
    .addStringOption(opt => opt.setName('message').setDescription('要傳送的訊息').setRequired(true))
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
(async () => {
  try {
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log('✅ Slash 指令已註冊');
  } catch (error) {
    console.error('❌ 指令註冊錯誤：', error);
  }
})();

client.login(process.env.DISCORD_TOKEN);
