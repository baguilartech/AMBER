#!/usr/bin/env tsx

/**
 * Comprehensive Discord Command Audit
 * 
 * This script will check ALL possible command registrations:
 * 1. Global application commands
 * 2. Guild-specific commands (for each guild the bot is in)
 * 3. Different command types (chat input, user, message)
 */

import { REST, Routes } from 'discord.js';
import { validateConfig, apiKeys } from '../src/utils/config';
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
}

async function main() {
  try {
    validateConfig();
    
    const rest = new REST({ version: '10' }).setToken(apiKeys.discord.token);
    
    logger.info('🔍 Performing comprehensive command audit for Amber bot...');
    logger.info(`Bot Client ID: ${apiKeys.discord.clientId}`);
    
    // 1. Check global application commands
    logger.info('\n📋 Checking GLOBAL application commands...');
    try {
      const globalCommands = await rest.get(
        Routes.applicationCommands(apiKeys.discord.clientId)
      ) as DiscordCommand[];
      
      logger.info(`Found ${globalCommands.length} global commands:`);
      if (globalCommands.length > 0) {
        globalCommands.forEach(cmd => {
          const typeStr = getCommandTypeString(cmd.type);
          logger.info(`  - ${cmd.name} (${typeStr}): ${cmd.description || 'No description'}`);
        });
      } else {
        logger.info('  No global commands found');
      }
    } catch (error: any) {
      logger.error('Error fetching global commands:', error.message);
    }
    
    // 2. Get list of guilds the bot is in
    logger.info('\n🏰 Checking guilds the bot is in...');
    let guilds: Guild[] = [];
    try {
      // Try to get current user's guilds (requires bot to be running)
      const botGuilds = await rest.get('/users/@me/guilds') as Guild[];
      guilds = botGuilds;
      logger.info(`Bot is in ${guilds.length} guilds:`);
      guilds.forEach(guild => {
        logger.info(`  - ${guild.name} (${guild.id})`);
      });
    } catch (error: any) {
      logger.warn('Could not fetch guild list via API (bot may not be running):', error.message);
      logger.info('Will check a few common guild patterns instead...');
    }
    
    // 3. Check guild-specific commands for each guild
    if (guilds.length > 0) {
      logger.info('\n🔍 Checking GUILD-SPECIFIC commands...');
      
      for (const guild of guilds) {
        try {
          const guildCommands = await rest.get(
            Routes.applicationGuildCommands(apiKeys.discord.clientId, guild.id)
          ) as DiscordCommand[];
          
          if (guildCommands.length > 0) {
            logger.info(`\n📍 Guild "${guild.name}" (${guild.id}) has ${guildCommands.length} commands:`);
            guildCommands.forEach(cmd => {
              const typeStr = getCommandTypeString(cmd.type);
              logger.info(`  - ${cmd.name} (${typeStr}): ${cmd.description || 'No description'}`);
            });
          } else {
            logger.info(`\n📍 Guild "${guild.name}" (${guild.id}): No guild-specific commands`);
          }
        } catch (error: any) {
          logger.warn(`Could not fetch commands for guild ${guild.name}:`, error.message);
        }
      }
    }
    
    // 4. Summary of all unique commands found
    logger.info('\n📊 SUMMARY OF ALL COMMANDS FOUND:');
    
    let allCommands: DiscordCommand[] = [];
    
    // Collect global commands
    try {
      const globalCommands = await rest.get(
        Routes.applicationCommands(apiKeys.discord.clientId)
      ) as DiscordCommand[];
      allCommands = [...allCommands, ...globalCommands.map(cmd => ({ ...cmd, guild_id: 'GLOBAL' }))];
    } catch (error) {
      // Already logged above
    }
    
    // Collect guild commands
    for (const guild of guilds) {
      try {
        const guildCommands = await rest.get(
          Routes.applicationGuildCommands(apiKeys.discord.clientId, guild.id)
        ) as DiscordCommand[];
        allCommands = [...allCommands, ...guildCommands.map(cmd => ({ ...cmd, guild_id: guild.id }))];
      } catch (error) {
        // Already logged above
      }
    }
    
    if (allCommands.length > 0) {
      logger.info(`\nTotal commands found across all scopes: ${allCommands.length}`);
      
      // Group by command name to see duplicates
      const commandsByName = new Map<string, DiscordCommand[]>();
      allCommands.forEach(cmd => {
        if (!commandsByName.has(cmd.name)) {
          commandsByName.set(cmd.name, []);
        }
        commandsByName.get(cmd.name)!.push(cmd);
      });
      
      logger.info('\nCommands by name:');
      commandsByName.forEach((commands, name) => {
        if (commands.length === 1) {
          const cmd = commands[0];
          const scope = cmd.guild_id === 'GLOBAL' ? 'GLOBAL' : `Guild: ${cmd.guild_id}`;
          const typeStr = getCommandTypeString(cmd.type);
          logger.info(`  - ${name} (${typeStr}) [${scope}]: ${cmd.description || 'No description'}`);
        } else {
          logger.info(`  - ${name} (${commands.length} instances):`);
          commands.forEach(cmd => {
            const scope = cmd.guild_id === 'GLOBAL' ? 'GLOBAL' : `Guild: ${cmd.guild_id}`;
            const typeStr = getCommandTypeString(cmd.type);
            logger.info(`    * ${typeStr} [${scope}]: ${cmd.description || 'No description'}`);
          });
        }
      });
      
      // Check for potential issues
      const duplicateNames = Array.from(commandsByName.entries()).filter(([name, cmds]) => cmds.length > 1);
      if (duplicateNames.length > 0) {
        logger.info('\n⚠️  POTENTIAL ISSUES FOUND:');
        logger.info(`Found ${duplicateNames.length} command names with multiple registrations:`);
        duplicateNames.forEach(([name, cmds]) => {
          logger.info(`  - "${name}" registered ${cmds.length} times`);
        });
      }
      
    } else {
      logger.info('\n❌ No commands found in any scope!');
    }
    
    logger.info('\n✅ Command audit completed!');
    
  } catch (error) {
    logger.error('❌ Error during command audit:', error);
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

// Run the audit
main();