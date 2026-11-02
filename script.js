// Rummikub Scorekeeper v2.0
// Keeps the original scoring rule and adds edit, delete, undo and local saving.

(() => {
  'use strict';

  const STORAGE_KEY = 'rummikub-scorekeeper-v2';
  const DRAFT_KEY = 'rummikub-scorekeeper-v2-draft';
  const $ = (id) => document.getElementById(id);

  let playerNames = [];
  let games = [];
  let editingGameId = null;
  let sessionStarted = false;

  const playerList = $('playerList');
  const winnerSelect = $('winner');
  const tileTotals = $('tileTotals');
  const recordButton = $('recordGameButton');
  const cancelEditButton = $('cancelEditButton');

  function saveDraft() {
    if (!sessionStarted || editingGameId === null && !winnerSelect.value && !tileTotals.querySelector('.tileValue')) {
      try { localStorage.removeItem(DRAFT_KEY); } catch (_) {}
      return;
    }
    const tileValues = {};
    tileTotals.querySelectorAll('.tileValue').forEach(box => { tileValues[box.dataset.player] = box.value; });
    const draft = { winner: winnerSelect.value, tileValues, editingGameId };
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); }
    catch (error) { setStatus('Could not save the unfinished entry on this device.', true); console.error(error); }
  }

  function restoreDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (!draft || typeof draft !== 'object') return;
      const validEdit = draft.editingGameId && games.some(game => game.id === draft.editingGameId);
      if (validEdit) {
        editingGameId = draft.editingGameId;
        const game = games.find(item => item.id === editingGameId);
        winnerSelect.value = draft.winner || game.winner;
        buildTileInputs(draft.tileValues || game.tileValues);
        $('gameTitle').textContent = `Editing Game ${games.indexOf(game) + 1}`;
        recordButton.textContent = 'Save Changes';
        cancelEditButton.hidden = false;
      } else if (draft.winner && playerNames.includes(draft.winner)) {
        winnerSelect.value = draft.winner;
        buildTileInputs(draft.tileValues || {});
      }
      if (draft.winner || Object.keys(draft.tileValues || {}).length) setStatus('Your unfinished entry has been restored.');
    } catch (error) { console.warn('Could not restore unfinished entry:', error); }
  }

  function clearSavedDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch (_) {}
  }

  function saveState() {
    const state = { version: 2, playerNames, games, sessionStarted };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      setStatus('Your browser could not save this session. Please check device storage.', true);
      console.error(error);
    }
  }

  function setStatus(message, isError = false) {
    const el = $('statusMessage');
    if (!el) return;
    el.textContent = message;
    el.style.color = isError ? '#a83232' : '#245b2b';
  }

  function readSavedState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const state = JSON.parse(saved);
      if (!state || !Array.isArray(state.playerNames) || !Array.isArray(state.games)) return;
      playerNames = state.playerNames;
      games = state.games;
      sessionStarted = Boolean(state.sessionStarted);
    } catch (error) {
      console.warn('Could not read saved Rummikub session:', error);
    }
  }

  function addPlayerRow(value = '') {
    const row = document.createElement('div');
    row.className = 'playerRow';
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Player Name';
    input.value = value;
    input.setAttribute('aria-label', 'Player name');
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'deleteButton secondary';
    remove.textContent = 'Remove';
    remove.addEventListener('click', () => {
      if (playerList.children.length <= 2) {
        alert('A Rummikub game needs at least two players.');
        return;
      }
      row.remove();
    });
    row.append(input, remove);
    playerList.appendChild(row);
    return input;
  }

  function renderSetup() {
    playerList.innerHTML = '';
    const names = playerNames.length ? playerNames : ['', ''];
    names.forEach(name => addPlayerRow(name));
    $('playerSetup').hidden = sessionStarted;
    $('gameArea').hidden = !sessionStarted;
    $('standings').hidden = !sessionStarted;
  }

  function startNewSession() {
    const names = [...playerList.querySelectorAll('input')]
      .map(input => input.value.trim())
      .filter(Boolean);
    if (names.length < 2) {
      alert('Please enter at least two player names.');
      return;
    }
    const normalized = names.map(name => name.toLocaleLowerCase());
    if (new Set(normalized).size !== names.length) {
      alert('Each player must have a different name.');
      return;
    }
    if (games.length && !confirm('Starting a new session will clear the current game history. Continue?')) return;
    playerNames = names;
    games = [];
    clearSavedDraft();
    editingGameId = null;
    sessionStarted = true;
    saveState();
    renderSession();
  }

  function startAnotherSession() {
    if (!confirm('Start a new session? The current session will be cleared.')) return;
    games = [];
    clearSavedDraft();
    editingGameId = null;
    sessionStarted = false;
    saveState();
    renderSetup();
    $('statusMessage').textContent = '';
    playerList.innerHTML = '';
    playerNames.forEach(name => addPlayerRow(name));
    $('playerSetup').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderSession() {
    renderSetup();
    winnerSelect.innerHTML = '<option value="">Choose Winner</option>';
    playerNames.forEach(name => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      winnerSelect.appendChild(option);
    });
    $('gameTitle').textContent = `Game ${games.length + 1}`;
    clearEntryForm();
    renderHistoryAndTotals();
  }

  function buildTileInputs(prefill = {}) {
    const winner = winnerSelect.value;
    tileTotals.innerHTML = '';
    playerNames.forEach(name => {
      if (name === winner) return;
      const row = document.createElement('div');
      row.className = 'playerRow';
      const label = document.createElement('label');
      label.textContent = name;
      const input = document.createElement('input');
      input.type = 'number';
      input.min = '0';
      input.step = '1';
      input.className = 'tileValue';
      input.dataset.player = name;
      input.placeholder = 'Tiles left';
      input.value = Object.prototype.hasOwnProperty.call(prefill, name) ? prefill[name] : '';
      input.setAttribute('aria-label', `${name} tiles left`);
      row.append(label, input);
      tileTotals.appendChild(row);
    });
  }

  function clearEntryForm() {
    winnerSelect.value = '';
    tileTotals.innerHTML = '';
    editingGameId = null;
    recordButton.textContent = 'Record Game';
    cancelEditButton.hidden = true;
    $('gameTitle').textContent = `Game ${games.length + 1}`;
  }

  function getTileValues() {
    const values = {};
    const boxes = [...tileTotals.querySelectorAll('.tileValue')];
    for (const box of boxes) {
      const raw = box.value.trim();
      if (raw === '') {
        alert(`Please enter a tile total for ${box.dataset.player}.`);
        box.focus();
        return null;
      }
      const value = Number(raw);
      if (!Number.isInteger(value) || value < 0) {
        alert(`Please enter a whole number of zero or more for ${box.dataset.player}.`);
        box.focus();
        return null;
      }
      values[box.dataset.player] = value;
    }
    return values;
  }

  function recordOrSaveGame() {
    const winner = winnerSelect.value;
    if (!winner) {
      alert('Please select a winner before recording the game.');
      winnerSelect.focus();
      return;
    }
    const tileValues = getTileValues();
    if (!tileValues) return;

    if (editingGameId !== null) {
      const index = games.findIndex(game => game.id === editingGameId);
      if (index === -1) {
        alert('That game could not be found.');
        clearEntryForm();
        return;
      }
      games[index] = { ...games[index], winner, tileValues };
      saveState();
      clearSavedDraft();
      renderSession();
      setStatus(`Game ${index + 1} corrected. All running totals have been recalculated.`);
    } else {
      games.push({ id: createId(), winner, tileValues });
      saveState();
      clearSavedDraft();
      renderSession();
      setStatus(`Game ${games.length} recorded.`);
    }
  }

  function createId() {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function editGame(id) {
    const game = games.find(item => item.id === id);
    if (!game) return;
    editingGameId = id;
    winnerSelect.value = game.winner;
    buildTileInputs(game.tileValues);
    $('gameTitle').textContent = `Editing Game ${games.indexOf(game) + 1}`;
    recordButton.textContent = 'Save Changes';
    cancelEditButton.hidden = false;
    setStatus('Make your correction, then choose Save Changes.');
    $('gameArea').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function deleteGame(id) {
    const index = games.findIndex(game => game.id === id);
    if (index === -1) return;
    if (!confirm(`Delete Game ${index + 1}? This cannot be undone. The totals will be recalculated.`)) return;
    games.splice(index, 1);
    clearSavedDraft();
    clearEntryForm();
    saveState();
    renderSession();
    setStatus(`Game ${index + 1} deleted. All running totals have been recalculated.`);
  }

  function undoLastGame() {
    if (!games.length) {
      alert('There are no games to undo.');
      return;
    }
    const lastNumber = games.length;
    if (!confirm(`Undo Game ${lastNumber}? This removes the most recently recorded game.`)) return;
    games.pop();
    clearSavedDraft();
    clearEntryForm();
    saveState();
    renderSession();
    setStatus(`Game ${lastNumber} undone.`);
  }

  function calculateTotals() {
    const totals = Object.fromEntries(playerNames.map(name => [name, 0]));
    games.forEach(game => {
      const winnerScore = playerNames
        .filter(name => name !== game.winner)
        .reduce((sum, name) => sum + Number(game.tileValues[name] || 0), 0);
      playerNames.forEach(name => {
        if (name === game.winner) totals[name] += winnerScore;
        else totals[name] -= Number(game.tileValues[name] || 0);
      });
    });
    return totals;
  }

  function renderHistoryAndTotals() {
    const header = $('historyHeader');
    header.innerHTML = '<th>Game</th>';
    playerNames.forEach(name => {
      const th = document.createElement('th');
      th.textContent = name;
      header.appendChild(th);
    });
    const actionHeader = document.createElement('th');
    actionHeader.textContent = 'Actions';
    header.appendChild(actionHeader);

    const body = $('historyBody');
    body.innerHTML = '';
    games.forEach((game, index) => {
      const row = document.createElement('tr');
      const gameCell = document.createElement('td');
      gameCell.textContent = index + 1;
      row.appendChild(gameCell);
      const winnerScore = playerNames
        .filter(name => name !== game.winner)
        .reduce((sum, name) => sum + Number(game.tileValues[name] || 0), 0);
      playerNames.forEach(name => {
        const cell = document.createElement('td');
        const score = name === game.winner ? winnerScore : -Number(game.tileValues[name] || 0);
        cell.textContent = score > 0 ? `+${score}` : String(score);
        if (name === game.winner) cell.title = 'Winner';
        row.appendChild(cell);
      });
      const actions = document.createElement('td');
      actions.className = 'actions';
      const edit = document.createElement('button');
      edit.type = 'button'; edit.className = 'smallButton'; edit.textContent = 'Edit';
      edit.addEventListener('click', () => editGame(game.id));
      const remove = document.createElement('button');
      remove.type = 'button'; remove.className = 'smallButton danger'; remove.textContent = 'Delete';
      remove.addEventListener('click', () => deleteGame(game.id));
      actions.append(edit, remove);
      row.appendChild(actions);
      body.appendChild(row);
    });

    const totals = calculateTotals();
    const totalsArea = $('totalsArea');
    totalsArea.innerHTML = '';
    if (!games.length) {
      totalsArea.textContent = 'No games have been recorded.';
    } else {
      playerNames.forEach(name => {
        const card = document.createElement('div');
        card.className = 'totalCard';
        const player = document.createElement('strong');
        player.textContent = name;
        const score = document.createElement('span');
        score.textContent = totals[name] > 0 ? `+${totals[name]}` : String(totals[name]);
        card.append(player, score);
        totalsArea.appendChild(card);
      });
    }
    $('undoButton').disabled = games.length === 0;
    $('gameTitle').textContent = `Game ${games.length + 1}`;
  }

  $('addPlayerButton').addEventListener('click', () => addPlayerRow().focus());
  $('startSessionButton').addEventListener('click', startNewSession);
  $('newSessionButton').addEventListener('click', startAnotherSession);
  $('recordGameButton').addEventListener('click', recordOrSaveGame);
  $('cancelEditButton').addEventListener('click', () => {
    clearSavedDraft();
    clearEntryForm();
    setStatus('Correction cancelled. The recorded scores were not changed.');
  });
  $('undoButton').addEventListener('click', undoLastGame);
  $('clearEntryButton').addEventListener('click', () => {
    if (!confirm('Clear the current unfinished entry? Recorded games will not be affected.')) return;
    clearSavedDraft();
    clearEntryForm();
    setStatus('Current entry cleared. Previous games are unchanged.');
  });
  winnerSelect.addEventListener('change', () => {
    const previous = {};
    tileTotals.querySelectorAll('.tileValue').forEach(box => { previous[box.dataset.player] = box.value; });
    buildTileInputs(previous);
    saveDraft();
  });
  $('gameArea').addEventListener('input', saveDraft);
  $('gameArea').addEventListener('change', saveDraft);

  readSavedState();
  if (sessionStarted && playerNames.length >= 2) {
    renderSession();
    restoreDraft();
    setStatus(localStorage.getItem(DRAFT_KEY) ? 'Previous session and unfinished entry restored from this device.' : 'Previous session restored from this device.');
  } else {
    sessionStarted = false;
    renderSetup();
  }
})();
