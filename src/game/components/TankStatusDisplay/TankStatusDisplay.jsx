import React from 'react';
import styles from './TankStatusDisplay.module.css';

function TankStatusDisplay({ unit }) {
  if (!unit) {
    return null; // Or a loading/placeholder message if no unit is selected/found
  }

  // Destructure new properties from the unit object
  const { crew, mainGunStatus, turretDamaged, immobilized, fireLevel } = unit;

  return (
    <div className={styles.tankStatusContainer}>
      <h3>Tank Status</h3>
      <div className={styles.crewStatus}>
        <h4>Crew Status</h4>
        <p><strong>Commander:</strong> <span className={styles[crew.commander.replace(/\s+/g, '').toLowerCase()]}>{crew.commander}</span></p>
        <p><strong>Loader:</strong> <span className={styles[crew.loader.toLowerCase()]}>{crew.loader}</span></p>
        <p><strong>Gunner:</strong> <span className={styles[crew.gunner.toLowerCase()]}>{crew.gunner}</span></p>
        <p><strong>Driver:</strong> <span className={styles[crew.driver.toLowerCase()]}>{crew.driver}</span></p>
        <p><strong>Assistant Driver:</strong> <span className={styles[crew.assistantDriver.toLowerCase()]}>{crew.assistantDriver}</span></p>
      </div>
      <div className={styles.gunStatus}>
        <h4>Main Gun</h4>
        <p><strong>Status:</strong> <span className={styles[mainGunStatus.toLowerCase()]}>{mainGunStatus}</span></p>
      </div>

      {/* NEW: Additional Tank Stats section */}
      <div className={styles.additionalStats}>
        <h4>Damage & Mobility</h4>
        <p><strong>Turret Damaged:</strong> <span className={styles[turretDamaged.toLowerCase()]}>{turretDamaged}</span></p>
        <p><strong>Immobilized:</strong> <span className={styles[immobilized.toLowerCase()]}>{immobilized}</span></p>
        <p><strong>Fire Level:</strong> <span className={styles[`fireLevel-${fireLevel}`] || styles.fireLevel}>{fireLevel}</span></p>
      </div>
    </div>
  );
}

export default TankStatusDisplay;