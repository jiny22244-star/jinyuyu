import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
// @ts-ignore
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
// @ts-ignore
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
// @ts-ignore
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
// @ts-ignore
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { Post } from '../types';

interface InteractiveTreeProps {
  posts: Post[];
  onClose: () => void;
}

export const InteractiveTree: React.FC<InteractiveTreeProps> = ({ posts, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(true);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [handStatus, setHandStatus] = useState<string>("等待手势...");

  // Refs for animation loop logic to avoid closure staleness
  const sceneRef = useRef<THREE.Scene | null>(null);
  const particlesRef = useRef<THREE.Group | null>(null);
  const photoSpritesRef = useRef<THREE.Sprite[]>([]);
  const expansionRef = useRef(1.0); // 0.1 (Fist) to 1.0 (Open)
  const targetExpansionRef = useRef(1.0);
  const pinchTargetRef = useRef<THREE.Sprite | null>(null);

  useEffect(() => {
    let camera: THREE.PerspectiveCamera;
    let renderer: THREE.WebGLRenderer;
    let composer: any;
    let handLandmarker: any;
    let animationFrameId: number;
    let lastVideoTime = -1;

    // --- 1. Setup Three.js Scene ---
    const initThree = () => {
      if (!containerRef.current) return;

      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x1a0500, 0.002); // Dark reddish fog for warmth
      sceneRef.current = scene;

      camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
      camera.position.set(0, 10, 40);
      camera.lookAt(0, 5, 0);

      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(window.devicePixelRatio);
      containerRef.current.appendChild(renderer.domElement);

      // Post Processing (Bloom)
      const renderScene = new RenderPass(scene, camera);
      const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 1.5, 0.4, 0.85);
      bloomPass.threshold = 0;
      bloomPass.strength = 1.2; // Glow strength
      bloomPass.radius = 0.5;

      composer = new EffectComposer(renderer);
      composer.addPass(renderScene);
      composer.addPass(bloomPass);

      // Lights
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambientLight);

      // Top Bulb Light
      const bulbLight = new THREE.PointLight(0xffaa00, 2, 100);
      bulbLight.position.set(0, 22, 0);
      scene.add(bulbLight);

      const bulbGeo = new THREE.SphereGeometry(1, 32, 32);
      const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffffaa });
      const bulb = new THREE.Mesh(bulbGeo, bulbMat);
      bulb.position.set(0, 22, 0);
      scene.add(bulb);

      createParticles(scene);
    };

    // --- 2. Create Particles ---
    const createParticles = (scene: THREE.Scene) => {
      const particleGroup = new THREE.Group();
      scene.add(particleGroup);
      particlesRef.current = particleGroup;

      const emojis = ['🎁', '🎄', '🔔', '🎅', '👔', '⭐', '🔺', '⬛', '🍪', '🦌'];
      const emojiTextures = emojis.map(createEmojiTexture);

      // Helper to distribute points in a cone/tree shape
      // Spiral equation: x = r * cos(t), z = r * sin(t), y = h
      // r scales with y (wider at bottom)
      
      const particleCount = 400; // Emojis
      const height = 40;
      const baseRadius = 15;

      // 1. Add Emoji Particles
      const geometry = new THREE.BufferGeometry();
      const positions: number[] = [];
      
      // We will actually use Sprites for emojis too so they always face camera
      // But for performance, let's use a batch of Sprites
      
      for (let i = 0; i < particleCount; i++) {
        const y = Math.random() * height; // 0 to 40
        const progress = 1 - (y / height); // 1 at bottom, 0 at top
        const r = baseRadius * progress * Math.sqrt(Math.random()); // Randomize radius slightly
        const angle = y * 5 + Math.random() * Math.PI * 2; // Spiral + random

        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;

        // Create Sprite
        const tex = emojiTextures[Math.floor(Math.random() * emojiTextures.length)];
        const material = new THREE.SpriteMaterial({ 
          map: tex, 
          transparent: true,
          opacity: 0.9,
          color: 0xffffff
        });
        const sprite = new THREE.Sprite(material);
        
        // Store initial "Tree" position in userData
        sprite.userData = {
          treePos: new THREE.Vector3(x, y - height/2 + 5, z),
          randomOffset: new THREE.Vector3((Math.random()-0.5)*50, (Math.random()-0.5)*50, (Math.random()-0.5)*50), // For scatter
          speed: 0.02 + Math.random() * 0.05
        };
        sprite.position.copy(sprite.userData.treePos);
        
        // Scale random
        const scale = 0.5 + Math.random() * 1.0;
        sprite.scale.set(scale, scale, 1);
        
        particleGroup.add(sprite);
      }

      // 2. Add Photo Particles
      if (posts.length > 0) {
        posts.forEach((post, i) => {
          const imgUrl = post.imageUrl || post.image.previewUrl;
          const loader = new THREE.TextureLoader();
          loader.load(imgUrl, (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            const mat = new THREE.SpriteMaterial({ map: tex });
            const sprite = new THREE.Sprite(mat);
            
            // Distribute photos evenly in the spiral
            const y = (i / posts.length) * height;
            const progress = 1 - (y / height);
            const r = (baseRadius + 2) * progress; // Slightly outside
            const angle = y * 5; 

            const x = Math.cos(angle) * r;
            const z = Math.sin(angle) * r;

            sprite.userData = {
              treePos: new THREE.Vector3(x, y - height/2 + 5, z),
              isPhoto: true,
              originalScale: new THREE.Vector3(3, 3, 1),
              id: post.id
            };
            
            sprite.position.copy(sprite.userData.treePos);
            sprite.scale.set(3, 3, 1); // Photos are bigger
            
            particleGroup.add(sprite);
            photoSpritesRef.current.push(sprite);
          });
        });
      }
    };

    const createEmojiTexture = (emoji: string) => {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.font = '80px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(emoji, 64, 64);
      }
      return new THREE.CanvasTexture(canvas);
    };

    // --- 3. Hand Tracking Setup ---
    const setupMediaPipe = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );
        handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });
        startWebcam();
      } catch (e) {
        console.error("MediaPipe setup error:", e);
        setHandStatus("无法加载手势识别");
      }
    };

    const startWebcam = async () => {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.addEventListener('loadeddata', () => {
              setPermissionGranted(true);
              setLoading(false);
              setHandStatus("手势控制：张开手=旋转/扩散，握拳=聚合，捏合=抓取照片");
            });
          }
        } catch (err) {
          console.error("Webcam error:", err);
          setHandStatus("需要摄像头权限来控制");
          setLoading(false);
        }
      }
    };

    // --- 4. Animation Loop ---
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // MediaPipe Detection
      if (videoRef.current && handLandmarker && permissionGranted) {
        if (videoRef.current.currentTime !== lastVideoTime) {
          lastVideoTime = videoRef.current.currentTime;
          const results = handLandmarker.detectForVideo(videoRef.current, performance.now());
          
          if (results.landmarks && results.landmarks.length > 0) {
            const landmarks = results.landmarks[0];
            
            // 1. Calculate Openness (Tip of fingers dist from palm base (0))
            // Simplified: Dist between Index Tip (8) and Wrist (0)
            // Normalized roughly: Open ~ 0.5-0.8, Fist ~ 0.2-0.3
            const wrist = landmarks[0];
            const indexTip = landmarks[8];
            const dist = Math.sqrt(
              Math.pow(indexTip.x - wrist.x, 2) + 
              Math.pow(indexTip.y - wrist.y, 2)
            );
            
            // Map distance to expansion
            // dist > 0.4 -> Open (1.0)
            // dist < 0.2 -> Fist (0.1)
            const targetExp = Math.max(0.1, Math.min(1.0, (dist - 0.2) * 4)); 
            targetExpansionRef.current = targetExp;

            // 2. Pinch Detection (Thumb Tip 4 and Index Tip 8)
            const thumbTip = landmarks[4];
            const pinchDist = Math.sqrt(
              Math.pow(indexTip.x - thumbTip.x, 2) + 
              Math.pow(indexTip.y - thumbTip.y, 2)
            );

            if (pinchDist < 0.05) {
               // Pinching
               if (!pinchTargetRef.current) {
                 // Find nearest photo to focus? Random for now or center
                 // Just pick a random one if none selected
                 if (photoSpritesRef.current.length > 0) {
                    const idx = Math.floor(Math.random() * photoSpritesRef.current.length);
                    pinchTargetRef.current = photoSpritesRef.current[idx];
                 }
               }
            } else {
               // Release
               pinchTargetRef.current = null;
            }

            setHandStatus(targetExp < 0.3 ? "✊ 聚合" : pinchDist < 0.05 ? "🤏 抓取" : "🖐 扩散");

          } else {
            // No hand, default to slow drift open
            targetExpansionRef.current = 1.0;
          }
        }
      }

      // Smooth Expansion
      expansionRef.current += (targetExpansionRef.current - expansionRef.current) * 0.1;

      // Update Particles
      if (particlesRef.current) {
        // Rotate the whole group based on expansion (Open = faster rotate)
        particlesRef.current.rotation.y += 0.002 + (expansionRef.current * 0.005);

        particlesRef.current.children.forEach((child: any) => {
          if (!child.userData.treePos) return;

          const treePos = child.userData.treePos as THREE.Vector3;
          
          if (child === pinchTargetRef.current) {
            // This is the grabbed photo
            // Move towards camera center and scale up
            const targetPos = new THREE.Vector3(0, 5, 25); // Close to camera
            child.position.lerp(targetPos, 0.1);
            child.scale.lerp(new THREE.Vector3(12, 12, 1), 0.1);
            // Material glow is handled by bloom automatically if it's bright, 
            // but sprites are mostly texture. Bloom passes bright pixels.
            child.material.color.setHex(0xffffff); // Full brightness
          } else {
            // Normal particle behavior
            // Mix between Tree Shape (expansion=0.1) and Scattered (expansion=1.0)
            // Wait, logic: Fist(0.1) = Aggregate to Tree. Open(1.0) = Scatter/Explode.
            // Let's refine:
            // Fist = Tightly packed ball/tree. Open = Expanded tree or cloud.
            
            // Let's say:
            // Exp 0 (Fist) = Perfect Tree Shape (userData.treePos)
            // Exp 1 (Open) = Exploded outwards
            
            // Actually prompt says: "Fist = Aggregate to Christmas Tree", "Open = Scatter/Exploded Tree"
            
            // So TreePos is the TARGET for FIST.
            // RandomOffset is added for OPEN.
            
            // Logic Flip:
            // User Fist -> expansion goes to 0.1.
            // User Open -> expansion goes to 1.0.
            
            // Pos = TreePos + (RandomOffset * expansion * 5)
            // But if Fist (0.1), it should be Tree.
            // If Open (1.0), it should be scattered.
            
            // However, the prompt also says "When open... rotate... Christmas tree composed of particles".
            // Maybe "Scatter" just means looser tree?
            
            const scatterFactor = Math.max(0, (expansionRef.current - 0.2) * 2); // 0 at fist, 1.6 at open
            
            const targetX = treePos.x * (1 + scatterFactor);
            const targetY = treePos.y * (1 + scatterFactor * 0.5);
            const targetZ = treePos.z * (1 + scatterFactor);
            
            child.position.x += (targetX - child.position.x) * 0.1;
            child.position.y += (targetY - child.position.y) * 0.1;
            child.position.z += (targetZ - child.position.z) * 0.1;
            
            // Restore scale
            if (child.userData.isPhoto) {
               child.scale.lerp(child.userData.originalScale, 0.1);
            }
          }
        });
      }

      composer.render();
    };

    initThree();
    setupMediaPipe();
    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      composer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (renderer) renderer.dispose();
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      if (videoRef.current && videoRef.current.srcObject) {
         const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
         tracks.forEach(track => track.stop());
      }
    };
  }, [posts]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
      {/* 3D Container */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full cursor-pointer" />

      {/* Hidden Video for MediaPipe */}
      <video ref={videoRef} className="absolute top-0 left-0 w-32 h-24 opacity-0 pointer-events-none" autoPlay playsInline muted />

      {/* UI Overlay */}
      <div className="absolute top-6 left-6 z-50 text-white pointer-events-none">
        <h2 className="text-2xl font-bold text-amber-400 drop-shadow-md">🎄 3D 圣诞树</h2>
        <div className="flex items-center gap-2 mt-2 bg-black/40 px-3 py-1 rounded-full backdrop-blur-md border border-white/20">
          <div className={`w-2 h-2 rounded-full ${permissionGranted ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
          <span className="text-sm font-medium">{handStatus}</span>
        </div>
      </div>

      <button 
        onClick={onClose}
        className="absolute top-6 right-6 z-50 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 backdrop-blur-md border border-white/20 transition-all transform hover:scale-110"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Loading Screen */}
      {loading && (
        <div className="absolute inset-0 z-[60] bg-black flex flex-col items-center justify-center">
          <div className="w-64">
            <div className="flex justify-between text-amber-500 mb-2 font-bold tracking-wider text-sm">
              <span>LOADING 3D ENGINE</span>
              <span>100%</span>
            </div>
            <div className="loader-bar">
              <div className="loader-progress w-full"></div>
            </div>
          </div>
          <p className="mt-4 text-gray-400 text-xs">正在初始化摄像头与粒子系统...</p>
        </div>
      )}
    </div>
  );
};