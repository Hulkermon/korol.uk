import type { DosCommand, DosCommandContext } from '@/composables/dos/useDosCommands';

const helpCommand: DosCommand = {
  name: 'help',
  description: 'Provides help information for ClineDOS commands. Usage: help [command]',
  execute: async (args: string[], context: DosCommandContext): Promise<string | string[]> => {
    if (args.length === 0) {
      // List all available commands
      const output: string[] = [
        'For more information on a specific command, type HELP command-name',
        '',
        ...context.availableCommands.sort().map(cmd =>
            `${cmd} ${context.commandAliases[cmd] ? '(alias: ' + context.commandAliases[cmd] + ')' : ''}`.toUpperCase()
          ),
        '',
      ];
      return output;
    } else {
      // Show help for a specific command
      const commandName = args[0].toLowerCase();
      const command = await context.loadCommand(commandName); // Use context to load

      if (command) {
        // Return the command's description
        // Could add more details like aliases or usage later
        return [
            `${command.name.toUpperCase()}: ${command.description || 'No description available.'}`
        ];
      } else {
        return `Help topic not found: ${commandName}`;
      }
    }
  },
};

export default helpCommand;
