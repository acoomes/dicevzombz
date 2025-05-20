// DOM Elements
const roundDisplay = document.getElementById('round-display');
const zombiesDisplay = document.getElementById('zombies-display');
const barricadeDisplay = document.getElementById('barricade-display');
const rerollDisplay = document.getElementById('reroll-display');
const highestRoundDisplay = document.getElementById('highest-round-display');
const earliestWinDisplay = document.getElementById('earliest-win-display');
const dieElements = [
    document.getElementById('die1'),
    document.getElementById('die2'),
    document.getElementById('die3')
];
const rollButton = document.getElementById('roll-button');
const messageArea = document.getElementById('message-area');
const zombieArtArea = document.getElementById('zombie-art-area');
const gameOverModal = document.getElementById('game-over-modal');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const playAgainButton = document.getElementById('play-again-button');

/**
 * Initializes or resets the game to its starting state.
 */
function initGame() {
    gameState.barricadeStrength = INITIAL_BARRICADE_STRENGTH;
    gameState.zombies = INITIAL_ZOMBIES;
    gameState.round = 1;
    gameState.gameOver = false;
    gameState.diceValues = [null, null, null];
    gameState.rerollsAvailable = 1;
    gameState.isRerollPhase = false;
    gameState.diceSelectedForReroll = [false, false, false];
    
    updateDisplay();
    messageArea.textContent = "The night begins... Roll the dice to survive!";
    rollButton.textContent = "Roll Dice!";
    rollButton.disabled = false;
    gameOverModal.classList.remove('active');
    
    dieElements.forEach((die, index) => {
        die.textContent = '🎲';
        die.className = 'die'; // Reset classes
        // Remove any existing click listeners for safety. They are added in enableDieSelection.
        die.removeEventListener('click', onDieSelectClickHandler); 
    });
}

/**
 * Handles player clicking a die to select/deselect for re-roll.
 * @param {number} index - The index of the clicked die.
 */
function handleDieClick(index) {
    if (!gameState.isRerollPhase || gameState.gameOver) return;

    gameState.diceSelectedForReroll[index] = !gameState.diceSelectedForReroll[index];
    dieElements[index].classList.toggle('selected-for-reroll', gameState.diceSelectedForReroll[index]);
}

/**
 * Sets up dice to be clickable for re-roll selection.
 */
function enableDieSelection() {
    dieElements.forEach((dieEl, index) => {
        dieEl.classList.add('selectable');
        // Store index in a data attribute to retrieve in the event listener
        dieEl.dataset.dieIndex = index; 
        // Add event listener, ensuring it's not duplicated if called multiple times
        dieEl.removeEventListener('click', onDieSelectClickHandler); // Remove first to be safe
        dieEl.addEventListener('click', onDieSelectClickHandler);
    });
}

/**
 * Event handler for die click, calls handleDieClick with correct index.
 * This wrapper function is used to correctly pass the index to handleDieClick.
 */
function onDieSelectClickHandler(event) {
    const dieIndex = parseInt(event.currentTarget.dataset.dieIndex);
    handleDieClick(dieIndex);
}

/**
 * Disables die selection and removes visual cues.
 */
function disableDieSelection() {
    dieElements.forEach((dieEl, index) => {
        dieEl.classList.remove('selectable', 'selected-for-reroll');
        dieEl.removeEventListener('click', onDieSelectClickHandler);
        gameState.diceSelectedForReroll[index] = false; // Ensure selection state is reset
    });
}

/**
 * Handles the player's dice roll or re-roll action.
 */
function handleRollDice() {
    if (gameState.gameOver) return;

    rollButton.disabled = true; // Disable button during roll/resolution
    let currentMessages = []; // Array to hold messages for this turn sequence

    if (gameState.isRerollPhase) { // This is a RE-ROLL action
        console.log('Starting reroll phase');
        console.log('Selected dice:', gameState.diceSelectedForReroll);
        console.log('Current dice values:', gameState.diceValues);
        
        // Store the selected dice state before disabling selection
        const selectedDice = [...gameState.diceSelectedForReroll];
        
        gameState.isRerollPhase = false; // Exit re-roll phase
        gameState.rerollsAvailable = 0; // Consume the re-roll
        updateDisplay(); // Update re-roll count display
        disableDieSelection(); // Make dice no longer selectable
        rollButton.textContent = "Rolling..."; // Indicate action

        // Count selected dice using our stored selection state
        let diceToAnimateCount = 0;
        for (let i = 0; i < NUM_DICE; i++) {
            if (selectedDice[i]) {
                diceToAnimateCount++;
            }
        }
        console.log('Dice to animate:', diceToAnimateCount);
        
        let animatedDice = 0; // Counter for completed animations

        if (diceToAnimateCount === 0) { // Nothing selected for re-roll
            currentMessages.push("No dice selected for re-roll. Proceeding with current results.");
            resolveDiceEffects(currentMessages);
            return;
        }
        currentMessages.push("Re-rolling selected dice...");

        // Create a copy of current dice values to modify during reroll
        let newDiceValues = [...gameState.diceValues];
        console.log('Initial new dice values:', newDiceValues);

        // Process each die
        for (let index = 0; index < NUM_DICE; index++) {
            if (selectedDice[index]) { // Use stored selection state
                console.log(`Rerolling die ${index + 1}`);
                // This die is being re-rolled
                dieElements[index].classList.add('rolling');
                let rollCount = 0;
                const animationInterval = setInterval(() => {
                    const randomFaceValue = rollSingleDie();
                    dieElements[index].textContent = DICE_FACES[randomFaceValue].icon;
                    dieElements[index].className = `die rolling ${DICE_FACES[randomFaceValue].colorClass}`;
                    rollCount++;
                    if (rollCount >= 5) { // Number of quick changes for animation
                        clearInterval(animationInterval);
                        const finalValue = rollSingleDie();
                        newDiceValues[index] = DICE_FACES[finalValue]; // Update the new dice values array
                        console.log(`Die ${index + 1} new value:`, newDiceValues[index]);
                        dieElements[index].textContent = newDiceValues[index].icon;
                        dieElements[index].className = `die ${newDiceValues[index].colorClass}`; // Set final color
                        dieElements[index].classList.remove('rolling');
                        
                        animatedDice++;
                        console.log('Animated dice count:', animatedDice);
                        if (animatedDice === diceToAnimateCount) { // All selected dice re-rolled
                            console.log('All dice rerolled, updating game state');
                            console.log('Final new dice values:', newDiceValues);
                            gameState.diceValues = newDiceValues; // Update the game state with new dice values
                            resolveDiceEffects(currentMessages);
                        }
                    }
                }, 50); // Animation speed
            } else {
                // This die is not being re-rolled, keep its current value
                console.log(`Keeping die ${index + 1} value:`, gameState.diceValues[index]);
                newDiceValues[index] = gameState.diceValues[index];
            }
        }

    } else { // This is the INITIAL ROLL of the round
        rollButton.textContent = "Rolling...";
        let diceAnimating = NUM_DICE; // Counter for dice still animating

        dieElements.forEach((dieEl, index) => {
            dieEl.classList.add('rolling');
            let rollCount = 0;
            const animationInterval = setInterval(() => {
                const randomFaceValue = rollSingleDie();
                dieEl.textContent = DICE_FACES[randomFaceValue].icon;
                dieEl.className = `die rolling ${DICE_FACES[randomFaceValue].colorClass}`;
                rollCount++;
                if (rollCount >= 5) {
                    clearInterval(animationInterval);
                    const finalValue = rollSingleDie();
                    gameState.diceValues[index] = DICE_FACES[finalValue];
                    dieEl.textContent = gameState.diceValues[index].icon;
                    dieEl.className = `die ${gameState.diceValues[index].colorClass}`;
                    dieEl.classList.remove('rolling');
                    
                    diceAnimating--;
                    if (diceAnimating === 0) { // All dice finished initial roll
                        if (gameState.rerollsAvailable > 0) {
                            gameState.isRerollPhase = true;
                            rollButton.textContent = "Re-roll Selected";
                            rollButton.disabled = false; // Enable button for re-roll confirmation
                            enableDieSelection(); // Allow player to click dice
                            currentMessages.push("Initial roll complete. Select dice to re-roll, then click 'Re-roll Selected'.");
                            messageArea.innerHTML = currentMessages.join('<br>');
                        } else {
                            // No re-rolls available, proceed to resolve effects
                            resolveDiceEffects(currentMessages);
                        }
                    }
                }
            }, 50);
        });
    }
}

/**
 * Updates all display elements on the page with current game state.
 */
function updateDisplay() {
    roundDisplay.textContent = `Round: ${gameState.round}/${MAX_ROUNDS}`;
    zombiesDisplay.textContent = `Zombies: ${gameState.zombies}`;
    barricadeDisplay.textContent = `Barricade: ${gameState.barricadeStrength}`;
    rerollDisplay.textContent = `Re-rolls: ${gameState.rerollsAvailable}`;
    highestRoundDisplay.textContent = `Furthest: ${gameState.highestRound}`;
    earliestWinDisplay.textContent = gameState.earliestWin > 0 ? `Best Win: ${gameState.earliestWin}` : 'Best Win: -';
    
    // Update zombie art
    zombieArtArea.innerHTML = ''; // Clear previous zombies
    const maxZombiesToShow = 20; // Limit display for performance/layout
    for (let i = 0; i < Math.min(gameState.zombies, maxZombiesToShow); i++) {
        const zombieSpan = document.createElement('span');
        zombieSpan.textContent = '🧟';
        zombieArtArea.appendChild(zombieSpan);
    }
    if (gameState.zombies > maxZombiesToShow) {
         const moreSpan = document.createElement('span');
         moreSpan.textContent = ` +${gameState.zombies - maxZombiesToShow}`;
         moreSpan.style.fontSize = '0.8em'; // Make the "+X" text slightly smaller
         zombieArtArea.appendChild(moreSpan);
    }
}

// --- Event Listeners ---
rollButton.addEventListener('click', handleRollDice);
playAgainButton.addEventListener('click', initGame);

// --- Initial Game Setup ---
window.onload = function() {
    initGame();
}; 