import React, { useState, useRef, useEffect, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import diceSound from "../assets/sounds/dice.mp3";
import "./DicePopup.css";

// 3D Dice Component
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

const DicePopup = ({ onRoll, currentPlayer, disabled, show }) => {
  const [isRolling, setIsRolling] = useState(false);
  const [diceValue, setDiceValue] = useState(1);
  const [targetRotation, setTargetRotation] = useState([0, 0, 0]);
  const diceAudioRef = useRef(null);
  const soundTimeoutRef = useRef(null);

  useEffect(() => {
    diceAudioRef.current = new Audio(diceSound);
    diceAudioRef.current.volume = 0.5;

    return () => {
      if (soundTimeoutRef.current) {
        clearTimeout(soundTimeoutRef.current);
      }
    };
  }, []);

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

  const handleClick = () => {
    if (disabled || isRolling) return;

    setIsRolling(true);

    // Play sound after delay
    soundTimeoutRef.current = setTimeout(() => {
      playDiceSound();
    }, 1350);

    // Generate dice value
    const randomValue = Math.floor(Math.random() * 6) + 1;

    // Stop rolling and show result
    setTimeout(() => {
      setDiceValue(randomValue);
      setTargetRotation(getFaceRotation(randomValue));
      setIsRolling(false);

      // Wait 1.5 seconds before moving the pawn so user can see the number
      setTimeout(() => {
        onRoll(randomValue);
      }, 1500);
    }, 1000);
  };

  // Don't show popup if not player's turn
  if (!show) return null;

  return (
    <div className={`dice-popup-overlay ${show ? "show" : ""}`}>
      <div className="dice-popup-container">
        {/* Animated glow rings */}
        <div className="dice-popup-glow-ring ring-1"></div>
        <div className="dice-popup-glow-ring ring-2"></div>
        <div className="dice-popup-glow-ring ring-3"></div>

        {/* 3D Dice Canvas */}
        <div
          className="dice-3d-container"
          style={{
            width: "300px",
            height: "300px",
            borderRadius: "20px",
            overflow: "hidden",
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.6 : 1,
            position: "relative",
          }}
        >
          <Canvas
            camera={{ position: [0, 2, 8], fov: 50 }}
            onClick={handleClick}
          >
            <ambientLight intensity={0.8} />
            <directionalLight position={[5, 5, 5]} intensity={1.5} castShadow />
            <directionalLight position={[-5, -5, -5]} intensity={0.5} />
            <pointLight position={[0, 5, 0]} intensity={0.8} />

            <Suspense fallback={null}>
              <ProceduralDice
                rolling={isRolling}
                targetRotation={targetRotation}
                onClick={handleClick}
              />
            </Suspense>

            <OrbitControls
              enableZoom={false}
              enablePan={false}
              minPolarAngle={Math.PI / 4}
              maxPolarAngle={Math.PI / 2}
            />
          </Canvas>

          {isRolling && (
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

        {/* Info text */}
        <div className="dice-popup-info">
          <div
            className="dice-value-badge"
            style={{
              background: "linear-gradient(135deg, #667eea, #764ba2)",
              color: "white",
              padding: "10px 25px",
              borderRadius: "50px",
              boxShadow: "0 8px 20px rgba(102, 126, 234, 0.4)",
              fontSize: "28px",
              fontWeight: "bold",
              marginBottom: "10px",
            }}
          >
            {diceValue}
          </div>
          <p className="dice-popup-text">
            {isRolling ? "🎲 Rolling..." : "🎲 Click dice to roll!"}
          </p>
          <p className="dice-popup-player">
            <span
              className="player-indicator"
              style={{ backgroundColor: currentPlayer?.color }}
            ></span>
            {currentPlayer?.name}'s Turn
          </p>
        </div>

        {/* Sparkle effects */}
        <div className="sparkle sparkle-1">✨</div>
        <div className="sparkle sparkle-2">✨</div>
        <div className="sparkle sparkle-3">✨</div>
        <div className="sparkle sparkle-4">✨</div>
      </div>

      <style>{`
        @keyframes glow {
          0% { opacity: 0.3; transform: scale(1); }
          100% { opacity: 0.6; transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
};

export default DicePopup;
