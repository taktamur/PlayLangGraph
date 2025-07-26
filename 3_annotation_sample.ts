// deno run --allow-write --allow-env --allow-net tmp/3_annotation_sample.ts

// Annotationを使った最新のLangGraphサンプル
// Annotationを使うことで、結果の型推論が効くようになるので、zodが不要になる
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { saveGraphAsPng } from "./lib/graph-utils.ts";

// Annotationを使った状態定義（最新の推奨方法）
const LoopAnnotation = Annotation.Root({
  counter: Annotation<number>(),
  target: Annotation<number>(),
  iterations: Annotation<number>(),
  messages: Annotation<string[]>(),
});
type LoopState = typeof LoopAnnotation.State;

// カウンターを増加させるノード
function incrementNode(state: LoopState): Partial<LoopState> {
  const newCounter = state.counter + 1;
  const newIterations = state.iterations + 1;
  const message =
    `実行${newIterations}回目: カウンター ${state.counter} → ${newCounter}`;

  console.log(message);

  return {
    counter: newCounter,
    iterations: newIterations,
    messages: [...state.messages, message],
  };
}

// 最終結果を表示するノード
function finalNode(state: LoopState): Partial<LoopState> {
  const message =
    `目標達成！最終カウンター: ${state.counter}, 実行回数: ${state.iterations}`;
  console.log(message);

  return {
    messages: [...state.messages, message],
  };
}

// ループ継続の判定関数
function shouldContinueLoop(state: LoopState): "increment" | "final" {
  if (state.counter < state.target) {
    return "increment";
  } else {
    return "final";
  }
}

// StateGraphをAnnotationで作成（channelsは不要）
const workflow = new StateGraph(LoopAnnotation);

// ノードを追加
workflow.addNode("increment", incrementNode);
workflow.addNode("final", finalNode);

// 型推論に失敗するNODE名称を定数化
// deno-lint-ignore no-explicit-any
const NODE_INCREMENT = "increment" as any;
// deno-lint-ignore no-explicit-any
const NODE_FINAL = "final" as any;

// エッジを定義
workflow.addEdge(START, NODE_INCREMENT);

// 条件付きエッジ（ループの制御）
workflow.addConditionalEdges(
  NODE_INCREMENT,
  shouldContinueLoop,
  {
    increment: NODE_INCREMENT,
    final: NODE_FINAL,
  },
);

workflow.addEdge(NODE_FINAL, END);

// ワークフローをコンパイル
const app = workflow.compile();

// メイン関数
async function main() {
  console.log("LangGraph Annotationサンプル開始");
  console.log("channelsを使わない最新の推奨方法でループ処理を実行します\n");

  // 初期状態を設定
  const initialState: LoopState = {
    counter: 3,
    target: 5,
    iterations: 0,
    messages: [],
  };

  console.log("初期状態:", {
    counter: initialState.counter,
    target: initialState.target,
  });
  console.log("---");

  // グラフを実行
  const result = await app.invoke(initialState);

  // Annotation.Rootを使うことで、型推論が効くようになる
  console.log("---");
  console.log("最終結果:");
  console.log(`- カウンター: ${result.counter}`);
  console.log(`- 目標値: ${result.target}`);
  console.log(`- 総実行回数: ${result.iterations}`);
  console.log("\n実行履歴:");
  result.messages.forEach((msg, index) => {
    console.log(`${index + 1}. ${msg}`);
  });

  // PNG画像として保存
  await saveGraphAsPng(app, "3_annotation");
}

if (import.meta.main) {
  main().catch(console.error);
}
