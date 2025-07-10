import React from 'react';
import styles from './DiceDisplay.module.css';

// Dynamically import all dice images
const diceImages = import.meta.glob('/src/assets/images/dice/*.png', { eager: true });

function DiceDisplay({ results, onDieClick, selectedIndex, expendedDice, selectedDiceForDoubles }) {
  console.log("DiceDisplay received selectedIndex:", selectedIndex);
  if (!results || results.length === 0) {
    return null;
  }

  const getDiceAction = (roll) => {
    if (roll === 1) {
      return "REVERSE";
    } else if (roll >= 2 && roll <= 4) {
      return "TURN";
    } else if (roll >= 5 && roll <= 6) {
      return "MOVE";
    }
    return "";
  };

  return (
    <div className={styles.diceContainer}>
      {results.map((roll, index) => {
        const imagePath = `/src/assets/images/dice/${roll}.png`;
        const imgSrc = diceImages[imagePath]?.default;
        const isSelected = index === selectedIndex || selectedDiceForDoubles.includes(index);
        const isExpended = expendedDice.includes(index);
        console.log(`Die ${roll} at index ${index}: isSelected = ${isSelected} (index === selectedIndex: ${index} === ${selectedIndex})`);

        if (!imgSrc) {
          console.warn(`Dice image not found for roll: ${roll}`);
          return <span key={index} className={styles.dicePlaceholder}>{roll}</span>;
        }

        return (
          <img
            key={index}
            src={imgSrc}
            alt={`Dice roll ${roll}`}
            className={`${styles.diceImage} ${isSelected ? styles.selected : ''} ${isExpended ? styles.expended : ''}`}
            onClick={() => onDieClick(roll, index, getDiceAction(roll))}
          />
        );
      })}
    </div>
  );
}

export default DiceDisplay;