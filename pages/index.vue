<template>
  <div class="sticky inset-0 bg-pink-300/50"></div>
  <div class="homepage-container">
    <!-- Early 2000s fancy header -->
    <div class="header">
      <div class="site-title">
        <h1 class="blink">KOROL.UK</h1>
        <marquee scrollamount="5" direction="left">
          ***** WELCOME TO MY HOMEPAGE ***** UNDER CONSTRUCTION *****
        </marquee>
      </div>
      <div class="counter">Visitors: 12345</div>
    </div>

    <!-- Navigation cards section -->
    <div class="nav-section">
      <div class="nav-intro">
        <h2>:: CHOOSE YOUR DESTINATION ::</h2>
      </div>

      <div class="nav-cards">

        <NuxtLink to="/dos" class="nav-card">
          <div class="card-inner">
            <div class="card-title">TERMINAL</div>
            <div class="card-desc">Experience the retro terminal interface!</div>
            <div class="card-cta">ENTER NOW!</div>
          </div>
        </NuxtLink>

        <NuxtLink to="/3D" class="nav-card">
          <div class="card-inner">
            <div class="card-title">Three Dimensions</div>
            <div class="card-desc">Access top secret 3D visualization system!</div>
            <div class="card-cta">CLASSIFIED!</div>
          </div>
        </NuxtLink>

        <NuxtLink to="/stoner-benches" class="nav-card">
          <div class="card-inner">
            <div class="card-title">Stoner Benches</div>
            <div class="card-desc">Rate the best benches for chilling out!</div>
            <div class="card-cta">BLAZE IT!</div>
          </div>
        </NuxtLink>
        
      </div>
    </div>

    <!-- Guestbook Section -->
    <Guestbook />

    <div class="footer">
      <p>Best viewed in Netscape Navigator 4.0 or Internet Explorer 5.5</p>
      <p>© 2026 KOROL.UK - Last updated: Jan 19, 2026</p>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import Guestbook from '~/components/Guestbook.vue'; // Import the Guestbook component
  import {
    fairyDustCursor,
    snowflakeCursor,
    ghostCursor,
    bubbleCursor,
    trailingCursor,
    clockCursor,
    characterCursor,
    rainbowCursor,
  } from 'cursor-effects';

  // prettier-ignore
  onMounted(() => {
    if (!document.querySelector('.cursor-effect-container')) {
      document.body.appendChild(document.createElement('div')).className = 'cursor-effect-container';
    }

    cursorEffectsContainer = document.querySelector('.cursor-effect-container')!; // trust me bro
    randomCursorEffect({
      element: cursorEffectsContainer,
      randomDelay: true,
      particles: 69,
      rate: 0.4 + Math.random() * 0.6,
      characters: ['baddadan'.split(''), ['✧','✦','✧','✦','✧','✦','✧','✦','✧','✦','✧','✦']][Math.floor(Math.random() * 2)],
      characterLifeSpanFunction: () => [75 + Math.random() * 50, 2000][Math.floor(Math.random() * 1.05)],
      size: 2 + (Math.random() * 4) ** 3,
    });
    
    if (customCursor.framesUrl) {
      document.body.style.animation = 'cursor 0.5s linear infinite';
    } else {
      document.body.style.cursor = `url(${customCursor.url}), ${customCursor.type || 'auto'}`;
    }
  });

  onUnmounted(() => {
    cursorEffectsContainer?.remove();
    document.body.style.cursor = 'auto'; // Reset to default cursor
  });

  let cursorEffectsContainer: HTMLElement;
  const cursorsEffects = [
    fairyDustCursor,
    snowflakeCursor,
    ghostCursor,
    bubbleCursor,
    trailingCursor,
    clockCursor,
    characterCursor,
    rainbowCursor,
  ];

  // prettier-ignore
  const randomCursorEffect = cursorsEffects[Math.floor(Math.random() * cursorsEffects.length)];

  const cusomCursors: {
    name: string;
    type?: 'default' | 'pointer' | 'text' | 'wait';
    url: string;
    /** currently hard coded to 3 frames */
    framesUrl?: string;
  }[] = [
    {
      name: 'Flame',
      url: '/cursors/flame/Arrow.cur',
    },
    {
      name: 'Hello Kitty',
      url: '/cursors/hello-kitty/default.gif',
    },
    {
      name: 'Rainbow',
      url: '/cursors/rainbow/default.gif',
    },
    {
      name: 'Pink Mustache',
      url: '/cursors/pink-mustache/default.gif',
      framesUrl: '/cursors/pink-mustache/frames/default/',
    },
    {
      name: 'Dragon',
      url: '/cursors/dragon/default.png',
    },
    // {
    //   name: 'Middle Finger',
    //   url: '/cursors/middle-finger/pointer.png',
    // },
  ];

  const customCursor = cusomCursors[Math.floor(Math.random() * cusomCursors.length)];
</script>

<style>
  .cursor-effect-container {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  }

  @keyframes cursor {
    0% {
      cursor: url('/cursors/pink-mustache/frames/default/0.png'), auto;
    }
    33% {
      cursor: url('/cursors/pink-mustache/frames/default/1.png'), auto;
    }
    66% {
      cursor: url('/cursors/pink-mustache/frames/default/2.png'), auto;
    }
    100% {
      cursor: url('/cursors/pink-mustache/frames/default/0.png'), auto;
    }
  }
</style>

<style scoped>
  .homepage-container {
    position: relative; /* Add position relative */
    z-index: 1; /* Give it a positive z-index to place it above cursor container */
    max-width: 1000px;
    margin: 0 auto;
    font-family: 'Comic Sans MS', cursive, sans-serif;
    background-color: #ccccff;
    margin-top: 42px;
    margin-bottom: 50vh;
    border: 5px solid #9999ff;
    padding: 20px;
    box-shadow: 10px 10px 5px #888888;
  }

  .header {
    text-align: center;
    background: linear-gradient(to right, #ff00ff, #00ffff);
    padding: 20px;
    border: 2px dashed #ff0000;
    margin-bottom: 30px;
  }

  .site-title h1 {
    font-size: 60px;
    font-weight: bold;
    color: #ffff00;
    text-shadow: 3px 3px 0px #ff0000, 6px 6px 0px #0000ff;
    letter-spacing: 5px;
    transform: skew(-5deg);
    margin-bottom: 10px;
  }

  .blink {
    animation: blinker 1s linear infinite;
  }

  @keyframes blinker {
    50% {
      opacity: 0;
    }
  }

  marquee {
    background-color: #000000;
    color: #00ff00;
    font-weight: bold;
    padding: 5px;
    font-size: 14px;
  }

  .counter {
    background-color: #000000;
    color: #00ff00;
    display: inline-block;
    padding: 5px 15px;
    margin-top: 10px;
    border: 1px solid #00ff00;
    font-family: 'Courier New', monospace;
  }

  .nav-section {
    margin-top: 64px;
    margin-bottom: 128px;
  }

  .nav-intro {
    text-align: center;
    margin-bottom: 32px;
  }

  .nav-intro h2 {
    color: #ff0000;
    font-size: 24px;
    text-shadow: 1px 1px 1px #000000;
  }

  .nav-cards {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    justify-content: center;
  }

  .nav-card {
    width: 300px;
    height: 200px;
    background: linear-gradient(to bottom, #0066ff, #0033cc);
    border: 3px outset #9999ff;
    text-decoration: none;
    color: white;
    transition: transform 0.2s;
  }

  .nav-card:hover {
    transform: scale(1.05);
    background: linear-gradient(to bottom, #ff6600, #cc3300);
    cursor: url('data:image/x-icon;base64,AAACAAEAICAAAAAAAACoEAAAFgAAACgAAAAgAAAAQAAAAAEAIAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAAFAAAACAAAAAgAAAAIAAAACAAAAAgAAAAIAAAACAAAAAgAAAAFAAAAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACQAAABMAAAAcAAAAHAAAABwAAAAcAAAAHAAAABwAAAAcAAAAHAAAABMAAAAJAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAATAAAAJgAAADgAAAA4AAAAOAAAADgAAAA4AAAAOAAAADgAAAA4AAAAJgAAABMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAAABwAAAA1AAAATAAAAEwAAABMAAAATAAAAEwAAABMAAAATAAAAEwAAAA1AAAAHAAAAAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAAUwAAAEEAAAAlAAAACQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAP///////////////////////////////////////////wAAAP8AAABVAAAASwAAAC8AAAATAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAA////////////////////////////////////////////AAAA/wAAAFUAAABSAAAAOAAAABwAAAADAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAP//////////////////////////////////////////////////////AAAA/wAAAFQAAABBAAAAJQAAAAkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAA//////////////////////////////////////////////////////8AAAD/AAAAVQAAAEsAAAAvAAAAEwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAP///////////////////////////////////////////////////////////wAAAP8AAABVAAAAUgAAADYAAAAZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAAMAAAA/////////////////////////////////////////////////////////////////wAAAP8AAABUAAAAOAAAABwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACQAAAP//////////////////////////////////////////////////////////////////////AAAA/wAAAFQAAAA4AAAAHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASAAAA//////////////////////////////////////////////////////////////////////8AAAD/AAAAUQAAADUAAAAZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///////////wAAAP///////////////////////////////////////////////////////////wAAAP8AAABIAAAALAAAABMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/////////////////AAAA////////////////////////////////////////////////////////////AAAA/wAAADUAAAAcAAAACQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///////////wAAAP8AAAD///////////////////////////////////////////8AAAD///////////8AAAD/AAAAHwAAAAwAAAADAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/wAAAP8AAAD/AAAACAAAAP///////////wAAAP///////////wAAAP///////////wAAAP//////AAAA/wAAABUAAAAMAAAAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAABAAAA////////////AAAA////////////AAAA////////////AAAA/wAAAP8AAAAPAAAABgAAAAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///////////8AAAD///////////8AAAD/AAAA/wAAAP8AAAAiAAAABgAAAAMAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/AAAA/wAAAP///////////wAAAP8AAABUAAAAOAAAABwAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA////////////AAAA/wAAAFEAAAA1AAAAGQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///////////8AAAD/AAAARQAAACwAAAATAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///////////wAAAP8AAAAvAAAAHAAAAAkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA////////////AAAA/wAAABUAAAAMAAAAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/wAAAP8AAAAGAAAABgAAAAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA///////////////////////////////////////////////////////////4Af//+AH///gB///wAP//8AD//+AA///gAH//wAB//8AAf/+AAH//AAB//wAAf/8QAP//8AH///AH///4H////h////4f///+H////h////8///8='),
      auto;
  }

  .card-inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 15px;
    text-align: center;
  }

  .card-title {
    font-size: 28px;
    font-weight: bold;
    margin-bottom: 15px;
    color: #ffff00;
    text-shadow: 2px 2px 0px #000000;
  }

  .card-desc {
    font-size: 16px;
    margin-bottom: 20px;
    color: white;
  }

  .card-cta {
    font-size: 20px;
    font-weight: bold;
    background-color: #ff0000;
    padding: 5px 15px;
    border-radius: 5px;
    border: 2px outset #ffcc00;
    color: #ffff00;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.1);
    }
    100% {
      transform: scale(1);
    }
  }

  .footer {
    margin-top: 64px;
    margin-bottom: 32px;
    text-align: center;
    font-size: 12px;
    color: #666666;
    border-top: 1px dotted #9999ff;
  }
</style>
