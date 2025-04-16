
import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from 'discord.js';
import dotenv from 'dotenv';
import pkg from 'rcon-srcds';
dotenv.config();

const Rcon = pkg.default ?? pkg;
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

let rconClient;

client.once('ready', async () => {
  console.log(`🤖 機器人已登入：${client.user.tag}`);

  try {
    rconClient = new Rcon({
      host: process.env.RCON_HOST,
      port: Number(process.env.RCON_PORT),
      password: process.env.RCON_PASSWORD,
      timeout: 5000,
    });

    await rconClient.connect();
    console.log('✅ RCON 連線成功');

    const channel = client.channels.cache.get(process.env.DISCORD_CHANNEL_ID);
    if (channel) channel.send('🟢 **TakoBot 已上線！** 準備同步聊天 🐙');

  } catch (error) {
    console.error('❌ RCON 連線失敗：', error);
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'say') {
    const message = interaction.options.getString('message');
    try {
      await rconClient.execute(`say ${message}`);
      await interaction.reply(`📣 已傳送至 RUST：${message}`);
    } catch (e) {
      await interaction.reply('❌ 傳送失敗，RCON 尚未連線');
    }
  }

  if (interaction.commandName === 'rconcheck') {
    try {
      await rconClient.execute('status');
      await interaction.reply('✅ RCON 連線正常');
    } catch (e) {
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
  }
})();

client.login(process.env.DISCORD_TOKEN);
