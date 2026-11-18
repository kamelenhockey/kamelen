// Afstellen van het voorspelmodel op alle uitslagen van de poule (backtest).
// Gebruik: node scripts/model-afstellen.mjs
import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);
const module = { exports: {} };
const DATA = require('../competitie.json');
const R = DATA.uitslagen.filter(m => /^\d+-\d+$/.test(String(m.score||''))).sort((a,b)=>a.datum.localeCompare(b.datum));
const sc = m => m.score.split('-').map(Number);
function poisson(l,k){let p=Math.exp(-l);for(let i=1;i<=k;i++)p*=l/i;return p;}
function probs(lh,lu,rho){let W=0,G=0,V=0,best={W:[0,0,-1],G:[0,0,-1],V:[0,0,-1]};
 for(let i=0;i<=14;i++)for(let j=0;j<=14;j++){let p=poisson(lh,i)*poisson(lu,j);
  if(rho){ if(i===0&&j===0)p*=1-lh*lu*rho; else if(i===0&&j===1)p*=1+lh*rho; else if(i===1&&j===0)p*=1+lu*rho; else if(i===1&&j===1)p*=1-rho; }
  const u=i>j?'W':i===j?'G':'V'; if(u==='W')W+=p;else if(u==='G')G+=p;else V+=p; if(p>best[u][2])best[u]=[i,j,p];}
 const t=W+G+V; return {W:W/t,G:G/t,V:V/t,best};}
function model(P, thuis, uit, datum){
  const res = R.filter(m=>m.datum<datum); if(res.length<P.min) return null;
  const ref=new Date(datum), gew=m=>P.hl>=999?1:Math.pow(.5,Math.max(0,(ref-new Date(m.datum))/864e5)/P.hl);
  let hG=0,aG=0,w=0; res.forEach(m=>{const[a,b]=sc(m),g=gew(m);hG+=a*g;aG+=b*g;w+=g;});
  let H=hG/w,A=aG/w; if(!P.home){H=A=(H+A)/2;} const gem=(H+A)/2;
  const kr=t=>{let gf=0,ga=0,n=0;res.forEach(m=>{if(m.thuis!==t&&m.uit!==t)return;let[a,b]=sc(m);const g=gew(m),th=m.thuis===t;
     if(P.cap){a=Math.min(a,P.cap);b=Math.min(b,P.cap);}
     gf+=g*(th?a/(H/gem):b/(A/gem));ga+=g*(th?b/(A/gem):a/(H/gem));n+=g;});
    return {att:(gf+P.k*gem)/(n+P.k)/gem,def:(ga+P.k*gem)/(n+P.k)/gem};};
  const kh=kr(thuis),ku=kr(uit); let lh=H*kh.att*ku.def,lu=A*ku.att*kh.def;
  const h2h=res.filter(m=>(m.thuis===thuis&&m.uit===uit)||(m.thuis===uit&&m.uit===thuis));
  if(h2h.length&&P.h2h){let vh=0,vu=0;h2h.forEach(m=>{const[a,b]=sc(m);if(m.thuis===thuis){vh+=a;vu+=b;}else{vh+=b;vu+=a;}});lh=(1-P.h2h)*lh+P.h2h*vh/h2h.length;lu=(1-P.h2h)*lu+P.h2h*vu/h2h.length;}
  return probs(lh,lu,P.rho||0);
}
function evalP(P){let goed=0,n=0,brier=0,ll=0;
  R.forEach(m=>{const v=model(P,m.thuis,m.uit,m.datum);if(!v)return;const[a,b]=sc(m),e=a>b?'W':a===b?'G':'V';
   let pick; if(P.drawT && v.G>=P.drawT && Math.abs(v.W-v.V)<P.drawM) pick='G'; else pick=v.W>=v.V&&v.W>=v.G?'W':v.V>=v.G?'V':'G';
   n++;if(pick===e)goed++; brier+=['W','G','V'].reduce((s,k)=>s+Math.pow(v[k]-(k===e?1:0),2),0); ll+=-Math.log(Math.max(1e-6,v[e]));});
  return {goed,n,acc:goed/n,brier:brier/n,ll:ll/n};}

const sc=m=>m.score.split('-').map(Number);
function eloProbs(P,thuis,uit,datum){let r={};const g=t=>r[t]??1500;
 R.filter(m=>m.datum<datum).forEach(m=>{const[a,b]=sc(m);const d=g(m.thuis)+P.H-g(m.uit),ph=1/(1+Math.pow(10,-d/400));const s=a>b?1:a===b?.5:0,mov=Math.log(Math.abs(a-b)+1)+1,delta=P.K*mov*(s-ph);r[m.thuis]=g(m.thuis)+delta;r[m.uit]=g(m.uit)-delta;});
 const d=g(thuis)+P.H-g(uit),ph=1/(1+Math.pow(10,-d/400)),pd=P.D*Math.exp(-Math.abs(d)/P.S);return {W:(1-pd)*ph,G:pd,V:(1-pd)*(1-ph)};}
const EP={K:60,H:60,D:.2,S:400}, PP={min:6,hl:30,k:3,h2h:.15,home:1,cap:6,rho:0};
for(const w of [0,.25,.4,.5,.6,.75,1]){let goed=0,n=0,ll=0;
 R.forEach(m=>{const p=model(PP,m.thuis,m.uit,m.datum);if(!p)return;const e2=eloProbs(EP,m.thuis,m.uit,m.datum);
  const v={W:w*e2.W+(1-w)*p.W,G:w*e2.G+(1-w)*p.G,V:w*e2.V+(1-w)*p.V};const[a,b]=sc(m),e=a>b?'W':a===b?'G':'V';
  const pick=v.W>=v.V&&v.W>=v.G?'W':v.V>=v.G?'V':'G';n++;if(pick===e)goed++;ll+=-Math.log(v[e]);});
 console.log('elo-gewicht',w,goed+'/'+n,(ll/n).toFixed(3));}
