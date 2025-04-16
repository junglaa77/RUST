
import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from 'discord.js';
import dotenv from 'dotenv';
import pkg from 'rcon-srcds';
import fs from 'fs';
import readline from 'readline';
import { createReadStream } from 'fs';
dotenv.config();

const Rcon = pkg.default ?? pkg;
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
let rconClient;

function logToFile(content) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync('rcon-debug.log', `[${timestamp}] ${content}\n`);
}

async function ensureRconReady() {
  if (!rconClient) {
    try {
      rconClient = new Rcon({
        host: process.env.RCON_HOST,
        port: Number(process.env.RCON_PORT),
        password: process.env.RCON_PASSWORD,
        timeout: 5000,
      });
      logToFile('✅ RCON 重連成功');
    } catch (e) {
      logToFile(`❌ RCON 重連失敗：${e.message}`);
      throw e;
    }
  }
  return rconClient;
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
    if (channel) channel.send('🟢 **TakoBot v1.8 上線！** 加入登出通知 + 活動提示 🧠');
    startRustLogWatcher();
  } catch (error) {
    console.error('❌ RCON 初始化失敗：', error);
    logToFile(`❌ 初始化錯誤：${error.message}`);
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = interaction.commandName;
  let replyText = '';
  try {
    const rcon = await ensureRconReady();

    if (command === 'say') {
      const msg = interaction.options.getString('message');
      const result = await rcon.execute(`say ${msg}`);
      replyText = `📣 指令已送出：
\`\`\`
${result || '[無回應]'}
\`\`\``;
      logToFile(`➡️ say ${msg} ⬅️ ${result}`);
    }

    if (command === 'rconcheck') {
      const result = await rcon.execute('status');
      replyText = '✅ RCON 連線正常';
      logToFile(`✅ status 回應：${result}`);
    }

    if (command === 'players') {
      const result = await rcon.execute('players');
      replyText = `👥 線上玩家列表：
\`\`\`
${result || '無資料'}
\`\`\``;
      logToFile(`👥 players 查詢結果：${result}`);
    }

    if (command === 'uptime') {
      const result = await rcon.execute('uptime');
      replyText = `⏱️ 伺服器運作時間：
\`\`\`
${result || '無資料'}
\`\`\``;
      logToFile(`⏱️ uptime 結果：${result}`);
    }

    await interaction.reply({ content: replyText, ephemeral: true });
  } catch (e) {
    logToFile(`❌ Slash 執行失敗：${e.message}`);
    await interaction.reply({ content: `❌ 執行失敗：\`${e.message}\``, ephemeral: true });
  }
});

// Discord ➜ RUST
client.on('messageCreate', async message => {
  if (message.author.bot) return;
  if (message.channel.id !== process.env.SYNC_CHANNEL_ID) return;
  const clean = message.cleanContent.trim();
  if (!clean || !rconClient) return;

  const text = `[DC] ${message.author.username}：${clean}`;
  try {
    const result = await rconClient.execute(`say ${text}`);
    logToFile(`📤 聊天同步：${text}`);
  } catch (err) {
    logToFile(`❌ 聊天同步失敗：${err.message}`);
  }
});

// RUST ➜ Discord 活動通知
function startRustLogWatcher() {
  const logFilePath = './rustlog.txt';
  if (!fs.existsSync(logFilePath)) {
    fs.writeFileSync(logFilePath, '');
  }

  let lastSize = 0;
  setInterval(() => {
    fs.stat(logFilePath, (err, stats) => {
      if (err || stats.size <= lastSize) return;
      const stream = fs.createReadStream(logFilePath, { start: lastSize, end: stats.size });
      const rl = readline.createInterface({ input: stream });

      rl.on('line', line => {
        const channel = client.channels.cache.get(process.env.SYNC_CHANNEL_ID);
        if (!channel) return;

        if (line.includes('joined')) {
          channel.send(`🟢 玩家加入：${line}`);
        } else if (line.includes('disconnected')) {
          channel.send(`🔴 玩家離開：${line}`);
        } else if (line.includes('killed')) {
          channel.send(`💀 擊殺事件：${line}`);
        } else if (line.includes('loot') || line.includes('found') || line.includes('pickup')) {
          channel.send(`🎁 拾取紀錄：${line}`);
        } else if (line.includes(':')) {
          channel.send(`🎮 ${line}`);
        }
      });
      lastSize = stats.size;
    });
  }, 3000);
}

const commands = [
  new SlashCommandBuilder().setName('say').setDescription('傳送訊息到 Rust 伺服器')
    .addStringOption(opt => opt.setName('message').setDescription('要說的話').setRequired(true)),
  new SlashCommandBuilder().setName('rconcheck').setDescription('檢查 RCON 是否連線成功'),
  new SlashCommandBuilder().setName('players').setDescription('顯示目前在線玩家列表'),
  new SlashCommandBuilder().setName('uptime').setDescription('顯示伺服器開機運行時間'),
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
(async () => {
  try {
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
    console.log('✅ Slash 指令已成功註冊');
  } catch (error) {
    console.error('❌ Slash 註冊錯誤：', error);
    logToFile(`❌ Slash 註冊錯誤：${error.message}`);
  }
})();

client.login(process.env.DISCORD_TOKEN);
