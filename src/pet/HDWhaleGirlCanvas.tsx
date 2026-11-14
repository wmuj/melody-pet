import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { PetRendererHandle } from './ProceduralPetCanvas';
import type { SpritePetProps } from './SpritePetCanvas';
import type { PetReactionKey } from '../types';

const PLATES = {
  idle: new URL('../assets/whale-girl-hd/idle.png', import.meta.url).href,
  blink: new URL('../assets/whale-girl-hd/blink.png', import.meta.url).href,
  speaking: new URL('../assets/whale-girl-hd/speaking.png', import.meta.url).href,
  speakingBlink: new URL('../assets/whale-girl-hd/speaking-blink.png', import.meta.url).href,
  headpat: new URL('../assets/whale-girl-hd/headpat.png', import.meta.url).href,
  fed: new URL('../assets/whale-girl-hd/fed.png', import.meta.url).href,
  drag: new URL('../assets/whale-girl-hd/drag.png', import.meta.url).href,
  run: new URL('../assets/whale-girl-hd/run.png', import.meta.url).href,
};
export const HD_WHALE_PREVIEW = PLATES.idle;
type Pose = keyof typeof PLATES;
type Props = Omit<SpritePetProps, 'url' | 'version'> & { preview?: boolean };
const length: Partial<Record<PetReactionKey, number>> = { feed: 2600, land: 700, wake: 1500, wave: 1400 };

function heart(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save(); ctx.translate(x, y); ctx.scale(.65, .65); ctx.fillStyle = '#e999b4';
  ctx.beginPath(); ctx.moveTo(0, 5); ctx.bezierCurveTo(-15,-4,-7,-14,0,-7); ctx.bezierCurveTo(7,-14,15,-4,0,5); ctx.fill(); ctx.restore();
}
function fish(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  ctx.save(); ctx.translate(x,y); ctx.scale(scale,scale); ctx.fillStyle='#e8b270'; ctx.strokeStyle='#b78751'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.ellipse(0,0,10,6,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(8,0); ctx.lineTo(18,-7); ctx.lineTo(18,7); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#715644'; ctx.beginPath(); ctx.arc(-5,-1,1.3,0,Math.PI*2); ctx.fill(); ctx.restore();
}

/** A continuous textured mesh moves the feet and trailing hair without low-resolution atlas cells. */
function drawRunning(ctx: CanvasRenderingContext2D, img: HTMLImageElement, width: number, height: number, phase: number) {
  const columns=10, rows=12;
  const vertices: { sx:number; sy:number; x:number; y:number }[]=[];
  for(let y=0;y<=rows;y++) for(let x=0;x<=columns;x++) {
    const u=x/columns, v=y/rows;
    const feet=Math.max(0,(v-.7)/.3);
    const hair=Math.max(0,(u-.65)/.35)*Math.max(0,1-Math.abs(v-.58)*3);
    vertices.push({sx:u*img.naturalWidth,sy:v*img.naturalHeight,
      x:u*width+Math.sin(phase+v*3)*hair*3,
      y:v*height+Math.sin(phase+(u<.5?0:Math.PI))*feet*5+Math.sin(phase*.8)*hair*3});
  }
  const draw=(a:typeof vertices[number],b:typeof vertices[number],c:typeof vertices[number])=>{
    const den=a.sx*(b.sy-c.sy)+b.sx*(c.sy-a.sy)+c.sx*(a.sy-b.sy);
    const A=(a.x*(b.sy-c.sy)+b.x*(c.sy-a.sy)+c.x*(a.sy-b.sy))/den;
    const B=(a.y*(b.sy-c.sy)+b.y*(c.sy-a.sy)+c.y*(a.sy-b.sy))/den;
    const C=(a.x*(c.sx-b.sx)+b.x*(a.sx-c.sx)+c.x*(b.sx-a.sx))/den;
    const D=(a.y*(c.sx-b.sx)+b.y*(a.sx-c.sx)+c.y*(b.sx-a.sx))/den;
    const E=a.x-A*a.sx-C*a.sy, F=a.y-B*a.sx-D*a.sy;
    const cx=(a.x+b.x+c.x)/3,cy=(a.y+b.y+c.y)/3;
    ctx.save();ctx.beginPath();
    [a,b,c].forEach((v,i)=>{const d=Math.hypot(v.x-cx,v.y-cy)||1;const x=v.x+(v.x-cx)/d*.35,y=v.y+(v.y-cy)/d*.35;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);});
    ctx.closePath();ctx.clip();ctx.transform(A,B,C,D,E,F);ctx.drawImage(img,0,0);ctx.restore();
  };
  for(let y=0;y<rows;y++) for(let x=0;x<columns;x++) {
    const i=y*(columns+1)+x;draw(vertices[i],vertices[i+1],vertices[i+columns+1]);
    draw(vertices[i+1],vertices[i+columns+2],vertices[i+columns+1]);
  }
}

export const HDWhaleGirlCanvas = forwardRef<PetRendererHandle,Props>((props,ref)=>{
  const canvasRef=useRef<HTMLCanvasElement>(null),maskRef=useRef<HTMLCanvasElement|null>(null);
  const live=useRef(props);live.current=props;
  const reaction=useRef({kind:'' as PetReactionKey|'',start:0,until:0});
  const region=useRef({x:0,y:0,w:1,h:1,flip:false});
  const [failed,setFailed]=useState(false);
  useImperativeHandle(ref,()=>({
    isOpaqueAt(x,y){const c=canvasRef.current,m=maskRef.current;if(!c||!m)return false;const r=c.getBoundingClientRect();const px=Math.floor((x-r.left)*m.width/r.width),py=Math.floor((y-r.top)*m.height/r.height);return px>=0&&py>=0&&px<m.width&&py<m.height&&(m.getContext('2d',{willReadFrequently:true})?.getImageData(px,py,1,1).data[3]||0)>96;},
    touchZoneAt(x,y){const r=canvasRef.current?.getBoundingClientRect(),p=region.current;let nx=(x-(r?.left||0)-p.x)/p.w;const ny=(y-(r?.top||0)-p.y)/p.h;if(p.flip)nx=1-nx;return nx>.72&&ny>.46?'tail':ny<.55?'head':'body';},
    triggerReaction(kind){const now=performance.now();reaction.current={kind,start:now,until:now+(length[kind]||1900)};},
    cancelReaction(){reaction.current.until=0;},
  }),[]);
  useEffect(()=>{
    const canvas=canvasRef.current!,ctx=canvas.getContext('2d')!;
    const mask=document.createElement('canvas');maskRef.current=mask;const hit=mask.getContext('2d',{willReadFrequently:true})!;
    const plates={} as Record<Pose,HTMLImageElement>;let ready=false,disposed=false,raf=0,last=0;
    let blinkAt=performance.now()+2800,blinkUntil=0,tilt=0,bounce=0,lastMoving=false,settleAt=-1000;
    let previousSleep=false,sleepBlend=0;
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
    Promise.all(Object.entries(PLATES).map(([key,url])=>new Promise<void>((resolve,reject)=>{const img=new Image();img.onload=()=>{plates[key as Pose]=img;resolve();};img.onerror=reject;img.src=url;}))).then(()=>{ready=true;}).catch(()=>{if(!disposed)setFailed(true);});
    const render=(now:number)=>{
      raf=requestAnimationFrame(render);if(!ready||now-last<32||document.visibilityState==='hidden')return;
      const dt=Math.min(.08,(now-(last||now))/1000);last=now;const p=live.current;
      const dpr=window.devicePixelRatio||1;
      if(canvas.width!==Math.round(p.width*dpr)||canvas.height!==Math.round(p.height*dpr)){canvas.width=mask.width=Math.round(p.width*dpr);canvas.height=mask.height=Math.round(p.height*dpr);}
      for(const surface of [ctx,hit]){surface.setTransform(dpr,0,0,dpr,0,0);surface.clearRect(0,0,p.width,p.height);surface.imageSmoothingEnabled=true;surface.imageSmoothingQuality='high';}
      const sleep=p.action==='sleep',dragged=p.action==='drag',moving=p.motion.moving&&!sleep&&!dragged;
      if(sleep||dragged)reaction.current.until=0;
      if(previousSleep&&!sleep){reaction.current={kind:'wake',start:now,until:now+1500};}
      previousSleep=sleep;
      const r=reaction.current,active=now<r.until,age=now-r.start;
      if(now>blinkAt){blinkUntil=now+165;blinkAt=now+2800+Math.random()*2500;}
      const eyesClosed=sleep||now<blinkUntil;
      const mouthOpen=p.speaking&&!sleep&&!dragged&&Math.sin(now*.021)>.05;
      let pose:Pose=eyesClosed?(mouthOpen?'speakingBlink':'blink'):(mouthOpen?'speaking':'idle');
      if(dragged)pose='drag';
      else if(active&&r.kind==='feed'&&age>850)pose='fed';
      else if(active&&r.kind==='full')pose='fed';
      else if(active&&['tap','tickle','tail'].includes(r.kind))pose='headpat';
      else if(moving)pose='run';
      const img=plates[pose];const scale=Math.min(p.width*(p.preview?.94:.76)/img.naturalWidth,p.height*(p.preview?.83:.52)/img.naturalHeight);
      const w=img.naturalWidth*scale,h=img.naturalHeight*scale,cx=p.width/2,ground=p.height*(p.preview?.91:.75);
      sleepBlend+=(Number(sleep)-sleepBlend)*Math.min(1,dt*4);
      const mouse=p.cursorOffsetRef.current;
      const desiredTilt=dragged?p.dragTiltRef.current:moving?p.motion.direction*.055:sleepBlend*.08;
      // Keep cursor attention subtle; it must never reveal neighboring atlas cells.
      const attention=!sleep&&!dragged&&!moving&&!active&&!reduced.matches?Math.max(-.018,Math.min(.018,mouse.dx/18000)):0;
      tilt+=(desiredTilt+attention-tilt)*Math.min(1,dt*11);
      const energy=!sleep&&p.audioFrameRef.current.active?p.audioFrameRef.current.beatPulse*3:0;
      const phase=now*(p.motion.pace==='run'?.021:.014);
      const hop=dragged?8:moving?Math.abs(Math.sin(phase))*4:reduced.matches?0:Math.sin(now*.0025)*1.15+energy;
      bounce+=(hop-bounce)*Math.min(1,dt*14);
      if(lastMoving&&!moving)settleAt=now;lastMoving=moving;
      const landed=active&&r.kind==='land'?age:now-settleAt;
      const squash=landed>=0&&landed<600?Math.sin(landed/65)*Math.exp(-landed/160)*.06:0;
      const flip=moving&&p.motion.direction===1;
      region.current={x:cx-w/2,y:ground-h,w,h,flip};
      if(!dragged){ctx.fillStyle='#35558116';ctx.beginPath();ctx.ellipse(cx,ground-4,w*.3,4.5,0,0,Math.PI*2);ctx.fill();}
      for(const surface of [ctx,hit]){
        surface.save();surface.translate(cx,ground-bounce);surface.rotate(tilt);surface.scale((flip?-1:1)*(1+squash),1-squash+(sleep?Math.sin(now*.0018)*.004:0));surface.translate(-w/2,-h);
        if(moving&&!reduced.matches)drawRunning(surface,img,w,h,phase);else surface.drawImage(img,0,0,w,h);surface.restore();
      }
      if(active&&['tap','tail','tickle'].includes(r.kind))for(let i=0;i<4;i++){const a=(age/1200+i*.16)%1.3;ctx.globalAlpha=Math.max(0,1-a);heart(ctx,cx+(i-1.5)*19,ground-h*.68-a*36);}
      ctx.globalAlpha=1;
      if(active&&r.kind==='feed'&&age<900){const t=Math.min(1,age/900),ease=1-Math.pow(1-t,3);fish(ctx,cx+82-94*ease,ground-h*.46-Math.sin(t*Math.PI)*18,t>.83?(1-t)/.17:1);}
      if(sleep){ctx.fillStyle='#87a4ce';ctx.font='600 15px Segoe UI';ctx.fillText('z',cx+w*.34,ground-h*.65-Math.sin(now*.002)*3);}
      canvas.dataset.pose=pose;canvas.dataset.renderMode='hd';canvas.dataset.reaction=active?r.kind:'';
      canvas.dataset.sourceSize=`${img.naturalWidth}x${img.naturalHeight}`;
    };raf=requestAnimationFrame(render);
    return()=>{disposed=true;cancelAnimationFrame(raf);maskRef.current=null;};
  },[]);
  return <><canvas ref={canvasRef} className="pet-canvas" aria-label="高清蓝发鲸娘" style={{width:props.width,height:props.height}}/>{failed&&<span className="sprite-load-error" role="alert">鲸娘素材没有加载完成，请重新打开小屋。</span>}</>;
});
