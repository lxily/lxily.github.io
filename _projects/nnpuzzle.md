---
layout: page
title: N*N Puzzle / N 数码问题
description: 一个用于演示 N*N 滑块拼图构造式还原算法的 C++ 玩具项目与网页小游戏。
img: assets/img/nnpuzzle-preview.svg
importance: 1
category: fun
github: https://github.com/lxily/NNPuzzle
---

N 数码问题是经典的滑块拼图问题：在一个 `N*N` 棋盘中，有 `N*N-1` 个编号方块和一个空白格。每一步只能把与空白格相邻的方块滑入空白格，目标是把棋盘恢复到规定顺序。

这个小项目最早来自几年前写的 C++ 程序，用来验证一种直接的构造式还原思路。它不追求最短步数，而是像手工拼图一样逐层固定棋盘：先把当前子棋盘的底行和右列放回目标位置，再递归处理左上角更小的子棋盘。移动某个目标方块时，程序会把已经固定的位置视为障碍，通过搜索为目标方块和空白格安排一条可行路径。

<div class="nnpuzzle-demo" data-nnpuzzle-demo>
  <div class="nnpuzzle-panel" aria-label="N 数码演示控制栏">
    <div class="nnpuzzle-toolbar">
      <label>
        图片
        <select data-nnpuzzle-image>
          <option
            value="{{ '/assets/img/nnpuzzle/starry-night.jpg' | relative_url }}"
            data-title="梵高《星夜》"
            selected
          >梵高《星夜》</option>
          <option
            value="{{ '/assets/img/nnpuzzle/great-wave.jpg' | relative_url }}"
            data-title="北斋《神奈川冲浪里》"
          >北斋《神奈川冲浪里》</option>
          <option
            value="{{ '/assets/img/nnpuzzle/mona-lisa.jpg' | relative_url }}"
            data-title="达·芬奇《蒙娜丽莎》"
          >达·芬奇《蒙娜丽莎》</option>
        </select>
      </label>
      <label>
        阶数
        <select data-nnpuzzle-size>
          <option value="3">3 × 3</option>
          <option value="4" selected>4 × 4</option>
          <option value="5">5 × 5</option>
          <option value="6">6 × 6</option>
          <option value="7">7 × 7</option>
          <option value="8">8 × 8</option>
          <option value="9">9 × 9</option>
          <option value="10">10 × 10</option>
        </select>
      </label>
      <div class="nnpuzzle-options">
        <label>
          打乱步数
          <input data-nnpuzzle-shuffle type="number" min="1" max="2000" step="1" value="64">
        </label>
        <label>
          速度
          <select data-nnpuzzle-speed>
            <option value="180">慢速</option>
            <option value="80" selected>普通</option>
            <option value="25">快速</option>
            <option value="0">极速</option>
          </select>
        </label>
      </div>
      <label class="nnpuzzle-inline-option">
        <input data-nnpuzzle-labels type="checkbox">
        显示编号
      </label>
      <div class="nnpuzzle-actions">
        <button type="button" data-nnpuzzle-action="shuffle">随机打乱</button>
        <button type="button" data-nnpuzzle-action="solve">自动还原</button>
        <button type="button" data-nnpuzzle-action="pause" disabled>暂停</button>
        <button type="button" data-nnpuzzle-action="reset">重开</button>
      </div>
    </div>
    <div class="nnpuzzle-stats">
      <span>手动步数：<strong data-nnpuzzle-moves>0</strong></span>
      <span>计时：<strong data-nnpuzzle-time>00:00</strong></span>
    </div>
    <p class="nnpuzzle-status" data-nnpuzzle-status></p>
    <button type="button" class="nnpuzzle-preview" data-nnpuzzle-action="preview" title="点击放大预览">
      <img data-nnpuzzle-preview src="{{ '/assets/img/nnpuzzle/starry-night.jpg' | relative_url }}" alt="当前拼图原图预览">
      <span data-nnpuzzle-preview-title>梵高《星夜》</span>
    </button>
  </div>
  <div class="nnpuzzle-play-area">
    <div class="nnpuzzle-board" data-nnpuzzle-board aria-label="N 数码棋盘"></div>
  </div>
  <div class="nnpuzzle-lightbox" data-nnpuzzle-lightbox hidden>
    <button type="button" class="nnpuzzle-lightbox-close" data-nnpuzzle-action="close-preview" aria-label="关闭预览">×</button>
    <img
      data-nnpuzzle-lightbox-image
      src="{{ '/assets/img/nnpuzzle/starry-night.jpg' | relative_url }}"
      alt="当前拼图原图放大预览"
      title="点击还原"
    >
  </div>
</div>

## 问题建模

在这个项目里，空白格记为 `0`，也可以理解为网页演示中的空白图片块。目标状态采用从左上到右下递增的编号约定：左上角是空白格，随后依次是 `1, 2, ... , N*N-1`。网页中的图片拼图只是把这些编号块换成了图片切片，底层状态仍然是同一个滑块拼图。

<div class="nnpuzzle-algo-note">
  <div>
    <strong>目标状态</strong>
    <p>每个编号块都有固定目标位置，空白格负责为相邻块让路。</p>
  </div>
  <div class="nnpuzzle-mini-board" style="--mini-n: 4" aria-label="4 阶目标状态示意图">
    <span class="blank">0</span><span>1</span><span>2</span><span>3</span>
    <span>4</span><span>5</span><span>6</span><span>7</span>
    <span>8</span><span>9</span><span>10</span><span>11</span>
    <span>12</span><span>13</span><span>14</span><span>15</span>
  </div>
</div>

## 构造式还原思路

求解器采用逐层固定的构造式思路：把 `N*N` 问题递归拆成一个更小的 `(N-1)*(N-1)` 问题。对当前子棋盘，先还原底行，再还原右列；这两条边固定后，就只在左上角剩下的子棋盘中继续操作。

<div class="nnpuzzle-flow">
  <span>还原底行</span>
  <i>→</i>
  <span>处理左下角</span>
  <i>→</i>
  <span>还原右列</span>
  <i>→</i>
  <span>处理右上角</span>
  <i>→</i>
  <span>递归缩小</span>
</div>

<div class="nnpuzzle-diagram-row">
  <div>
    <h3>固定外圈</h3>
    <p>灰色区域表示已经固定的底行和右列。后续寻路时，这些格子被当作障碍，不再被打乱。</p>
  </div>
  <div class="nnpuzzle-mini-board" style="--mini-n: 4" aria-label="外圈固定后递归处理左上子棋盘">
    <span class="active">0</span><span class="active">1</span><span class="active">2</span><span class="fixed">7</span>
    <span class="active">4</span><span class="active">5</span><span class="active">6</span><span class="fixed">11</span>
    <span class="active">8</span><span class="active">9</span><span class="active">10</span><span class="fixed">15</span>
    <span class="fixed">12</span><span class="fixed">13</span><span class="fixed">14</span><span class="fixed">3</span>
  </div>
</div>

### 1. 把一个目标块送回位置

还原底行或右列的大多数格子时，先找到目标块 `B` 当前所在位置，再在未固定区域中为它找到一条通往目标格的路径。空白格 `S` 先移动到路径上的下一个格子，然后目标块滑入空白格；重复这个过程，`B` 就能沿路径一步步回到目标位置。

<div class="nnpuzzle-diagram-row nnpuzzle-diagram-sequence">
  <div>
    <h3>沿路径推动目标块</h3>
    <p>红色路径表示 `B` 的目标路线，`S` 总是先移动到 `B` 的下一步位置，再让 `B` 滑过去。</p>
  </div>
  <div class="nnpuzzle-mini-board compact" style="--mini-n: 4" aria-label="目标块沿路径移动前">
    <span></span><span></span><span class="blank">S</span><span></span>
    <span class="target">B</span><span class="path"></span><span class="path"></span><span></span>
    <span></span><span></span><span class="path"></span><span></span>
    <span></span><span></span><span class="path target-cell"></span><span class="fixed"></span>
  </div>
  <span class="nnpuzzle-arrow">→</span>
  <div class="nnpuzzle-mini-board compact" style="--mini-n: 4" aria-label="空白格移动到目标块下一步">
    <span></span><span></span><span></span><span></span>
    <span class="blank">S</span><span class="target">B</span><span class="path"></span><span></span>
    <span></span><span></span><span class="path"></span><span></span>
    <span></span><span></span><span class="path target-cell"></span><span class="fixed"></span>
  </div>
  <span class="nnpuzzle-arrow">→</span>
  <div class="nnpuzzle-mini-board compact" style="--mini-n: 4" aria-label="目标块继续沿路径前进">
    <span></span><span></span><span></span><span></span>
    <span></span><span class="blank">S</span><span class="target">B</span><span></span>
    <span></span><span></span><span class="path"></span><span></span>
    <span></span><span></span><span class="path target-cell"></span><span class="fixed"></span>
  </div>
  <span class="nnpuzzle-arrow">→</span>
  <div class="nnpuzzle-mini-board compact" style="--mini-n: 4" aria-label="目标块抵达目标格">
    <span></span><span></span><span></span><span></span>
    <span></span><span></span><span></span><span></span>
    <span></span><span></span><span class="blank">S</span><span></span>
    <span></span><span></span><span class="target fixed">B</span><span class="fixed"></span>
  </div>
</div>

这个步骤的关键是“只移动未固定区域”。如果某些格子已经属于还原好的外圈，寻路时会避开它们，因此局部操作不会破坏已经完成的部分。

### 2. 处理左下角和右上角

边的最后一个角块不能直接用普通路径法放入目标位置，否则空白格可能被挤到错误位置，导致刚刚还原的边被破坏。这里将角块归位拆成一个局部小问题：先把角块放到目标角的相邻暂存格，再用一段固定的短序列把角块旋入角落。

<div class="nnpuzzle-diagram-row nnpuzzle-diagram-sequence">
  <div>
    <h3>左下角</h3>
    <p>先把角块 `C` 放到左下角上方，再让空白格围绕局部区域转一圈，把 `C` 旋入角落。</p>
  </div>
  <div class="nnpuzzle-mini-board tall compact" style="--mini-n: 2" aria-label="左下角局部调整前">
    <span class="blank">S</span><span></span>
    <span class="target">C</span><span></span>
    <span></span><span>D</span>
  </div>
  <span class="nnpuzzle-arrow">→</span>
  <div class="nnpuzzle-mini-board tall compact" style="--mini-n: 2" aria-label="左下角空白格进入底部">
    <span class="target">C</span><span></span>
    <span></span><span></span>
    <span class="blank">S</span><span>D</span>
  </div>
  <span class="nnpuzzle-arrow">→</span>
  <div class="nnpuzzle-mini-board tall compact" style="--mini-n: 2" aria-label="左下角局部旋转中">
    <span class="blank">S</span><span></span>
    <span class="target">C</span><span></span>
    <span>D</span><span></span>
  </div>
  <span class="nnpuzzle-arrow">→</span>
  <div class="nnpuzzle-mini-board tall compact" style="--mini-n: 2" aria-label="左下角局部调整后">
    <span></span><span></span>
    <span class="blank">S</span><span></span>
    <span class="target fixed">C</span><span>D</span>
  </div>
</div>

<div class="nnpuzzle-diagram-row nnpuzzle-diagram-sequence">
  <div>
    <h3>右上角</h3>
    <p>右上角是对称情形：先把角块 `F` 放到右上角左侧，再用另一段固定序列完成归位，最终让 `F` 位于 `E` 上方。</p>
  </div>
  <div class="nnpuzzle-mini-board wide compact" style="--mini-n: 3" aria-label="右上角局部调整前">
    <span class="blank">S</span><span class="target">F</span><span></span>
    <span></span><span></span><span>E</span>
  </div>
  <span class="nnpuzzle-arrow">→</span>
  <div class="nnpuzzle-mini-board wide compact" style="--mini-n: 3" aria-label="右上角空白格进入右侧">
    <span class="target">F</span><span></span><span class="blank">S</span>
    <span></span><span></span><span>E</span>
  </div>
  <span class="nnpuzzle-arrow">→</span>
  <div class="nnpuzzle-mini-board wide compact" style="--mini-n: 3" aria-label="右上角局部旋转中">
    <span class="blank">S</span><span class="target">F</span><span>E</span>
    <span></span><span></span><span></span>
  </div>
  <span class="nnpuzzle-arrow">→</span>
  <div class="nnpuzzle-mini-board wide compact" style="--mini-n: 3" aria-label="右上角局部调整后">
    <span></span><span class="blank">S</span><span class="target fixed">F</span>
    <span></span><span></span><span>E</span>
  </div>
</div>

这两个角落分别使用固定移动序列处理。它们不需要重新搜索全局路径，只负责在一个很小的局部区域里保持边界稳定。

### 3. 递归直到 `2*2`

当底行和右列都固定后，问题规模从 `N*N` 变成左上角的 `(N-1)*(N-1)`。算法不断重复这个过程，直到剩下 `2*2` 的基本局面。对于可解局面，只需要把最后一个关键块放好，再把空白格移动到左上角即可结束。

<div class="nnpuzzle-diagram-row">
  <div class="nnpuzzle-mini-board" style="--mini-n: 3" aria-label="递归前的三阶子问题">
    <span class="active">0</span><span class="active">1</span><span class="fixed">5</span>
    <span class="active">3</span><span class="active">4</span><span class="fixed">8</span>
    <span class="fixed">6</span><span class="fixed">7</span><span class="fixed">2</span>
  </div>
  <span class="nnpuzzle-arrow">→</span>
  <div class="nnpuzzle-mini-board" style="--mini-n: 2" aria-label="最终二阶基本局面">
    <span class="blank">S</span><span>1</span>
    <span>2</span><span class="target">G</span>
  </div>
</div>

## 复杂度与特点

这个求解器是构造式求解器，不是最短路求解器。设计目标是稳定地产生一条可行还原路径，而不是找到最少步数。直观地看，单个块的移动需要反复为目标块和空白格寻路，整张棋盘又要处理 `N*N` 个块，因此可以把时间复杂度粗略估计为 `O(N^4)`；棋盘、固定标记和寻路队列都是二维规模，空间复杂度约为 `O(N^2)`。

它的优点是思路清楚、适合可视化，而且对较大的 `N` 也能很快给出一条解；局限是步数可能明显偏长，不适合作为最优解算法。如果要追求最短路径，小规模问题可以考虑 `A*` 或 `IDA*`，但这些方法在高阶拼图上会遇到巨大的状态空间。

## C++ 重构

重构后的代码将棋盘状态、随机打乱、逐层还原和命令行入口拆开组织。核心类包括 `PuzzleBoard` 和 `LayerSolver`，构建方式改为 CMake，支持如下命令：

```bash
cmake -S . -B build
cmake --build build
./build/nnpuzzle_cli --size 4 --shuffle 100 --seed 1
```

项目源码见 [lxily/NNPuzzle](https://github.com/lxily/NNPuzzle)。

内置图片来源：梵高《星夜》、北斋《神奈川冲浪里》与达·芬奇《蒙娜丽莎》均来自 Wikimedia Commons 的公有领域图像。

<script defer src="{{ '/assets/js/nnpuzzle.js' | relative_url | bust_file_cache }}"></script>
