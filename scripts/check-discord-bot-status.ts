#!/usr/bin/env tsx

/**
 * Discord Bot Live Status Checker
 * 
 * This script uses REST API to check what Discord sees about the bot
 * without requiring gateway intents.
 */

import { REST, Routes } from 'discord.js';
import { validateConfig, botConfig, apiKeys } from '../src/utils/config';
import { logger } from '../src/utils/logger';

interface DiscordCommand {
  id: string;
  name: string;
  description?: string;
  type: number;
  guild_id?: string;
}

interface Guild {
  id: string;
  name: string;
  member_count?: number;
}

interface BotUser {
  id: string;
  username: string;
  discriminator: string;
  avatar?: string;
  bot: boolean;
}

async function main() {
  try {
    validateConfig();
    
    logger.info('🔍 Checking Discord bot status via REST API...');
    
    const rest = new REST({ version: '10' }).setToken(apiKeys.discord.token);
    
    // Get bot user info
    logger.info('\n🤖 Bot Information:');
    try {
      const botUser = await rest.get('/users/@me') as BotUser;
      logger.info(`  Name: ${botUser.username}#${botUser.discriminator}`);
      logger.info(`  ID: ${botUser.id}`);
      logger.info(`  Is Bot: ${botUser.bot ? '✅' : '❌'}`);
    } catch (error: any) {
      logger.error('Could not fetch bot user info:', error.message);
    }
    
    // Get guilds the bot is in
    logger.info('\n🏰 Guilds:');
    let guilds: Guild[] = [];
    try {
      guilds = await rest.get('/users/@me/guilds') as Guild[];
      logger.info(`Bot is in ${guilds.length} guilds:`);
      guilds.forEach(guild => {
        const memberCount = guild.member_count ? ` (${guild.member_count} members)` : '';
        logger.info(`  - ${guild.name} (${guild.id})${memberCount}`);
      });
    } catch (error: any) {
      logger.error('Could not fetch guild list:', error.message);
    }
    
    // Check global slash commands
    logger.info('\n📋 Global Slash Commands:');
    try {
      const globalCommands = await rest.get(
        Routes.applicationCommands(apiKeys.discord.clientId)
      ) as DiscordCommand[];
      
      if (globalCommands.length > 0) {
        logger.info(`Found ${globalCommands.length} global commands:`);
        globalCommands.forEach(cmd => {
          const typeStr = getCommandTypeString(cmd.type);
          logger.info(`  / ${cmd.name} (${typeStr}) - ${cmd.description || 'No description'}`);
        });
      } else {
        logger.info('No global slash commands registered');
      }
    } catch (error: any) {
      logger.error('Could not fetch global commands:', error.message);
    }
    
    // Check guild-specific commands
    if (guilds.length > 0) {
      logger.info('\n📍 Guild-Specific Commands:');
      for (const guild of guilds) {
        try {
          const guildCommands = await rest.get(
            Routes.applicationGuildCommands(apiKeys.discord.clientId, guild.id)
          ) as DiscordCommand[];
          
          if (guildCommands.length > 0) {
            logger.info(`\n  ${guild.name} (${guild.id}) - ${guildCommands.length} commands:`);
            guildCommands.forEach(cmd => {
              const typeStr = getCommandTypeString(cmd.type);
              logger.info(`    / ${cmd.name} (${typeStr}) - ${cmd.description || 'No description'}`);
            });
          }
        } catch (error: any) {
          logger.warn(`Could not fetch commands for guild ${guild.name}:`, error.message);
        }
      }
    }
    
    // Configuration summary
    logger.info('\n📊 Configuration Summary:');
    logger.info(`  Max Queue Size: ${botConfig.maxQueueSize}`);
    logger.info(`  Default Volume: ${botConfig.defaultVolume}`);
    logger.info(`  Auto Leave Timeout: ${botConfig.autoLeaveTimeout}ms`);
    logger.info(`  Total Guilds: ${guilds.length}`);
    
    // Note about slash commands
    logger.info('\n💡 Important Notes:');
    logger.info('  - This bot uses modern slash commands: "/command"');
    logger.info('  - Legacy prefix commands have been removed');
    logger.info('  - All interactions use Discord\'s native slash command system');
    
    if (process.env.NODE_ENV === 'production') {
      logger.info('\n🚀 Running in production mode');
    } else {
      logger.info('\n🛠️  Running in development mode');
    }
    
    logger.info('\n✅ Status check completed!');
    
  } catch (error) {
    logger.error('❌ Error checking Discord bot status:', error);
    process.exit(1);
  }
}

function getCommandTypeString(type: number): string {
  switch (type) {
    case 1: return 'CHAT_INPUT';
    case 2: return 'USER';
    case 3: return 'MESSAGE';
    default: return `UNKNOWN(${type})`;
  }
}

// Run the status check
main();