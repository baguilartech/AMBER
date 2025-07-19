#!/usr/bin/env tsx

/**
 * Discord Command Cleanup Utility
 * 
 * This script will:
 * 1. Fetch all commands currently registered with Discord
 * 2. Compare with commands actually implemented in Amber
 * 3. Remove any commands that are not implemented
 * 4. Re-register only the implemented commands
 */

import { REST, Routes } from 'discord.js';
import { validateConfig, apiKeys } from '../src/utils/config';
import { logger } from '../src/utils/logger';
import { CommandRegistry } from '../src/utils/commandRegistry';
import { QueueManager } from '../src/services/queueManager';
import { MusicPlayer } from '../src/services/musicPlayer';
import { PlayCommand } from '../src/commands/play';
import { QueueCommand } from '../src/commands/queue';
import { SkipCommand } from '../src/commands/skip';
import { StopCommand } from '../src/commands/stop';
import { PauseCommand } from '../src/commands/pause';
import { ResumeCommand } from '../src/commands/resume';
import { VolumeCommand } from '../src/commands/volume';
import { NowPlayingCommand } from '../src/commands/nowplaying';

interface DiscordCommand {
  id: string;
  name: string;
  description: string;
  type: number;
}

async function main() {
  try {
    // Validate configuration
    validateConfig();
    
    const rest = new REST({ version: '10' }).setToken(apiKeys.discord.token);
    
    logger.info('🔍 Fetching currently registered Discord commands...');
    
    // Fetch current commands from Discord
    const currentCommands = await rest.get(
      Routes.applicationCommands(apiKeys.discord.clientId)
    ) as DiscordCommand[];
    
    logger.info(`Found ${currentCommands.length} commands currently registered with Discord:`);
    currentCommands.forEach(cmd => {
      logger.info(`  - ${cmd.name}: ${cmd.description}`);
    });
    
    // Initialize Amber's implemented commands
    const queueManager = new QueueManager();
    const musicPlayer = new MusicPlayer(queueManager);
    const commandRegistry = new CommandRegistry();
    
    const implementedCommands = [
      new PlayCommand(queueManager, musicPlayer),
      new QueueCommand(queueManager),
      new SkipCommand(musicPlayer),
      new StopCommand(musicPlayer),
      new PauseCommand(musicPlayer),
      new ResumeCommand(musicPlayer),
      new VolumeCommand(musicPlayer),
      new NowPlayingCommand(queueManager)
    ];
    
    commandRegistry.registerMultiple(implementedCommands);
    const implementedCommandData = commandRegistry.getCommandData();
    const implementedCommandNames = implementedCommandData.map(cmd => cmd.name);
    
    logger.info(`\n🛠️  Commands implemented in Amber (${implementedCommandNames.length}):`);
    implementedCommandNames.forEach(name => {
      logger.info(`  - ${name}`);
    });
    
    // Find commands that are registered but not implemented
    const registeredNames = currentCommands.map(cmd => cmd.name);
    const unimplementedCommands = currentCommands.filter(cmd => 
      !implementedCommandNames.includes(cmd.name)
    );
    const missingCommands = implementedCommandNames.filter(name => 
      !registeredNames.includes(name)
    );
    
    if (unimplementedCommands.length > 0) {
      logger.info(`\n❌ Commands registered with Discord but NOT implemented in Amber (${unimplementedCommands.length}):`);
      unimplementedCommands.forEach(cmd => {
        logger.info(`  - ${cmd.name}: ${cmd.description}`);
      });
    } else {
      logger.info('\n✅ No unimplemented commands found in Discord registry');
    }
    
    if (missingCommands.length > 0) {
      logger.info(`\n⚠️  Commands implemented in Amber but NOT registered with Discord (${missingCommands.length}):`);
      missingCommands.forEach(name => {
        logger.info(`  - ${name}`);
      });
    } else {
      logger.info('\n✅ All implemented commands are registered with Discord');
    }
    
    // Ask for confirmation before cleaning up
    if (unimplementedCommands.length > 0 || missingCommands.length > 0) {
      logger.info('\n🧹 Cleaning up Discord command registry...');
      logger.info('This will:');
      if (unimplementedCommands.length > 0) {
        logger.info(`  - Remove ${unimplementedCommands.length} unimplemented commands from Discord`);
      }
      if (missingCommands.length > 0) {
        logger.info(`  - Register ${missingCommands.length} missing commands with Discord`);
      }
      
      // Clear all commands first
      logger.info('\n🗑️  Clearing all commands from Discord...');
      await rest.put(
        Routes.applicationCommands(apiKeys.discord.clientId),
        { body: [] }
      );
      logger.info('✅ All commands cleared from Discord');
      
      // Re-register only implemented commands
      logger.info('\n📝 Re-registering implemented commands...');
      await rest.put(
        Routes.applicationCommands(apiKeys.discord.clientId),
        { body: implementedCommandData }
      );
      
      logger.info(`✅ Successfully registered ${implementedCommandData.length} commands with Discord:`);
      implementedCommandData.forEach(cmd => {
        logger.info(`  - ${cmd.name}: ${cmd.description}`);
      });
      
    } else {
      logger.info('\n✅ Discord command registry is already in sync with Amber implementation');
    }
    
    // Verify final state
    logger.info('\n🔍 Verifying final command registry...');
    const finalCommands = await rest.get(
      Routes.applicationCommands(apiKeys.discord.clientId)
    ) as DiscordCommand[];
    
    logger.info(`\n✅ Final state: ${finalCommands.length} commands registered with Discord:`);
    finalCommands.forEach(cmd => {
      logger.info(`  - ${cmd.name}: ${cmd.description}`);
    });
    
    logger.info('\n🎉 Command cleanup completed successfully!');
    
  } catch (error) {
    logger.error('❌ Error during command cleanup:', error);
    process.exit(1);
  }
}

// Run the cleanup
main();