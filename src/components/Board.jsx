import React, { useRef, useState, Suspense, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useTexture } from "@react-three/drei";
import * as THREE from "three";

// Snake Pawn - 3D snake shape with smooth movement
function SnakePawn({ position, color, isActive, name }) {
  const groupRef = useRef();
  const [hovered, setHovered] = useState(false);
  const [currentPos, setCurrentPos] = useState(position);
  const targetPos = useRef(position);

  // Update target position when prop changes
  useEffect(() => {
    targetPos.current = position;
  }, [position]);

  useFrame((state) => {
    if (groupRef.current) {
      // Smooth interpolation to target position
      const lerpFactor = 0.1;
      currentPos[0] += (targetPos.current[0] - currentPos[0]) * lerpFactor;
      currentPos[1] += (targetPos.current[1] - currentPos[1]) * lerpFactor;
      currentPos[2] += (targetPos.current[2] - currentPos[2]) * lerpFactor;

      groupRef.current.position.set(
        currentPos[0],
        currentPos[1],
        currentPos[2]
      );

      // Active player animation
      if (isActive) {
        const baseY = currentPos[1];
        groupRef.current.position.y =
          baseY + Math.sin(state.clock.elapsedTime * 3) * 0.05;
        groupRef.current.rotation.y = state.clock.elapsedTime * 0.8;
      }
    }
  });

  return (
    <group
      ref={groupRef}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      {/* Coiled body - bottom ring */}
      <mesh position={[0, 0, 0]} castShadow>
        <torusGeometry args={[0.12, 0.06, 16, 32]} />
        <meshStandardMaterial
          color={color}
          roughness={0.4}
          metalness={0.3}
          emissive={isActive ? color : "#000000"}
          emissiveIntensity={isActive ? 0.4 : 0}
        />
      </mesh>

      {/* Middle ring */}
      <mesh position={[0, 0.05, 0]} castShadow>
        <torusGeometry args={[0.08, 0.05, 16, 32]} />
        <meshStandardMaterial
          color={color}
          roughness={0.4}
          metalness={0.3}
          emissive={isActive ? color : "#000000"}
          emissiveIntensity={isActive ? 0.3 : 0}
        />
      </mesh>

      {/* Snake head */}
      <mesh
        position={[0.1, 0.13, 0]}
        rotation={[0, 0, -Math.PI / 5]}
        castShadow
      >
        <coneGeometry args={[0.06, 0.15, 8]} />
        <meshStandardMaterial
          color={color}
          roughness={0.4}
          metalness={0.3}
          emissive={isActive ? color : "#000000"}
          emissiveIntensity={isActive ? 0.5 : 0}
        />
      </mesh>

      {/* Eyes */}
      <mesh position={[0.13, 0.19, 0.03]}>
        <sphereGeometry args={[0.015, 8, 8]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffffff"
          emissiveIntensity={0.5}
        />
      </mesh>
      <mesh position={[0.13, 0.19, -0.03]}>
        <sphereGeometry args={[0.015, 8, 8]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffffff"
          emissiveIntensity={0.5}
        />
      </mesh>

      {/* Pupils */}
      <mesh position={[0.14, 0.19, 0.03]}>
        <sphereGeometry args={[0.008, 8, 8]} />
        <meshStandardMaterial color="#000000" />
      </mesh>
      <mesh position={[0.14, 0.19, -0.03]}>
        <sphereGeometry args={[0.008, 8, 8]} />
        <meshStandardMaterial color="#000000" />
      </mesh>

      {/* Active player glow ring */}
      {isActive && (
        <mesh position={[0, -0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.18, 0.22, 32]} />
          <meshBasicMaterial
            color="#ffd700"
            transparent
            opacity={0.7}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}

// Game Board with texture - MUST receive boardImage prop
function GameBoard({ boardImage }) {
  const texture = useTexture(boardImage);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[10, 10]} />
      <meshStandardMaterial
        map={texture}
        roughness={0.6}
        metalness={0.1}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// Fallback board when texture is loading
function FallbackBoard() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[10, 10]} />
      <meshStandardMaterial
        color="#8B7355"
        roughness={0.8}
        metalness={0.1}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// Main 3D Scene
function Board3DScene({ players, currentPlayer, boardImage }) {
  // Generate board numbers (100 to 1, snake pattern)
  const generateBoardNumbers = () => {
    const board = [];
    let number = 100;
    for (let row = 0; row < 10; row++) {
      const rowNumbers = [];
      if (row % 2 === 0) {
        for (let col = 0; col < 10; col++) rowNumbers.push(number--);
      } else {
        for (let col = 0; col < 10; col++) rowNumbers.unshift(number--);
      }
      board.push(rowNumbers);
    }
    return board;
  };

  const boardNumbers = generateBoardNumbers();

  // Get grid position for a number
  const getGridPosition = (num) => {
    if (num === 0) return { row: 9, col: 0 };

    for (let row = 0; row < boardNumbers.length; row++) {
      for (let col = 0; col < boardNumbers[row].length; col++) {
        if (boardNumbers[row][col] === num) {
          return { row, col };
        }
      }
    }
    return { row: 9, col: 0 };
  };

  // Convert grid position to 3D coordinates
  const gridTo3D = (position) => {
    const { row, col } = getGridPosition(position);
    const x = col - 4.5;
    const z = row - 4.5;
    const y = 0.3;
    return [x, y, z];
  };

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[10, 15, 8]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <pointLight position={[-5, 8, -5]} intensity={0.4} />
      <pointLight position={[5, 8, 5]} intensity={0.4} />
      <hemisphereLight intensity={0.3} groundColor="#444444" />

      {/* Game Board - Pass boardImage prop */}
      <Suspense fallback={<FallbackBoard />}>
        <GameBoard boardImage={boardImage} />
      </Suspense>

      {/* Snake Pawns */}
      {players &&
        players.map((player) => (
          <SnakePawn
            key={player.id}
            position={gridTo3D(player.position)}
            color={player.color}
            isActive={player.id === currentPlayer}
            name={player.name}
          />
        ))}
    </>
  );
}

// Main Component - Board.jsx
const Board = ({ players, currentPlayer, boardImage }) => {
  return (
    <div style={{ width: "100%", height: "600px", position: "relative" }}>
      <Canvas
        camera={{ position: [0, 9, 9], fov: 50 }}
        shadows
        gl={{ antialias: true }}
      >
        <Suspense fallback={null}>
          <Board3DScene
            players={players}
            currentPlayer={currentPlayer}
            boardImage={boardImage}
          />
        </Suspense>

        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          target={[0, 0, 0]}
          minPolarAngle={0}
          maxPolarAngle={Math.PI / 2}
          minDistance={6}
          maxDistance={16}
        />
      </Canvas>

      {/* Controls Info */}
      <div
        style={{
          position: "absolute",
          top: "10px",
          left: "10px",
          background: "rgba(0,0,0,0.7)",
          color: "white",
          padding: "10px 15px",
          borderRadius: "8px",
          fontSize: "12px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{ marginBottom: "5px", fontWeight: "bold", color: "#ffd700" }}
        >
          🐍 3D Board Controls
        </div>
        <div>🖱️ Rotate: Left Click + Drag</div>
        <div>🔍 Zoom: Mouse Wheel</div>
        <div>✋ Pan: Right Click + Drag</div>
      </div>
    </div>
  );
};

export default Board;
