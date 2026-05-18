(function () {
  "use strict";

  const DIRECTIONS = ["U", "D", "L", "R"];
  const DELTA = {
    U: [-1, 0],
    D: [1, 0],
    L: [0, -1],
    R: [0, 1],
  };
  const OPPOSITE = { U: "D", D: "U", L: "R", R: "L" };

  function createSolvedBoard(size) {
    const tiles = Array.from({ length: size * size }, function (_, index) {
      return index;
    });
    return { size, tiles, blank: { row: 0, col: 0 } };
  }

  function cloneBoard(board) {
    return {
      size: board.size,
      tiles: board.tiles.slice(),
      blank: { row: board.blank.row, col: board.blank.col },
    };
  }

  function indexOf(board, position) {
    return position.row * board.size + position.col;
  }

  function samePosition(a, b) {
    return a.row === b.row && a.col === b.col;
  }

  function step(position, direction) {
    const delta = DELTA[direction];
    return { row: position.row + delta[0], col: position.col + delta[1] };
  }

  function contains(board, position) {
    return position.row >= 0 && position.row < board.size && position.col >= 0 && position.col < board.size;
  }

  function isSolved(board) {
    return board.tiles.every(function (value, index) {
      return value === index;
    });
  }

  function applyMove(board, direction) {
    const nextBlank = step(board.blank, direction);
    if (!contains(board, nextBlank)) return false;

    const blankIndex = indexOf(board, board.blank);
    const nextIndex = indexOf(board, nextBlank);
    [board.tiles[blankIndex], board.tiles[nextIndex]] = [board.tiles[nextIndex], board.tiles[blankIndex]];
    board.blank = nextBlank;
    return true;
  }

  function legalMoves(board) {
    return DIRECTIONS.filter(function (direction) {
      return contains(board, step(board.blank, direction));
    });
  }

  function seededRandom(seed) {
    let state = seed >>> 0;
    if (state === 0) state = 1;
    return function () {
      state = (1664525 * state + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }

  function shuffleBoard(board, moveCount, seed) {
    const shuffled = cloneBoard(board);
    const random = seededRandom(seed);
    const moves = [];
    let previous = null;

    for (let i = 0; i < moveCount; i += 1) {
      let legal = legalMoves(shuffled);
      if (previous && legal.length > 1) {
        legal = legal.filter(function (direction) {
          return direction !== OPPOSITE[previous];
        });
      }

      const direction = legal[Math.floor(random() * legal.length)];
      applyMove(shuffled, direction);
      moves.push(direction);
      previous = direction;
    }

    return { board: shuffled, moves };
  }

  class LayerSolver {
    constructor(board) {
      this.board = cloneBoard(board);
      this.size = board.size;
      this.fixed = Array(this.size * this.size).fill(false);
      this.moves = [];
      this.states = [];
    }

    globalIndex(position) {
      return position.row * this.size + position.col;
    }

    targetValue(position) {
      return position.row * this.size + position.col;
    }

    inSubBoard(position, limit) {
      return position.row >= 0 && position.row < limit && position.col >= 0 && position.col < limit;
    }

    isFixed(position) {
      return this.fixed[this.globalIndex(position)];
    }

    valueAt(position) {
      return this.board.tiles[this.globalIndex(position)];
    }

    findTile(value) {
      for (let row = 0; row < this.size; row += 1) {
        for (let col = 0; col < this.size; col += 1) {
          const position = { row, col };
          if (this.valueAt(position) === value) return position;
        }
      }
      throw new Error("tile not found");
    }

    findPath(start, goal, limit) {
      if (!this.inSubBoard(start, limit) || !this.inSubBoard(goal, limit)) {
        throw new Error("path endpoint is outside the active sub-board");
      }

      const localIndex = function (position) {
        return position.row * limit + position.col;
      };
      const parent = Array(limit * limit).fill(-1);
      const parentMove = Array(limit * limit).fill(null);
      const queue = [start];
      let cursor = 0;

      parent[localIndex(start)] = localIndex(start);
      while (cursor < queue.length) {
        const current = queue[cursor];
        cursor += 1;
        if (samePosition(current, goal)) break;

        for (const direction of DIRECTIONS) {
          const next = step(current, direction);
          if (!this.inSubBoard(next, limit)) continue;
          if (!samePosition(next, start) && !samePosition(next, goal) && this.isFixed(next)) continue;

          const nextIndex = localIndex(next);
          if (parent[nextIndex] !== -1) continue;

          parent[nextIndex] = localIndex(current);
          parentMove[nextIndex] = direction;
          queue.push(next);
        }
      }

      const goalIndex = localIndex(goal);
      if (parent[goalIndex] === -1) {
        throw new Error("no path found inside the active sub-board");
      }

      const path = [];
      for (let current = goalIndex; current !== localIndex(start); current = parent[current]) {
        path.push(parentMove[current]);
      }
      return path.reverse();
    }

    moveBlank(direction) {
      if (!applyMove(this.board, direction)) {
        throw new Error(`illegal blank move: ${direction}`);
      }
      this.moves.push(direction);
      this.states.push(this.board.tiles.slice());
    }

    moveBlankAlong(moves) {
      moves.forEach((direction) => this.moveBlank(direction));
    }

    recoverTile(source, goal, limit) {
      const tilePath = this.findPath(source, goal, limit);
      let tile = source;

      tilePath.forEach((tileStep) => {
        this.fixed[this.globalIndex(tile)] = true;

        const nextTile = step(tile, tileStep);
        this.moveBlankAlong(this.findPath(this.board.blank, nextTile, limit));
        this.moveBlank(OPPOSITE[tileStep]);

        this.fixed[this.globalIndex(tile)] = false;
        tile = nextTile;
      });

      this.fixed[this.globalIndex(goal)] = true;
    }

    solveLeftDownCorner(corner, limit) {
      const source = this.findTile(this.targetValue(corner));
      if (samePosition(source, corner)) {
        this.fixed[this.globalIndex(corner)] = true;
        return;
      }

      const staging = { row: corner.row - 1, col: corner.col };
      this.recoverTile(source, staging, limit);
      this.fixed[this.globalIndex(staging)] = false;

      if (samePosition(this.board.blank, corner)) {
        this.moveBlank("U");
        this.fixed[this.globalIndex(corner)] = true;
        return;
      }

      if (this.board.blank.row === staging.row) {
        this.moveBlankAlong(["U", "L"]);
      }

      const sequenceStart = { row: corner.row - 2, col: corner.col };
      if (!samePosition(this.board.blank, sequenceStart)) {
        this.fixed[this.globalIndex(staging)] = true;
        this.moveBlankAlong(this.findPath(this.board.blank, sequenceStart, limit));
        this.fixed[this.globalIndex(staging)] = false;
      }

      this.moveBlankAlong("DDRULURDDLU".split(""));
      this.fixed[this.globalIndex(corner)] = true;
    }

    solveRightUpCorner(corner, limit) {
      const source = this.findTile(this.targetValue(corner));
      if (samePosition(source, corner)) {
        this.fixed[this.globalIndex(corner)] = true;
        return;
      }

      const staging = { row: corner.row, col: corner.col - 1 };
      this.recoverTile(source, staging, limit);
      this.fixed[this.globalIndex(staging)] = false;

      if (samePosition(this.board.blank, corner)) {
        this.moveBlank("L");
        this.fixed[this.globalIndex(corner)] = true;
        return;
      }

      if (this.board.blank.col === staging.col) {
        this.moveBlankAlong(["L", "U"]);
      }

      const sequenceStart = { row: corner.row, col: corner.col - 2 };
      if (!samePosition(this.board.blank, sequenceStart)) {
        this.fixed[this.globalIndex(staging)] = true;
        this.moveBlankAlong(this.findPath(this.board.blank, sequenceStart, limit));
        this.fixed[this.globalIndex(staging)] = false;
      }

      this.moveBlankAlong("RRDLULDRRUL".split(""));
      this.fixed[this.globalIndex(corner)] = true;
    }

    solveSubBoard(limit) {
      if (limit <= 1) return;

      if (limit === 2) {
        this.recoverTile(this.findTile(this.targetValue({ row: 1, col: 1 })), { row: 1, col: 1 }, limit);
        this.fixed[this.globalIndex({ row: 1, col: 1 })] = true;

        if (samePosition(this.board.blank, { row: 0, col: 1 })) {
          this.moveBlank("L");
        } else if (samePosition(this.board.blank, { row: 1, col: 0 })) {
          this.moveBlank("U");
        }

        this.fixed[this.globalIndex({ row: 0, col: 0 })] = true;
        return;
      }

      const last = limit - 1;
      for (let col = last; col >= 1; col -= 1) {
        const goal = { row: last, col };
        this.recoverTile(this.findTile(this.targetValue(goal)), goal, limit);
      }

      this.solveLeftDownCorner({ row: last, col: 0 }, limit);

      for (let row = last; row >= 1; row -= 1) {
        const goal = { row, col: last };
        this.recoverTile(this.findTile(this.targetValue(goal)), goal, limit);
      }

      this.solveRightUpCorner({ row: 0, col: last }, limit);
      this.solveSubBoard(limit - 1);
    }

    solve() {
      this.solveSubBoard(this.size);
      return {
        moves: this.moves.slice(),
        states: this.states.slice(),
        solved: isSolved(this.board),
        board: cloneBoard(this.board),
      };
    }
  }

  function solveBoard(board) {
    return new LayerSolver(board).solve();
  }

  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
  }

  function initDemo(root) {
    const imageInput = root.querySelector("[data-nnpuzzle-image]");
    const sizeInput = root.querySelector("[data-nnpuzzle-size]");
    const shuffleInput = root.querySelector("[data-nnpuzzle-shuffle]");
    const speedInput = root.querySelector("[data-nnpuzzle-speed]");
    const labelsInput = root.querySelector("[data-nnpuzzle-labels]");
    const boardElement = root.querySelector("[data-nnpuzzle-board]");
    const previewImage = root.querySelector("[data-nnpuzzle-preview]");
    const previewTitle = root.querySelector("[data-nnpuzzle-preview-title]");
    const lightbox = root.querySelector("[data-nnpuzzle-lightbox]");
    const lightboxImage = root.querySelector("[data-nnpuzzle-lightbox-image]");
    const movesElement = root.querySelector("[data-nnpuzzle-moves]");
    const timeElement = root.querySelector("[data-nnpuzzle-time]");
    const statusElement = root.querySelector("[data-nnpuzzle-status]");
    const solveButton = root.querySelector('[data-nnpuzzle-action="solve"]');
    const pauseButton = root.querySelector('[data-nnpuzzle-action="pause"]');
    const controls = root.querySelectorAll("button, select, input");

    let board = createSolvedBoard(Number(sizeInput.value));
    let initialBoard = cloneBoard(board);
    let manualMoves = 0;
    let elapsedSeconds = 0;
    let timer = null;
    let animation = null;
    let paused = false;
    let currentImage = {
      src: imageInput.value,
      title: imageInput.selectedOptions[0].dataset.title || imageInput.selectedOptions[0].textContent.trim(),
    };

    function setStatus(text) {
      statusElement.textContent = text;
    }

    function stopTimer() {
      if (timer) window.clearInterval(timer);
      timer = null;
    }

    function startTimer() {
      if (timer) return;
      timer = window.setInterval(function () {
        elapsedSeconds += 1;
        timeElement.textContent = formatTime(elapsedSeconds);
      }, 1000);
    }

    function resetStats() {
      manualMoves = 0;
      elapsedSeconds = 0;
      movesElement.textContent = "0";
      timeElement.textContent = "00:00";
      stopTimer();
    }

    function setBusy(isBusy) {
      controls.forEach(function (control) {
        if (control !== pauseButton) control.disabled = isBusy;
      });
      pauseButton.disabled = !isBusy;
    }

    function updateCurrentImage() {
      const selected = imageInput.selectedOptions[0];
      currentImage = {
        src: imageInput.value,
        title: selected.dataset.title || selected.textContent.trim(),
      };
      previewImage.src = currentImage.src;
      previewImage.alt = `${currentImage.title} 原图预览`;
      previewTitle.textContent = currentImage.title;
      lightboxImage.src = currentImage.src;
      lightboxImage.alt = `${currentImage.title} 放大预览`;

      const image = new Image();
      image.onload = function () {
        const ratioValue = image.naturalWidth / image.naturalHeight;
        const ratio = `${image.naturalWidth} / ${image.naturalHeight}`;
        root.style.setProperty("--image-ratio-value", String(ratioValue));
        root.style.setProperty("--image-ratio", ratio);
        boardElement.style.setProperty("--image-ratio", ratio);
      };
      image.src = currentImage.src;
    }

    function setTileImage(tile, value) {
      const targetRow = Math.floor(value / board.size);
      const targetCol = value % board.size;
      const denominator = Math.max(1, board.size - 1);

      tile.style.backgroundImage = `url("${currentImage.src}")`;
      tile.style.backgroundSize = `${board.size * 100}% ${board.size * 100}%`;
      tile.style.backgroundPosition = `${(targetCol / denominator) * 100}% ${(targetRow / denominator) * 100}%`;
    }

    function renderBoard() {
      boardElement.style.setProperty("--n", board.size);
      root.classList.toggle("show-tile-labels", labelsInput.checked);
      boardElement.replaceChildren();

      board.tiles.forEach(function (value, tileIndex) {
        const row = Math.floor(tileIndex / board.size);
        const col = tileIndex % board.size;
        const position = { row, col };
        const tile = document.createElement("button");
        tile.type = "button";
        tile.className = "nnpuzzle-tile";
        tile.dataset.position = `${row},${col}`;

        if (value === 0) {
          tile.classList.add("blank");
          tile.setAttribute("aria-label", "空白格");
        } else {
          setTileImage(tile, value);
          const number = document.createElement("span");
          number.className = "nnpuzzle-tile-number";
          number.textContent = value;
          tile.appendChild(number);
          tile.setAttribute("aria-label", `移动 ${value}`);
          if (Math.abs(position.row - board.blank.row) + Math.abs(position.col - board.blank.col) === 1) {
            tile.classList.add("movable");
          }
        }

        boardElement.appendChild(tile);
      });

      if (isSolved(board)) {
        setStatus("已还原");
        stopTimer();
      }
    }

    function newPuzzle() {
      const size = Number(sizeInput.value);
      const shuffleMoves = Number(shuffleInput.value);
      const seed = Date.now() % 4294967295;
      board = shuffleBoard(createSolvedBoard(size), shuffleMoves, seed).board;
      initialBoard = cloneBoard(board);
      resetStats();
      renderBoard();
      setStatus("已生成可解局面");
      solveButton.disabled = false;
      startTimer();
    }

    function resetPuzzle() {
      board = cloneBoard(initialBoard);
      resetStats();
      renderBoard();
      setStatus("已重开当前局面");
      solveButton.disabled = false;
      startTimer();
    }

    function tileDirection(position) {
      if (position.row === board.blank.row - 1 && position.col === board.blank.col) return "U";
      if (position.row === board.blank.row + 1 && position.col === board.blank.col) return "D";
      if (position.col === board.blank.col - 1 && position.row === board.blank.row) return "L";
      if (position.col === board.blank.col + 1 && position.row === board.blank.row) return "R";
      return null;
    }

    function playMoves(moves) {
      let index = 0;
      setBusy(true);
      paused = false;
      pauseButton.textContent = "暂停";

      function tick() {
        if (paused) {
          animation = window.setTimeout(tick, 80);
          return;
        }
        if (index >= moves.length) {
          animation = null;
          setBusy(false);
          renderBoard();
          setStatus(isSolved(board) ? "自动还原完成" : "自动还原结束，但局面未完成");
          return;
        }

        applyMove(board, moves[index]);
        index += 1;
        renderBoard();
        const delay = Number(speedInput.value);
        animation = window.setTimeout(tick, delay);
      }

      tick();
    }

    boardElement.addEventListener("click", function (event) {
      const tile = event.target.closest(".nnpuzzle-tile");
      if (!tile || tile.classList.contains("blank") || animation) return;

      const [row, col] = tile.dataset.position.split(",").map(Number);
      const direction = tileDirection({ row, col });
      if (!direction) return;

      applyMove(board, direction);
      manualMoves += 1;
      movesElement.textContent = String(manualMoves);
      startTimer();
      renderBoard();
    });

    root.addEventListener("click", function (event) {
      const actionElement = event.target.closest("[data-nnpuzzle-action]");
      if (!actionElement || !root.contains(actionElement)) return;

      const action = actionElement.dataset.nnpuzzleAction;
      if (!action) return;

      if (action === "shuffle") {
        newPuzzle();
      } else if (action === "reset") {
        resetPuzzle();
      } else if (action === "preview") {
        lightbox.hidden = false;
      } else if (action === "close-preview") {
        lightbox.hidden = true;
      } else if (action === "solve") {
        try {
          setStatus("正在计算还原序列...");
          const result = solveBoard(board);
          setStatus(`计算完成，共 ${result.moves.length} 步`);
          playMoves(result.moves);
        } catch (error) {
          setStatus(`求解失败：${error.message}`);
        }
      } else if (action === "pause") {
        paused = !paused;
        pauseButton.textContent = paused ? "继续" : "暂停";
      }
    });

    lightbox.addEventListener("click", function (event) {
      if (event.target === lightbox) {
        lightbox.hidden = true;
      }
    });

    lightboxImage.addEventListener("click", function () {
      lightbox.hidden = true;
    });

    imageInput.addEventListener("change", function () {
      updateCurrentImage();
      renderBoard();
    });

    labelsInput.addEventListener("change", renderBoard);

    sizeInput.addEventListener("change", function () {
      const size = Number(sizeInput.value);
      shuffleInput.value = String(Math.min(1000, size * size * 4));
      speedInput.value = size >= 8 ? "15" : "80";
      newPuzzle();
    });

    updateCurrentImage();
    shuffleInput.value = String(Math.min(1000, board.size * board.size * 4));
    newPuzzle();
  }

  const api = {
    createSolvedBoard,
    shuffleBoard,
    solveBoard,
    applyMove,
  };

  if (typeof window !== "undefined") {
    window.NNPuzzle = api;
    window.addEventListener("DOMContentLoaded", function () {
      document.querySelectorAll("[data-nnpuzzle-demo]").forEach(initDemo);
    });
  }

  if (typeof module !== "undefined") {
    module.exports = api;
  }
})();
