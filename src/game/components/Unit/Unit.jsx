// src/game/components/Unit/Unit.jsx
import React, { useEffect, useRef, useState } from 'react';
import styles from './Unit.module.css';
import tankExplosionGif from '../../../assets/vfx/tank_explosion.gif';
import fireGif from '../../../assets/vfx/fire.gif';
import bounceGif from '../../../assets/vfx/bounce.gif';
import tankHitGif from '../../../assets/vfx/tank_hit.gif';
import smokeGif from '../../../assets/vfx/smoke.gif';
import { playSound } from '../../logic/audioManager';
import tankDestroyedSound from '../../../assets/sounds/tank-destroyed.mp3';
import tankDamagedSound from '../../../assets/sounds/tank-damaged.mp3';

const unitSprites = import.meta.glob('/src/assets/images/units/*.png', { eager: true });

function Unit({ unitData, pixelX, pixelY, hexHeight, onClick, isTargetingMode, isBouncing, isHit, isSmoking }) { // Added isSmoking
  const { sprite, rotation, destroyed, damaged } = unitData;
  const imageRef = useRef(null);
  const rotationRef = useRef(rotation);
  const [currentVfx, setCurrentVfx] = useState(null);
  const [showFire, setShowFire] = useState(false);
  const [showHit, setShowHit] = useState(false);
  const [showSmoke, setShowSmoke] = useState(false);
  const [showDestroyedVisuals, setShowDestroyedVisuals] = useState(false); // NEW state
  const [smokeAnimationClass, setSmokeAnimationClass] = useState(''); // NEW state

  useEffect(() => {
    if (destroyed) {
      setTimeout(() => {
        playSound(tankDestroyedSound, 0.5);
        setCurrentVfx(`${tankExplosionGif}?${Date.now()}`);
        setShowFire(false);
        setShowSmoke(false);
        setShowDestroyedVisuals(true); // NEW: Show destroyed visuals after delay
        setSmokeAnimationClass(''); // Reset smoke animation class
        const explosionDuration = 1000;
        const timer = setTimeout(() => {
          setCurrentVfx(null);
          setShowFire(true);
        }, explosionDuration);
      }, 1000); // 1 second delay for destruction effects
      return () => {
        clearTimeout(soundDelayTimer);
        clearTimeout(timer);
      };
    } else {
      setCurrentVfx(null);
      setShowFire(false);
      setShowDestroyedVisuals(false); // NEW: Reset on not destroyed
      if (damaged) {
        setShowSmoke(true);
        setSmokeAnimationClass(styles.fadeIn);
      } else {
        // If not damaged, and was smoking, fade out
        if (showSmoke) {
          setSmokeAnimationClass(styles.fadeOut);
          const timer = setTimeout(() => setShowSmoke(false), 1000); // Match fadeOut duration
          return () => clearTimeout(timer);
        }
      }
    }
  }, [destroyed, damaged]);

  useEffect(() => {
    if (isHit && !destroyed) {
      playSound(tankDamagedSound, 0.6);
      setShowHit(true);
    }
  }, [isHit]);

  useEffect(() => {
    if (imageRef.current && rotation !== undefined && rotation !== null) {
      let currentVisualRotation = rotationRef.current % 360;
      if (currentVisualRotation < 0) currentVisualRotation += 360;
      let targetRotation = rotation;
      let diff = targetRotation - currentVisualRotation;
      if (diff > 180) diff -= 360;
      else if (diff < -180) diff += 360;
      rotationRef.current += diff;
      imageRef.current.style.setProperty('--rotation-angle', `${rotationRef.current}deg`);
    }
  }, [rotation]);

  if (!unitData || !sprite) return null;

  const spritePathKey = `/src/assets/images/units/${sprite}`;
  const spriteSrc = unitSprites[spritePathKey]?.default;

  if (!spriteSrc) {
    console.warn(`Sprite not found for: ${sprite}`);
    return <div style={{ position: 'absolute', left: pixelX, top: pixelY, color: 'red' }}>?</div>;
  }

  const unitSize = hexHeight * 1;
  const containerStyle = {
    left: `${pixelX - unitSize / 2}px`,
    top: `${pixelY - unitSize / 2}px`,
    width: `${unitSize}px`,
    height: `${unitSize}px`,
  };

  const isEnemy = unitData.faction === 'axis';
  const canBeTargeted = isTargetingMode && isEnemy;

  return (
    <div
      className={`${styles.unitContainer} ${canBeTargeted ? styles.targeting : ''} ${showDestroyedVisuals ? styles.destroyed : ''} ${damaged && !destroyed ? styles.damaged : ''} ${unitData.hull_down ? styles.hullDown : ''}`}
      style={containerStyle}
      onClick={canBeTargeted ? onClick : undefined}
    >
      <img
        ref={imageRef}
        src={spriteSrc}
        alt={unitData.name || 'Unit'}
        className={styles.unitImage}
        style={{ transformOrigin: 'center center' }}
      />
      {isBouncing && <div className={styles.bounceEffect} style={{ backgroundImage: `url(${bounceGif})` }}></div>}
      {showHit && <div className={styles.hitEffect} style={{ backgroundImage: `url(${tankHitGif})` }}></div>}
      {isSmoking && <div className={`${styles.smokeEffect} ${styles.fadeIn}`} style={{ backgroundImage: `url(${smokeGif})` }}></div>}
      {destroyed && currentVfx && <div className={styles.explosionEffect} style={{ backgroundImage: `url(${currentVfx})` }}></div>}
      {showFire && <div className={`${styles.fireEffect} ${styles.fadeIn}`} style={{ backgroundImage: `url(${fireGif})` }}></div>}
      {damaged && !destroyed && <div className={styles.damagedEffect}></div>}
    </div>
  );
}

export default Unit;
