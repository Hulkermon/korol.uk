import type { DosCommand, DosCommandContext } from '@/composables/dos/useDosCommands';

const dirCommand: DosCommand = {
  name: 'dir',
  aliases: ['ls'],
  description: 'Displays a list of files and subdirectories in a directory. Usage: dir [path]',
  execute: async (args: string[], context: DosCommandContext): Promise<string[]> => {
    let targetPath = [...context.currentPath]; // Start with current path
    let targetPathString = args.length > 0 ? args[0] : '.'; // Use argument if provided

    // Basic path resolution (doesn't handle complex relative paths like ..\..\folder)
    if (targetPathString && targetPathString !== '.') {
        // Rudimentary check for absolute path
        if (targetPathString.startsWith('C:\\') || targetPathString.startsWith('c:\\')) {
             targetPath = ['C:', ...targetPathString.substring(3).split('\\').filter(Boolean)];
        } else if (targetPathString === '..') {
            if (targetPath.length > 1) targetPath.pop();
        } else {
            // Assume relative path from current directory
            targetPath = [...context.currentPath, targetPathString];
        }
    }

    const contents = context.getDirContents(targetPath);
    const displayPath = targetPath.join('\\');

    if (!contents) {
      // Check if the target itself exists but isn't a directory (it's a file)
      // This requires a more complex VFS lookup not implemented in getDirContents
      // For now, just assume not found if getDirContents returns null
      return [`File Not Found: ${displayPath}`]; // More DOS-like error
    }

    const output: string[] = [
      ` Volume in drive ${targetPath[0]} has no label.`, // Classic DOS fluff
      ` Directory of ${displayPath}`,
      '', // Blank line
    ];

    let fileCount = 0;
    let dirCount = 0;
    // Could add size/date later

    // List directories first
    contents.filter(item => item.type === 'directory').forEach(item => {
      output.push(`          <DIR>         ${item.name.toUpperCase()}`);
      dirCount++;
    });

    // List files next
    contents.filter(item => item.type === 'file').forEach(item => {
      output.push(`                     ${item.name.toUpperCase()}`); // Placeholder for size/date
      fileCount++;
    });

    output.push(''); // Blank line
    output.push(`       ${fileCount} File(s)`);
    output.push(`       ${dirCount} Dir(s)`);

    return output;
  },
};

export default dirCommand;
