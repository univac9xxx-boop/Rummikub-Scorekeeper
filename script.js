// ==========================================
// Rummikub Scorekeeper v1.0
// JavaScript
// ==========================================

let playerCount = 1;
let gameNumber = 1;
let runningTotals = {};
let playerNames = [];

const playerList = document.getElementById("playerList");
const addPlayerButton = document.getElementById("addPlayerButton");

addPlayerButton.addEventListener("click", function () {

    playerCount++;

    const row = document.createElement("div");
row.className = "playerRow";

row.innerHTML =
`<input type="text" placeholder="Player ${playerCount} Name">
<button class="deleteButton">Delete</button>`;

playerList.appendChild(row);

const newInput = row.querySelector("input");
newInput.focus();

const deleteButton = row.querySelector(".deleteButton");

       deleteButton.addEventListener("click", function () {

        row.remove();

    });

});

const startSessionButton = document.getElementById("startSessionButton");

startSessionButton.addEventListener("click", function () {

    const playerInputs = document.querySelectorAll("#playerList input");
    playerNames = [];
    runningTotals = {};

    const winnerSelect = document.getElementById("winner");

    winnerSelect.innerHTML =
        "<option>Choose Winner</option>";

      playerInputs.forEach(function(player) {

       if (player.value.trim() !== "") {

            playerNames.push(player.value.trim());

            runningTotals[player.value.trim()] = 0;

            const option = document.createElement("option");

            option.text = player.value;

            option.value = player.value;

            winnerSelect.add(option);

}

    });

    winnerSelect.addEventListener("change", buildTileTotals);

});

function buildTileTotals() {

    const winner = document.getElementById("winner").value;

    const tileTotals = document.getElementById("tileTotals");

    const playerInputs = document.querySelectorAll("#playerList input");

    tileTotals.innerHTML = "";

    playerInputs.forEach(function(player) {

        const name = player.value.trim();

        if (name !== "" && name !== winner) {

            const row = document.createElement("div");

            row.className = "playerRow";

            row.innerHTML = `
                <label style="width:140px">${name}</label>
                <input
                    type="number"
                    min="0"
                    class="tileValue"
                    data-player="${name}">
            `;

            tileTotals.appendChild(row);

        }

    });

}
const recordGameButton = document.getElementById("recordGameButton");

recordGameButton.addEventListener("click", recordGame);

function recordGame() {

    const winner = document.getElementById("winner").value;


    if (winner === "Choose Winner") {
        alert("Please select a winner before recording the game.");
        return;
    }
const scoreBoxes = document.querySelectorAll(".tileValue");

for (const box of scoreBoxes) {
    if (box.value.trim() === "") {
        alert("Please enter a score for " + box.dataset.player + ".");
        box.focus();
        return;
    }
}
    const historyHeader = document.getElementById("historyHeader");
    const historyBody = document.getElementById("historyBody");
    const totalsArea = document.getElementById("totalsArea");

    // Build table header once
    if (historyHeader.children.length === 1) {

        playerNames.forEach(function(name) {

            const th = document.createElement("th");
            th.textContent = name;
            historyHeader.appendChild(th);

        });

    }

    const row = document.createElement("tr");

    // Game Number
    let html = `<td>${gameNumber}</td>`;

    let winnerScore = 0;

    const playerScores = {};

    scoreBoxes.forEach(function(box) {

        const value = Number(box.value) || 0;
        const name = box.dataset.player;

        playerScores[name] = value;

        winnerScore += value;

    });

    playerNames.forEach(function(name) {

    if (name === winner) {

        runningTotals[name] += winnerScore;

        html += `<td>${winnerScore}</td>`;

    } else {

        const score = playerScores[name] || 0;

        runningTotals[name] -= score;

        html += `<td>-${score}</td>`;

    }

});

    row.innerHTML = html;

    historyBody.appendChild(row);

    // Update running totals

    totalsArea.innerHTML = "";

    playerNames.forEach(function(name) {

        const p = document.createElement("p");

        p.textContent =
            `${name}: ${runningTotals[name]}`;

        totalsArea.appendChild(p);

    });

   gameNumber++;

document.getElementById("gameTitle").textContent =
    `Game ${gameNumber}`;

document.getElementById("winner").selectedIndex = 0;

document.querySelectorAll("#tileTotals input").forEach(function(input) {
    input.value = "";
});

alert("Game Recorded!");

}