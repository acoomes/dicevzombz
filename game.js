// Game Configuration
const INITIAL_BARRICADE_STRENGTH = 20;
const MAX_BARRICADE_STRENGTH = 30; // Max barricade can be repaired to
const INITIAL_ZOMBIES = 10;
const MAX_ROUNDS = 10;
const NUM_DICE = 3;
const STAGE_ZOMBIE_INCREMENT = 5;
const OVERWHELMED_THRESHOLD = 15; // Zombies count above which they do bonus damage
const OVERWHELMED_BONUS_DAMAGE = 5; // Bonus damage when overwhelmed

// High Score Storage Keys
const HIGHEST_ROUND_KEY = 'dicevzombz_highest_round';
const EARLIEST_WIN_KEY = 'dicevzombz_earliest_win';

// Dice Symbol Definitions
const DICE_FACES = {
    1: { type: 'ZOMBIE_ADD', icon: '🧟', text: 'New Zombie!', colorClass: 'zombie-icon' },
    2: { type: 'BARRICADE_BOOST', icon: '🛠️', text: 'Barricade Boost!', colorClass: 'defend-icon' },
    3: { type: 'ATTACK', icon: '🎯', text: 'Attack!', colorClass: 'attack-icon' },
    4: { type: 'ATTACK', icon: '🎯', text: 'Attack!', colorClass: 'attack-icon' },
    5: { type: 'DEFEND', icon: '🛡️', text: 'Defend!', colorClass: 'defend-icon' },
    6: { type: 'SUPER_ATTACK', icon: '💥', text: 'Super Attack!', colorClass: 'super-attack-icon' }
};

// Game State
let gameState = {
    barricadeStrength: INITIAL_BARRICADE_STRENGTH,
    zombies: INITIAL_ZOMBIES,
    round: 1,
    stage: 1,
    stageOutcome: null,
    gameOver: false,
    diceValues: [null, null, null], // Stores face objects of current roll
    rerollsAvailable: 1, // Feature 1: Re-rolls per round
    isRerollPhase: false, // Feature 1: True if player can select dice for re-roll
    diceSelectedForReroll: [false, false, false], // Feature 1
    highestRound: parseInt(localStorage.getItem(HIGHEST_ROUND_KEY) || '0'), // Highest round reached
    earliestWin: parseInt(localStorage.getItem(EARLIEST_WIN_KEY) || '0') // Earliest round won (0 means no win yet)
};

/**
 * Simulates rolling a single die.
 * @returns {number} A random number between 1 and 6.
 */
function rollSingleDie() {
    return Math.floor(Math.random() * 6) + 1;
}

/**
 * Resolves the effects of the rolled dice.
 * @param {string[]} initialMessages - Array of messages from earlier in the turn.
 */
function resolveDiceEffects(initialMessages = []) {
    let currentMessages = [...initialMessages]; 
    if (currentMessages.length === 0 || (currentMessages.length > 0 && !currentMessages[currentMessages.length-1].includes("Resolving"))) {
         if (gameState.rerollsAvailable === 0 && !gameState.isRerollPhase) { // Check if it was a re-roll phase that just ended
            currentMessages.push("Re-roll complete. Resolving turn...");
         } else {
            currentMessages.push("Dice results locked in. Resolving turn...");
         }
    }

    let newZombiesFromDice = 0;
    let defeatedByAttack = 0;
    let defeatedBySuperAttack = 0;
    let barricadeRepaired = 0;
    let barricadeBoosted = 0; // Feature 2: For BARRICADE_BOOST die face

    gameState.diceValues.forEach(face => {
        if (!face) return; // Should not happen if logic is correct
        currentMessages.push(`Rolled: ${face.icon} (${face.text})`);
        switch (face.type) {
            case 'ZOMBIE_ADD':
                newZombiesFromDice++;
                break;
            case 'ATTACK':
                defeatedByAttack++;
                break;
            case 'SUPER_ATTACK':
                defeatedBySuperAttack += 2; 
                break;
            case 'DEFEND':
                barricadeRepaired++;
                break;
            case 'BARRICADE_BOOST': // Feature 2
                barricadeBoosted += 3;
                break;
        }
    });

    // Apply dice effects
    if (newZombiesFromDice > 0) {
        gameState.zombies += newZombiesFromDice;
        currentMessages.push(`${newZombiesFromDice} new zombie(s) attracted by the noise! 🧟`);
    }
    
    const totalDefeated = defeatedByAttack + defeatedBySuperAttack;
    if (totalDefeated > 0) {
        const actualDefeated = Math.min(totalDefeated, gameState.zombies);
        gameState.zombies -= actualDefeated;
        currentMessages.push(`You fought back, defeating ${actualDefeated} zombie(s)! 🎯`);
    }

    let totalRepaired = 0;
    if (barricadeRepaired > 0) {
        totalRepaired += barricadeRepaired;
    }
    if (barricadeBoosted > 0) { // Feature 2
        totalRepaired += barricadeBoosted;
    }

    if (totalRepaired > 0) {
         gameState.barricadeStrength = Math.min(MAX_BARRICADE_STRENGTH, gameState.barricadeStrength + totalRepaired);
         let repairMessage = "Barricade ";
         if (barricadeBoosted > 0 && barricadeRepaired > 0) repairMessage += `repaired by ${barricadeRepaired} and boosted by ${barricadeBoosted}`;
         else if (barricadeBoosted > 0) repairMessage += `significantly boosted by ${barricadeBoosted}`;
         else if (barricadeRepaired > 0) repairMessage += `reinforced by ${barricadeRepaired}`;
         repairMessage += `! Total +${totalRepaired}. ${barricadeBoosted > 0 ? '🛠️' : '🛡️'}`;
         currentMessages.push(repairMessage);
    }
    
    updateDisplay(); // Update display after dice effects, before zombie attack
    
    // Short delay before zombie attack message for readability
    setTimeout(() => {
        zombiesAttack(currentMessages);
    }, 1000);
}

/**
 * Handles the zombie attack phase.
 * @param {string[]} currentMessages - Array to accumulate messages.
 */
function zombiesAttack(currentMessages) {
    let damageTaken = gameState.zombies; // Base damage is number of zombies
    let overwhelmedMessage = "";

    if (gameState.zombies > 0) {
        // Feature 3: Overwhelmed mechanic
        if (gameState.zombies > OVERWHELMED_THRESHOLD) { 
            damageTaken += OVERWHELMED_BONUS_DAMAGE;
            overwhelmedMessage = ` The horde is OVERWHELMING! (+${OVERWHELMED_BONUS_DAMAGE} bonus damage)`;
        }
        gameState.barricadeStrength -= damageTaken;
        currentMessages.push(`The horde attacks! Barricade takes ${damageTaken} damage.${overwhelmedMessage} 💔`);
    } else {
        currentMessages.push("No zombies left to attack this round. A moment of peace!");
    }
    
    gameState.barricadeStrength = Math.max(0, gameState.barricadeStrength); // Prevent negative barricade

    messageArea.innerHTML = currentMessages.join('<br>'); // Display all messages for the turn
    updateDisplay();
    checkWinLoss(); // Check for game over conditions

    if (!gameState.gameOver) {
        gameState.round++;
         // Reset for next round
        gameState.rerollsAvailable = 1; // Feature 1: Reset re-rolls for the new round
        gameState.isRerollPhase = false;
        // gameState.diceSelectedForReroll is reset by disableDieSelection or initGame
        disableDieSelection(); // Ensure dice are not selectable at start of new round

        if (gameState.round > MAX_ROUNDS && gameState.zombies > 0) {
            // This condition (surviving max rounds with zombies left) is handled in checkWinLoss
        } else {
             rollButton.textContent = "Roll Dice!"; // Reset button text
             rollButton.disabled = false; // Re-enable for next round
        }
    }
     updateDisplay(); // Ensure reroll count and other stats are updated for the new round
}

/**
 * Checks for win or loss conditions.
 */
function checkWinLoss() {
    let gameEndStatus = null; // To store the type of game end

    const totalRound = (gameState.stage - 1) * MAX_ROUNDS + gameState.round;

    if (gameState.barricadeStrength <= 0) {
        gameEndStatus = "loss_barricade";
    } else if (gameState.zombies <= 0 && gameState.round <= MAX_ROUNDS) { // Win by eliminating all zombies
        gameEndStatus = "win_no_zombies";
    } else if (gameState.round > MAX_ROUNDS && gameState.barricadeStrength > 0) { 
        // Win by surviving all rounds, even if zombies remain
        gameEndStatus = "win_survived_rounds";
    }

    if (gameEndStatus && !gameState.gameOver) { // Process game end only once
        gameState.gameOver = true;
        gameState.stageOutcome = gameEndStatus.startsWith('loss') ? 'lost' : 'won';
        rollButton.disabled = true;
        disableDieSelection(); // Ensure dice are not interactive post-game

        // Update highest round reached (across stages)
        if (totalRound > gameState.highestRound) {
            gameState.highestRound = totalRound;
            localStorage.setItem(HIGHEST_ROUND_KEY, gameState.highestRound.toString());
        }

        // Update earliest win if this is a win
        if (gameEndStatus.startsWith('win')) {
            if (gameState.earliestWin === 0 || totalRound < gameState.earliestWin) {
                gameState.earliestWin = totalRound;
                localStorage.setItem(EARLIEST_WIN_KEY, gameState.earliestWin.toString());
            }
        }

        switch(gameEndStatus) {
            case "loss_barricade":
                modalTitle.textContent = "Stage Failed";
                modalMessage.textContent = "The zombies breached your barricade! Try again.";
                messageArea.innerHTML += "<br><b>STAGE FAILED! The horde broke through!</b>";
                break;
            case "win_no_zombies":
                modalTitle.textContent = "Stage Cleared";
                modalMessage.textContent = `Stage ${gameState.stage} cleared! All zombies defeated! 🎉`;
                messageArea.innerHTML += "<br><b>VICTORY! All zombies eliminated!</b>";
                break;
            case "win_survived_rounds":
                 modalTitle.textContent = "Stage Survived";
                 modalMessage.textContent = `Stage ${gameState.stage} complete! You lasted ${MAX_ROUNDS} rounds! 🌅`;
                 messageArea.innerHTML += `<br><b>SURVIVED! You lasted ${MAX_ROUNDS} rounds!</b>`;
                 break;
        }
        gameOverModal.classList.add('active'); // Show the game over modal
    }
    updateDisplay(); // Final update for stats like round number if game ended by max rounds
} 