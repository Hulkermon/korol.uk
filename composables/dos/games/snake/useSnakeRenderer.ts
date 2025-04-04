import { type Ref, type ComputedRef } from 'vue'; // Import ComputedRef
import type { GameState, Position } from './types';
import type { GridApi } from '~/composables/dos/useDosCommands';

// Define ASCII characters (can be moved to a shared constants file later)
const BORDER_TL = '╔';
const BORDER_TR = '╗';
const BORDER_BL = '╚';
const BORDER_BR = '╝';
const BORDER_H = '═';
const BORDER_V = '║';
const SIDEBAR_V = '│';
const SNAKE_HEAD = 'O';
const SNAKE_BODY = 'o';
const FOOD = '*';

export function useSnakeRenderer(
    gridApiRef: Ref<GridApi | null>,
    gameStateRef: ComputedRef<GameState | null> // Accept ComputedRef
) {

    const drawBorderAndSidebar = () => {
        const gridApi = gridApiRef.value;
        const gameState = gameStateRef.value;
        if (!gridApi || !gameState || !gridApi.config.value) return;
        const { rows } = gridApi.config.value;
        const gw = gameState.gameWidth.value;

        // Top border
        gridApi.writeTextAt(BORDER_TL, 0, 0);
        for (let x = 1; x < gw - 1; x++) gridApi.writeTextAt(BORDER_H, x, 0);
        gridApi.writeTextAt(BORDER_TR, gw - 1, 0);

        // Bottom border
        gridApi.writeTextAt(BORDER_BL, 0, rows - 1);
        for (let x = 1; x < gw - 1; x++) gridApi.writeTextAt(BORDER_H, x, rows - 1);
        gridApi.writeTextAt(BORDER_BR, gw - 1, rows - 1);

        // Left border
        for (let y = 1; y < rows - 1; y++) {
            gridApi.writeTextAt(BORDER_V, 0, y);
        }

        // Sidebar separator
        for (let y = 0; y < rows; y++) {
            gridApi.writeTextAt(SIDEBAR_V, gw, y);
        }
    };

    const drawSidebarContent = () => {
        const gridApi = gridApiRef.value;
        const gameState = gameStateRef.value;
        if (!gridApi || !gameState || !gridApi.config.value) return;

        const { rows, cols } = gridApi.config.value;
        const gw = gameState.gameWidth.value;
        const sidebarX = gw + 2;
        const availableSidebarWidth = cols - gw - 1;

        // Clear sidebar area
        for (let y = 0; y < rows; y++) {
            gridApi.writeTextAt(' '.repeat(availableSidebarWidth), gw + 1, y);
        }

        // Draw Score
        const scoreText = `Score: ${gameState.score.value}`;
        gridApi.writeTextAt(scoreText, sidebarX, 2);

        // Draw Mode Indicator(s) - Extend later for more modes
        let modeY = 4;
        // Example: Check if a specific mode strategy is active if needed
        // For now, just check the tron flag directly from gameState
        // if (gameState.isTronMode.value) { // Assuming isTronMode is added to GameState
        //     gridApi.writeTextAt("[TRON]", sidebarX, modeY);
        //     modeY += 2;
        // }
        // Add other mode indicators here...

    };

    const drawGameOver = () => {
        const gridApi = gridApiRef.value;
        const gameState = gameStateRef.value;
        if (!gridApi || !gameState || !gridApi.config.value) return;

        const { rows } = gridApi.config.value;
        const centerX = Math.floor(gameState.gameWidth.value / 2);
        const centerY = Math.floor(rows / 2);

        const gameOverMsg = "GAME OVER";
        const scoreMsg = `Final Score: ${gameState.score.value}`;
        const retryMsg = "Press R to Retry, ESC to Quit";

        gridApi.writeTextAt(gameOverMsg, centerX - Math.floor(gameOverMsg.length / 2), centerY - 1);
        gridApi.writeTextAt(scoreMsg, centerX - Math.floor(scoreMsg.length / 2), centerY);
        gridApi.writeTextAt(retryMsg, centerX - Math.floor(retryMsg.length / 2), centerY + 2);
    };

    const drawGameElements = () => {
        const gridApi = gridApiRef.value;
        const gameState = gameStateRef.value;
        if (!gridApi || !gameState) return;

        // Draw Trails (if Tron) - Assuming isTronMode exists in GameState
        // if (gameState.isTronMode.value) {
        //     gameState.trails.value.forEach(trailPosStr => {
        //         const [tx, ty] = trailPosStr.split(',').map(Number);
        //         gridApi.writeTextAt(TRON_TRAIL, tx, ty);
        //     });
        // }

        // Draw Food
        if (gameState.foodPosition.value) {
            gridApi.writeTextAt(FOOD, gameState.foodPosition.value.x, gameState.foodPosition.value.y);
        }

        // Draw Snake
        gameState.snakeBody.value.forEach((segment, index) => {
            gridApi.writeTextAt(index === 0 ? SNAKE_HEAD : SNAKE_BODY, segment.x, segment.y);
        });

        // Draw mode-specific elements by calling strategy render
        // gameState.activeMode.value?.render?.(gridApi, gameState); // Assuming activeMode ref exists
    };

    // Main render function called by the game loop
    const renderFrame = () => {
        const gridApi = gridApiRef.value;
        const gameState = gameStateRef.value;
        if (!gridApi || !gameState) return;

        gridApi.clearGrid();
        drawBorderAndSidebar();
        drawSidebarContent();

        if (gameState.isGameOver.value) {
            drawGameOver();
        } else {
            drawGameElements();
            // Call mode-specific rendering if needed
             gameState.activeMode.value?.render?.(gridApi, gameState); // Assuming activeMode ref exists
        }
    };

    return {
        renderFrame,
    };
}
