// deno run --allow-write --allow-env --allow-net 2_loop_sample.ts

// ループ処理を行うLangGraphサンプル
// 条件を満たすまで同じノードを繰り返し実行する
import { END, START, StateGraph } from "@langchain/langgraph";
import { writeFileSync } from "node:fs";
import { z } from "zod";

// 型推論周りでas anyキャストが必要になってる箇所を抽出
// deno-lint-ignore no-explicit-any
const NODE_INCREMENT = "increment" as any;
// deno-lint-ignore no-explicit-any
const NODE_FINAL = "final" as any;

// LoopStateのZodスキーマを定義
const LoopStateSchema = z.object({
  counter: z.number(),
  target: z.number(),
  iterations: z.number(),
  messages: z.array(z.string()),
});
// LoopStateの型をZodスキーマから取得
type LoopState = z.infer<typeof LoopStateSchema>;

// カウンターを増加させるノード
function incrementNode(state: LoopState): LoopState {
  const newCounter = state.counter + 1;
  const newIterations = state.iterations + 1;
  const message =
    `実行${newIterations}回目: カウンター ${state.counter} → ${newCounter}`;

  console.log(message);

  return {
    counter: newCounter,
    target: state.target,
    iterations: newIterations,
    messages: [...state.messages, message],
  };
}

// 最終結果を表示するノード
function finalNode(state: LoopState): LoopState {
  const message =
    `目標達成！最終カウンター: ${state.counter}, 実行回数: ${state.iterations}`;
  console.log(message);

  return {
    ...state,
    messages: [...state.messages, message],
  };
}

// ループ継続の判定関数
function shouldContinueLoop(state: LoopState): "increment" | "final" {
  if (state.counter < state.target) {
    return "increment"; // ループ継続
  } else {
    return "final"; // 終了処理へ
  }
}

// StateGraphの作成
const workflow = new StateGraph<
  LoopState
>({
  channels: {
    counter: {
      value: (x?: number, y?: number) => y ?? x ?? 0,
      default: () => 0,
    },
    target: {
      value: (x?: number, y?: number) => y ?? x ?? 10,
      default: () => 10,
    },
    iterations: {
      value: (x?: number, y?: number) => y ?? x ?? 0,
      default: () => 0,
    },
    messages: {
      value: (x?: string[], y?: string[]) => y ?? x ?? [],
      default: () => [],
    },
  },
});

// ノードを追加
workflow.addNode(NODE_INCREMENT, incrementNode);
workflow.addNode(NODE_FINAL, finalNode);

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
  console.log("LangGraph ループサンプル開始");
  console.log("目標値に達するまでカウンターを増加させます\n");

  // 初期状態を設定
  const initialState: LoopState = {
    counter: 0,
    target: 7, // 7に達したら終了
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
  // ↑のresultの型判定がうまくできていない
  // LoopStateになって欲しいのに。

  // 型チェック
  const parseResult = LoopStateSchema.safeParse(result);
  if (!parseResult.success) {
    console.error("resultがLoopState型ではありません:", parseResult.error);
    throw new Error("型チェック失敗");
  }
  console.log("---");
  console.log("最終結果:");
  console.log(`- カウンター: ${result.counter}`);
  console.log(`- 目標値: ${result.target}`);
  console.log(`- 総実行回数: ${result.iterations}`);
  console.log("\n実行履歴:");
  result.messages.forEach((msg: string, index: number) => {
    console.log(`${index + 1}. ${msg}`);
  });

  // PNG画像として保存
  try {
    const graph = await app.getGraphAsync();
    const image = await graph.drawMermaidPng();
    const arrayBuffer = await image.arrayBuffer();
    writeFileSync("2_loop.png", new Uint8Array(arrayBuffer));
    console.log("\nグラフ画像を 2_loop.png として保存しました");
  } catch (error) {
    console.error("画像保存エラー:", error);
  }
}

if (import.meta.main) {
  main().catch(console.error);
}
