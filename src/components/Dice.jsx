import React, { useRef, useState, useEffect, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import diceSound from "../assets/sounds/dice.mp3";

// Procedural 3D Dice with FLAT dots STUCK to surface
function ProceduralDice({ rolling, targetRotation, onClick }) {
  const groupRef = useRef();

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    if (rolling) {
      groupRef.current.rotation.x += delta * 10;
      groupRef.current.rotation.y += delta * 8;
      groupRef.current.rotation.z += delta * 6;
    } else if (targetRotation) {
      groupRef.current.rotation.x = THREE.MathUtils.lerp(
        groupRef.current.rotation.x,
        targetRotation[0],
        0.1
      );
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        targetRotation[1],
        0.1
      );
      groupRef.current.rotation.z = THREE.MathUtils.lerp(
        groupRef.current.rotation.z,
        targetRotation[2],
        0.1
      );
    }
  });

  // Create FLAT dots STUCK to dice surface
  const createDots = (number, position, rotation) => {
    const dotPositions = {
      1: [[0, 0, 0]],
      2: [
        [-0.4, 0.4, 0],
        [0.4, -0.4, 0],
      ],
      3: [
        [-0.4, 0.4, 0],
        [0, 0, 0],
        [0.4, -0.4, 0],
      ],
      4: [
        [-0.4, 0.4, 0],
        [0.4, 0.4, 0],
        [-0.4, -0.4, 0],
        [0.4, -0.4, 0],
      ],
      5: [
        [-0.4, 0.4, 0],
        [0.4, 0.4, 0],
        [0, 0, 0],
        [-0.4, -0.4, 0],
        [0.4, -0.4, 0],
      ],
      6: [
        [-0.4, 0.4, 0],
        [0.4, 0.4, 0],
        [-0.4, 0, 0],
        [0.4, 0, 0],
        [-0.4, -0.4, 0],
        [0.4, -0.4, 0],
      ],
    };

    return (
      <group position={position} rotation={rotation}>
        {dotPositions[number].map((pos, i) => (
          <mesh
            key={i}
            position={[pos[0], pos[1], 1.01]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[0.15, 0.15, 0.02, 32]} />
            <meshStandardMaterial
              color="#1a1a1a"
              roughness={0.8}
              metalness={0}
            />
          </mesh>
        ))}
      </group>
    );
  };

  return (
    <group ref={groupRef} onClick={onClick}>
      <RoundedBox args={[2, 2, 2]} radius={0.15} smoothness={4}>
        <meshStandardMaterial color="#ffffff" roughness={0.4} metalness={0.1} />
      </RoundedBox>

      {/* Face 1 - Front (Z+) */}
      {createDots(1, [0, 0, 0], [0, 0, 0])}

      {/* Face 2 - Back (Z-) */}
      {createDots(2, [0, 0, 0], [0, Math.PI, 0])}

      {/* Face 3 - Right (X+) */}
      {createDots(3, [0, 0, 0], [0, Math.PI / 2, 0])}

      {/* Face 4 - Left (X-) */}
      {createDots(4, [0, 0, 0], [0, -Math.PI / 2, 0])}

      {/* Face 5 - Top (Y+) */}
      {createDots(5, [0, 0, 0], [Math.PI / 2, 0, 0])}

      {/* Face 6 - Bottom (Y-) */}
      {createDots(6, [0, 0, 0], [-Math.PI / 2, 0, 0])}
    </group>
  );
}

export default function Dice3D({ onRoll, disabled, currentValue }) {
  const [rolling, setRolling] = useState(false);
  const [displayValue, setDisplayValue] = useState(currentValue || 1);
  const [targetRotation, setTargetRotation] = useState([0, 0, 0]);
  const diceAudioRef = useRef(null);
  const soundTimeoutRef = useRef(null);

  // Initialize dice sound
  useEffect(() => {
    diceAudioRef.current = new Audio(diceSound);
    diceAudioRef.current.volume = 0.5;

    // Cleanup timeout on unmount
    return () => {
      if (soundTimeoutRef.current) {
        clearTimeout(soundTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!rolling && currentValue) {
      setDisplayValue(currentValue);
      setTargetRotation(getFaceRotation(currentValue));
    }
  }, [currentValue, rolling]);

  const getFaceRotation = (value) => {
    const rotations = {
      1: [0, 0, 0],
      2: [0, Math.PI, 0],
      3: [0, -Math.PI / 2, 0],
      4: [0, Math.PI / 2, 0],
      5: [-Math.PI / 2, 0, 0],
      6: [Math.PI / 2, 0, 0],
    };
    return rotations[value];
  };

  const playDiceSound = () => {
    if (diceAudioRef.current) {
      diceAudioRef.current.currentTime = 0;
      diceAudioRef.current
        .play()
        .catch((err) => console.log("Dice audio play failed:", err));
    }
  };

  const handleRoll = () => {
    if (rolling || disabled) return;

    // Start rolling immediately
    setRolling(true);

    // Play sound after 2 seconds
    soundTimeoutRef.current = setTimeout(() => {
      playDiceSound();
    }, 1350);

    const newNumber = Math.floor(Math.random() * 6) + 1;

    // Stop rolling after 3 seconds
    setTimeout(() => {
      setDisplayValue(newNumber);
      setTargetRotation(getFaceRotation(newNumber));
      setRolling(false);
      if (onRoll) onRoll(newNumber);
    }, 1000);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "20px",
        padding: "20px",
        width: "100%",
        maxWidth: "500px",
        margin: "0 auto",
      }}
    >
      <div
        style={{
          width: "100%",
          aspectRatio: "1",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          borderRadius: "20px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          position: "relative",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <Canvas camera={{ position: [0, 2, 8], fov: 50 }} onClick={handleRoll}>
          <ambientLight intensity={0.8} />
          <directionalLight position={[5, 5, 5]} intensity={1.5} castShadow />
          <directionalLight position={[-5, -5, -5]} intensity={0.5} />
          <pointLight position={[0, 5, 0]} intensity={0.8} />

          <Suspense fallback={null}>
            <ProceduralDice
              rolling={rolling}
              targetRotation={targetRotation}
              onClick={handleRoll}
            />
          </Suspense>

          <OrbitControls
            enableZoom={false}
            enablePan={false}
            minPolarAngle={Math.PI / 4}
            maxPolarAngle={Math.PI / 2}
          />
        </Canvas>

        {rolling && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background:
                "radial-gradient(circle, rgba(255,215,0,0.3), transparent 70%)",
              borderRadius: "20px",
              animation: "glow 0.5s ease-in-out infinite alternate",
              pointerEvents: "none",
            }}
          />
        )}
      </div>

      <div
        style={{
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          width: "100%",
        }}
      >
        <div
          style={{
            background: "linear-gradient(135deg, #667eea, #764ba2)",
            color: "white",
            padding: "15px 30px",
            borderRadius: "50px",
            boxShadow: "0 8px 20px rgba(102, 126, 234, 0.4)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "5px",
          }}
        >
          <span
            style={{
              fontSize: "32px",
              fontWeight: "bold",
              textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
            }}
          >
            {displayValue}
          </span>
          <span style={{ fontSize: "12px", opacity: 0.9, fontWeight: 500 }}>
            Current Roll
          </span>
        </div>

        <div style={{ fontSize: "14px", color: "#666", fontWeight: 500 }}>
          {rolling
            ? "🎲 Rolling..."
            : disabled
            ? "Wait your turn"
            : "Click dice to roll!"}
        </div>
      </div>

      <style>{`
        @keyframes glow {
          0% { opacity: 0.3; transform: scale(1); }
          100% { opacity: 0.6; transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}
