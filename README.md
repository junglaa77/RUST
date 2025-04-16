# Tako-Rust Bot

A Rust-to-Discord sync bot that uses RCON to read Rust server logs and send messages to Discord.

## Features
- Reads Rust chat logs (TEAM / GLOBAL)
- Formats and sends them to a Discord channel
- Built with Node.js, discord.js v14, and rcon-srcds

## Setup

1. Clone this repo or upload to Railway.
2. Create a `.env` file based on `.env.example`.
3. Run:

```bash
npm install
npm start
```

## Environment Variables

```
DISCORD_TOKEN=your_discord_token
RCON_HOST=your_rust_server_ip
RCON_PORT=your_rcon_port
RCON_PASSWORD=your_rcon_password
DISCORD_CHANNEL_ID=your_discord_channel_id
```
