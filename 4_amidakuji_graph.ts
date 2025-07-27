// deno-lint-ignore-file no-explicit-any
// deno run --allow-write --allow-env --allow-net 4_amidakuji_graph.ts

// あみだくじ風の複雑な分岐・合流パターンのLangGraphサンプル
// 複数のノードが相互に分岐・合流してあみだくじのような複雑な構造を作る
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { saveGraphAsPng } from "./lib/graph-utils.ts";
import { exit } from "node:process";

// プレイヤーの状態を表す型
interface Player {
  id: number;
  name: string;
  currentLane: "A" | "B" | "C"; // 現在いるレーン（A、B、C）
  path: string[]; // 通ったパスの履歴
  score: number; // 各ステーションで得た点数
}

// グラフ全体の状態

// annotation.rootを使って型定義
const AmidakujiAnnotation = Annotation.Root({
  players: Annotation<Array<Player>>(),
  currentStep: Annotation<number>(),
  results: Annotation<Array<string>>(),
});
type AmidakujiState = typeof AmidakujiAnnotation.State;

// 初期化ノード：3つのレーンにプレイヤーを配置
function initializePlayers(state: AmidakujiState): AmidakujiState {
  console.log(`\n=== ステップ ${state.currentStep}: プレイヤー初期化 ===`);

  const players: Player[] = [
    { id: 1, name: "太郎", currentLane: "A", path: ["Start-A"], score: 0 },
    { id: 2, name: "花子", currentLane: "B", path: ["Start-B"], score: 0 },
    { id: 3, name: "次郎", currentLane: "C", path: ["Start-C"], score: 0 },
  ];

  console.log(
    "初期配置:",
    players.map((p) => `${p.name}→${p.currentLane}レーン`).join(", "),
  );

  return {
    ...state,
    players,
    currentStep: state.currentStep + 1,
    results: [...state.results, "プレイヤー初期化完了"],
  };
}

// ステーション1：各レーンで異なる処理
function station1(state: AmidakujiState): AmidakujiState {
  console.log(`\n=== ステップ ${state.currentStep}: ステーション1 ===`);

  const updatedPlayers = state.players.map((player) => {
    // ボーナステーブル
    const bonusTable = {
      A: { bonus: 10, action: "基本ボーナス" },
      B: { bonus: 15, action: "中級ボーナス" },
      C: { bonus: 20, action: "上級ボーナス" },
    };
    const bonus = bonusTable[player.currentLane].bonus;
    const action = bonusTable[player.currentLane].action;

    console.log(`${player.name}(${player.currentLane}): ${action} +${bonus}点`);

    return {
      ...player,
      path: [...player.path, `Station1-${player.currentLane}`],
      score: player.score + bonus,
    };
  });

  return {
    ...state,
    players: updatedPlayers,
    currentStep: state.currentStep + 1,
    results: [...state.results, "ステーション1: 各レーンでボーナス獲得"],
  };
}

// 交差点1：A↔B、B↔C の横線（あみだくじの横棒）
function crossroad1(state: AmidakujiState): AmidakujiState {
  console.log(`\n=== ステップ ${state.currentStep}: 交差点1（横線） ===`);

  const updatedPlayers = state.players.map((player) => {
    let newLane = player.currentLane;
    let crossAction = "";

    // 特定の条件で横線を通る（あみだくじの横棒）
    if (player.currentLane === "A" && player.score >= 10) {
      newLane = "B";
      crossAction = "A→B横断";
    } else if (player.currentLane === "B" && player.id % 2 === 0) {
      newLane = "C";
      crossAction = "B→C横断";
    } else if (player.currentLane === "C" && player.score >= 20) {
      newLane = "A";
      crossAction = "C→A横断";
    } else {
      crossAction = "直進";
    }

    console.log(
      `${player.name}: ${player.currentLane} ${crossAction} → ${newLane}`,
    );

    return {
      ...player,
      currentLane: newLane,
      path: [...player.path, `Cross1-${crossAction}`],
      score: player.score + 2, // 交差点通過ボーナス
    };
  });

  return {
    ...state,
    players: updatedPlayers,
    currentStep: state.currentStep + 1,
    results: [...state.results, "交差点1: あみだくじ風の横断実行"],
  };
}

// ステーション2：レーン混雑による効果
function station2(state: AmidakujiState): AmidakujiState {
  console.log(`\n=== ステップ ${state.currentStep}: ステーション2 ===`);

  // 各レーンの人数を数える
  const laneCounts = { A: 0, B: 0, C: 0 };
  state.players.forEach((player) => {
    laneCounts[player.currentLane]++;
  });

  // ボーナステーブル
  const BONUS_TABLE = {
    1: { bonus: 25, effect: "独占ボーナス" },
    2: { bonus: 12, effect: "協力ボーナス" },
    3: { bonus: 5, effect: "混雑ペナルティ" },
  };
  const updatedPlayers = state.players.map((player) => {
    const laneCount = laneCounts[player.currentLane];
    if (laneCount !== 1 && laneCount !== 2 && laneCount !== 3) {
      // いけてない。
      console.warn(`プレイヤー数とロジックがずれています。`);
      exit(1);
    }
    const bonus = BONUS_TABLE[laneCount].bonus;
    const effect = BONUS_TABLE[laneCount].effect;

    console.log(`${player.name}(${player.currentLane}): ${effect} +${bonus}点`);

    return {
      ...player,
      path: [...player.path, `Station2-${player.currentLane}(${effect})`],
      score: player.score + bonus,
    };
  });

  return {
    ...state,
    players: updatedPlayers,
    currentStep: state.currentStep + 1,
    results: [...state.results, "ステーション2: レーン混雑効果適用"],
  };
}

// 交差点2：さらなる横線
function crossroad2(state: AmidakujiState): AmidakujiState {
  console.log(`\n=== ステップ ${state.currentStep}: 交差点2（横線） ===`);

  const updatedPlayers = state.players.map((player) => {
    let newLane = player.currentLane;
    let crossAction = "";

    // スコアベースでの横線判定
    if (player.currentLane === "A" && player.score >= 30) {
      newLane = "C";
      crossAction = "A→C大横断";
    } else if (player.currentLane === "B") {
      // Bレーンの人は必ず移動
      newLane = player.score % 2 === 0 ? "A" : "C";
      crossAction = `B→${newLane}移動`;
    } else if (player.currentLane === "C" && player.score < 25) {
      newLane = "B";
      crossAction = "C→B移動";
    } else {
      crossAction = "直進";
    }

    console.log(
      `${player.name}: ${player.currentLane} ${crossAction} → ${newLane}`,
    );

    return {
      ...player,
      currentLane: newLane,
      path: [...player.path, `Cross2-${crossAction}`],
      score: player.score + 3,
    };
  });

  return {
    ...state,
    players: updatedPlayers,
    currentStep: state.currentStep + 1,
    results: [...state.results, "交差点2: 複雑な横断パターン実行"],
  };
}

// 最終ステーション：ゴール処理
function finalStation(state: AmidakujiState): AmidakujiState {
  console.log(`\n=== ステップ ${state.currentStep}: 最終ステーション ===`);

  // 最終レーンボーナス
  const finalBonuses = { A: 50, B: 30, C: 40 };

  const updatedPlayers = state.players.map((player) => {
    const finalBonus =
      finalBonuses[player.currentLane as keyof typeof finalBonuses];

    console.log(
      `${player.name}: ${player.currentLane}レーンゴール +${finalBonus}点`,
    );

    return {
      ...player,
      path: [...player.path, `Goal-${player.currentLane}`],
      score: player.score + finalBonus,
    };
  });

  // 最終結果の表示
  const sortedPlayers = [...updatedPlayers].sort((a, b) => b.score - a.score);

  console.log("\n🏆 あみだくじ結果発表 🏆");
  sortedPlayers.forEach((player, index) => {
    console.log(
      `${
        index + 1
      }位: ${player.name} (${player.score}点) - ${player.currentLane}レーンゴール`,
    );
  });

  console.log("\n📍 各プレイヤーの通過ルート:");
  updatedPlayers.forEach((player) => {
    console.log(`${player.name}: ${player.path.join(" → ")}`);
  });

  return {
    ...state,
    players: updatedPlayers,
    currentStep: state.currentStep + 1,
    results: [
      ...state.results,
      "最終ステーション: ゲーム完了",
      ...sortedPlayers.map((p, i) => `${i + 1}位: ${p.name} (${p.score}点)`),
    ],
  };
}

// StateGraphの作成
const workflow = new StateGraph(AmidakujiAnnotation);

// ノードの追加
const NODE_INIT = "init" as any;
const NODE_STATION1 = "station1" as any;
const NODE_CROSSROAD1 = "crossroad1" as any;
const NODE_STATION2 = "station2" as any;
const NODE_CROSSROAD2 = "crossroad2" as any;
const NODE_FINAL = "final" as any;

workflow.addNode(NODE_INIT, initializePlayers);
workflow.addNode(NODE_STATION1, station1);
workflow.addNode(NODE_CROSSROAD1, crossroad1);
workflow.addNode(NODE_STATION2, station2);
workflow.addNode(NODE_CROSSROAD2, crossroad2);
workflow.addNode(NODE_FINAL, finalStation);

// エッジの定義（あみだくじの縦線＋横線構造）
workflow.addEdge(START, NODE_INIT);
workflow.addEdge(NODE_INIT, NODE_STATION1);
workflow.addEdge(NODE_STATION1, NODE_CROSSROAD1);
workflow.addEdge(NODE_CROSSROAD1, NODE_STATION2);
workflow.addEdge(NODE_STATION2, NODE_CROSSROAD2);
workflow.addEdge(NODE_CROSSROAD2, NODE_FINAL);
workflow.addEdge(NODE_FINAL, END);

// ワークフローをコンパイル
const app = workflow.compile();

// メイン関数
async function main() {
  console.log("🎯 あみだくじ風LangGraphサンプル開始");
  console.log("3つのレーン(A,B,C)で横線を通りながらゴールを目指します\n");

  // 初期状態
  const initialState: AmidakujiState = {
    players: [],
    currentStep: 1,
    results: [],
  };

  try {
    // グラフを実行
    const result = await app.invoke(initialState);

    console.log("\n" + "=".repeat(60));
    console.log("🎊 あみだくじゲーム完了！");
    console.log("=".repeat(60));

    // 実行ログの表示
    console.log("\n📋 実行ログ:");
    result.results.forEach((log, index) => {
      console.log(`${index + 1}. ${log}`);
    });

    // グラフ画像として保存
    await saveGraphAsPng(app, "4_amidakuji_graph");
  } catch (error) {
    console.error("実行エラー:", error);
  }
}

if (import.meta.main) {
  main().catch(console.error);
}
