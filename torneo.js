// ============================================
// TORNEO - Mode Controller
// ============================================

const TorneoApp = (() => {
    let currentMode = 'bracket';

    function setMode(mode) {
        currentMode = mode;
        document.getElementById('bracketMode').style.display = mode === 'bracket' ? '' : 'none';
        document.getElementById('clanMode').style.display = mode === 'clan' ? '' : 'none';
        document.getElementById('modeBracketBtn').classList.toggle('active', mode === 'bracket');
        document.getElementById('modeClanBtn').classList.toggle('active', mode === 'clan');
        localStorage.setItem('torneoMode', mode);
    }

    function init() {
        // Restore mode
        const savedMode = localStorage.getItem('torneoMode') || 'bracket';
        setMode(savedMode);

        BracketTorneo.init();
        ClanTorneo.init();
    }

    return { init, setMode, removePlayer: (i) => BracketTorneo.removePlayer(i) };
})();

// ============================================
// BRACKET TOURNAMENT MODULE (original)
// ============================================

const BracketTorneo = (() => {
    let players = [];
    let bracketSize = 16;
    let bracket = [];
    let totalRounds = 0;

    const DOM = {};
    const STORAGE_KEY = 'torneoData';

    function saveState() {
        const state = { players, bracketSize, bracket, totalRounds, bracketActive: bracket.length > 0 };
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
        } catch { return false; }
    }

    function clearState() { localStorage.removeItem(STORAGE_KEY); }

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

        DOM.sizeSelect.addEventListener('change', () => { updateUI(); saveState(); });
        DOM.addBtn.addEventListener('click', addPlayer);
        DOM.playerInput.addEventListener('keydown', e => { if (e.key === 'Enter') addPlayer(); });
        DOM.generateBtn.addEventListener('click', generateBracket);
        DOM.confirmNo.addEventListener('click', closeConfirm);
        DOM.resetBtn.addEventListener('click', resetTorneo);

        const wasActive = loadState();
        DOM.sizeSelect.value = bracketSize;

        if (wasActive && bracket.length > 0) {
            DOM.setupPanel.style.display = 'none';
            DOM.bracketContainer.classList.add('active');
            renderBracket();
        } else {
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

    function generateBracket() {
        if (players.length < bracketSize) return;
        const shuffled = [...players];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        if (bracketSize === 12) buildBracket12(shuffled);
        else buildBracketStandard(shuffled);
        DOM.setupPanel.style.display = 'none';
        DOM.bracketContainer.classList.add('active');
        renderBracket();
        saveState();
    }

    function buildBracketStandard(shuffledPlayers) {
        bracket = [];
        const n = shuffledPlayers.length;
        totalRounds = Math.log2(n);
        const round0 = [];
        for (let i = 0; i < n / 2; i++) {
            round0.push({ id: `r0_m${i}`, player1: shuffledPlayers[i * 2], player2: shuffledPlayers[i * 2 + 1], winner: null });
        }
        bracket.push(round0);
        for (let r = 1; r < totalRounds; r++) {
            const prevLen = bracket[r - 1].length;
            const round = [];
            for (let i = 0; i < prevLen / 2; i++) {
                round.push({ id: `r${r}_m${i}`, player1: null, player2: null, winner: null, sourceMatch1: `r${r-1}_m${i*2}`, sourceMatch2: `r${r-1}_m${i*2+1}` });
            }
            bracket.push(round);
        }
    }

    function buildBracket12(shuffledPlayers) {
        bracket = [];
        totalRounds = 4;
        const byePlayers = shuffledPlayers.slice(0, 4);
        const matchPlayers = shuffledPlayers.slice(4, 12);
        const round0 = [];
        for (let i = 0; i < 4; i++) {
            round0.push({ id: `r0_m${i}`, player1: matchPlayers[i * 2], player2: matchPlayers[i * 2 + 1], winner: null });
        }
        bracket.push(round0);
        const round1 = [];
        for (let i = 0; i < 4; i++) {
            round1.push({ id: `r1_m${i}`, player1: byePlayers[i], player2: null, winner: null, isBye1: true, sourceMatch2: `r0_m${i}` });
        }
        bracket.push(round1);
        const round2 = [];
        for (let i = 0; i < 2; i++) {
            round2.push({ id: `r2_m${i}`, player1: null, player2: null, winner: null, sourceMatch1: `r1_m${i*2}`, sourceMatch2: `r1_m${i*2+1}` });
        }
        bracket.push(round2);
        bracket.push([{ id: `r3_m0`, player1: null, player2: null, winner: null, sourceMatch1: `r2_m0`, sourceMatch2: `r2_m1` }]);
    }

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
        const nonFinalRounds = totalRounds - 1;
        for (let r = 0; r < nonFinalRounds; r++) {
            const round = bracket[r];
            const half = round.length / 2;
            DOM.bracketWrapper.appendChild(createRoundColumn(r, round.slice(0, half), 'left'));
            DOM.bracketWrapper.appendChild(createSpacer());
        }
        DOM.bracketWrapper.appendChild(createFinalColumn());
        for (let r = nonFinalRounds - 1; r >= 0; r--) {
            DOM.bracketWrapper.appendChild(createSpacer());
            const round = bracket[r];
            const half = round.length / 2;
            DOM.bracketWrapper.appendChild(createRoundColumn(r, round.slice(half), 'right'));
        }
    }

    function createRoundColumn(roundIndex, matches, side) {
        const col = document.createElement('div');
        col.className = 'bracket-round';
        const title = document.createElement('div');
        title.className = 'round-title';
        title.textContent = getRoundName(roundIndex);
        col.appendChild(title);
        matches.forEach(match => col.appendChild(createMatchElement(match, side)));
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
        if (finalMatch.winner) { champ.textContent = `🎉 ${finalMatch.winner} 🎉`; champ.classList.add('revealed'); }
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
                div.addEventListener('click', () => showConfirm(match.id, slot, playerName, side));
            }
        } else {
            nameSpan.textContent = 'Por definir';
            div.classList.add('empty');
        }
        div.appendChild(nameSpan);
        return div;
    }

    let pendingConfirm = null;

    function showConfirm(matchId, slot, playerName, side) {
        pendingConfirm = { matchId, slot, playerName, side };
        DOM.confirmText.textContent = playerName;
        DOM.confirmModal.classList.remove('hidden');
        DOM.confirmYes.onclick = () => confirmWinner();
    }

    function closeConfirm() { DOM.confirmModal.classList.add('hidden'); pendingConfirm = null; }

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
                if (nextMatch.sourceMatch1 === match.id) { nextMatch.player1 = winnerName; return; }
                if (nextMatch.sourceMatch2 === match.id) { nextMatch.player2 = winnerName; return; }
            }
        }
    }

    function resetTorneo() {
        players = []; bracket = []; totalRounds = 0; bracketSize = 16;
        clearState();
        DOM.sizeSelect.value = bracketSize;
        DOM.bracketContainer.classList.remove('active');
        DOM.setupPanel.style.display = '';
        renderPlayersList();
        updateUI();
    }

    return { init, removePlayer };
})();

// ============================================
// CLAN TOURNAMENT MODULE
// ============================================

const ClanTorneo = (() => {
    const STORAGE_KEY = 'clanTorneoData';
    const NUM_TEAMS = 6;

    let state = {
        teams: [],       // [{name, player1, player2}]
        phase: 0,        // 0=setup, 1=fase1, 2=fase2, 3=fase3
        phase1: [],      // [{id, teamName, player1, player2, winner}]
        winners1: [],    // 6 ganadores de fase 1
        phase2: [],      // [{id, player1, player2, winner}]
        winners2: [],    // 3 ganadores de fase 2
        phase3: [],      // [{id, player1, player2, winner}] — round robin
    };

    const DOM = {};

    function saveState() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }

    function loadState() {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return false;
        try {
            const parsed = JSON.parse(raw);
            // Merge saved teams even if phase is 0 (setup not yet started)
            if (parsed.teams && parsed.teams.length) state.teams = parsed.teams;
            if (parsed.phase !== undefined) state.phase = parsed.phase;
            if (parsed.phase1) state.phase1 = parsed.phase1;
            if (parsed.winners1) state.winners1 = parsed.winners1;
            if (parsed.phase2) state.phase2 = parsed.phase2;
            if (parsed.winners2) state.winners2 = parsed.winners2;
            if (parsed.phase3) state.phase3 = parsed.phase3;
            return state.phase > 0;
        } catch { return false; }
    }

    function clearState() {
        localStorage.removeItem(STORAGE_KEY);
        state = { teams: [], phase: 0, phase1: [], winners1: [], phase2: [], winners2: [], phase3: [] };
    }

    function init() {
        DOM.setup = document.getElementById('clanSetup');
        DOM.bracket = document.getElementById('clanBracket');
        DOM.teamsGrid = document.getElementById('clanTeamsGrid');
        DOM.generateBtn = document.getElementById('clanGenerateBtn');
        DOM.phase1 = document.getElementById('clanPhase1');
        DOM.phase2 = document.getElementById('clanPhase2');
        DOM.phase3 = document.getElementById('clanPhase3');
        DOM.phase1Matches = document.getElementById('phase1Matches');
        DOM.phase2Matches = document.getElementById('phase2Matches');
        DOM.phase3Matches = document.getElementById('phase3Matches');
        DOM.phase2AutoBtn = document.getElementById('phase2AutoBtn');
        DOM.phase2ManualBtn = document.getElementById('phase2ManualBtn');
        DOM.manualPairing = document.getElementById('manualPairing');
        DOM.confirmManualBtn = document.getElementById('confirmManualBtn');
        DOM.scoreboard = document.getElementById('scoreboard');
        DOM.champion = document.getElementById('clanChampion');
        DOM.resetBtn = document.getElementById('clanResetBtn');
        DOM.confirmModal = document.getElementById('confirmModal');
        DOM.confirmText = document.getElementById('confirmPlayerName');
        DOM.confirmYes = document.getElementById('confirmYes');
        DOM.confirmNo = document.getElementById('confirmNo');
        DOM.phase2FixtureCtrl = document.getElementById('phase2FixtureCtrl');

        renderTeamInputs();

        DOM.generateBtn.addEventListener('click', startPhase1);
        DOM.phase2AutoBtn.addEventListener('click', () => buildPhase2Auto());
        DOM.phase2ManualBtn.addEventListener('click', showManualPairing);
        DOM.confirmManualBtn.addEventListener('click', buildPhase2Manual);
        DOM.resetBtn.addEventListener('click', resetClan);

        // Restore
        if (loadState() && state.phase > 0) {
            DOM.setup.style.display = 'none';
            DOM.bracket.style.display = '';
            renderCurrentPhase();
        }
    }

    function renderTeamInputs() {
        DOM.teamsGrid.innerHTML = '';
        for (let i = 0; i < NUM_TEAMS; i++) {
            const saved = state.teams[i] || { name: `Equipo ${i + 1}`, player1: '', player2: '' };
            const card = document.createElement('div');
            card.className = 'team-input-card';
            card.innerHTML = `
                <div class="team-input-header">
                    <span class="team-badge">Equipo ${i + 1}</span>
                </div>
                <div class="team-inputs">
                    <input class="team-player-input" type="text" placeholder="Jugador 1" id="t${i}_p1" value="${escHTML(saved.player1)}" autocomplete="off">
                    <input class="team-player-input" type="text" placeholder="Jugador 2" id="t${i}_p2" value="${escHTML(saved.player2)}" autocomplete="off">
                </div>
            `;
            DOM.teamsGrid.appendChild(card);

            // Auto-save names as the user types
            const p1Input = document.getElementById(`t${i}_p1`);
            const p2Input = document.getElementById(`t${i}_p2`);
            const savePartial = () => {
                if (!state.teams[i]) {
                    state.teams[i] = { name: `Equipo ${i + 1}`, player1: '', player2: '' };
                }
                state.teams[i].player1 = p1Input.value.trim();
                state.teams[i].player2 = p2Input.value.trim();
                localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            };
            p1Input.addEventListener('input', savePartial);
            p2Input.addEventListener('input', savePartial);
        }
    }

    function escHTML(str) {
        const d = document.createElement('div');
        d.textContent = str || '';
        return d.innerHTML;
    }

    function readTeams() {
        const teams = [];
        let valid = true;
        for (let i = 0; i < NUM_TEAMS; i++) {
            const p1 = document.getElementById(`t${i}_p1`).value.trim();
            const p2 = document.getElementById(`t${i}_p2`).value.trim();
            if (!p1 || !p2) { valid = false; break; }
            teams.push({ name: `Equipo ${i + 1}`, player1: p1, player2: p2 });
        }
        return valid ? teams : null;
    }

    function startPhase1() {
        const teams = readTeams();
        if (!teams) {
            alert('Completá todos los equipos con 2 jugadores cada uno.');
            return;
        }
        state.teams = teams;
        state.phase = 1;
        state.phase1 = teams.map((t, i) => ({
            id: `p1_m${i}`,
            teamName: t.name,
            player1: t.player1,
            player2: t.player2,
            winner: null,
        }));
        state.winners1 = [];
        state.phase2 = [];
        state.winners2 = [];
        state.phase3 = [];
        saveState();
        DOM.setup.style.display = 'none';
        DOM.bracket.style.display = '';
        renderCurrentPhase();
    }

    function renderCurrentPhase() {
        DOM.phase1.style.display = 'none';
        DOM.phase2.style.display = 'none';
        DOM.phase3.style.display = 'none';

        if (state.phase === 1) {
            DOM.phase1.style.display = '';
            renderPhase1();
        } else if (state.phase === 2) {
            DOM.phase2.style.display = '';
            renderPhase2();
        } else if (state.phase === 3) {
            DOM.phase3.style.display = '';
            renderPhase3();
        }
    }

    // ---- PHASE 1 ----

    function renderPhase1() {
        DOM.phase1Matches.innerHTML = '';
        state.phase1.forEach(match => {
            DOM.phase1Matches.appendChild(createClanMatch(match, 'phase1'));
        });
        checkPhase1Complete();
    }

    function checkPhase1Complete() {
        const allDone = state.phase1.every(m => m.winner);
        if (allDone && state.winners1.length === 0) {
            state.winners1 = state.phase1.map(m => m.winner);
            state.phase = 2;
            saveState();
            setTimeout(() => { renderCurrentPhase(); }, 600);
        }
    }

    // ---- PHASE 2 ----

    function renderPhase2() {
        DOM.phase2Matches.innerHTML = '';
        DOM.manualPairing.style.display = 'none';

        if (state.phase2.length === 0) {
            // Show fixture options
            DOM.phase2FixtureCtrl.style.display = 'flex';
        } else {
            // Matches already set — render them
            DOM.phase2FixtureCtrl.style.display = 'none';
            state.phase2.forEach(match => {
                DOM.phase2Matches.appendChild(createClanMatch(match, 'phase2'));
            });
            checkPhase2Complete();
        }
    }

    function buildPhase2Auto() {
        const shuffled = [...state.winners1];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        state.phase2 = [
            { id: 'p2_m0', player1: shuffled[0], player2: shuffled[1], winner: null },
            { id: 'p2_m1', player1: shuffled[2], player2: shuffled[3], winner: null },
            { id: 'p2_m2', player1: shuffled[4], player2: shuffled[5], winner: null },
        ];
        saveState();
        renderPhase2();
    }

    function showManualPairing() {
        DOM.manualPairing.style.display = '';
        DOM.phase2FixtureCtrl.style.display = 'none';
        populatePairSelects();
    }

    function populatePairSelects() {
        const ids = ['pair1a','pair1b','pair2a','pair2b','pair3a','pair3b'];
        ids.forEach(id => {
            const sel = document.getElementById(id);
            sel.innerHTML = state.winners1.map(w => `<option value="${escHTML(w)}">${escHTML(w)}</option>`).join('');
        });
        // Default different players
        const w = state.winners1;
        document.getElementById('pair1a').value = w[0];
        document.getElementById('pair1b').value = w[1];
        document.getElementById('pair2a').value = w[2];
        document.getElementById('pair2b').value = w[3];
        document.getElementById('pair3a').value = w[4];
        document.getElementById('pair3b').value = w[5];
    }

    function buildPhase2Manual() {
        const pairs = [
            [document.getElementById('pair1a').value, document.getElementById('pair1b').value],
            [document.getElementById('pair2a').value, document.getElementById('pair2b').value],
            [document.getElementById('pair3a').value, document.getElementById('pair3b').value],
        ];

        // Validate: no player repeated, no self-match
        const allPlayers = pairs.flat();
        const unique = new Set(allPlayers);
        const hasSelfMatch = pairs.some(([a, b]) => a === b);

        if (unique.size !== 6 || hasSelfMatch) {
            alert('Cada jugador debe aparecer exactamente una vez. Revisá los cruces.');
            return;
        }

        state.phase2 = pairs.map(([p1, p2], i) => ({
            id: `p2_m${i}`, player1: p1, player2: p2, winner: null
        }));
        DOM.manualPairing.style.display = 'none';
        saveState();
        renderPhase2();
    }

    function checkPhase2Complete() {
        const allDone = state.phase2.every(m => m.winner);
        if (allDone && state.winners2.length === 0) {
            state.winners2 = state.phase2.map(m => m.winner);
            state.phase = 3;
            buildPhase3();
            saveState();
            setTimeout(() => { renderCurrentPhase(); }, 600);
        }
    }

    // ---- PHASE 3 — ROUND ROBIN ----

    function buildPhase3() {
        const [a, b, c] = state.winners2;
        state.phase3 = [
            { id: 'p3_m0', player1: a, player2: b, winner: null },
            { id: 'p3_m1', player1: b, player2: c, winner: null },
            { id: 'p3_m2', player1: a, player2: c, winner: null },
        ];
    }

    function renderPhase3() {
        DOM.phase3Matches.innerHTML = '';
        state.phase3.forEach(match => {
            DOM.phase3Matches.appendChild(createClanMatch(match, 'phase3'));
        });
        updateScoreboard();
    }

    function updateScoreboard() {
        const allDone = state.phase3.every(m => m.winner);
        if (!allDone) { DOM.scoreboard.style.display = 'none'; DOM.champion.style.display = 'none'; return; }

        const scores = {};
        state.winners2.forEach(p => scores[p] = 0);
        state.phase3.forEach(m => { if (m.winner) scores[m.winner]++; });

        const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
        const champion = ranked[0][0];

        DOM.scoreboard.style.display = '';
        DOM.scoreboard.innerHTML = `
            <h4>📊 Tabla Final</h4>
            <table class="score-table">
                <thead><tr><th>#</th><th>Jugador</th><th>Victorias</th></tr></thead>
                <tbody>
                    ${ranked.map(([name, wins], i) => `
                        <tr class="${i === 0 ? 'score-winner' : ''}">
                            <td>${i === 0 ? '🏆' : i + 1}</td>
                            <td>${escHTML(name)}</td>
                            <td>${wins}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        DOM.champion.style.display = '';
        DOM.champion.innerHTML = `<span class="champion-reveal">🎉 ¡${escHTML(champion)} es el Campeón! 🎉</span>`;
        DOM.champion.classList.add('revealed');
    }

    // ---- MATCH ELEMENT ----

    function createClanMatch(match, phase) {
        const card = document.createElement('div');
        card.className = 'clan-match-card';
        card.id = match.id;
        if (match.winner) card.classList.add('completed');

        if (phase === 'phase1') {
            const label = document.createElement('div');
            label.className = 'clan-match-team-label';
            label.textContent = match.teamName;
            card.appendChild(label);
        }

        card.appendChild(createClanSlot(match, match.player1, phase));
        const vs = document.createElement('div');
        vs.className = 'clan-vs';
        vs.textContent = 'VS';
        card.appendChild(vs);
        card.appendChild(createClanSlot(match, match.player2, phase));

        return card;
    }

    function createClanSlot(match, playerName, phase) {
        const div = document.createElement('div');
        div.className = 'clan-slot';

        if (match.winner === playerName) {
            div.classList.add('winner');
        } else if (match.winner && match.winner !== playerName) {
            div.classList.add('loser');
        }

        const name = document.createElement('span');
        name.className = 'clan-player-name';
        name.textContent = playerName || 'Por definir';
        div.appendChild(name);

        // Clickable if no winner yet and both players present
        if (!match.winner && match.player1 && match.player2) {
            div.classList.add('clickable');
            div.addEventListener('click', () => showClanConfirm(match, playerName, phase));
        }

        return div;
    }

    // ---- CONFIRM ----

    let pendingClanConfirm = null;

    function showClanConfirm(match, playerName, phase) {
        pendingClanConfirm = { match, playerName, phase };
        DOM.confirmText.textContent = playerName;
        DOM.confirmModal.classList.remove('hidden');
        DOM.confirmYes.onclick = confirmClanWinner;
        DOM.confirmNo.onclick = closeClanConfirm;
    }

    function closeClanConfirm() {
        DOM.confirmModal.classList.add('hidden');
        pendingClanConfirm = null;
    }

    function confirmClanWinner() {
        if (!pendingClanConfirm) return;
        const { match, playerName, phase } = pendingClanConfirm;
        closeClanConfirm();

        match.winner = playerName;
        saveState();

        if (phase === 'phase1') {
            renderPhase1();
            checkPhase1Complete();
        } else if (phase === 'phase2') {
            renderPhase2();
            checkPhase2Complete();
        } else if (phase === 'phase3') {
            renderPhase3();
        }
    }

    // ---- RESET ----

    function resetClan() {
        clearState();
        DOM.bracket.style.display = 'none';
        DOM.setup.style.display = '';
        DOM.scoreboard.style.display = 'none';
        DOM.champion.style.display = 'none';
        renderTeamInputs();
    }

    return { init };
})();

document.addEventListener('DOMContentLoaded', TorneoApp.init);
