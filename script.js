document.addEventListener('DOMContentLoaded', () => {
    // =========================================================================
    // ESTADO DA APLICAÇÃO
    // =========================================================================
    let allPlayers = [];
    let guestPlayers = [];
    let arrivalList = [];
    let teamA = { name: 'Time A', players: [], reserves: [], score: 0 };
    let teamB = { name: 'Time B', players: [], reserves: [], score: 0 };
    let playerToSubIn = null;
    let subTargetTeam = null; // 'A' ou 'B'

    // =========================================================================
    // CONSTANTES E CONFIGURAÇÕES
    // =========================================================================
    const POSITIONS = ['Goleiro', 'Lateral Esquerdo', 'Lateral Direito', 'Defensor', 'Meio-campo', 'Atacante'];
    const TEAM_SIZE = 10; // 1 goleiro + 9 de linha
    const FALLBACK_PHOTO = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzY2NiIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0yMCAyMUgxYTYgNiAwIDAgMSAtNiAtNlY5YTYgNiAwIDAgMSA2IC02aDFhNiA2IDAgMCAxIDYgNnYybDQtMlY5YTYgNiAwIDAgMSAtNiAtNnoiPjwvcGF0aD48Y2lyY2xlIGN4PSI5IiBjeT0iMTAiIHI9IjMiPjwvY2lyY2xlPjxwYXRoIGQ9Ik02IDIxVjE5YzAtMiAyLjIzLTQgNS00czUgMiA1IDR2MiI+PC9wYXRoPjwvc3ZnPg==';

    // =========================================================================
    // ELEMENTOS DO DOM
    // =========================================================================
    const addPlayerForm = document.getElementById('add-player-form');
    const allPlayersListContainer = document.getElementById('all-players-list');
    const gameDayAvailablePlayersContainer = document.getElementById('game-day-available-players');
    const arrivalListContainer = document.getElementById('arrival-list');
    const formTeamsBtn = document.getElementById('form-teams-btn');
    const matchSection = document.getElementById('match-section');
    const gameDaySetupSection = document.getElementById('game-day-setup');
    const editModal = document.getElementById('edit-player-modal');
    const subModal = document.getElementById('substitution-modal');
    const ownGoalModal = document.getElementById('own-goal-modal');
    const topScorersList = document.getElementById('top-scorers-list');
    const topGoaliesList = document.getElementById('top-goalies-list');
    
    // =========================================================================
    // FUNÇÕES DE DADOS E ESTADO
    // =========================================================================
    const savePlayers = () => localStorage.setItem('footballManagerPlayers', JSON.stringify(allPlayers));
    const loadPlayers = () => {
        const storedData = localStorage.getItem('footballManagerPlayers');
        if (storedData) {
            allPlayers = JSON.parse(storedData).map(player => ({
                ...player,
                positions: Array.isArray(player.positions) ? player.positions : ['Atacante'],
                goals: player.goals || 0,
                goalsConceded: player.goalsConceded || 0
            }));
        }
    };
    const findPlayerById = (id) => allPlayers.find(p => p.id === id) || guestPlayers.find(p => p.id === id);

    // =========================================================================
    // FUNÇÕES DE RENDERIZAÇÃO E CRIAÇÃO DE ELEMENTOS
    // =========================================================================
    const renderAll = () => {
        renderAllPlayersList();
        renderGameDayAvailablePlayers();
        renderArrivalList();
        renderRankings();
    };

    const createPlayerCard = (player, context) => {
        const card = document.createElement('div');
        card.className = 'player-card';
        card.dataset.playerId = player.id;

        card.innerHTML = `
            <img src="${player.photo || FALLBACK_PHOTO}" alt="${player.name}" onerror="this.src='${FALLBACK_PHOTO}'">
            <div class="player-info">
                <strong class="player-name">${player.name}</strong>
                <span class="player-position">${(player.positions || []).join(', ')}</span>
            </div>
            <div class="player-actions"></div>
        `;
        const actionsContainer = card.querySelector('.player-actions');

        switch (context) {
            case 'management':
                const editBtn = document.createElement('button');
                editBtn.textContent = 'Editar';
                editBtn.onclick = () => openEditModal(player.id);
                actionsContainer.appendChild(editBtn);
                break;
            case 'gameday':
                const addBtn = document.createElement('button');
                addBtn.textContent = 'Adicionar';
                addBtn.disabled = arrivalList.includes(player.id);
                if (addBtn.disabled) addBtn.textContent = 'Na Lista';
                addBtn.onclick = () => addToArrivalList(player.id);
                actionsContainer.appendChild(addBtn);
                break;
            case 'late-arrival':
                const addLateBtn = document.createElement('button');
                addLateBtn.textContent = 'Adicionar Atrasado';
                addLateBtn.dataset.action = "add-late";
                addLateBtn.dataset.id = player.id; // <-- CORREÇÃO APLICADA AQUI
                actionsContainer.appendChild(addLateBtn);
                break;
        }
        return card;
    };
    
    const renderAllPlayersList = () => {
        if(allPlayersListContainer) allPlayersListContainer.innerHTML = '';
        allPlayers.forEach(p => allPlayersListContainer.appendChild(createPlayerCard(p, 'management')));
    };
    
    const renderGameDayAvailablePlayers = () => {
        if(gameDayAvailablePlayersContainer) gameDayAvailablePlayersContainer.innerHTML = '';
        allPlayers.forEach(p => gameDayAvailablePlayersContainer.appendChild(createPlayerCard(p, 'gameday')));
    };

    const renderArrivalList = () => {
        if(arrivalListContainer) arrivalListContainer.innerHTML = '';
        arrivalList.forEach((playerId, index) => {
            const player = findPlayerById(playerId);
            if (!player) return;
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${index + 1}. ${player.name} (${(player.positions || []).join(', ')})</span>
                <div class="arrival-actions">
                    <button data-action="move-up" data-index="${index}" ${index === 0 ? 'disabled' : ''}>⬆️</button>
                    <button data-action="move-down" data-index="${index}" ${index === arrivalList.length - 1 ? 'disabled' : ''}>⬇️</button>
                    <button data-action="remove" data-id="${playerId}">❌</button>
                </div>
            `;
            arrivalListContainer.appendChild(li);
        });
    };

    const renderMatch = () => {
        const renderPlayerListForMatch = (container, playerIds, isReserve = false, teamChar = null) => {
            if (!container) return;
            container.innerHTML = '';
            playerIds.forEach(playerId => {
                const player = findPlayerById(playerId);
                if (!player) return;

                const card = document.createElement('div');
                card.className = 'player-card';
                card.dataset.playerId = playerId;

                // Ação de clique: Substituição (se for reserva)
                if (isReserve) {
                    card.style.cursor = 'pointer';
                    card.onclick = (e) => {
                        // Evita que o clique no botão de troca acione a substituição
                        if (e.target.closest('.swap-team-btn')) return;
                        openSubModal(playerId, teamChar);
                    };
                }

                let statsHtml = '';
                if ((player.positions || []).includes('Goleiro')) {
                    statsHtml = `Gols Sofridos: <strong>${player.goalsConceded || 0}</strong>`;
                } else {
                    statsHtml = `
                      <button data-action="change-goal" data-amount="-1" data-id="${player.id}">-</button>
                      Gols: <strong>${player.goals || 0}</strong>
                      <button data-action="change-goal" data-amount="1" data-id="${player.id}">+</button>
                    `;
                }
                
                // NOVIDADE: Adiciona botão de troca se for reserva
                const swapButtonHtml = isReserve 
                    ? `<button class="swap-team-btn" data-action="swap-reserve" data-id="${playerId}" data-from="${teamChar}">🔄</button>` 
                    : '';

                card.innerHTML = `
                    <img src="${player.photo || FALLBACK_PHOTO}" alt="${player.name}" onerror="this.src='${FALLBACK_PHOTO}'">
                    <div class="player-info">
                        <strong class="player-name">${player.name}</strong>
                        <span class="player-position">${(player.positions || []).join(', ')}</span>
                    </div>
                    ${!isReserve ? `<div class="player-stats">${statsHtml}</div>` : ''}
                    ${swapButtonHtml}
                `;
                container.appendChild(card);
            });
        };

        renderPlayerListForMatch(document.getElementById('team-a-players'), teamA.players);
        renderPlayerListForMatch(document.getElementById('team-b-players'), teamB.players);
        renderPlayerListForMatch(document.getElementById('team-a-reserves'), teamA.reserves, true, 'A');
        renderPlayerListForMatch(document.getElementById('team-b-reserves'), teamB.reserves, true, 'B');

        const scoreElement = document.getElementById('score');
        if (scoreElement) scoreElement.textContent = `${teamA.score} x ${teamB.score}`;
        
        renderLateArrivals();
    };
    
    const renderLateArrivals = () => {
        const lateArrivalContainer = document.getElementById('late-arrival-players');
        if (!lateArrivalContainer) return;

        lateArrivalContainer.innerHTML = '';
        const playersInGame = [...teamA.players, ...teamB.players, ...teamA.reserves, ...teamB.reserves];
        allPlayers
            .filter(p => !playersInGame.includes(p.id))
            .forEach(p => {
                lateArrivalContainer.appendChild(createPlayerCard(p, 'late-arrival'));
            });
    };

    const renderRankings = () => {
        if (!topScorersList || !topGoaliesList) return;
        
        const scorers = [...allPlayers].filter(p => p.goals > 0).sort((a, b) => b.goals - a.goals);
        topScorersList.innerHTML = scorers.slice(0, 10).map(p => `<li>${p.name} - ${p.goals} gols</li>`).join('');

        const goalies = allPlayers.filter(p => (p.positions || []).includes('Goleiro')).sort((a,b) => (a.goalsConceded || 0) - (b.goalsConceded || 0));
        topGoaliesList.innerHTML = goalies.map(p => `<li>${p.name} - ${p.goalsConceded} sofridos</li>`).join('');
    };

    // =========================================================================
    // LÓGICA DE JOGO E AÇÕES
    // =========================================================================
    // ... (handleAddPlayer, handleAddGuestGoalie, addToArrivalList, handleArrivalListClick permanecem os mesmos) ...
    const handleAddPlayer = (e) => { e.preventDefault(); const name = document.getElementById('player-name').value.trim(); const photo = document.getElementById('player-photo').value.trim(); const positions = Array.from(document.querySelectorAll('#add-player-form input[name="position"]:checked')).map(cb => cb.value); if (!name || positions.length === 0) { alert('Nome e pelo menos uma posição são obrigatórios.'); return; } allPlayers.push({ id: `p_${Date.now()}`, name, photo, positions, goals: 0, goalsConceded: 0 }); savePlayers(); renderAll(); addPlayerForm.reset(); };
    const handleAddGuestGoalie = (e) => { e.preventDefault(); const nameInput = document.getElementById('guest-goalie-name'); const name = nameInput.value.trim(); if (!name) return; const guestGoalie = { id: `g_${Date.now()}`, name: `${name} (Convidado)`, photo: '', positions: ['Goleiro'], isGuest: true, goals: 0, goalsConceded: 0 }; guestPlayers.push(guestGoalie); addToArrivalList(guestGoalie.id); nameInput.value = ''; };
    const addToArrivalList = (playerId) => { if (!arrivalList.includes(playerId)) { arrivalList.push(playerId); renderArrivalList(); renderGameDayAvailablePlayers(); } };
    const handleArrivalListClick = (e) => { const button = e.target.closest('button'); if (!button) return; const action = button.dataset.action; const id = button.dataset.id; const index = parseInt(button.dataset.index); if (action === 'remove') { arrivalList = arrivalList.filter(pId => pId !== id); guestPlayers = guestPlayers.filter(p => p.id !== id); } if (action === 'move-up' && index > 0) { [arrivalList[index], arrivalList[index - 1]] = [arrivalList[index - 1], arrivalList[index]]; } if (action === 'move-down' && index < arrivalList.length - 1) { [arrivalList[index], arrivalList[index + 1]] = [arrivalList[index + 1], arrivalList[index]]; } renderArrivalList(); renderGameDayAvailablePlayers(); };
    
    const formTeams = () => {
        const playersOnList = arrivalList.map(id => findPlayerById(id)).filter(Boolean);
        let goalies = playersOnList.filter(p => p.positions.includes('Goleiro'));
        let leftBacks = playersOnList.filter(p => p.positions.includes('Lateral Esquerdo'));
        let rightBacks = playersOnList.filter(p => p.positions.includes('Lateral Direito'));
        let fieldPlayers = playersOnList.filter(p => !p.positions.includes('Goleiro') && !p.positions.includes('Lateral Esquerdo') && !p.positions.includes('Lateral Direito'));
        
        if (goalies.length < 2) {
            alert('São necessários pelo menos 2 goleiros na lista para formar os times.');
            return;
        }

        teamA = { name: 'Time A', players: [], reserves: [], score: 0 };
        teamB = { name: 'Time B', players: [], reserves: [], score: 0 };

        distributeToReserves(goalies.map(p => p.id));
        if (teamA.reserves.length > 0) teamA.players.push(teamA.reserves.shift());
        if (teamB.reserves.length > 0) teamB.players.push(teamB.reserves.shift());
        
        const distributeLaterals = (laterals) => {
            if (laterals.length > 0) teamA.players.push(laterals.shift().id);
            if (laterals.length > 0) teamB.players.push(laterals.shift().id);
            distributeToReserves(laterals.map(p => p.id));
        };

        distributeLaterals(leftBacks);
        distributeLaterals(rightBacks);

        let turnA = true;
        while (fieldPlayers.length > 0) {
            const player = fieldPlayers.shift();
            if (turnA && teamA.players.length < TEAM_SIZE) {
                teamA.players.push(player.id);
            } else if (!turnA && teamB.players.length < TEAM_SIZE) {
                teamB.players.push(player.id);
            } else {
                distributeToReserves([player.id]);
            }
            turnA = !turnA;
        }

        document.querySelector('#game-day-setup .collapsible-content').style.display = 'none';
        document.querySelector('#game-day-setup .collapsible-btn').classList.remove('active');
        matchSection.classList.remove('hidden');
        renderMatch();
    };

    const distributeToReserves = (playerIds) => {
        playerIds.forEach(id => {
            if (teamA.reserves.length <= teamB.reserves.length) {
                teamA.reserves.push(id);
            } else {
                teamB.reserves.push(id);
            }
        });
    };
    
    const addLatePlayer = (playerId) => {
        distributeToReserves([playerId]);
        alert(`${findPlayerById(playerId).name} foi adicionado ao banco.`);
        renderMatch();
    };
    
    // NOVIDADE: Função para trocar reserva de time
    const handleSwapReserveTeam = (playerId, fromTeam) => {
        const player = findPlayerById(playerId);
        if (fromTeam === 'A') {
            teamA.reserves = teamA.reserves.filter(id => id !== playerId);
            teamB.reserves.push(playerId);
            alert(`${player.name} foi movido para o banco do Time B.`);
        } else {
            teamB.reserves = teamB.reserves.filter(id => id !== playerId);
            teamA.reserves.push(playerId);
            alert(`${player.name} foi movido para o banco do Time A.`);
        }
        renderMatch();
    };

    const handleMatchActions = (e) => {
        const button = e.target.closest('button');
        if (!button || !button.dataset.action) return;

        const action = button.dataset.action;
        const playerId = button.dataset.id;

        switch (action) {
            case 'change-goal':
                const amount = parseInt(button.dataset.amount);
                const player = findPlayerById(playerId);
                if (!player) return;

                player.goals = (player.goals || 0) + amount;
                if (player.goals < 0) player.goals = 0;

                const team = teamA.players.includes(playerId) ? teamA : teamB;
                const otherTeamGoalieId = (team === teamA ? teamB : teamA).players.find(pId => (findPlayerById(pId).positions || []).includes('Goleiro'));
                if (otherTeamGoalieId) {
                    const goalie = findPlayerById(otherTeamGoalieId);
                    goalie.goalsConceded = (goalie.goalsConceded || 0) + amount;
                    if (goalie.goalsConceded < 0) goalie.goalsConceded = 0;
                }
                
                team.score = (team.score || 0) + amount;
                if (team.score < 0) team.score = 0;

                if (!player.isGuest) savePlayers();
                renderMatch();
                renderRankings();
                break;
            case 'swap-reserve':
                const fromTeam = button.dataset.from;
                handleSwapReserveTeam(playerId, fromTeam);
                break;
            case 'add-late':
                addLatePlayer(playerId);
                break;
        }
    };
    
    // ... (executeSubstitution, handleSmartRandomSub, handleOwnGoal, resetGame, e funções de MODAL permanecem os mesmos) ...
    const executeSubstitution = (playerInId, playerOutId) => { const team = subTargetTeam === 'A' ? teamA : teamB; const indexOut = team.players.indexOf(playerOutId); if (indexOut === -1) return; team.players[indexOut] = playerInId; const indexInReserves = team.reserves.indexOf(playerInId); if(indexInReserves === -1) return; team.reserves[indexInReserves] = playerOutId; alert(`${findPlayerById(playerInId).name} entra no lugar de ${findPlayerById(playerOutId).name}.`); renderMatch(); closeSubModal(); };
    const handleSmartRandomSub = () => { const playerIn = findPlayerById(playerToSubIn); const team = subTargetTeam === 'A' ? teamA : teamB; const fieldPlayersOnTeam = team.players.filter(pId => !findPlayerById(pId).positions.includes('Goleiro')); if (fieldPlayersOnTeam.length === 0) { alert("Nenhum jogador de linha para substituir."); closeSubModal(); return; } const isLateral = (pos) => pos.includes('Lateral'); const isDefender = (pos) => pos.includes('Defensor') || isLateral(pos); const playerInPositions = playerIn.positions; let candidates = []; if (playerInPositions.some(isDefender)) { candidates = fieldPlayersOnTeam.filter(pId => findPlayerById(pId).positions.some(isDefender)); } else { candidates = fieldPlayersOnTeam.filter(pId => findPlayerById(pId).positions.some(pos => playerInPositions.includes(pos))); } if (candidates.length === 0) candidates = fieldPlayersOnTeam; const playerOutId = candidates[Math.floor(Math.random() * candidates.length)]; executeSubstitution(playerToSubIn, playerOutId); };
    const handleOwnGoal = (playerId) => { const player = findPlayerById(playerId); const team = teamA.players.includes(playerId) ? teamA : teamB; (team === teamA ? teamB : teamA).score++; alert(`Gol contra de ${player.name}! Ponto para o time adversário.`); renderMatch(); closeOwnGoalModal(); };
    const resetGame = () => { if (!confirm("Isso irá zerar a partida atual e limpar a lista de chegada. As estatísticas dos jogadores serão mantidas. Deseja continuar?")) return; guestPlayers = []; arrivalList = []; teamA = { name: 'Time A', players: [], reserves: [], score: 0 }; teamB = { name: 'Time B', players: [], reserves: [], score: 0 }; matchSection.classList.add('hidden'); document.querySelector('#game-day-setup .collapsible-content').style.display = 'block'; document.querySelector('#game-day-setup .collapsible-btn').classList.add('active'); renderAll(); };
    const openEditModal = (playerId) => { const player = findPlayerById(playerId); const modalContent = editModal.querySelector('.modal-content'); modalContent.innerHTML = ` <span class="close-button">&times;</span> <h3>Editar Jogador</h3> <form id="edit-player-form"> <input type="hidden" id="edit-player-id" value="${player.id}"> <div class="form-group"> <label for="edit-player-name">Nome:</label> <input type="text" id="edit-player-name" value="${player.name}" required> </div> <div class="form-group"> <label>Posições:</label> <div id="edit-player-positions" class="checkbox-group"> ${POSITIONS.map(pos => `<label><input type="checkbox" name="position" value="${pos}" ${player.positions.includes(pos) ? 'checked' : ''}> ${pos}</label>`).join('')} </div> </div> <div class="form-group"> <label for="edit-player-photo">URL da Foto:</label> <input type="url" id="edit-player-photo" value="${player.photo || ''}"> </div> <div class="modal-actions"> <button type="submit">Salvar Alterações</button> <button type="button" id="delete-player-btn" class="danger">Excluir Jogador</button> </div> </form> `; editModal.style.display = 'block'; editModal.querySelector('.close-button').onclick = closeEditModal; editModal.querySelector('#edit-player-form').addEventListener('submit', handleEditFormSubmit); editModal.querySelector('#delete-player-btn').onclick = handleDeletePlayer; };
    const closeEditModal = () => editModal.style.display = 'none';
    const handleEditFormSubmit = (e) => { e.preventDefault(); const id = document.getElementById('edit-player-id').value; const player = findPlayerById(id); player.name = document.getElementById('edit-player-name').value.trim(); player.photo = document.getElementById('edit-player-photo').value.trim(); player.positions = Array.from(document.querySelectorAll('#edit-player-form input[name="position"]:checked')).map(cb => cb.value); savePlayers(); renderAll(); if(!matchSection.classList.contains('hidden')) renderMatch(); closeEditModal(); };
    const handleDeletePlayer = () => { const id = document.getElementById('edit-player-id').value; const player = findPlayerById(id); if(confirm(`Tem certeza que deseja excluir o jogador ${player.name}? Isso não pode ser desfeito.`)){ allPlayers = allPlayers.filter(p => p.id !== id); savePlayers(); renderAll(); if(!matchSection.classList.contains('hidden')) renderMatch(); closeEditModal(); } };
    const openSubModal = (playerId, teamChar) => { playerToSubIn = playerId; subTargetTeam = teamChar; const player = findPlayerById(playerId); const team = teamChar === 'A' ? teamA : teamB; const modalContent = subModal.querySelector('.modal-content'); modalContent.innerHTML = ` <span class="close-button">&times;</span> <h3>Substituir Jogador</h3> <p>Substituir <strong id="sub-player-in-name">${player.name}</strong> por:</p> <div id="sub-options-container"> <button id="sub-random-btn">Aleatório Inteligente</button> <div id="sub-manual-list" class="player-grid"></div> </div> `; const manualList = modalContent.querySelector('#sub-manual-list'); team.players .filter(pId => !findPlayerById(pId).positions.includes('Goleiro')) .forEach(pId => { const pOut = findPlayerById(pId); const card = createPlayerCard(pOut, null); card.onclick = () => executeSubstitution(playerToSubIn, pId); manualList.appendChild(card); }); subModal.style.display = 'block'; subModal.querySelector('.close-button').onclick = closeSubModal; subModal.querySelector('#sub-random-btn').onclick = handleSmartRandomSub; };
    const closeSubModal = () => subModal.style.display = 'none';
    const openOwnGoalModal = () => { const container = document.getElementById('own-goal-options'); if(!container) return; container.innerHTML = ''; [...teamA.players, ...teamB.players].forEach(pId => { const player = findPlayerById(pId); const teamChar = teamA.players.includes(pId) ? 'a' : 'b'; const card = createPlayerCard(player, null); card.innerHTML += `<span class="team-indicator team-${teamChar}">Time ${teamChar.toUpperCase()}</span>`; card.onclick = () => handleOwnGoal(pId); container.appendChild(card); }); ownGoalModal.style.display = 'block'; };
    const closeOwnGoalModal = () => ownGoalModal.style.display = 'none';
    
    // =========================================================================
    // INICIALIZAÇÃO E EVENT LISTENERS
    // =========================================================================
    const init = () => {
        loadPlayers();
        
        document.querySelectorAll('.collapsible-btn').forEach(button => {
            button.addEventListener('click', function() {
                this.classList.toggle('active');
                const content = this.nextElementSibling;
                if (content.style.display === 'block') {
                    content.style.display = 'none';
                } else {
                    content.style.display = 'block';
                }
            });
        });
        
        addPlayerForm.addEventListener('submit', handleAddPlayer);
        document.getElementById('add-guest-goalie-form').addEventListener('submit', handleAddGuestGoalie);
        arrivalListContainer.addEventListener('click', handleArrivalListClick);
        formTeamsBtn.addEventListener('click', formTeams);
        
        // NOVIDADE: Um único listener para todas as ações da partida
        document.body.addEventListener('click', (e) => {
            const button = e.target.closest('button[data-action]');
            if (button) {
                handleMatchActions(e);
            }
        });

        document.getElementById('reset-game-btn').addEventListener('click', resetGame);
        document.getElementById('own-goal-btn').addEventListener('click', openOwnGoalModal);
        
        const ownGoalCloseBtn = ownGoalModal.querySelector('.close-button');
        if (ownGoalCloseBtn) ownGoalCloseBtn.onclick = closeOwnGoalModal;
        
        window.onclick = (e) => {
            if (e.target == editModal) closeEditModal();
            if (e.target == subModal) closeSubModal();
            if (e.target == ownGoalModal) closeOwnGoalModal();
        };
        
        renderAll();
    };

    init();
});