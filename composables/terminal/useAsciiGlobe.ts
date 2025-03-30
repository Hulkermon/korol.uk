import { ref } from 'vue';

/**
 * ASCII globe frames for a spinning earth animation
 */
const globeFrames = [
  // Frame 1
  [
    '   .---.   ',
    '  /     \\  ',
    ' |   o   | ',
    '  \\     /  ',
    '   \'---\'   '
  ],
  // Frame 2
  [
    '   .---.   ',
    '  /     \\  ',
    ' |    o  | ',
    '  \\     /  ',
    '   \'---\'   '
  ],
  // Frame 3
  [
    '   .---.   ',
    '  /     \\  ',
    ' |     o | ',
    '  \\     /  ',
    '   \'---\'   '
  ],
  // Frame 4
  [
    '   .---.   ',
    '  /  o  \\  ',
    ' |       | ',
    '  \\     /  ',
    '   \'---\'   '
  ],
  // Frame 5
  [
    '   .---.   ',
    '  / o   \\  ',
    ' |       | ',
    '  \\     /  ',
    '   \'---\'   '
  ],
  // Frame 6
  [
    '   .---.   ',
    '  /o    \\  ',
    ' |       | ',
    '  \\     /  ',
    '   \'---\'   '
  ],
  // Frame 7
  [
    '   .---.   ',
    '  /     \\  ',
    ' |o      | ',
    '  \\     /  ',
    '   \'---\'   '
  ],
  // Frame 8
  [
    '   .---.   ',
    '  /     \\  ',
    ' | o     | ',
    '  \\     /  ',
    '   \'---\'   '
  ]
];

// 3D globe frames
const globe3dFrames = [
  // Frame 1 
  [
    '    .--.    ',
    '   /    \\   ',
    '  |      |  ',
    '   \\~~~~~/   ',
    '    `--\'    '
  ],
  // Frame 2
  [
    '    .--.    ',
    '   /::::\\   ',
    '  |      |  ',
    '   \\    /   ',
    '    `--\'    '
  ],
  // Frame 3
  [
    '    .--.    ',
    '   /    \\   ',
    '  |:::::::|  ',
    '   \\    /   ',
    '    `--\'    '
  ],
  // Frame 4
  [
    '    .--.    ',
    '   /    \\   ',
    '  |      |  ',
    '   \\::::/   ',
    '    `--\'    '
  ]
];

// Detailed ASCII globe
const detailedGlobeFrames = [
  // Frame 1
  [
    '      _.-\'\"\"-._      ',
    '    .\' .----.  `.    ',
    '   /  /      \\   \\   ',
    '  |  |        |   |  ',
    '  |  |        |   |  ',
    '   \\  \\      /   /   ',
    '    `. `----\' .\'     ',
    '      `-....-\'       '
  ],
  // Frame 2
  [
    '      _.-\'\"\"-._      ',
    '    .\' .----.  `.    ',
    '   /  / .--. \\   \\   ',
    '  |  | |    | |   |  ',
    '  |  | |    | |   |  ',
    '   \\  \\ `--\' /   /   ',
    '    `. `----\' .\'     ',
    '      `-....-\'       '
  ],
  // Frame 3
  [
    '      _.-\'\"\"-._      ',
    '    .\' .----.  `.    ',
    '   /  /|.--.|\\ \\   \\ ',
    '  |  |||    ||| |  | ',
    '  |  |||    ||| |  | ',
    '   \\  \\|`--\'|/   /   ',
    '    `. `----\' .\'     ',
    '      `-....-\'       '
  ],
  // Frame 4
  [
    '      _.-\'\"\"-._      ',
    '    .\'/ .--. \\ `.    ',
    '   / /|/    \\|\\ \\   ',
    '  | |||      ||| |  ',
    '  | |||      ||| |  ',
    '   \\ \\|\\____/|/ /   ',
    '    `.\\  --  /.\'     ',
    '      `-....-\'       '
  ],
  // Frame 5
  [
    '      _.-\'\"\"-._      ',
    '    .\'\\ `--\' / `.    ',
    '   /   \\    /   \\   ',
    '  |     \\  /     |  ',
    '  |      \\/      |  ',
    '   \\      ||     /   ',
    '    `.    ||   .\'     ',
    '      `-....-\'       '
  ],
  // Frame 6
  [
    '      _.-\'\"\"-._      ',
    '    .\' / -- \\ `.    ',
    '   / /|    |\\ \\   ',
    '  | | |    | | |  ',
    '  | | |    | | |  ',
    '   \\ \\|    |/ /   ',
    '    `.\\ -- /.\'     ',
    '      `-....-\'       '
  ]
];

export function useAsciiGlobe() {
  const currentFrameIndex = ref(0);
  const animationInterval = ref<number | null>(null);
  const globeContainer = ref<HTMLElement | null>(null);
  
  /**
   * Start the ASCII globe animation
   * @param container HTML element to render the globe in
   * @param frameDelayMs Delay between frames in milliseconds
   * @param globeType Type of globe to display: 'simple', '3d', or 'detailed'
   */
  const startGlobeAnimation = (container: HTMLElement, frameDelayMs = 300, globeType = 'detailed') => {
    globeContainer.value = container;
    
    let frames: string[][];
    
    switch (globeType) {
      case 'simple':
        frames = globeFrames;
        break;
      case '3d':
        frames = globe3dFrames;
        break;
      case 'detailed':
      default:
        frames = detailedGlobeFrames;
        break;
    }
    
    // Create a div to hold the animation
    const animationElement = document.createElement('div');
    animationElement.className = 'ascii-globe';
    animationElement.style.fontFamily = 'monospace';
    animationElement.style.whiteSpace = 'pre';
    animationElement.style.textAlign = 'center';
    animationElement.style.color = '#33ff33';
    animationElement.style.margin = '20px auto';
    
    // Append to container
    container.appendChild(animationElement);
    
    // Start animation
    animationInterval.value = window.setInterval(() => {
      // Get current frame
      const frame = frames[currentFrameIndex.value];
      
      // Render the frame
      animationElement.innerHTML = frame.join('<br>');
      
      // Move to next frame, loop back to start if needed
      currentFrameIndex.value = (currentFrameIndex.value + 1) % frames.length;
    }, frameDelayMs);
  };
  
  /**
   * Stop the ASCII globe animation
   */
  const stopGlobeAnimation = () => {
    if (animationInterval.value !== null) {
      clearInterval(animationInterval.value);
      animationInterval.value = null;
    }
    
    if (globeContainer.value) {
      const animationElements = globeContainer.value.querySelectorAll('.ascii-globe');
      animationElements.forEach(el => el.remove());
    }
  };
  
  return {
    startGlobeAnimation,
    stopGlobeAnimation,
    currentFrameIndex,
  };
}