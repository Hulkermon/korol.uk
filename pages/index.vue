<template>
  <div class="website-container">
    <!-- Early 2000s fancy header -->
    <div class="header">
      <div class="site-title">
        <h1 class="blink">KOROL.UK</h1>
        <client-only>
          <marquee scrollamount="5" direction="left">***** WELCOME TO MY HOMEPAGE ***** UNDER CONSTRUCTION *****</marquee>
        </client-only>
      </div>
      <div class="counter">Visitors: 12345</div>
    </div>

    <!-- Navigation cards section -->
    <div class="nav-section">
      <div class="nav-intro">
        <h2>:: CHOOSE YOUR DESTINATION ::</h2>
      </div>
      
      <div class="nav-cards">
        <NuxtLink to="/charts" class="nav-card">
          <div class="card-inner">
            <div class="card-title">CHARTS</div>
            <div class="card-desc">View awesome charts and data visualizations!</div>
            <div class="card-cta">CLICK HERE!</div>
          </div>
        </NuxtLink>
        
        <NuxtLink to="/terminal" class="nav-card">
          <div class="card-inner">
            <div class="card-title">TERMINAL</div>
            <div class="card-desc">Experience the retro terminal interface!</div>
            <div class="card-cta">ENTER NOW!</div>
          </div>
        </NuxtLink>
      </div>
    </div>

    <div class="footer">
      <p>Best viewed in Netscape Navigator 4.0 or Internet Explorer 5.5</p>
      <p>© 2025 KOROL.UK - Last updated: March 27, 2025</p>
    </div>
  </div>
</template>

<style scoped>
.website-container {
  max-width: 1000px;
  margin: 0 auto;
  font-family: "Comic Sans MS", cursive, sans-serif;
  background-color: #ccccff;
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
  font-family: "Courier New", monospace;
}

.nav-intro {
  text-align: center;
  margin-bottom: 20px;
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
  cursor: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAIGNIUk0AAHolAACAgwAA+f8AAIDpAAB1MAAA6mAAADqYAAAXb5JfxUYAAAG5SURBVHja7JZNSsNQFIW/21RtK9UOWkEXoOBU0IEuQHDqVFwILsIVtM5diLQuwIGC4MgJCIKDTkVaqdbUH2J7HZQ8eIZUwZGQd+Dlvnd4557z7j0PUkpJgJSAUwQoFsVisUCv1xMRRRFzc3NMJhNms1mhYL7v02g0EEJkBYSUkm63K8IwLDQZLy8viOM4ZfPlgp+jKBK9Xo88z6NWqzGdTlMQf1uFQoHt7W0Gg0FKBwLApVQqsbGxQbPZpFKppI7dbkdRPD8/4zgOQgiklJn7hNA0jUqlwvr6OuPxmLe3N6SUCCHQdT1FIKXE8zyur69ZWVlhc3Mz9Ww4HHJzc8NoNKJarTI/P58QsVdjGIbYts3h4SHv7+/c399nIMvlMkdHR9i2zevrK6PRKPEJF1uRUiKlZDAYcHNzw9LSEvv7+8zPz3N3d8fd3R22bbO7u8vOzg7D4TDxBUXTtAwNKSW2bXN2dsbl5SVnZ2ecnp7y+PjI2toaW1tbnJycYJpmQv5LGuWsH0qpTzm6rvP09MTx8TGLi4usrq7i+z6maXJ+fp6QM03z7xnz8UeU58/I5/PZ/4HvPwN+DADB05gyWHC9NQAAAABJRU5ErkJggg=='), auto;
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
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

.footer {
  margin-top: 30px;
  text-align: center;
  font-size: 12px;
  color: #666666;
  border-top: 1px dotted #9999ff;
  padding-top: 10px;
}
</style>
