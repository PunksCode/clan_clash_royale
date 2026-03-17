// ============================================
// TORNEO BRACKET - Logic
// ============================================

const TorneoApp = (() => {
    let players = [];
    let bracketSize = 16;
    let bracket = []; // Array of rounds, each round is array of matches
    let totalRounds = 0;

    const DOM = {};
    const STORAGE_KEY = 'torneoData';

    // ========== LocalStorage ==========

    function saveState() {
        const state = {
            players,
            bracketSize,
            bracket,
            totalRounds,
            bracketActive: bracket.length > 0,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }

    function loadState() {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return false;
        try {
            const state = JSON.parse(raw);
            players = state.players || [];
            bracketSize = state.bracketSize || 16;
            bracket = state.bracket || [];
            totalRounds = state.totalRounds || 0;
            return state.bracketActive || false;
        } catch {
            return false;
        }
    }

    function clearState() {
        localStorage.removeItem(STORAGE_KEY);
    }

    // ========== Init ==========

    function init() {
        DOM.sizeSelect = document.getElementById('bracketSize');
        DOM.playerInput = document.getElementById('playerNameInput');
        DOM.addBtn = document.getElementById('addPlayerBtn');
        DOM.generateBtn = document.getElementById('generateBracketBtn');
        DOM.playersList = document.getElementById('setupPlayersList');
        DOM.playerCount = document.getElementById('playerCount');
        DOM.setupPanel = document.getElementById('torneoSetup');
        DOM.bracketContainer = document.getElementById('bracketContainer');
        DOM.bracketWrapper = document.getElementById('bracketWrapper');
        DOM.confirmModal = document.getElementById('confirmModal');
        DOM.confirmText = document.getElementById('confirmPlayerName');
        DOM.confirmYes = document.getElementById('confirmYes');
        DOM.confirmNo = document.getElementById('confirmNo');
        DOM.resetBtn = document.getElementById('resetBtn');

        DOM.sizeSelect.addEventListener('change', () => {
            updateUI();
            saveState();
        });
        DOM.addBtn.addEventListener('click', addPlayer);
        DOM.playerInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') addPlayer();
        });
        DOM.generateBtn.addEventListener('click', generateBracket);
        DOM.confirmNo.addEventListener('click', closeConfirm);
        DOM.resetBtn.addEventListener('click', resetTorneo);

        // Restore saved state
        const wasActive = loadState();
        DOM.sizeSelect.value = bracketSize;

        if (wasActive && bracket.length > 0) {
            // Bracket was in progress — restore it
            DOM.setupPanel.style.display = 'none';
            DOM.bracketContainer.classList.add('active');
            renderBracket();
        } else {
            // Show setup with saved players
            renderPlayersList();
            updateUI();
        }
    }

    function updateUI() {
        bracketSize = parseInt(DOM.sizeSelect.value);
        updatePlayerCount();
        DOM.generateBtn.disabled = players.length < bracketSize;
    }

    function addPlayer() {
        const name = DOM.playerInput.value.trim();
        if (!name) return;
        if (players.length >= bracketSize) return;

        players.push(name);
        DOM.playerInput.value = '';
        DOM.playerInput.focus();
        renderPlayersList();
        updateUI();
        saveState();
    }

    function removePlayer(index) {
        players.splice(index, 1);
        renderPlayersList();
        updateUI();
        saveState();
    }

    function renderPlayersList() {
        DOM.playersList.innerHTML = '';
        players.forEach((p, i) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span><span class="player-num">#${i + 1}</span> ${escapeHTML(p)}</span>
                <button class="delete-player" onclick="TorneoApp.removePlayer(${i})">✕</button>
            `;
            DOM.playersList.appendChild(li);
        });
        updatePlayerCount();
    }

    function updatePlayerCount() {
        DOM.playerCount.textContent = `${players.length} / ${bracketSize} jugadores`;
    }

    function escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ========== Bracket Generation ==========

    function generateBracket() {
        if (players.length < bracketSize) return;

        const shuffled = [...players];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        if (bracketSize === 12) {
            buildBracket12(shuffled);
        } else {
            buildBracketStandard(shuffled);
        }

        DOM.setupPanel.style.display = 'none';
        DOM.bracketContainer.classList.add('active');
        renderBracket();
        saveState();
    }

    function buildBracketStandard(shuffledPlayers) {
        bracket = [];
        const n = shuffledPlayers.length; // 8 or 16
        totalRounds = Math.log2(n);       // 3 or 4

        // Round 0
        const round0 = [];
        for (let i = 0; i < n / 2; i++) {
            round0.push({
                id: `r0_m${i}`,
                player1: shuffledPlayers[i * 2],
                player2: shuffledPlayers[i * 2 + 1],
                winner: null,
            });
        }
        bracket.push(round0);

        // Subsequent rounds
        for (let r = 1; r < totalRounds; r++) {
            const prevLen = bracket[r - 1].length;
            const round = [];
            for (let i = 0; i < prevLen / 2; i++) {
                round.push({
                    id: `r${r}_m${i}`,
                    player1: null,
                    player2: null,
                    winner: null,
                    sourceMatch1: `r${r - 1}_m${i * 2}`,
                    sourceMatch2: `r${r - 1}_m${i * 2 + 1}`,
                });
            }
            bracket.push(round);
        }
    }

    function buildBracket12(shuffledPlayers) {
        bracket = [];
        totalRounds = 4;

        // 4 players get byes, 8 play in round 0
        const byePlayers = shuffledPlayers.slice(0, 4);
        const matchPlayers = shuffledPlayers.slice(4, 12);

        // Round 0: Pre-Cuartos (4 matches)
        const round0 = [];
        for (let i = 0; i < 4; i++) {
            round0.push({
                id: `r0_m${i}`,
                player1: matchPlayers[i * 2],
                player2: matchPlayers[i * 2 + 1],
                winner: null,
            });
        }
        bracket.push(round0);

        // Round 1: Cuartos (4 matches) — bye players + winners
        const round1 = [];
        for (let i = 0; i < 4; i++) {
            round1.push({
                id: `r1_m${i}`,
                player1: byePlayers[i],
                player2: null,
                winner: null,
                isBye1: true,
                sourceMatch2: `r0_m${i}`,
            });
        }
        bracket.push(round1);

        // Round 2: Semis
        const round2 = [];
        for (let i = 0; i < 2; i++) {
            round2.push({
                id: `r2_m${i}`,
                player1: null,
                player2: null,
                winner: null,
                sourceMatch1: `r1_m${i * 2}`,
                sourceMatch2: `r1_m${i * 2 + 1}`,
            });
        }
        bracket.push(round2);

        // Round 3: Final
        bracket.push([{
            id: `r3_m0`,
            player1: null,
            player2: null,
            winner: null,
            sourceMatch1: `r2_m0`,
            sourceMatch2: `r2_m1`,
        }]);
    }

    // ========== Rendering ==========

    function getRoundName(roundIndex) {
        const remaining = totalRounds - roundIndex;
        if (remaining === 1) return 'Final';
        if (remaining === 2) return 'Semifinal';
        if (remaining === 3) return 'Cuartos';
        if (remaining === 4) return 'Octavos';
        return `Ronda ${roundIndex + 1}`;
    }

    function renderBracket() {
        DOM.bracketWrapper.innerHTML = '';

        // Layout: left rounds converging → FINAL + TROPHY ← right rounds converging
        // Each round's matches are split: first half = left tree, second half = right tree
        // Display order: [R0-left] [R1-left] ... [Semi-left] [FINAL] [Semi-right] ... [R1-right] [R0-right]

        const nonFinalRounds = totalRounds - 1; // rounds before the final

        // LEFT SIDE (outer to inner)
        for (let r = 0; r < nonFinalRounds; r++) {
            const round = bracket[r];
            const half = round.length / 2;
            const leftMatches = round.slice(0, half);
            DOM.bracketWrapper.appendChild(createRoundColumn(r, leftMatches, 'left'));
            DOM.bracketWrapper.appendChild(createSpacer());
        }

        // CENTER: Final + Trophy
        DOM.bracketWrapper.appendChild(createFinalColumn());

        // RIGHT SIDE (inner to outer)
        for (let r = nonFinalRounds - 1; r >= 0; r--) {
            DOM.bracketWrapper.appendChild(createSpacer());
            const round = bracket[r];
            const half = round.length / 2;
            const rightMatches = round.slice(half);
            DOM.bracketWrapper.appendChild(createRoundColumn(r, rightMatches, 'right'));
        }
    }

    function createRoundColumn(roundIndex, matches, side) {
        const col = document.createElement('div');
        col.className = 'bracket-round';

        const title = document.createElement('div');
        title.className = 'round-title';
        title.textContent = getRoundName(roundIndex);
        col.appendChild(title);

        matches.forEach(match => {
            col.appendChild(createMatchElement(match, side));
        });

        return col;
    }

    function createFinalColumn() {
        const col = document.createElement('div');
        col.className = 'bracket-trophy';

        const title = document.createElement('div');
        title.className = 'round-title';
        title.textContent = 'Final';
        col.appendChild(title);

        const finalMatch = bracket[totalRounds - 1][0];
        col.appendChild(createMatchElement(finalMatch, 'center'));

        const trophy = document.createElement('div');
        trophy.className = 'trophy-icon';
        trophy.innerHTML = '🏆';
        col.appendChild(trophy);

        const champ = document.createElement('div');
        champ.className = 'champion-name';
        champ.id = 'championName';
        DOM.championName = champ;

        // Preserve champion text if already decided
        if (finalMatch.winner) {
            champ.textContent = `🎉 ${finalMatch.winner} 🎉`;
            champ.classList.add('revealed');
        }

        col.appendChild(champ);
        return col;
    }

    function createSpacer() {
        const spacer = document.createElement('div');
        spacer.className = 'connector-round';
        return spacer;
    }

    function createMatchElement(match, side) {
        const div = document.createElement('div');
        div.className = 'match';
        div.id = match.id;
        if (match.winner) div.classList.add('completed');

        div.appendChild(createSlotElement(match, 'player1', match.player1, side));
        div.appendChild(createSlotElement(match, 'player2', match.player2, side));
        return div;
    }

    function createSlotElement(match, slot, playerName, side) {
        const div = document.createElement('div');
        div.className = 'match-slot';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'player-name';

        if (playerName) {
            nameSpan.textContent = playerName;

            if (match.winner === playerName) {
                div.classList.add('winner');
                if (side === 'left') div.classList.add('advance-animate-left');
                else if (side === 'right') div.classList.add('advance-animate-right');
            } else if (match.winner && match.winner !== playerName) {
                div.classList.add('loser');
            } else if (!match.winner && match.player1 && match.player2) {
                // Both players present, no winner yet → clickable
                div.addEventListener('click', () => showConfirm(match.id, slot, playerName, side));
            }
        } else {
            nameSpan.textContent = 'Por definir';
            div.classList.add('empty');
        }

        div.appendChild(nameSpan);
        return div;
    }

    // ========== Confirm Modal ==========

    let pendingConfirm = null;

    function showConfirm(matchId, slot, playerName, side) {
        pendingConfirm = { matchId, slot, playerName, side };
        DOM.confirmText.textContent = playerName;
        DOM.confirmModal.classList.remove('hidden');
        DOM.confirmYes.onclick = () => confirmWinner();
    }

    function closeConfirm() {
        DOM.confirmModal.classList.add('hidden');
        pendingConfirm = null;
    }

    function confirmWinner() {
        if (!pendingConfirm) return;
        const { matchId, playerName, side } = pendingConfirm;
        closeConfirm();

        const match = findMatch(matchId);
        if (!match || match.winner) return;
        if (!match.player1 || !match.player2) return;

        match.winner = playerName;
        advanceWinner(match, playerName);
        renderBracket();
        saveState();

        // Check champion
        const finalMatch = bracket[totalRounds - 1][0];
        if (finalMatch.winner) {
            setTimeout(() => {
                DOM.championName.textContent = `🎉 ${finalMatch.winner} 🎉`;
                DOM.championName.classList.add('revealed');
            }, 500);
        }
    }

    function findMatch(matchId) {
        for (const round of bracket) {
            for (const match of round) {
                if (match.id === matchId) return match;
            }
        }
        return null;
    }

    function advanceWinner(match, winnerName) {
        for (let r = 1; r < bracket.length; r++) {
            for (const nextMatch of bracket[r]) {
                if (nextMatch.sourceMatch1 === match.id) {
                    nextMatch.player1 = winnerName;
                    return;
                }
                if (nextMatch.sourceMatch2 === match.id) {
                    nextMatch.player2 = winnerName;
                    return;
                }
            }
        }
    }

    function resetTorneo() {
        players = [];
        bracket = [];
        totalRounds = 0;
        bracketSize = 16;
        clearState();
        DOM.sizeSelect.value = bracketSize;
        DOM.bracketContainer.classList.remove('active');
        DOM.setupPanel.style.display = '';
        renderPlayersList();
        updateUI();
    }

    return { init, removePlayer };
})();

document.addEventListener('DOMContentLoaded', TorneoApp.init);
