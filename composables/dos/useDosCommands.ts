import { ref, computed } from 'vue'; // Import computed

// --- Interfaces ---
export interface DosCommandContext {
  currentPath: string[];
  availableCommands: string[];
  setTerminalColor: (color: string) => void;
  getDirContents: (path: string[]) => VfsEntry[] | null;
  changeDir: (target: string) => string | null; // Returns error message or null
  loadCommand: (commandName: string) => Promise<DosCommand | null>; // Add loadCommand to context
}

export interface DosCommand {
  name: string;
  aliases?: string[]; // Optional aliases like 'ls' for 'dir'
  description: string;
  execute: (args: string[], context: DosCommandContext) => Promise<string | string[]>; // Pass context
}

// --- VFS Structure ---
interface VfsFile {
  type: 'file';
  name: string;
  // content?: string; // Future enhancement
}

interface VfsDirectory {
  type: 'directory';
  name: string;
  children: { [key: string]: VfsEntry };
}

type VfsEntry = VfsFile | VfsDirectory;

const virtualFileSystem: VfsDirectory = {
  type: 'directory',
  name: 'C:',
  children: {
    'DOS': {
      type: 'directory',
      name: 'DOS',
      children: {
        'COMMAND.COM': { type: 'file', name: 'COMMAND.COM' },
        'EDIT.COM': { type: 'file', name: 'EDIT.COM' },
      }
    },
    'GAMES': {
      type: 'directory',
      name: 'GAMES',
      children: {
         'DOOM': { type: 'directory', name: 'DOOM', children: {} },
      }
    },
    'CONFIG.SYS': { type: 'file', name: 'CONFIG.SYS' },
    'AUTOEXEC.BAT': { type: 'file', name: 'AUTOEXEC.BAT' },
    'README.TXT': { type: 'file', name: 'README.TXT' },
  }
};

// --- History Entry ---
export interface HistoryEntry {
  id: number;
  type: 'input' | 'output' | 'error';
  text: string | string[]; // Output can be multi-line
  timestamp: Date;
}

// --- Composable Logic ---
export function useDosCommands() {
  const commandHistory = ref<HistoryEntry[]>([]);
  const currentPath = ref<string[]>(['C:']); // Start at root
  const terminalColor = ref<string>('white'); // Default color
  let historyIdCounter = 0;

  // --- VFS Helper Functions ---
  const navigateVfs = (path: string[]): VfsDirectory | null => {
    let currentLevel: VfsDirectory = virtualFileSystem;
    for (let i = 1; i < path.length; i++) { // Start from 1 to skip 'C:'
      const segment = path[i];
      const nextLevel = currentLevel.children[segment.toUpperCase()];
      if (!nextLevel || nextLevel.type !== 'directory') {
        return null; // Path not found or not a directory
      }
      currentLevel = nextLevel;
    }
    return currentLevel;
  };

  const getDirContents = (path: string[]): VfsEntry[] | null => {
    const dir = navigateVfs(path);
    return dir ? Object.values(dir.children) : null;
  };

  const changeDir = (target: string): string | null => {
    if (!target || target === '.') {
      return null; // Stay in current directory
    }

    if (target === '..') {
      if (currentPath.value.length > 1) {
        currentPath.value.pop();
        return null;
      } else {
        return 'Already at root directory.';
      }
    }

    // Handle absolute paths (basic)
    if (target.startsWith('C:\\') || target.startsWith('c:\\')) {
       const newPath = ['C:', ...target.substring(3).split('\\').filter(Boolean)];
       const targetDir = navigateVfs(newPath);
       if (targetDir) {
           currentPath.value = newPath;
           return null;
       } else {
           return `Directory not found: ${target}`;
       }
    }

    // Handle relative paths
    const currentDir = navigateVfs(currentPath.value);
    if (!currentDir) return 'Internal VFS error.'; // Should not happen

    const targetDir = currentDir.children[target.toUpperCase()];
    if (targetDir && targetDir.type === 'directory') {
      currentPath.value.push(targetDir.name); // Use the actual name casing
      return null;
    } else {
      return `Directory not found: ${target}`;
    }
  };

  // --- Command Loading & Execution ---
  const availableCommandsList: string[] = ['ping', 'help', 'cls', 'clear', 'echo', 'ver', 'color', 'dir', 'ls', 'cd']; // Keep updated

  const loadCommand = async (commandName: string): Promise<DosCommand | null> => {
     const lowerCaseCommand = commandName.toLowerCase();
     // Check if it's one of the known commands or aliases
     if (!availableCommandsList.includes(lowerCaseCommand)) {
         // Check aliases (simple implementation)
         if (lowerCaseCommand === 'ls') commandName = 'dir';
         else if (lowerCaseCommand === 'clear') commandName = 'cls';
         else return null; // Truly unknown
     }

     try {
       // Use dynamic import
       const module = await import(`@/composables/dos/commands/${commandName.toLowerCase()}.ts`);
       return module.default as DosCommand;
     } catch (error) {
       console.error(`Error loading command module ${commandName}:`, error);
       return null;
     }
  };

  const addHistoryEntry = (type: HistoryEntry['type'], text: string | string[]) => {
    // Simple mechanism to prevent too much history (optional)
    if (commandHistory.value.length > 200) {
        commandHistory.value.shift(); // Remove oldest entry
    }
    commandHistory.value.push({
      id: historyIdCounter++,
      type,
      text,
      timestamp: new Date(),
    });
  };

  const currentPathString = computed(() => currentPath.value.join('\\') + '>'); // Reactive prompt

  const setTerminalColor = (color: string) => {
      // Basic validation, could be stricter
      const allowedColors = ['green', 'yellow', 'cyan', 'white', 'red', 'pink'];
      if (allowedColors.includes(color.toLowerCase())) {
          terminalColor.value = color.toLowerCase();
      } else {
          // Optionally return an error message to be handled by the color command
          console.warn(`Invalid color: ${color}`);
      }
  };

  // Define a unique signal for clear screen action
  const CLEAR_SCREEN_SIGNAL = Symbol('clear_screen');

  const processCommand = async (input: string): Promise<string | string[] | symbol | null> => {
    const trimmedInput = input.trim();
    if (!trimmedInput) return null; // Return null for no action

    addHistoryEntry('input', `${currentPathString.value} ${trimmedInput}`); // Still log input to history

    const [commandName, ...args] = trimmedInput.split(/\s+/);
    const lowerCaseCommand = commandName.toLowerCase();

    // Handle 'cls'/'clear' by returning the signal
    if (lowerCaseCommand === 'cls' || lowerCaseCommand === 'clear') {
      // Don't modify history here, let the caller handle the clear action
      return CLEAR_SCREEN_SIGNAL;
    }

    try {
      const command = await loadCommand(commandName);

      if (command) {
        // Prepare context for the command
        const context: DosCommandContext = {
          currentPath: currentPath.value,
          availableCommands: availableCommandsList, // Pass the list
          setTerminalColor,
          getDirContents,
          changeDir,
          loadCommand, // Pass loadCommand in context
        };
        const output = await command.execute(args, context);
        if (output) {
            addHistoryEntry('output', output); // Log output to history
            return output; // Return output for display
        }
        return null; // Return null if command had no output
      } else {
        const errorMsg = `Bad command or file name: ${commandName}`;
        addHistoryEntry('error', errorMsg);
        return errorMsg; // Return error message for display
      }
    } catch (error) {
       const errorMsg = `Error executing command: ${commandName}`;
       console.error(errorMsg, error);
       addHistoryEntry('error', errorMsg);
       return errorMsg; // Return error message for display
    }
  };

  return {
    commandHistory, // Keep history for potential future use (e.g., up arrow)
    processCommand,
    terminalColor, // Expose color state
    currentPathString, // Expose formatted path for prompt
    CLEAR_SCREEN_SIGNAL, // Expose the signal constant
  };
}
