import React, { useState, useRef, useEffect, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import diceSound from "../assets/sounds/dice.mp3";

// Small procedural dice used inside the popup
function ProceduralDice({ rolling, targetRotation }) {
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

  const createDots = (number, position, rotation) => {
    const dotPositions = {
      1: [[0, 0, 0]],
      2: [[-0.4, 0.4, 0], [0.4, -0.4, 0]],
      3: [[-0.4, 0.4, 0], [0, 0, 0], [0.4, -0.4, 0]],
      4: [[-0.4, 0.4, 0], [0.4, 0.4, 0], [-0.4, -0.4, 0], [0.4, -0.4, 0]],
      5: [[-0.4, 0.4, 0], [0.4, 0.4, 0], [0, 0, 0], [-0.4, -0.4, 0], [0.4, -0.4, 0]],
      6: [[-0.4, 0.4, 0], [0.4, 0.4, 0], [-0.4, 0, 0], [0.4, 0, 0], [-0.4, -0.4, 0], [0.4, -0.4, 0]],
    };

    return (
      <group position={position} rotation={rotation}>
        {dotPositions[number].map((pos, i) => (
          <mesh key={i} position={[pos[0], pos[1], 1.01]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.12, 0.12, 0.02, 32]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.8} metalness={0} />
          </mesh>
        ))}
      </group>
    );
  };

  return (
    <group ref={groupRef}>
      <RoundedBox args={[2, 2, 2]} radius={0.15} smoothness={4}>
        <meshStandardMaterial color="#ffffff" roughness={0.4} metalness={0.1} />
      </RoundedBox>

      {createDots(1, [0, 0, 0], [0, 0, 0])}
      {createDots(2, [0, 0, 0], [0, Math.PI, 0])}
      {createDots(3, [0, 0, 0], [0, Math.PI / 2, 0])}
      {createDots(4, [0, 0, 0], [0, -Math.PI / 2, 0])}
      {createDots(5, [0, 0, 0], [Math.PI / 2, 0, 0])}
      {createDots(6, [0, 0, 0], [-Math.PI / 2, 0, 0])}
    </group>
  );
}

const DicePopup = ({ onRoll, currentPlayer, disabled, show, setShow }) => {
  const [isRolling, setIsRolling] = useState(false);
  const [diceValue, setDiceValue] = useState(null);
  const [targetRotation, setTargetRotation] = useState([0, 0, 0]);
  const diceAudioRef = useRef(null);

  useEffect(() => {
    diceAudioRef.current = new Audio(diceSound);
    diceAudioRef.current.volume = 0.6;
  }, []);

  const playDiceSound = () => {
    if (diceAudioRef.current) {
      diceAudioRef.current.currentTime = 0;
      diceAudioRef.current.play().catch((err) => console.log("Dice audio play failed:", err));
    }
  };

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

  const handleRollClick = () => {
    if (disabled || isRolling) return;
    setIsRolling(true);
    playDiceSound();

    const randomValue = Math.floor(Math.random() * 6) + 1;

    // simulate rolling then settle on face
    setTimeout(() => {
      setDiceValue(randomValue);
      setTargetRotation(getFaceRotation(randomValue));
      setIsRolling(false);

      // show the number briefly then call parent's onRoll and close
      setTimeout(() => {
        if (onRoll) onRoll(randomValue);
        if (setShow) setShow(false);
        setDiceValue(null);
      }, 1200);
    }, 1000);
  };

  if (!show) return null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: "linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)", borderRadius: 24, padding: 36, boxShadow: "0 20px 60px rgba(0,0,0,0.5)", display: "flex", flexDirection: "column", alignItems: "center", gap: 24, minWidth: 360 }}>
        <h2 style={{ margin: 0, color: "white", fontSize: 20 }}>🎲 Roll the Dice!</h2>

        <div style={{ width: 300, height: 300, background: "rgba(255,255,255,0.06)", borderRadius: 16, overflow: "hidden" }}>
          <Canvas camera={{ position: [0, 2, 8], fov: 50 }}>
            <ambientLight intensity={0.8} />
            <directionalLight position={[5, 5, 5]} intensity={1.2} />
            <pointLight position={[0, 5, 0]} intensity={0.6} />
            <Suspense fallback={null}>
              <ProceduralDice rolling={isRolling} targetRotation={targetRotation} />
            </Suspense>
            <OrbitControls enableZoom={false} enablePan={false} enableRotate={false} />
          </Canvas>
        </div>

        {diceValue && !isRolling && (
          <div style={{ background: "white", color: "#333", fontSize: 40, fontWeight: 700, width: 110, height: 110, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 12px 40px rgba(0,0,0,0.3)" }}>
            {diceValue}
          </div>
        )}

        {!isRolling && !diceValue && (
          <button onClick={handleRollClick} disabled={disabled} style={{ padding: "12px 28px", borderRadius: 28, border: "none", background: "white", color: "#8e44ad", fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", boxShadow: "0 8px 24px rgba(0,0,0,0.2)" }}>
            Roll Now!
          </button>
        )}

        {isRolling && (
          <div style={{ color: "white", fontSize: 16, fontWeight: 600 }}>🎲 Rolling...</div>
        )}
      </div>
    </div>
  );
};

export default DicePopup;
