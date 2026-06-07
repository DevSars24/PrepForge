"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function ThreeParticles() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || 600;

    // Scene setup
    const scene = new THREE.Scene();

    // Camera setup
    const camera = new THREE.PerspectiveCamera(65, width / height, 1, 1000);
    camera.position.z = 350;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Particles creation
    const particleCount = 100;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities: { x: number; y: number; z: number }[] = [];

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 500;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 500;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 500;

      velocities.push({
        x: (Math.random() - 0.5) * 0.3,
        y: (Math.random() - 0.5) * 0.3,
        z: (Math.random() - 0.5) * 0.3,
      });
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    // Points material (purple accent)
    const material = new THREE.PointsMaterial({
      size: 3.5,
      color: new THREE.Color("#8B5CF6"),
      transparent: true,
      opacity: 0.65,
      sizeAttenuation: true,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Line connections creation (orange accent)
    const lineMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color("#EA580C"),
      transparent: true,
      opacity: 0.08,
    });

    const lineGeometry = new THREE.BufferGeometry();
    const linePositions = new Float32Array(particleCount * particleCount * 2 * 3);
    lineGeometry.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
    
    const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(lines);

    // Mouse coordinates tracker
    let mouseX = 0;
    let mouseY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;

    const handleMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      targetMouseX = ((event.clientX - rect.left) / width) * 2 - 1;
      targetMouseY = -((event.clientY - rect.top) / height) * 2 + 1;
    };

    window.addEventListener("mousemove", handleMouseMove);

    // Resize handler
    const handleResize = () => {
      if (!containerRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    // Animation loop
    let animationFrameId: number;
    
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Smooth mouse easing interpolation
      mouseX += (targetMouseX - mouseX) * 0.04;
      mouseY += (targetMouseY - mouseY) * 0.04;

      // Rotate camera angle slightly based on mouse
      scene.rotation.y = mouseX * 0.2;
      scene.rotation.x = -mouseY * 0.2;

      const posAttr = geometry.getAttribute("position") as THREE.BufferAttribute;
      const array = posAttr.array as Float32Array;

      let lineIndex = 0;
      const linePosAttr = lineGeometry.getAttribute("position") as THREE.BufferAttribute;
      const lineArray = linePosAttr.array as Float32Array;

      const mouse3D = new THREE.Vector3(mouseX * 200, mouseY * 200, 0);

      for (let i = 0; i < particleCount; i++) {
        // Apply velocity update
        array[i * 3] += velocities[i].x;
        array[i * 3 + 1] += velocities[i].y;
        array[i * 3 + 2] += velocities[i].z;

        // Boundaries wraps
        if (array[i * 3] < -250 || array[i * 3] > 250) velocities[i].x *= -1;
        if (array[i * 3 + 1] < -250 || array[i * 3 + 1] > 250) velocities[i].y *= -1;
        if (array[i * 3 + 2] < -250 || array[i * 3 + 2] > 250) velocities[i].z *= -1;

        // Cursor push force
        const pPos = new THREE.Vector3(array[i * 3], array[i * 3 + 1], array[i * 3 + 2]);
        const dist = pPos.distanceTo(mouse3D);
        if (dist < 80) {
          const force = (80 - dist) * 0.15;
          const pushDir = pPos.clone().sub(mouse3D).normalize().multiplyScalar(force);
          array[i * 3] += pushDir.x;
          array[i * 3 + 1] += pushDir.y;
        }

        // Draw line connections dynamically
        for (let j = i + 1; j < particleCount; j++) {
          const dx = array[i * 3] - array[j * 3];
          const dy = array[i * 3 + 1] - array[j * 3 + 1];
          const dz = array[i * 3 + 2] - array[j * 3 + 2];
          const distanceSq = dx * dx + dy * dy + dz * dz;

          if (distanceSq < 70 * 70) {
            lineArray[lineIndex++] = array[i * 3];
            lineArray[lineIndex++] = array[i * 3 + 1];
            lineArray[lineIndex++] = array[i * 3 + 2];

            lineArray[lineIndex++] = array[j * 3];
            lineArray[lineIndex++] = array[j * 3 + 1];
            lineArray[lineIndex++] = array[j * 3 + 2];
          }
        }
      }

      posAttr.needsUpdate = true;
      linePosAttr.needsUpdate = true;
      lineGeometry.setDrawRange(0, lineIndex);

      renderer.render(scene, camera);
    };

    animate();

    // Clean up Three resource leaks on unmount
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      material.dispose();
      lineMaterial.dispose();
      geometry.dispose();
      lineGeometry.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
