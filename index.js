
import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from 'discord.js';
import dotenv from 'dotenv';
import pkg from 'rcon-srcds';
import fs from 'fs';
dotenv.config();

const Rcon = pkg.default ?? pkg;
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
let rconClient;

function logToFile(content) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync('rcon-debug.log', `[${timestamp}] ${content}\n`);
}

client.once('ready', () => {
  console.log(`🤖 機器人已登入：${client.user.tag}`);

  try {
    rconClient = new Rcon({
      host: process.env.RCON_HOST,
      port: Number(process.env.RCON_PORT),
      password: process.env.RCON_PASSWORD,
      timeout: 5000,
    });

    console.log('✅ RCON 已初始化');
    logToFile('✅ 初始化成功');

    const channel = client.channels.cache.get(process.env.DISCORD_CHANNEL_ID);
    if (channel) channel.send('🟢 **TakoBot 已上線！** 準備同步聊天 🐙');

  } catch (error) {
    console.error('❌ RCON 初始化失敗：', error);
    logToFile(`❌ 初始化錯誤：${error.message}`);
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'say') {
    const message = interaction.options.getString('message');
    try {
      logToFile(`➡️ 執行 RCON 指令：say ${message}`);
      const result = await rconClient.execute(`say ${message}`);
      logToFile(`⬅️ 回傳：${result}`);
      await interaction.reply({
        content: `📣 指令已送出：
\`\`\`
${result || '[無回應]'}
\`\`\``,
        ephemeral: true
      });
    } catch (e) {
      logToFile(`❌ 指令失敗：${e.message}`);
      await interaction.reply({
        content: `❌ 傳送失敗，錯誤：\`${e.message}\``,
        ephemeral: true
      });
    }
  }

  if (interaction.commandName === 'rconcheck') {
    try {
      logToFile('➡️ 執行 RCON 指令：status');
      const result = await rconClient.execute('status');
      logToFile(`⬅️ 回傳：${result}`);
      await interaction.reply('✅ RCON 連線正常');
    } catch (e) {
      logToFile(`❌ status 失敗：${e.message}`);
      await interaction.reply('❌ RCON 無法連線，請檢查主機設定');
    }
  }
});

const commands = [
  new SlashCommandBuilder()
    .setName('say')
    .setDescription('傳送訊息到 Rust 伺服器')
    .addStringOption(opt => opt.setName('message').setDescription('要說的話').setRequired(true)),
  new SlashCommandBuilder()
    .setName('rconcheck')
    .setDescription('檢查 RCON 是否連線成功')
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
(async () => {
  try {
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log('✅ Slash 指令已成功註冊');
  } catch (error) {
    console.error('❌ Slash 註冊錯誤：', error);
    logToFile(`❌ Slash 註冊錯誤：${error.message}`);
  }
})();

client.login(process.env.DISCORD_TOKEN);
