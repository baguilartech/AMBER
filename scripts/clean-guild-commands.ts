#!/usr/bin/env tsx

/**
 * Clean Guild-Specific Commands
 * 
 * This script will remove all guild-specific commands that are not part of Amber,
 * keeping only the 8 global commands that Amber actually implements.
 */

import { REST, Routes } from 'discord.js';
import { validateConfig, apiKeys } from '../src/utils/config';
import { logger } from '../src/utils/logger';

interface Guild {
  id: string;
  name: string;
}

async function main() {
  try {
    validateConfig();
    
    const rest = new REST({ version: '10' }).setToken(apiKeys.discord.token);
    
    logger.info('🧹 Starting cleanup of guild-specific commands...');
    logger.info(`Bot Client ID: ${apiKeys.discord.clientId}`);
    
    // Get list of guilds
    const guilds = await rest.get('/users/@me/guilds') as Guild[];
    logger.info(`Found ${guilds.length} guilds to clean:`);
    guilds.forEach(guild => {
      logger.info(`  - ${guild.name} (${guild.id})`);
    });
    
    // Clean each guild
    for (const guild of guilds) {
      logger.info(`\n🗑️  Cleaning guild: ${guild.name} (${guild.id})`);
      
      try {
        // Get current guild commands
        const guildCommands = await rest.get(
          Routes.applicationGuildCommands(apiKeys.discord.clientId, guild.id)
        ) as any[];
        
        logger.info(`  Found ${guildCommands.length} guild-specific commands to remove`);
        
        if (guildCommands.length > 0) {
          // Remove all guild commands by setting empty array
          await rest.put(
            Routes.applicationGuildCommands(apiKeys.discord.clientId, guild.id),
            { body: [] }
          );
          
          logger.info(`  ✅ Removed ${guildCommands.length} commands from ${guild.name}`);
        } else {
          logger.info(`  ✅ No guild-specific commands found in ${guild.name}`);
        }
        
      } catch (error: any) {
        logger.error(`  ❌ Error cleaning guild ${guild.name}:`, error.message);
      }
    }
    
    // Verify global commands are still intact
    logger.info('\n🔍 Verifying global commands are still intact...');
    const globalCommands = await rest.get(
      Routes.applicationCommands(apiKeys.discord.clientId)
    ) as any[];
    
    logger.info(`✅ Global commands still registered: ${globalCommands.length}`);
    globalCommands.forEach(cmd => {
      logger.info(`  - ${cmd.name}: ${cmd.description}`);
    });
    
    // Final verification - check all guilds are clean
    logger.info('\n🔍 Final verification - checking all guilds are clean...');
    let totalRemainingGuildCommands = 0;
    
    for (const guild of guilds) {
      try {
        const remainingCommands = await rest.get(
          Routes.applicationGuildCommands(apiKeys.discord.clientId, guild.id)
        ) as any[];
        
        if (remainingCommands.length > 0) {
          logger.warn(`  ⚠️  ${guild.name} still has ${remainingCommands.length} commands`);
          totalRemainingGuildCommands += remainingCommands.length;
        } else {
          logger.info(`  ✅ ${guild.name} is clean (0 commands)`);
        }
      } catch (error: any) {
        logger.error(`  ❌ Error verifying guild ${guild.name}:`, error.message);
      }
    }
    
    // Summary
    logger.info('\n📊 CLEANUP SUMMARY:');
    logger.info(`✅ Global commands preserved: ${globalCommands.length}`);
    logger.info(`🗑️  Guild-specific commands removed: ${88 - totalRemainingGuildCommands}`);
    logger.info(`⚠️  Remaining guild commands: ${totalRemainingGuildCommands}`);
    
    if (totalRemainingGuildCommands === 0) {
      logger.info('\n🎉 SUCCESS! All guild-specific commands have been removed!');
      logger.info('Your Amber bot now only has the 8 implemented global commands.');
    } else {
      logger.warn('\n⚠️  Some guild commands could not be removed. You may need to run this again.');
    }
    
  } catch (error) {
    logger.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

// Run the cleanup
main();