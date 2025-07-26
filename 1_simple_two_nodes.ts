// deno-lint-ignore-file no-explicit-any
// ↑as anyを使ってるので無視

// deno run --allow-write --allow-env --allow-net 1_simple_two_nodes.ts

// 最もシンプルなLangGraphサンプル
// 2つのノードを順番に実行するグラフ
import { END, START, StateGraph } from "@langchain/langgraph";
import { writeFileSync } from "node:fs";

// グラフ内で共有される状態の型定義
interface SimpleState {
  counter: number; // 数値カウンター
  message: string; // メッセージ文字列
}

// 最初に実行されるノード
// counterに1を加算し、メッセージを更新
function nodeA(state: SimpleState): SimpleState {
  console.log("Node A実行中:", state);
  return {
    counter: state.counter + 1,
    message: "Node Aを通過しました",
  };
}

// 2番目に実行されるノード
// counterを2倍にし、メッセージを更新
function nodeB(state: SimpleState): SimpleState {
  console.log("Node B実行中:", state);
  return {
    counter: state.counter * 2,
    message: "Node Bを通過しました",
  };
}

// StateGraphの作成
// channelsで状態の管理方法を定義
const workflow = new StateGraph<SimpleState>({
  channels: {
    counter: {
      value: (x?: number, y?: number) => y ?? x ?? 0, // 新しい値があれば更新、なければ既存値を保持
      default: () => 0, // デフォルト値
    },
    message: {
      value: (x?: string, y?: string) => y ?? x ?? "", // 新しい値があれば更新、なければ既存値を保持
      // value: (x?: string, y?: string) => `${y} ${x}` ,  // joinさせてみる
      default: () => "", // デフォルト値
    },
  },
});

// ノードをワークフローに追加
workflow.addNode("nodeA", nodeA);
workflow.addNode("nodeB", nodeB);

// エッジ（実行順序）を定義
// START -> nodeA -> nodeB -> END の順で実行
// 型定義的に"nodeA"などがエラーになるのでanyでキャスト
workflow.addEdge(START as any, "nodeA" as any); // 開始点からnodeAへ
workflow.addEdge("nodeA" as any, "nodeB" as any); // nodeAからnodeBへ
workflow.addEdge("nodeB" as any, END); // nodeBから終了点へ

// ワークフローをコンパイルして実行可能な形に変換
const app = workflow.compile();

// メイン関数
async function main() {
  console.log("LangGraph シンプルサンプル開始");

  // 初期状態を設定
  const initialState: SimpleState = {
    counter: 5,
    message: "開始",
  };

  console.log("初期状態:", initialState);

  // グラフを実行（START -> nodeA -> nodeB -> END）
  const result = await app.invoke(initialState);

  console.log("最終結果:", result);

  // PNG画像として保存（Node.js環境）
  // --allow-netが要求された
  const graph = await app.getGraphAsync();
  const image = await graph.drawMermaidPng(); // Mermaid形式のままでも出せる
  const arrayBuffer = await image.arrayBuffer();
  writeFileSync("1.png", new Uint8Array(arrayBuffer));
  console.log("グラフ画像を 1.png として保存しました");
}

if (import.meta.main) {
  main().catch(console.error);
}
