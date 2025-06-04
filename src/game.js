const { useRef, useEffect, useState } = React;

function Vector(x = 0, y = 0) {
  this.x = x;
  this.y = y;
}
Vector.prototype.add = function(other) {
  this.x += other.x;
  this.y += other.y;
  return this;
};
Vector.prototype.clone = function() {
  return new Vector(this.x, this.y);
};

function Game() {
  const canvasRef = useRef(null);
  const miniMapRef = useRef(null);
  const [scrap, setScrap] = useState(0);
  const [wave, setWave] = useState(1);
  const [cooldown, setCooldown] = useState(0);
  const [abilityCharges, setAbilityCharges] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const mapCanvas = miniMapRef.current;
    const mapCtx = mapCanvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const keys = {};
    window.addEventListener('keydown', e => keys[e.code] = true);
    window.addEventListener('keyup', e => keys[e.code] = false);

    const player = {
      pos: new Vector(canvas.width/2, canvas.height/2),
      vel: new Vector(),
      size: 20,
      speed: 4,
      bullets: [],
      fireCooldown: 0,
      dmg: 1
    };

    const enemies = [];
    let restTime = 180; // frames between waves
    let blackHoles = [];

    function spawnWave(num) {
      for (let i=0;i<num;i++) {
        const angle = Math.random()*Math.PI*2;
        const distance = Math.max(canvas.width, canvas.height)/2 + 100;
        const x = canvas.width/2 + Math.cos(angle)*distance;
        const y = canvas.height/2 + Math.sin(angle)*distance;
        enemies.push({pos:new Vector(x,y), vel:new Vector(), size:15, hp:2});
      }
    }

    function gameLoop() {
      requestAnimationFrame(gameLoop);
      ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.fillStyle = 'white';

      // move player
      if(keys['ArrowUp']) player.pos.y -= player.speed;
      if(keys['ArrowDown']) player.pos.y += player.speed;
      if(keys['ArrowLeft']) player.pos.x -= player.speed;
      if(keys['ArrowRight']) player.pos.x += player.speed;

      // fire
      if(keys['Space'] && player.fireCooldown<=0) {
        player.bullets.push({pos:player.pos.clone(), vel:new Vector(0,-8), size:4, dmg:player.dmg});
        player.fireCooldown = 15;
      }
      if(player.fireCooldown>0) player.fireCooldown--;

      // ability: black hole with 'KeyB'
      if(keys['KeyB'] && abilityCharges>0) {
        blackHoles.push({pos:player.pos.clone(), radius:0, max:80, life:600});
        setAbilityCharges(ch => ch-1);
        keys['KeyB'] = false;
      }

      // update bullets
      player.bullets.forEach(b => {
        b.pos.add(b.vel);
      });
      player.bullets = player.bullets.filter(b => b.pos.y>0);

      // update enemies
      enemies.forEach(e => {
        const dir = player.pos.clone();
        dir.x -= e.pos.x;
        dir.y -= e.pos.y;
        const len = Math.hypot(dir.x, dir.y);
        dir.x/=len; dir.y/=len;
        e.pos.x += dir.x*1.5;
        e.pos.y += dir.y*1.5;
      });

      // handle collisions
      player.bullets.forEach(b=>{
        enemies.forEach(e=>{
          if(Math.hypot(b.pos.x-e.pos.x,b.pos.y-e.pos.y)<e.size) {
            e.hp-=b.dmg; b.pos.y=-1000;
          }
        });
      });
      enemies.forEach((e,i)=>{
        if(e.hp<=0) { enemies.splice(i,1); setScrap(s=>s+1); }
      });

      // black holes
      blackHoles.forEach(h=>{
        if(h.radius<h.max) h.radius+=1;
        h.life--;
        enemies.forEach(e=>{
          const dir=new Vector(h.pos.x-e.pos.x,h.pos.y-e.pos.y);
          const dist=Math.hypot(dir.x,dir.y);
          if(dist<h.radius) {
            dir.x/=dist; dir.y/=dist;
            e.pos.x += dir.x*4;
            e.pos.y += dir.y*4;
          }
        });
      });
      blackHoles = blackHoles.filter(h=>h.life>0);

      // spawn waves
      if(enemies.length===0) {
        if(restTime>0) {
          restTime--;
          ctx.fillText('Rest: '+Math.floor(restTime/60), 10, 20);
        } else {
          spawnWave(wave*3);
          setWave(w=>w+1);
          restTime = 180;
        }
      }

      // draw player
      ctx.beginPath();
      ctx.arc(player.pos.x, player.pos.y, player.size, 0, Math.PI*2);
      ctx.fill();

      // draw bullets
      player.bullets.forEach(b=>{
        ctx.beginPath();
        ctx.arc(b.pos.x,b.pos.y,b.size,0,Math.PI*2);
        ctx.fill();
      });

      // draw enemies
      enemies.forEach(e=>{
        ctx.beginPath();
        ctx.fillStyle='red';
        ctx.arc(e.pos.x,e.pos.y,e.size,0,Math.PI*2);
        ctx.fill();
        ctx.fillStyle='white';
      });

      // draw black holes
      blackHoles.forEach(h=>{
        ctx.beginPath();
        ctx.strokeStyle='purple';
        ctx.arc(h.pos.x,h.pos.y,h.radius,0,Math.PI*2);
        ctx.stroke();
        ctx.strokeStyle='white';
      });

      // UI
      ctx.fillText('Wave: '+wave, 10, 40);
      ctx.fillText('Scrap: '+scrap, 10, 60);
      ctx.fillText('Ability charges: '+abilityCharges+" (press B)",10,80);

      // mini map
      mapCtx.clearRect(0,0,mapCanvas.width,mapCanvas.height);
      const scale=0.1;
      const offsetX=canvas.width/2 - player.pos.x;
      const offsetY=canvas.height/2 - player.pos.y;
      mapCtx.fillStyle='green';
      mapCtx.fillRect(mapCanvas.width/2-2,mapCanvas.height/2-2,4,4);
      mapCtx.fillStyle='red';
      enemies.forEach(e=>{
        const x=(e.pos.x+offsetX)*scale;
        const y=(e.pos.y+offsetY)*scale;
        mapCtx.fillRect(x+mapCanvas.width/2-2,y+mapCanvas.height/2-2,4,4);
      });
    }
    spawnWave(3);
    gameLoop();

    // cleanup
    return ()=>{
      window.removeEventListener('keydown', e=> keys[e.code] = true);
      window.removeEventListener('keyup', e=> keys[e.code] = false);
    };
  }, [wave]);

  function buyDamage() {
    if(scrap>=5){ setScrap(s=>s-5); }
  }
  function buyAbility(){
    if(scrap>=10){ setScrap(s=>s-10); setAbilityCharges(c=>c+1);}  }

  return (
    <div>
      <canvas id="gameCanvas" ref={canvasRef}></canvas>
      <canvas id="miniMap" ref={miniMapRef} width="150" height="150"></canvas>
      <div style={{position:'absolute',bottom:10,left:10}}>
        <button onClick={buyDamage}>Upgrade Damage (5 scrap)</button>
        <button onClick={buyAbility}>Buy Black Hole (10 scrap)</button>
      </div>
    </div>
  );
}

ReactDOM.render(<Game />, document.getElementById('root'));
